"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { sendBrevoEmail, generateTestEmailHtml } from "@/lib/email/brevo";
import { enqueueEmailNotification } from "@/lib/queue/queues";
import { isRedisConnected } from "@/lib/queue/redis";

export interface NotificationSettingsData {
  email: string;
  recipientName?: string;
  isActive: boolean;
  notifyOnPublish: boolean;
  notifyOnFail: boolean;
}

const DEFAULT_SETTINGS: NotificationSettingsData = {
  email: "",
  recipientName: "",
  isActive: true,
  notifyOnPublish: true,
  notifyOnFail: true,
};

/**
 * Fetch notification settings for current session
 */
export async function getNotificationSettingsAction(): Promise<{
  success: boolean;
  settings: NotificationSettingsData;
  systemBrevoConfigured: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const systemBrevoConfigured = Boolean(process.env.BREVO_API_KEY);

    if (!user) {
      return {
        success: false,
        settings: { ...DEFAULT_SETTINGS },
        systemBrevoConfigured,
        error: "Sesi tidak ditemukan.",
      };
    }

    let resolvedSettings: NotificationSettingsData = {
      ...DEFAULT_SETTINGS,
      email: user.email || "",
      recipientName: user.user_metadata?.full_name || user.user_metadata?.name || "",
    };

    // 1. Check user_metadata first for fast fallback
    if (user.user_metadata?.notification_settings) {
      resolvedSettings = {
        ...resolvedSettings,
        ...user.user_metadata.notification_settings,
      };
    }

    // 2. Query database table
    try {
      const { data: dbData } = await supabase
        .from("notification_settings")
        .select("email, recipient_name, is_active, notify_on_publish, notify_on_fail")
        .eq("user_id", user.id)
        .maybeSingle();

      if (dbData) {
        resolvedSettings = {
          ...resolvedSettings,
          email: dbData.email || resolvedSettings.email,
          recipientName: dbData.recipient_name || resolvedSettings.recipientName,
          isActive: dbData.is_active ?? true,
          notifyOnPublish: dbData.notify_on_publish ?? true,
          notifyOnFail: dbData.notify_on_fail ?? true,
        };
      }
    } catch {
      // Table might not exist yet, fallback to user_metadata is fine
    }

    return {
      success: true,
      settings: resolvedSettings,
      systemBrevoConfigured,
    };
  } catch (err: any) {
    console.error("Error in getNotificationSettingsAction:", err);
    return {
      success: false,
      settings: { ...DEFAULT_SETTINGS },
      systemBrevoConfigured: Boolean(process.env.BREVO_API_KEY),
      error: err.message,
    };
  }
}

/**
 * Save notification settings (recipient email & triggers only)
 */
export async function saveNotificationSettingsAction(
  payload: NotificationSettingsData
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "", error: "Sesi tidak ditemukan." };
    }

    const email = payload.email.trim();
    if (!email || !email.includes("@")) {
      return { success: false, message: "", error: "Format alamat email tidak valid." };
    }

    // Clean payload without credentials
    const cleanPayload: NotificationSettingsData = {
      email,
      recipientName: payload.recipientName?.trim() || "",
      isActive: Boolean(payload.isActive),
      notifyOnPublish: Boolean(payload.notifyOnPublish),
      notifyOnFail: Boolean(payload.notifyOnFail),
    };

    // Get workspace ID
    let workspaceId: string | null = null;
    try {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (ws?.id) workspaceId = ws.id;
    } catch {
      // ignore
    }

    // 1. Persist in database
    if (workspaceId) {
      try {
        await supabase.from("notification_settings").upsert(
          {
            workspace_id: workspaceId,
            user_id: user.id,
            email: cleanPayload.email,
            recipient_name: cleanPayload.recipientName || null,
            is_active: cleanPayload.isActive,
            notify_on_publish: cleanPayload.notifyOnPublish,
            notify_on_fail: cleanPayload.notifyOnFail,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id" }
        );
      } catch (dbErr) {
        console.warn("Notice saving to notification_settings table:", dbErr);
      }
    }

    // 2. Persist in user_metadata for resilience
    await supabase.auth.updateUser({
      data: {
        notification_settings: cleanPayload,
      },
    });

    revalidatePath("/notifications");
    return {
      success: true,
      message: "Alamat email notifikasi berhasil disimpan!",
    };
  } catch (err: any) {
    console.error("Error in saveNotificationSettingsAction:", err);
    return { success: false, message: "", error: err.message || "Gagal menyimpan alamat email notifikasi." };
  }
}

/**
 * Send a Live Test Notification Email via Brevo (API key from environment) and BullMQ
 */
export async function sendTestNotificationEmailAction(): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "", error: "Sesi tidak ditemukan." };
    }

    // Retrieve settings
    const settingsRes = await getNotificationSettingsAction();
    const settings = settingsRes.settings;

    const email = settings.email?.trim() || user.email;
    if (!email) {
      return { success: false, message: "", error: "Harap masukkan alamat email penerima terlebih dahulu." };
    }

    const apiKey = process.env.BREVO_API_KEY?.trim();
    if (!apiKey) {
      return {
        success: false,
        message: "",
        error: "BREVO_API_KEY belum dikonfigurasi di file .env.local pada server.",
      };
    }

    const redisAlive = await isRedisConnected();

    if (redisAlive) {
      // Send via BullMQ queue
      const job = await enqueueEmailNotification({
        recipientEmail: email,
        recipientName: settings.recipientName || user.user_metadata?.name || "Creator",
        subject: "⚡ [Test] Koneksi Notifikasi AI Content Studio Berhasil!",
        event: "test_notification",
      });

      return {
        success: true,
        message: `Email uji coba berhasil dimasukkan ke antrian BullMQ (#${job.jobId?.slice(-8)}) dan sedang dikirimkan via Brevo ke ${email}! Silakan periksa inbox/spam email Anda.`,
      };
    } else {
      // Fallback: Direct send via Brevo REST API
      const directRes = await sendBrevoEmail({
        to: email,
        toName: settings.recipientName || "Creator",
        subject: "⚡ [Test] Koneksi Notifikasi AI Content Studio Berhasil!",
        htmlContent: generateTestEmailHtml(email, settings.recipientName),
      });

      if (!directRes.success) {
        return { success: false, message: "", error: directRes.error || "Gagal mengirim email uji coba." };
      }

      return {
        success: true,
        message: `Email uji coba berhasil dikirim via Brevo ke ${email}! Silakan periksa inbox/spam email Anda.`,
      };
    }
  } catch (err: any) {
    console.error("Error in sendTestNotificationEmailAction:", err);
    return { success: false, message: "", error: err.message || "Terjadi kesalahan saat mengirim email uji coba." };
  }
}

/**
 * Universal helper to resolve recipient notification settings for any workspace / user
 */
export async function resolveNotificationRecipient(
  workspaceId?: string,
  userId?: string
): Promise<NotificationSettingsData | null> {
  const supabase = createAdminClient();

  // 1. Try querying notification_settings table
  if (workspaceId) {
    try {
      const { data: dbSetting } = await supabase
        .from("notification_settings")
        .select("email, recipient_name, is_active, notify_on_publish, notify_on_fail")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .maybeSingle();

      if (dbSetting && dbSetting.email) {
        return {
          email: dbSetting.email,
          recipientName: dbSetting.recipient_name || undefined,
          isActive: Boolean(dbSetting.is_active),
          notifyOnPublish: Boolean(dbSetting.notify_on_publish),
          notifyOnFail: Boolean(dbSetting.notify_on_fail),
        };
      }
    } catch {
      // ignore
    }
  }

  // 2. Lookup user_id from workspace if only workspaceId is provided
  let targetUserId = userId;
  if (!targetUserId && workspaceId) {
    try {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("user_id")
        .eq("id", workspaceId)
        .maybeSingle();
      if (ws?.user_id) targetUserId = ws.user_id;
    } catch {
      // ignore
    }
  }

  // 3. Try checking user metadata
  if (targetUserId) {
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(targetUserId);
      const metaSetting = userData?.user?.user_metadata?.notification_settings;
      if (metaSetting && metaSetting.email && metaSetting.isActive !== false) {
        return {
          email: metaSetting.email,
          recipientName: metaSetting.recipientName || undefined,
          isActive: Boolean(metaSetting.isActive),
          notifyOnPublish: Boolean(metaSetting.notifyOnPublish),
          notifyOnFail: Boolean(metaSetting.notifyOnFail),
        };
      }
      // If no explicit settings but user has email, fallback to user's primary auth email
      if (userData?.user?.email) {
        return {
          email: userData.user.email,
          recipientName: userData.user.user_metadata?.name || undefined,
          isActive: true,
          notifyOnPublish: true,
          notifyOnFail: true,
        };
      }
    } catch {
      // ignore
    }
  }

  return null;
}
