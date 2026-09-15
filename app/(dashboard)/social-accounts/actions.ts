"use server";

import { createClient } from "@/lib/supabase/server";
import { ZernioClient, ZernioAccount } from "@/lib/zernio/client";
import { getWorkspaceZernioKeys, getAvailableZernioKey, ZernioApiKeyRecord } from "@/lib/zernio/keys";
import { revalidatePath } from "next/cache";

export interface ConnectedAccount {
  id: string;
  provider: "instagram" | "facebook" | "twitter" | "linkedin" | "tiktok" | string;
  providerAccountId: string;
  username: string;
  displayName: string;
  profilePictureUrl?: string;
  status: "connected" | "disconnected" | "expired";
  createdAt: string;
  zernioKeyId?: string;
  zernioKeyLabel?: string;
}

export interface ZernioKeyItem {
  id: string;
  label: string;
  apiKey: string;
  maskedApiKey: string;
  profileId?: string | null;
  maxAccounts: number;
  connectedCount: number;
  isActive: boolean;
}

export interface SocialAccountsData {
  workspace: {
    id?: string;
    name: string;
    zernioApiKey?: string;
    isApiKeyConfigured: boolean;
    zernioProfileId?: string;
  };
  connectedAccounts: ConnectedAccount[];
  apiKeys: ZernioKeyItem[];
  totalCapacity: number;
  totalUsed: number;
}

/**
 * Helper to get workspace & API key
 */
async function getActiveWorkspaceInfo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, workspace: null, supabase };

  let workspace: any = null;
  const userMetadata = user.user_metadata || {};

  try {
    const { data: ws } = await supabase
      .from("workspaces")
      .select("id, name, zernio_api_key, zernio_profile_id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ws) {
      workspace = ws;
    }
  } catch (err) {
    console.warn("Workspaces table select notice:", err);
  }

  // Fallback to metadata
  if (!workspace) {
    workspace = {
      id: userMetadata.workspace_id || "default-ws",
      name: userMetadata.workspace_name || userMetadata.business_name || "Dapur Bu Ani",
      zernio_api_key: userMetadata.zernio_api_key || null,
      zernio_profile_id: userMetadata.zernio_profile_id || null,
    };
  }

  return { user, workspace, supabase };
}

/**
 * 1. Fetch current Social Accounts & Zernio API Keys state
 */
export async function getSocialAccountsData(): Promise<{
  success: boolean;
  data?: SocialAccountsData;
  error?: string;
}> {
  try {
    const { user, workspace, supabase } = await getActiveWorkspaceInfo();

    if (!user || !workspace?.id) {
      return { success: false, error: "Pengguna tidak terautentikasi atau workspace tidak ditemukan." };
    }

    // 1. Fetch all API keys registered for this workspace
    const rawKeys = await getWorkspaceZernioKeys(supabase, workspace.id);

    const keyMap = new Map<string, ZernioApiKeyRecord>();
    rawKeys.forEach((k) => keyMap.set(k.id, k));

    // 2. Fetch live accounts from Zernio for each API key to keep in sync
    for (const k of rawKeys) {
      if (!k.api_key || k.api_key.includes("your_zernio_api_key")) continue;

      try {
        const zernio = new ZernioClient(k.api_key);
        let zernioRes = await zernio.getAccounts(k.profile_id || undefined);

        let rawList: any = zernioRes.data;
        let remoteAccounts: any[] = [];

        if (Array.isArray(rawList)) remoteAccounts = rawList;
        else if (rawList && Array.isArray(rawList.data)) remoteAccounts = rawList.data;
        else if (rawList && Array.isArray(rawList.accounts)) remoteAccounts = rawList.accounts;

        if (remoteAccounts.length === 0) {
          const allRes = await zernio.getAccounts();
          const allRaw: any = allRes.data;
          if (Array.isArray(allRaw)) remoteAccounts = allRaw;
          else if (allRaw && Array.isArray(allRaw.data)) remoteAccounts = allRaw.data;
          else if (allRaw && Array.isArray(allRaw.accounts)) remoteAccounts = allRaw.accounts;
        }

        if (remoteAccounts.length > 0) {
          for (const ra of remoteAccounts) {
            const accId = ra._id || ra.id || ra.accountId;
            if (!accId) continue;
            const pName = (ra.platform || ra.provider || "instagram").toLowerCase();
            const uName = ra.username || ra.accountUsername || ra.name || "user";
            const dName = ra.displayName || ra.name || ra.accountUsername || uName;
            const pic = ra.profile_picture_url || ra.profilePictureUrl || ra.avatarUrl || ra.avatar;

            const upsertPayload: Record<string, any> = {
              workspace_id: workspace.id,
              provider: pName,
              provider_account_id: accId,
              username: uName,
              display_name: dName,
              profile_picture_url: pic || null,
              status: "connected",
              updated_at: new Date().toISOString(),
            };

            if (k.id && k.id !== "legacy_default") {
              upsertPayload.zernio_key_id = k.id;
            }

            try {
              await supabase.from("social_accounts").upsert(
                upsertPayload,
                { onConflict: "workspace_id,provider,provider_account_id" }
              );
            } catch (upsertErr) {
              // Fallback without zernio_key_id column if table column not present yet
              delete upsertPayload.zernio_key_id;
              await supabase.from("social_accounts").upsert(
                upsertPayload,
                { onConflict: "workspace_id,provider,provider_account_id" }
              );
            }
          }
        }
      } catch (syncErr) {
        console.warn(`Could not sync live Zernio accounts for key ${k.label}:`, syncErr);
      }
    }

    // 3. Query all connected accounts from DB
    let connectedAccounts: ConnectedAccount[] = [];
    try {
      const { data: accounts } = await supabase
        .from("social_accounts")
        .select("id, provider, provider_account_id, username, display_name, profile_picture_url, status, created_at, zernio_key_id")
        .eq("workspace_id", workspace.id)
        .neq("status", "disconnected");

      if (accounts && accounts.length > 0) {
        connectedAccounts = accounts.map((a: any) => {
          const associatedKey = a.zernio_key_id ? keyMap.get(a.zernio_key_id) : undefined;
          return {
            id: a.id,
            provider: a.provider,
            providerAccountId: a.provider_account_id,
            username: a.username,
            displayName: a.display_name || a.username,
            profilePictureUrl: a.profile_picture_url,
            status: a.status as any,
            createdAt: a.created_at,
            zernioKeyId: a.zernio_key_id || undefined,
            zernioKeyLabel: associatedKey ? associatedKey.label : (rawKeys[0]?.label || "API Key #1"),
          };
        });
      }
    } catch (tableErr) {
      console.warn("Notice: social_accounts select error:", tableErr);
    }

    // Format API keys for presentation
    const formattedKeys: ZernioKeyItem[] = rawKeys.map((k) => {
      const mask = k.api_key && k.api_key.length > 8
        ? `${k.api_key.slice(0, 7)}••••••••••••${k.api_key.slice(-4)}`
        : "••••••••";
      const count = connectedAccounts.filter((a) => a.zernioKeyId === k.id).length;
      return {
        id: k.id,
        label: k.label || "Zernio Key",
        apiKey: k.api_key,
        maskedApiKey: mask,
        profileId: k.profile_id,
        maxAccounts: k.max_accounts || 2,
        connectedCount: count > 0 ? count : (k.connected_accounts_count || 0),
        isActive: k.is_active,
      };
    });

    const primaryKey = rawKeys[0]?.api_key || workspace.zernio_api_key || "";
    const isPrimaryConfigured = Boolean(primaryKey && primaryKey.length > 8 && !primaryKey.includes("your_zernio_api_key"));

    const totalCapacity = formattedKeys.reduce((sum, k) => sum + (k.maxAccounts || 2), 0);
    const totalUsed = connectedAccounts.length;

    return {
      success: true,
      data: {
        workspace: {
          id: workspace.id,
          name: workspace.name,
          zernioApiKey: primaryKey ? `${primaryKey.slice(0, 7)}••••••••••••${primaryKey.slice(-4)}` : "",
          isApiKeyConfigured: isPrimaryConfigured,
          zernioProfileId: rawKeys[0]?.profile_id || workspace.zernio_profile_id || undefined,
        },
        connectedAccounts,
        apiKeys: formattedKeys,
        totalCapacity,
        totalUsed,
      },
    };
  } catch (err: any) {
    console.error("Error in getSocialAccountsData:", err);
    return { success: false, error: err.message || "Gagal memuat data akun media sosial." };
  }
}

/**
 * 2a. Add a new Zernio API Key to the Workspace pool
 */
export async function addZernioApiKeyAction(
  apiKeyInput: string,
  labelInput?: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const { user, workspace, supabase } = await getActiveWorkspaceInfo();
    if (!user || !workspace?.id) {
      return { success: false, error: "Sesi tidak ditemukan atau workspace tidak valid." };
    }

    const trimmedKey = apiKeyInput.trim();
    if (!trimmedKey || trimmedKey.length < 10) {
      return { success: false, error: "API Key Zernio tidak valid (terlalu pendek)." };
    }

    // 1. Validate key by pinging Zernio API
    const testClient = new ZernioClient(trimmedKey);
    const checkRes = await testClient.getAccounts();
    if (!checkRes.success && !(checkRes as any).mock) {
      return {
        success: false,
        error: `Gagal memvalidasi API Key ke Zernio: ${checkRes.error || "API Key tidak valid atau telah kedaluwarsa."}`,
      };
    }

    // 2. Get or create a Profile ID for this key
    const baseName = workspace.name || user.user_metadata?.business_name || "Workspace";
    const uniqueSuffix = Math.random().toString(36).slice(2, 6);
    const profileRes = await testClient.getOrCreateProfile(`${baseName} (${uniqueSuffix})`);
    const profileId = profileRes.profileId || null;

    // Count existing keys to formulate auto-label
    const { count: existingCount } = await supabase
      .from("zernio_api_keys")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id);

    const nextIndex = (existingCount || 0) + 1;
    const finalLabel = labelInput?.trim() || `API Key #${nextIndex}`;

    // 3. Insert into zernio_api_keys table
    try {
      const { error: insErr } = await supabase.from("zernio_api_keys").insert({
        workspace_id: workspace.id,
        label: finalLabel,
        api_key: trimmedKey,
        profile_id: profileId,
        max_accounts: 2,
        is_active: true,
      });

      if (insErr) throw insErr;
    } catch (tableErr: any) {
      console.warn("Could not insert into zernio_api_keys, falling back to workspace update:", tableErr);
      // Fallback: save to workspace column
      await supabase
        .from("workspaces")
        .update({ zernio_api_key: trimmedKey, zernio_profile_id: profileId })
        .eq("id", workspace.id);
    }

    // Also update workspace zernio_api_key if currently empty
    if (!workspace.zernio_api_key) {
      await supabase
        .from("workspaces")
        .update({ zernio_api_key: trimmedKey, zernio_profile_id: profileId })
        .eq("id", workspace.id);
    }

    revalidatePath("/social-accounts");
    return {
      success: true,
      message: `Berhasil menambahkan ${finalLabel}! Kapasitas bertambah 2 akun media sosial.`,
    };
  } catch (err: any) {
    console.error("Error adding Zernio API Key:", err);
    return { success: false, error: err.message || "Gagal menambahkan API Key Zernio." };
  }
}

/**
 * 2b. Delete a Zernio API Key from the Workspace pool
 */
export async function deleteZernioApiKeyAction(keyId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const { user, workspace, supabase } = await getActiveWorkspaceInfo();
    if (!user || !workspace?.id) {
      return { success: false, error: "Sesi tidak ditemukan." };
    }

    // Check if any connected accounts are using this key
    const { data: linkedAccs } = await supabase
      .from("social_accounts")
      .select("id, username, provider")
      .eq("workspace_id", workspace.id)
      .eq("zernio_key_id", keyId)
      .neq("status", "disconnected");

    if (linkedAccs && linkedAccs.length > 0) {
      const names = linkedAccs.map((a) => `${a.provider} (@${a.username})`).join(", ");
      return {
        success: false,
        error: `Tidak dapat menghapus API Key ini karena masih terhubung dengan ${linkedAccs.length} akun media sosial aktif: ${names}. Harap putuskan (disconnect) akun-akun tersebut terlebih dahulu.`,
      };
    }

    // Delete from zernio_api_keys
    try {
      await supabase
        .from("zernio_api_keys")
        .delete()
        .eq("id", keyId)
        .eq("workspace_id", workspace.id);
    } catch (delErr: any) {
      console.warn("Delete zernio_api_keys error:", delErr);
    }

    revalidatePath("/social-accounts");
    return {
      success: true,
      message: "API Key Zernio berhasil dihapus.",
    };
  } catch (err: any) {
    console.error("Error deleting Zernio API Key:", err);
    return { success: false, error: err.message || "Gagal menghapus API Key Zernio." };
  }
}

/**
 * 2c. Save/Update Primary Zernio API Key (Legacy & Initial Setup)
 */
export async function saveZernioApiKey(apiKeyInput: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  return addZernioApiKeyAction(apiKeyInput, "API Key Utama #1");
}

/**
 * 3a. Generate Instagram Connect URL (Auto-allocating to available Zernio API Key)
 */
export async function getInstagramConnectUrlAction(originUrl?: string): Promise<{
  success: boolean;
  authUrl?: string;
  error?: string;
  keyId?: string;
}> {
  try {
    const { user, workspace, supabase } = await getActiveWorkspaceInfo();
    if (!user || !workspace?.id) {
      return { success: false, error: "Sesi tidak ditemukan." };
    }

    // Auto-allocate: Find an API key that has < 2 connected accounts
    const allocation = await getAvailableZernioKey(supabase, workspace.id);
    if (!allocation.key) {
      return {
        success: false,
        error: allocation.error || "Semua API Key Zernio Anda sudah terisi penuh (maksimal 2 akun per key). Harap tambahkan API Key Zernio baru di menu Pengaturan API Key.",
      };
    }

    const targetKey = allocation.key;
    const zernio = new ZernioClient(targetKey.api_key);

    let profileId = targetKey.profile_id;
    if (!profileId) {
      const baseName = workspace.name || user.user_metadata?.business_name || "Workspace";
      const uniqueSuffix = Math.random().toString(36).slice(2, 6);
      const profileRes = await zernio.getOrCreateProfile(`${baseName} (${uniqueSuffix})`);
      if (!profileRes.profileId) {
        return {
          success: false,
          error: profileRes.error || "Gagal membuat Profile ID Zernio untuk API Key ini.",
        };
      }
      profileId = profileRes.profileId;

      // Persist profileId back to target key
      if (targetKey.id && targetKey.id !== "legacy_default") {
        await supabase
          .from("zernio_api_keys")
          .update({ profile_id: profileId })
          .eq("id", targetKey.id);
      }
    }

    const callbackRedirectUrl = originUrl
      ? `${originUrl}/social-accounts?connected=instagram&keyId=${targetKey.id}`
      : undefined;

    const connectRes = await zernio.getInstagramConnectUrl({
      profileId,
      redirectUrl: callbackRedirectUrl,
      loginMethod: "instagram_login",
    });

    if (!connectRes.success || !connectRes.authUrl) {
      return {
        success: false,
        error: connectRes.error || "Gagal mendapatkan URL otentikasi Instagram dari Zernio.",
      };
    }

    return {
      success: true,
      authUrl: connectRes.authUrl,
      keyId: targetKey.id,
    };
  } catch (err: any) {
    console.error("Error generating Instagram connect URL:", err);
    return {
      success: false,
      error: err.message || "Gagal menginisialisasi koneksi Instagram.",
    };
  }
}

/**
 * 3b. Generate Threads Connect URL (Auto-allocating to available Zernio API Key)
 */
export async function getThreadsConnectUrlAction(originUrl?: string): Promise<{
  success: boolean;
  authUrl?: string;
  error?: string;
  keyId?: string;
}> {
  try {
    const { user, workspace, supabase } = await getActiveWorkspaceInfo();
    if (!user || !workspace?.id) {
      return { success: false, error: "Sesi tidak ditemukan." };
    }

    // Auto-allocate: Find an API key that has < 2 connected accounts
    const allocation = await getAvailableZernioKey(supabase, workspace.id);
    if (!allocation.key) {
      return {
        success: false,
        error: allocation.error || "Semua API Key Zernio Anda sudah terisi penuh (maksimal 2 akun per key). Harap tambahkan API Key Zernio baru di menu Pengaturan API Key.",
      };
    }

    const targetKey = allocation.key;
    const zernio = new ZernioClient(targetKey.api_key);

    let profileId = targetKey.profile_id;
    if (!profileId) {
      const baseName = workspace.name || user.user_metadata?.business_name || "Workspace";
      const uniqueSuffix = Math.random().toString(36).slice(2, 6);
      const profileRes = await zernio.getOrCreateProfile(`${baseName} (${uniqueSuffix})`);
      if (!profileRes.profileId) {
        return {
          success: false,
          error: profileRes.error || "Gagal membuat Profile ID Zernio untuk API Key ini.",
        };
      }
      profileId = profileRes.profileId;

      if (targetKey.id && targetKey.id !== "legacy_default") {
        await supabase
          .from("zernio_api_keys")
          .update({ profile_id: profileId })
          .eq("id", targetKey.id);
      }
    }

    const callbackRedirectUrl = originUrl
      ? `${originUrl}/social-accounts?connected=threads&keyId=${targetKey.id}`
      : undefined;

    const connectRes = await zernio.getThreadsConnectUrl({
      profileId,
      redirectUrl: callbackRedirectUrl,
    });

    if (!connectRes.success || !connectRes.authUrl) {
      return {
        success: false,
        error: connectRes.error || "Gagal mendapatkan URL otentikasi Threads dari Zernio.",
      };
    }

    return {
      success: true,
      authUrl: connectRes.authUrl,
      keyId: targetKey.id,
    };
  } catch (err: any) {
    console.error("Error generating Threads connect URL:", err);
    return {
      success: false,
      error: err.message || "Gagal menginisialisasi koneksi Threads.",
    };
  }
}

/**
 * 3c. Generate TikTok Connect URL (Auto-allocating to available Zernio API Key)
 */
export async function getTikTokConnectUrlAction(originUrl?: string): Promise<{
  success: boolean;
  authUrl?: string;
  error?: string;
  keyId?: string;
}> {
  try {
    const { user, workspace, supabase } = await getActiveWorkspaceInfo();
    if (!user || !workspace?.id) {
      return { success: false, error: "Sesi tidak ditemukan." };
    }

    const allocation = await getAvailableZernioKey(supabase, workspace.id);
    if (!allocation.key) {
      return {
        success: false,
        error: allocation.error || "Semua API Key Zernio Anda sudah terisi penuh (maksimal 2 akun per key). Harap tambahkan API Key Zernio baru.",
      };
    }

    const targetKey = allocation.key;
    const zernio = new ZernioClient(targetKey.api_key);

    let profileId = targetKey.profile_id;
    if (!profileId) {
      const baseName = workspace.name || user.user_metadata?.business_name || "Workspace";
      const uniqueSuffix = Math.random().toString(36).slice(2, 6);
      const profileRes = await zernio.getOrCreateProfile(`${baseName} (${uniqueSuffix})`);
      if (!profileRes.profileId) {
        return {
          success: false,
          error: profileRes.error || "Gagal membuat Profile ID Zernio untuk API Key ini.",
        };
      }
      profileId = profileRes.profileId;

      if (targetKey.id && targetKey.id !== "legacy_default") {
        await supabase
          .from("zernio_api_keys")
          .update({ profile_id: profileId })
          .eq("id", targetKey.id);
      }
    }

    const callbackRedirectUrl = originUrl
      ? `${originUrl}/social-accounts?connected=tiktok&keyId=${targetKey.id}`
      : undefined;

    const connectRes = await zernio.getTikTokConnectUrl({
      profileId,
      redirectUrl: callbackRedirectUrl,
    });

    if (!connectRes.success || !connectRes.authUrl) {
      return {
        success: false,
        error: connectRes.error || "Gagal mendapatkan URL otentikasi TikTok dari Zernio.",
      };
    }

    return {
      success: true,
      authUrl: connectRes.authUrl,
      keyId: targetKey.id,
    };
  } catch (err: any) {
    console.error("Error generating TikTok connect URL:", err);
    return {
      success: false,
      error: err.message || "Gagal menginisialisasi koneksi TikTok.",
    };
  }
}

/**
 * 3d. Generate LinkedIn Connect URL (Auto-allocating to available Zernio API Key)
 */
export async function getLinkedInConnectUrlAction(originUrl?: string): Promise<{
  success: boolean;
  authUrl?: string;
  error?: string;
  keyId?: string;
}> {
  try {
    const { user, workspace, supabase } = await getActiveWorkspaceInfo();
    if (!user || !workspace?.id) {
      return { success: false, error: "Sesi tidak ditemukan." };
    }

    const allocation = await getAvailableZernioKey(supabase, workspace.id);
    if (!allocation.key) {
      return {
        success: false,
        error: allocation.error || "Semua API Key Zernio Anda sudah terisi penuh (maksimal 2 akun per key). Harap tambahkan API Key Zernio baru.",
      };
    }

    const targetKey = allocation.key;
    const zernio = new ZernioClient(targetKey.api_key);

    let profileId = targetKey.profile_id;
    if (!profileId) {
      const baseName = workspace.name || user.user_metadata?.business_name || "Workspace";
      const uniqueSuffix = Math.random().toString(36).slice(2, 6);
      const profileRes = await zernio.getOrCreateProfile(`${baseName} (${uniqueSuffix})`);
      if (!profileRes.profileId) {
        return {
          success: false,
          error: profileRes.error || "Gagal membuat Profile ID Zernio untuk API Key ini.",
        };
      }
      profileId = profileRes.profileId;

      if (targetKey.id && targetKey.id !== "legacy_default") {
        await supabase
          .from("zernio_api_keys")
          .update({ profile_id: profileId })
          .eq("id", targetKey.id);
      }
    }

    const callbackRedirectUrl = originUrl
      ? `${originUrl}/social-accounts?connected=linkedin&keyId=${targetKey.id}`
      : undefined;

    const connectRes = await zernio.getLinkedInConnectUrl({
      profileId,
      redirectUrl: callbackRedirectUrl,
    });

    if (!connectRes.success || !connectRes.authUrl) {
      return {
        success: false,
        error: connectRes.error || "Gagal mendapatkan URL otentikasi LinkedIn dari Zernio.",
      };
    }

    return {
      success: true,
      authUrl: connectRes.authUrl,
      keyId: targetKey.id,
    };
  } catch (err: any) {
    console.error("Error generating LinkedIn connect URL:", err);
    return {
      success: false,
      error: err.message || "Gagal menginisialisasi koneksi LinkedIn.",
    };
  }
}

/**
 * 4. Disconnect Social Account
 */
export async function disconnectSocialAccount(accountId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const { user, workspace, supabase } = await getActiveWorkspaceInfo();
    if (!user || !workspace?.id) {
      return { success: false, error: "Sesi telah berakhir." };
    }

    // Find account to know its zernio_key_id
    const { data: acc } = await supabase
      .from("social_accounts")
      .select("id, zernio_key_id, provider_account_id")
      .eq("workspace_id", workspace.id)
      .eq("provider_account_id", accountId)
      .maybeSingle();

    let apiKey = workspace.zernio_api_key;
    if (acc?.zernio_key_id) {
      const { data: keyRecord } = await supabase
        .from("zernio_api_keys")
        .select("api_key")
        .eq("id", acc.zernio_key_id)
        .maybeSingle();
      if (keyRecord?.api_key) apiKey = keyRecord.api_key;
    }

    // Disconnect on Zernio if API key exists
    if (apiKey) {
      try {
        const zernio = new ZernioClient(apiKey);
        await zernio.disconnectAccount(accountId);
      } catch (zErr) {
        console.warn("Zernio disconnect notice:", zErr);
      }
    }

    // Delete or update from local DB
    await supabase
      .from("social_accounts")
      .delete()
      .match({ workspace_id: workspace.id, provider_account_id: accountId });

    revalidatePath("/social-accounts");
    return {
      success: true,
      message: "Akun media sosial berhasil diputuskan.",
    };
  } catch (err: any) {
    console.error("Error disconnecting account:", err);
    return { success: false, error: "Gagal memutuskan akun media sosial." };
  }
}

/**
 * 5. Remove/Reset Zernio API Key (Clear all keys for workspace)
 */
export async function removeZernioApiKey(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const { user, workspace, supabase } = await getActiveWorkspaceInfo();
    if (!user || !workspace?.id) return { success: false, error: "Sesi tidak ditemukan." };

    try {
      await supabase
        .from("zernio_api_keys")
        .delete()
        .eq("workspace_id", workspace.id);
    } catch (err) {
      console.warn("Delete all zernio_api_keys notice:", err);
    }

    await supabase
      .from("workspaces")
      .update({ zernio_api_key: null, zernio_profile_id: null })
      .eq("id", workspace.id);

    await supabase.auth.updateUser({
      data: {
        zernio_api_key: null,
        zernio_profile_id: null,
      },
    });

    revalidatePath("/social-accounts");
    return { success: true, message: "Semua API Key Zernio berhasil dihapus." };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal menghapus API Key." };
  }
}
