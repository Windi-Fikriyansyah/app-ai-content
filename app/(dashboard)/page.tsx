import React from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";
import {
  Sparkles,
  Calendar,
  Layers,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Clock,
  Send,
  FileEdit,
  ChevronRight,
  Bot,
  PlusCircle,
  ExternalLink,
} from "lucide-react";
import { getDashboardDataAction } from "./dashboard-actions";

export default async function DashboardPage() {
  const data = await getDashboardDataAction();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return (
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-mono font-bold flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-600" />
            <span>SCHEDULED</span>
          </span>
        );
      case "PUBLISHED":
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-mono font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>PUBLISHED</span>
          </span>
        );
      case "READY FOR APPROVAL":
      case "REVIEW":
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-mono font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>READY</span>
          </span>
        );
      case "GENERATING":
        return (
          <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-mono font-bold animate-pulse flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
            <span>GENERATING</span>
          </span>
        );
      case "PLANNED":
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-mono font-bold">
            PLANNED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* ═════════════════════════════════════════════════════════════
          HEADER: Greeting & AI Status
          "Good morning, Dapur Bu Ani 👋"
          "Your AI is managing your content."
          ═════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-3xl bg-surface-container-lowest border border-outline-variant/30 p-6 sm:p-8 shadow-xs">
        {/* Soft atmospheric gradient accents */}
        <div className="absolute -right-16 -top-16 w-72 h-72 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-60 h-60 bg-secondary-container/40 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs mb-3 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>AI Content Engine Active</span>
            </div>

            <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              {data.greetingTime}, {data.businessName} 👋
            </h1>

            <p className="font-body-md text-base sm:text-lg text-outline mt-1 font-medium">
              Your AI is managing your content.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/ai-agent/content-generation"
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-98"
            >
              <Sparkles className="w-4 h-4" />
              <span>Buat Rencana 30 Hari</span>
            </Link>

            <Link
              href="/content-calendar"
              className="px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface hover:bg-surface-container text-on-surface font-bold text-xs sm:text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Calendar className="w-4 h-4 text-outline" />
              <span>Buka Kalender</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════
          STATISTICS CARDS (4 GRID)
          ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
          │ 30     │ │ 12     │ │ 8      │ │ 7.3%   │
          │ Plans  │ │ Queued │ │Published│ │ Engage │
          └────────┘ └────────┘ └────────┘ └────────┘
          ═════════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Plans */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-outline">Plans</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-headline-lg text-2xl sm:text-4xl font-extrabold text-on-surface tracking-tight">
              {data.stats.totalPlans}
            </div>
            <p className="text-[11px] text-outline mt-0.5">Total postingan direncanakan</p>
          </div>
        </div>

        {/* Card 2: Queued */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-outline">Queued</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-headline-lg text-2xl sm:text-4xl font-extrabold text-blue-600 tracking-tight">
              {data.stats.queuedCount}
            </div>
            <p className="text-[11px] text-outline mt-0.5">Siap & terjadwal di antrean</p>
          </div>
        </div>

        {/* Card 3: Published */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-outline">Published</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-headline-lg text-2xl sm:text-4xl font-extrabold text-emerald-600 tracking-tight">
              {data.stats.publishedCount}
            </div>
            <p className="text-[11px] text-outline mt-0.5">Berhasil terbit di Instagram</p>
          </div>
        </div>

        {/* Card 4: Engage */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-outline">Engage</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-headline-lg text-2xl sm:text-4xl font-extrabold text-amber-600 tracking-tight">
              {data.stats.engagementRate}
            </div>
            <p className="text-[11px] text-outline mt-0.5">Rata-rata interaksi audiens</p>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════
          UPCOMING CONTENT LIST & PIPELINE
          Sep 11  Tips memilih nasi box       SCHEDULED
          Sep 13  Behind the scenes            PLANNED
          Sep 16  Tips catering                PLANNED
          ═════════════════════════════════════════════════════════════ */}
      <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-outline-variant/20">
          <div>
            <h2 className="font-headline-sm text-lg sm:text-xl font-extrabold text-on-surface">
              Upcoming Content
            </h2>
            <p className="text-xs sm:text-sm text-outline mt-0.5">
              Jadwal postingan terdekat yang akan dibuat dan dipublikasikan otomatis oleh AI
            </p>
          </div>

          <Link
            href="/content-calendar"
            className="text-primary hover:underline font-bold text-xs sm:text-sm flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>Lihat Semua Jadwal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Content Rows */}
        <div className="divide-y divide-outline-variant/20 mt-2">
          {data.upcomingPosts.length > 0 ? (
            data.upcomingPosts.map((post) => (
              <div
                key={post.id}
                className="py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface/50 px-2 rounded-xl transition-colors group"
              >
                {/* Date & Title */}
                <div className="flex items-start sm:items-center gap-3.5 sm:gap-5 flex-1 min-w-0">
                  {/* Date Column: "Sep 11" */}
                  <div className="w-14 sm:w-16 shrink-0 text-left">
                    <span className="block font-bold text-on-surface text-sm sm:text-base font-mono leading-tight">
                      {post.monthStr} {post.dayStr}
                    </span>
                    <span className="block text-[11px] text-outline font-mono">
                      {post.scheduled_time || "19:00"} WIB
                    </span>
                  </div>

                  {/* Title & Format Tag */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-on-surface text-xs sm:text-sm truncate group-hover:text-primary transition-colors">
                        {post.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-outline font-medium truncate">
                        Topik: {post.topic}
                      </span>
                      <span className="text-outline/40">·</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-md bg-surface-container font-semibold text-outline">
                        {post.format}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Column */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pl-16 sm:pl-0">
                  {getStatusBadge(post.status)}

                  <Link
                    href="/content-calendar"
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-surface-container text-outline hover:text-primary cursor-pointer hidden sm:block"
                    title="Buka detail di kalender"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-surface-container text-outline flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <p className="font-bold text-sm text-on-surface">Belum ada konten terjadwal</p>
              <p className="text-xs text-outline max-w-sm mx-auto">
                Buat perencanaan 30 hari pertama Anda dengan satu klik menggunakan AI Agent.
              </p>
              <Link
                href="/ai-agent/content-generation"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs shadow-xs hover:bg-primary-container"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Rencanakan Konten Sekarang</span>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════
          QUICK ACTION SHORTCUTS (Bottom Banner)
          ═════════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <Link
          href="/ai-agent/content-generation"
          className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/50 transition-all flex items-center gap-3.5 group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-xs sm:text-sm text-on-surface group-hover:text-primary transition-colors truncate">
              AI Content Planner
            </h4>
            <p className="text-[11px] text-outline truncate">Generate ide kalender 30 hari</p>
          </div>
          <ChevronRight className="w-4 h-4 text-outline group-hover:text-primary transition-colors shrink-0" />
        </Link>

        <Link
          href="/content-library"
          className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/50 transition-all flex items-center gap-3.5 group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-xs sm:text-sm text-on-surface group-hover:text-primary transition-colors truncate">
              Content Library
            </h4>
            <p className="text-[11px] text-outline truncate">Semua aset caption & visual</p>
          </div>
          <ChevronRight className="w-4 h-4 text-outline group-hover:text-primary transition-colors shrink-0" />
        </Link>

        <Link
          href="/social-accounts"
          className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/50 transition-all flex items-center gap-3.5 group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <Send className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-xs sm:text-sm text-on-surface group-hover:text-primary transition-colors truncate">
              Zernio Publishing
            </h4>
            <p className="text-[11px] text-outline truncate">Koneksi akun Instagram</p>
          </div>
          <ChevronRight className="w-4 h-4 text-outline group-hover:text-primary transition-colors shrink-0" />
        </Link>
      </section>
    </div>
  );
}
