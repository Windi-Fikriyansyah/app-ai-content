"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ContentPreferencesData {
  postsPerWeek: number;
  postsPerDay?: number; // 1, 2, or 3 posts per day (max 3)
  postingDays: string[];
  postingTime: string;
  contentTypes: string[];
  strategyDistribution: Record<string, number>;
  imageQuality?: "low" | "medium" | "high" | "auto";
}

const DEFAULT_PREFERENCES: ContentPreferencesData = {
  postsPerWeek: 7,
  postsPerDay: 1,
  postingDays: ["Monday", "Wednesday", "Friday"],
  postingTime: "19:00",
  contentTypes: [
    "Educational",
    "Promotional",
    "Engagement",
    "Branding",
    "Tips",
    "Storytelling",
  ],
  strategyDistribution: {
    Educational: 40,
    Promotional: 20,
    Engagement: 15,
    Branding: 10,
    Tips: 10,
    Storytelling: 5,
  },
  imageQuality: "medium",
};

/**
 * Helper to calculate recommended AI Strategy Distribution dynamically
 * based on selected content types and business profile
 */
export async function calculateRecommendedStrategy(
  contentTypes: string[],
  businessCategory?: string
): Promise<Record<string, number>> {
  if (!contentTypes || contentTypes.length === 0) {
    return { Educational: 100 };
  }

  // Base weights inspired by high-performing SaaS & UMKM Instagram strategies
  const weights: Record<string, number> = {
    Educational: 40,
    Promotional: 20,
    Engagement: 15,
    Branding: 10,
    Tips: 10,
    Storytelling: 5,
    "Social Proof": 10,
  };

  // Filter weights only for selected content types
  let totalWeight = 0;
  const filteredWeights: Record<string, number> = {};

  contentTypes.forEach((type) => {
    const w = weights[type] || 10;
    filteredWeights[type] = w;
    totalWeight += w;
  });

  // Normalize to exact 100%
  const distribution: Record<string, number> = {};
  let accumulated = 0;
  const keys = Object.keys(filteredWeights);

  keys.forEach((type, index) => {
    if (index === keys.length - 1) {
      distribution[type] = Math.max(1, 100 - accumulated);
    } else {
      const percentage = Math.round((filteredWeights[type] / totalWeight) * 100);
      distribution[type] = Math.max(1, percentage);
      accumulated += distribution[type];
    }
  });

  return distribution;
}

/**
 * 1. Get Content Preferences
 */
export async function getContentPreferences(): Promise<{
  success: boolean;
  data?: ContentPreferencesData;
  businessName?: string;
  businessCategory?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Pengguna tidak terautentikasi." };
  }

  let workspaceId = user.user_metadata?.workspace_id;
  let businessName = user.user_metadata?.business_name || user.user_metadata?.workspace_name || "Bisnis Anda";
  let businessCategory = "";

  try {
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

      const { data: bp } = await supabase
        .from("business_profiles")
        .select("business_name, category")
        .eq("workspace_id", ws.id)
        .maybeSingle();

      if (bp) {
        businessName = bp.business_name || businessName;
        businessCategory = bp.category || businessCategory;
      }
    }
  } catch (err) {
    console.warn("Notice querying workspace in getContentPreferences:", err);
  }

  // Query database content_preferences
  let preferences: ContentPreferencesData = { ...DEFAULT_PREFERENCES };

  if (workspaceId) {
    try {
      const { data: cp } = await supabase
        .from("content_preferences")
        .select("posts_per_week, posting_days, posting_time, content_types, strategy_distribution, image_quality")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (cp) {
        let postsPerDay = 1;
        const meta = (cp.strategy_distribution as any)?._meta;
        if (meta?.postsPerDay) {
          postsPerDay = Math.max(1, Math.min(3, Number(meta.postsPerDay)));
        } else if (cp.posting_time && cp.posting_time.includes(",")) {
          postsPerDay = Math.max(1, Math.min(3, cp.posting_time.split(",").length));
        } else if (cp.posts_per_week && Array.isArray(cp.posting_days) && cp.posting_days.length > 0) {
          postsPerDay = Math.max(1, Math.min(3, Math.round(cp.posts_per_week / cp.posting_days.length)));
        }

        const days = Array.isArray(cp.posting_days) ? cp.posting_days : DEFAULT_PREFERENCES.postingDays;
        const calculatedPostsPerWeek = cp.posts_per_week ?? (postsPerDay * days.length);

        const cleanStrategy: Record<string, number> = {};
        if (cp.strategy_distribution && typeof cp.strategy_distribution === "object") {
          for (const [k, v] of Object.entries(cp.strategy_distribution)) {
            if (typeof v === "number" && k !== "_meta") {
              cleanStrategy[k] = v;
            }
          }
        }

        preferences = {
          postsPerWeek: calculatedPostsPerWeek,
          postsPerDay,
          postingDays: days,
          postingTime: cp.posting_time || DEFAULT_PREFERENCES.postingTime,
          contentTypes: Array.isArray(cp.content_types) ? cp.content_types : DEFAULT_PREFERENCES.contentTypes,
          strategyDistribution:
            Object.keys(cleanStrategy).length > 0
              ? cleanStrategy
              : DEFAULT_PREFERENCES.strategyDistribution,
          imageQuality: (cp.image_quality as any) || DEFAULT_PREFERENCES.imageQuality,
        };
      }
    } catch (cpErr) {
      console.warn("Notice querying content_preferences table:", cpErr);
    }
  }

  return {
    success: true,
    data: preferences,
    businessName,
    businessCategory,
  };
}

/**
 * 2. Save Content Preferences & Strategy
 */
export async function saveContentPreferences(
  payload: ContentPreferencesData
): Promise<{
  success: boolean;
  message?: string;
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

    let workspaceId = user.user_metadata?.workspace_id;
    if (!workspaceId) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ws) workspaceId = ws.id;
    }

    const postsPerDay = Math.max(1, Math.min(3, Number(payload.postsPerDay) || 1));
    const postingDays =
      Array.isArray(payload.postingDays) && payload.postingDays.length > 0
        ? payload.postingDays
        : ["Monday", "Wednesday", "Friday"];
    const calculatedPostsPerWeek = postsPerDay * postingDays.length;

    // Ensure strategy only contains valid numbers
    const cleanStrategy: Record<string, number> = {};
    if (payload.strategyDistribution && typeof payload.strategyDistribution === "object") {
      for (const [k, v] of Object.entries(payload.strategyDistribution)) {
        if (typeof v === "number" && k !== "_meta") {
          cleanStrategy[k] = v;
        }
      }
    }

    if (workspaceId) {
      try {
        await supabase.from("content_preferences").upsert(
          {
            workspace_id: workspaceId,
            posts_per_week: calculatedPostsPerWeek,
            posting_days: postingDays,
            posting_time: payload.postingTime,
            content_types: payload.contentTypes,
            strategy_distribution: cleanStrategy,
            image_quality: payload.imageQuality || "medium",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id" }
        );
      } catch (dbErr) {
        console.warn("Notice upserting to content_preferences table:", dbErr);
      }
    }

    // Save to user metadata for fallback resilience
    await supabase.auth.updateUser({
      data: {
        content_preferences: payload,
      },
    });

    revalidatePath("/ai-agent/content-generation");
    return {
      success: true,
      message: "Preferensi konten & AI Content Strategy berhasil disimpan!",
    };
  } catch (err: any) {
    console.error("Error saving content preferences:", err);
    return { success: false, error: err.message || "Gagal menyimpan preferensi konten." };
  }
}
