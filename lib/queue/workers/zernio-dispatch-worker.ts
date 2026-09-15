import { Worker } from "bullmq";
import { QUEUE_NAMES, ZernioDispatchJobData } from "../queues";
import { getRedisConnection } from "../redis";
import { createAdminClient } from "../../supabase/admin";
import { dispatchPostToZernio } from "@/lib/zernio/dispatch";

/**
 * BullMQ Worker: Zernio Dispatch Worker
 * Picks up APPROVED posts and schedules them to Zernio API using Multi-API Key distribution.
 */
export function createZernioDispatchWorker() {
  const worker = new Worker<ZernioDispatchJobData>(
    QUEUE_NAMES.ZERNIO_DISPATCH,
    async (job) => {
      const { postId, workspaceId } = job.data;
      console.log(`[Worker:zernio-dispatch] 🚀 Processing multi-key dispatch for post ${postId} (workspace ${workspaceId})`);

      const supabase = createAdminClient();

      // 1. Fetch the post from database
      const { data: post, error: postErr } = await supabase
        .from("content_posts")
        .select("*")
        .eq("id", postId)
        .maybeSingle();

      if (postErr || !post) {
        throw new Error(`Content post not found for ID: ${postId}`);
      }

      await job.updateProgress(30);

      // 2. Dispatch via Multi-Key Dispatcher
      const result = await dispatchPostToZernio({
        supabase,
        post,
        workspaceId,
      });

      if (!result.success) {
        throw new Error(result.error || "Gagal menjadwalkan postingan ke Zernio.");
      }

      await job.updateProgress(100);
      console.log(`[Worker:zernio-dispatch] ✅ Post ${postId} successfully scheduled in Zernio: Primary PostId=${result.zernioPostId}`);

      return {
        success: true,
        postId,
        zernioPostId: result.zernioPostId,
        scheduledAt: result.scheduledAt,
        status: "SCHEDULED",
        dispatchMeta: result.dispatchMeta,
      };
    },
    {
      connection: getRedisConnection(),
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[Worker:zernio-dispatch] 🎉 Job ${job.id} completed for post ${job.data.postId}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker:zernio-dispatch] ❌ Job ${job?.id} failed for post ${job?.data?.postId}:`, err.message);
  });

  return worker;
}
