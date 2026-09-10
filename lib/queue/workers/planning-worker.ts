import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../redis";
import { QUEUE_NAMES, ContentPlanningJobData } from "../queues";
import { createAdminClient } from "../../supabase/admin";
import { generate30DayPlanWithAI, BusinessContext } from "../../ai/planner";

export function createPlanningWorker() {
  const worker = new Worker<ContentPlanningJobData>(
    QUEUE_NAMES.CONTENT_PLANNING,
    async (job: Job<ContentPlanningJobData>) => {
      console.log(`[Worker:content-planning] Processing job ${job.id} for workspace ${job.data.workspaceId}`);
      await job.updateProgress(10);

      const supabase = createAdminClient();
      const { workspaceId, startDate } = job.data;

      // 1. Resolve Context if not fully passed
      let context = job.data.context;
      let preferences = job.data.preferences;

      if (!context) {
        // Fetch from database
        const { data: bp } = await supabase
          .from("business_profiles")
          .select("id, business_name, category, description, location, website, whatsapp, target_audience")
          .eq("workspace_id", workspaceId)
          .maybeSingle();

        if (!bp) {
          throw new Error(`Business Profile not found for workspace ${workspaceId}`);
        }

        const { data: prods } = await supabase
          .from("products_services")
          .select("name, price, description, benefits")
          .eq("business_profile_id", bp.id);

        const { data: promo } = await supabase
          .from("promotions")
          .select("name, discount, start_date, end_date")
          .eq("business_profile_id", bp.id)
          .maybeSingle();

        const { data: bk } = await supabase
          .from("brand_kits")
          .select("primary_color, secondary_color, visual_style, writing_tone, language, emoji_usage")
          .eq("workspace_id", workspaceId)
          .maybeSingle();

        context = {
          businessName: bp.business_name,
          category: bp.category || "Bisnis & Layanan",
          description: bp.description || "",
          location: bp.location || "",
          website: bp.website || "",
          whatsapp: bp.whatsapp || "",
          targetAudience: bp.target_audience || "Pelanggan & Pengikut Instagram",
          products: (prods || []).map((p: any) => ({
            name: p.name || "",
            price: p.price || "",
            description: p.description || "",
            benefits: p.benefits || "",
          })),
          promotion: promo?.name
            ? {
                name: promo.name,
                discount: promo.discount || undefined,
                startDate: promo.start_date || undefined,
                endDate: promo.end_date || undefined,
              }
            : undefined,
          brandKit: {
            primaryColor: bk?.primary_color || "#4F46E5",
            secondaryColor: bk?.secondary_color || "#06B6D4",
            visualStyle: bk?.visual_style || "Modern",
            writingTone: bk?.writing_tone || "Friendly",
            language: bk?.language || "Bahasa Indonesia",
            emojiUsage: bk?.emoji_usage || "Medium",
          },
        };
      }

      if (!preferences) {
        const { data: cp } = await supabase
          .from("content_preferences")
          .select("posts_per_week, posting_days, posting_time, content_types, strategy_distribution")
          .eq("workspace_id", workspaceId)
          .maybeSingle();

        preferences = {
          postsPerWeek: cp?.posts_per_week || 5,
          postingDays: cp?.posting_days || ["Monday", "Wednesday", "Friday"],
          postingTime: cp?.posting_time || "19:00",
          contentTypes: cp?.content_types || ["Educational", "Promotional", "Engagement", "Branding", "Tips"],
          strategyDistribution: cp?.strategy_distribution || {
            Educational: 40,
            Promotional: 20,
            Engagement: 15,
            Branding: 10,
            Tips: 10,
            Storytelling: 5,
          },
        };
      }

      await job.updateProgress(30);

      // 2. Run AI 30-Day Planner
      console.log(`[Worker:content-planning] Generating 30-day plan with AI...`);
      const start = startDate ? new Date(startDate) : new Date();
      const planResult = await generate30DayPlanWithAI(context, preferences, start);

      if (!planResult.success || !planResult.plans || planResult.plans.length === 0) {
        throw new Error(planResult.error || "Gagal membuat konten planning dengan AI.");
      }

      await job.updateProgress(70);

      // 3. Persist to database
      console.log(`[Worker:content-planning] Saving ${planResult.plans.length} planned posts to Supabase...`);
      // Delete old planned items for fresh plan
      await supabase
        .from("content_posts")
        .delete()
        .match({ workspace_id: workspaceId, status: "PLANNED" });

      const recordsToInsert = planResult.plans.map((p) => ({
        workspace_id: workspaceId,
        title: p.title,
        content_type: p.content_type,
        format: p.format || "Feed",
        pillar: p.pillar || p.content_type,
        objective: p.objective || "engagement",
        target_audience: p.audience_stage || context?.targetAudience || "Instagram Audience",
        topic: p.topic,
        angle: p.angle || null,
        hook: p.hook || null,
        key_points: p.key_points || [],
        cta: p.cta || null,
        visual_direction: p.visual_direction || null,
        product_reference: p.product_reference || null,
        scheduled_date: p.scheduledDate,
        scheduled_time: p.scheduledTime ? `${p.scheduledTime}:00` : "19:00:00",
        status: "PLANNED",
        caption_status: "PENDING",
        image_status: "PENDING",
        ai_score: planResult.qualityScore || 90,
      }));

      const { error: insertErr } = await supabase
        .from("content_posts")
        .insert(recordsToInsert);

      if (insertErr) {
        throw new Error(`Database error saving plans: ${insertErr.message}`);
      }

      await job.updateProgress(100);
      console.log(`[Worker:content-planning] Successfully saved ${recordsToInsert.length} posts!`);

      return {
        success: true,
        totalPlans: recordsToInsert.length,
        modelUsed: planResult.modelUsed,
        qualityScore: planResult.qualityScore,
      };
    },
    {
      connection: getRedisConnection(),
      concurrency: 2,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[Worker:content-planning] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
