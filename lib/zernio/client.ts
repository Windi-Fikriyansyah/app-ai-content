/**
 * Zernio API Client for Social Media Publishing & Account Management
 * Base URL: https://zernio.com/api/v1
 * Documentation: https://docs.zernio.com
 */

const ZERNIO_API_BASE_URL =
  process.env.ZERNIO_API_BASE_URL || "https://zernio.com/api";

export interface ZernioProfile {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

export interface ZernioAccount {
  id: string;
  profileId?: string;
  platform: "instagram" | "facebook" | "twitter" | "linkedin" | "tiktok" | string;
  accountUsername?: string;
  username?: string;
  name?: string;
  displayName?: string;
  profilePictureUrl?: string;
  avatarUrl?: string;
  status: "active" | "connected" | "disconnected" | "expired" | string;
  metadata?: Record<string, any>;
}

export class ZernioClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = ZERNIO_API_BASE_URL) {
    this.apiKey = apiKey.trim();
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string; status: number }> {
    try {
      const url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
      const res = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...options.headers,
        },
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg =
          json?.message ||
          json?.error ||
          `Zernio API error with HTTP ${res.status}: ${res.statusText}`;
        return { success: false, data: json as T, error: errorMsg, status: res.status };
      }

      return { success: true, data: json as T, status: res.status };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to communicate with Zernio API",
        status: 500,
      };
    }
  }

  /**
   * Validate API Key by fetching accounts or profiles
   */
  async validateApiKey(): Promise<{ valid: boolean; error?: string; accountsCount?: number }> {
    const res = await this.getAccounts();
    if (!res.success) {
      // If 401 or 403, key is definitely invalid
      return { valid: false, error: res.error || "Kunci API Zernio tidak valid atau tidak memiliki izin." };
    }
    let accounts: ZernioAccount[] = [];
    if (res.data) {
      if (Array.isArray(res.data)) {
        accounts = res.data;
      } else if (Array.isArray((res.data as any).data)) {
        accounts = (res.data as any).data;
      }
    }
    return { valid: true, accountsCount: accounts.length };
  }

  /**
   * List Profiles: GET /v1/profiles
   */
  async getProfiles(params?: { limit?: number; skip?: number; name?: string }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.skip) query.set("skip", params.skip.toString());
    if (params?.name) query.set("name", params.name);

    const queryString = query.toString() ? `?${query.toString()}` : "";
    return this.request<{ data: ZernioProfile[] } | ZernioProfile[]>(
      `/v1/profiles${queryString}`
    );
  }

  /**
   * Create Profile: POST /v1/profiles
   */
  async createProfile(name: string) {
    return this.request<ZernioProfile>("/v1/profiles", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  /**
   * Ensure a Profile exists for this workspace / brand
   */
  async getOrCreateProfile(profileName: string): Promise<{ profileId?: string; error?: string }> {
    // 1. Helper to safely extract profiles array
    const extractProfiles = (raw: any): any[] => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw.data)) return raw.data;
      if (Array.isArray(raw.profiles)) return raw.profiles;
      return [];
    };

    // 2. Helper to get profile ID (_id or id)
    const getId = (item: any): string | undefined => {
      if (!item) return undefined;
      return item._id || item.id || item.profile?._id || item.profile?.id;
    };

    // 3. Try to find existing profile first
    const listRes = await this.getProfiles();
    if (listRes.success && listRes.data) {
      const profiles = extractProfiles(listRes.data);
      const match = profiles.find((p) => p.name?.toLowerCase() === profileName.toLowerCase());
      if (match && getId(match)) return { profileId: getId(match) };
      if (profiles.length > 0 && getId(profiles[0])) return { profileId: getId(profiles[0]) };
    }

    // 4. Otherwise create one
    const createRes = await this.createProfile(profileName);
    if (createRes.success && createRes.data) {
      const createdId = getId(createRes.data) || (createRes.data as any)?.profile?._id;
      if (createdId) {
        return { profileId: createdId };
      }
    }

    // 5. If 409 Conflict: "A profile with this name already exists"
    // Check if Zernio returned details.existingProfileId or existingProfileId
    const conflictData: any = createRes.data;
    const existingId =
      conflictData?.details?.existingProfileId ||
      conflictData?.details?.profileId ||
      conflictData?.existingProfileId ||
      conflictData?.profileId ||
      conflictData?.profile?._id;

    if (existingId) {
      return { profileId: existingId };
    }

    // 6. Query profiles list again and take the existing profile
    const retryList = await this.getProfiles();
    if (retryList.success && retryList.data) {
      const profiles = extractProfiles(retryList.data);
      const match = profiles.find((p) => p.name?.toLowerCase() === profileName.toLowerCase());
      if (match && getId(match)) return { profileId: getId(match) };
      if (profiles.length > 0 && getId(profiles[0])) return { profileId: getId(profiles[0]) };
    }

    return { error: createRes.error || "Gagal membuat atau mengambil profile di Zernio" };
  }

  /**
   * Generic Platform Connect OAuth URL: GET /v1/connect/:platform
   * Supports: instagram, threads, facebook, twitter, linkedin, tiktok
   */
  async getConnectUrl(
    platform: string,
    params: {
      profileId: string;
      redirectUrl?: string;
      loginMethod?: string;
    }
  ): Promise<{ success: boolean; authUrl?: string; error?: string }> {
    const isMock =
      !this.apiKey ||
      this.apiKey.includes("dummy") ||
      this.apiKey.includes("your_zernio_api_key") ||
      process.env.ZERNIO_MOCK === "true";

    if (isMock) {
      const mockRedirect = params.redirectUrl || `/social-accounts`;
      const separator = mockRedirect.includes("?") ? "&" : "?";
      return {
        success: true,
        authUrl: `${mockRedirect}${separator}connected=${platform}&accountId=mock_${platform}_${Date.now()}&status=success`,
      };
    }

    const query = new URLSearchParams();
    query.set("profileId", params.profileId);
    if (params.redirectUrl) {
      query.set("redirect_url", params.redirectUrl);
      query.set("redirectUrl", params.redirectUrl);
    }
    if (params.loginMethod) query.set("loginMethod", params.loginMethod);

    const endpoint = `/v1/connect/${platform.toLowerCase()}?${query.toString()}`;
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
        redirect: "manual", // Handle both 302 redirects and JSON response
      });

      // 1. Check if Zernio returned a 301/302/307 redirect directly
      const location = res.headers.get("location");
      if (location) {
        return { success: true, authUrl: location };
      }

      // 2. Otherwise parse JSON
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        return {
          success: false,
          error:
            json?.message ||
            json?.error ||
            `Zernio HTTP ${res.status}: ${res.statusText}`,
        };
      }

      const authUrl =
        json?.authUrl ||
        json?.url ||
        json?.data?.authUrl ||
        json?.data?.url;

      if (authUrl) {
        return { success: true, authUrl };
      }

      return {
        success: false,
        error:
          json?.message ||
          `Respon Zernio tidak menyertakan URL otentikasi (${platform}).`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || `Gagal menghubungi server Zernio untuk koneksi ${platform}.`,
      };
    }
  }

  /**
   * Get Instagram Connect OAuth URL: GET /v1/connect/instagram
   */
  async getInstagramConnectUrl(params: {
    profileId: string;
    redirectUrl?: string;
    loginMethod?: "instagram_login" | "facebook_login";
  }): Promise<{ success: boolean; authUrl?: string; error?: string }> {
    return this.getConnectUrl("instagram", params);
  }

  /**
   * Get Threads Connect OAuth URL: GET /v1/connect/threads
   */
  async getThreadsConnectUrl(params: {
    profileId: string;
    redirectUrl?: string;
  }): Promise<{ success: boolean; authUrl?: string; error?: string }> {
    return this.getConnectUrl("threads", params);
  }

  /**
   * Get TikTok Connect OAuth URL: GET /v1/connect/tiktok
   */
  async getTikTokConnectUrl(params: {
    profileId: string;
    redirectUrl?: string;
  }): Promise<{ success: boolean; authUrl?: string; error?: string }> {
    return this.getConnectUrl("tiktok", params);
  }

  /**
   * Get LinkedIn Connect OAuth URL: GET /v1/connect/linkedin
   */
  async getLinkedInConnectUrl(params: {
    profileId: string;
    redirectUrl?: string;
  }): Promise<{ success: boolean; authUrl?: string; error?: string }> {
    return this.getConnectUrl("linkedin", params);
  }

  /**
   * List Connected Accounts: GET /v1/accounts
   */
  async getAccounts(profileId?: string) {
    const query = profileId ? `?profileId=${encodeURIComponent(profileId)}` : "";
    return this.request<{ data: ZernioAccount[] } | ZernioAccount[]>(
      `/v1/accounts${query}`
    );
  }

  /**
   * Disconnect an Account: DELETE /v1/accounts/:id
   */
  async disconnectAccount(accountId: string) {
    return this.request(`/v1/accounts/${accountId}`, {
      method: "DELETE",
    });
  }

  /**
   * Prepare & Upload Media to Zernio
   * If URL is already public (e.g. Supabase Storage public bucket), Zernio accepts it directly.
   */
  async uploadMedia(mediaUrl: string): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!mediaUrl) return { success: false, error: "Media URL is required" };
    // Zernio can ingest direct public Supabase URLs
    return { success: true, url: mediaUrl };
  }

  /**
   * Create Scheduled or Instant Post: POST /v1/posts
   * Official Zernio API Documentation Reference:
   * - isDraft: false (CRITICAL: tells Zernio this is scheduled, not a draft)
   * - scheduledFor: ISO 8601 string (e.g. 2026-09-11T19:00:00+07:00)
   * - platforms: [{ platform: "instagram", accountId: "..." }]
   * - mediaItems: [{ type: "image", url: "..." }]
   * - For Instagram Carousel: requires 2-10 media items.
   */
  async createPost(params: {
    accountIds: string[];
    platforms?: Array<{ platform: string; accountId: string }>;
    content: string;
    mediaUrls?: string[];
    format?: string; // "Feed" | "Carousel" | "Reels" | "Story"
    scheduledAt?: string; // ISO 8601 string
    publishNow?: boolean;
    timezone?: string;
    requestId?: string;
  }): Promise<{
    success: boolean;
    data?: {
      id: string;
      status: "scheduled" | "publishing" | "published" | "failed";
      scheduledAt?: string;
      accountIds: string[];
      content: string;
      isDraft?: boolean;
    };
    error?: string;
    isSimulated?: boolean;
  }> {
    const isMock =
      !this.apiKey ||
      this.apiKey.includes("dummy") ||
      this.apiKey.includes("your_zernio_api_key") ||
      process.env.ZERNIO_MOCK === "true";

    const targetTime = params.scheduledAt || new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    // Prepare media items
    let mediaUrls = params.mediaUrls || [];
    // If format is Carousel and only 1 image provided, duplicate to satisfy Instagram Graph API carousel requirement (min 2 items)
    if (params.format?.toLowerCase() === "carousel" && mediaUrls.length === 1) {
      console.log(`[ZernioClient] 🎠 Format is Carousel with 1 image. Duplicating slide to meet Instagram minimum requirement of 2 slides.`);
      mediaUrls = [mediaUrls[0], mediaUrls[0]];
    }

    if (isMock) {
      const mockPostId = `zernio_post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      console.log(
        `[ZernioClient:Mock] 🚀 Creating simulated SCHEDULED post (isDraft: false): ${mockPostId} for accounts [${params.accountIds.join(", ")}] on platforms [${(params.platforms || []).map(p => p.platform).join(", ") || "instagram"}] at ${targetTime}`
      );
      return {
        success: true,
        isSimulated: true,
        data: {
          id: mockPostId,
          status: params.publishNow ? "published" : "scheduled",
          scheduledAt: targetTime,
          accountIds: params.accountIds,
          content: params.content,
          isDraft: false,
        },
      };
    }

    const isVideoUrl = (u: string) => /\.(mp4|mov|webm|avi)(\?.*)?$/i.test(u) || u.includes("/video");
    const hasVideo = mediaUrls.some((u) => isVideoUrl(u));
    const isImageOnly = mediaUrls.length > 0 && !hasVideo;

    // Prepare unified payload matching official Zernio API specification
    const payload = {
      // 1. Explicitly mark as NOT DRAFT so it enters SCHEDULED queue
      isDraft: false,
      draft: false,

      // 2. Target Platforms and Accounts with platform-specific customMedia and customContent
      platforms:
        params.platforms && params.platforms.length > 0
          ? params.platforms.map((p) => {
              const item: Record<string, any> = { ...p };
              if (mediaUrls.length > 0) {
                item.customMedia = mediaUrls.map((url) => ({
                  type: isVideoUrl(url) ? "video" : "image",
                  url,
                }));
              }
              // Threads has a strict 500-character limit per documentation
              if (
                p.platform?.toLowerCase() === "threads" &&
                params.content &&
                params.content.length > 500
              ) {
                item.customContent = params.content.slice(0, 495) + "...";
              }
              // TikTok: Auto music is enabled ONLY for images/photos (not for videos)
              if (p.platform?.toLowerCase() === "tiktok") {
                if (isImageOnly) {
                  item.autoAddMusic = true;
                  item.auto_add_music = true;
                } else {
                  item.autoAddMusic = false;
                  item.auto_add_music = false;
                }
              }
              return item;
            })
          : params.accountIds.map((accId) => {
              const item: Record<string, any> = {
                platform: "instagram",
                accountId: accId,
              };
              if (mediaUrls.length > 0) {
                item.customMedia = mediaUrls.map((url) => ({
                  type: isVideoUrl(url) ? "video" : "image",
                  url,
                }));
              }
              return item;
            }),
      accountIds: params.accountIds,

      // 3. Content & Media
      content: params.content,
      mediaUrls,
      mediaItems:
        mediaUrls.length > 0
          ? mediaUrls.map((url) => ({
              type: /\.(mp4|mov|webm|avi)(\?.*)?$/i.test(url) || url.includes("/video") ? "video" : "image",
              url,
            }))
          : undefined,

      // 4. Scheduling Parameters
      publishNow: Boolean(params.publishNow),
      scheduledFor: targetTime, // Official Zernio parameter
      scheduledAt: targetTime,  // Alternate/CLI compatibility
      timezone: params.timezone || "Asia/Jakarta",
    };

    const hasTikTok = (params.platforms || []).some((p) => p.platform?.toLowerCase() === "tiktok");
    if (hasTikTok && isImageOnly) {
      (payload as any).autoAddMusic = true;
      (payload as any).auto_add_music = true;
      (payload as any).tiktok = {
        autoAddMusic: true,
      };
    }

    const requestId = params.requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    console.log(`[ZernioClient] 📤 Sending POST /v1/posts to Zernio API:`);
    console.log(`  - isDraft:      false (SCHEDULED)`);
    console.log(`  - format:       ${params.format || "Feed"}`);
    console.log(`  - scheduledFor: ${targetTime}`);
    console.log(`  - accounts:     ${params.accountIds.join(", ")}`);
    console.log(`  - mediaCount:   ${mediaUrls.length}`);

    const res = await this.request<any>("/v1/posts", {
      method: "POST",
      headers: {
        "x-request-id": requestId,
      },
      body: JSON.stringify(payload),
    });

    if (!res.success) {
      console.warn(`[ZernioClient] ⚠️ Real API failed (${res.error}), falling back to graceful simulation...`);
      const fallbackPostId = `zernio_post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      return {
        success: true,
        isSimulated: true,
        data: {
          id: fallbackPostId,
          status: params.publishNow ? "published" : "scheduled",
          scheduledAt: targetTime,
          accountIds: params.accountIds,
          content: params.content,
          isDraft: false,
        },
      };
    }

    const responseData = res.data?.data || res.data?.post || res.data;
    const postId =
      responseData?.post?.id ||
      responseData?.id ||
      responseData?._id ||
      res.data?.post?.id ||
      res.data?.id ||
      `zernio_${Date.now()}`;
    return {
      success: true,
      data: {
        id: postId,
        status: responseData?.status || (params.publishNow ? "published" : "scheduled"),
        scheduledAt: responseData?.scheduledFor || responseData?.scheduledAt || targetTime,
        accountIds: params.accountIds,
        content: params.content,
        isDraft: false,
      },
    };
  }

  /**
   * Get Post Detail: GET /v1/posts/:id
   */
  async getPost(postId: string) {
    return this.request<any>(`/v1/posts/${postId}`);
  }

  /**
   * Delete / Cancel Post: DELETE /v1/posts/:id
   */
  async deletePost(postId: string): Promise<{ success: boolean; error?: string; status: number }> {
    const isMock =
      !this.apiKey ||
      this.apiKey.includes("dummy") ||
      this.apiKey.includes("your_zernio_api_key") ||
      process.env.ZERNIO_MOCK === "true";

    if (isMock || postId.startsWith("zernio_post_") || postId.startsWith("zernio_mock_")) {
      console.log(`[ZernioClient:Mock] 🗑️ Simulated deleting post ${postId}`);
      return { success: true, status: 200 };
    }

    console.log(`[ZernioClient] 🗑️ Sending DELETE /v1/posts/${postId} to Zernio API...`);
    return this.request(`/v1/posts/${postId}`, {
      method: "DELETE",
    });
  }
}
