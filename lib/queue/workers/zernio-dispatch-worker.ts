import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../redis";
import { QUEUE_NAMES, ZernioDispatchJobData } from "../queues";
import { createAdminClient } from "../../supabase/admin";
import { ZernioClient } from "../../zernio/client";

export interface ZernioDispatchWorkerResult {
  success: boolean;
  postId: string;
  zernioPostId?: string;
  scheduledAt?: string;
  status: string;
  error?: string;
}

export function createZernioDispatchWorker() {
  const worker = new Worker<ZernioDispatchJobData, ZernioDispatchWorkerResult>(
    QUEUE_NAMES.ZERNIO_DISPATCH,
    async (job: Job<ZernioDispatchJobData>) => {
      const { postId, workspaceId } = job.data;
      console.log(`[Worker:zernio-dispatch] 🚀 [Job: ${job.id}] Dispatching post ${postId} to Zernio API...`);
      await job.updateProgress(10);

      const supabase = createAdminClient();

      // 1. Fetch Post details
      const { data: post, error: postErr } = await supabase
        .from("content_posts")
        .select("*")
        .eq("id", postId)
        .maybeSingle();

      if (postErr || !post) {
        throw new Error(`Content post not found for ID: ${postId}`);
      }

      await job.updateProgress(30);

      // 2. Prepare Media & Caption
      const mediaUrl = post.media_url;
      const mediaUrls = mediaUrl ? [mediaUrl] : [];

      const hashtagsStr =
        Array.isArray(post.hashtags) && post.hashtags.length > 0
          ? `\n\n${post.hashtags.map((h: string) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`
          : "";
      const fullContent = `${post.caption || post.title}${hashtagsStr}`.trim();

      // 3. Resolve Zernio API Key & Workspace
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("id, zernio_api_key, zernio_profile_id")
        .eq("id", workspaceId)
        .maybeSingle();

      const zernioApiKey =
        workspace?.zernio_api_key ||
        process.env.ZERNIO_API_KEY ||
        "zernio_sandbox_key";

      // 4. Resolve Connected Instagram Account
      const { data: socialAcc } = await supabase
        .from("social_accounts")
        .select("id, provider, provider_account_id, username")
        .eq("workspace_id", workspaceId)
        .eq("provider", "instagram")
        .maybeSingle();

      const zernioAccountId =
        socialAcc?.provider_account_id ||
        socialAcc?.id ||
        workspace?.zernio_profile_id ||
        "acc_instagram_primary";

      // 5. Calculate ISO Scheduled Date Time (Asia/Jakarta +07:00)
      const scheduledDateStr = post.scheduled_date || new Date().toISOString().split("T")[0];
      const scheduledTimeStr = post.scheduled_time || "19:00:00";
      const scheduledAtStr = `${scheduledDateStr}T${scheduledTimeStr}+07:00`;
      let scheduledAtDate = new Date(scheduledAtStr);
      if (isNaN(scheduledAtDate.getTime())) {
        scheduledAtDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }

      await job.updateProgress(50);

      // 6. Call Zernio API
      const zernioClient = new ZernioClient(zernioApiKey);

      // If old Zernio post exists, delete it first to ensure no duplicates
      const oldZernioPostId = post.zernio_post_id;
      if (oldZernioPostId) {
        console.log(`[Worker:zernio-dispatch] 🗑️ Deleting previous Zernio post ${oldZernioPostId} before scheduling new post...`);
        try {
          const delRes = await zernioClient.deletePost(oldZernioPostId);
          console.log(`[Worker:zernio-dispatch] 🗑️ Delete old post result:`, delRes.success ? "Deleted ✅" : delRes.error);
        } catch (delErr: any) {
          console.warn(`[Worker:zernio-dispatch] ⚠️ Could not delete old post ${oldZernioPostId}:`, delErr.message);
        }
      }

      console.log(`[Worker:zernio-dispatch] 📤 Sending to Zernio API: Account=${zernioAccountId}, Format=${post.format}, ScheduledAt=${scheduledAtDate.toISOString()}`);

      const zernioRes = await zernioClient.createPost({
        accountIds: [zernioAccountId],
        content: fullContent,
        mediaUrls,
        format: post.format,
        scheduledAt: scheduledAtDate.toISOString(),
        timezone: "Asia/Jakarta",
      });

      if (!zernioRes.success) {
        throw new Error(zernioRes.error || "Failed to create scheduled post in Zernio API");
      }

      await job.updateProgress(80);

      const zernioPostId = zernioRes.data?.id || `zernio_post_${Date.now()}`;
      console.log(`[Worker:zernio-dispatch] ✅ Post scheduled in Zernio: ${zernioPostId}`);

      // 7. Update database: Status becomes SCHEDULED
      const updatePayload: Record<string, any> = {
        status: "SCHEDULED",
        zernio_post_id: zernioPostId,
        scheduled_at: scheduledAtDate.toISOString(),
        ai_review: {
          ...(post.ai_review || {}),
          zernio_account_id: zernioAccountId,
          scheduled_at: scheduledAtDate.toISOString(),
          dispatched_via: "bullmq_queue",
          dispatched_at: new Date().toISOString(),
        },
      };

      const { error: updateErr } = await supabase
        .from("content_posts")
        .update({
          ...updatePayload,
          zernio_account_id: zernioAccountId,
        })
        .eq("id", postId);

      if (updateErr) {
        // Fallback without zernio_account_id column
        await supabase
          .from("content_posts")
          .update(updatePayload)
          .eq("id", postId);
      }

      await job.updateProgress(100);

      return {
        success: true,
        postId,
        zernioPostId,
        scheduledAt: scheduledAtDate.toISOString(),
        status: "SCHEDULED",
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
