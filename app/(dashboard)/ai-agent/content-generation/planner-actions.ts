"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  generate30DayPlanWithAI,
  BusinessContext,
  ContentPlanItem,
} from "@/lib/ai/planner";

/**
 * 1. Fetch current 30-day plan status and count from database
 */
export async function get30DayPlanStatus(): Promise<{
  success: boolean;
  hasPlans: boolean;
  totalPlans: number;
  upcomingPlans: ContentPlanItem[];
  businessName: string;
  businessCategory: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      hasPlans: false,
      totalPlans: 0,
      upcomingPlans: [],
      businessName: "Bisnis Anda",
      businessCategory: "",
      error: "Pengguna tidak terautentikasi.",
    };
  }

  let workspaceId: string | null = null;
  let businessName = "Bisnis Anda";
  let businessCategory = "";

  try {
    // 1. Fetch real workspace from database
    const { data: ws } = await supabase
      .from("workspaces")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ws) {
      workspaceId = ws.id;
      businessName = ws.name || businessName;

      // 2. Fetch real business profile from database
      const { data: bp } = await supabase
        .from("business_profiles")
        .select("business_name, category")
        .eq("workspace_id", ws.id)
        .maybeSingle();

      if (bp) {
        businessName = bp.business_name || businessName;
        businessCategory = bp.category || businessCategory;
      }
    } else if (user.user_metadata?.workspace_id) {
      workspaceId = user.user_metadata.workspace_id;
      businessName = user.user_metadata.business_name || user.user_metadata.workspace_name || businessName;
    }
  } catch (err) {
    console.warn("Notice querying workspace in get30DayPlanStatus:", err);
  }

  let totalPlans = 0;
  let upcomingPlans: ContentPlanItem[] = [];

  if (workspaceId) {
    try {
      const { data: posts, count } = await supabase
        .from("content_posts")
        .select("*", { count: "exact" })
        .eq("workspace_id", workspaceId)
        .order("scheduled_date", { ascending: true })
        .limit(30);

      if (posts && posts.length > 0) {
        totalPlans = count || posts.length;
        upcomingPlans = posts.map((p: any, idx: number) => ({
          id: p.id,
          dayIndex: idx + 1,
          scheduledDate: p.scheduled_date,
          scheduledTime: p.scheduled_time ? p.scheduled_time.slice(0, 5) : "19:00",
          title: p.title,
          content_type: p.content_type,
          pillar: p.pillar || p.content_type,
          objective: p.objective || "engagement",
          topic: p.topic,
          hook: p.hook || "",
          key_points: Array.isArray(p.key_points) ? p.key_points : [],
          cta: p.cta || "",
          visual_direction: p.visual_direction || "",
          format: p.format || "Feed",
          platform: "instagram",
          status: p.status || "PLANNED",
          // Enhanced fields
          angle: p.angle || undefined,
          audience_stage: p.audience_stage || undefined,
          product_reference: p.product_reference || null,
          content_goal: p.content_goal || undefined,
          data_sources: Array.isArray(p.data_sources) ? p.data_sources : [],
          // Lazy Generation & Review fields
          caption: p.caption || null,
          hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
          media_url: p.media_url || null,
          ai_score: p.ai_score || null,
          ai_review: p.ai_review || null,
          caption_status: p.caption_status || "PENDING",
          image_status: p.image_status || "PENDING",
          generation_error: p.generation_error || null,
          generated_at: p.generated_at || null,
        }));
      }
    } catch (dbErr) {
      console.warn("Notice querying content_posts in get30DayPlanStatus:", dbErr);
    }
  }

  return {
    success: true,
    hasPlans: totalPlans > 0,
    totalPlans,
    upcomingPlans,
    businessName,
    businessCategory,
  };
}

/**
 * 2. Generate 30-Day Plan Action
 * STRICT RULE: All business data, products, and brand kit are fetched 100% from database records.
 * ZERO hardcoded dummy data.
 *
 * Pipeline: DB Fetch → Schedule → Distribution → AI → Zod → Validator → Quality Gate → Save
 */
export async function generate30DayPlanAction(): Promise<{
  success: boolean;
  totalCreated?: number;
  plans?: ContentPlanItem[];
  source?: "openai" | "template";
  modelUsed?: string;
  qualityScore?: number;
  validationIssues?: string[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi tidak ditemukan. Silakan login kembali." };
    }

    // 1. Resolve Workspace from database
    let workspaceId: string | null = null;

    const { data: ws } = await supabase
      .from("workspaces")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ws) {
      workspaceId = ws.id;
    } else if (user.user_metadata?.workspace_id) {
      workspaceId = user.user_metadata.workspace_id;
    }

    if (!workspaceId) {
      return {
        success: false,
        error: "Workspace bisnis tidak ditemukan di database. Silakan selesaikan onboarding atau lengkapi profil di menu Pengaturan.",
      };
    }

    // 2. Resolve Business Profile strictly from database
    const { data: bp } = await supabase
      .from("business_profiles")
      .select("id, business_name, category, description, location, website, whatsapp, target_audience")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!bp || !bp.business_name) {
      return {
        success: false,
        error: "Data Business Profile belum tersimpan di database. Silakan isi informasi profil bisnis Anda di menu Pengaturan terlebih dahulu.",
      };
    }

    // 3. Resolve Products/Services strictly from database
    const { data: prods } = await supabase
      .from("products_services")
      .select("id, name, price, description, benefits")
      .eq("business_profile_id", bp.id);

    if (!prods || prods.length === 0) {
      return {
        success: false,
        error: "Belum ada produk atau layanan yang terdaftar di database. Silakan tambahkan minimal 1 produk/layanan Anda di menu Pengaturan agar AI dapat membuat konten yang akurat.",
      };
    }

    const products = prods.map((p: any) => ({
      name: p.name || "",
      price: p.price || "",
      description: p.description || "",
      benefits: p.benefits || "",
    }));

    // 4. Resolve Promotion from database (if any)
    const { data: promo } = await supabase
      .from("promotions")
      .select("name, discount, start_date, end_date")
      .eq("business_profile_id", bp.id)
      .maybeSingle();

    const promotion = promo?.name
      ? {
          name: promo.name,
          discount: promo.discount || undefined,
          startDate: promo.start_date || undefined,
          endDate: promo.end_date || undefined,
        }
      : undefined;

    // 5. Resolve Brand Kit from database
    const { data: bk } = await supabase
      .from("brand_kits")
      .select("primary_color, secondary_color, visual_style, writing_tone, language, emoji_usage")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const brandKit = {
      primaryColor: bk?.primary_color || "#4F46E5",
      secondaryColor: bk?.secondary_color || "#06B6D4",
      visualStyle: bk?.visual_style || "Modern",
      writingTone: bk?.writing_tone || "Friendly",
      language: bk?.language || "Bahasa Indonesia",
      emojiUsage: bk?.emoji_usage || "Medium",
    };

    // 6. Resolve Content Preferences from database
    let preferences = {
      postsPerWeek: 5,
      postingDays: ["Monday", "Wednesday", "Friday"],
      postingTime: "19:00",
      contentTypes: ["Educational", "Promotional", "Engagement", "Branding", "Tips"],
      strategyDistribution: {
        Educational: 40,
        Promotional: 20,
        Engagement: 15,
        Branding: 10,
        Tips: 10,
        Storytelling: 5,
      } as Record<string, number>,
    };

    const { data: cp } = await supabase
      .from("content_preferences")
      .select("posts_per_week, posting_days, posting_time, content_types, strategy_distribution")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (cp) {
      preferences = {
        postsPerWeek: cp.posts_per_week || preferences.postsPerWeek,
        postingDays:
          Array.isArray(cp.posting_days) && cp.posting_days.length > 0
            ? cp.posting_days
            : preferences.postingDays,
        postingTime: cp.posting_time || preferences.postingTime,
        contentTypes:
          Array.isArray(cp.content_types) && cp.content_types.length > 0
            ? cp.content_types
            : preferences.contentTypes,
        strategyDistribution: cp.strategy_distribution || preferences.strategyDistribution,
      };
    }

    // 7. Fetch Content History for anti-repetition (last 10 posts)
    let recentContent: BusinessContext["recentContent"] = undefined;
    try {
      const { data: recentPosts } = await supabase
        .from("content_posts")
        .select("title, topic, content_type, pillar, angle, scheduled_date")
        .eq("workspace_id", workspaceId)
        .order("scheduled_date", { ascending: false })
        .limit(10);

      if (recentPosts && recentPosts.length > 0) {
        recentContent = recentPosts.map((p: any) => ({
          title: p.title || "",
          topic: p.topic || "",
          contentType: p.content_type || "",
          pillar: p.pillar || "",
          angle: p.angle || undefined,
          publishedAt: p.scheduled_date || "",
        }));
      }
    } catch (histErr) {
      console.warn("Notice fetching content history:", histErr);
    }

    // 7b. Derive Performance Insights from past content data
    let performanceInsights: BusinessContext["performanceInsights"] = undefined;
    try {
      const { data: allPastPosts } = await supabase
        .from("content_posts")
        .select("content_type, format, topic, scheduled_time")
        .eq("workspace_id", workspaceId)
        .order("scheduled_date", { ascending: false })
        .limit(50);

      if (allPastPosts && allPastPosts.length >= 5) {
        // Count content type frequency
        const typeCounts: Record<string, number> = {};
        const formatCounts: Record<string, number> = {};
        const timeCounts: Record<string, number> = {};

        for (const post of allPastPosts) {
          const ct = (post.content_type || "").toLowerCase();
          if (ct) typeCounts[ct] = (typeCounts[ct] || 0) + 1;

          const fmt = post.format || "";
          if (fmt) formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;

          const time = post.scheduled_time ? post.scheduled_time.slice(0, 5) : "";
          if (time) timeCounts[time] = (timeCounts[time] || 0) + 1;
        }

        // Sort by frequency
        const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
        const sortedFormats = Object.entries(formatCounts).sort((a, b) => b[1] - a[1]);
        const sortedTimes = Object.entries(timeCounts).sort((a, b) => b[1] - a[1]);

        // Top = first 3, Weak = last (least used)
        const topContentTypes = sortedTypes.slice(0, 3).map(([t]) => t);
        const weakContentTypes = sortedTypes.length > 3
          ? sortedTypes.slice(-2).map(([t]) => t)
          : [];
        const topFormats = sortedFormats.slice(0, 3).map(([f]) => f);
        const topPostingTimes = sortedTimes.slice(0, 2).map(([t]) => t);

        // Extract top topics (most common words from topics)
        const topicWords: Record<string, number> = {};
        for (const post of allPastPosts) {
          if (post.topic) {
            const words = post.topic.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
            for (const w of words) {
              topicWords[w] = (topicWords[w] || 0) + 1;
            }
          }
        }
        const topTopics = Object.entries(topicWords)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([t]) => t);

        performanceInsights = {
          topContentTypes,
          topTopics,
          topFormats,
          topPostingTimes,
          weakContentTypes,
        };
      }
    } catch (piErr) {
      console.warn("Notice deriving performance insights:", piErr);
    }

    // 8. Assemble Complete Context from Real Database Data
    const context: BusinessContext = {
      businessName: bp.business_name,
      category: bp.category || "Bisnis & Layanan",
      description: bp.description || "",
      location: bp.location || "",
      website: bp.website || "",
      whatsapp: bp.whatsapp || "",
      targetAudience: bp.target_audience || "Pelanggan & Pengikut Instagram",
      products,
      promotion,
      brandKit,
      // Enhanced context
      recentContent,
      // These will be populated when the features exist:
      testimonials: undefined,
      brandStory: undefined,
      founderStory: undefined,
      performanceInsights,
    };

    // 9. Run AI Planner Engine (full pipeline)
    const plannerResult = await generate30DayPlanWithAI(context, preferences, new Date());

    if (!plannerResult.success || !plannerResult.plans || plannerResult.plans.length === 0) {
      return {
        success: false,
        error: plannerResult.error || "Gagal membuat rencana konten dengan AI.",
      };
    }

    const { plans, modelUsed, qualityScore, validationIssues } = plannerResult;

    // 10. Persist new plans to content_posts table (ONLY when AI succeeds)
    // Delete previous planned posts if user is regenerating
    await supabase
      .from("content_posts")
      .delete()
      .match({ workspace_id: workspaceId, status: "PLANNED" });

    // Insert new plans with enhanced columns
    const insertPayload = plans.map((p) => ({
      workspace_id: workspaceId,
      title: p.title,
      content_type: p.content_type,
      pillar: p.pillar,
      objective: p.objective,
      topic: p.topic,
      hook: p.hook,
      key_points: p.key_points,
      cta: p.cta,
      visual_direction: p.visual_direction,
      format: p.format,
      platform: p.platform,
      status: "PLANNED",
      scheduled_date: p.scheduledDate,
      scheduled_time: `${p.scheduledTime}:00`,
      // Enhanced columns
      angle: p.angle || null,
      audience_stage: p.audience_stage || null,
      product_reference: p.product_reference || null,
      content_goal: p.content_goal || null,
      data_sources: p.data_sources || [],
    }));

    await supabase.from("content_posts").insert(insertPayload);

    revalidatePath("/ai-agent/content-generation");
    revalidatePath("/content-calendar");
    revalidatePath("/");

    return {
      success: true,
      totalCreated: plans.length,
      plans,
      source: "openai",
      modelUsed,
      qualityScore,
      validationIssues,
    };
  } catch (err: any) {
    console.error("Error in generate30DayPlanAction:", err);
    return { success: false, error: err.message || "Gagal membuat rencana konten." };
  }
}

/**
 * 3. Enqueue 30-Day Plan Generation to BullMQ (content-planning queue)
 * Conforms to PRD Section 34: "Jangan menjalankan pekerjaan AI berat langsung dari request HTTP"
 */
export async function enqueue30DayPlanAction(): Promise<{
  success: boolean;
  queued?: boolean;
  jobId?: string;
  queueName?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, queued: false, error: "Pengguna tidak terautentikasi." };
    }

    // Resolve Workspace (check owner_id, then user_id fallback)
    let workspaceId: string | null = null;
    let { data: ws } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!ws) {
      const fallback = await supabase
        .from("workspaces")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      ws = fallback.data;
    }

    if (ws) {
      workspaceId = ws.id;
    } else if (user.user_metadata?.workspace_id) {
      workspaceId = user.user_metadata.workspace_id;
    }

    if (!workspaceId) {
      return { success: false, queued: false, error: "Workspace bisnis tidak ditemukan." };
    }

    const { isRedisConnected } = await import("@/lib/queue/redis");
    const redisAlive = await isRedisConnected();

    if (!redisAlive) {
      return {
        success: false,
        queued: false,
        error:
          "Redis server belum terhubung. Pastikan service Redis berjalan di " +
          (process.env.REDIS_HOST || "127.0.0.1") +
          ":" +
          (process.env.REDIS_PORT || "6379") +
          " atau jalankan 'npm run worker' setelah Redis aktif.",
      };
    }

    const { enqueueContentPlanning, QUEUE_NAMES } = await import("@/lib/queue/queues");
    const result = await enqueueContentPlanning({
      workspaceId,
      userId: user.id,
      startDate: new Date().toISOString(),
    });

    return {
      success: true,
      queued: true,
      jobId: result.jobId,
      queueName: QUEUE_NAMES.CONTENT_PLANNING,
    };
  } catch (err: any) {
    console.error("Error enqueueing content-planning job:", err);
    return { success: false, queued: false, error: err.message || "Gagal memasukkan job ke antrian Redis." };
  }
}

