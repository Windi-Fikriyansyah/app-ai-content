import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { runLazyGenerationForPost } from "@/lib/ai/lazy-generator";
import { BusinessContext } from "@/lib/ai/planner";

/**
 * 41. Cron System: Lazy Generation Scheduler
 * Endpoint: /api/cron/content-generation
 * Runs periodically to find posts scheduled within H-1 / 48 hours and triggers generation.
 */
export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();

  // Validate CRON_SECRET if configured
  if (cronSecret) {
    const token = authHeader?.replace("Bearer ", "") || request.headers.get("x-cron-secret");
    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

  try {
    // 1. Calculate threshold: Tomorrow (H-1)
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 2); // Up to 48 hours ahead
    const thresholdDateStr = tomorrow.toISOString().split("T")[0];

    // 2. Query posts that are PLANNED and due within threshold
    const { data: duePosts, error: fetchErr } = await supabase
      .from("content_posts")
      .select("*")
      .eq("status", "PLANNED")
      .lte("scheduled_date", thresholdDateStr)
      .order("scheduled_date", { ascending: true })
      .limit(10); // Batch limit per cron tick

    if (fetchErr) {
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }

    if (!duePosts || duePosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada post PLANNED yang mendekati jadwal (H-1).",
        processed: 0,
      });
    }

    const results = [];

    // 3. Process each post with Idempotency guard
    for (const post of duePosts) {
      // Mark as GENERATING immediately to avoid race conditions
      await supabase
        .from("content_posts")
        .update({ status: "GENERATING" })
        .eq("id", post.id);

      const workspaceId = post.workspace_id;

      // Fetch workspace context
      const { data: bp } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      const { data: bk } = await supabase
        .from("brand_kits")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      const { data: rawProducts } = await supabase
        .from("products_services")
        .select("*")
        .eq("workspace_id", workspaceId);

      const products = (rawProducts || []).map((p: any) => ({
        name: p.name || "",
        price: p.price || undefined,
        description: p.description || undefined,
        benefits: p.benefits || undefined,
      }));

      const context: BusinessContext = {
        businessName: bp?.business_name || "Bisnis Kami",
        category: bp?.category || "Bisnis & Layanan",
        description: bp?.description || "",
        location: bp?.location || "",
        website: bp?.website || "",
        whatsapp: bp?.whatsapp || "",
        targetAudience: bp?.target_audience || "Pelanggan Instagram",
        products,
        brandKit: {
          primaryColor: bk?.primary_color || "#3B82F6",
          secondaryColor: bk?.secondary_color || "#1E40AF",
          writingTone: bk?.tone_of_voice || "Professional & Engaging",
          visualStyle: bk?.visual_style || "Clean modern",
          language: bk?.language || "Bahasa Indonesia",
          emojiUsage: bk?.emoji_style || "Medium",
        },
      };

      const genResult = await runLazyGenerationForPost(post, context);

      await supabase
        .from("content_posts")
        .update({
          caption: genResult.caption,
          hook: genResult.hook,
          cta: genResult.cta,
          hashtags: genResult.hashtags,
          media_url: genResult.mediaUrl,
          ai_score: genResult.aiScore,
          ai_review: genResult.aiReview,
          status: genResult.status,
          caption_status: genResult.captionStatus,
          image_status: genResult.imageStatus,
          generation_error: genResult.error || null,
          generated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      results.push({
        id: post.id,
        title: post.title,
        status: genResult.status,
        captionStatus: genResult.captionStatus,
        imageStatus: genResult.imageStatus,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memproses ${results.length} post via Lazy Generation.`,
      processed: results.length,
      results,
    });
  } catch (err: any) {
    console.error("Cron content-generation error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
