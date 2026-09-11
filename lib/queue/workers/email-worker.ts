import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../redis";
import { QUEUE_NAMES, EmailNotificationJobData } from "../queues";
import {
  sendBrevoEmail,
  generatePublishedEmailHtml,
  generateTestEmailHtml,
  BrevoSendResult,
} from "../../email/brevo";

export interface EmailWorkerResult extends BrevoSendResult {
  jobId: string;
  recipientEmail: string;
  event: string;
}

export function createEmailWorker() {
  const worker = new Worker<EmailNotificationJobData, EmailWorkerResult>(
    QUEUE_NAMES.EMAIL_NOTIFICATION,
    async (job: Job<EmailNotificationJobData>) => {
      const data = job.data;
      console.log(
        `[Worker:email-notification] 📨 [Job: ${job.id}] Processing email dispatch for "${data.recipientEmail}" (Event: ${data.event})`
      );

      await job.updateProgress(20);

      // Generate HTML email based on event
      let htmlContent = "";
      if (data.event === "test_notification") {
        htmlContent = generateTestEmailHtml(data.recipientEmail, data.recipientName);
      } else {
        htmlContent = generatePublishedEmailHtml({
          postTitle: data.postTitle || "Postingan Konten",
          captionSnippet: data.captionSnippet,
          mediaUrl: data.mediaUrl,
          platform: data.platform || "Instagram",
          publishedAt: data.publishedAt,
          zernioPostId: data.zernioPostId,
          recipientName: data.recipientName,
        });
      }

      await job.updateProgress(50);

      // Dispatch email via Brevo REST API (credentials from environment)
      const result = await sendBrevoEmail({
        to: data.recipientEmail,
        toName: data.recipientName,
        subject: data.subject,
        htmlContent,
      });

      await job.updateProgress(100);

      if (!result.success) {
        console.error(
          `[Worker:email-notification] ❌ [Job: ${job.id}] Gagal mengirim email ke ${data.recipientEmail}:`,
          result.error
        );
        throw new Error(result.error || "Gagal mengirim email via Brevo");
      }

      console.log(
        `[Worker:email-notification] 🎉 [Job: ${job.id}] Email berhasil terkirim ke ${data.recipientEmail}! Message ID: ${result.messageId}`
      );

      return {
        ...result,
        jobId: job.id || "",
        recipientEmail: data.recipientEmail,
        event: data.event,
      };
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[Worker:email-notification] ✅ Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker:email-notification] ❌ Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
