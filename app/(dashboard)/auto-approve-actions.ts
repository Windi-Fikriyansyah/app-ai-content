"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

    // 2. Fallback check: content_preferences table via workspace
    try {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

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

    // 2. Persist to content_preferences if table/column exists
    try {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (ws?.id) {
        await supabase
          .from("content_preferences")
          .update({ auto_approve: enabled })
          .eq("workspace_id", ws.id);
      }
    } catch (cpErr) {
      console.warn("Notice updating content_preferences table auto_approve:", cpErr);
    }

    revalidatePath("/content-calendar");
    revalidatePath("/content-library");
    revalidatePath("/ai-agent/content-generation");

    return { success: true, enabled };
  } catch (err: any) {
    console.error("Error in toggleAutoApproveAction:", err);
    return { success: false, enabled: false, error: err.message };
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
  if (workspaceId && supabaseClient?.auth?.admin?.getUserById) {
    try {
      const { data: ws } = await supabaseClient
        .from("workspaces")
        .select("user_id")
        .eq("id", workspaceId)
        .maybeSingle();

      if (ws?.user_id) {
        const { data: userData } = await supabaseClient.auth.admin.getUserById(ws.user_id);
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
