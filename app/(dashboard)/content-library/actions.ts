"use server";

import { createClient } from "@/lib/supabase/server";

export interface ContentLibraryItem {
  id: string;
  workspace_id: string;
  title: string;
  topic: string;
  pillar: string;
  content_type: string;
  format: string;
  platform: string;
  status: string;
  scheduled_date: string;
  scheduled_time: string;
  scheduled_at?: string | null;
  published_at?: string | null;
  caption?: string | null;
  hook?: string | null;
  cta?: string | null;
  hashtags?: string[] | null;
  media_url?: string | null;
  ai_score?: number | null;
  zernio_post_id?: string | null;
  zernio_account_id?: string | null;
  created_at: string;
  updated_at: string;
}

export async function getContentLibraryData(): Promise<{
  success: boolean;
  posts: ContentLibraryItem[];
  stats: {
    total: number;
    published: number;
    scheduled: number;
    readyForApproval: number;
    drafts: number;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        posts: [],
        stats: { total: 0, published: 0, scheduled: 0, readyForApproval: 0, drafts: 0 },
        error: "Sesi telah berakhir.",
      };
    }

    // Resolve active workspace
    const { data: ws } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!ws) {
      return {
        success: true,
        posts: [],
        stats: { total: 0, published: 0, scheduled: 0, readyForApproval: 0, drafts: 0 },
      };
    }

    // Fetch all content posts for this workspace
    const { data: rawPosts, error: postErr } = await supabase
      .from("content_posts")
      .select("*")
      .eq("workspace_id", ws.id)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true });

    if (postErr) {
      return {
        success: false,
        posts: [],
        stats: { total: 0, published: 0, scheduled: 0, readyForApproval: 0, drafts: 0 },
        error: postErr.message,
      };
    }

    const posts: ContentLibraryItem[] = (rawPosts || []).map((p: any) => ({
      id: p.id,
      workspace_id: p.workspace_id,
      title: p.title,
      topic: p.topic,
      pillar: p.pillar || "General",
      content_type: p.content_type || "Educational",
      format: p.format || "Feed",
      platform: p.platform || "instagram",
      status: p.status || "PLANNED",
      scheduled_date: p.scheduled_date,
      scheduled_time: p.scheduled_time || "19:00",
      scheduled_at: p.scheduled_at || null,
      published_at: p.published_at || p.ai_review?.published_at || null,
      caption: p.caption || null,
      hook: p.hook || null,
      cta: p.cta || null,
      hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
      media_url: p.media_url || null,
      ai_score: p.ai_score || null,
      zernio_post_id: p.zernio_post_id || null,
      zernio_account_id: p.zernio_account_id || p.ai_review?.zernio_account_id || null,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));

    const stats = {
      total: posts.length,
      published: posts.filter((p) => p.status === "PUBLISHED").length,
      scheduled: posts.filter((p) => p.status === "SCHEDULED" || p.status === "PUBLISHING").length,
      readyForApproval: posts.filter((p) => p.status === "READY FOR APPROVAL" || p.status === "REVIEW").length,
      drafts: posts.filter((p) => ["PLANNED", "DRAFT", "GENERATING", "NEEDS_REVISION"].includes(p.status)).length,
    };

    return {
      success: true,
      posts,
      stats,
    };
  } catch (err: any) {
    console.error("Error in getContentLibraryData:", err);
    return {
      success: false,
      posts: [],
      stats: { total: 0, published: 0, scheduled: 0, readyForApproval: 0, drafts: 0 },
      error: err.message || "Gagal memuat Content Library.",
    };
  }
}
