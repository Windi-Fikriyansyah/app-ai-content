/**
 * Brevo (formerly Sendinblue) Transactional Email Client & Templates
 * Native REST API implementation without external SDK dependencies
 */

export interface BrevoSendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  apiKey?: string;
  senderEmail?: string;
  senderName?: string;
}

export interface BrevoSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send Transactional Email using Brevo REST API v3
 */
export async function sendBrevoEmail(
  options: BrevoSendEmailOptions
): Promise<BrevoSendResult> {
  try {
    const apiKey = options.apiKey?.trim() || process.env.BREVO_API_KEY?.trim();

    if (!apiKey) {
      const err = "Brevo API Key belum dikonfigurasi di pengaturan notifikasi atau file .env.local (BREVO_API_KEY).";
      console.warn(`[Brevo] ⚠️ ${err}`);
      return { success: false, error: err };
    }

    const senderEmail =
      options.senderEmail?.trim() ||
      process.env.BREVO_SENDER_EMAIL?.trim() ||
      "notifications@aicontent.app";

    const senderName =
      options.senderName?.trim() ||
      process.env.BREVO_SENDER_NAME?.trim() ||
      "AI Content Studio";

    const payload = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [
        {
          email: options.to.trim(),
          name: options.toName?.trim() || options.to.split("@")[0],
        },
      ],
      subject: options.subject,
      htmlContent: options.htmlContent,
      textContent: options.textContent || undefined,
    };

    console.log(`[Brevo] 📧 Mengirim email ke ${options.to} via Brevo API... (Subject: "${options.subject}")`);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg =
        data.message || data.error || `Brevo API HTTP ${response.status}: ${response.statusText}`;
      console.error(`[Brevo] ❌ Gagal mengirim email:`, errMsg);
      return { success: false, error: errMsg };
    }

    console.log(`[Brevo] ✅ Email berhasil terkirim! Message ID: ${data.messageId || "ok"}`);
    return {
      success: true,
      messageId: data.messageId,
    };
  } catch (err: any) {
    console.error(`[Brevo] ❌ Exception saat memanggil Brevo API:`, err);
    return {
      success: false,
      error: err.message || "Terjadi kesalahan internal saat mengirim email via Brevo.",
    };
  }
}

/**
 * Generate Responsive HTML Template for Successfully Published Post Alert
 */
export function generatePublishedEmailHtml(params: {
  postTitle: string;
  captionSnippet?: string;
  mediaUrl?: string;
  platform?: string;
  publishedAt?: string;
  zernioPostId?: string;
  recipientName?: string;
  appUrl?: string;
}): string {
  const publishedDate = params.publishedAt
    ? new Date(params.publishedAt).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "full",
        timeStyle: "short",
      })
    : new Date().toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "full",
        timeStyle: "short",
      });

  const appUrl = params.appUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://app.aicontent.id";
  const platform = params.platform || "Instagram / Threads";

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Postingan Anda Berhasil Terbit!</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9; }
    .wrapper { width: 100%; max-width: 600px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; margin-top: 24px; margin-bottom: 24px; }
    .header { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 32px 24px; text-align: center; }
    .badge { display: inline-block; background-color: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; }
    .header p { margin: 8px 0 0; font-size: 14px; color: #c7d2fe; }
    .content { padding: 24px; }
    .card { background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .post-title { font-size: 18px; font-weight: 700; color: #f8fafc; margin: 0 0 12px 0; }
    .media-preview { width: 100%; max-height: 320px; object-fit: cover; border-radius: 8px; margin-bottom: 14px; border: 1px solid #475569; }
    .caption-box { background-color: #0f172a; border-left: 4px solid #6366f1; padding: 12px 16px; border-radius: 6px; font-size: 13px; line-height: 1.6; color: #cbd5e1; font-style: italic; margin-bottom: 14px; }
    .meta-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .meta-table td { padding: 6px 0; }
    .meta-label { color: #94a3b8; width: 35%; font-weight: 500; }
    .meta-value { color: #e2e8f0; font-weight: 600; }
    .btn { display: inline-block; width: 100%; box-sizing: border-box; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #ffffff; text-align: center; padding: 14px 20px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; margin-top: 10px; }
    .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
    .footer a { color: #818cf8; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="badge">✓ Live di Media Sosial</div>
      <h1>Postingan Anda Berhasil Terbit!</h1>
      <p>Sistem Zernio telah mengonfirmasi bahwa konten Anda telah tayang di ${platform}.</p>
    </div>
    
    <div class="content">
      <div class="card">
        <h2 class="post-title">${params.postTitle}</h2>
        
        ${
          params.mediaUrl
            ? `<img src="${params.mediaUrl}" alt="Media Preview" class="media-preview" />`
            : ""
        }
        
        ${
          params.captionSnippet
            ? `<div class="caption-box">${params.captionSnippet}</div>`
            : ""
        }

        <table class="meta-table">
          <tr>
            <td class="meta-label">Platform:</td>
            <td class="meta-value">${platform}</td>
          </tr>
          <tr>
            <td class="meta-label">Status:</td>
            <td class="meta-value" style="color: #34d399;">PUBLISHED (Tayang)</td>
          </tr>
          <tr>
            <td class="meta-label">Waktu Tayang:</td>
            <td class="meta-value">${publishedDate} WIB</td>
          </tr>
          ${
            params.zernioPostId
              ? `<tr>
            <td class="meta-label">ID Zernio:</td>
            <td class="meta-value" style="font-family: monospace; font-size: 11px; color: #94a3b8;">${params.zernioPostId}</td>
          </tr>`
              : ""
          }
        </table>
      </div>

      <a href="${appUrl}/content-calendar" class="btn">
        📅 Buka Content Calendar
      </a>
    </div>

    <div class="footer">
      <p>Email ini dikirim otomatis oleh <strong>AI Content Agent</strong> melalui mesin <strong>Brevo</strong>.</p>
      <p>Anda menerima email ini karena alamat ini didaftarkan di <a href="${appUrl}/notifications">Menu Pengaturan Notifikasi</a>.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate HTML for Test Email
 */
export function generateTestEmailHtml(
  recipientEmail: string,
  recipientName?: string
): string {
  const time = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "full",
    timeStyle: "medium",
  });

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Tes Notifikasi Email Brevo</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b0f19; font-family: sans-serif; color: #f1f5f9; }
    .wrapper { max-width: 540px; margin: 30px auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 32px 24px; text-align: center; }
    .badge { background: rgba(99, 102, 241, 0.2); border: 1px solid rgba(99, 102, 241, 0.4); color: #a5b4fc; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; display: inline-block; margin-bottom: 16px; }
    h1 { color: #ffffff; font-size: 20px; margin-bottom: 12px; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 20px; }
    .info-box { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 16px; text-align: left; font-size: 13px; color: #cbd5e1; }
    .footer { margin-top: 24px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="badge">⚡ Brevo Email Engine</div>
    <h1>🎉 Koneksi Notifikasi Berhasil!</h1>
    <p>Halo <strong>${recipientName || recipientEmail}</strong>, ini adalah email uji coba dari AI Content Studio. Integrasi Brevo & BullMQ Redis Anda berfungsi dengan sempurna!</p>
    
    <div class="info-box">
      <div>✓ <strong>Email Tujuan:</strong> ${recipientEmail}</div>
      <div>✓ <strong>Waktu Tes:</strong> ${time} WIB</div>
      <div>✓ <strong>Status Engine:</strong> Terhubung & Siap Kirim Otomatis</div>
    </div>

    <div class="footer">
      Sistem akan otomatis mengirimkan laporan ke email ini saat konten berhasil dipublikasikan via Zernio webhook.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Universal helper to resolve recipient notification settings for any workspace / user
 * Safe for both background BullMQ workers and Server Actions (uses Supabase Admin, zero cookies dependencies)
 */
export interface NotificationRecipientInfo {
  email: string;
  recipientName?: string;
  isActive: boolean;
  notifyOnPublish: boolean;
  notifyOnFail: boolean;
}

export async function resolveNotificationRecipient(
  workspaceId?: string,
  userId?: string
): Promise<NotificationRecipientInfo | null> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  // 1. Try querying notification_settings table by workspaceId
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
    } catch (err) {
      console.warn("Notice querying notification_settings in resolveNotificationRecipient:", err);
    }
  }

  // 2. Lookup owner_id from workspace
  let targetUserId = userId;
  if (!targetUserId && workspaceId) {
    try {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("owner_id")
        .eq("id", workspaceId)
        .maybeSingle();
      if (ws?.owner_id) targetUserId = ws.owner_id;
    } catch {
      // ignore
    }
  }

  // 3. Check user metadata & primary auth email
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
      // If user hasn't explicitly set email, fallback to user's primary auth email!
      if (userData?.user?.email) {
        return {
          email: userData.user.email,
          recipientName: userData.user.user_metadata?.name || userData.user.user_metadata?.full_name || undefined,
          isActive: true,
          notifyOnPublish: true,
          notifyOnFail: true,
        };
      }
    } catch (err) {
      console.warn("Notice fetching user for notification in resolveNotificationRecipient:", err);
    }
  }

  return null;
}

