"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { get30DayPlanStatus } from "../ai-agent/content-generation/planner-actions";
import type { ContentPlanItem } from "@/lib/ai/planner";

const WEEKDAYS = [
  { short: "MON", id: "Senin" },
  { short: "TUE", id: "Selasa" },
  { short: "WED", id: "Rabu" },
  { short: "THU", id: "Kamis" },
  { short: "FRI", id: "Jumat" },
  { short: "SAT", id: "Sabtu" },
  { short: "SUN", id: "Minggu" },
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const PILLARS_LIST = [
  "All",
  "Educational",
  "Promotional",
  "Engagement",
  "Branding",
  "Tips",
  "Storytelling",
  "Social Proof",
];

export default function ContentCalendarPage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<ContentPlanItem[]>([]);
  const [selectedPillar, setSelectedPillar] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");

  // Calendar Month State (Defaults to current date, Sep 2026)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Modal Detail State for Lazy Generation Post Brief
  const [activePost, setActivePost] = useState<ContentPlanItem | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await get30DayPlanStatus();
        if (res.success && res.upcomingPlans) {
          setPlans(res.upcomingPlans);
        }
      } catch (e) {
        console.error("Error loading calendar plans:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredPlans = useMemo(() => {
    if (selectedPillar === "All") return plans;
    return plans.filter(
      (p) =>
        p.pillar?.toLowerCase() === selectedPillar.toLowerCase() ||
        p.content_type?.toLowerCase() === selectedPillar.toLowerCase()
    );
  }, [plans, selectedPillar]);

  // Map plans by ISO date string (YYYY-MM-DD)
  const plansByDate = useMemo(() => {
    const map = new Map<string, ContentPlanItem[]>();
    for (const p of filteredPlans) {
      const list = map.get(p.scheduledDate) || [];
      list.push(p);
      map.set(p.scheduledDate, list);
    }
    return map;
  }, [filteredPlans]);

  // Calendar grid calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Build grid matrix: Monday = 0, Sunday = 6
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday becomes 6

    const totalDaysInMonth = lastDayOfMonth.getDate();

    // Previous month filler days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const cells: Array<{
      date: Date;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = new Date().toISOString().split("T")[0];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const dStr = d.toISOString().split("T")[0];
      cells.push({
        date: d,
        dateStr: dStr,
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      // Format YYYY-MM-DD local
      const monthFormatted = String(month + 1).padStart(2, "0");
      const dayFormatted = String(d).padStart(2, "0");
      const dStr = `${year}-${monthFormatted}-${dayFormatted}`;
      cells.push({
        date: dateObj,
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
      });
    }

    // Next month filler days to complete 35 or 42 grid
    const remainingCells = (7 - (cells.length % 7)) % 7;
    for (let n = 1; n <= remainingCells; n++) {
      const d = new Date(year, month + 1, n);
      const dStr = d.toISOString().split("T")[0];
      cells.push({
        date: d,
        dateStr: dStr,
        dayNumber: n,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
      });
    }

    return cells;
  }, [year, month]);

  // Color helper based on content type
  const getTypeColor = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("edu")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (t.includes("promo")) return "bg-rose-50 text-rose-700 border-rose-200";
    if (t.includes("engag")) return "bg-amber-50 text-amber-700 border-amber-200";
    if (t.includes("brand")) return "bg-purple-50 text-purple-700 border-purple-200";
    if (t.includes("tip")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (t.includes("story")) return "bg-indigo-50 text-indigo-700 border-indigo-200";
    return "bg-teal-50 text-teal-700 border-teal-200";
  };

  const formatShortDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[m - 1]} ${d}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-space-xl pb-24 max-w-7xl mx-auto">
      {/* ═══════════════════════════════════════════════════════════════════
          PAGE HEADER
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-space-lg">
        <div>
          <div className="flex items-center gap-2 text-outline font-label-sm text-xs mb-1">
            <Link href="/" className="hover:text-primary transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-on-surface font-semibold">11. Content Calendar</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              Content Calendar
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
              Center Hub
            </span>
          </div>
          <p className="font-body-md text-sm text-on-surface-variant mt-1">
            Kalender terpadu sebagai pusat kendali jadwal posting konten AI 30 hari Anda.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center p-1 bg-surface-container rounded-xl border border-outline-variant/30">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-surface-container-lowest text-primary shadow-xs"
                  : "text-outline hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-base">calendar_view_month</span>
              <span>Month Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-surface-container-lowest text-primary shadow-xs"
                  : "text-outline hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-base">table_rows</span>
              <span>Table List</span>
            </button>
          </div>

          <Link
            href="/ai-agent/content-generation"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-primary-container hover:opacity-95 text-on-primary rounded-xl font-label-md text-xs sm:text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            <span>+ Generate 30-Day Plan</span>
          </Link>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CALENDAR STATUS & CONTROLS BANNER
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Month Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevMonth}
              className="w-9 h-9 rounded-xl border border-outline-variant/40 hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors cursor-pointer"
              title="Bulan Sebelumnya"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="w-9 h-9 rounded-xl border border-outline-variant/40 hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors cursor-pointer"
              title="Bulan Berikutnya"
            >
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>

          <h2 className="font-headline-sm text-xl font-bold text-on-surface tracking-tight">
            {MONTH_NAMES[month]} {year}
          </h2>

          <button
            type="button"
            onClick={goToToday}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-surface border border-outline-variant/40 hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* Status Indicator (PLANNED / Lazy Gen) */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-primary font-semibold border border-primary/20">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Status: <strong>PLANNED</strong></span>
          </div>
          <span className="text-outline text-[11px] hidden sm:inline">
            Belum ada image/caption final (Lazy Generation H-2)
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          PILLAR FILTER PILLS
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-outline font-semibold uppercase tracking-wider text-[10px] mr-1 shrink-0">
          Filter Pilar:
        </span>
        {PILLARS_LIST.map((pill) => {
          const isSelected = selectedPillar === pill;
          return (
            <button
              key={pill}
              type="button"
              onClick={() => setSelectedPillar(pill)}
              className={`px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? "bg-primary text-on-primary shadow-xs font-semibold"
                  : "bg-surface-container-lowest border border-outline-variant/40 hover:bg-surface text-on-surface-variant"
              }`}
            >
              {pill}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CALENDAR CONTENT VIEW
          ═══════════════════════════════════════════════════════════════════ */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-outline gap-3 bg-surface-container-lowest rounded-3xl border border-outline-variant/30">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">
            progress_activity
          </span>
          <span className="text-sm font-medium">Memuat Content Calendar 30 Hari...</span>
        </div>
      ) : plans.length === 0 ? (
        /* Empty State */
        <div className="bg-surface-container-lowest rounded-3xl border-2 border-dashed border-outline-variant/40 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-4xl">calendar_month</span>
          </div>
          <h3 className="font-headline-sm text-xl font-bold text-on-surface">
            Belum Ada Kalender Konten Terjadwal
          </h3>
          <p className="font-body-sm text-sm text-on-surface-variant max-w-md mt-1.5 mb-6">
            Jadikan kalender sebagai pusat kendali bisnis Anda. Buat 30 hari rencana konten Instagram dengan sekali klik.
          </p>
          <Link
            href="/ai-agent/content-generation"
            className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-sm font-bold shadow-md transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            <span>✨ Generate 30-Day Plan Sekarang</span>
          </Link>
        </div>
      ) : viewMode === "calendar" ? (
        /* ═══════════════════════════════════════════════════════════════════
            MONTHLY CALENDAR GRID (PRD SECTION 11)
            ═══════════════════════════════════════════════════════════════════ */
        <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-xs overflow-hidden">
          {/* Weekday Header: MON TUE WED THU FRI SAT SUN */}
          <div className="grid grid-cols-7 border-b border-outline-variant/30 bg-surface-container-low/50 text-center text-xs font-bold text-on-surface-variant">
            {WEEKDAYS.map((day) => (
              <div key={day.short} className="py-3.5 border-r last:border-r-0 border-outline-variant/20">
                <span className="tracking-wider">{day.short}</span>
                <span className="block text-[10px] text-outline font-normal">
                  {day.id}
                </span>
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 auto-rows-fr">
            {calendarCells.map((cell, idx) => {
              const dayPosts = plansByDate.get(cell.dateStr) || [];
              const hasPosts = dayPosts.length > 0;

              return (
                <div
                  key={`${cell.dateStr}-${idx}`}
                  className={`min-h-[110px] sm:min-h-[130px] p-2 border-r border-b border-outline-variant/20 transition-colors flex flex-col justify-between ${
                    (idx + 1) % 7 === 0 ? "border-r-0" : ""
                  } ${
                    cell.isCurrentMonth
                      ? "bg-surface-container-lowest hover:bg-surface-container-low/30"
                      : "bg-surface-container-low/20 text-outline/50"
                  } ${
                    cell.isToday ? "ring-2 ring-inset ring-primary/40 bg-primary/5" : ""
                  }`}
                >
                  {/* Cell Header: Day Number */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`inline-flex items-center justify-center text-xs font-bold w-6 h-6 rounded-full ${
                        cell.isToday
                          ? "bg-primary text-white shadow-xs"
                          : cell.isCurrentMonth
                          ? "text-on-surface"
                          : "text-outline/60"
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {hasPosts && (
                      <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                        {dayPosts.length} Post
                      </span>
                    )}
                  </div>

                  {/* Scheduled Posts in this Cell */}
                  <div className="space-y-1.5 flex-1">
                    {dayPosts.map((post) => {
                      const colorClass = getTypeColor(post.content_type || post.pillar);
                      return (
                        <button
                          key={post.id || post.dayIndex}
                          type="button"
                          onClick={() => setActivePost(post)}
                          className={`w-full text-left p-1.5 rounded-lg border text-[11px] font-medium transition-all transform hover:scale-[1.02] shadow-2xs group cursor-pointer block ${colorClass}`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="font-bold tracking-tight text-[10px] uppercase">
                              [POST]
                            </span>
                            <span className="text-[9px] font-semibold opacity-75">
                              PLANNED
                            </span>
                          </div>
                          <p className="line-clamp-2 leading-tight font-semibold group-hover:underline">
                            {post.title}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════════
            TABLE LIST VIEW (PRD SECTION 10)
            ═══════════════════════════════════════════════════════════════════ */
        <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-outline-variant/20 bg-surface-container-low/30 flex items-center justify-between">
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">
              Daftar Rencana Konten ({filteredPlans.length} Items)
            </h3>
            <span className="text-xs text-outline font-medium">
              Format: Date · Content · Type · Status
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface border-b border-outline-variant/30 text-outline uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Content</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Detail Brief</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 font-medium">
                {filteredPlans.map((plan) => (
                  <tr
                    key={plan.id || plan.dayIndex}
                    className="hover:bg-surface-container-low/40 transition-colors cursor-pointer"
                    onClick={() => setActivePost(plan)}
                  >
                    <td className="py-3.5 px-4 font-bold text-on-surface whitespace-nowrap">
                      {formatShortDate(plan.scheduledDate)}
                      <span className="block text-[10px] text-outline font-normal">
                        {plan.scheduledTime || "19:00"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="font-bold text-on-surface text-sm">
                        {plan.title}
                      </div>
                      <div className="text-[11px] text-outline truncate mt-0.5">
                        Hook: &ldquo;{plan.hook}&rdquo;
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getTypeColor(
                          plan.content_type
                        )}`}
                      >
                        {plan.content_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-outline whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-semibold text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm">
                          {plan.format === "Carousel"
                            ? "view_carousel"
                            : plan.format === "Reels"
                            ? "movie"
                            : "image"}
                        </span>
                        <span>{plan.format}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-secondary-container text-primary font-bold text-[10px] border border-primary/20">
                        {plan.status || "PLANNED"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePost(plan);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-outline-variant/40 hover:bg-surface text-primary font-semibold text-xs"
                      >
                        Lihat Brief →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          POST DETAIL MODAL (LAZY GENERATION CONTENT BRIEF)
          ═══════════════════════════════════════════════════════════════════ */}
      {activePost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-xl w-full rounded-3xl border border-outline-variant/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-space-lg border-b border-outline-variant/20 bg-gradient-to-r from-surface-container-low/50 to-surface-container-lowest flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-secondary-container text-primary font-bold text-[10px]">
                    {activePost.status || "PLANNED"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 font-bold text-[10px]">
                    Instagram · {activePost.format}
                  </span>
                  <span className="text-xs text-outline font-mono">
                    {activePost.scheduledDate} {activePost.scheduledTime}
                  </span>
                </div>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface">
                  {activePost.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setActivePost(null)}
                className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-space-lg overflow-y-auto space-y-4 text-xs">
              {/* Lazy Generation Banner */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-amber-600 text-base mt-0.5 shrink-0">
                  info
                </span>
                <p className="leading-relaxed">
                  <strong>Prinsip Lazy Generation:</strong> Belum ada image atau caption final. AI Agent akan meracik visual dan caption Instagram lengkap secara otomatis pada <strong>H-2 sebelum jadwal posting</strong>.
                </p>
              </div>

              {/* Hook */}
              <div className="space-y-1">
                <label className="font-bold text-outline uppercase tracking-wider text-[10px]">
                  Opening Hook
                </label>
                <div className="p-3 rounded-xl bg-surface border border-outline-variant/20 text-on-surface font-medium italic">
                  &ldquo;{activePost.hook}&rdquo;
                </div>
              </div>

              {/* Key Points */}
              <div className="space-y-1">
                <label className="font-bold text-outline uppercase tracking-wider text-[10px]">
                  Poin Kunci Konten
                </label>
                <ul className="space-y-1 p-3 rounded-xl bg-surface border border-outline-variant/20 text-on-surface-variant list-disc list-inside">
                  {activePost.key_points && activePost.key_points.length > 0 ? (
                    activePost.key_points.map((pt, i) => <li key={i}>{pt}</li>)
                  ) : (
                    <li>{activePost.topic}</li>
                  )}
                </ul>
              </div>

              {/* Call to Action */}
              <div className="space-y-1">
                <label className="font-bold text-outline uppercase tracking-wider text-[10px]">
                  Call to Action (CTA)
                </label>
                <div className="p-3 rounded-xl bg-surface border border-outline-variant/20 text-primary font-semibold">
                  {activePost.cta}
                </div>
              </div>

              {/* Visual Direction */}
              {activePost.visual_direction && (
                <div className="space-y-1">
                  <label className="font-bold text-outline uppercase tracking-wider text-[10px]">
                    Arah Visual AI
                  </label>
                  <div className="p-3 rounded-xl bg-surface border border-outline-variant/20 text-on-surface-variant">
                    {activePost.visual_direction}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-outline-variant/20 bg-surface flex items-center justify-between">
              <span className="text-[11px] text-outline">
                Pilar: <strong>{activePost.pillar}</strong> ({activePost.content_type})
              </span>
              <button
                type="button"
                onClick={() => setActivePost(null)}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold text-xs hover:bg-primary-container transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
