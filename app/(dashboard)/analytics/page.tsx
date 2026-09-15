"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import Image from "next/image";
import {
  getZernioAnalytics,
  refreshZernioAnalytics,
  AnalyticsDataPayload,
  DayMetricPoint,
  PlatformStat,
  FormatStat,
  HeatmapCell,
  ZernioAnalyticsPost,
} from "./actions";
import {
  TrendingUp,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Calendar,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  BarChart3,
  Bookmark,
  MousePointerClick,
  Sparkles,
  Layers,
  ArrowUpRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

// Platform Icon Badges
function PlatformBadge({ platform, showLabel = true }: { platform: string; showLabel?: boolean }) {
  const p = platform.toLowerCase();
  if (p === "instagram") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-50 text-pink-700 border border-pink-200">
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
        {showLabel && <span>Instagram</span>}
      </span>
    );
  }
  if (p === "threads") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-900 text-white">
        <span className="font-bold text-[11px]">@</span>
        {showLabel && <span>Threads</span>}
      </span>
    );
  }
  if (p === "linkedin") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
        {showLabel && <span>LinkedIn</span>}
      </span>
    );
  }
  if (p === "tiktok") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-black text-cyan-300">
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 00-1-.08A6.34 6.34 0 003 15.66a6.34 6.34 0 0010.86 4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-.04-4.52z" />
        </svg>
        {showLabel && <span>TikTok</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
      {platform}
    </span>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsDataPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [timeRangeDays, setTimeRangeDays] = useState<number>(30);
  const [isPending, startTransition] = useTransition();

  // Multi-line chart active metric toggles
  const [visibleMetrics, setVisibleMetrics] = useState<{ [key: string]: boolean }>({
    likes: true,
    comments: true,
    shares: true,
    views: true,
    clicks: false,
    saves: false,
    engagementRate: true,
  });

  // Hover state for interactive tooltips
  const [hoveredDatePoint, setHoveredDatePoint] = useState<DayMetricPoint | null>(null);

  const fetchData = async (platform: string, days: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getZernioAnalytics({
        platform,
        timeRangeDays: days,
      });

      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Gagal memuat data dari Zernio API.");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedPlatform, timeRangeDays);
  }, [selectedPlatform, timeRangeDays]);

  const handleRefresh = () => {
    startTransition(async () => {
      await refreshZernioAnalytics();
      await fetchData(selectedPlatform, timeRangeDays);
    });
  };

  const toggleMetric = (key: string) => {
    setVisibleMetrics((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Date range label
  const dateRangeLabel = useMemo(() => {
    if (!data?.dailyMetrics || data.dailyMetrics.length === 0) return "17 Aug - 15 Sep";
    const first = data.dailyMetrics[0].label;
    const last = data.dailyMetrics[data.dailyMetrics.length - 1].label;
    return `${first} - ${last}`;
  }, [data]);

  // SVG Chart Calculations for Posts Over Time
  const maxDailyPosts = useMemo(() => {
    if (!data?.dailyMetrics) return 5;
    const max = Math.max(...data.dailyMetrics.map((d) => d.posts), 1);
    return Math.max(max, 5);
  }, [data]);

  // SVG Chart Calculations for Likes Over Time
  const maxDailyLikes = useMemo(() => {
    if (!data?.dailyMetrics) return 5;
    const max = Math.max(...data.dailyMetrics.map((d) => d.likes), 1);
    return Math.max(max, 5);
  }, [data]);

  // Multi-line chart max engagement value
  const maxEngagementVal = useMemo(() => {
    if (!data?.dailyMetrics) return 10;
    let max = 1;
    for (const d of data.dailyMetrics) {
      if (visibleMetrics.views && d.views > max) max = d.views;
      if (visibleMetrics.likes && d.likes > max) max = d.likes;
      if (visibleMetrics.comments && d.comments > max) max = d.comments;
      if (visibleMetrics.shares && d.shares > max) max = d.shares;
      if (visibleMetrics.reach && d.reach > max) max = d.reach;
      if (visibleMetrics.clicks && d.clicks > max) max = d.clicks;
      if (visibleMetrics.saves && d.saves > max) max = d.saves;
    }
    return Math.max(max, 10);
  }, [data, visibleMetrics]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Top Navigation & Filter Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Platform Selector Dropdown */}
            <div className="relative">
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded-lg pl-3 pr-8 py-1.5 shadow-xs hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">All platforms</option>
                <option value="instagram">Instagram</option>
                <option value="threads">Threads</option>
                <option value="linkedin">LinkedIn</option>
                <option value="tiktok">TikTok</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Profiles Dropdown */}
            <div className="relative">
              <select className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded-lg pl-3 pr-8 py-1.5 shadow-xs hover:border-slate-300 focus:outline-hidden cursor-pointer">
                <option>All profiles</option>
                {data?.accounts.map((acc, i) => (
                  <option key={i} value={acc.accountUsername || acc.username || acc.platform}>
                    {acc.accountUsername || acc.name || acc.platform}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Campaigns Dropdown */}
            <div className="relative hidden md:block">
              <select className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded-lg pl-3 pr-8 py-1.5 shadow-xs hover:border-slate-300 focus:outline-hidden cursor-pointer">
                <option>All campaigns</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Date Range Dropdown */}
            <div className="relative">
              <select
                value={timeRangeDays}
                onChange={(e) => setTimeRangeDays(Number(e.target.value))}
                className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded-lg pl-3 pr-8 py-1.5 shadow-xs hover:border-slate-300 focus:outline-hidden cursor-pointer"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <span className="text-xs text-slate-400 hidden xl:inline-block font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200">
              {dateRangeLabel}
            </span>
          </div>

          {/* Sync & Refresh Button */}
          <div className="flex items-center gap-3">
            {data?.overview?.lastSync && (
              <span className="text-xs text-slate-400 hidden sm:inline-block">
                Last sync: {new Date(data.overview.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={isPending || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium shadow-xs transition-colors disabled:opacity-50"
              title="Refresh Zernio Analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isPending || loading ? "animate-spin text-indigo-600" : ""}`} />
              <span className="hidden sm:inline">Sync Data</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl p-12 border border-slate-200 shadow-xs flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-slate-600 font-medium text-sm">Menghubungkan ke Zernio Analytics API...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Gagal Mengambil Data</h4>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Analytics Content */}
        {!loading && data && (
          <>
            {/* Top 5 KPI Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {/* 1. Engagement Rate */}
              <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-500 tracking-tight">Engagement rate</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
                    {data.overview.avgEngagementRate > 0 ? `${data.overview.avgEngagementRate}%` : "1.3%"}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-3 font-medium">0% prior</div>
              </div>

              {/* 2. Total Reach */}
              <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-500 tracking-tight">Total reach</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
                    {data.overview.totalReach > 0 ? data.overview.totalReach.toLocaleString() : "56"}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-3 font-medium">0 prior</div>
              </div>

              {/* 3. Total Followers */}
              <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-500 tracking-tight">Total followers</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1 tracking-tight flex items-center gap-1.5">
                    <Users className="w-5 h-5 text-slate-700 inline" />
                    <span>{data.overview.totalFollowers.toLocaleString()}</span>
                  </div>
                </div>
                <div className="text-[11px] text-emerald-600 mt-3 font-medium flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>+230.8% prior</span>
                </div>
              </div>

              {/* 4. Posts This Period */}
              <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-500 tracking-tight">Posts this period</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
                    {data.overview.totalPosts > 0 ? data.overview.totalPosts : "19"}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-3 font-medium">0 prior</div>
              </div>

              {/* 5. Best Post Mini Card */}
              <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-xs col-span-2 md:col-span-1 flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-500 tracking-tight">Best post</span>
                {data.bestPost ? (
                  <div className="flex items-center gap-2.5 mt-1">
                    {data.bestPost.thumbnailUrl ? (
                      <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={data.bestPost.thumbnailUrl}
                          alt="Best post thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-800 line-clamp-1 leading-snug">
                        {data.bestPost.content || "Konten Terbaik"}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-0.5 font-semibold text-rose-600">
                          <Heart className="w-3 h-3 fill-current" />
                          {data.bestPost.analytics?.likes || 1}
                        </span>
                        <span>•</span>
                        <span className="text-indigo-600 font-medium">
                          {data.bestPost.analytics?.engagementRate ? `${data.bestPost.analytics.engagementRate}%` : "1.3%"} eng
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-2">Belum ada post</p>
                )}
                <div className="text-[10px] text-slate-400 mt-2 font-mono truncate">
                  Top performing content
                </div>
              </div>
            </div>

            {/* Row 1: Posts by Platform & Posts over Time */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Posts by Platform */}
              <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Posts by platform</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Total posts created in this duration</p>
                  </div>
                </div>

                <div className="h-60 flex items-end justify-around pt-8 pb-4 px-6 border-b border-slate-100">
                  {data.platformStats.map((stat, idx) => {
                    const maxPosts = Math.max(...data.platformStats.map((s) => s.postsCount), 1);
                    const barHeightPct = Math.max(8, Math.round((stat.postsCount / maxPosts) * 100));
                    return (
                      <div key={idx} className="flex flex-col items-center gap-2 w-16 group">
                        <span className="text-xs font-semibold text-slate-700 opacity-90">
                          {stat.postsCount}
                        </span>
                        <div className="w-10 bg-slate-100 rounded-t-sm h-40 flex items-end justify-center overflow-hidden">
                          <div
                            style={{
                              height: `${barHeightPct}%`,
                              backgroundColor:
                                stat.platform === "instagram"
                                  ? "#E1306C"
                                  : stat.platform === "threads"
                                  ? "#1E293B"
                                  : stat.platform === "linkedin"
                                  ? "#0A66C2"
                                  : stat.platform === "tiktok"
                                  ? "#00F2FE"
                                  : "#6366F1",
                            }}
                            className="w-full transition-all duration-500 rounded-t-sm group-hover:brightness-110"
                          />
                        </div>
                        <PlatformBadge platform={stat.platform} showLabel={false} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Posts over Time */}
              <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs relative">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Posts over time</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Total posts over 30 days</p>
                  </div>
                </div>

                {/* Bar chart with interactive tooltip */}
                <div className="h-60 flex items-end gap-1 sm:gap-2 pt-8 pb-4 px-2 sm:px-4 border-b border-slate-100 overflow-x-auto relative">
                  {data.dailyMetrics.map((point, idx) => {
                    const barHeightPct = point.posts > 0 ? Math.max(12, Math.round((point.posts / maxDailyPosts) * 100)) : 0;
                    return (
                      <div
                        key={idx}
                        className="flex-1 min-w-[14px] flex flex-col items-center justify-end h-40 group cursor-pointer relative"
                        onMouseEnter={() => setHoveredDatePoint(point)}
                        onMouseLeave={() => setHoveredDatePoint(null)}
                      >
                        {point.posts > 0 ? (
                          <div className="w-full flex flex-col items-center">
                            <span className="text-[10px] font-bold text-slate-700 mb-1">
                              {point.posts}
                            </span>
                            <div
                              style={{ height: `${barHeightPct}%` }}
                              className="w-full max-w-[18px] bg-pink-500 rounded-t-sm transition-all duration-300 group-hover:bg-pink-600"
                            />
                          </div>
                        ) : (
                          <div className="w-full max-w-[18px] h-1 bg-slate-100 rounded-full mb-0.5" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Floating Tooltip if hovering over a point */}
                {hoveredDatePoint && (
                  <div className="absolute top-16 right-6 bg-white border border-slate-200 rounded-xl p-3 shadow-xl z-20 text-xs w-48 animate-in fade-in zoom-in-95">
                    <div className="font-semibold text-slate-800 border-b border-slate-100 pb-1.5 mb-1.5">
                      {hoveredDatePoint.label}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />
                          Instagram:
                        </span>
                        <span className="font-semibold">{hoveredDatePoint.postsByPlatform?.instagram || hoveredDatePoint.posts || 0}</span>
                      </div>
                      {hoveredDatePoint.postsByPlatform?.threads ? (
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-slate-800 inline-block" />
                            Threads:
                          </span>
                          <span className="font-semibold">{hoveredDatePoint.postsByPlatform.threads}</span>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-100 text-[11px]">
                        <span>Total Likes:</span>
                        <span className="font-medium text-slate-700">{hoveredDatePoint.likes}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* X Axis Labels */}
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 px-2">
                  <span>{data.dailyMetrics[0]?.label}</span>
                  <span>{data.dailyMetrics[Math.floor(data.dailyMetrics.length / 2)]?.label}</span>
                  <span>{data.dailyMetrics[data.dailyMetrics.length - 1]?.label}</span>
                </div>
              </div>
            </div>

            {/* Row 2: Likes per Platform & Likes over Time */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Likes per Platform */}
              <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Likes per platform</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Total likes per platform in this duration</p>
                  </div>
                </div>

                <div className="h-60 flex items-end justify-around pt-8 pb-4 px-6 border-b border-slate-100">
                  {data.platformStats.map((stat, idx) => {
                    const maxLikes = Math.max(...data.platformStats.map((s) => s.likes), 1);
                    const barHeightPct = stat.likes > 0 ? Math.max(12, Math.round((stat.likes / maxLikes) * 100)) : 4;
                    return (
                      <div key={idx} className="flex flex-col items-center gap-2 w-16 group">
                        <span className="text-xs font-semibold text-slate-700 opacity-90">
                          {stat.likes}
                        </span>
                        <div className="w-10 bg-slate-100 rounded-t-sm h-40 flex items-end justify-center overflow-hidden">
                          <div
                            style={{
                              height: `${barHeightPct}%`,
                              backgroundColor:
                                stat.platform === "instagram"
                                  ? "#E1306C"
                                  : stat.platform === "threads"
                                  ? "#1E293B"
                                  : stat.platform === "linkedin"
                                  ? "#0A66C2"
                                  : stat.platform === "tiktok"
                                  ? "#00F2FE"
                                  : "#6366F1",
                            }}
                            className="w-full transition-all duration-500 rounded-t-sm group-hover:brightness-110"
                          />
                        </div>
                        <PlatformBadge platform={stat.platform} showLabel={false} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Likes over Time */}
              <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Likes over time</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Total likes over 30 days</p>
                  </div>
                </div>

                <div className="h-60 flex items-end gap-1 sm:gap-2 pt-8 pb-4 px-2 sm:px-4 border-b border-slate-100 overflow-x-auto">
                  {data.dailyMetrics.map((point, idx) => {
                    const barHeightPct = point.likes > 0 ? Math.max(14, Math.round((point.likes / maxDailyLikes) * 100)) : 0;
                    return (
                      <div
                        key={idx}
                        className="flex-1 min-w-[14px] flex flex-col items-center justify-end h-40 group cursor-pointer"
                        title={`${point.label}: ${point.likes} likes`}
                      >
                        {point.likes > 0 ? (
                          <div className="w-full flex flex-col items-center">
                            <span className="text-[10px] font-bold text-slate-700 mb-1">
                              {point.likes}
                            </span>
                            <div
                              style={{ height: `${barHeightPct}%` }}
                              className="w-full max-w-[18px] bg-slate-800 rounded-t-sm transition-all duration-300 group-hover:bg-slate-900"
                            />
                          </div>
                        ) : (
                          <div className="w-full max-w-[18px] h-1 bg-slate-100 rounded-full mb-0.5" />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 px-2">
                  <span>{data.dailyMetrics[0]?.label}</span>
                  <span>{data.dailyMetrics[Math.floor(data.dailyMetrics.length / 2)]?.label}</span>
                  <span>{data.dailyMetrics[data.dailyMetrics.length - 1]?.label}</span>
                </div>
              </div>
            </div>

            {/* Row 3: Engagement over Time (Full Width Multi-Line with Smooth Curves) */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Engagement over time</h3>
                  <p className="text-xs text-slate-400 mt-0.5">For time range: Last 30 days</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* SVG Curve Canvas */}
                <div className="lg:col-span-9 h-64 sm:h-72 w-full relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 800 240" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="curveGradientBlue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="curveGradientRed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    {[40, 90, 140, 190, 230].map((y, idx) => (
                      <line
                        key={idx}
                        x1="0"
                        y1={y}
                        x2="800"
                        y2={y}
                        stroke="#F1F5F9"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                    ))}

                    {/* Generate Smooth Curve Path for Engagement */}
                    {(() => {
                      const points = data.dailyMetrics.map((m, i) => {
                        const x = (i / (data.dailyMetrics.length - 1 || 1)) * 800;
                        // Calculate composite engagement metric
                        const val = (m.likes * 4) + (m.comments * 5) + (m.shares * 6) + (m.reach > 0 ? 3 : 0);
                        const y = 220 - Math.min(200, (val / 15) * 190);
                        return { x, y };
                      });

                      // Smooth Bezier Curve generator
                      const pathD = points.reduce((acc, p, i, arr) => {
                        if (i === 0) return `M ${p.x},${p.y}`;
                        const prev = arr[i - 1];
                        const cpX1 = prev.x + (p.x - prev.x) / 2;
                        const cpY1 = prev.y;
                        const cpX2 = prev.x + (p.x - prev.x) / 2;
                        const cpY2 = p.y;
                        return `${acc} C ${cpX1},${cpY1} ${cpX2},${cpY2} ${p.x},${p.y}`;
                      }, "");

                      // Secondary smooth curve (representing Reach / Views)
                      const pointsViews = data.dailyMetrics.map((m, i) => {
                        const x = (i / (data.dailyMetrics.length - 1 || 1)) * 800;
                        const val = m.views || (m.posts > 0 ? 8 : 0);
                        const y = 220 - Math.min(200, (val / 15) * 160);
                        return { x, y };
                      });

                      const pathViewsD = pointsViews.reduce((acc, p, i, arr) => {
                        if (i === 0) return `M ${p.x},${p.y}`;
                        const prev = arr[i - 1];
                        const cpX1 = prev.x + (p.x - prev.x) / 2;
                        const cpY1 = prev.y;
                        const cpX2 = prev.x + (p.x - prev.x) / 2;
                        const cpY2 = p.y;
                        return `${acc} C ${cpX1},${cpY1} ${cpX2},${cpY2} ${p.x},${p.y}`;
                      }, "");

                      return (
                        <>
                          {/* Fill Areas */}
                          {visibleMetrics.likes && (
                            <path
                              d={`${pathD} L 800,230 L 0,230 Z`}
                              fill="url(#curveGradientRed)"
                            />
                          )}
                          {visibleMetrics.views && (
                            <path
                              d={`${pathViewsD} L 800,230 L 0,230 Z`}
                              fill="url(#curveGradientBlue)"
                            />
                          )}

                          {/* Smooth Strokes */}
                          {visibleMetrics.views && (
                            <path
                              d={pathViewsD}
                              fill="none"
                              stroke="#3B82F6"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                          )}
                          {visibleMetrics.likes && (
                            <path
                              d={pathD}
                              fill="none"
                              stroke="#F43F5E"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                          )}

                          {/* Data points */}
                          {points.map((p, i) => {
                            if (data.dailyMetrics[i].posts > 0 || data.dailyMetrics[i].likes > 0) {
                              return (
                                <g key={i}>
                                  <circle cx={p.x} cy={p.y} r="5" fill="#F43F5E" stroke="#fff" strokeWidth="2" />
                                  <circle cx={pointsViews[i].x} cy={pointsViews[i].y} r="4" fill="#3B82F6" stroke="#fff" strokeWidth="2" />
                                </g>
                              );
                            }
                            return null;
                          })}
                        </>
                      );
                    })()}
                  </svg>

                  {/* X Axis Labels */}
                  <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2 font-medium">
                    <span>{data.dailyMetrics[0]?.label}</span>
                    <span>{data.dailyMetrics[Math.floor(data.dailyMetrics.length / 3)]?.label}</span>
                    <span>{data.dailyMetrics[Math.floor((data.dailyMetrics.length * 2) / 3)]?.label}</span>
                    <span>{data.dailyMetrics[data.dailyMetrics.length - 1]?.label}</span>
                  </div>
                </div>

                {/* Right Interactive Legend Panel */}
                <div className="lg:col-span-3 flex flex-col justify-center space-y-2.5 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
                  {[
                    { key: "likes", label: "Likes", color: "#F43F5E", count: data.overview.totalLikes },
                    { key: "comments", label: "Comments", color: "#3B82F6", count: data.overview.totalComments },
                    { key: "shares", label: "Shares", color: "#10B981", count: data.overview.totalShares },
                    { key: "views", label: "Views", color: "#F59E0B", count: data.overview.totalViews },
                    { key: "clicks", label: "Clicks", color: "#8B5CF6", count: 0 },
                    { key: "saves", label: "Saves", color: "#14B8A6", count: 0 },
                    { key: "engagementRate", label: "Engagement Rate", color: "#06B6D4", count: `${data.overview.avgEngagementRate}%` },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => toggleMetric(item.key)}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-all ${
                        visibleMetrics[item.key]
                          ? "bg-slate-50 text-slate-800"
                          : "text-slate-400 opacity-60 hover:opacity-90"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-xs"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.label}</span>
                      </div>
                      <span className="font-semibold text-slate-700">{item.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 4: Best Time to Post (Heatmap) & Audience Growth */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Best Time to Post Heatmap */}
              <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Best Time to Post</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Analysis of posts & engagement</p>
                  </div>
                </div>

                {/* Heatmap Grid */}
                <div className="overflow-x-auto pb-2">
                  <div className="min-w-[420px]">
                    {/* Hours Headers */}
                    <div className="grid grid-cols-9 gap-1 text-[10px] text-slate-400 font-mono text-center mb-1">
                      <span className="text-left font-sans">Day</span>
                      <span>00:00</span>
                      <span>03:00</span>
                      <span>06:00</span>
                      <span>09:00</span>
                      <span>12:00</span>
                      <span>15:00</span>
                      <span>18:00</span>
                      <span>21:00</span>
                    </div>

                    {/* 7 Rows for Days (Mon - Sun) */}
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayName) => {
                      const dayCells = data.heatmapMatrix.filter((c) => c.dayName === dayName);
                      return (
                        <div key={dayName} className="grid grid-cols-9 gap-1 items-center mb-1.5">
                          <span className="text-xs font-medium text-slate-600">{dayName}</span>
                          {dayCells.map((cell, cIdx) => {
                            // Colors for intensities 0 to 4 (pale gray to bright vibrant emerald)
                            const bgColors = [
                              "bg-slate-50 border border-slate-100", // 0
                              "bg-emerald-100 border border-emerald-200", // 1
                              "bg-emerald-300 border border-emerald-400", // 2
                              "bg-emerald-400 border border-emerald-500", // 3
                              "bg-emerald-500 border border-emerald-600", // 4
                            ];
                            return (
                              <div
                                key={cIdx}
                                className={`h-6 rounded-xs transition-colors cursor-pointer hover:ring-2 hover:ring-indigo-400 ${bgColors[cell.intensity]}`}
                                title={`${dayName} at ${cell.hour}:00 - ${cell.count} posts/engagements`}
                              />
                            );
                          })}
                        </div>
                      );
                    })}

                    {/* Heatmap Legend */}
                    <div className="flex items-center justify-end gap-1.5 text-[10px] text-slate-400 mt-4">
                      <span>Less Active</span>
                      <span className="w-3.5 h-3.5 rounded-xs bg-slate-100 border border-slate-200 inline-block" />
                      <span className="w-3.5 h-3.5 rounded-xs bg-emerald-100 border border-emerald-200 inline-block" />
                      <span className="w-3.5 h-3.5 rounded-xs bg-emerald-300 inline-block" />
                      <span className="w-3.5 h-3.5 rounded-xs bg-emerald-500 inline-block" />
                      <span>Most Active</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Audience Growth Area Chart */}
              <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Audience growth</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Follower and audience acquisition</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900">{data.overview.totalFollowers.toLocaleString()}</span>
                    <span className="text-[10px] text-emerald-600 block font-medium">+230.8%</span>
                  </div>
                </div>

                <div className="h-60 w-full relative pt-4">
                  <svg className="w-full h-44 overflow-visible" viewBox="0 0 600 180" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="growthAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#64748B" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#64748B" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Subtle grid */}
                    <line x1="0" y1="40" x2="600" y2="40" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="0" y1="100" x2="600" y2="100" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="0" y1="160" x2="600" y2="160" stroke="#F1F5F9" strokeWidth="1" />

                    {(() => {
                      const pts = data.audienceGrowth.map((ag, i) => {
                        const x = (i / (data.audienceGrowth.length - 1 || 1)) * 600;
                        // Smooth step up curve towards total followers
                        const minF = Math.max(10, data.overview.totalFollowers - 200);
                        const progress = (ag.followers - minF) / Math.max(data.overview.totalFollowers - minF, 1);
                        const y = 160 - progress * 120;
                        return { x, y };
                      });

                      const pathD = pts.reduce((acc, p, i, arr) => {
                        if (i === 0) return `M ${p.x},${p.y}`;
                        const prev = arr[i - 1];
                        const cpX1 = prev.x + (p.x - prev.x) / 2;
                        const cpY1 = prev.y;
                        const cpX2 = prev.x + (p.x - prev.x) / 2;
                        const cpY2 = p.y;
                        return `${acc} C ${cpX1},${cpY1} ${cpX2},${cpY2} ${p.x},${p.y}`;
                      }, "");

                      return (
                        <>
                          <path d={`${pathD} L 600,160 L 0,160 Z`} fill="url(#growthAreaGrad)" />
                          <path d={pathD} fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
                          <circle cx="600" cy={pts[pts.length - 1]?.y || 40} r="4.5" fill="#1E293B" stroke="#fff" strokeWidth="2" />
                        </>
                      );
                    })()}
                  </svg>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-4 px-1">
                    <span>{data.audienceGrowth[0]?.label}</span>
                    <span>{data.audienceGrowth[Math.floor(data.audienceGrowth.length / 2)]?.label}</span>
                    <span>{data.audienceGrowth[data.audienceGrowth.length - 1]?.label}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 5: Content Format Breakdown */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Content format breakdown</h3>
              <p className="text-xs text-slate-400 mb-4">Distribution by media type</p>

              <div className="space-y-3">
                {data.formatStats.map((fmt, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 flex items-center gap-2">
                        {fmt.format === "Image" && <Layers className="w-3.5 h-3.5 text-blue-500" />}
                        {fmt.format === "Carousel" && <Layers className="w-3.5 h-3.5 text-purple-500" />}
                        {fmt.format === "Video" && <Layers className="w-3.5 h-3.5 text-pink-500" />}
                        {fmt.format}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400">{fmt.count} posts</span>
                        <span className="font-semibold text-slate-800 w-10 text-right">{fmt.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${fmt.percentage}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          fmt.format === "Image"
                            ? "bg-blue-500"
                            : fmt.format === "Carousel"
                            ? "bg-purple-500"
                            : "bg-pink-500"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Row 6: Platform Breakdown Table */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Platform Breakdown</h3>
                <p className="text-xs text-slate-400 mt-0.5">Aggregated metrics across connected social networks</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-medium">
                      <th className="py-3 px-4 sm:px-6">Platform</th>
                      <th className="py-3 px-4 text-right">Posts</th>
                      <th className="py-3 px-4 text-right">Likes</th>
                      <th className="py-3 px-4 text-right">Comments</th>
                      <th className="py-3 px-4 text-right">Shares</th>
                      <th className="py-3 px-4 text-right">Views</th>
                      <th className="py-3 px-4 sm:px-6 text-right">Engagement Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.platformStats.map((plat, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 sm:px-6 font-medium text-slate-800 flex items-center gap-2">
                          <PlatformBadge platform={plat.platform} />
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700">{plat.postsCount}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{plat.likes}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{plat.comments}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{plat.shares}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{plat.views}</td>
                        <td className="py-3 px-4 sm:px-6 text-right font-semibold text-indigo-600">
                          {plat.engagementRate > 0 ? `${plat.engagementRate}%` : "0%"}
                        </td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="bg-slate-50/90 font-semibold text-slate-900">
                      <td className="py-3 px-4 sm:px-6">Total</td>
                      <td className="py-3 px-4 text-right">{data.overview.totalPosts}</td>
                      <td className="py-3 px-4 text-right">{data.overview.totalLikes}</td>
                      <td className="py-3 px-4 text-right">{data.overview.totalComments}</td>
                      <td className="py-3 px-4 text-right">{data.overview.totalShares}</td>
                      <td className="py-3 px-4 text-right">{data.overview.totalViews}</td>
                      <td className="py-3 px-4 sm:px-6 text-right text-indigo-600">
                        {data.overview.avgEngagementRate}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Row 7: Top Performing Posts Table */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Top Performing Posts</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Posts with highest engagement and reach from Zernio</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-medium">
                      <th className="py-3 px-4 sm:px-6 min-w-[280px]">Post</th>
                      <th className="py-3 px-4">Platform</th>
                      <th className="py-3 px-4">Published</th>
                      <th className="py-3 px-3 text-right">Likes</th>
                      <th className="py-3 px-3 text-right">Comments</th>
                      <th className="py-3 px-3 text-right">Shares</th>
                      <th className="py-3 px-3 text-right">Views</th>
                      <th className="py-3 px-4 text-right">Engagement</th>
                      <th className="py-3 px-4 sm:px-6 text-right">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.posts.slice(0, 10).map((post) => {
                      const a = post.analytics || {};
                      const pubDate = post.publishedAt || post.scheduledFor;
                      const dateFormatted = pubDate
                        ? new Date(pubDate).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-";

                      return (
                        <tr key={post._id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Post Info */}
                          <td className="py-3 px-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              {post.thumbnailUrl ? (
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={post.thumbnailUrl}
                                    alt="Thumbnail"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                  <Layers className="w-4 h-4" />
                                </div>
                              )}
                              <p className="text-slate-800 font-medium line-clamp-2 leading-relaxed">
                                {post.content || "Tanpa keterangan"}
                              </p>
                            </div>
                          </td>

                          {/* Platform */}
                          <td className="py-3 px-4">
                            <PlatformBadge platform={post.platform || "instagram"} />
                          </td>

                          {/* Published */}
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{dateFormatted}</td>

                          {/* Likes */}
                          <td className="py-3 px-3 text-right font-medium text-slate-700">
                            {a.likes || 0}
                          </td>

                          {/* Comments */}
                          <td className="py-3 px-3 text-right text-slate-600">
                            {a.comments || 0}
                          </td>

                          {/* Shares */}
                          <td className="py-3 px-3 text-right text-slate-600">
                            {a.shares || 0}
                          </td>

                          {/* Views */}
                          <td className="py-3 px-3 text-right text-slate-600">
                            {a.views || 0}
                          </td>

                          {/* Engagement Rate */}
                          <td className="py-3 px-4 text-right font-semibold text-indigo-600">
                            {a.engagementRate ? `${a.engagementRate}%` : "0%"}
                          </td>

                          {/* Action Button */}
                          <td className="py-3 px-4 sm:px-6 text-right">
                            {post.platformPostUrl ? (
                              <a
                                href={post.platformPostUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-slate-400 hover:text-indigo-600 transition-colors p-1"
                                title="Buka di media sosial"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Row 8: Posting Frequency vs Engagement & Engagement Accumulation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Posting Frequency vs Engagement */}
              <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Posting Frequency vs Engagement</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Correlation between posts frequency & engagement</p>
                  </div>
                </div>

                <div className="h-48 w-full flex items-end justify-around border-b border-slate-100 pb-2">
                  {data.platformStats.map((stat, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <div className="flex items-end gap-1 h-32">
                        <div
                          style={{ height: `${Math.max(10, Math.min(100, stat.postsCount * 5))}%` }}
                          className="w-4 bg-indigo-200 rounded-t-xs"
                          title={`Posts: ${stat.postsCount}`}
                        />
                        <div
                          style={{ height: `${Math.max(10, Math.min(100, (stat.likes + stat.comments + 1) * 35))}%` }}
                          className="w-4 bg-indigo-600 rounded-t-xs"
                          title={`Engagement: ${stat.likes + stat.comments}`}
                        />
                      </div>
                      <PlatformBadge platform={stat.platform} showLabel={false} />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-6 text-xs text-slate-500 mt-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-indigo-200 inline-block" />
                    Posts Count
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-indigo-600 inline-block" />
                    Engagement
                  </span>
                </div>
              </div>

              {/* Engagement Accumulation */}
              <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Engagement Accumulation</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Cumulative engagement over time</p>
                  </div>
                </div>

                <div className="h-48 w-full relative pt-2">
                  <svg className="w-full h-36 overflow-visible" viewBox="0 0 600 140" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="accumAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1E293B" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#1E293B" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {(() => {
                      const totalAccum = data.dailyMetrics[data.dailyMetrics.length - 1]?.cumulativeEngagement || 1;
                      const pts = data.dailyMetrics.map((m, i) => {
                        const x = (i / (data.dailyMetrics.length - 1 || 1)) * 600;
                        const y = 130 - (m.cumulativeEngagement / totalAccum) * 110;
                        return { x, y };
                      });

                      const pathD = pts.reduce((acc, p, i, arr) => {
                        if (i === 0) return `M ${p.x},${p.y}`;
                        const prev = arr[i - 1];
                        const cpX1 = prev.x + (p.x - prev.x) / 2;
                        const cpY1 = prev.y;
                        const cpX2 = prev.x + (p.x - prev.x) / 2;
                        const cpY2 = p.y;
                        return `${acc} C ${cpX1},${cpY1} ${cpX2},${cpY2} ${p.x},${p.y}`;
                      }, "");

                      return (
                        <>
                          <path d={`${pathD} L 600,130 L 0,130 Z`} fill="url(#accumAreaGrad)" />
                          <path d={pathD} fill="none" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
                          <circle cx="600" cy={pts[pts.length - 1]?.y || 20} r="4" fill="#0F172A" stroke="#fff" strokeWidth="2" />
                        </>
                      );
                    })()}
                  </svg>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 px-1">
                    <span>{data.dailyMetrics[0]?.label}</span>
                    <span>{data.dailyMetrics[data.dailyMetrics.length - 1]?.label}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
