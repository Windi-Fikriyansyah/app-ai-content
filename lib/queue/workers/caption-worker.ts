import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../redis";
import { QUEUE_NAMES, CaptionGenerationJobData } from "../queues";
import { createAdminClient } from "../../supabase/admin";
import { generateCaptionWithAI, CaptionGenerationResult } from "../../ai/lazy-generator";

export function createCaptionWorker() {
  const worker = new Worker<CaptionGenerationJobData, CaptionGenerationResult>(
    QUEUE_NAMES.CAPTION_GENERATION,
    async (job: Job<CaptionGenerationJobData>) => {
      console.log(`[Worker:caption-generation] Generating caption for post ${job.data.postId}`);
      await job.updateProgress(20);

      const { postId, brief, context } = job.data;
      const result = await generateCaptionWithAI(brief, context);

      await job.updateProgress(80);

      // Update post in Supabase
      const supabase = createAdminClient();
      if (result.success && result.caption) {
        const { data: postData } = await supabase
          .from("content_posts")
          .select("media_url, image_status, workspace_id, ai_review")
          .eq("id", postId)
          .maybeSingle();

        const hasImage = Boolean(postData?.media_url || postData?.image_status === "COMPLETED");
        const updatePayload: any = {
          caption: result.caption,
          hook: result.hook || brief.hook,
          cta: result.cta || brief.cta,
          hashtags: result.hashtags || [],
          caption_status: "COMPLETED",
          ...(hasImage ? { status: "READY FOR APPROVAL" } : {}),
        };

        if (hasImage && postData?.workspace_id) {
          try {
            const { checkIsAutoApproveEnabled } = await import("@/app/(dashboard)/auto-approve-actions");
            const isAutoApprove = await checkIsAutoApproveEnabled(supabase, undefined, postData.workspace_id);
            if (isAutoApprove) {
              console.log(`[Worker:caption-generation] ⚡ Auto-Approve is ACTIVE for post ${postId}. Scheduling to Zernio...`);
              await supabase.from("content_posts").update({ status: "APPROVED" }).eq("id", postId);
              const { enqueueZernioDispatch } = await import("../queues");
              const dispatchJob = await enqueueZernioDispatch({
                postId,
                workspaceId: postData.workspace_id,
                action: "create_scheduled_post",
              });
              updatePayload.status = "SCHEDULED";
              updatePayload.ai_review = {
                ...(postData.ai_review || {}),
                dispatch_job_id: dispatchJob.jobId,
                queued_at: new Date().toISOString(),
                auto_approved: true,
              };
            }
          } catch (autoErr) {
            console.warn("[Worker:caption-generation] Auto-approve error:", autoErr);
          }
        }

        await supabase
          .from("content_posts")
          .update(updatePayload)
          .eq("id", postId);
      } else {
        await supabase
          .from("content_posts")
          .update({
            caption_status: "FAILED",
            generation_error: result.error || "Caption generation failed",
          })
          .eq("id", postId);
      }

      await job.updateProgress(100);
      return result;
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[Worker:caption-generation] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
