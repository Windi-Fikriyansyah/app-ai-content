"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  Check,
  ImageIcon,
  Layers,
  Video,
  Brain,
  X,
  PartyPopper,
  Table as TableIcon,
  LayoutGrid,
  Calendar,
  SlidersHorizontal,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Zap,
  ShieldCheck,
  GraduationCap,
  Megaphone,
  MessageSquare,
  BadgeCheck,
  Lightbulb,
  BookOpen,
  Star,
  Building2,
  Package,
  Mic,
  AlertCircle,
} from "lucide-react";
import {
  getContentPreferences,
  calculateRecommendedStrategy,
  saveContentPreferences,
} from "./actions";
import type { ContentPreferencesData } from "./actions";
import {
  get30DayPlanStatus,
  generate30DayPlanAction,
  enqueue30DayPlanAction,
} from "./planner-actions";
import type { ContentPlanItem } from "@/lib/ai/planner";

const ALL_POSTING_DAYS = [
  { id: "Monday", label: "Monday", idLabel: "Senin" },
  { id: "Tuesday", label: "Tuesday", idLabel: "Selasa" },
  { id: "Wednesday", label: "Wednesday", idLabel: "Rabu" },
  { id: "Thursday", label: "Thursday", idLabel: "Kamis" },
  { id: "Friday", label: "Friday", idLabel: "Jumat" },
  { id: "Saturday", label: "Saturday", idLabel: "Sabtu" },
  { id: "Sunday", label: "Sunday", idLabel: "Minggu" },
];

const ALL_CONTENT_TYPES = [
  {
    id: "Educational",
    label: "Educational",
    icon: GraduationCap,
    desc: "Tips, edukasi industri, panduan cara kerja produk",
  },
  {
    id: "Promotional",
    label: "Promotional",
    icon: Megaphone,
    desc: "Promo diskon, penawaran spesial, katalog menu/produk",
  },
  {
    id: "Engagement",
    label: "Engagement",
    icon: MessageSquare,
    desc: "Pertanyaan interaktif, polling, kuis, diskusi followers",
  },
  {
    id: "Branding",
    label: "Branding",
    icon: BadgeCheck,
    desc: "Visi misi bisnis, profil tim, behind-the-scenes",
  },
  {
    id: "Tips",
    label: "Tips",
    icon: Lightbulb,
    desc: "Solusi cepat, lifehacks, rekomendasi praktis",
  },
  {
    id: "Storytelling",
    label: "Storytelling",
    icon: BookOpen,
    desc: "Kisah inspiratif pelanggan, cerita perjalanan bisnis",
  },
  {
    id: "Social Proof",
    label: "Social Proof",
    icon: Star,
    desc: "Testimoni pembeli, ulasan positif, bukti kepuasan",
  },
];

export default function ContentGenerationPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessInfo, setBusinessInfo] = useState({ name: "", category: "" });

  // Preferences Form State
  const [postsPerDay, setPostsPerDay] = useState<number>(1);
  const [postsPerWeek, setPostsPerWeek] = useState<number>(7);
  const [postingDays, setPostingDays] = useState<string[]>([
    "Monday",
    "Wednesday",
    "Friday",
  ]);
  const [postingTime, setPostingTime] = useState<string>("19:00");
  const [contentTypes, setContentTypes] = useState<string[]>([
    "Educational",
    "Promotional",
    "Engagement",
    "Branding",
    "Tips",
    "Storytelling",
  ]);

  // Helper to split/manage time slots according to postsPerDay (up to 3 posts/day)
  const getTimeSlots = (timeStr: string, count: number): string[] => {
    const defaultSlots = ["09:00", "13:00", "19:00"];
    const parts = (timeStr || "").split(",").map((t) => t.trim()).filter(Boolean);
    const slots: string[] = [];
    for (let i = 0; i < count; i++) {
      slots.push(
        parts[i] ||
          (count === 1
            ? "19:00"
            : count === 2
            ? i === 0
              ? "12:00"
              : "19:00"
            : defaultSlots[i])
      );
    }
    return slots;
  };

  const handleSelectPostsPerDay = (count: number) => {
    setPostsPerDay(count);
    const newSlots = getTimeSlots(postingTime, count);
    setPostingTime(newSlots.join(", "));
    setPostsPerWeek(count * postingDays.length);
  };

  const handleUpdateTimeSlot = (index: number, newTime: string) => {
    const currentSlots = getTimeSlots(postingTime, postsPerDay);
    currentSlots[index] = newTime;
    setPostingTime(currentSlots.join(", "));
  };

  const handleApplyRecommendedTimes = () => {
    if (postsPerDay === 1) {
      setPostingTime("19:00");
    } else if (postsPerDay === 2) {
      setPostingTime("12:00, 19:00");
    } else {
      setPostingTime("09:00, 13:00, 19:00");
    }
  };

  // Strategy Distribution State
  const [strategy, setStrategy] = useState<Record<string, number>>({
    Educational: 40,
    Promotional: 20,
    Engagement: 15,
    Branding: 10,
    Tips: 10,
    Storytelling: 5,
  });

  const [imageQuality, setImageQuality] = useState<"low" | "medium" | "high" | "auto">("medium");
  const [isEditingStrategy, setIsEditingStrategy] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // ═══════════════════════════════════════════════════════════════════
  // GENERATE 30-DAY PLAN STATE & SIMULATION
  // ═══════════════════════════════════════════════════════════════════
  const [isGenerating, setIsGenerating] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [hasExistingPlans, setHasExistingPlans] = useState(false);
  const [totalPlansCount, setTotalPlansCount] = useState(0);
  const [generatedPlans, setGeneratedPlans] = useState<ContentPlanItem[]>([]);
  const [showPlansPreview, setShowPlansPreview] = useState(false);
  const [planViewMode, setPlanViewMode] = useState<"table" | "cards">("table");

  const formatPlanDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[m - 1]} ${d}`;
    } catch {
      return dateStr;
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("edu")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (t.includes("promo")) return "bg-rose-50 text-rose-700 border-rose-200";
    if (t.includes("engag")) return "bg-amber-50 text-amber-700 border-amber-200";
    if (t.includes("brand")) return "bg-purple-50 text-purple-700 border-purple-200";
    if (t.includes("tip")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (t.includes("story")) return "bg-indigo-50 text-indigo-700 border-indigo-200";
    return "bg-teal-50 text-teal-700 border-teal-200";
  };

  const generationSteps = [
    { label: "Analyzing business", icon: Building2 },
    { label: "Analyzing products", icon: Package },
    { label: "Applying brand voice", icon: Mic },
    { label: "Creating content pillars", icon: LayoutGrid },
    { label: "Building 30-day calendar", icon: Calendar },
  ];

  // Load Initial Preferences and Plan Status
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [prefRes, planRes] = await Promise.all([
          getContentPreferences(),
          get30DayPlanStatus(),
        ]);

        if (prefRes.success && prefRes.data) {
          const loadedPostsPerDay = prefRes.data.postsPerDay || 1;
          setPostsPerDay(loadedPostsPerDay);
          setPostsPerWeek(
            prefRes.data.postsPerWeek ||
              loadedPostsPerDay * (prefRes.data.postingDays?.length || 7)
          );
          setPostingDays(prefRes.data.postingDays);
          setPostingTime(prefRes.data.postingTime);
          setContentTypes(prefRes.data.contentTypes);
          setStrategy(prefRes.data.strategyDistribution);
          if (prefRes.data.imageQuality) {
            setImageQuality(prefRes.data.imageQuality);
          }
          setBusinessInfo({
            name: prefRes.businessName || "Bisnis Anda",
            category: prefRes.businessCategory || "Kuliner & F&B",
          });
        }

        if (planRes.success && planRes.hasPlans) {
          setHasExistingPlans(true);
          setTotalPlansCount(planRes.totalPlans);
          setGeneratedPlans(planRes.upcomingPlans);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Recalculate AI Strategy when Content Types change
  const handleToggleContentType = async (typeId: string) => {
    let nextTypes: string[];
    if (contentTypes.includes(typeId)) {
      if (contentTypes.length <= 1) {
        setFeedback({
          type: "error",
          message: "Pilih minimal 1 jenis konten.",
        });
        return;
      }
      nextTypes = contentTypes.filter((t) => t !== typeId);
    } else {
      nextTypes = [...contentTypes, typeId];
    }

    setContentTypes(nextTypes);
    const newStrategy = await calculateRecommendedStrategy(
      nextTypes,
      businessInfo.category
    );
    setStrategy(newStrategy);
  };

  // Toggle Day
  const handleToggleDay = (dayId: string) => {
    let nextDays: string[];
    if (postingDays.includes(dayId)) {
      if (postingDays.length <= 1) {
        setFeedback({
          type: "error",
          message: "Pilih minimal 1 hari posting.",
        });
        return;
      }
      nextDays = postingDays.filter((d) => d !== dayId);
    } else {
      nextDays = [...postingDays, dayId];
    }
    setPostingDays(nextDays);
    setPostsPerWeek(postsPerDay * nextDays.length);
  };

  // Handle Strategy Distribution Slider change
  const handleStrategyChange = (key: string, value: number) => {
    setStrategy((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const totalPercentage = Object.entries(strategy)
    .filter(([k, v]) => typeof v === "number" && k !== "_meta")
    .reduce((a, [_, b]) => a + (b as number), 0);

  // Save Preferences
  const handleSave = async (silent = false) => {
    if (!silent) setSaving(true);
    setFeedback({ type: null, message: "" });

    try {
      const payload: ContentPreferencesData = {
        postsPerWeek: postsPerDay * postingDays.length,
        postsPerDay,
        postingDays,
        postingTime,
        contentTypes,
        strategyDistribution: strategy,
        imageQuality,
      };

      const res = await saveContentPreferences(payload);
      if (res.success) {
        if (!silent) {
          setFeedback({
            type: "success",
            message: res.message || "Preferensi konten berhasil disimpan!",
          });
          setIsEditingStrategy(false);
        }
      } else {
        if (!silent) {
          setFeedback({
            type: "error",
            message: res.error || "Gagal menyimpan preferensi.",
          });
        }
      }
    } catch (err: any) {
      if (!silent) {
        setFeedback({
          type: "error",
          message: err.message || "Terjadi kesalahan.",
        });
      }
    } finally {
      if (!silent) setSaving(false);
    }
  };

  // Reset to AI recommendation
  const handleResetToRecommendation = async () => {
    const recommended = await calculateRecommendedStrategy(
      contentTypes,
      businessInfo.category
    );
    setStrategy(recommended);
    setIsEditingStrategy(false);
  };

  // ═══════════════════════════════════════════════════════════════════
  // TRIGGER GENERATE 30-DAY PLAN WITH BULLMQ / REDIS & POLLING
  // ═══════════════════════════════════════════════════════════════════
  const handleGenerate30DayPlan = async () => {
    // 1. Auto-save current preferences first
    await handleSave(true);

    setIsGenerating(true);
    setStepIndex(0);
    setFeedback({ type: null, message: "" });

    // Step animation helper
    let currentStep = 0;
    const stepInterval = setInterval(() => {
      currentStep = Math.min(currentStep + 1, 3);
      setStepIndex(currentStep);
    }, 1200);

    try {
      // 2. Attempt enqueue via BullMQ / Redis
      const enqueueRes = await enqueue30DayPlanAction();

      if (enqueueRes.success && enqueueRes.queued && enqueueRes.jobId) {
        // Enqueued successfully into BullMQ queue! Poll job status
        const jobId = enqueueRes.jobId;
        const maxPolls = 60; // 60 * 2s = 120s timeout
        let polls = 0;
        let jobFinished = false;

        while (polls < maxPolls && !jobFinished) {
          await new Promise((r) => setTimeout(r, 2000));
          polls++;

          try {
            const statusRes = await fetch(
              `/api/queue/status?queue=content-planning&jobId=${jobId}`
            );
            const statusData = await statusRes.json();

            if (statusData.success) {
              if (statusData.state === "completed") {
                jobFinished = true;
                clearInterval(stepInterval);
                setStepIndex(4);

                // Fetch newly saved plans from DB
                const planStatus = await get30DayPlanStatus();
                if (planStatus.success && planStatus.hasPlans) {
                  setHasExistingPlans(true);
                  setTotalPlansCount(planStatus.totalPlans);
                  setGeneratedPlans(planStatus.upcomingPlans);
                  setShowPlansPreview(true);
                  setFeedback({
                    type: "success",
                    message: `✨ Berhasil! ${planStatus.totalPlans} rencana konten 30 hari telah diproses antrian BullMQ/Redis dan dijadwalkan ke kalender.`,
                  });
                } else {
                  setFeedback({
                    type: "success",
                    message: "✨ Rencana konten berhasil diproses oleh background worker BullMQ!",
                  });
                }
                setIsGenerating(false);
                return;
              } else if (statusData.state === "failed") {
                jobFinished = true;
                clearInterval(stepInterval);
                setIsGenerating(false);
                setFeedback({
                  type: "error",
                  message:
                    statusData.failedReason ||
                    "Background worker gagal memproses rencana konten.",
                });
                window.scrollTo({ top: 0, behavior: "smooth" });
                return;
              } else if (polls >= 7 && statusData.state === "waiting") {
                // If job has been waiting for > 14s with no active worker, gracefully fallback to direct generation
                console.warn(
                  "Worker content-planning belum aktif di terminal, otomatis beralih ke direct AI generation..."
                );
                break;
              }
            }
          } catch (pollErr) {
            console.warn("Polling status error:", pollErr);
          }
        }

        if (jobFinished) return;
      }

      // 3. Direct Execution Fallback (if Redis offline or worker idle)
      const res = await generate30DayPlanAction();
      clearInterval(stepInterval);

      if (res.success && res.plans) {
        setStepIndex(4);
        setTimeout(() => {
          setIsGenerating(false);
          setHasExistingPlans(true);
          setTotalPlansCount(res.plans!.length);
          setGeneratedPlans(res.plans!);
          setShowPlansPreview(true);
          setFeedback({
            type: "success",
            message: `✨ Berhasil! ${res.plans!.length} rencana konten 30 hari telah dibuat oleh AI dan dijadwalkan ke kalender.`,
          });
        }, 800);
      } else {
        setIsGenerating(false);
        setFeedback({
          type: "error",
          message: res.error || "Gagal membuat rencana konten 30 hari.",
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      setIsGenerating(false);
      setFeedback({
        type: "error",
        message: err.message || "Gagal menghubungi server.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="font-label-md text-sm text-outline mt-2">
          Memuat preferensi konten AI...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-space-xl pb-24">
      {/* ═══════════════════════════════════════════════════════════════════
          AHA MOMENT BANNER: GENERATE 30-DAY CONTENT PLAN
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#1E1B4B] text-white p-6 sm:p-10 shadow-xl border border-indigo-500/30">
        {/* Glow & Decorative Ambient Orbs */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-primary/40 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-secondary/30 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-xs font-semibold tracking-wide text-indigo-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>The 1-Click AI Breakthrough</span>
            </div>

            <h1 className="font-headline-lg text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Your content calendar is ready to build.
            </h1>

            <p className="font-body-lg text-sm sm:text-base text-indigo-100/90 leading-relaxed">
              AI will create a <strong>30-day content plan</strong> based on your business and brand.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-indigo-200/80 pt-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Lazy Generation (Efisien Biaya AI)
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Format Carousel, Feed, Reels & Story
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Siap Dipublikasikan ke Instagram
              </span>
            </div>
          </div>

          {/* Large Hero CTA Button */}
          <div className="shrink-0 flex flex-col items-center lg:items-end gap-3">
            {/* Quick Image Quality Pill Selector in Hero */}
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/20 text-xs shadow-sm">
              <div className="flex items-center gap-1.5 text-indigo-100">
                <ImageIcon className="w-3.5 h-3.5 text-amber-300" />
                <span className="font-semibold text-[11px]">Quality Gambar:</span>
              </div>
              <div className="inline-flex rounded-xl bg-black/30 p-0.5 border border-white/10">
                {(["low", "medium", "high", "auto"] as const).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setImageQuality(q)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] capitalize transition-all cursor-pointer ${
                      imageQuality === q
                        ? "bg-white text-indigo-950 shadow-xs scale-105"
                        : "text-indigo-200 hover:text-white"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate30DayPlan}
              disabled={isGenerating}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-rose-500 to-primary hover:opacity-95 text-white font-headline-sm text-base sm:text-lg font-bold shadow-2xl hover:shadow-primary/50 transition-all transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-75 disabled:cursor-not-allowed group cursor-pointer ring-4 ring-white/20"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Meracik 30 Rencana Konten...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform text-amber-200" />
                  <span>✨ Generate 30-Day Plan</span>
                </>
              )}
            </button>

            {hasExistingPlans && !isGenerating && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-indigo-200 font-medium">
                  {totalPlansCount} Rencana Konten Aktif di Kalender
                </span>
                <Link
                  href="/content-calendar"
                  className="text-xs text-amber-300 hover:underline font-semibold ml-1"
                >
                  Buka Kalender →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            GENERATION PROGRESS DIALOG / STEPS SIMULATION
            ═══════════════════════════════════════════════════════════════════ */}
        {isGenerating && (
          <div className="mt-8 pt-6 border-t border-white/10 animate-in fade-in slide-in-from-top-4 duration-300">
            <p className="font-label-md text-sm font-semibold text-amber-300 mb-4 flex items-center gap-2">
              <Brain className="w-4 h-4 animate-pulse" />
              <span>Creating your content strategy...</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {generationSteps.map((step, idx) => {
                const isCompleted = stepIndex > idx;
                const isCurrent = stepIndex === idx;

                return (
                  <div
                    key={step.label}
                    className={`p-3 rounded-xl border backdrop-blur-md transition-all duration-300 flex items-center gap-2.5 ${
                      isCompleted
                        ? "bg-emerald-500/20 border-emerald-400/40 text-white"
                        : isCurrent
                        ? "bg-amber-400/20 border-amber-300/50 text-amber-100 ring-2 ring-amber-300/30"
                        : "bg-white/5 border-white/10 text-indigo-300 opacity-60"
                    }`}
                  >
                    <div className="shrink-0 flex items-center justify-center">
                      {isCompleted ? (
                        <Check className="w-4 h-4 text-emerald-400 font-bold" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                      ) : (
                        <span className="text-sm font-bold text-indigo-400">
                          {idx + 1}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold block truncate">
                        {isCompleted ? `✓ ${step.label}` : isCurrent ? `⏳ ${step.label}` : step.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Alert Feedback */}
      {feedback.message && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-red-50 border-red-200 text-red-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>

          <div className="flex items-center gap-2">
            {feedback.type === "success" && (
              <Link
                href="/content-calendar"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1"
              >
                <span>Lihat di Kalender</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            <button
              onClick={() => setFeedback({ type: null, message: "" })}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 10: CONTENT PLAN GENERATED (CELEBRATION STATE & TABLE)
          ═══════════════════════════════════════════════════════════════════ */}
      {generatedPlans.length > 0 && (
        <div className="bg-surface-container-lowest rounded-3xl border-2 border-emerald-500/30 p-space-lg lg:p-space-xl shadow-lg space-y-space-base animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-outline-variant/20 pb-5">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs ring-4 ring-emerald-50">
                <PartyPopper className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] uppercase tracking-wider border border-emerald-200">
                    10. Content Plan Generated
                  </span>
                  <span className="text-[11px] text-outline font-medium">
                    {generatedPlans.length} Rencana Konten
                  </span>
                </div>
                <h3 className="font-headline-sm text-xl sm:text-2xl font-extrabold text-on-surface tracking-tight">
                  Your 30-day content plan is ready 🎉
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                  Jadwal 30 konten telah selesai disusun secara strategis untuk{" "}
                  <strong>{businessInfo.name}</strong>.
                </p>
              </div>
            </div>

            {/* Top Actions: View Switcher & Primary Calendar CTA */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Toggle Table / Cards */}
              <div className="flex items-center p-1 bg-surface-container rounded-xl border border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setPlanViewMode("table")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    planViewMode === "table"
                      ? "bg-surface-container-lowest text-primary shadow-xs"
                      : "text-outline hover:text-on-surface"
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Tabel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlanViewMode("cards")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    planViewMode === "cards"
                      ? "bg-surface-container-lowest text-primary shadow-xs"
                      : "text-outline hover:text-on-surface"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
              </div>

              {/* Enter Content Calendar CTA */}
              <Link
                href="/content-calendar"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95"
              >
                <Calendar className="w-4 h-4" />
                <span>Masuk ke Content Calendar →</span>
              </Link>
            </div>
          </div>

          {/* TABLE VIEW (PRD SECTION 10) */}
          {planViewMode === "table" ? (
            <div className="rounded-2xl border border-outline-variant/30 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low/60 border-b border-outline-variant/30 text-outline uppercase font-bold text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 font-bold">Date</th>
                      <th className="py-3 px-4 font-bold">Content</th>
                      <th className="py-3 px-4 font-bold">Type</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold text-right">Format</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20 font-medium bg-surface-container-lowest">
                    {(showPlansPreview ? generatedPlans : generatedPlans.slice(0, 5)).map(
                      (plan) => (
                        <tr
                          key={plan.id || plan.dayIndex}
                          className="hover:bg-surface-container-low/30 transition-colors"
                        >
                          {/* Date Column (e.g., Sep 9) */}
                          <td className="py-3 px-4 font-bold text-on-surface whitespace-nowrap">
                            <span className="text-sm font-semibold">
                              {formatPlanDate(plan.scheduledDate)}
                            </span>
                            <span className="block text-[10px] text-outline font-normal">
                              {plan.scheduledTime || "19:00"}
                            </span>
                          </td>

                          {/* Content Column (e.g., Tips memilih nasi box) */}
                          <td className="py-3 px-4 max-w-md">
                            <div className="font-bold text-on-surface text-xs sm:text-sm">
                              {plan.title}
                            </div>
                            <div className="text-[11px] text-outline truncate mt-0.5">
                              Hook: &ldquo;{plan.hook}&rdquo;
                            </div>
                          </td>

                          {/* Type Column (e.g., Educational) */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getTypeBadgeStyle(
                                plan.content_type
                              )}`}
                            >
                              {plan.content_type}
                            </span>
                          </td>

                          {/* Status Column (e.g., Planned) */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-md bg-secondary-container text-primary font-bold text-[10px] border border-primary/20 tracking-wider">
                              {plan.status || "Planned"}
                            </span>
                          </td>

                          {/* Format Column */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <span className="text-[11px] text-outline font-semibold">
                              {plan.format}
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Expand / Collapse 30 Rows Toggle */}
              <div className="p-3 bg-surface-container-low/30 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-outline">
                  Menampilkan{" "}
                  <strong>
                    {showPlansPreview ? generatedPlans.length : Math.min(5, generatedPlans.length)}
                  </strong>{" "}
                  dari {generatedPlans.length} rencana konten 30 hari.
                </span>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPlansPreview(!showPlansPreview)}
                    className="text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>
                      {showPlansPreview
                        ? "Tampilkan Lebih Sedikit"
                        : `Lihat Semua ${generatedPlans.length} Baris Konten`}
                    </span>
                    {showPlansPreview ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <Link
                    href="/content-calendar"
                    className="font-bold text-emerald-700 hover:text-emerald-800 underline"
                  >
                    Buka di Kalender →
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* CARDS VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-base">
              {(showPlansPreview ? generatedPlans : generatedPlans.slice(0, 3)).map(
                (plan) => (
                  <div
                    key={plan.id || plan.dayIndex}
                    className="p-4 rounded-2xl bg-surface border border-outline-variant/30 hover:border-primary/40 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-[10px] font-bold uppercase tracking-wider">
                          Day {plan.dayIndex} · {plan.content_type}
                        </span>
                        <span className="font-code-sm text-[11px] text-outline font-medium">
                          {formatPlanDate(plan.scheduledDate)}
                        </span>
                      </div>

                      <h4 className="font-headline-sm text-sm font-bold text-on-surface line-clamp-2">
                        {plan.title}
                      </h4>

                      <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs text-outline space-y-1">
                        <p className="text-[11px] text-on-surface-variant line-clamp-2">
                          <strong>Hook:</strong> &ldquo;{plan.hook}&rdquo;
                        </p>
                        <p className="text-[10px] text-outline line-clamp-1">
                          <strong>CTA:</strong> {plan.cta}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px]">
                      <span className="inline-flex items-center gap-1 font-semibold text-primary">
                        {plan.format === "Carousel" ? (
                          <Layers className="w-3.5 h-3.5" />
                        ) : plan.format === "Reels" ? (
                          <Video className="w-3.5 h-3.5" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5" />
                        )}
                        <span>{plan.format}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-secondary-container text-primary font-bold text-[10px]">
                        {plan.status || "Planned"}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="pt-3 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-outline">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Status <strong>PLANNED</strong>: Lazy Generation H-2 sebelum posting.
              </span>
            </div>

            <Link
              href="/content-calendar"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 text-center"
            >
              <Calendar className="w-4 h-4" />
              <span>Buka Content Calendar Lengkap</span>
            </Link>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION PREFERENCES: HOW SHOULD AI MANAGE YOUR CONTENT?
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-xs overflow-hidden">
        <div className="p-space-lg lg:p-space-xl border-b border-outline-variant/20 bg-gradient-to-r from-surface-container-lowest via-surface-container-low/40 to-surface-container-lowest">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-primary/20">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  Content Preferences
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Sesuaikan parameter yang digunakan oleh AI saat membuat 30 rencana konten untuk{" "}
                  <span className="font-semibold text-on-surface">{businessInfo.name}</span>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-surface border border-outline-variant/40 hover:bg-surface-container text-on-surface text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0"
            >
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>
        </div>

        <div className="p-space-lg lg:p-space-xl space-y-space-xl">
          {/* Section A: Posting Frequency */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <label className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-2">
                  <span>Posting Frequency</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Maksimal 3 Postingan / Hari
                  </span>
                </label>
                <p className="text-xs text-outline mt-0.5">
                  Tentukan intensitas postingan harian yang akan dibuat dan dijadwalkan otomatis oleh AI.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20 shadow-2xs">
                  {postsPerDay} Postingan / Hari ({postsPerDay * postingDays.length} / Minggu)
                </span>
              </div>
            </div>

            {/* Posts Per Day Options Grid (Max 3 Posts / Day) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {[
                {
                  count: 1,
                  title: "1 Postingan / Hari",
                  subtitle: "Standard & Konsisten",
                  desc: "Ideal untuk membangun dan menjaga kehadiran brand secara stabil.",
                  badge: null,
                },
                {
                  count: 2,
                  title: "2 Postingan / Hari",
                  subtitle: "Pertumbuhan Cepat",
                  desc: "Meningkatkan engagement di jam istirahat siang dan prime time malam.",
                  badge: "Populer",
                },
                {
                  count: 3,
                  title: "3 Postingan / Hari",
                  subtitle: "Jangkauan Optimal",
                  desc: "Maksimal jangkauan algoritma sepanjang hari (Pagi, Siang & Malam).",
                  badge: "Maksimal",
                },
              ].map((opt) => {
                const isSelected = postsPerDay === opt.count;
                return (
                  <button
                    key={opt.count}
                    type="button"
                    onClick={() => handleSelectPostsPerDay(opt.count)}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all cursor-pointer text-left ${
                      isSelected
                        ? "bg-secondary-container/80 border-primary ring-2 ring-primary/25 text-primary font-bold shadow-xs"
                        : "bg-surface border-outline-variant/40 hover:border-primary/40 text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    <div className="flex items-start justify-between w-full mb-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                            isSelected
                              ? "border-primary bg-primary text-white"
                              : "border-outline-variant bg-transparent"
                          }`}
                        >
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </span>
                        <div>
                          <span className="text-sm font-bold text-on-surface block leading-tight">
                            {opt.title}
                          </span>
                          <span className="text-[11px] font-medium text-primary/80 block mt-0.5">
                            {opt.subtitle}
                          </span>
                        </div>
                      </div>
                      {opt.badge && (
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                            opt.badge === "Maksimal"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                              : "bg-primary/15 text-primary border border-primary/20"
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-outline line-clamp-2 mt-1 mb-2 font-normal">
                      {opt.desc}
                    </p>
                    <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px] w-full">
                      <span className="text-outline font-normal">Total Mingguan:</span>
                      <span className="font-bold text-primary">
                        {opt.count * postingDays.length} Postingan / Minggu
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Smart Summary Banner */}
            <div className="mt-3.5 p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 flex flex-wrap items-center justify-between gap-2.5 text-xs text-on-surface">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <span>
                  Konfigurasi Aktif: <strong>{postsPerDay} post per hari</strong> selama{" "}
                  <strong>{postingDays.length} hari</strong> per minggu.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-outline">Estimasi 30 Hari:</span>
                <span className="font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-md">
                  ~{postsPerDay * postingDays.length * 4} Konten
                </span>
              </div>
            </div>
          </div>

          {/* Section B: Posting Days & Time */}
          <div className="pt-space-md border-t border-outline-variant/20 grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
            {/* Posting Days (2 Cols) */}
            <div className="lg:col-span-2 space-y-3">
              <div>
                <label className="font-label-md text-label-md font-bold text-on-surface">
                  Posting Days
                </label>
                <p className="text-xs text-outline mt-0.5">
                  Pilih hari-hari di mana konten Anda akan dijadwalkan untuk terbit.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {ALL_POSTING_DAYS.map((day) => {
                  const isChecked = postingDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => handleToggleDay(day.id)}
                      className={`py-2.5 px-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                        isChecked
                          ? "bg-secondary-container/60 border-primary text-primary font-semibold shadow-xs"
                          : "bg-surface border-outline-variant/40 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? "bg-primary text-white"
                            : "border border-outline-variant bg-white"
                        }`}
                      >
                        {isChecked && (
                          <Check className="w-3 h-3" />
                        )}
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-semibold block leading-tight">
                          {day.label}
                        </span>
                        <span className="text-[10px] text-outline">
                          {day.idLabel}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Posting Time (1 Col) */}
            <div className="space-y-3">
              <div>
                <label className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>
                    Posting Time {postsPerDay > 1 ? `(${postsPerDay} Waktu Terbit)` : ""}
                  </span>
                </label>
                <p className="text-xs text-outline mt-0.5">
                  {postsPerDay === 1
                    ? "Waktu prime time penerbitan konten (WIB)."
                    : `Tentukan ${postsPerDay} jam tayang per hari (WIB).`}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-outline-variant/40 space-y-3">
                <div
                  className={`grid gap-2.5 ${
                    postsPerDay === 1
                      ? "grid-cols-1"
                      : postsPerDay === 2
                      ? "grid-cols-2"
                      : "grid-cols-3"
                  }`}
                >
                  {getTimeSlots(postingTime, postsPerDay).map((slotTime, idx) => (
                    <div key={idx} className="space-y-1">
                      <span className="text-[11px] font-semibold text-outline block">
                        {postsPerDay === 1
                          ? "Waktu Terbit"
                          : idx === 0
                          ? "Slot 1 (Pagi)"
                          : idx === 1 && postsPerDay === 3
                          ? "Slot 2 (Siang)"
                          : idx === 1 && postsPerDay === 2
                          ? "Slot 2 (Malam)"
                          : "Slot 3 (Malam)"}
                      </span>
                      <input
                        type="time"
                        value={slotTime}
                        onChange={(e) => handleUpdateTimeSlot(idx, e.target.value)}
                        className="w-full px-2 py-2 bg-surface-container-lowest rounded-lg border border-outline-variant/40 text-xs font-bold text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-center tracking-wider shadow-xs"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] text-outline pt-2 border-t border-outline-variant/20">
                  <span>Preset Rekomendasi:</span>
                  <button
                    type="button"
                    onClick={handleApplyRecommendedTimes}
                    className="font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {postsPerDay === 1
                      ? "19:00 WIB"
                      : postsPerDay === 2
                      ? "12:00 & 19:00"
                      : "09:00, 13:00, 19:00"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section C: Content Types Selection */}
          <div className="pt-space-md border-t border-outline-variant/20 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-label-md text-label-md font-bold text-on-surface">
                  Content Types
                </label>
                <p className="text-xs text-outline mt-0.5">
                  Centang pilar konten yang relevan dengan strategi pemasaran bisnis Anda.
                </p>
              </div>
              <span className="text-xs text-outline font-medium">
                {contentTypes.length} Jenis Terpilih
              </span>
            </div>

            {/* Content Types Checkboxes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ALL_CONTENT_TYPES.map((type) => {
                const isChecked = contentTypes.includes(type.id);
                const TypeIcon = type.icon;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleToggleContentType(type.id)}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all cursor-pointer text-left ${
                      isChecked
                        ? "bg-secondary-container/40 border-primary shadow-xs ring-1 ring-primary/20"
                        : "bg-surface border-outline-variant/40 hover:bg-surface-container text-on-surface-variant"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? "bg-primary text-white"
                          : "border border-outline-variant bg-white"
                      }`}
                    >
                      {isChecked && (
                        <Check className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <TypeIcon
                          className={`w-4 h-4 ${
                            isChecked ? "text-primary" : "text-outline"
                          }`}
                        />
                        <span
                          className={`text-sm font-bold ${
                            isChecked ? "text-on-surface" : "text-on-surface-variant"
                          }`}
                        >
                          {type.label}
                        </span>
                      </div>
                      <p className="text-xs text-outline mt-1 line-clamp-2 leading-relaxed">
                        {type.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section D: AI Image Quality Selection */}
          <div className="pt-space-md border-t border-outline-variant/20 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  <span>AI Image Quality</span>
                  <span className="text-xs font-normal text-outline">
                    (Kualitas Visual Gambar)
                  </span>
                </label>
                <p className="text-xs text-outline mt-0.5">
                  Pilih tingkat kualitas render visual gambar Instagram yang akan dikirim ke OpenAI Image Generator.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-wide">
                Quality: {imageQuality}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  id: "low",
                  label: "Low",
                  badge: "Cepat",
                  desc: "Render paling cepat, hemat waktu pemrosesan",
                  icon: Zap,
                },
                {
                  id: "medium",
                  label: "Medium",
                  badge: "Rekomendasi",
                  desc: "Keseimbangan ideal antara detail visual tajam & kecepatan",
                  icon: Sparkles,
                },
                {
                  id: "high",
                  label: "High",
                  badge: "HD Maksimal",
                  desc: "Kualitas visual maksimal dengan resolusi dan detail ekstra",
                  icon: ShieldCheck,
                },
                {
                  id: "auto",
                  label: "Auto",
                  badge: "AI Managed",
                  desc: "Kualitas ditentukan otomatis sesuai kompleksitas prompt visual",
                  icon: SlidersHorizontal,
                },
              ].map((opt) => {
                const isSelected = imageQuality === opt.id;
                const QualityIcon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setImageQuality(opt.id as any)}
                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? "bg-secondary-container/60 border-primary ring-2 ring-primary/20 text-on-surface shadow-xs"
                        : "bg-surface border-outline-variant/40 hover:border-primary/40 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                              isSelected
                                ? "bg-primary text-white"
                                : "bg-surface-container text-outline"
                            }`}
                          >
                            <QualityIcon className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-sm text-on-surface">
                            {opt.label}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            opt.id === "medium"
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "bg-surface-container text-outline"
                          }`}
                        >
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-xs text-outline leading-relaxed">
                        {opt.desc}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center justify-between text-[11px]">
                      <span className={isSelected ? "text-primary font-semibold" : "text-outline"}>
                        {isSelected ? "✓ Terpilih" : "Pilih opsi ini"}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? "border-primary bg-primary text-white"
                            : "border-outline-variant bg-transparent"
                        }`}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 8: AI CONTENT STRATEGY DISTRIBUTION
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-surface-container-lowest rounded-3xl border-2 border-primary/20 shadow-xs overflow-hidden">
        <div className="p-space-lg lg:p-space-xl border-b border-outline-variant/20 bg-gradient-to-r from-primary/5 via-secondary-container/20 to-surface-container-lowest">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-primary-container text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    8. Your AI Content Strategy
                  </h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Optimal Distribution
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Berdasarkan kategori bisnis{" "}
                  <span className="font-semibold text-primary">{businessInfo.category}</span>,
                  AI merekomendasikan proporsi distribusi pilar konten berikut:
                </p>
              </div>
            </div>

            {/* Toggle edit or use strategy */}
            <div className="flex items-center gap-2 shrink-0">
              {isEditingStrategy ? (
                <button
                  type="button"
                  onClick={handleResetToRecommendation}
                  className="px-3 py-1.5 rounded-lg border border-outline-variant/40 hover:bg-surface text-xs font-medium text-on-surface-variant transition-colors"
                >
                  Reset ke Rekomendasi AI
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingStrategy(true)}
                  className="px-3 py-1.5 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Sesuaikan Proporsi</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-space-lg lg:p-space-xl space-y-6">
          {/* Strategy Visual Progress Bars */}
          <div className="space-y-4">
            {Object.entries(strategy)
              .filter(
                ([typeName, percentage]) =>
                  typeof percentage === "number" && typeName !== "_meta"
              )
              .map(([typeName, percentage]) => {
              const colorMap: Record<string, { bar: string; text: string }> = {
                Educational: { bar: "bg-blue-600", text: "text-blue-700" },
                Promotional: { bar: "bg-rose-500", text: "text-rose-700" },
                Engagement: { bar: "bg-amber-500", text: "text-amber-700" },
                Branding: { bar: "bg-purple-600", text: "text-purple-700" },
                Tips: { bar: "bg-emerald-600", text: "text-emerald-700" },
                Storytelling: { bar: "bg-indigo-600", text: "text-indigo-700" },
                "Social Proof": { bar: "bg-teal-600", text: "text-teal-700" },
              };

              const style = colorMap[typeName] || {
                bar: "bg-primary",
                text: "text-primary",
              };

              return (
                <div key={typeName} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-on-surface">
                      {typeName}
                    </span>
                    <span className={`font-mono font-bold text-sm ${style.text}`}>
                      {percentage}%
                    </span>
                  </div>

                  {/* Visual Bar */}
                  <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${style.bar}`}
                      style={{ width: `${Math.min(100, Math.max(2, percentage))}%` }}
                    />
                  </div>

                  {/* Optional Slider if User clicks Edit */}
                  {isEditingStrategy && (
                    <div className="pt-1 flex items-center gap-3">
                      <input
                        type="range"
                        min="5"
                        max="80"
                        step="5"
                        value={percentage}
                        onChange={(e) =>
                          handleStrategyChange(typeName, parseInt(e.target.value, 10))
                        }
                        className="w-full accent-primary h-1.5 cursor-pointer"
                      />
                      <span className="text-xs font-mono text-outline w-8 text-right">
                        {percentage}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Validation Total Banner if edited */}
          {isEditingStrategy && totalPercentage !== 100 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
              <span>Total proporsi saat ini: <strong>{totalPercentage}%</strong> (Idealnya 100%)</span>
              <button
                type="button"
                onClick={handleResetToRecommendation}
                className="underline font-semibold"
              >
                Auto Balance
              </button>
            </div>
          )}

          {/* Bottom Action: [ Use This Strategy ] */}
          <div className="pt-4 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-outline">
              Klik <strong>[ Use This Strategy ]</strong> untuk mengunci proporsi ini dan mulai membuat rencana konten 30 hari.
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleGenerate30DayPlan}
                disabled={isGenerating}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>[ Use This Strategy & Generate 30-Day Plan ]</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
