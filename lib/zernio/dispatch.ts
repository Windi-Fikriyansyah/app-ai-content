import { SupabaseClient } from "@supabase/supabase-js";
import { ZernioClient } from "./client";
import { getWorkspaceZernioKeys, ZernioApiKeyRecord } from "./keys";

export interface ZernioDispatchResult {
  key_id: string;
  key_label: string;
  zernio_post_id: string;
  account_ids: string[];
  platforms: string[];
  status: "SCHEDULED" | "FAILED";
  error?: string;
}

export interface DispatchPostParams {
  supabase: SupabaseClient;
  post: any;
  workspaceId: string;
}

/**
 * Dispatches a content post to Zernio with Multi-API Key support.
 * Automatically groups accounts by their associated Zernio API Key,
 * creates posts via each respective key's client, and records dispatch metadata.
 */
export async function dispatchPostToZernio({
  supabase,
  post,
  workspaceId,
}: DispatchPostParams): Promise<{
  success: boolean;
  zernioPostId?: string;
  dispatchMeta?: ZernioDispatchResult[];
  platformNames?: string;
  scheduledAt?: string;
  error?: string;
}> {
  try {
    const postId = post.id;

    // 1. Prepare Media URLs
    let mediaUrls: string[] = [];
    if (post.media_url) {
      if (typeof post.media_url === "string") {
        try {
          const parsed = JSON.parse(post.media_url);
          mediaUrls = Array.isArray(parsed) ? parsed : [post.media_url];
        } catch {
          mediaUrls = [post.media_url];
        }
      } else if (Array.isArray(post.media_url)) {
        mediaUrls = post.media_url;
      }
    }

    // 2. Prepare Default Full Content
    const hashtagsStr =
      Array.isArray(post.hashtags) && post.hashtags.length > 0
        ? `\n\n${post.hashtags.map((h: string) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`
        : "";
    const fullContent = `${post.caption || post.title}${hashtagsStr}`.trim();

    // 3. Resolve Workspace API Keys (Multi-Key Pool)
    const workspaceKeys = await getWorkspaceZernioKeys(supabase, workspaceId);

    if (workspaceKeys.length === 0) {
      return {
        success: false,
        error: "Tidak ada API Key Zernio yang terdaftar. Harap tambahkan API Key Zernio di menu Social Accounts.",
      };
    }

    const keyMap = new Map<string, ZernioApiKeyRecord>();
    workspaceKeys.forEach((k) => keyMap.set(k.id, k));
    const defaultKey = workspaceKeys[0];

    // 4. Resolve Active Social Accounts for this workspace
    const isValidZernioId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

    const { data: activeSocialAccounts } = await supabase
      .from("social_accounts")
      .select("id, provider, provider_account_id, username, status, zernio_key_id")
      .eq("workspace_id", workspaceId)
      .neq("status", "disconnected");

    // If no accounts found in DB, try live sync from each key
    if (!activeSocialAccounts || activeSocialAccounts.length === 0) {
      console.log(`[ZernioDispatch] 🔍 No active accounts in DB. Syncing live accounts across all Zernio keys...`);
      for (const k of workspaceKeys) {
        try {
          const client = new ZernioClient(k.api_key);
          const res = await client.getAccounts(k.profile_id || undefined);
          const raw = res.data as any;
          const remoteList = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.data)
            ? raw.data
            : Array.isArray(raw?.accounts)
            ? raw.accounts
            : [];

          for (const ra of remoteList) {
            const rId = ra._id || ra.id;
            if (rId && isValidZernioId(rId)) {
              await supabase.from("social_accounts").upsert(
                {
                  workspace_id: workspaceId,
                  provider: (ra.platform || ra.provider || "instagram").toLowerCase(),
                  provider_account_id: rId,
                  username: ra.username || "user",
                  display_name: ra.displayName || ra.name || ra.username || "user",
                  status: "connected",
                  zernio_key_id: k.id !== "legacy_default" ? k.id : null,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "workspace_id,provider,provider_account_id" }
              );
            }
          }
        } catch (syncErr: any) {
          console.warn(`[ZernioDispatch] Warning syncing accounts for key ${k.label}:`, syncErr.message);
        }
      }
    }

    // Re-query active accounts
    const { data: syncedAccounts } = await supabase
      .from("social_accounts")
      .select("id, provider, provider_account_id, username, status, zernio_key_id")
      .eq("workspace_id", workspaceId)
      .neq("status", "disconnected");

    if (!syncedAccounts || syncedAccounts.length === 0) {
      return {
        success: false,
        error: "Tidak ada akun media sosial yang valid terhubung ke Zernio. Harap hubungkan akun di menu Social Accounts.",
      };
    }

    // 5. Group Accounts by their associated Zernio API Key
    // Filter only accounts matching post.platform if specified
    let allowedPlatforms: Set<string> | null = null;
    if (post.platform && typeof post.platform === "string") {
      const parts = post.platform
        .split(",")
        .map((p: string) => p.trim().toLowerCase())
        .filter(Boolean);
      if (parts.length > 0 && !parts.includes("all")) {
        allowedPlatforms = new Set(parts.map((p: string) => (p === "x" ? "twitter" : p)));
      }
    }

    interface KeyGroup {
      key: ZernioApiKeyRecord;
      accountIds: string[];
      platforms: Array<{ platform: string; accountId: string; customContent?: string; content?: string }>;
    }

    const groupsMap = new Map<string, KeyGroup>();

    for (const acc of syncedAccounts) {
      const accId = acc.provider_account_id;
      if (!accId || !isValidZernioId(accId)) continue;

      const prov = (acc.provider || "instagram").toLowerCase();
      const platformKey = prov === "x" ? "twitter" : prov;

      // Filter: only include accounts that match the post's target platforms
      if (allowedPlatforms && !allowedPlatforms.has(platformKey)) {
        continue;
      }

      // Match to associated key or default to first key
      const assignedKey = (acc.zernio_key_id && keyMap.get(acc.zernio_key_id)) || defaultKey;

      if (!groupsMap.has(assignedKey.id)) {
        groupsMap.set(assignedKey.id, {
          key: assignedKey,
          accountIds: [],
          platforms: [],
        });
      }

      const grp = groupsMap.get(assignedKey.id)!;
      if (!grp.accountIds.includes(accId)) {
        grp.accountIds.push(accId);

        // Custom caption specifically for Threads (≤480 characters)
        if (platformKey === "threads") {
          const rawThreads =
            post.threads_caption ||
            (post.ai_review as Record<string, any>)?.threads_caption ||
            post.caption ||
            post.title ||
            "";
          let threadsTxt = String(rawThreads).trim();
          if (threadsTxt.length > 480) {
            const sliced = threadsTxt.slice(0, 475);
            const ls = sliced.lastIndexOf(" ");
            threadsTxt = (ls > 300 ? sliced.slice(0, ls) : sliced).trim() + "...";
          }
          grp.platforms.push({
            platform: platformKey,
            accountId: accId,
            customContent: threadsTxt,
            content: threadsTxt,
          });
        } else if (platformKey === "tiktok") {
          const isVideoUrl = (u: string) => /\.(mp4|mov|webm|avi)(\?.*)?$/i.test(u) || u.includes("/video");
          const hasVideo = mediaUrls.some((u) => isVideoUrl(u));
          const isImageOnly = mediaUrls.length > 0 && !hasVideo;

          grp.platforms.push({
            platform: platformKey,
            accountId: accId,
            ...(isImageOnly
              ? { autoAddMusic: true, auto_add_music: true }
              : { autoAddMusic: false, auto_add_music: false }),
          } as any);
        } else {
          grp.platforms.push({
            platform: platformKey,
            accountId: accId,
          });
        }
      }
    }

    if (groupsMap.size === 0) {
      return {
        success: false,
        error: "Tidak ditemukan akun media sosial dengan ID Zernio 24-hex yang valid.",
      };
    }

    // 6. Calculate Scheduled ISO Date Time (Asia/Jakarta +07:00)
    const scheduledDateStr = post.scheduled_date || new Date().toISOString().split("T")[0];
    const scheduledTimeStr = post.scheduled_time || "19:00:00";
    const scheduledAtStr = `${scheduledDateStr}T${scheduledTimeStr}+07:00`;
    let scheduledAtDate = new Date(scheduledAtStr);
    if (isNaN(scheduledAtDate.getTime())) {
      scheduledAtDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    // 7. Delete previous scheduled posts across all keys to prevent duplicates
    await deleteScheduledPostFromZernio({ supabase, post, workspaceId });

    // 8. Execute Multi-Key Dispatch Loop
    const dispatchMetaList: ZernioDispatchResult[] = [];
    const allPlatforms: string[] = [];
    const allAccountIds: string[] = [];

    for (const [, grp] of groupsMap.entries()) {
      console.log(`[ZernioDispatch] 📤 Dispatching to [${grp.key.label}]: Accounts=[${grp.accountIds.join(", ")}], Platforms=[${grp.platforms.map((p) => p.platform).join(", ")}]`);

      const client = new ZernioClient(grp.key.api_key);
      try {
        const zernioRes = await client.createPost({
          accountIds: grp.accountIds,
          platforms: grp.platforms,
          content: fullContent,
          mediaUrls,
          format: post.format,
          scheduledAt: scheduledAtDate.toISOString(),
          timezone: "Asia/Jakarta",
        });

        if (zernioRes.success && zernioRes.data) {
          const zpId = zernioRes.data.id || `zernio_post_${Date.now()}`;
          dispatchMetaList.push({
            key_id: grp.key.id,
            key_label: grp.key.label,
            zernio_post_id: zpId,
            account_ids: grp.accountIds,
            platforms: grp.platforms.map((p) => p.platform),
            status: "SCHEDULED",
          });
          grp.platforms.forEach((p) => allPlatforms.push(p.platform));
          grp.accountIds.forEach((id) => allAccountIds.push(id));
        } else {
          console.error(`[ZernioDispatch] ❌ Failed dispatching to key ${grp.key.label}:`, zernioRes.error);
          dispatchMetaList.push({
            key_id: grp.key.id,
            key_label: grp.key.label,
            zernio_post_id: "",
            account_ids: grp.accountIds,
            platforms: grp.platforms.map((p) => p.platform),
            status: "FAILED",
            error: zernioRes.error || "Gagal membuat jadwal di Zernio",
          });
        }
      } catch (err: any) {
        console.error(`[ZernioDispatch] ❌ Exception dispatching to key ${grp.key.label}:`, err);
        dispatchMetaList.push({
          key_id: grp.key.id,
          key_label: grp.key.label,
          zernio_post_id: "",
          account_ids: grp.accountIds,
          platforms: grp.platforms.map((p) => p.platform),
          status: "FAILED",
          error: err.message,
        });
      }
    }

    // Check if at least one dispatch succeeded
    const successfulDispatches = dispatchMetaList.filter((d) => d.status === "SCHEDULED" && d.zernio_post_id);
    if (successfulDispatches.length === 0) {
      const errors = dispatchMetaList.map((d) => `${d.key_label}: ${d.error}`).join("; ");
      return {
        success: false,
        error: `Gagal menjadwalkan ke Zernio: ${errors}`,
        dispatchMeta: dispatchMetaList,
      };
    }

    const primaryPostId = successfulDispatches[0].zernio_post_id;
    const platformNames = Array.from(new Set(allPlatforms)).join(", ");

    // 9. Update Database: Status -> SCHEDULED
    const updatePayload: Record<string, any> = {
      status: "SCHEDULED",
      zernio_post_id: primaryPostId,
      zernio_dispatch_meta: dispatchMetaList,
      scheduled_at: scheduledAtDate.toISOString(),
      platform: platformNames || post.platform || "instagram",
      ai_review: {
        ...(post.ai_review || {}),
        zernio_account_id: allAccountIds[0] || null,
        zernio_account_ids: allAccountIds,
        platforms: Array.from(new Set(allPlatforms)),
        scheduled_at: scheduledAtDate.toISOString(),
        multi_key_dispatch: dispatchMetaList,
        dispatched_at: new Date().toISOString(),
      },
    };

    try {
      const { error: updateErr } = await supabase
        .from("content_posts")
        .update({
          ...updatePayload,
          zernio_account_id: allAccountIds[0] || null,
        })
        .eq("id", postId);

      if (updateErr) {
        // Fallback without new columns if schema migration pending
        delete updatePayload.zernio_dispatch_meta;
        await supabase.from("content_posts").update(updatePayload).eq("id", postId);
      }
    } catch (saveErr) {
      console.warn("[ZernioDispatch] Warning saving updatePayload:", saveErr);
    }

    return {
      success: true,
      zernioPostId: primaryPostId,
      dispatchMeta: dispatchMetaList,
      platformNames,
      scheduledAt: scheduledAtDate.toISOString(),
    };
  } catch (err: any) {
    console.error("[ZernioDispatch] ❌ Critical error in dispatchPostToZernio:", err);
    return {
      success: false,
      error: err.message || "Terjadi kesalahan internal saat menjadwalkan postingan ke Zernio.",
    };
  }
}

/**
 * Deletes all scheduled posts from Zernio across all API keys associated with the post.
 */
export async function deleteScheduledPostFromZernio({
  supabase,
  post,
  workspaceId,
}: DispatchPostParams): Promise<void> {
  try {
    const workspaceKeys = await getWorkspaceZernioKeys(supabase, workspaceId);
    const keyMap = new Map<string, ZernioApiKeyRecord>();
    workspaceKeys.forEach((k) => keyMap.set(k.id, k));
    const defaultClient = workspaceKeys.length > 0 ? new ZernioClient(workspaceKeys[0].api_key) : null;

    // 1. Delete items recorded in zernio_dispatch_meta or ai_review.multi_key_dispatch
    const dispatchMeta: ZernioDispatchResult[] =
      post.zernio_dispatch_meta || post.ai_review?.multi_key_dispatch || [];

    for (const item of dispatchMeta) {
      if (item.zernio_post_id) {
        const matchedKey = keyMap.get(item.key_id);
        const client = matchedKey ? new ZernioClient(matchedKey.api_key) : defaultClient;
        if (client) {
          try {
            console.log(`[ZernioDispatch] 🗑️ Deleting Zernio post ${item.zernio_post_id} via key [${matchedKey?.label || "default"}]...`);
            await client.deletePost(item.zernio_post_id);
          } catch (delErr: any) {
            console.warn(`[ZernioDispatch] Warning deleting post ${item.zernio_post_id}:`, delErr.message);
          }
        }
      }
    }

    // 2. Also delete primary post.zernio_post_id if not already deleted
    if (post.zernio_post_id && defaultClient) {
      const alreadyDeleted = dispatchMeta.some((d) => d.zernio_post_id === post.zernio_post_id);
      if (!alreadyDeleted) {
        try {
          console.log(`[ZernioDispatch] 🗑️ Deleting primary Zernio post ${post.zernio_post_id}...`);
          await defaultClient.deletePost(post.zernio_post_id);
        } catch (delErr: any) {
          console.warn(`[ZernioDispatch] Warning deleting primary post ${post.zernio_post_id}:`, delErr.message);
        }
      }
    }
  } catch (err: any) {
    console.warn("[ZernioDispatch] Warning in deleteScheduledPostFromZernio:", err.message);
  }
}
