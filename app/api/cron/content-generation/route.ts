import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { runLazyGenerationForPost } from "@/lib/ai/lazy-generator";
import { BusinessContext } from "@/lib/ai/planner";
import { checkIsAutoApproveEnabled } from "@/app/(dashboard)/auto-approve-actions";
import { enqueueZernioDispatch } from "@/lib/queue/queues";

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

    // 1b. Self-healing: Reset any old stuck GENERATING posts back to PLANNED
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await supabase
      .from("content_posts")
      .update({
        status: "PLANNED",
        caption_status: "PENDING",
        image_status: "PENDING",
      })
      .eq("status", "GENERATING")
      .eq("caption_status", "PENDING")
      .lt("updated_at", tenMinutesAgo);

    // 1c. Auto-Approve Sweep: Check any posts currently in READY FOR APPROVAL
    let autoApprovedCount = 0;
    try {
      const { data: readyPosts } = await supabase
        .from("content_posts")
        .select("id, title, workspace_id, ai_review")
        .eq("status", "READY FOR APPROVAL")
        .limit(20);

      if (readyPosts && readyPosts.length > 0) {
        for (const rPost of readyPosts) {
          if (!rPost.workspace_id) continue;
          const isAuto = await checkIsAutoApproveEnabled(supabase, undefined, rPost.workspace_id);
          if (isAuto) {
            console.log(`[Cron:content-generation] ⚡ Auto-Approve sweep: Dispatching post ${rPost.id} to Zernio...`);
            await supabase.from("content_posts").update({ status: "APPROVED" }).eq("id", rPost.id);
            const dispatchJob = await enqueueZernioDispatch({
              postId: rPost.id,
              workspaceId: rPost.workspace_id,
              action: "create_scheduled_post",
            });
            await supabase.from("content_posts").update({
              status: "SCHEDULED",
              ai_review: {
                ...(rPost.ai_review || {}),
                dispatch_job_id: dispatchJob.jobId,
                queued_at: new Date().toISOString(),
                auto_approved: true,
              },
            }).eq("id", rPost.id);
            autoApprovedCount++;
          }
        }
      }
    } catch (sweepErr) {
      console.warn("[Cron:content-generation] Auto-approve sweep error:", sweepErr);
    }

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
        message: autoApprovedCount > 0
          ? `Auto-approved ${autoApprovedCount} posts to Zernio. Tidak ada post PLANNED baru yang mendekati jadwal.`
          : "Tidak ada post PLANNED yang mendekati jadwal (H-1 / 48 jam).",
        processed: 0,
        autoApprovedCount,
      });
    }

    const { isRedisConnected } = await import("@/lib/queue/redis");
    const { enqueueContentGeneration } = await import("@/lib/queue/queues");
    const redisAlive = await isRedisConnected();

    const results = [];

    // 3. Process each post
    for (const post of duePosts) {
      const workspaceId = post.workspace_id;

      if (redisAlive) {
        // Option A: Enqueue to BullMQ for background worker execution (Recommended, avoids HTTP timeout)
        await supabase
          .from("content_posts")
          .update({
            status: "GENERATING",
            caption_status: "GENERATING",
            image_status: "GENERATING",
            generation_error: null,
          })
          .eq("id", post.id);

        const jobResult = await enqueueContentGeneration({
          postId: post.id,
          workspaceId,
          triggerSource: "cron_h_minus_1",
        });

        results.push({
          id: post.id,
          title: post.title,
          status: "GENERATING",
          queued: true,
          jobId: jobResult.jobId,
          mode: "bullmq_queue",
        });
      } else {
        // Option B: Direct generation fallback if Redis is offline, with robust error catching
        try {
          await supabase
            .from("content_posts")
            .update({
              status: "GENERATING",
              caption_status: "GENERATING",
              image_status: "GENERATING",
              generation_error: null,
            })
            .eq("id", post.id);

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

          let { data: rawProducts } = await supabase
            .from("products_services")
            .select("*")
            .eq("business_profile_id", bp?.id);

          if (!rawProducts || rawProducts.length === 0) {
            const fallbackProds = await supabase
              .from("products_services")
              .select("*")
              .eq("workspace_id", workspaceId);
            rawProducts = fallbackProds.data || [];
          }

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
              writingTone: bk?.writing_tone || bk?.tone_of_voice || "Professional & Engaging",
              visualStyle: bk?.visual_style || "Clean modern",
              language: bk?.language || "Bahasa Indonesia",
              emojiUsage: bk?.emoji_usage || bk?.emoji_style || "Medium",
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

          let finalPostStatus = genResult.status;

          // Auto-Approve check
          if (genResult.status === "READY FOR APPROVAL") {
            try {
              const isAutoApprove = await checkIsAutoApproveEnabled(supabase, undefined, workspaceId);
              if (isAutoApprove) {
                console.log(`[Cron:content-generation] ⚡ Auto-Approve is ACTIVE for post ${post.id}. Scheduling to Zernio...`);
                await supabase
                  .from("content_posts")
                  .update({ status: "APPROVED" })
                  .eq("id", post.id);

                const dispatchJob = await enqueueZernioDispatch({
                  postId: post.id,
                  workspaceId,
                  action: "create_scheduled_post",
                });

                await supabase
                  .from("content_posts")
                  .update({
                    status: "SCHEDULED",
                    ai_review: {
                      ...(genResult.aiReview || {}),
                      dispatch_job_id: dispatchJob.jobId,
                      queued_at: new Date().toISOString(),
                      auto_approved: true,
                    },
                  })
                  .eq("id", post.id);

                finalPostStatus = "SCHEDULED";
              }
            } catch (cronApproveErr) {
              console.warn("[Cron:content-generation] Auto-approve error:", cronApproveErr);
            }
          }

          results.push({
            id: post.id,
            title: post.title,
            status: finalPostStatus,
            captionStatus: genResult.captionStatus,
            imageStatus: genResult.imageStatus,
            mode: "direct_fallback",
          });
        } catch (singlePostErr: any) {
          console.error(`Error processing post ${post.id}:`, singlePostErr);
          // Restore to PLANNED on failure so it doesn't stay stuck as GENERATING
          await supabase
            .from("content_posts")
            .update({
              status: "PLANNED",
              caption_status: "FAILED",
              image_status: "FAILED",
              generation_error: singlePostErr.message || "Gagal memproses Lazy Generation.",
            })
            .eq("id", post.id);

          results.push({
            id: post.id,
            title: post.title,
            status: "PLANNED",
            error: singlePostErr.message,
            mode: "direct_fallback_failed",
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memproses ${results.length} post via Lazy Generation (${redisAlive ? "BullMQ Queue" : "Direct Fallback"}).`,
      processed: results.length,
      redisActive: redisAlive,
      results,
    });
  } catch (err: any) {
    console.error("Cron content-generation error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
