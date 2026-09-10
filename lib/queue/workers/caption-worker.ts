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
        await supabase
          .from("content_posts")
          .update({
            caption: result.caption,
            hook: result.hook || brief.hook,
            cta: result.cta || brief.cta,
            hashtags: result.hashtags || [],
            caption_status: "COMPLETED",
          })
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
