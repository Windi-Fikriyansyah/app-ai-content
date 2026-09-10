import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/**
 * Zernio Webhook Endpoint: /api/webhooks/zernio
 * Receives lifecycle events from Zernio when posts are scheduled, publishing, or published to Instagram.
 * 
 * Flow:
 * SCHEDULED -> PUBLISHING -> PUBLISHED
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}));
    console.log(`[Webhook:Zernio] 📨 Incoming payload:`, JSON.stringify(payload));

    // Extract event
    const event = (payload.event || payload.type || payload.status || "").toLowerCase();
    const xLateEvent = req.headers.get("x-late-event")?.toLowerCase();

    // 0. Handle Zernio test ping / test delivery event
    if (
      event === "webhook.test" ||
      xLateEvent === "webhook.test" ||
      payload.message?.includes("test webhook") ||
      payload.message?.includes("Zernio")
    ) {
      console.log(`[Webhook:Zernio] 🧪 Received test webhook from Zernio! Test ID: ${payload.id}`);
      return NextResponse.json({
        success: true,
        message: "Test webhook received and verified successfully from Zernio!",
        id: payload.id,
        timestamp: new Date().toISOString(),
      });
    }

    // Resolve post identifier (Zernio ID)
    const zernioPostId =
      payload.zernio_post_id ||
      payload.zernioPostId ||
      payload.postId ||
      payload.post_id ||
      payload.data?.postId ||
      payload.data?.id ||
      payload.data?.zernio_post_id ||
      payload.id;

    if (!zernioPostId) {
      console.warn("[Webhook:Zernio] ⚠️ Missing zernio_post_id in webhook payload");
      return NextResponse.json(
        { success: false, error: "Missing zernio_post_id" },
        { status: 400 }
      );
    }

    // 1. Try enqueuing to Redis BullMQ queue for fast, reliable asynchronous processing
    try {
      const { enqueueZernioWebhook } = await import("@/lib/queue/queues");
      const job = await enqueueZernioWebhook({
        event,
        zernioPostId,
        payload,
        receivedAt: new Date().toISOString(),
      });

      console.log(`[Webhook:Zernio] 🚀 Enqueued to 'zernio-webhook' BullMQ queue. Job ID: ${job.jobId}`);

      return NextResponse.json({
        success: true,
        queued: true,
        jobId: job.jobId,
        event,
        zernioPostId,
        message: "Webhook payload queued successfully for asynchronous processing",
      });
    } catch (queueErr: any) {
      console.warn(
        `[Webhook:Zernio] ⚠️ Redis queue unavailable (${queueErr.message}). Falling back to direct database processing...`
      );
    }

    // 2. Fallback: Direct database processing if Redis is unavailable
    // Map webhook event to SaaS content_posts status
    let newStatus = "PUBLISHED";
    if (event.includes("publishing")) {
      newStatus = "PUBLISHING";
    } else if (event.includes("fail") || event.includes("error")) {
      newStatus = "FAILED";
    } else if (event.includes("schedule")) {
      newStatus = "SCHEDULED";
    } else if (event.includes("publish") || event === "published" || event === "post.published") {
      newStatus = "PUBLISHED";
    }

    const supabase = createAdminClient();

    // Find the post by zernio_post_id
    const { data: post, error: findErr } = await supabase
      .from("content_posts")
      .select("id, title, status, zernio_post_id, scheduled_at, ai_review")
      .eq("zernio_post_id", zernioPostId)
      .maybeSingle();

    if (findErr || !post) {
      console.warn(`[Webhook:Zernio] ⚠️ No content post found for zernio_post_id: ${zernioPostId}`);
      return NextResponse.json(
        { success: false, error: `Post with zernio_post_id '${zernioPostId}' not found` },
        { status: 404 }
      );
    }

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      status: newStatus,
      ai_review: {
        ...(post.ai_review || {}),
        last_webhook_event: event,
        last_webhook_at: nowIso,
        published_at: newStatus === "PUBLISHED" ? nowIso : (post.ai_review?.published_at || null),
      },
    };

    if (newStatus === "PUBLISHED") {
      updatePayload.published_at = nowIso;
    }

    // Try updating with published_at column
    const { error: updateErr } = await supabase
      .from("content_posts")
      .update(updatePayload)
      .eq("id", post.id);

    if (updateErr) {
      // Fallback if published_at column does not exist yet
      delete updatePayload.published_at;
      await supabase
        .from("content_posts")
        .update(updatePayload)
        .eq("id", post.id);
    }

    console.log(
      `[Webhook:Zernio] ✅ Successfully transitioned post ${post.id} ("${post.title}"): ${post.status} ➔ ${newStatus}`
    );

    revalidatePath("/content-calendar");
    revalidatePath("/content-library");

    return NextResponse.json({
      success: true,
      event,
      postId: post.id,
      zernioPostId,
      oldStatus: post.status,
      newStatus,
      timestamp: nowIso,
    });
  } catch (err: any) {
    console.error("[Webhook:Zernio] ❌ Internal error processing webhook:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Zernio Webhook Receiver",
    endpoint: "/api/webhooks/zernio",
    supportedEvents: ["post.scheduled", "post.publishing", "post.published", "post.failed"],
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Allow": "GET, POST, OPTIONS, HEAD",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Late-Event, X-Late-Event-Id, X-Late-Signature",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
