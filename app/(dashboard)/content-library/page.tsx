"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Rocket,
  Clock,
  FolderOpen,
  Calendar,
  RefreshCw,
  BookOpen,
  ClipboardCheck,
  Search,
  Loader2,
  FolderX,
  ImageIcon,
  Check,
  Copy,
  X,
  RotateCw,
} from "lucide-react";
import { getContentLibraryData, ContentLibraryItem } from "./actions";
import { republishPostToZernioAction } from "../content-calendar/lazy-actions";

type FilterTab = "all" | "published" | "scheduled" | "approval" | "drafts";

export default function ContentLibraryPage() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<ContentLibraryItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    scheduled: 0,
    readyForApproval: 0,
    drafts: 0,
  });
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<string>("All");
  const [activePost, setActivePost] = useState<ContentLibraryItem | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRepublishing, setIsRepublishing] = useState(false);
  const [republishMsg, setRepublishMsg] = useState<string | null>(null);

  const handleRepublish = async (postId: string) => {
    setIsRepublishing(true);
    setRepublishMsg("🔄 Menghapus post lama di Zernio dan menjadwalkan ulang...");
    try {
      const res = await republishPostToZernioAction(postId);
      if (res.success) {
        setRepublishMsg("✓ Berhasil dijadwalkan ulang ke Zernio!");
        await loadData();
        if (activePost) {
          setActivePost((prev) => (prev ? { ...prev, status: "SCHEDULED" } : null));
        }
      } else {
        setRepublishMsg(res.error || "Gagal menjadwalkan ulang.");
      }
    } catch (err: any) {
      setRepublishMsg(err.message || "Gagal menjadwalkan ulang.");
    } finally {
      setIsRepublishing(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getContentLibraryData();
      if (res.success) {
        setPosts(res.posts);
        setStats(res.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter posts based on active tab, search query, and format
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      // Tab filter
      if (activeTab === "published" && post.status !== "PUBLISHED") return false;
      if (activeTab === "scheduled" && post.status !== "SCHEDULED" && post.status !== "PUBLISHING") return false;
      if (activeTab === "approval" && post.status !== "READY FOR APPROVAL" && post.status !== "REVIEW") return false;
      if (activeTab === "drafts" && !["PLANNED", "DRAFT", "GENERATING", "NEEDS_REVISION"].includes(post.status)) return false;

      // Format filter
      if (selectedFormat !== "All" && post.format.toLowerCase() !== selectedFormat.toLowerCase()) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = post.title.toLowerCase().includes(q);
        const matchTopic = post.topic.toLowerCase().includes(q);
        const matchCaption = (post.caption || "").toLowerCase().includes(q);
        const matchPillar = post.pillar.toLowerCase().includes(q);
        if (!matchTitle && !matchTopic && !matchCaption && !matchPillar) return false;
      }

      return true;
    });
  }, [posts, activeTab, selectedFormat, searchQuery]);

  const handleCopyCaption = (post: ContentLibraryItem) => {
    const hashtagsStr = Array.isArray(post.hashtags) && post.hashtags.length > 0
      ? `\n\n${post.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`
      : "";
    const text = `${post.caption || post.title}${hashtagsStr}`;
    navigator.clipboard.writeText(text);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white shadow-xs">
            <BadgeCheck className="w-3 h-3" />
            <span>PUBLISHED</span>
          </span>
        );
      case "PUBLISHING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-600 text-white animate-pulse shadow-xs">
            <Rocket className="w-3 h-3" />
            <span>PUBLISHING</span>
          </span>
        );
      case "SCHEDULED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white shadow-xs">
            <Clock className="w-3 h-3" />
            <span>SCHEDULED</span>
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <span>APPROVED</span>
          </span>
        );
      case "READY FOR APPROVAL":
      case "REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span>READY ✓</span>
          </span>
        );
      case "NEEDS_REVISION":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <span>REVISI ⚠️</span>
          </span>
        );
      case "GENERATING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
            <span>GENERATING...</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-secondary-container text-primary border border-primary/20">
            <span>{status || "PLANNED"}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-2xl font-bold text-on-surface tracking-tight flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary" />
            <span>Content Library</span>
          </h1>
          <p className="font-body-md text-sm text-outline mt-0.5">
            Arsip seluruh postingan, aset visual, status jadwal Zernio, dan riwayat publikasi Instagram.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/content-calendar"
            className="px-3.5 py-2 rounded-xl border border-outline-variant/30 hover:bg-surface text-on-surface font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-primary" />
            <span>Buka Kalender</span>
          </Link>
          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-xl border border-outline-variant/30 hover:bg-surface text-outline hover:text-on-surface transition-colors cursor-pointer"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xs">
          <div className="flex items-center justify-between text-outline text-xs font-semibold">
            <span>Total Konten</span>
            <BookOpen className="w-4 h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-headline text-on-surface mt-1">{stats.total}</p>
          <span className="text-[10px] sm:text-[11px] text-outline">Seluruh rencana & aset</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
            <span>✓ Telah Terbit</span>
            <BadgeCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-headline text-emerald-950 mt-1">{stats.published}</p>
          <span className="text-[10px] sm:text-[11px] text-emerald-800/90">Published di Instagram</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-blue-800 text-xs font-semibold">
            <span>🕒 Terjadwal</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-headline text-blue-950 mt-1">{stats.scheduled}</p>
          <span className="text-[10px] sm:text-[11px] text-blue-800/90">Scheduled via Zernio</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
            <span>Siap Persetujuan</span>
            <ClipboardCheck className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-headline text-amber-950 mt-1">{stats.readyForApproval}</p>
          <span className="text-[10px] sm:text-[11px] text-amber-800/90">Menunggu Review User</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface-container-lowest p-2 rounded-2xl border border-outline-variant/30 shadow-2xs">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "Semua", count: stats.total },
            { id: "published", label: "✓ Published", count: stats.published },
            { id: "scheduled", label: "🕒 Scheduled", count: stats.scheduled },
            { id: "approval", label: "Siap Approve", count: stats.readyForApproval },
            { id: "drafts", label: "Draft / Lainnya", count: stats.drafts },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as FilterTab)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-outline hover:text-on-surface hover:bg-surface-container"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id ? "bg-white/25 text-white" : "bg-surface-container-high text-outline"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Format Selector */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-56">
            <Search className="w-4 h-4 text-outline absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari topik atau judul..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface border border-outline-variant/30 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-surface border border-outline-variant/30 text-xs font-semibold text-on-surface focus:outline-none cursor-pointer"
          >
            <option value="All">Semua Format</option>
            <option value="Feed">Feed</option>
            <option value="Carousel">Carousel</option>
            <option value="Reels">Reels</option>
          </select>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-outline gap-2 bg-surface-container-lowest rounded-3xl border border-outline-variant/30">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs font-semibold">Memuat aset Content Library...</span>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center text-center bg-surface-container-lowest rounded-3xl border border-dashed border-outline-variant/40 space-y-2">
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-outline">
            <FolderX className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-on-surface text-sm">Tidak ada konten ditemukan</h3>
          <p className="text-xs text-outline max-w-sm">
            {searchQuery
              ? `Tidak ada postingan yang sesuai dengan kata kunci "${searchQuery}".`
              : "Belum ada postingan pada kategori ini. Silakan buat rencana konten baru di Content Generation."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => setActivePost(post)}
              className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-2xs hover:shadow-md transition-all flex flex-col overflow-hidden group cursor-pointer"
            >
              {/* Card Image Preview Banner */}
              <div className="relative aspect-video w-full bg-slate-900 overflow-hidden flex items-center justify-center">
                {post.media_url ? (
                  <img
                    src={post.media_url}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 gap-1 p-4 text-center">
                    <ImageIcon className="w-7 h-7" />
                    <span className="text-[10px] font-mono">Visual Generated via Lazy Gen</span>
                  </div>
                )}

                {/* Status Badge floating on image */}
                <div className="absolute top-2.5 left-2.5">{getStatusBadge(post.status)}</div>

                {/* Format Tag */}
                <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                  {post.format}
                </div>
              </div>

              {/* Card Content Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-outline font-mono">
                    <span className="truncate max-w-[150px]">{post.pillar}</span>
                    <span>
                      {post.scheduled_date} · {post.scheduled_time}
                    </span>
                  </div>

                  <h3 className="font-headline font-bold text-sm text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>

                  <p className="text-xs text-outline line-clamp-3 leading-relaxed">
                    {post.caption || post.hook || post.topic}
                  </p>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-outline font-mono">
                    {post.zernio_post_id ? (
                      <span className="text-blue-600 font-bold">Zernio: {post.zernio_post_id.slice(-8)}</span>
                    ) : (
                      <span>Instagram Ready</span>
                    )}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyCaption(post);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-outline-variant/30 hover:bg-surface text-[11px] font-semibold text-on-surface transition-colors flex items-center gap-1 cursor-pointer"
                      title="Salin caption ke clipboard"
                    >
                      {copiedId === post.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === post.id ? "Tersalin!" : "Copy"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePost(post);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-[11px] font-bold text-primary transition-colors cursor-pointer"
                    >
                      Detail →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {activePost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-2xl w-full rounded-3xl border border-outline-variant/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-outline-variant/20 flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  {getStatusBadge(activePost.status)}
                  <span className="px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 font-bold text-[10px] border border-pink-200">
                    Instagram · {activePost.format}
                  </span>
                  <span className="text-xs text-outline font-mono">
                    {activePost.scheduled_date} {activePost.scheduled_time} WIB
                  </span>
                </div>
                <h3 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface">
                  {activePost.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setActivePost(null)}
                className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* Publishing & Zernio Status Alert */}
              {activePost.status === "PUBLISHED" ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center gap-2.5">
                  <BadgeCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-900">Konten Telah Terbit di Instagram!</p>
                    <p className="text-[11px] text-emerald-800/90 mt-0.5">
                      Diterbitkan via Zernio Publishing Infrastructure.
                      {activePost.published_at && ` Waktu publikasi: ${new Date(activePost.published_at).toLocaleString("id-ID")}`}
                    </p>
                  </div>
                </div>
              ) : activePost.status === "SCHEDULED" ? (
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-bold text-blue-900">Terjadwal di Zernio</p>
                    <p className="text-[11px] text-blue-800/90 mt-0.5">
                      Konten akan otomatis di-publish ke Instagram pada {activePost.scheduled_date} {activePost.scheduled_time} WIB.
                      {activePost.zernio_post_id && <span className="block font-mono text-[10px] mt-0.5">Zernio ID: {activePost.zernio_post_id}</span>}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Visual Media (Single or Multi-slide Carousel) */}
              {activePost.media_url || (activePost.carousel_slides && activePost.carousel_slides.length > 0) ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-outline uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <span>Visual Instagram</span>
                      {activePost.format?.toLowerCase() === "carousel" ? (
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-mono text-[10px] font-bold border border-purple-200">
                          Carousel · {activePost.carousel_slides?.length || activePost.media_urls?.length || 1} Slides
                        </span>
                      ) : (
                        <span className="text-primary font-normal lowercase">1024x1024</span>
                      )}
                    </label>
                  </div>

                  {activePost.format?.toLowerCase() === "carousel" &&
                  ((activePost.carousel_slides && activePost.carousel_slides.length > 0) ||
                    (activePost.media_urls && activePost.media_urls.length > 1)) ? (
                    (() => {
                      const slides =
                        activePost.carousel_slides && activePost.carousel_slides.length > 0
                          ? activePost.carousel_slides.map((s, idx) => ({
                              slide: s.slide || idx + 1,
                              imageUrl: s.imageUrl,
                              title: s.title || `Slide ${idx + 1}`,
                            }))
                          : (activePost.media_urls || [activePost.media_url!]).map((url, idx) => ({
                              slide: idx + 1,
                              imageUrl: url,
                              title: `Slide ${idx + 1}`,
                            }));

                      const currentIndex = Math.min(activeSlideIndex, slides.length - 1);
                      const currentSlide = slides[currentIndex] || slides[0];

                      return (
                        <div className="space-y-2">
                          <div className="relative rounded-2xl overflow-hidden border border-outline-variant/30 bg-black/5 aspect-square max-h-72 w-full flex items-center justify-center group">
                            <img
                              src={currentSlide.imageUrl}
                              alt={currentSlide.title || `Slide ${currentIndex + 1}`}
                              className="w-full h-full object-cover transition-all duration-300"
                            />

                            {/* Slide Counter Overlay */}
                            <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono font-bold shadow-md">
                              Slide {currentIndex + 1} / {slides.length}
                            </div>

                            {/* Prev Button */}
                            {slides.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setActiveSlideIndex((prev) => (prev > 0 ? prev - 1 : slides.length - 1))}
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white text-on-surface shadow-md flex items-center justify-center cursor-pointer transition-all opacity-80 hover:opacity-100 text-sm font-bold"
                              >
                                ‹
                              </button>
                            )}

                            {/* Next Button */}
                            {slides.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setActiveSlideIndex((prev) => (prev < slides.length - 1 ? prev + 1 : 0))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white text-on-surface shadow-md flex items-center justify-center cursor-pointer transition-all opacity-80 hover:opacity-100 text-sm font-bold"
                              >
                                ›
                              </button>
                            )}
                          </div>

                          {/* Thumbnails */}
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                            {slides.map((s, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setActiveSlideIndex(idx)}
                                className={`relative shrink-0 w-11 h-11 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                                  idx === currentIndex
                                    ? "border-primary ring-2 ring-primary/30 scale-105"
                                    : "border-outline-variant/30 opacity-70 hover:opacity-100"
                                }`}
                              >
                                <img src={s.imageUrl} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                                <span className="absolute bottom-0 right-0 px-1 rounded-tl-md bg-black/70 text-[9px] font-mono text-white font-bold">
                                  {idx + 1}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="rounded-2xl overflow-hidden border border-outline-variant/30 bg-black/5 aspect-square max-h-72 w-full flex items-center justify-center">
                      <img src={activePost.media_url!} alt={activePost.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              ) : null}

              {/* Caption */}
              {activePost.caption && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-outline uppercase tracking-wider text-[10px]">
                      Caption Instagram
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCopyCaption(activePost)}
                      className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === activePost.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === activePost.id ? "Tersalin!" : "Salin Caption"}</span>
                    </button>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-surface border border-outline-variant/20 text-on-surface whitespace-pre-wrap leading-relaxed text-xs max-h-52 overflow-y-auto font-body">
                    {activePost.caption}
                  </div>
                </div>
              )}

              {/* Hashtags */}
              {activePost.hashtags && activePost.hashtags.length > 0 && (
                <div className="space-y-1">
                  <label className="font-bold text-outline uppercase tracking-wider text-[10px]">Hashtags</label>
                  <div className="flex flex-wrap gap-1.5">
                    {activePost.hashtags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-surface-container text-primary font-mono text-[10px]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-outline-variant/20 bg-surface flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-outline block">
                  Pilar: <strong>{activePost.pillar}</strong> ({activePost.content_type})
                </span>
                {republishMsg && (
                  <span className={`text-[11px] font-semibold mt-0.5 block ${republishMsg.startsWith("✓") ? "text-emerald-600" : "text-blue-600"}`}>
                    {republishMsg}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 justify-end">
                {(activePost.status === "SCHEDULED" || activePost.status === "PUBLISHED" || Boolean(activePost.zernio_post_id)) && (
                  <button
                    type="button"
                    onClick={() => handleRepublish(activePost.id)}
                    disabled={isRepublishing}
                    className="px-3.5 py-2 rounded-xl border border-outline-variant/30 hover:bg-surface-container text-on-surface font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Hapus jadwal/post lama di Zernio dan kirim ulang dengan data terbaru"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRepublishing ? "animate-spin" : ""}`} />
                    <span>{isRepublishing ? "Menjadwalkan Ulang..." : "Publish Ulang"}</span>
                  </button>
                )}

                <Link
                  href="/content-calendar"
                  className="px-3.5 py-2 rounded-xl border border-outline-variant/30 hover:bg-surface-container text-primary font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Buka di Kalender</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setActivePost(null);
                    setRepublishMsg(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold text-xs hover:bg-primary-container transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
