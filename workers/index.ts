import fs from "node:fs";
import path from "node:path";

// Load .env.local if running directly in node/tsx
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        const cleanVal = val.replace(/^["']|["']$/g, "");
        process.env[key] = cleanVal;
      }
    }
  }
}

loadEnvLocal();

import { createPlanningWorker } from "../lib/queue/workers/planning-worker";
import { createGenerationWorker } from "../lib/queue/workers/generation-worker";
import { createCaptionWorker } from "../lib/queue/workers/caption-worker";
import { createImageWorker } from "../lib/queue/workers/image-worker";
import { createReviewWorker } from "../lib/queue/workers/review-worker";
import { createZernioDispatchWorker } from "../lib/queue/workers/zernio-dispatch-worker";
import { createZernioWebhookWorker } from "../lib/queue/workers/zernio-webhook-worker";
import { createEmailWorker } from "../lib/queue/workers/email-worker";
import { getRedisConnection } from "../lib/queue/redis";

const redisDisplay = process.env.REDIS_URL
  ? (process.env.REDIS_URL.includes("@") ? process.env.REDIS_URL.split("@")[1] : "Upstash / Cloud Redis")
  : `${process.env.REDIS_HOST || "127.0.0.1"}:${process.env.REDIS_PORT || "6379"}`;

console.log("=================================================");
console.log("🚀 Starting Antigravity BullMQ Worker Service...");
console.log(`📡 Redis:        ${redisDisplay}`);
console.log(`🤖 Caption Model: ${process.env.OPENAI_MODEL || "gpt-5.6-luna"} (from env OPENAI_MODEL)`);
console.log(`🎨 Image Model:   ${process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"} (from env OPENAI_IMAGE_MODEL)`);
console.log(`📧 Email Engine:  Brevo Transactional API`);
console.log("=================================================");

const planningWorker = createPlanningWorker();
const generationWorker = createGenerationWorker();
const captionWorker = createCaptionWorker();
const imageWorker = createImageWorker();
const reviewWorker = createReviewWorker();
const zernioDispatchWorker = createZernioDispatchWorker();
const zernioWebhookWorker = createZernioWebhookWorker();
const emailWorker = createEmailWorker();

console.log("✅ [Queue: content-planning] Worker listening");
console.log("✅ [Queue: content-generation] Worker listening");
console.log("✅ [Queue: caption-generation] Worker listening");
console.log("✅ [Queue: image-generation] Worker listening");
console.log("✅ [Queue: content-review] Worker listening");
console.log("✅ [Queue: zernio-dispatch] Worker listening");
console.log("✅ [Queue: zernio-webhook] Worker listening");
console.log("✅ [Queue: email-notification] Worker listening");
console.log("-------------------------------------------------");
console.log("🎉 All 8 BullMQ workers are ready and waiting for jobs!");
console.log("Press Ctrl+C to stop.\n");

async function shutdown() {
  console.log("\n🛑 Gracefully shutting down workers...");
  await Promise.allSettled([
    planningWorker.close(),
    generationWorker.close(),
    captionWorker.close(),
    imageWorker.close(),
    reviewWorker.close(),
    zernioDispatchWorker.close(),
    zernioWebhookWorker.close(),
    emailWorker.close(),
  ]);

  try {
    const redis = getRedisConnection();
    await redis.quit();
  } catch (err) {
    // ignore
  }

  console.log("👋 All workers stopped successfully.");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
