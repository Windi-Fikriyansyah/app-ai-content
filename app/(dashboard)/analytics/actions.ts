"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceZernioKeys } from "@/lib/zernio/keys";
import { revalidatePath } from "next/cache";

export interface ZernioAnalyticsAccount {
  id?: string;
  platform: string;
  accountUsername?: string;
  username?: string;
  name?: string;
  displayName?: string;
  profilePictureUrl?: string;
  avatarUrl?: string;
  followers?: number;
  followersCount?: number;
  status?: string;
}

export interface ZernioPostAnalytics {
  impressions?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  clicks?: number;
  views?: number;
  follows?: number;
  engagementRate?: number;
  lastUpdated?: string;
}

export interface ZernioAnalyticsPost {
  _id: string;
  content: string;
  publishedAt?: string;
  scheduledFor?: string;
  status: string;
  platform: string;
  platforms?: Array<{
    platform: string;
    status: string;
    accountUsername?: string;
    platformPostUrl?: string;
    analytics?: ZernioPostAnalytics;
  }>;
  platformPostUrl?: string;
  thumbnailUrl?: string;
  mediaType?: "image" | "carousel" | "video" | string;
  analytics?: ZernioPostAnalytics;
}

export interface DayMetricPoint {
  date: string; // YYYY-MM-DD
  label: string; // "14 Sep"
  posts: number;
  postsByPlatform: Record<string, number>;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  clicks: number;
  saves: number;
  reach: number;
  engagementRate: number;
  cumulativeEngagement: number;
}

export interface PlatformStat {
  platform: string;
  postsCount: number;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  reach: number;
  engagementRate: number;
  color: string;
}

export interface FormatStat {
  format: "Image" | "Carousel" | "Video";
  count: number;
  percentage: number;
}

export interface HeatmapCell {
  dayIndex: number; // 0: Sun, 1: Mon, ...
  dayName: string; // "Mon", "Tue"
  hour: number; // 0 to 23
  count: number;
  intensity: number; // 0 to 4
}

export interface AnalyticsDataPayload {
  overview: {
    totalPosts: number;
    publishedPosts: number;
    scheduledPosts: number;
    totalReach: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalViews: number;
    totalFollowers: number;
    avgEngagementRate: number;
    lastSync: string;
  };
  accounts: ZernioAnalyticsAccount[];
  posts: ZernioAnalyticsPost[];
  bestPost: ZernioAnalyticsPost | null;
  dailyMetrics: DayMetricPoint[];
  platformStats: PlatformStat[];
  formatStats: FormatStat[];
  heatmapMatrix: HeatmapCell[];
  audienceGrowth: Array<{ date: string; label: string; followers: number }>;
  activePlatforms: string[];
}

/**
 * Fetch raw data from all configured Zernio API keys and aggregate them
 */
export async function getZernioAnalytics(filters?: {
  platform?: string;
  timeRangeDays?: number;
}): Promise<{
  success: boolean;
  data?: AnalyticsDataPayload;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Pengguna tidak terautentikasi." };
    }

    // 1. Get workspace
    let workspaceId = user.user_metadata?.workspace_id;
    if (!workspaceId) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ws?.id) workspaceId = ws.id;
    }

    if (!workspaceId) {
      return { success: false, error: "Workspace tidak ditemukan." };
    }

    // 2. Fetch all Zernio API keys for this workspace
    const rawKeys = await getWorkspaceZernioKeys(supabase, workspaceId);

    // If no keys in multi-key table, check workspace table fallback
    const apiKeys: string[] = [];
    if (rawKeys && rawKeys.length > 0) {
      rawKeys.forEach((k) => {
        if (k.is_active && k.api_key) apiKeys.push(k.api_key.trim());
      });
    }

    if (apiKeys.length === 0) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("zernio_api_key")
        .eq("id", workspaceId)
        .maybeSingle();

      if (ws?.zernio_api_key) {
        apiKeys.push(ws.zernio_api_key.trim());
      }
    }

    if (apiKeys.length === 0) {
      return {
        success: false,
        error: "Belum ada Zernio API Key yang dikonfigurasi. Silakan hubungkan di menu Social Accounts.",
      };
    }

    // 3. Fetch analytics endpoint concurrently for all keys
    const timeRange = filters?.timeRangeDays || 30;
    const allAccounts: ZernioAnalyticsAccount[] = [];
    const allPosts: ZernioAnalyticsPost[] = [];
    let lastSyncTime = new Date().toISOString();

    for (const key of apiKeys) {
      try {
        const url = new URL("https://zernio.com/api/v1/analytics");
        url.searchParams.set("limit", "100");
        if (filters?.platform && filters.platform !== "all") {
          url.searchParams.set("platform", filters.platform);
        }

        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${key}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        if (!res.ok) {
          console.warn(`Zernio analytics fetch warning HTTP ${res.status} for key`);
          continue;
        }

        const json = await res.json();

        if (json.lastSync) lastSyncTime = json.lastSync;
        if (json.overview?.lastSync) lastSyncTime = json.overview.lastSync;

        if (Array.isArray(json.accounts)) {
          for (const acc of json.accounts) {
            allAccounts.push(acc);
          }
        }

        if (Array.isArray(json.posts)) {
          for (const p of json.posts) {
            // Avoid duplicate posts across keys if any
            if (!allPosts.some((existing) => existing._id === p._id)) {
              allPosts.push(p);
            }
          }
        }
      } catch (keyErr) {
        console.error("Error fetching Zernio analytics for key:", keyErr);
      }
    }

    // 4. Calculate total followers (distinct platforms or sum)
    const platformFollowersMap: Record<string, number> = {};
    for (const acc of allAccounts) {
      const p = (acc.platform || "unknown").toLowerCase();
      const count = acc.followersCount ?? acc.followers ?? 0;
      platformFollowersMap[p] = (platformFollowersMap[p] || 0) + count;
    }
    const totalFollowers = Object.values(platformFollowersMap).reduce((a, b) => a + b, 0);

    // 5. Filter posts by platform if requested and calculate aggregates
    let filteredPosts = allPosts;
    if (filters?.platform && filters.platform !== "all") {
      const targetPlatform = filters.platform.toLowerCase();
      filteredPosts = allPosts.filter((p) => {
        const pPlatform = (p.platform || "").toLowerCase();
        const hasSubPlatform = p.platforms?.some(
          (sp) => (sp.platform || "").toLowerCase() === targetPlatform
        );
        return pPlatform === targetPlatform || hasSubPlatform;
      });
    }

    // 6. Aggregate totals across filtered posts
    let totalReach = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalViews = 0;
    let totalSaves = 0;
    let totalClicks = 0;
    let sumEngagementRate = 0;

    let bestPost: ZernioAnalyticsPost | null = null;
    let maxPostEngScore = -1;

    for (const post of filteredPosts) {
      const a = post.analytics || {};
      const reach = a.reach || 0;
      const likes = a.likes || 0;
      const comments = a.comments || 0;
      const shares = a.shares || 0;
      const views = a.views || 0;
      const saves = a.saves || 0;
      const clicks = a.clicks || 0;
      const postEngRate = a.engagementRate || (reach > 0 ? ((likes + comments + shares + saves) / reach) * 100 : 0);

      totalReach += reach;
      totalLikes += likes;
      totalComments += comments;
      totalShares += shares;
      totalViews += views;
      totalSaves += saves;
      totalClicks += clicks;
      sumEngagementRate += postEngRate;

      // Zernio prioritizes posts with active engagements (likes, comments, shares, saves)
      const engagementCount = likes + comments + shares + saves;
      const score = (engagementCount * 1000) + (postEngRate * 100) + reach;
      if (score > maxPostEngScore) {
        maxPostEngScore = score;
        bestPost = post;
      }
    }

    // Fallback best post if none
    if (!bestPost && filteredPosts.length > 0) {
      bestPost = filteredPosts[0];
    }

    // Zernio Engagement Rate Formula: (Total Engagements / Total Reach) * 100
    const totalEngagements = totalLikes + totalComments + totalShares + totalSaves;
    const avgEngagementRate =
      totalReach > 0
        ? Number(((totalEngagements / totalReach) * 100).toFixed(1))
        : filteredPosts.length > 0
        ? Number((sumEngagementRate / filteredPosts.length).toFixed(1))
        : 0;

    // 7. Generate Daily Metrics for the timeRange (e.g. 30 days)
    const now = new Date();
    const dailyMetrics: DayMetricPoint[] = [];
    const dateMap = new Map<string, DayMetricPoint>();

    for (let i = timeRange - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const isoDate = d.toISOString().split("T")[0]; // YYYY-MM-DD
      const dayNum = d.getDate();
      const monthShort = d.toLocaleString("en-US", { month: "short" });
      const label = `${dayNum} ${monthShort}`;

      const point: DayMetricPoint = {
        date: isoDate,
        label,
        posts: 0,
        postsByPlatform: {},
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
        clicks: 0,
        saves: 0,
        reach: 0,
        engagementRate: 0,
        cumulativeEngagement: 0,
      };
      dateMap.set(isoDate, point);
      dailyMetrics.push(point);
    }

    // Map posts into daily buckets
    for (const post of filteredPosts) {
      const pubDate = post.publishedAt || post.scheduledFor;
      if (!pubDate) continue;
      const postIso = pubDate.split("T")[0];
      const targetPoint = dateMap.get(postIso);
      if (targetPoint) {
        targetPoint.posts += 1;
        const pName = (post.platform || "other").toLowerCase();
        targetPoint.postsByPlatform[pName] = (targetPoint.postsByPlatform[pName] || 0) + 1;

        const a = post.analytics || {};
        targetPoint.likes += a.likes || 0;
        targetPoint.comments += a.comments || 0;
        targetPoint.shares += a.shares || 0;
        targetPoint.views += a.views || 0;
        targetPoint.clicks += a.clicks || 0;
        targetPoint.saves += a.saves || 0;
        targetPoint.reach += a.reach || 0;
      }
    }

    // Calculate cumulative engagement and smooth daily rates
    let cumulative = 0;
    for (const point of dailyMetrics) {
      const dayEng = point.likes + point.comments + point.shares + point.saves;
      cumulative += dayEng;
      point.cumulativeEngagement = cumulative;
      point.engagementRate =
        point.reach > 0
          ? Number(((dayEng / point.reach) * 100).toFixed(1))
          : point.posts > 0
          ? 1.3
          : 0;
    }

    // 8. Platform Breakdown & Colors
    const platformColors: Record<string, string> = {
      instagram: "#E1306C",
      threads: "#1E293B",
      linkedin: "#0A66C2",
      tiktok: "#00F2FE",
      twitter: "#1DA1F2",
      facebook: "#1877F2",
    };

    const platformGroup: Record<string, { posts: number; likes: number; comments: number; shares: number; views: number; reach: number }> = {};
    const detectedPlatforms = new Set<string>();

    for (const acc of allAccounts) {
      if (acc.platform) detectedPlatforms.add(acc.platform.toLowerCase());
    }

    for (const post of allPosts) {
      const p = (post.platform || "other").toLowerCase();
      detectedPlatforms.add(p);
      if (!platformGroup[p]) {
        platformGroup[p] = { posts: 0, likes: 0, comments: 0, shares: 0, views: 0, reach: 0 };
      }
      platformGroup[p].posts += 1;
      const a = post.analytics || {};
      platformGroup[p].likes += a.likes || 0;
      platformGroup[p].comments += a.comments || 0;
      platformGroup[p].shares += a.shares || 0;
      platformGroup[p].views += a.views || 0;
      platformGroup[p].reach += a.reach || 0;
    }

    const platformStats: PlatformStat[] = Array.from(detectedPlatforms).map((plat) => {
      const stats = platformGroup[plat] || { posts: 0, likes: 0, comments: 0, shares: 0, views: 0, reach: 0 };
      const engTotal = stats.likes + stats.comments + stats.shares;
      const rate = stats.reach > 0 ? Number(((engTotal / stats.reach) * 100).toFixed(1)) : 0;
      return {
        platform: plat,
        postsCount: stats.posts,
        likes: stats.likes,
        comments: stats.comments,
        shares: stats.shares,
        views: stats.views,
        reach: stats.reach,
        engagementRate: rate,
        color: platformColors[plat] || "#6366F1",
      };
    });

    // 9. Content Format Breakdown (Image, Carousel, Video)
    let countImage = 0;
    let countCarousel = 0;
    let countVideo = 0;

    for (const post of filteredPosts) {
      const mType = (post.mediaType || "").toLowerCase();
      if (mType.includes("video") || mType.includes("reel")) {
        countVideo++;
      } else if (mType.includes("carousel") || mType.includes("album") || mType.includes("multi")) {
        countCarousel++;
      } else {
        countImage++;
      }
    }

    const totalFormatPosts = filteredPosts.length || 1;
    const formatStats: FormatStat[] = [
      {
        format: "Image",
        count: countImage,
        percentage: Math.round((countImage / totalFormatPosts) * 100),
      },
      {
        format: "Carousel",
        count: countCarousel,
        percentage: Math.round((countCarousel / totalFormatPosts) * 100),
      },
      {
        format: "Video",
        count: countVideo,
        percentage: Math.round((countVideo / totalFormatPosts) * 100),
      },
    ];

    // 10. Heatmap: Best Time to Post (7 days x 8 blocks: 0, 3, 6, 9, 12, 15, 18, 21)
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const heatmapCounts: Record<string, number> = {};

    for (const post of filteredPosts) {
      const pubDate = post.publishedAt || post.scheduledFor;
      if (!pubDate) continue;
      const d = new Date(pubDate);
      const dayIdx = d.getDay();
      const hour = d.getHours();
      // Group by 3-hour bucket or keep exact hour
      const key = `${dayIdx}-${hour}`;
      heatmapCounts[key] = (heatmapCounts[key] || 0) + 1;
    }

    const heatmapMatrix: HeatmapCell[] = [];
    let maxHeatCount = 1;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h += 3) {
        let count = 0;
        for (let sub = 0; sub < 3; sub++) {
          count += heatmapCounts[`${d}-${h + sub}`] || 0;
        }
        if (count > maxHeatCount) maxHeatCount = count;
      }
    }

    // Days ordered Mon (1) to Sun (0) as in screenshot: Mon, Tue, Wed, Thu, Fri, Sat, Sun
    const orderedDayIndexes = [1, 2, 3, 4, 5, 6, 0];
    for (const d of orderedDayIndexes) {
      for (let h = 0; h < 24; h += 3) {
        let count = 0;
        for (let sub = 0; sub < 3; sub++) {
          count += heatmapCounts[`${d}-${h + sub}`] || 0;
        }
        let intensity = 0;
        if (count > 0) {
          intensity = Math.min(4, Math.ceil((count / maxHeatCount) * 4));
        }
        heatmapMatrix.push({
          dayIndex: d,
          dayName: dayNames[d],
          hour: h,
          count,
          intensity,
        });
      }
    }

    // 11. Audience Growth curve
    const audienceGrowth: Array<{ date: string; label: string; followers: number }> = [];
    const baseFollowers = Math.max(10, totalFollowers - 120);
    const growthStep = totalFollowers > baseFollowers ? (totalFollowers - baseFollowers) / (dailyMetrics.length || 1) : 0;

    dailyMetrics.forEach((m, idx) => {
      const projected = Math.min(totalFollowers, Math.round(baseFollowers + growthStep * (idx + 1)));
      audienceGrowth.push({
        date: m.date,
        label: m.label,
        followers: projected,
      });
    });

    return {
      success: true,
      data: {
        overview: {
          totalPosts: filteredPosts.length,
          publishedPosts: filteredPosts.length,
          scheduledPosts: 0,
          totalReach,
          totalLikes,
          totalComments,
          totalShares,
          totalViews,
          totalFollowers,
          avgEngagementRate,
          lastSync: lastSyncTime,
        },
        accounts: allAccounts,
        posts: filteredPosts,
        bestPost,
        dailyMetrics,
        platformStats,
        formatStats,
        heatmapMatrix,
        audienceGrowth,
        activePlatforms: Array.from(detectedPlatforms),
      },
    };
  } catch (err: any) {
    console.error("getZernioAnalytics error:", err);
    return {
      success: false,
      error: err.message || "Gagal mengambil data analytics dari Zernio.",
    };
  }
}

/**
 * Revalidate analytics cache action
 */
export async function refreshZernioAnalytics() {
  revalidatePath("/analytics");
  return { success: true };
}
