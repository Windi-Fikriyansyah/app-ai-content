import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../redis";
import {
  QUEUE_NAMES,
  ContentGenerationJobData,
} from "../queues";
import { createAdminClient } from "../../supabase/admin";
import {
  generateCaptionWithAI,
  generateImageWithAI,
  reviseCaptionWithAI,
  runAIReviewer,
  REVIEW_THRESHOLD,
  MAX_AUTO_REVISIONS,
  CaptionGenerationResult,
  ImageGenerationResult,
} from "../../ai/lazy-generator";
import { BusinessContext } from "../../ai/planner";
import { checkIsAutoApproveEnabled } from "../../../app/(dashboard)/auto-approve-actions";

export function createGenerationWorker() {
  const worker = new Worker<ContentGenerationJobData>(
    QUEUE_NAMES.CONTENT_GENERATION,
    async (job: Job<ContentGenerationJobData>) => {
      const { postId, workspaceId } = job.data;
      console.log(`[Worker:content-generation] Orchestrating generation for post ${postId}`);
      await job.updateProgress(10);

      const supabase = createAdminClient();

      // 1. Resolve Post from Job payload or database
      let post = job.data.post;
      if (!post) {
        const { data: dbPost, error: postErr } = await supabase
          .from("content_posts")
          .select("*")
          .eq("id", postId)
          .maybeSingle();

        if (postErr || !dbPost) {
          throw new Error(
            `Post ${postId} tidak dapat diakses worker: ${
              postErr?.message || "Data kosong karena Supabase RLS (Row Level Security)."
            }\n💡 SOLUSI: Masukkan SUPABASE_SERVICE_ROLE_KEY di .env.local agar background worker memiliki izin bypass RLS.`
          );
        }
        post = dbPost;
      }

      // Set status to GENERATING
      await supabase
        .from("content_posts")
        .update({
          status: "GENERATING",
          caption_status: "GENERATING",
          image_status: "GENERATING",
          generation_error: null,
        })
        .eq("id", postId);

      await job.updateProgress(20);

      // 2. Resolve Business Profile, Products, Brand Kit
      let context: BusinessContext = job.data.context!;
      if (!context) {
        const targetWorkspaceId = workspaceId || post.workspace_id;
        const { data: bp } = await supabase
          .from("business_profiles")
          .select("id, business_name, category, description, location, website, whatsapp, target_audience")
          .eq("workspace_id", targetWorkspaceId)
          .maybeSingle();

        if (!bp) {
          throw new Error(`Business Profile not found for workspace ${targetWorkspaceId}`);
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
          .eq("workspace_id", targetWorkspaceId)
          .maybeSingle();

        const { data: cp } = await supabase
          .from("content_preferences")
          .select("image_quality")
          .eq("workspace_id", targetWorkspaceId)
          .maybeSingle();

        context = {
          businessName: bp.business_name,
          category: bp.category || "Bisnis & Layanan",
          description: bp.description || "",
          location: bp.location || "",
          website: bp.website || "",
          whatsapp: bp.whatsapp || "",
          targetAudience: bp.target_audience || "Pelanggan Instagram",
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
          imageQuality: (cp?.image_quality as any) || "medium",
        };
      }

      const brief = {
        title: post.title,
        topic: post.topic,
        hook: post.hook || "",
        keyPoints: Array.isArray(post.key_points) ? post.key_points : [post.topic],
        cta: post.cta || "",
        visualDirection: post.visual_direction || "",
        format: post.format || "Feed",
        contentType: post.content_type,
        pillar: post.pillar,
        angle: post.angle,
        productReference: post.product_reference,
      };

      await job.updateProgress(35);

      let captionResult: CaptionGenerationResult;
      let imageResult: ImageGenerationResult;

      if (job.data.triggerSource === "manual_revision" && (post.caption || post.hook)) {
        console.log(`[Worker:content-generation] 🤖 Processing manual revision requested by user for post ${postId}`);
        if (job.data.userRevisionNotes) {
          console.log(`  - 📝 User Notes: "${job.data.userRevisionNotes}"`);
        }
        const currentDraft = {
          caption: post.caption || undefined,
          hook: post.hook || undefined,
          cta: post.cta || undefined,
          hashtags: post.hashtags || undefined,
        };
        const currentReview = post.ai_review || {
          score: post.ai_score || 70,
          status: "NEEDS_REVISION" as const,
          checks: [],
          issues: ["Perlu peningkatan kualitas hook dan CTA."],
          suggestions: ["Pertajam hook dan buat ajakan CTA lebih persuasif."],
        };

        const t0 = Date.now();
        const [captionRevSettled, imageSettled] = await Promise.allSettled([
          reviseCaptionWithAI(brief, currentDraft, currentReview, context, job.data.userRevisionNotes),
          !post.media_url || post.image_status === "FAILED"
            ? generateImageWithAI(brief, context)
            : Promise.resolve({ success: true, mediaUrl: post.media_url }),
        ]);
        const durationSec = ((Date.now() - t0) / 1000).toFixed(1);

        captionResult =
          captionRevSettled.status === "fulfilled"
            ? captionRevSettled.value
            : { success: false, error: captionRevSettled.reason?.message || "Revision error" };

        imageResult =
          imageSettled.status === "fulfilled"
            ? imageSettled.value
            : { success: false, error: imageSettled.reason?.message || "Image error" };

        console.log(`[Worker:content-generation] ⏱️ Revision finished in ${durationSec}s:`);
        console.log(`  - Caption: ${captionResult.success ? "✅ REVISED" : `❌ ERROR: ${captionResult.error}`}`);
        console.log(`  - Image:   ${imageResult.success ? `✅ OK (Media URL: ${imageResult.mediaUrl?.slice(0, 50)}...)` : `❌ ERROR: ${imageResult.error}`}`);
      } else {
        // Standard parallel generation
        const captionModel = process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna";
        const imageModel = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";
        console.log(`[Worker:content-generation] 🚀 Starting parallel generation for post ${postId}:`);
        console.log(`  - ✍️  Caption Agent: ${captionModel}`);
        console.log(`  - 🎨 Image Agent: ${imageModel} (Quality: ${context.imageQuality || "medium"})`);

        const t0 = Date.now();
        const [captionSettled, imageSettled] = await Promise.allSettled([
          generateCaptionWithAI(brief, context),
          generateImageWithAI(brief, context),
        ]);
        const durationSec = ((Date.now() - t0) / 1000).toFixed(1);

        captionResult =
          captionSettled.status === "fulfilled"
            ? captionSettled.value
            : { success: false, error: captionSettled.reason?.message || "Caption worker error" };

        imageResult =
          imageSettled.status === "fulfilled"
            ? imageSettled.value
            : { success: false, error: imageSettled.reason?.message || "Image worker error" };

        console.log(`[Worker:content-generation] ⏱️ Generation finished in ${durationSec}s:`);
        console.log(`  - Caption: ${captionResult.success ? "✅ OK" : `❌ ERROR: ${captionResult.error}`}`);
        console.log(`  - Image:   ${imageResult.success ? `✅ OK (Media URL: ${imageResult.mediaUrl?.slice(0, 50)}...)` : `❌ ERROR: ${imageResult.error}`}`);
      }

      await job.updateProgress(75);

      // 4. Run AI Reviewer
      console.log(`[Worker:content-generation] 🔍 Running AI Reviewer evaluation...`);
      let reviewResult = runAIReviewer(brief, captionResult, imageResult, context);
      console.log(`[Worker:content-generation] 📊 AI Initial Score: ${reviewResult.score}/100 (Threshold: ${REVIEW_THRESHOLD})`);

      // 4b. Auto-Revision Loop if below threshold
      let autoRevisionCount = 0;
      while (reviewResult.score < REVIEW_THRESHOLD && autoRevisionCount < MAX_AUTO_REVISIONS) {
        autoRevisionCount++;
        console.log(
          `[Worker:content-generation] ⚠️ Score (${reviewResult.score}/100) di bawah ambang batas (${REVIEW_THRESHOLD}). Menjalankan revisi otomatis (${autoRevisionCount}/${MAX_AUTO_REVISIONS})...`
        );

        if (!captionResult.success || (reviewResult.issues && reviewResult.issues.length > 0)) {
          const revised = await reviseCaptionWithAI(brief, captionResult, reviewResult, context);
          if (revised.success) {
            captionResult = revised;
            console.log(`[Worker:content-generation] ✍️ Caption berhasil direvisi otomatis!`);
          }
        }

        if (!imageResult.success || !imageResult.mediaUrl) {
          console.log(`[Worker:content-generation] 🎨 Coba ulang generate visual gambar pada revisi otomatis...`);
          const retriedImage = await generateImageWithAI(brief, context);
          if (retriedImage.success) {
            imageResult = retriedImage;
          }
        }

        reviewResult = runAIReviewer(brief, captionResult, imageResult, context);
        console.log(
          `[Worker:content-generation] 📊 Hasil evaluasi revisi ke-${autoRevisionCount}: ${reviewResult.score}/100 (Status: ${reviewResult.status})`
        );
      }

      const overallSuccess = captionResult.success && imageResult.success;
      const finalStatus =
        reviewResult.status === "READY FOR APPROVAL" && overallSuccess
          ? "READY FOR APPROVAL"
          : reviewResult.status === "NEEDS_REVISION"
          ? "NEEDS_REVISION"
          : captionResult.success
          ? "REVIEW"
          : "FAILED";

      const errorMessage = [
        !captionResult.success ? `Caption error: ${captionResult.error}` : null,
        !imageResult.success ? `Image error: ${imageResult.error}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      // 5. Update Post Record
      console.log(`[Worker:content-generation] 💾 Saving result to Supabase (Status: ${finalStatus})...`);
      const fullUpdatePayload: Record<string, any> = {
        status: finalStatus,
        caption: captionResult.caption || post.caption,
        hook: captionResult.hook || post.hook,
        cta: captionResult.cta || post.cta,
        hashtags: captionResult.hashtags || post.hashtags,
        media_url: imageResult.mediaUrl || post.media_url,
        media_urls: imageResult.mediaUrls || (imageResult.mediaUrl ? [imageResult.mediaUrl] : post.media_urls || null),
        carousel_slides: imageResult.carouselSlides || post.carousel_slides || null,
        caption_status: captionResult.success ? "COMPLETED" : "FAILED",
        image_status: imageResult.success ? "COMPLETED" : "FAILED",
        ai_score: reviewResult.score,
        ai_review: reviewResult,
        generation_error: errorMessage || null,
        generated_at: new Date().toISOString(),
      };

      const { error: updateErr } = await supabase
        .from("content_posts")
        .update(fullUpdatePayload)
        .eq("id", postId);

      if (updateErr) {
        console.warn(`[Worker:content-generation] ⚠️ Database update error with new columns, retrying fallback:`, updateErr.message);
        // Fallback without media_urls/carousel_slides in case migration is pending
        delete fullUpdatePayload.media_urls;
        delete fullUpdatePayload.carousel_slides;
        await supabase
          .from("content_posts")
          .update(fullUpdatePayload)
          .eq("id", postId);
      }

      let postStatus = finalStatus;

      // Auto-Approve check: If status is READY FOR APPROVAL and auto-approve is active, immediately dispatch to Zernio
      if (finalStatus === "READY FOR APPROVAL") {
        try {
          const isAutoApprove = await checkIsAutoApproveEnabled(supabase, job.data.userId, post.workspace_id || workspaceId);
          if (isAutoApprove) {
            console.log(`[Worker:content-generation] ⚡ Auto-Approve is ACTIVE for post ${postId}. Automatically scheduling to Zernio...`);
            await supabase
              .from("content_posts")
              .update({ status: "APPROVED" })
              .eq("id", postId);

            const { enqueueZernioDispatch } = await import("../queues");
            const dispatchJob = await enqueueZernioDispatch({
              postId,
              workspaceId: post.workspace_id || workspaceId,
              userId: job.data.userId || "",
              action: "create_scheduled_post",
            });

            await supabase
              .from("content_posts")
              .update({
                status: "SCHEDULED",
                ai_review: {
                  ...(reviewResult || {}),
                  dispatch_job_id: dispatchJob.jobId,
                  queued_at: new Date().toISOString(),
                  auto_approved: true,
                },
              })
              .eq("id", postId);

            postStatus = "SCHEDULED";
            console.log(`[Worker:content-generation] 🚀 Auto-Approve dispatched to Zernio BullMQ. Job ID: ${dispatchJob.jobId}`);
          } else {
            console.log(`[Worker:content-generation] ⏸️ Auto-Approve is OFF for post ${postId}. Waiting for manual user approval.`);
          }
        } catch (autoErr) {
          console.warn(`[Worker:content-generation] Auto-approve dispatch error:`, autoErr);
        }
      }

      await job.updateProgress(100);
      console.log(`[Worker:content-generation] Finished for post ${postId}! Status: ${postStatus}`);

      return {
        success: overallSuccess,
        postId,
        status: postStatus,
        aiScore: reviewResult.score,
        captionStatus: captionResult.success ? "COMPLETED" : "FAILED",
        imageStatus: imageResult.success ? "COMPLETED" : "FAILED",
        error: errorMessage || undefined,
      };
    },
    {
      connection: getRedisConnection(),
      concurrency: 3,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[Worker:content-generation] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
