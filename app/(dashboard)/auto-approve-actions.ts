"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Helper to auto-approve and schedule all pending "READY FOR APPROVAL" posts in a workspace
 */
export async function autoApprovePendingWorkspacePosts(
  supabase: any,
  workspaceId: string,
  userId?: string
): Promise<{ success: boolean; approvedCount: number }> {
  try {
    const { data: readyPosts } = await supabase
      .from("content_posts")
      .select("id, scheduled_date, scheduled_time, ai_review")
      .eq("workspace_id", workspaceId)
      .eq("status", "READY FOR APPROVAL");

    if (!readyPosts || readyPosts.length === 0) {
      return { success: true, approvedCount: 0 };
    }

    console.log(
      `[AutoApprove] ⚡ Auto-approving ${readyPosts.length} pending ready posts for workspace ${workspaceId}...`
    );

    let count = 0;
    const { enqueueZernioDispatch } = await import("@/lib/queue/queues");

    for (const p of readyPosts) {
      try {
        await supabase
          .from("content_posts")
          .update({ status: "APPROVED" })
          .eq("id", p.id);

        const dispatchJob = await enqueueZernioDispatch({
          postId: p.id,
          workspaceId,
          userId: userId || "",
          action: "create_scheduled_post",
        });

        await supabase
          .from("content_posts")
          .update({
            status: "SCHEDULED",
            ai_review: {
              ...(p.ai_review || {}),
              dispatch_job_id: dispatchJob.jobId,
              queued_at: new Date().toISOString(),
              auto_approved: true,
            },
          })
          .eq("id", p.id);

        count++;
      } catch (pErr: any) {
        console.warn(`[AutoApprove] Error auto-scheduling post ${p.id}:`, pErr?.message || pErr);
      }
    }

    return { success: true, approvedCount: count };
  } catch (err: any) {
    console.error("[AutoApprove] Error in autoApprovePendingWorkspacePosts:", err);
    return { success: false, approvedCount: 0 };
  }
}

/**
 * Get current Auto-Approve setting for the authenticated user
 */
export async function getAutoApproveAction(): Promise<{
  success: boolean;
  enabled: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, enabled: false, error: "Sesi tidak ditemukan" };
    }

    // 1. Check user_metadata first (primary fast source)
    if (typeof user.user_metadata?.auto_approve === "boolean") {
      return { success: true, enabled: user.user_metadata.auto_approve };
    }

    // 2. Fallback check: content_preferences table via workspace owner_id / user_id
    try {
      let { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!ws) {
        const fallback = await supabase
          .from("workspaces")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        ws = fallback.data;
      }

      if (ws?.id) {
        const { data: cp } = await supabase
          .from("content_preferences")
          .select("auto_approve")
          .eq("workspace_id", ws.id)
          .maybeSingle();

        if (cp && typeof cp.auto_approve === "boolean") {
          return { success: true, enabled: cp.auto_approve };
        }
      }
    } catch {
      // safe fallback if column not yet added
    }

    return { success: true, enabled: false };
  } catch (err: any) {
    console.error("Error in getAutoApproveAction:", err);
    return { success: false, enabled: false, error: err.message };
  }
}

/**
 * Toggle Auto-Approve setting
 */
export async function toggleAutoApproveAction(
  enabled: boolean
): Promise<{
  success: boolean;
  enabled: boolean;
  approvedCount?: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, enabled: false, error: "Sesi tidak ditemukan" };
    }

    // 1. Persist to auth user_metadata
    const { error: userErr } = await supabase.auth.updateUser({
      data: {
        auto_approve: enabled,
      },
    });

    if (userErr) {
      console.warn("Notice updating user metadata auto_approve:", userErr);
    }

    // 2. Persist to content_preferences via workspace (check owner_id, then user_id)
    let workspaceId: string | null = null;
    try {
      let { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!ws) {
        const fallback = await supabase
          .from("workspaces")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        ws = fallback.data;
      }

      if (ws?.id) {
        workspaceId = ws.id;
        await supabase
          .from("content_preferences")
          .update({ auto_approve: enabled })
          .eq("workspace_id", ws.id);
      }
    } catch (cpErr) {
      console.warn("Notice updating content_preferences table auto_approve:", cpErr);
    }

    let approvedCount = 0;
    // 3. When enabled, automatically auto-approve any pending "READY FOR APPROVAL" posts!
    if (enabled && workspaceId) {
      const sweepRes = await autoApprovePendingWorkspacePosts(supabase, workspaceId, user.id);
      approvedCount = sweepRes.approvedCount;
    }

    revalidatePath("/content-calendar");
    revalidatePath("/content-library");
    revalidatePath("/ai-agent/content-generation");

    return { success: true, enabled, approvedCount };
  } catch (err: any) {
    console.error("Error in toggleAutoApproveAction:", err);
    return { success: false, enabled: false, error: err.message };
  }
}

/**
 * Action to sweep and auto-approve all pending READY FOR APPROVAL posts if auto-approve is active
 */
export async function syncAndApprovePendingAction(): Promise<{
  success: boolean;
  approvedCount: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, approvedCount: 0, error: "Sesi tidak ditemukan" };
    }

    let { data: ws } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!ws) {
      const fallback = await supabase
        .from("workspaces")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      ws = fallback.data;
    }

    if (!ws?.id) {
      return { success: false, approvedCount: 0, error: "Workspace tidak ditemukan" };
    }

    const isEnabled = await checkIsAutoApproveEnabled(supabase, user.id, ws.id);
    if (!isEnabled) {
      return { success: true, approvedCount: 0 };
    }

    const res = await autoApprovePendingWorkspacePosts(supabase, ws.id, user.id);

    revalidatePath("/content-calendar");
    revalidatePath("/content-library");

    return res;
  } catch (err: any) {
    console.error("Error in syncAndApprovePendingAction:", err);
    return { success: false, approvedCount: 0, error: err.message };
  }
}

/**
 * Server helper to check if Auto-Approve is enabled in any context (action, worker, cron)
 */
export async function checkIsAutoApproveEnabled(
  supabaseClient: any,
  userId?: string,
  workspaceId?: string
): Promise<boolean> {
  // 1. Check user metadata via auth.admin if available
  if (userId && supabaseClient?.auth?.admin?.getUserById) {
    try {
      const { data: userData } = await supabaseClient.auth.admin.getUserById(userId);
      if (typeof userData?.user?.user_metadata?.auto_approve === "boolean") {
        return userData.user.user_metadata.auto_approve;
      }
    } catch {
      // ignore
    }
  }

  // 2. Check current session user if available
  try {
    if (supabaseClient?.auth?.getUser) {
      const { data } = await supabaseClient.auth.getUser();
      if (typeof data?.user?.user_metadata?.auto_approve === "boolean") {
        return data.user.user_metadata.auto_approve;
      }
    }
  } catch {
    // ignore
  }

  // 3. Check content_preferences table
  if (workspaceId) {
    try {
      const { data: cp } = await supabaseClient
        .from("content_preferences")
        .select("auto_approve")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (cp && typeof cp.auto_approve === "boolean") {
        return cp.auto_approve;
      }
    } catch {
      // ignore
    }
  }

  // 4. Check workspace owner if workspaceId is provided
  if (workspaceId) {
    try {
      let ownerId: string | null = null;
      const { data: wsOwner } = await supabaseClient
        .from("workspaces")
        .select("owner_id")
        .eq("id", workspaceId)
        .maybeSingle();

      if (wsOwner?.owner_id) {
        ownerId = wsOwner.owner_id;
      } else {
        const { data: wsUser } = await supabaseClient
          .from("workspaces")
          .select("user_id")
          .eq("id", workspaceId)
          .maybeSingle();
        if (wsUser?.user_id) ownerId = wsUser.user_id;
      }

      if (ownerId && supabaseClient?.auth?.admin?.getUserById) {
        const { data: userData } = await supabaseClient.auth.admin.getUserById(ownerId);
        if (typeof userData?.user?.user_metadata?.auto_approve === "boolean") {
          return userData.user.user_metadata.auto_approve;
        }
      }
    } catch {
      // ignore
    }
  }

  return false;
}
