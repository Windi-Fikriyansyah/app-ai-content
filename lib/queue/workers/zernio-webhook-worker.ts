import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../redis";
import { QUEUE_NAMES, ZernioWebhookJobData } from "../queues";
import { createAdminClient } from "../../supabase/admin";

export interface ZernioWebhookWorkerResult {
  success: boolean;
  postId?: string;
  zernioPostId: string;
  oldStatus?: string;
  newStatus: string;
  event: string;
  error?: string;
}

export function createZernioWebhookWorker() {
  const worker = new Worker<ZernioWebhookJobData, ZernioWebhookWorkerResult>(
    QUEUE_NAMES.ZERNIO_WEBHOOK,
    async (job: Job<ZernioWebhookJobData>) => {
      const { event, zernioPostId, payload, receivedAt } = job.data;
      console.log(`[Worker:zernio-webhook] 📨 [Job: ${job.id}] Processing webhook event "${event}" for Zernio Post ID: ${zernioPostId}`);
      await job.updateProgress(10);

      // Map webhook event to SaaS status
      const lowerEvent = (event || "").toLowerCase();
      let newStatus = "PUBLISHED";
      if (lowerEvent.includes("publishing")) {
        newStatus = "PUBLISHING";
      } else if (lowerEvent.includes("fail") || lowerEvent.includes("error")) {
        newStatus = "FAILED";
      } else if (lowerEvent.includes("schedule")) {
        newStatus = "SCHEDULED";
      } else if (lowerEvent.includes("publish") || lowerEvent === "published" || lowerEvent === "post.published") {
        newStatus = "PUBLISHED";
      }

      const supabase = createAdminClient();

      // 1. Lookup post by zernio_post_id
      const { data: post, error: findErr } = await supabase
        .from("content_posts")
        .select("id, title, status, zernio_post_id, scheduled_at, ai_review")
        .eq("zernio_post_id", zernioPostId)
        .maybeSingle();

      if (findErr || !post) {
        console.warn(`[Worker:zernio-webhook] ⚠️ Post with zernio_post_id '${zernioPostId}' not found in database.`);
        return {
          success: false,
          zernioPostId,
          newStatus,
          event,
          error: `Post with zernio_post_id '${zernioPostId}' not found`,
        };
      }

      await job.updateProgress(50);

      const nowIso = new Date().toISOString();
      const updatePayload: Record<string, any> = {
        status: newStatus,
        ai_review: {
          ...(post.ai_review || {}),
          last_webhook_event: event,
          last_webhook_at: nowIso,
          webhook_received_at: receivedAt,
          webhook_job_id: job.id,
          published_at: newStatus === "PUBLISHED" ? nowIso : (post.ai_review?.published_at || null),
        },
      };

      if (newStatus === "PUBLISHED") {
        updatePayload.published_at = nowIso;
      }

      // 2. Update post status in database
      const { error: updateErr } = await supabase
        .from("content_posts")
        .update(updatePayload)
        .eq("id", post.id);

      if (updateErr) {
        // Fallback without published_at column if not yet migrated
        delete updatePayload.published_at;
        await supabase
          .from("content_posts")
          .update(updatePayload)
          .eq("id", post.id);
      }

      await job.updateProgress(100);

      console.log(
        `[Worker:zernio-webhook] ✅ Post ${post.id} ("${post.title}") transitioned: ${post.status} ➔ ${newStatus} (Event: ${event})`
      );

      return {
        success: true,
        postId: post.id,
        zernioPostId,
        oldStatus: post.status,
        newStatus,
        event,
      };
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[Worker:zernio-webhook] 🎉 Webhook job ${job.id} processed successfully`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker:zernio-webhook] ❌ Webhook job ${job?.id} failed:`, err.message);
  });

  return worker;
}
