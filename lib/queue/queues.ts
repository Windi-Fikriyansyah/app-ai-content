import { Queue, QueueOptions } from "bullmq";
import { getRedisConnection } from "./redis";
import type { BusinessContext } from "../ai/planner";
import type { CaptionGenerationResult, ImageGenerationResult } from "../ai/lazy-generator";

export const QUEUE_NAMES = {
  CONTENT_PLANNING: "content-planning",
  CONTENT_GENERATION: "content-generation",
  CAPTION_GENERATION: "caption-generation",
  IMAGE_GENERATION: "image-generation",
  CONTENT_REVIEW: "content-review",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─────────────────────────────────────────────────────────────────────────────
// Job Data Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface ContentPlanningJobData {
  workspaceId: string;
  userId: string;
  startDate?: string;
  context?: BusinessContext;
  preferences?: any;
}

export interface ContentGenerationJobData {
  postId: string;
  workspaceId: string;
  userId?: string;
  triggerSource?: "cron_h_minus_1" | "manual_single" | "manual_bulk" | "manual_revision";
  userRevisionNotes?: string;
  post?: any;
  context?: BusinessContext;
}

export interface CaptionGenerationJobData {
  postId: string;
  workspaceId?: string;
  brief: {
    title: string;
    topic: string;
    hook: string;
    keyPoints: string[];
    cta: string;
    contentType: string;
    pillar: string;
    format: string;
    angle?: string;
    productReference?: string | null;
  };
  context: BusinessContext;
}

export interface ImageGenerationJobData {
  postId: string;
  workspaceId?: string;
  brief: {
    title: string;
    topic: string;
    visualDirection: string;
    format: string;
    contentType: string;
  };
  context: BusinessContext;
}

export interface ContentReviewJobData {
  postId: string;
  workspaceId?: string;
  brief: {
    title: string;
    hook: string;
    cta: string;
    visualDirection: string;
  };
  captionResult: CaptionGenerationResult;
  imageResult: ImageGenerationResult;
  context: BusinessContext;
}

// ─────────────────────────────────────────────────────────────────────────────
// Queues Registry (Lazy Singleton)
// ─────────────────────────────────────────────────────────────────────────────

const queuesMap = new Map<string, Queue>();

function getOrCreateQueue<T>(name: QueueName): Queue<T> {
  if (!queuesMap.has(name)) {
    const queueOptions: QueueOptions = {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 3600, // keep completed jobs 24 hours
          count: 500,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // keep failed jobs 7 days
        },
      },
    };

    const queue = new Queue<T>(name, queueOptions);
    queuesMap.set(name, queue);
  }

  return queuesMap.get(name) as Queue<T>;
}

export const contentPlanningQueue = {
  get: () => getOrCreateQueue<ContentPlanningJobData>(QUEUE_NAMES.CONTENT_PLANNING),
};

export const contentGenerationQueue = {
  get: () => getOrCreateQueue<ContentGenerationJobData>(QUEUE_NAMES.CONTENT_GENERATION),
};

export const captionGenerationQueue = {
  get: () => getOrCreateQueue<CaptionGenerationJobData>(QUEUE_NAMES.CAPTION_GENERATION),
};

export const imageGenerationQueue = {
  get: () => getOrCreateQueue<ImageGenerationJobData>(QUEUE_NAMES.IMAGE_GENERATION),
};

export const contentReviewQueue = {
  get: () => getOrCreateQueue<ContentReviewJobData>(QUEUE_NAMES.CONTENT_REVIEW),
};

// ─────────────────────────────────────────────────────────────────────────────
// Enqueue Dispatchers
// ─────────────────────────────────────────────────────────────────────────────

export async function enqueueContentPlanning(data: ContentPlanningJobData, customJobId?: string) {
  const queue = contentPlanningQueue.get();
  const jobId = customJobId || `planning_${data.workspaceId}_${Date.now()}`;
  const job = await queue.add("plan-30-days", data, { jobId });
  return { jobId: job.id, name: job.name };
}

export async function enqueueContentGeneration(data: ContentGenerationJobData) {
  const queue = contentGenerationQueue.get();
  const jobId = `generate_${data.postId}_${Date.now()}`;
  const job = await queue.add("generate-post", data, { jobId });
  return { jobId: job.id, name: job.name };
}

export async function enqueueCaptionGeneration(data: CaptionGenerationJobData) {
  const queue = captionGenerationQueue.get();
  const jobId = `caption_${data.postId}_${Date.now()}`;
  const job = await queue.add("generate-caption", data, { jobId });
  return { jobId: job.id, name: job.name };
}

export async function enqueueImageGeneration(data: ImageGenerationJobData) {
  const queue = imageGenerationQueue.get();
  const jobId = `image_${data.postId}_${Date.now()}`;
  const job = await queue.add("generate-image", data, { jobId });
  return { jobId: job.id, name: job.name };
}

export async function enqueueContentReview(data: ContentReviewJobData) {
  const queue = contentReviewQueue.get();
  const jobId = `review_${data.postId}_${Date.now()}`;
  const job = await queue.add("review-content", data, { jobId });
  return { jobId: job.id, name: job.name };
}

// ─────────────────────────────────────────────────────────────────────────────
// Job Status Inspection
// ─────────────────────────────────────────────────────────────────────────────

export async function getJobStatus(queueName: QueueName, jobId: string) {
  try {
    const queue = getOrCreateQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      return { found: false, state: "not_found" };
    }

    const state = await job.getState();
    const progress = job.progress;
    const returnvalue = job.returnvalue;
    const failedReason = job.failedReason;

    return {
      found: true,
      id: job.id,
      name: job.name,
      state, // "waiting" | "active" | "completed" | "failed" | "delayed"
      progress,
      result: returnvalue,
      failedReason,
      timestamp: job.timestamp,
    };
  } catch (err: any) {
    return { found: false, state: "error", error: err.message };
  }
}
