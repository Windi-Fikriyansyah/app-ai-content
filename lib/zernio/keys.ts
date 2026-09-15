import { SupabaseClient } from "@supabase/supabase-js";
import { ZernioClient } from "./client";

export interface ZernioApiKeyRecord {
  id: string;
  workspace_id: string;
  label: string;
  api_key: string;
  profile_id?: string | null;
  max_accounts: number;
  is_active: boolean;
  created_at?: string;
  connected_accounts_count?: number;
}

/**
 * Fetch all Zernio API keys for a workspace, along with the count of active connected accounts.
 */
export async function getWorkspaceZernioKeys(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<ZernioApiKeyRecord[]> {
  try {
    const { data: keys, error: keysErr } = await supabase
      .from("zernio_api_keys")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (!keysErr && keys && keys.length > 0) {
      // Query active social accounts counts grouped by zernio_key_id
      const { data: accs } = await supabase
        .from("social_accounts")
        .select("id, zernio_key_id, status")
        .eq("workspace_id", workspaceId)
        .neq("status", "disconnected");

      const countMap: Record<string, number> = {};
      if (accs) {
        for (const acc of accs) {
          if (acc.zernio_key_id) {
            countMap[acc.zernio_key_id] = (countMap[acc.zernio_key_id] || 0) + 1;
          }
        }
      }

      return keys.map((k) => ({
        ...k,
        max_accounts: k.max_accounts || 2,
        connected_accounts_count: countMap[k.id] || 0,
      }));
    }
  } catch (err) {
    console.warn("Notice: zernio_api_keys table query issue:", err);
  }

  // Fallback: Check workspaces table for legacy single key
  try {
    const { data: ws } = await supabase
      .from("workspaces")
      .select("id, zernio_api_key, zernio_profile_id")
      .eq("id", workspaceId)
      .maybeSingle();

    const legacyKey = ws?.zernio_api_key || process.env.ZERNIO_API_KEY;
    if (legacyKey && legacyKey.length > 8 && !legacyKey.includes("your_zernio_api_key")) {
      const { count } = await supabase
        .from("social_accounts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .neq("status", "disconnected");

      return [
        {
          id: "legacy_default",
          workspace_id: workspaceId,
          label: "API Key Utama (Legacy)",
          api_key: legacyKey,
          profile_id: ws?.zernio_profile_id || null,
          max_accounts: 2,
          is_active: true,
          connected_accounts_count: count || 0,
        },
      ];
    }
  } catch (legacyErr) {
    console.warn("Legacy key query error:", legacyErr);
  }

  return [];
}

/**
 * Finds an active Zernio API key that still has capacity (< max_accounts, usually < 2).
 */
export async function getAvailableZernioKey(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<{
  key: ZernioApiKeyRecord | null;
  remainingSlots: number;
  totalKeys: number;
  error?: string;
}> {
  const keys = await getWorkspaceZernioKeys(supabase, workspaceId);

  if (keys.length === 0) {
    return {
      key: null,
      remainingSlots: 0,
      totalKeys: 0,
      error: "Belum ada API Key Zernio yang didaftarkan. Harap tambahkan API Key Zernio terlebih dahulu.",
    };
  }

  // Find first key with available slots
  for (const k of keys) {
    const used = k.connected_accounts_count || 0;
    const max = k.max_accounts || 2;
    if (used < max) {
      return {
        key: k,
        remainingSlots: max - used,
        totalKeys: keys.length,
      };
    }
  }

  // All keys are at full capacity
  return {
    key: null,
    remainingSlots: 0,
    totalKeys: keys.length,
    error: `Semua API Key Zernio Anda (${keys.length} key) sudah mencapai batas maksimal (2 akun per key). Harap tambahkan API Key Zernio baru untuk menghubungkan akun berikutnya.`,
  };
}
