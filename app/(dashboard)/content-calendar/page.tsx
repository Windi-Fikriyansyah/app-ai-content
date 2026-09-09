import React from "react";
import Link from "next/link";

export default function ContentCalendarPage() {
  return (
    <div className="space-y-space-xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-outline font-label-sm text-xs mb-1">
            <Link href="/" className="hover:text-primary transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-on-surface font-semibold">Content Calendar</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
            Content Calendar
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Jadwal postingan otomatis omni-channel dan kalender produksi AI mingguan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-outline-variant/50 bg-surface-container-lowest hover:bg-surface text-on-surface font-label-md text-sm shadow-xs">
            <span className="material-symbols-outlined text-base" data-icon="filter_list">
              filter_list
            </span>
            <span>Filter Channel</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg font-label-md text-sm shadow-sm transition-all">
            <span className="material-symbols-outlined text-base" data-icon="add">
              add
            </span>
            <span>Jadwalkan Konten</span>
          </button>
        </div>
      </div>

      {/* Calendar Notice Card */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-space-md">
          <div className="w-10 h-10 rounded-lg bg-secondary-container text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-xl" data-icon="calendar_month">
              calendar_month
            </span>
          </div>
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              14 Konten Terjadwal Minggu Ini
            </h3>
            <p className="font-body-sm text-body-sm text-outline">
              Semua konten di bawah ini dikelola dan dipublikasikan otomatis oleh AI Agent.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-label-sm text-xs font-semibold border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Auto-Publisher Sinkron
        </span>
      </div>

      {/* Grid of Calendar Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-sm hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 font-label-sm text-xs font-semibold">
              Instagram
            </span>
            <span className="font-code-sm text-xs text-outline">Senin, 09:00</span>
          </div>
          <h4 className="font-headline-sm text-base font-bold text-on-surface mt-3">
            Tips Optimasi Lead AI untuk Startup
          </h4>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-2">
            Carousel 5 slide mengupas tuntas blueprint automasi content operations skala tim kecil.
          </p>
          <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs">
            <span className="text-tertiary font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm" data-icon="check_circle">
                check_circle
              </span>
              Siap Tayang
            </span>
            <span className="text-outline">Agent Copywriter</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-sm hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 font-label-sm text-xs font-semibold">
              LinkedIn
            </span>
            <span className="font-code-sm text-xs text-outline">Selasa, 11:30</span>
          </div>
          <h4 className="font-headline-sm text-base font-bold text-on-surface mt-3">
            Studi Kasus 4x Output Konten
          </h4>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-2">
            Artikel thought leadership mendalam membahas transisi tim marketing tradisional ke agentic pipeline.
          </p>
          <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs">
            <span className="text-tertiary font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm" data-icon="check_circle">
                check_circle
              </span>
              Siap Tayang
            </span>
            <span className="text-outline">ExecutiveGhost v3.1</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-sm hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-900 font-label-sm text-xs font-semibold">
              TikTok / Reels
            </span>
            <span className="font-code-sm text-xs text-outline">Rabu, 18:00</span>
          </div>
          <h4 className="font-headline-sm text-base font-bold text-on-surface mt-3">
            Hook 3 Detik: Formula Video Viral B2B
          </h4>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-2">
            Script video vertikal pendek 45 detik dengan transisi visual dinamis dan teks berjalan.
          </p>
          <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs">
            <span className="text-amber-700 font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm" data-icon="pending">
                pending
              </span>
              Review Tone
            </span>
            <span className="text-outline">ScriptGen v1.8</span>
          </div>
        </div>
      </div>
    </div>
  );
}
