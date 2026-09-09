"use server";

import { createClient } from "@/lib/supabase/server";
import { ZernioClient, ZernioAccount } from "@/lib/zernio/client";
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
}

/**
 * Helper to get workspace & API key
 */
async function getActiveWorkspaceInfo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, workspace: null };

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
 * 1. Fetch current Social Accounts & Zernio API Key state
 */
export async function getSocialAccountsData(): Promise<{
  success: boolean;
  data?: SocialAccountsData;
  error?: string;
}> {
  try {
    const { user, workspace, supabase } = await getActiveWorkspaceInfo();

    if (!user) {
      return { success: false, error: "Pengguna tidak terautentikasi." };
    }

    const apiKey = workspace.zernio_api_key || "";
    let connectedAccounts: ConnectedAccount[] = [];

    // If we have Supabase table public.social_accounts, query it
    if (workspace.id) {
      try {
        const { data: accounts } = await supabase!
          .from("social_accounts")
          .select("id, provider, provider_account_id, username, display_name, profile_picture_url, status, created_at")
          .eq("workspace_id", workspace.id);

        if (accounts && accounts.length > 0) {
          connectedAccounts = accounts.map((a) => ({
            id: a.id,
            provider: a.provider,
            providerAccountId: a.provider_account_id,
            username: a.username,
            displayName: a.display_name || a.username,
            profilePictureUrl: a.profile_picture_url,
            status: a.status as any,
            createdAt: a.created_at,
          }));
        }
      } catch (tableErr) {
        console.warn("Notice: social_accounts table not found or empty:", tableErr);
      }
    }

    // If API key is configured, also attempt to fetch live accounts from Zernio to keep synchronized
    if (apiKey) {
      try {
        const zernio = new ZernioClient(apiKey);
        // Try with workspace.zernio_profile_id first
        let zernioRes = await zernio.getAccounts(workspace.zernio_profile_id);
        
        let rawList: any = zernioRes.data;
        let remoteAccounts: any[] = [];

        if (Array.isArray(rawList)) {
          remoteAccounts = rawList;
        } else if (rawList && Array.isArray(rawList.data)) {
          remoteAccounts = rawList.data;
        } else if (rawList && Array.isArray(rawList.accounts)) {
          remoteAccounts = rawList.accounts;
        }

        // If nothing found with profileId filter, try fetching all accounts for this API key
        if (remoteAccounts.length === 0) {
          const allRes = await zernio.getAccounts();
          const allRaw: any = allRes.data;
          if (Array.isArray(allRaw)) {
            remoteAccounts = allRaw;
          } else if (allRaw && Array.isArray(allRaw.data)) {
            remoteAccounts = allRaw.data;
          } else if (allRaw && Array.isArray(allRaw.accounts)) {
            remoteAccounts = allRaw.accounts;
          }
        }

        if (remoteAccounts.length > 0) {
          const mappedAccounts: ConnectedAccount[] = remoteAccounts.map((ra) => {
            const accId = ra._id || ra.id || ra.accountId || String(Math.random());
            const pName = (ra.platform || ra.provider || "instagram").toLowerCase();
            const uName = ra.username || ra.accountUsername || ra.name || "instagram_user";
            const dName = ra.displayName || ra.name || ra.accountUsername || uName;
            const pic = ra.profile_picture_url || ra.profilePictureUrl || ra.avatarUrl || ra.avatar;

            return {
              id: accId,
              provider: pName,
              providerAccountId: accId,
              username: uName,
              displayName: dName,
              profilePictureUrl: pic,
              status: "connected",
              createdAt: ra.createdAt || ra.created_at || new Date().toISOString(),
            };
          });

          // Update connectedAccounts
          connectedAccounts = mappedAccounts;

          // Also persist / upsert to database table social_accounts so it stays saved
          if (workspace.id && supabase) {
            for (const acc of mappedAccounts) {
              try {
                await supabase.from("social_accounts").upsert(
                  {
                    workspace_id: workspace.id,
                    provider: acc.provider,
                    provider_account_id: acc.providerAccountId,
                    username: acc.username,
                    display_name: acc.displayName,
                    profile_picture_url: acc.profilePictureUrl || null,
                    status: "connected",
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: "workspace_id,provider,provider_account_id" }
                );
              } catch (upsertErr) {
                console.warn("Notice: could not upsert to social_accounts table:", upsertErr);
              }
            }
          }
        }
      } catch (syncErr) {
        console.warn("Could not sync live Zernio accounts:", syncErr);
      }
    }

    return {
      success: true,
      data: {
        workspace: {
          id: workspace.id,
          name: workspace.name,
          zernioApiKey: apiKey ? `${apiKey.slice(0, 7)}••••••••••••${apiKey.slice(-4)}` : "",
          isApiKeyConfigured: Boolean(apiKey && apiKey.length > 8),
          zernioProfileId: workspace.zernio_profile_id || undefined,
        },
        connectedAccounts,
      },
    };
  } catch (err: any) {
    console.error("Error in getSocialAccountsData:", err);
    return { success: false, error: "Gagal memuat data akun media sosial." };
  }
}

/**
 * 2. Save Zernio API Key & Verify with Zernio
 */
export async function saveZernioApiKey(apiKey: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const trimmedKey = apiKey?.trim();
  if (!trimmedKey) {
    return { success: false, error: "API Key Zernio tidak boleh kosong." };
  }

  try {
    const { user, workspace, supabase } = await getActiveWorkspaceInfo();
    if (!user) {
      return { success: false, error: "Sesi telah berakhir. Silakan login kembali." };
    }

    // 1. Verify with Zernio API
    const zernio = new ZernioClient(trimmedKey);
    const validation = await zernio.validateApiKey();

    if (!validation.valid) {
      return {
        success: false,
        error: `Gagal memvalidasi API Key ke Zernio: ${validation.error || "Key tidak valid"}. Pastikan API Key benar dan aktif di dashboard Zernio.`,
      };
    }

    // 2. Ensure profile exists in Zernio for this workspace
    let zernioProfileId = workspace.zernio_profile_id;
    try {
      const baseName = workspace.name || user.user_metadata?.business_name || "Workspace";
      const uniqueSuffix = workspace.id ? workspace.id.slice(0, 6) : Math.random().toString(36).slice(2, 6);
      const profileName = `${baseName} (${uniqueSuffix})`;
      const profileRes = await zernio.getOrCreateProfile(profileName);
      if (profileRes.profileId) {
        zernioProfileId = profileRes.profileId;
      }
    } catch (profErr) {
      console.warn("Profile creation notice on Zernio:", profErr);
    }

    // 3. Save to database workspaces table
    if (workspace.id) {
      try {
        await supabase!
          .from("workspaces")
          .update({
            zernio_api_key: trimmedKey,
            zernio_profile_id: zernioProfileId || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", workspace.id);
      } catch (dbErr) {
        console.warn("Notice: could not update zernio_api_key column in workspaces:", dbErr);
      }
    }

    // 4. Also store in Supabase Auth user metadata as high-reliability fallback
    await supabase!.auth.updateUser({
      data: {
        zernio_api_key: trimmedKey,
        zernio_profile_id: zernioProfileId || null,
      },
    });

    revalidatePath("/social-accounts");
    return {
      success: true,
      message: "API Key Zernio berhasil diverifikasi dan disimpan! Silakan hubungkan akun media sosial Anda.",
    };
  } catch (err: any) {
    console.error("Error in saveZernioApiKey:", err);
    return {
      success: false,
      error: err.message || "Terjadi kesalahan saat menyimpan API Key Zernio.",
    };
  }
}

/**
 * 3. Generate Instagram Connect URL (Zernio OAuth Flow)
 */
export async function getInstagramConnectUrlAction(originUrl?: string): Promise<{
  success: boolean;
  authUrl?: string;
  error?: string;
}> {
  try {
    const { user, workspace } = await getActiveWorkspaceInfo();
    if (!user) {
      return { success: false, error: "Sesi tidak ditemukan." };
    }

    let apiKey = workspace.zernio_api_key;
    if (!apiKey) {
      apiKey = user.user_metadata?.zernio_api_key;
    }

    if (!apiKey) {
      return {
        success: false,
        error: "API Key Zernio belum tersimpan. Harap simpan API Key Zernio terlebih dahulu.",
      };
    }

    const zernio = new ZernioClient(apiKey);

    // Profile ID is required by Zernio GET /v1/connect/instagram
    let profileId = workspace.zernio_profile_id || user.user_metadata?.zernio_profile_id;
    if (!profileId) {
      const baseName = workspace.name || user.user_metadata?.business_name || "Workspace";
      const uniqueSuffix = workspace.id ? workspace.id.slice(0, 6) : Math.random().toString(36).slice(2, 6);
      const profileName = `${baseName} (${uniqueSuffix})`;
      const profileRes = await zernio.getOrCreateProfile(profileName);
      if (!profileRes.profileId) {
        return {
          success: false,
          error: profileRes.error || "Gagal membuat atau mengambil Profile ID Zernio untuk workspace ini.",
        };
      }
      profileId = profileRes.profileId;

      // Persist profileId
      const { supabase } = await getActiveWorkspaceInfo();
      if (supabase && workspace.id) {
        try {
          await supabase
            .from("workspaces")
            .update({ zernio_profile_id: profileId })
            .eq("id", workspace.id);
        } catch {
          // ignore error if column does not exist
        }
      }
    }

    const callbackRedirectUrl = originUrl
      ? `${originUrl}/social-accounts?connected=instagram`
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
 * 4. Disconnect Social Account
 */
export async function disconnectSocialAccount(accountId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const { user, workspace, supabase } = await getActiveWorkspaceInfo();
    if (!user) {
      return { success: false, error: "Sesi telah berakhir." };
    }

    const apiKey = workspace.zernio_api_key || user.user_metadata?.zernio_api_key;

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
    if (workspace.id) {
      try {
        await supabase!
          .from("social_accounts")
          .delete()
          .match({ workspace_id: workspace.id, provider_account_id: accountId });
      } catch (delErr) {
        console.warn("Database delete social account notice:", delErr);
      }
    }

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
 * 5. Remove/Reset Zernio API Key
 */
export async function removeZernioApiKey(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const { user, workspace, supabase } = await getActiveWorkspaceInfo();
    if (!user) return { success: false, error: "Sesi tidak ditemukan." };

    if (workspace.id) {
      try {
        await supabase!
          .from("workspaces")
          .update({ zernio_api_key: null, zernio_profile_id: null })
          .eq("id", workspace.id);
      } catch (err) {
        console.warn("Reset zernio_api_key notice:", err);
      }
    }

    await supabase!.auth.updateUser({
      data: {
        zernio_api_key: null,
        zernio_profile_id: null,
      },
    });

    revalidatePath("/social-accounts");
    return { success: true, message: "API Key Zernio berhasil dihapus." };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal menghapus API Key." };
  }
}
