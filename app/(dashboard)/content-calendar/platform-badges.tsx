"use client";

import React from "react";
import type { ContentPlanItem } from "@/lib/ai/planner";

export interface ConnectedSocialAccountItem {
  id?: string;
  provider: string;
  username: string;
  status?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BRAND SVG ICONS
// ─────────────────────────────────────────────────────────────────────────────

export function InstagramIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

export function ThreadsIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 192 192" fill="currentColor">
      <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.745C75.2536 44.745 57.6534 59.8804 53.6499 82.2608C49.6464 104.641 60.3344 126.969 80.127 137.545C97.8099 146.992 119.985 144.137 134.428 130.485L120.73 117.078C110.849 126.417 95.8078 128.261 83.7431 121.815C70.2526 114.608 62.9734 99.3789 65.7011 84.126C68.4288 68.8732 80.4288 58.5583 95.3995 58.5583C95.4764 58.5583 95.554 58.5583 95.631 58.5587C112.592 58.6669 122.846 69.4586 123.87 88.3582C106.942 86.8837 89.3776 90.7937 77.0395 101.444C60.9161 115.361 58.5135 137.525 71.6661 150.963C84.8188 164.402 107.013 162.597 122.384 148.067C130.82 140.092 136.009 129.475 138.358 117.848C148.966 123.864 159.208 127.351 168.971 128.243C174.636 128.761 180.207 128.283 185.642 126.814L182.115 113.805C178.411 114.806 174.613 115.132 170.757 114.779C162.616 114.035 153.844 110.741 144.532 104.935C144.757 99.5108 143.754 94.1843 141.537 88.9883ZM114.341 135.539C102.871 146.381 86.2925 147.728 76.4719 137.695C66.6513 127.661 68.4452 111.112 80.4839 100.72C89.7042 92.7601 103.266 89.6587 116.326 90.6725C115.827 106.331 113.252 122.253 114.341 135.539Z" />
    </svg>
  );
}

export function TikTokIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

export function LinkedInIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

const PLATFORM_ORDER = ["instagram", "threads", "tiktok", "linkedin", "facebook", "twitter", "youtube"];

/**
 * Resolves which social media platforms this post is targeted to publish on Zernio.
 * Prioritizes actual Zernio dispatch records, then falls back to active workspace connected accounts.
 */
export function getPostTargetPlatforms(
  post: ContentPlanItem,
  connectedAccounts: ConnectedSocialAccountItem[] = []
): string[] {
  // 1. If post has already been dispatched/scheduled to Zernio, read recorded dispatch meta
  if (post.zernio_dispatch_meta && Array.isArray(post.zernio_dispatch_meta) && post.zernio_dispatch_meta.length > 0) {
    const metaPlatforms = new Set<string>();
    for (const item of post.zernio_dispatch_meta) {
      if (item.status === "SCHEDULED" || !item.status) {
        if (Array.isArray(item.platforms) && item.platforms.length > 0) {
          item.platforms.forEach((p: string) => metaPlatforms.add(p.toLowerCase()));
        }
      }
    }
    if (metaPlatforms.size > 0) {
      return Array.from(metaPlatforms).sort(
        (a, b) => PLATFORM_ORDER.indexOf(a) - PLATFORM_ORDER.indexOf(b)
      );
    }
  }

  // 2. Read explicitly from post.platform (comma-separated or single)
  // e.g. "instagram", "instagram, threads", "instagram, threads, tiktok"
  if (post.platform && typeof post.platform === "string") {
    const cleaned = post.platform
      .split(",")
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);

    if (cleaned.length > 0 && !cleaned.includes("all")) {
      return Array.from(new Set(cleaned)).sort(
        (a, b) => PLATFORM_ORDER.indexOf(a) - PLATFORM_ORDER.indexOf(b)
      );
    }
  }

  // 3. Fallback: only if post.platform is completely empty or "all", use active connected accounts
  if (connectedAccounts && connectedAccounts.length > 0) {
    const activePlatforms = new Set<string>();
    connectedAccounts.forEach((acc) => {
      if (acc.provider && acc.status !== "disconnected") {
        activePlatforms.add(acc.provider.toLowerCase());
      }
    });
    if (activePlatforms.size > 0) {
      return Array.from(activePlatforms).sort(
        (a, b) => PLATFORM_ORDER.indexOf(a) - PLATFORM_ORDER.indexOf(b)
      );
    }
  }

  return ["instagram"];
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MINI BADGE COMPONENT (For Calendar Cards & Tables)
// ─────────────────────────────────────────────────────────────────────────────

export interface PlatformMiniBadgeProps {
  platform: string;
  size?: "xs" | "sm" | "md";
  showTooltip?: boolean;
  activeUsername?: string;
}

export function PlatformMiniBadge({
  platform,
  size = "xs",
  showTooltip = true,
  activeUsername,
}: PlatformMiniBadgeProps) {
  const p = platform.toLowerCase();

  let name = "Instagram";
  let badgeStyle = "bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-2xs";
  let icon = <InstagramIcon className={size === "xs" ? "w-2.5 h-2.5" : size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />;

  if (p.includes("thread")) {
    name = "Threads";
    badgeStyle = "bg-black dark:bg-zinc-900 text-white border border-black/20 dark:border-white/20";
    icon = <ThreadsIcon className={size === "xs" ? "w-2.5 h-2.5" : size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />;
  } else if (p.includes("tiktok")) {
    name = "TikTok";
    badgeStyle = "bg-[#010101] text-white border border-cyan-500/40 ring-1 ring-cyan-500/20";
    icon = <TikTokIcon className={size === "xs" ? "w-2.5 h-2.5" : size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />;
  } else if (p.includes("linkedin")) {
    name = "LinkedIn";
    badgeStyle = "bg-[#0A66C2] text-white shadow-2xs";
    icon = <LinkedInIcon className={size === "xs" ? "w-2.5 h-2.5" : size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />;
  }

  const dimension =
    size === "xs"
      ? "w-4 h-4 rounded-full"
      : size === "sm"
      ? "w-5 h-5 rounded-md"
      : "w-6 h-6 rounded-lg";

  const tooltipText = activeUsername
    ? `Zernio Post: ${name} (@${activeUsername})`
    : `Zernio Post: ${name}`;

  return (
    <div
      title={showTooltip ? tooltipText : undefined}
      className={`inline-flex items-center justify-center shrink-0 ${dimension} ${badgeStyle} transition-transform hover:scale-115 cursor-pointer`}
    >
      {icon}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3.5 STATUS CHECK HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if the post has already been sent / scheduled to Zernio.
 * Only returns true for SCHEDULED, PUBLISHING, or PUBLISHED.
 */
export function isPostDispatchedToZernio(status?: string): boolean {
  const s = (status || "").toUpperCase();
  return s === "SCHEDULED" || s === "PUBLISHING" || s === "PUBLISHED";
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PLATFORMS BADGE ROW FOR CALENDAR CARD
// ─────────────────────────────────────────────────────────────────────────────

export function CalendarCardPlatformRow({
  platforms,
  status,
}: {
  platforms: string[];
  status?: string;
}) {
  // Hanya tampil ketika sudah dikirim ke Zernio atau statusnya SCHEDULED / PUBLISHING / PUBLISHED
  if (!isPostDispatchedToZernio(status)) {
    return null;
  }

  const isSent = status === "PUBLISHED" || status === "SCHEDULED" || status === "PUBLISHING";
  const actionLabel = isSent ? "Terjadwal ke" : "Zernio";

  return (
    <div
      className="mt-1.5 pt-1 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-1"
      title={`${actionLabel}: ${platforms.map((p) => p.toUpperCase()).join(", ")}`}
    >
      <div className="flex items-center -space-x-1 hover:space-x-1 transition-all">
        {platforms.map((plat) => (
          <PlatformMiniBadge key={plat} platform={plat} size="xs" />
        ))}
      </div>
      <span className="text-[9px] font-bold text-on-surface-variant/80 tracking-tight shrink-0">
        {platforms.length === 1
          ? platforms[0] === "instagram" ? "IG Only" : platforms[0].toUpperCase()
          : `${platforms.length} Sosmed`}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DETAIL MODAL PLATFORMS OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

export function ModalZernioDispatchTargets({
  platforms,
  connectedAccounts = [],
  format,
}: {
  platforms: string[];
  connectedAccounts: ConnectedSocialAccountItem[];
  format?: string;
}) {
  const isImageFormat = format !== "Reels" && format !== "Story";

  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-surface-container-low via-surface-container-lowest to-surface-container-low border border-outline-variant/30 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
            </svg>
          </div>
          <div>
            <span className="font-bold text-on-surface text-xs block leading-tight">
              Platform Tujuan Publikasi Zernio
            </span>
            <span className="text-[10px] text-on-surface-variant leading-tight">
              {platforms.length === 1
                ? `Konten khusus dikirimkan ke 1 platform: ${platforms[0].toUpperCase()}`
                : `Konten akan dikirimkan ke ${platforms.length} platform: ${platforms.map((p) => p.toUpperCase()).join(", ")}`}
            </span>
          </div>
        </div>

        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
          ✓ {platforms.length} Saluran Terpilih
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
        {/* Instagram */}
        {platforms.includes("instagram") && (
          <div className="p-2.5 rounded-xl border border-pink-200 bg-pink-50/40 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <InstagramIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-pink-950">Instagram</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[10px] text-pink-800/80 truncate">
                {connectedAccounts.find((a) => a.provider === "instagram")?.username
                  ? `@${connectedAccounts.find((a) => a.provider === "instagram")?.username}`
                  : "Feed & Carousel"}
              </p>
            </div>
          </div>
        )}

        {/* Threads */}
        {platforms.includes("threads") && (
          <div className="p-2.5 rounded-xl border border-black/15 bg-black/5 dark:bg-white/5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-black dark:bg-zinc-800 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <ThreadsIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-on-surface">Threads</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[10px] text-on-surface-variant truncate">
                {connectedAccounts.find((a) => a.provider === "threads")?.username
                  ? `@${connectedAccounts.find((a) => a.provider === "threads")?.username} (≤500 char)`
                  : "Caption Khusus ≤500 char"}
              </p>
            </div>
          </div>
        )}

        {/* TikTok */}
        {platforms.includes("tiktok") && (
          <div className="p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-50/40 dark:bg-cyan-950/20 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-[#010101] text-white flex items-center justify-center shrink-0 ring-1 ring-cyan-500/40 shadow-2xs">
              <TikTokIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-cyan-950 dark:text-cyan-200">TikTok</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[10px] text-cyan-800 dark:text-cyan-400 truncate">
                {isImageFormat ? "Auto Music Aktif 🎵" : "Video Reels / Shorts"}
              </p>
            </div>
          </div>
        )}

        {/* LinkedIn */}
        {platforms.includes("linkedin") && (
          <div className="p-2.5 rounded-xl border border-[#0A66C2]/30 bg-blue-50/40 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-[#0A66C2] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <LinkedInIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-blue-950">LinkedIn</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[10px] text-blue-800/80 truncate">
                {connectedAccounts.find((a) => a.provider === "linkedin")?.username
                  ? `${connectedAccounts.find((a) => a.provider === "linkedin")?.username}`
                  : "Company / Network"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
