import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../redis";
import { QUEUE_NAMES, ContentReviewJobData } from "../queues";
import { createAdminClient } from "../../supabase/admin";
import { runAIReviewer } from "../../ai/lazy-generator";

export function createReviewWorker() {
  const worker = new Worker<ContentReviewJobData>(
    QUEUE_NAMES.CONTENT_REVIEW,
    async (job: Job<ContentReviewJobData>) => {
      console.log(`[Worker:content-review] Running AI Reviewer for post ${job.data.postId}`);
      await job.updateProgress(20);

      const { postId, brief, captionResult, imageResult, context } = job.data;
      const review = runAIReviewer(brief, captionResult, imageResult, context);

      await job.updateProgress(70);

      const overallSuccess = captionResult.success && imageResult.success;
      const status =
        review.status === "READY FOR APPROVAL" && overallSuccess
          ? "READY FOR APPROVAL"
          : review.status === "NEEDS_REVISION"
          ? "NEEDS_REVISION"
          : captionResult.success
          ? "REVIEW"
          : "FAILED";

      const supabase = createAdminClient();
      await supabase
        .from("content_posts")
        .update({
          ai_score: review.score,
          ai_review: review,
          status,
          generated_at: new Date().toISOString(),
        })
        .eq("id", postId);

      await job.updateProgress(100);
      console.log(
        `[Worker:content-review] Post ${postId} reviewed! Score: ${review.score}/100, Status: ${status}`
      );

      return {
        success: true,
        postId,
        score: review.score,
        status,
        checks: review.checks,
      };
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[Worker:content-review] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
