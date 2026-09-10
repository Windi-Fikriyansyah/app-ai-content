"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { BusinessContext } from "@/lib/ai/planner";
import {
  runLazyGenerationForPost,
  generateImageWithAI,
  reviseCaptionWithAI,
  runAIReviewer,
  type ImageGenerationResult,
} from "@/lib/ai/lazy-generator";

/**
 * Trigger Lazy Generation for a Single Post (Aha Moment / H-1 testing)
 */
export async function triggerSinglePostLazyGenAction(
  postId: string,
  customQuality?: "low" | "medium" | "high" | "auto"
): Promise<{
  success: boolean;
  post?: any;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi telah berakhir. Silakan login kembali." };
    }

    // 1. Fetch post details
    const { data: post, error: postErr } = await supabase
      .from("content_posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();

    if (postErr || !post) {
      return { success: false, error: "Data konten tidak ditemukan." };
    }

    const workspaceId = post.workspace_id;

    // 2. Mark post as GENERATING immediately
    await supabase
      .from("content_posts")
      .update({
        status: "GENERATING",
        caption_status: "GENERATING",
        image_status: "GENERATING",
        generation_error: null,
      })
      .eq("id", postId);

    revalidatePath("/content-calendar");

    // 3. Fetch Business Profile
    const { data: bp } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    // 4. Fetch Brand Kit
    const { data: bk } = await supabase
      .from("brand_kits")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    // 5. Fetch Products
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

    // 6. Fetch Active Promotion
    const { data: rawPromo } = await supabase
      .from("promotions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .maybeSingle();

    const promotion = rawPromo
      ? {
          name: rawPromo.name || "",
          discount: rawPromo.discount || undefined,
          startDate: rawPromo.start_date || undefined,
          endDate: rawPromo.end_date || undefined,
        }
      : undefined;

    const brandKit = {
      primaryColor: bk?.primary_color || "#3B82F6",
      secondaryColor: bk?.secondary_color || "#1E40AF",
      writingTone: bk?.tone_of_voice || "Friendly, helpful, and professional",
      visualStyle: bk?.visual_style || "Clean, modern, and high contrast",
      language: bk?.language || "Bahasa Indonesia",
      emojiUsage: bk?.emoji_style || "Medium",
    };

    // Fetch user selected image quality preference
    const { data: cp } = await supabase
      .from("content_preferences")
      .select("image_quality")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const context: BusinessContext = {
      businessName: bp?.business_name || "Bisnis Kami",
      category: bp?.category || "Bisnis & Layanan",
      description: bp?.description || "",
      location: bp?.location || "",
      website: bp?.website || "",
      whatsapp: bp?.whatsapp || "",
      targetAudience: bp?.target_audience || "Pelanggan & Pengikut Instagram",
      products,
      promotion,
      brandKit,
      imageQuality: customQuality || (cp?.image_quality as any) || "medium",
    };

    // 7. Execute Lazy Generation Worker Pipeline
    const result = await runLazyGenerationForPost(post, context);

    // 8. Update database with final generated assets
    const updatePayload: any = {
      caption: result.caption || post.caption || null,
      hook: result.hook || post.hook || null,
      cta: result.cta || post.cta || null,
      hashtags: result.hashtags || post.hashtags || [],
      media_url: result.mediaUrl || post.media_url || null,
      ai_score: result.aiScore || 90,
      ai_review: result.aiReview || {},
      status: result.status,
      caption_status: result.captionStatus,
      image_status: result.imageStatus,
      generation_error: result.error || null,
      generated_at: new Date().toISOString(),
    };

    const { data: updatedPost, error: updateErr } = await supabase
      .from("content_posts")
      .update(updatePayload)
      .eq("id", postId)
      .select()
      .single();

    if (updateErr) {
      console.error("Error updating content_posts after Lazy Gen:", updateErr);
      return { success: false, error: "Gagal menyimpan hasil generasi ke database." };
    }

    revalidatePath("/content-calendar");
    revalidatePath("/ai-agent/content-generation");

    return {
      success: result.success,
      post: updatedPost,
      error: result.error,
    };
  } catch (err: any) {
    console.error("Fatal error in triggerSinglePostLazyGenAction:", err);
    return {
      success: false,
      error: err.message || "Terjadi kesalahan saat memproses Lazy Generation.",
    };
  }
}

/**
 * Approve Post Action (Change status to APPROVED)
 */
export async function approvePostAction(postId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi tidak ditemukan." };
    }

    const { error } = await supabase
      .from("content_posts")
      .update({ status: "APPROVED" })
      .eq("id", postId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/content-calendar");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal menyetujui konten." };
  }
}

/**
 * Update Post Caption / CTA manually
 */
export async function updatePostContentAction(
  postId: string,
  caption: string,
  cta: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("content_posts")
      .update({ caption, cta })
      .eq("id", postId);

    if (error) return { success: false, error: error.message };
    revalidatePath("/content-calendar");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch a single post by ID (for polling/refreshing after queue worker finishes)
 */
export async function getSinglePostAction(postId: string): Promise<{
  success: boolean;
  post?: any;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: post, error } = await supabase
      .from("content_posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();

    if (error || !post) {
      return { success: false, error: error?.message || "Data post tidak ditemukan." };
    }

    return { success: true, post };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Enqueue Single Post Lazy Generation to BullMQ (content-generation queue)
 * Allows asynchronous processing outside HTTP cycle according to PRD
 */
export async function enqueueSinglePostLazyGenAction(
  postId: string,
  customQuality?: "low" | "medium" | "high" | "auto"
): Promise<{
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
      return { success: false, error: "Sesi telah berakhir. Silakan login kembali." };
    }

    const { data: post, error: postErr } = await supabase
      .from("content_posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();

    if (postErr || !post) {
      return { success: false, error: "Data post tidak ditemukan." };
    }

    // Resolve Context while in authenticated Next.js session
    const workspaceId = post.workspace_id;
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

    const { data: rawPromo } = await supabase
      .from("promotions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .maybeSingle();

    // Fetch user selected image quality preference
    const { data: cp } = await supabase
      .from("content_preferences")
      .select("image_quality")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const context: BusinessContext = {
      businessName: bp?.business_name || "Bisnis Anda",
      category: bp?.category || "Bisnis & Layanan",
      description: bp?.description || "",
      location: bp?.location || "",
      website: bp?.website || "",
      whatsapp: bp?.whatsapp || "",
      targetAudience: bp?.target_audience || "Pelanggan Instagram",
      products: (rawProducts || []).map((p: any) => ({
        name: p.name || "",
        price: p.price || undefined,
        description: p.description || undefined,
        benefits: p.benefits || undefined,
      })),
      promotion: rawPromo
        ? {
            name: rawPromo.name || "",
            discount: rawPromo.discount || undefined,
            startDate: rawPromo.start_date || undefined,
            endDate: rawPromo.end_date || undefined,
          }
        : undefined,
      brandKit: {
        primaryColor: bk?.primary_color || "#3B82F6",
        secondaryColor: bk?.secondary_color || "#1E40AF",
        writingTone: bk?.tone_of_voice || "Friendly, helpful, and professional",
        visualStyle: bk?.visual_style || "Clean, modern, and high contrast",
        language: "Bahasa Indonesia",
        emojiUsage: "Medium",
      },
      imageQuality: customQuality || (cp?.image_quality as any) || "medium",
    };

    const { isRedisConnected } = await import("@/lib/queue/redis");
    const redisAlive = await isRedisConnected();

    if (!redisAlive) {
      // Fallback: If Redis is offline, run directly so user doesn't get blocked
      console.warn("⚠️ Redis offline, falling back to direct lazy generation");
      const directRes = await triggerSinglePostLazyGenAction(postId, customQuality);
      return {
        success: directRes.success,
        queued: false,
        error: directRes.error,
      };
    }

    // Mark as GENERATING immediately in DB
    await supabase
      .from("content_posts")
      .update({
        status: "GENERATING",
        caption_status: "GENERATING",
        image_status: "GENERATING",
        generation_error: null,
      })
      .eq("id", postId);

    const { enqueueContentGeneration, QUEUE_NAMES } = await import("@/lib/queue/queues");
    const result = await enqueueContentGeneration({
      postId,
      workspaceId: post.workspace_id,
      userId: user.id,
      post,
      context,
      triggerSource: "manual_single",
    });

    revalidatePath("/content-calendar");

    return {
      success: true,
      queued: true,
      jobId: result.jobId,
      queueName: QUEUE_NAMES.CONTENT_GENERATION,
    };
  } catch (err: any) {
    console.error("Error in enqueueSinglePostLazyGenAction:", err);
    return { success: false, error: err.message || "Gagal memasukkan ke antrian BullMQ." };
  }
}

/**
 * Retry / Re-request generating Image for a Single Post when image failed or needs refresh
 */
export async function retrySinglePostImageAction(
  postId: string,
  customQuality?: "low" | "medium" | "high" | "auto"
): Promise<{
  success: boolean;
  queued?: boolean;
  jobId?: string;
  post?: any;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi telah berakhir. Silakan login kembali." };
    }

    const { data: post, error: postErr } = await supabase
      .from("content_posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();

    if (postErr || !post) {
      return { success: false, error: "Data post tidak ditemukan." };
    }

    const workspaceId = post.workspace_id;
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

    const { data: rawPromo } = await supabase
      .from("promotions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .maybeSingle();

    const { data: cp } = await supabase
      .from("content_preferences")
      .select("image_quality")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const context: BusinessContext = {
      businessName: bp?.business_name || "Bisnis Anda",
      category: bp?.category || "Bisnis & Layanan",
      description: bp?.description || "",
      location: bp?.location || "",
      website: bp?.website || "",
      whatsapp: bp?.whatsapp || "",
      targetAudience: bp?.target_audience || "Pelanggan Instagram",
      products: (rawProducts || []).map((p: any) => ({
        name: p.name || "",
        price: p.price || undefined,
        description: p.description || undefined,
        benefits: p.benefits || undefined,
      })),
      promotion: rawPromo
        ? {
            name: rawPromo.name || "",
            discount: rawPromo.discount || undefined,
            startDate: rawPromo.start_date || undefined,
            endDate: rawPromo.end_date || undefined,
          }
        : undefined,
      brandKit: {
        primaryColor: bk?.primary_color || "#3B82F6",
        secondaryColor: bk?.secondary_color || "#1E40AF",
        writingTone: bk?.tone_of_voice || "Friendly, helpful, and professional",
        visualStyle: bk?.visual_style || "Clean, modern, and high contrast",
        language: "Bahasa Indonesia",
        emojiUsage: "Medium",
      },
      imageQuality: customQuality || (cp?.image_quality as any) || "medium",
    };

    const brief = {
      title: post.title || "Post Visual",
      topic: post.topic || post.title || "",
      visualDirection: post.visual_direction || "Modern, clean, aesthetic composition",
      format: post.format || "Feed",
      contentType: post.content_type || "Educational",
    };

    // Mark image_status as GENERATING and clear error in database immediately
    await supabase
      .from("content_posts")
      .update({
        image_status: "GENERATING",
        generation_error: null,
      })
      .eq("id", postId);

    const { isRedisConnected } = await import("@/lib/queue/redis");
    const redisAlive = await isRedisConnected();

    if (!redisAlive) {
      // Fallback: Generate directly if Redis is offline
      const imgRes = await generateImageWithAI(brief, context);
      if (imgRes.success && imgRes.mediaUrl) {
        const hasCaption = Boolean(post.caption);
        const { data: updatedPost } = await supabase
          .from("content_posts")
          .update({
            media_url: imgRes.mediaUrl,
            image_status: "COMPLETED",
            generation_error: null,
            ...(hasCaption ? { status: "READY FOR APPROVAL" } : {}),
          })
          .eq("id", postId)
          .select()
          .single();

        revalidatePath("/content-calendar");
        return { success: true, queued: false, post: updatedPost };
      } else {
        await supabase
          .from("content_posts")
          .update({
            image_status: "FAILED",
            generation_error: imgRes.error || "Gagal menghasilkan gambar.",
          })
          .eq("id", postId);

        revalidatePath("/content-calendar");
        return { success: false, queued: false, error: imgRes.error };
      }
    }

    // Enqueue to image-generation queue
    const { enqueueImageGeneration } = await import("@/lib/queue/queues");
    const result = await enqueueImageGeneration({
      postId,
      workspaceId: post.workspace_id,
      brief,
      context,
    });

    revalidatePath("/content-calendar");

    return {
      success: true,
      queued: true,
      jobId: result.jobId,
    };
  } catch (err: any) {
    console.error("Error in retrySinglePostImageAction:", err);
    return { success: false, error: err.message || "Gagal mengantrikan pembuatan ulang gambar." };
  }
}

/**
 * Trigger AI Revision for a Single Post when below review threshold or requested by user
 */
export async function triggerPostRevisionAction(
  postId: string,
  userRevisionNotes?: string,
  customQuality?: "low" | "medium" | "high" | "auto"
): Promise<{
  success: boolean;
  queued?: boolean;
  jobId?: string;
  queueName?: string;
  post?: any;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi telah berakhir. Silakan login kembali." };
    }

    const { data: post, error: postErr } = await supabase
      .from("content_posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();

    if (postErr || !post) {
      return { success: false, error: "Data post tidak ditemukan." };
    }

    const workspaceId = post.workspace_id;
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

    const { data: rawPromo } = await supabase
      .from("promotions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const { data: cp } = await supabase
      .from("content_preferences")
      .select("image_quality")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const context: BusinessContext = {
      businessName: bp?.business_name || "Bisnis Anda",
      category: bp?.category || "Bisnis & Layanan",
      description: bp?.description || "",
      location: bp?.location || "",
      website: bp?.website || "",
      whatsapp: bp?.whatsapp || "",
      targetAudience: bp?.target_audience || "Pelanggan Instagram",
      products: (rawProducts || []).map((p: any) => ({
        name: p.name || "",
        price: p.price || undefined,
        description: p.description || undefined,
        benefits: p.benefits || undefined,
      })),
      promotion: rawPromo
        ? {
            name: rawPromo.name || "",
            discount: rawPromo.discount || undefined,
            startDate: rawPromo.start_date || undefined,
            endDate: rawPromo.end_date || undefined,
          }
        : undefined,
      brandKit: {
        primaryColor: bk?.primary_color || "#3B82F6",
        secondaryColor: bk?.secondary_color || "#1E40AF",
        writingTone: bk?.tone_of_voice || "Friendly, helpful, and professional",
        visualStyle: bk?.visual_style || "Clean, modern, and high contrast",
        language: "Bahasa Indonesia",
        emojiUsage: "Medium",
      },
      imageQuality: customQuality || (cp?.image_quality as any) || "medium",
    };

    const brief = {
      title: post.title || "Post Title",
      topic: post.topic || post.title || "",
      hook: post.hook || "",
      keyPoints: Array.isArray(post.key_points) ? post.key_points : [post.topic || post.title],
      cta: post.cta || "",
      visualDirection: post.visual_direction || "Modern aesthetic",
      format: post.format || "Feed",
      contentType: post.content_type || "Educational",
      pillar: post.pillar || "General",
      angle: post.angle,
      productReference: post.product_reference,
    };

    // Update state to GENERATING
    await supabase
      .from("content_posts")
      .update({
        status: "GENERATING",
        caption_status: "GENERATING",
        generation_error: null,
      })
      .eq("id", postId);

    revalidatePath("/content-calendar");

    // Check if Redis & BullMQ are available
    const { isRedisConnected } = await import("@/lib/queue/redis");
    const redisAlive = await isRedisConnected();

    if (redisAlive) {
      const { enqueueContentGeneration, QUEUE_NAMES } = await import("@/lib/queue/queues");
      const qRes = await enqueueContentGeneration({
        postId,
        workspaceId,
        userId: user.id,
        post,
        context,
        triggerSource: "manual_revision",
        userRevisionNotes,
      });

      return {
        success: true,
        queued: true,
        jobId: qRes.jobId,
        queueName: QUEUE_NAMES.CONTENT_GENERATION,
      };
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

    // 1. Run AI Revision on Caption
    const captionResult = await reviseCaptionWithAI(
      brief,
      currentDraft,
      currentReview,
      context,
      userRevisionNotes
    );

    // 2. If image is missing or failed, also re-generate image
    let imageResult: ImageGenerationResult = {
      success: Boolean(post.media_url),
      mediaUrl: post.media_url || undefined,
    };

    if (!post.media_url || post.image_status === "FAILED") {
      imageResult = await generateImageWithAI(brief, context);
    }

    // 3. Re-evaluate with AI Reviewer
    const newReview = runAIReviewer(brief, captionResult, imageResult, context);

    const overallSuccess = captionResult.success && imageResult.success;
    const finalStatus =
      newReview.status === "READY FOR APPROVAL" && overallSuccess
        ? "READY FOR APPROVAL"
        : newReview.status === "NEEDS_REVISION"
        ? "NEEDS_REVISION"
        : captionResult.success
        ? "REVIEW"
        : "FAILED";

    const { data: updatedPost, error: updateErr } = await supabase
      .from("content_posts")
      .update({
        caption: captionResult.caption || post.caption,
        hook: captionResult.hook || post.hook,
        cta: captionResult.cta || post.cta,
        hashtags: captionResult.hashtags || post.hashtags,
        media_url: imageResult.mediaUrl || post.media_url,
        caption_status: captionResult.success ? "COMPLETED" : "FAILED",
        image_status: imageResult.success ? "COMPLETED" : "FAILED",
        ai_score: newReview.score,
        ai_review: newReview,
        status: finalStatus,
        generation_error: captionResult.error || null,
        generated_at: new Date().toISOString(),
      })
      .eq("id", postId)
      .select()
      .single();

    if (updateErr) {
      return { success: false, error: "Gagal menyimpan hasil revisi ke database." };
    }

    revalidatePath("/content-calendar");
    return { success: true, post: updatedPost };
  } catch (err: any) {
    console.error("Error in triggerPostRevisionAction:", err);
    return { success: false, error: err.message || "Gagal merevisi konten." };
  }
}


