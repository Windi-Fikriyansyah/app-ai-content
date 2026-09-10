import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../redis";
import { QUEUE_NAMES, ImageGenerationJobData } from "../queues";
import { createAdminClient } from "../../supabase/admin";
import { generateImageWithAI, ImageGenerationResult } from "../../ai/lazy-generator";

export function createImageWorker() {
  const worker = new Worker<ImageGenerationJobData, ImageGenerationResult>(
    QUEUE_NAMES.IMAGE_GENERATION,
    async (job: Job<ImageGenerationJobData>) => {
      const imageModel = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";
      console.log(`[Worker:image-generation] Generating visual for post ${job.data.postId} using model "${imageModel}"`);
      await job.updateProgress(20);

      const { postId, brief, context } = job.data;
      const result = await generateImageWithAI(brief, context);

      await job.updateProgress(80);

      const supabase = createAdminClient();
      if (result.success && result.mediaUrl) {
        const { data: postData } = await supabase
          .from("content_posts")
          .select("caption, status")
          .eq("id", postId)
          .maybeSingle();

        const hasCaption = Boolean(postData?.caption);

        await supabase
          .from("content_posts")
          .update({
            media_url: result.mediaUrl,
            image_status: "COMPLETED",
            generation_error: null,
            ...(hasCaption ? { status: "READY FOR APPROVAL" } : {}),
          })
          .eq("id", postId);
      } else {
        await supabase
          .from("content_posts")
          .update({
            image_status: "FAILED",
            generation_error: result.error || "Image generation failed",
          })
          .eq("id", postId);
      }

      await job.updateProgress(100);
      return {
        ...result,
        mediaUrl: result.mediaUrl?.startsWith("data:") ? "[base64_saved_to_db]" : result.mediaUrl,
      };
    },
    {
      connection: getRedisConnection(),
      concurrency: 3,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[Worker:image-generation] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
