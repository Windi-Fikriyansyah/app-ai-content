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
      media_urls: result.mediaUrls || (result.mediaUrl ? [result.mediaUrl] : post.media_urls || null),
      carousel_slides: result.carouselSlides || post.carousel_slides || null,
      ai_score: result.aiScore || 90,
      ai_review: result.aiReview || {},
      status: result.status,
      caption_status: result.captionStatus,
      image_status: result.imageStatus,
      generation_error: result.error || null,
      generated_at: new Date().toISOString(),
    };

    let { data: updatedPost, error: updateErr } = await supabase
      .from("content_posts")
      .update(updatePayload)
      .eq("id", postId)
      .select()
      .single();

    if (updateErr) {
      console.warn("Retrying update without new carousel columns:", updateErr.message);
      delete updatePayload.media_urls;
      delete updatePayload.carousel_slides;
      const retry = await supabase
        .from("content_posts")
        .update(updatePayload)
        .eq("id", postId)
        .select()
        .single();
      updatedPost = retry.data;
      updateErr = retry.error;
    }

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
 * Approve Post & Automatically Send to Zernio Scheduled Queue
 * Flow: APPROVED -> Prepare Media -> Upload to Zernio -> Create Scheduled Post -> Status: SCHEDULED
 */
export async function approvePostAction(postId: string): Promise<{
  success: boolean;
  status?: string;
  zernioPostId?: string;
  scheduledAt?: string;
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

    // 1. Fetch Post details
    const { data: post, error: postErr } = await supabase
      .from("content_posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();

    if (postErr || !post) {
      return { success: false, error: "Data konten tidak ditemukan." };
    }

    // 2. Mark as APPROVED initially
    await supabase
      .from("content_posts")
      .update({ status: "APPROVED" })
      .eq("id", postId);

    console.log(`[ZernioPublish] 🟢 Post ${postId} set to APPROVED. Attempting Redis queue dispatch...`);

    // 3. Try Queue Dispatch via Redis BullMQ first (Async Background Worker)
    try {
      const { enqueueZernioDispatch } = await import("@/lib/queue/queues");
      const job = await enqueueZernioDispatch({
        postId,
        workspaceId: post.workspace_id,
        userId: user.id,
        action: "create_scheduled_post",
      });

      console.log(`[ZernioPublish] 🚀 Enqueued to 'zernio-dispatch' BullMQ queue. Job ID: ${job.jobId}`);

      // Optimistically update status to SCHEDULED
      await supabase
        .from("content_posts")
        .update({
          status: "SCHEDULED",
          ai_review: {
            ...(post.ai_review || {}),
            dispatch_job_id: job.jobId,
            queued_at: new Date().toISOString(),
          },
        })
        .eq("id", postId);

      revalidatePath("/content-calendar");
      revalidatePath("/content-library");

      return {
        success: true,
        status: "SCHEDULED",
        scheduledAt: post.scheduled_at || post.scheduled_date,
      };
    } catch (queueErr: any) {
      console.warn(
        `[ZernioPublish] ⚠️ Redis queue unavailable (${queueErr.message}). Falling back to direct synchronous dispatch...`
      );
    }

    // 4. Fallback: Direct synchronous Zernio scheduling if Redis is offline
    console.log(`[ZernioPublish] 🔄 Executing direct Zernio scheduling pipeline...`);

    // Prepare Media (Support Multi-slide Carousel)
    let mediaUrls: string[] = [];
    if (Array.isArray(post.media_urls) && post.media_urls.length > 0) {
      mediaUrls = post.media_urls;
    } else if (Array.isArray(post.carousel_slides) && post.carousel_slides.length > 0) {
      mediaUrls = post.carousel_slides.map((s: any) => s.imageUrl).filter(Boolean);
    } else if (post.media_url) {
      mediaUrls = [post.media_url];
    }

    // Format content with hashtags
    const hashtagsStr = Array.isArray(post.hashtags) && post.hashtags.length > 0
      ? `\n\n${post.hashtags.map((h: string) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`
      : "";
    const fullContent = `${post.caption || post.title}${hashtagsStr}`.trim();

    // 4. Resolve Zernio API Key & Workspace
    const workspaceId = post.workspace_id;
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, zernio_api_key, zernio_profile_id")
      .eq("id", workspaceId)
      .maybeSingle();

    const zernioApiKey =
      workspace?.zernio_api_key ||
      process.env.ZERNIO_API_KEY ||
      "zernio_sandbox_key";

    // 5. Resolve All Active Connected Social Accounts from social_accounts table
    const isValidZernioId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

    const { data: activeSocialAccounts } = await supabase
      .from("social_accounts")
      .select("id, provider, provider_account_id, username, status")
      .eq("workspace_id", workspaceId)
      .neq("status", "disconnected");

    let accountIds: string[] = [];
    let platforms: Array<{ platform: string; accountId: string }> = [];

    if (activeSocialAccounts && activeSocialAccounts.length > 0) {
      for (const acc of activeSocialAccounts) {
        const accId = acc.provider_account_id;
        if (accId && isValidZernioId(accId)) {
          if (!accountIds.includes(accId)) {
            accountIds.push(accId);
            const prov = (acc.provider || "instagram").toLowerCase();
            platforms.push({
              platform: prov === "x" ? "twitter" : prov,
              accountId: accId,
            });
          }
        }
      }
    }

    const { ZernioClient } = await import("@/lib/zernio/client");
    const zernioClient = new ZernioClient(zernioApiKey);

    if (accountIds.length === 0) {
      console.log(`[ZernioPublish] 🔍 No valid 24-hex account IDs in DB. Querying live accounts from Zernio...`);
      try {
        const accountsRes = await zernioClient.getAccounts(workspace?.zernio_profile_id);
        let remoteAccs: any[] = [];
        const raw = accountsRes.data as any;
        if (Array.isArray(raw)) remoteAccs = raw;
        else if (raw && Array.isArray(raw.accounts)) remoteAccs = raw.accounts;
        else if (raw && Array.isArray(raw.data)) remoteAccs = raw.data;

        if (remoteAccs.length === 0) {
          const allRes = await zernioClient.getAccounts();
          const allRaw = allRes.data as any;
          if (Array.isArray(allRaw)) remoteAccs = allRaw;
          else if (allRaw && Array.isArray(allRaw.accounts)) remoteAccs = allRaw.accounts;
          else if (allRaw && Array.isArray(allRaw.data)) remoteAccs = allRaw.data;
        }

        for (const ra of remoteAccs) {
          const rId = ra._id || ra.id;
          if (rId && isValidZernioId(rId)) {
            if (!accountIds.includes(rId)) {
              accountIds.push(rId);
              const prov = (ra.platform || ra.provider || "instagram").toLowerCase();
              platforms.push({
                platform: prov === "x" ? "twitter" : prov,
                accountId: rId,
              });
            }
          }
        }
      } catch (zFetchErr: any) {
        console.warn(`[ZernioPublish] ⚠️ Could not fetch live Zernio accounts:`, zFetchErr.message);
      }
    }

    if (accountIds.length === 0) {
      return {
        success: false,
        error: "Tidak ada akun media sosial yang valid terhubung ke Zernio. Harap hubungkan akun di menu Social Accounts.",
      };
    }

    const zernioAccountId = accountIds[0];
    const platformNames = Array.from(new Set(platforms.map((p) => p.platform))).join(", ");

    // 6. Calculate ISO Scheduled Date Time (Asia/Jakarta +07:00)
    const scheduledDateStr = post.scheduled_date || new Date().toISOString().split("T")[0];
    const scheduledTimeStr = post.scheduled_time || "19:00:00";
    
    // Construct local date time object in Asia/Jakarta timezone
    const scheduledAtStr = `${scheduledDateStr}T${scheduledTimeStr}+07:00`;
    let scheduledAtDate = new Date(scheduledAtStr);
    if (isNaN(scheduledAtDate.getTime())) {
      scheduledAtDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow fallback
    }

    // If an old post exists in Zernio, delete it first to avoid duplicate schedules
    if (post.zernio_post_id) {
      console.log(`[ZernioPublish] 🗑️ Deleting previous Zernio post ${post.zernio_post_id} before scheduling new post...`);
      try {
        const delRes = await zernioClient.deletePost(post.zernio_post_id);
        console.log(`[ZernioPublish] 🗑️ Delete old post result:`, delRes.success ? "Deleted ✅" : delRes.error);
      } catch (delErr: any) {
        console.warn(`[ZernioPublish] ⚠️ Could not delete old post ${post.zernio_post_id}:`, delErr.message);
      }
    }

    console.log(`[ZernioPublish] 📤 Creating Scheduled Post in Zernio:`);
    console.log(`  - Accounts:     ${accountIds.join(", ")}`);
    console.log(`  - Platforms:    ${platformNames}`);
    console.log(`  - Format:       ${post.format || "Feed"}`);
    console.log(`  - Scheduled At: ${scheduledAtDate.toISOString()}`);
    console.log(`  - Media:        ${mediaUrls.length > 0 ? `${mediaUrls.length} image(s) ✅` : "No media"}`);

    const zernioRes = await zernioClient.createPost({
      accountIds,
      platforms,
      content: fullContent,
      mediaUrls,
      format: post.format,
      scheduledAt: scheduledAtDate.toISOString(),
      timezone: "Asia/Jakarta",
    });

    if (!zernioRes.success) {
      console.error(`[ZernioPublish] ❌ Failed to create post in Zernio:`, zernioRes.error);
      return {
        success: false,
        error: zernioRes.error || "Gagal membuat jadwal postingan di Zernio.",
      };
    }

    const zernioPostId = zernioRes.data?.id || `zernio_post_${Date.now()}`;
    console.log(`[ZernioPublish] ✅ Successfully scheduled in Zernio with ID: ${zernioPostId}`);

    // 8. Update database: Status becomes SCHEDULED
    const updatePayload: Record<string, any> = {
      status: "SCHEDULED",
      zernio_post_id: zernioPostId,
      scheduled_at: scheduledAtDate.toISOString(),
      platform: platformNames || post.platform || "instagram",
      ai_review: {
        ...(post.ai_review || {}),
        zernio_account_id: zernioAccountId,
        zernio_account_ids: accountIds,
        platforms: platforms.map((p) => p.platform),
        scheduled_at: scheduledAtDate.toISOString(),
      },
    };

    // Try updating zernio_account_id if column exists
    const { error: updateErr } = await supabase
      .from("content_posts")
      .update({
        ...updatePayload,
        zernio_account_id: zernioAccountId,
      })
      .eq("id", postId);

    if (updateErr) {
      // If zernio_account_id column doesn't exist yet, update without that column
      await supabase
        .from("content_posts")
        .update(updatePayload)
        .eq("id", postId);
    }

    revalidatePath("/content-calendar");
    revalidatePath("/content-library");

    return {
      success: true,
      status: "SCHEDULED",
      zernioPostId,
      scheduledAt: scheduledAtDate.toISOString(),
    };
  } catch (err: any) {
    console.error("[ZernioPublish] ❌ Error in approvePostAction:", err);
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
        const updatePayload: any = {
          media_url: imgRes.mediaUrl,
          media_urls: imgRes.mediaUrls || [imgRes.mediaUrl],
          carousel_slides: imgRes.carouselSlides || null,
          image_status: "COMPLETED",
          generation_error: null,
          ...(hasCaption ? { status: "READY FOR APPROVAL" } : {}),
        };

        let { data: updatedPost, error: updateErr } = await supabase
          .from("content_posts")
          .update(updatePayload)
          .eq("id", postId)
          .select()
          .single();

        if (updateErr) {
          delete updatePayload.media_urls;
          delete updatePayload.carousel_slides;
          const retry = await supabase
            .from("content_posts")
            .update(updatePayload)
            .eq("id", postId)
            .select()
            .single();
          updatedPost = retry.data;
        }

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

    const updatePayload: any = {
      caption: captionResult.caption || post.caption,
      hook: captionResult.hook || post.hook,
      cta: captionResult.cta || post.cta,
      hashtags: captionResult.hashtags || post.hashtags,
      media_url: imageResult.mediaUrl || post.media_url,
      media_urls: imageResult.mediaUrls || (imageResult.mediaUrl ? [imageResult.mediaUrl] : post.media_urls || null),
      carousel_slides: imageResult.carouselSlides || post.carousel_slides || null,
      caption_status: captionResult.success ? "COMPLETED" : "FAILED",
      image_status: imageResult.success ? "COMPLETED" : "FAILED",
      ai_score: newReview.score,
      ai_review: newReview,
      status: finalStatus,
      generation_error: captionResult.error || null,
      generated_at: new Date().toISOString(),
    };

    let { data: updatedPost, error: updateErr } = await supabase
      .from("content_posts")
      .update(updatePayload)
      .eq("id", postId)
      .select()
      .single();

    if (updateErr) {
      delete updatePayload.media_urls;
      delete updatePayload.carousel_slides;
      const retry = await supabase
        .from("content_posts")
        .update(updatePayload)
        .eq("id", postId)
        .select()
        .single();
      updatedPost = retry.data;
      updateErr = retry.error;
    }

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

/**
 * Simulate receiving a webhook from Zernio (e.g. "publishing", "published")
 * Allows instant verification of the SCHEDULED -> PUBLISHING -> PUBLISHED lifecycle.
 */
export async function simulateZernioWebhookAction(
  postId: string,
  event: "publishing" | "published" = "published"
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: post, error: postErr } = await supabase
      .from("content_posts")
      .select("id, title, status, zernio_post_id, ai_review")
      .eq("id", postId)
      .maybeSingle();

    if (postErr || !post) {
      return { success: false, error: "Post tidak ditemukan." };
    }

    const newStatus = event === "publishing" ? "PUBLISHING" : "PUBLISHED";
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

    const { error: updateErr } = await supabase
      .from("content_posts")
      .update(updatePayload)
      .eq("id", postId);

    if (updateErr) {
      delete updatePayload.published_at;
      await supabase
        .from("content_posts")
        .update(updatePayload)
        .eq("id", postId);
    }

    revalidatePath("/content-calendar");
    revalidatePath("/content-library");
    return { success: true, status: newStatus };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal memproses simulasi webhook." };
  }
}

/**
 * Republish / Reschedule Post to Zernio
 * Automatically deletes the previous post in Zernio if exists,
 * then dispatches a new scheduled post to Zernio.
 */
export async function republishPostToZernioAction(postId: string): Promise<{
  success: boolean;
  status?: string;
  zernioPostId?: string;
  scheduledAt?: string;
  error?: string;
  message?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi pengguna tidak ditemukan." };
    }

    // 1. Fetch Post details
    const { data: post, error: postErr } = await supabase
      .from("content_posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();

    if (postErr || !post) {
      return { success: false, error: "Data konten tidak ditemukan." };
    }

    // 2. Delete old Zernio post if exists
    const oldZernioPostId = post.zernio_post_id;
    if (oldZernioPostId) {
      console.log(`[ZernioRepublish] 🗑️ Deleting old Zernio post ${oldZernioPostId}...`);
      try {
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("id, zernio_api_key")
          .eq("id", post.workspace_id)
          .maybeSingle();

        const zernioApiKey =
          workspace?.zernio_api_key ||
          process.env.ZERNIO_API_KEY ||
          "zernio_sandbox_key";

        const { ZernioClient } = await import("@/lib/zernio/client");
        const zernioClient = new ZernioClient(zernioApiKey);
        const delRes = await zernioClient.deletePost(oldZernioPostId);
        console.log(`[ZernioRepublish] 🗑️ Delete old post result:`, delRes.success ? "Deleted ✅" : delRes.error);
      } catch (delErr: any) {
        console.warn(`[ZernioRepublish] ⚠️ Could not delete old post ${oldZernioPostId}:`, delErr.message);
      }
    }

    // 3. Clear old post id and set status to APPROVED
    await supabase
      .from("content_posts")
      .update({
        zernio_post_id: null,
        status: "APPROVED",
        ai_review: {
          ...(post.ai_review || {}),
          republished_at: new Date().toISOString(),
          previous_zernio_post_id: oldZernioPostId || null,
        },
      })
      .eq("id", postId);

    // 4. Call approvePostAction to schedule fresh post to Zernio
    const result = await approvePostAction(postId);

    revalidatePath("/content-calendar");
    revalidatePath("/content-library");

    return {
      ...result,
      message: "Postingan lama berhasil dihapus dari Zernio dan jadwal baru telah berhasil dikirim.",
    };
  } catch (err: any) {
    console.error("[ZernioRepublish] ❌ Error in republishPostToZernioAction:", err);
    return {
      success: false,
      error: err.message || "Gagal mempublikasikan ulang postingan ke Zernio.",
    };
  }
}




