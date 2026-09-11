"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Table,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  Layers,
  Video,
  ImageIcon,
  X,
  CheckCircle2,
  AlertTriangle,
  BadgeCheck,
  AlertCircle,
  Check,
  Copy,
  Lightbulb,
  Wand2,
  Clock,
  RotateCw,
  RefreshCw,
  Send,
  Hourglass,
  ImageOff,
} from "lucide-react";
import { get30DayPlanStatus } from "../ai-agent/content-generation/planner-actions";
import {
  enqueueSinglePostLazyGenAction,
  getSinglePostAction,
  approvePostAction,
  retrySinglePostImageAction,
  triggerPostRevisionAction,
  simulateZernioWebhookAction,
  republishPostToZernioAction,
} from "./lazy-actions";
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
  const [activeCarouselSlideIndex, setActiveCarouselSlideIndex] = useState(0);
  const [isGeneratingLazy, setIsGeneratingLazy] = useState(false);
  const [modalQuality, setModalQuality] = useState<"low" | "medium" | "high" | "auto">("medium");
  const [lazyFeedback, setLazyFeedback] = useState<{
    type: "success" | "error" | "info" | null;
    message: string;
  }>({ type: null, message: "" });
  const [isApproving, setIsApproving] = useState(false);
  const [isRetryingImage, setIsRetryingImage] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);
  const [isRepublishing, setIsRepublishing] = useState(false);

  const handleTriggerLazyGen = async (postId: string, customQuality?: "low" | "medium" | "high" | "auto") => {
    const chosenQuality = customQuality || modalQuality;
    setIsGeneratingLazy(true);
    setLazyFeedback({
      type: "info",
      message: `🚀 Memasukkan job ke Queue Redis (Quality: ${chosenQuality})...`,
    });

    try {
      // Enqueue job into BullMQ Redis Queue
      const enqueueRes = await enqueueSinglePostLazyGenAction(postId, chosenQuality);

      if (!enqueueRes.success) {
        setLazyFeedback({
          type: "error",
          message: enqueueRes.error || "Gagal memasukkan pekerjaan ke antrian.",
        });
        setIsGeneratingLazy(false);
        return;
      }

      // Mark post as GENERATING immediately in local UI state
      setPlans((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, status: "GENERATING", caption_status: "GENERATING", image_status: "GENERATING" }
            : p
        )
      );
      setActivePost((prev) =>
        prev && prev.id === postId
          ? { ...prev, status: "GENERATING", caption_status: "GENERATING", image_status: "GENERATING" }
          : prev
      );

      if (enqueueRes.queued) {
        setLazyFeedback({
          type: "info",
          message: `⚡ Job dimasukkan ke BullMQ Queue (#${enqueueRes.jobId?.slice(-12)}). Worker terminal sedang meracik Caption & Visual...`,
        });

        // Poll every 2.5s for worker completion
        const startTime = Date.now();
        const pollTimer = setInterval(async () => {
          try {
            const pollRes = await getSinglePostAction(postId);
            if (pollRes.success && pollRes.post) {
              const currentStatus = pollRes.post.status;
              if (currentStatus !== "GENERATING" && currentStatus !== "PLANNED") {
                clearInterval(pollTimer);
                setPlans((prev) =>
                  prev.map((p) => (p.id === postId ? { ...p, ...pollRes.post } : p))
                );
                setActivePost((prev) => (prev ? { ...prev, ...pollRes.post } : null));
                setIsGeneratingLazy(false);

                if (currentStatus === "SCHEDULED" || currentStatus === "APPROVED") {
                  setLazyFeedback({
                    type: "success",
                    message: "🎉 AI Review lolos dan konten telah OTOMATIS DISETUJUI (Auto-Approve) & dijadwalkan ke Zernio!",
                  });
                } else if (currentStatus === "READY FOR APPROVAL" || currentStatus === "REVIEW") {
                  setLazyFeedback({
                    type: "success",
                    message: "✨ Selesai! Worker BullMQ telah menyelesaikan Caption, Visual, dan AI Review!",
                  });
                } else {
                  setLazyFeedback({
                    type: "error",
                    message: pollRes.post.generation_error || "Worker gagal memproses post.",
                  });
                }
              }
            }

            if (Date.now() - startTime > 75000) {
              clearInterval(pollTimer);
              setIsGeneratingLazy(false);
              setLazyFeedback({
                type: "info",
                message: "⏳ Worker masih memproses di latar belakang. Silakan refresh sebentar lagi.",
              });
            }
          } catch {
            // keep polling
          }
        }, 2500);
      } else {
        // Fallback if Redis was not running and direct generation occurred
        const fallbackRes = await getSinglePostAction(postId);
        if (fallbackRes.success && fallbackRes.post) {
          setPlans((prev) =>
            prev.map((p) => (p.id === postId ? { ...p, ...fallbackRes.post } : p))
          );
          setActivePost((prev) => (prev ? { ...prev, ...fallbackRes.post } : null));
        }
        setIsGeneratingLazy(false);
        if (fallbackRes.post.status === "SCHEDULED" || fallbackRes.post.status === "APPROVED") {
          setLazyFeedback({
            type: "success",
            message: "🎉 AI Review lolos dan konten telah OTOMATIS DISETUJUI (Auto-Approve) & dijadwalkan ke Zernio!",
          });
        } else {
          setLazyFeedback({
            type: "success",
            message: "✨ Selesai diproses via Direct Mode.",
          });
        }
      }
    } catch (err: any) {
      setIsGeneratingLazy(false);
      setLazyFeedback({
        type: "error",
        message: err.message || "Gagal memproses Lazy Generation.",
      });
    }
  };

  const handleApprovePost = async (postId: string) => {
    setIsApproving(true);
    setLazyFeedback({
      type: "info",
      message: "🚀 Memproses persetujuan & mengirim jadwal postingan ke Zernio...",
    });

    try {
      const res = await approvePostAction(postId);
      if (res.success) {
        const nextStatus = res.status || "SCHEDULED";
        setPlans((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  status: nextStatus,
                  zernio_post_id: res.zernioPostId || p.zernio_post_id,
                  scheduled_at: res.scheduledAt || p.scheduled_at,
                }
              : p
          )
        );
        setActivePost((prev) =>
          prev
            ? {
                ...prev,
                status: nextStatus,
                zernio_post_id: res.zernioPostId || prev.zernio_post_id,
                scheduled_at: res.scheduledAt || prev.scheduled_at,
              }
            : null
        );
        setLazyFeedback({
          type: "success",
          message: "🎉 Konten telah disetujui & otomatis dijadwalkan di Zernio (SCHEDULED 🕒) untuk rilis ke Instagram!",
        });
      } else {
        setLazyFeedback({
          type: "error",
          message: res.error || "Gagal menyetujui konten.",
        });
      }
    } catch (err: any) {
      setLazyFeedback({
        type: "error",
        message: err.message || "Gagal menyetujui konten.",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleSimulateWebhook = async (postId: string) => {
    setIsSimulatingWebhook(true);
    setLazyFeedback({
      type: "info",
      message: "📡 Mengirim webhook simulasi dari Zernio (event: published)...",
    });

    try {
      const res = await simulateZernioWebhookAction(postId, "published");
      if (res.success) {
        setPlans((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, status: "PUBLISHED" }
              : p
          )
        );
        setActivePost((prev) =>
          prev ? { ...prev, status: "PUBLISHED" } : null
        );
        setLazyFeedback({
          type: "success",
          message: "✓ Webhook Zernio berhasil diterima! Postingan sekarang berstatus PUBLISHED (Telah Terbit di Instagram).",
        });
      } else {
        setLazyFeedback({
          type: "error",
          message: res.error || "Gagal memproses webhook simulasi.",
        });
      }
    } catch (err: any) {
      setLazyFeedback({
        type: "error",
        message: err.message || "Gagal mengirim webhook simulasi.",
      });
    } finally {
      setIsSimulatingWebhook(false);
    }
  };

  const handleRepublishPost = async (postId: string) => {
    setIsRepublishing(true);
    setLazyFeedback({
      type: "info",
      message: "🔄 Menghapus postingan lama di Zernio dan menjadwalkan ulang dengan data terbaru...",
    });

    try {
      const res = await republishPostToZernioAction(postId);
      if (res.success) {
        setPlans((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  status: "SCHEDULED",
                  zernio_post_id: res.zernioPostId || p.zernio_post_id,
                  scheduled_at: res.scheduledAt || p.scheduled_at,
                }
              : p
          )
        );
        setActivePost((prev) =>
          prev
            ? {
                ...prev,
                status: "SCHEDULED",
                zernio_post_id: res.zernioPostId || prev.zernio_post_id,
                scheduled_at: res.scheduledAt || prev.scheduled_at,
              }
            : null
        );
        setLazyFeedback({
          type: "success",
          message: "✓ Postingan lama di Zernio berhasil dihapus dan jadwal baru telah berhasil dikirim!",
        });
      } else {
        setLazyFeedback({
          type: "error",
          message: res.error || "Gagal menjadwalkan ulang postingan ke Zernio.",
        });
      }
    } catch (err: any) {
      setLazyFeedback({
        type: "error",
        message: err.message || "Terjadi kesalahan saat mempublikasikan ulang.",
      });
    } finally {
      setIsRepublishing(false);
    }
  };

  const handleRetryImage = async (postId: string, customQuality?: "low" | "medium" | "high" | "auto") => {
    const chosenQuality = customQuality || modalQuality;
    setIsRetryingImage(true);
    setLazyFeedback({
      type: "info",
      message: `🎨 Mengirim permintaan pembuatan ulang gambar (Quality: ${chosenQuality})...`,
    });

    // Mark image as GENERATING in UI state immediately
    setPlans((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, image_status: "GENERATING", generation_error: null }
          : p
      )
    );
    setActivePost((prev) =>
      prev && prev.id === postId
        ? { ...prev, image_status: "GENERATING", generation_error: null }
        : prev
    );

    try {
      const res = await retrySinglePostImageAction(postId, chosenQuality);

      if (!res.success) {
        setLazyFeedback({
          type: "error",
          message: res.error || "Gagal me-request ulang gambar.",
        });
        setIsRetryingImage(false);
        return;
      }

      if (res.queued) {
        setLazyFeedback({
          type: "info",
          message: `⚡ Job gambar dimasukkan ke antrian BullMQ (#${res.jobId?.slice(-12)}). Sedang diproses oleh Image Agent...`,
        });

        // Poll every 2.5s for worker completion
        const startTime = Date.now();
        const pollTimer = setInterval(async () => {
          try {
            const pollRes = await getSinglePostAction(postId);
            if (pollRes.success && pollRes.post) {
              const imgStatus = pollRes.post.image_status;
              if (imgStatus !== "GENERATING") {
                clearInterval(pollTimer);
                setPlans((prev) =>
                  prev.map((p) => (p.id === postId ? { ...p, ...pollRes.post } : p))
                );
                setActivePost((prev) => (prev ? { ...prev, ...pollRes.post } : null));
                setIsRetryingImage(false);

                if (imgStatus === "COMPLETED") {
                  setLazyFeedback({
                    type: "success",
                    message: "✨ Berhasil! Gambar baru telah berhasil dibuat dan disimpan.",
                  });
                } else {
                  setLazyFeedback({
                    type: "error",
                    message: pollRes.post.generation_error || "Pembuatan ulang gambar gagal.",
                  });
                }
              }
            }

            if (Date.now() - startTime > 75000) {
              clearInterval(pollTimer);
              setIsRetryingImage(false);
              setLazyFeedback({
                type: "info",
                message: "⏳ Image worker masih memproses di latar belakang. Silakan refresh sebentar lagi.",
              });
            }
          } catch {
            // keep polling
          }
        }, 2500);
      } else {
        // Direct execution fallback
        const pollRes = await getSinglePostAction(postId);
        if (pollRes.success && pollRes.post) {
          setPlans((prev) =>
            prev.map((p) => (p.id === postId ? { ...p, ...pollRes.post } : p))
          );
          setActivePost((prev) => (prev ? { ...prev, ...pollRes.post } : null));
        }
        setIsRetryingImage(false);
        setLazyFeedback({
          type: "success",
          message: "✨ Gambar baru berhasil dibuat!",
        });
      }
    } catch (err: any) {
      setIsRetryingImage(false);
      setLazyFeedback({
        type: "error",
        message: err.message || "Terjadi kesalahan saat memproses gambar.",
      });
    }
  };

  const handleTriggerRevision = async (postId: string, customNotes?: string) => {
    setIsRevising(true);
    setLazyFeedback({
      type: "info",
      message: "🤖 Menjalankan revisi konten dengan AI berdasarkan poin review...",
    });

    // Mark as GENERATING in UI state immediately
    setPlans((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, status: "GENERATING", caption_status: "GENERATING" }
          : p
      )
    );
    setActivePost((prev) =>
      prev && prev.id === postId
        ? { ...prev, status: "GENERATING", caption_status: "GENERATING" }
        : prev
    );

    try {
      const res = await triggerPostRevisionAction(postId, customNotes, modalQuality);

      if (res.queued) {
        setLazyFeedback({
          type: "info",
          message: `⚡ Permintaan revisi dikirim ke antrian BullMQ (#${res.jobId?.slice(-12)}). Worker sedang merevisi konten...`,
        });

        // Poll every 2.5s for worker completion
        const startTime = Date.now();
        const pollTimer = setInterval(async () => {
          try {
            const pollRes = await getSinglePostAction(postId);
            if (pollRes.success && pollRes.post) {
              const postStatus = pollRes.post.status;
              if (postStatus !== "GENERATING") {
                clearInterval(pollTimer);
                setPlans((prev) =>
                  prev.map((p) => (p.id === postId ? { ...p, ...pollRes.post } : p))
                );
                setActivePost((prev) => (prev ? { ...prev, ...pollRes.post } : null));
                setIsRevising(false);

                if (postStatus === "SCHEDULED" || postStatus === "APPROVED") {
                  setLazyFeedback({
                    type: "success",
                    message: `🎉 Revisi berhasil (Skor: ${pollRes.post.ai_score}/100) dan telah OTOMATIS DISETUJUI (Auto-Approve) ke Zernio!`,
                  });
                } else if (postStatus === "READY FOR APPROVAL" || (pollRes.post.ai_score && pollRes.post.ai_score >= 80)) {
                  setLazyFeedback({
                    type: "success",
                    message: `✨ Revisi berhasil! Skor meningkat menjadi ${pollRes.post.ai_score}/100 dan siap disetujui (READY FOR APPROVAL).`,
                  });
                } else {
                  setLazyFeedback({
                    type: "info",
                    message: `✓ Revisi selesai (Skor: ${pollRes.post.ai_score}/100). Periksa kembali poin saran review.`,
                  });
                }
              }
            }

            if (Date.now() - startTime > 75000) {
              clearInterval(pollTimer);
              setIsRevising(false);
              setLazyFeedback({
                type: "info",
                message: "⏳ Worker masih memproses revisi di latar belakang. Silakan refresh sebentar lagi.",
              });
            }
          } catch {
            // keep polling
          }
        }, 2500);
      } else if (res.success && res.post) {
        setPlans((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, ...res.post } : p))
        );
        setActivePost((prev) => (prev ? { ...prev, ...res.post } : null));
        setIsRevising(false);

        if (res.post.status === "SCHEDULED" || res.post.status === "APPROVED") {
          setLazyFeedback({
            type: "success",
            message: `🎉 Revisi berhasil (Skor: ${res.post.ai_score}/100) dan telah OTOMATIS DISETUJUI (Auto-Approve) ke Zernio!`,
          });
        } else if (res.post.status === "READY FOR APPROVAL" || (res.post.ai_score && res.post.ai_score >= 80)) {
          setLazyFeedback({
            type: "success",
            message: `✨ Revisi berhasil! Skor meningkat menjadi ${res.post.ai_score}/100 dan siap disetujui (READY FOR APPROVAL).`,
          });
        } else {
          setLazyFeedback({
            type: "info",
            message: `✓ Revisi selesai (Skor: ${res.post.ai_score}/100). Periksa kembali poin saran review.`,
          });
        }
      } else {
        setIsRevising(false);
        setLazyFeedback({
          type: "error",
          message: res.error || "Gagal melakukan revisi konten.",
        });
      }
    } catch (err: any) {
      setIsRevising(false);
      setLazyFeedback({
        type: "error",
        message: err.message || "Terjadi kesalahan saat merevisi konten.",
      });
    }
  };

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
              <CalendarDays className="w-4 h-4" />
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
              <Table className="w-4 h-4" />
              <span>Table List</span>
            </button>
          </div>

          <Link
            href="/ai-agent/content-generation"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-primary-container hover:opacity-95 text-on-primary rounded-xl font-label-md text-xs sm:text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
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
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="w-9 h-9 rounded-xl border border-outline-variant/40 hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors cursor-pointer"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
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
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <span className="text-sm font-medium">Memuat Content Calendar 30 Hari...</span>
        </div>
      ) : plans.length === 0 ? (
        /* Empty State */
        <div className="bg-surface-container-lowest rounded-3xl border-2 border-dashed border-outline-variant/40 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Calendar className="w-10 h-10" />
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
            <Sparkles className="w-4 h-4" />
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
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                post.status === "PUBLISHED"
                                  ? "bg-emerald-600 text-white font-extrabold"
                                  : post.status === "PUBLISHING"
                                  ? "bg-purple-600 text-white font-extrabold animate-pulse"
                                  : post.status === "SCHEDULED"
                                  ? "bg-blue-600 text-white font-extrabold"
                                  : post.status === "APPROVED"
                                  ? "bg-indigo-100 text-indigo-800"
                                  : post.status === "READY FOR APPROVAL" || post.status === "REVIEW"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : post.status === "NEEDS_REVISION"
                                  ? "bg-amber-100 text-amber-900 border border-amber-300 font-extrabold"
                                  : post.status === "GENERATING"
                                  ? "bg-amber-100 text-amber-800 animate-pulse"
                                  : "opacity-75"
                              }`}
                            >
                              {post.status === "PUBLISHED"
                                ? "✓ PUBLISHED"
                                : post.status === "PUBLISHING"
                                ? "PUBLISHING 🚀"
                                : post.status === "SCHEDULED"
                                ? "SCHEDULED 🕒"
                                : post.status === "READY FOR APPROVAL"
                                ? "READY ✓"
                                : post.status === "NEEDS_REVISION"
                                ? "REVISI ⚠️"
                                : post.status || "PLANNED"}
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
                      <span className="inline-flex items-center gap-1.5 font-semibold text-on-surface-variant">
                        {plan.format === "Carousel" ? (
                          <Layers className="w-4 h-4" />
                        ) : plan.format === "Reels" ? (
                          <Video className="w-4 h-4" />
                        ) : (
                          <ImageIcon className="w-4 h-4" />
                        )}
                        <span>{plan.format}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                          plan.status === "PUBLISHED"
                            ? "bg-emerald-600 text-white font-extrabold border-emerald-500"
                            : plan.status === "PUBLISHING"
                            ? "bg-purple-600 text-white font-extrabold border-purple-500 animate-pulse"
                            : plan.status === "SCHEDULED"
                            ? "bg-blue-600 text-white font-extrabold border-blue-500"
                            : plan.status === "APPROVED"
                            ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                            : plan.status === "READY FOR APPROVAL" || plan.status === "REVIEW"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : plan.status === "NEEDS_REVISION"
                            ? "bg-amber-100 text-amber-900 border-amber-300 font-extrabold"
                            : plan.status === "GENERATING"
                            ? "bg-amber-100 text-amber-800 border-amber-200 animate-pulse"
                            : "bg-secondary-container text-primary border-primary/20"
                        }`}
                      >
                        {plan.status === "PUBLISHED"
                          ? "✓ PUBLISHED"
                          : plan.status === "PUBLISHING"
                          ? "PUBLISHING 🚀"
                          : plan.status === "SCHEDULED"
                          ? "SCHEDULED 🕒"
                          : plan.status === "READY FOR APPROVAL"
                          ? "READY FOR APPROVAL ✓"
                          : plan.status === "NEEDS_REVISION"
                          ? "PERLU REVISI ⚠️"
                          : plan.status || "PLANNED"}
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
          POST DETAIL MODAL (LAZY GENERATION & AI REVIEWER)
          ═══════════════════════════════════════════════════════════════════ */}
      {activePost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-2xl w-full rounded-3xl border border-outline-variant/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-space-lg border-b border-outline-variant/20 bg-gradient-to-r from-surface-container-low/50 to-surface-container-lowest flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] border ${
                      activePost.status === "PUBLISHED"
                        ? "bg-emerald-600 text-white font-extrabold border-emerald-500"
                        : activePost.status === "PUBLISHING"
                        ? "bg-purple-600 text-white font-extrabold border-purple-500 animate-pulse"
                        : activePost.status === "SCHEDULED"
                        ? "bg-blue-600 text-white font-extrabold border-blue-500"
                        : activePost.status === "APPROVED"
                        ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                        : activePost.status === "READY FOR APPROVAL" || activePost.status === "REVIEW"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : activePost.status === "NEEDS_REVISION"
                        ? "bg-amber-100 text-amber-900 border-amber-300 font-extrabold"
                        : activePost.status === "GENERATING"
                        ? "bg-amber-100 text-amber-800 border-amber-200 animate-pulse"
                        : "bg-secondary-container text-primary border-primary/20"
                    }`}
                  >
                    {activePost.status === "PUBLISHED"
                      ? "✓ PUBLISHED"
                      : activePost.status === "PUBLISHING"
                      ? "PUBLISHING 🚀"
                      : activePost.status === "SCHEDULED"
                      ? "SCHEDULED 🕒"
                      : activePost.status === "NEEDS_REVISION"
                      ? "PERLU REVISI ⚠️"
                      : activePost.status || "PLANNED"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 font-bold text-[10px] border border-pink-200">
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
                onClick={() => {
                  setActivePost(null);
                  setLazyFeedback({ type: null, message: "" });
                }}
                className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-space-lg overflow-y-auto space-y-4 text-xs">
              {/* Feedback Alert if any */}
              {lazyFeedback.message && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2.5 animate-in fade-in duration-150 ${
                    lazyFeedback.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : lazyFeedback.type === "info"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-900"
                      : "bg-red-50 border-red-200 text-red-900"
                  }`}
                >
                  {lazyFeedback.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : lazyFeedback.type === "info" ? (
                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span className="font-medium flex-1">{lazyFeedback.message}</span>
                </div>
              )}

              {/* GENERATING LOADING CARD */}
              {isGeneratingLazy && (
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-300/40 text-amber-950 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                    <span>Menjalankan Lazy Generation (Parallel Worker)...</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-amber-800">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span><strong>AI Caption Agent</strong> (GPT-5.6 Luna): Menulis Hook, Caption, CTA & Hashtags...</span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-800">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                      <span><strong>AI Image Agent</strong> (GPT Image): Merender visual Instagram sesuai Brand Kit...</span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span><strong>AI Reviewer</strong>: Menilai kelayakan brand, akurasi, dan skor konten...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════
                  AI REVIEWER BOX (When Post has Caption & Image / Reviewed)
                  ═════════════════════════════════════════════════════════════ */}
              {(activePost.status === "READY FOR APPROVAL" ||
                activePost.status === "APPROVED" ||
                activePost.status === "NEEDS_REVISION" ||
                Boolean(activePost.caption || activePost.ai_review || activePost.ai_score)) && (
                (() => {
                  const currentScore = activePost.ai_review?.score || activePost.ai_score || 0;
                  const isBelowThreshold = currentScore < 80 || activePost.status === "NEEDS_REVISION" || activePost.ai_review?.status === "NEEDS_REVISION";

                  return (
                    <div
                      className={`p-4 rounded-2xl bg-surface border shadow-xs space-y-3 transition-all ${
                        isBelowThreshold
                          ? "border-amber-300/90 bg-gradient-to-br from-amber-500/10 via-surface to-surface"
                          : "border-emerald-200/80 bg-gradient-to-br from-emerald-500/5 via-surface to-surface"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between border-b border-outline-variant/20 pb-2.5 gap-2">
                        <div className="flex items-center gap-2">
                          {isBelowThreshold ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          ) : (
                            <BadgeCheck className="w-4 h-4 text-emerald-600" />
                          )}
                          <span className="font-bold text-on-surface text-sm">AI Review & Quality Score</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isBelowThreshold && (
                            <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                              Di Bawah Ambang Batas (Min: 80)
                            </span>
                          )}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-white font-mono font-bold text-xs shadow-2xs ${
                              isBelowThreshold ? "bg-amber-600" : "bg-emerald-600"
                            }`}
                          >
                            {currentScore || 70}/100
                          </span>
                        </div>
                      </div>

                      {/* Reviewer Checklist items */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {(
                          activePost.ai_review?.checks || [
                            { label: "Brand aligned", passed: true },
                            { label: "Good hook", passed: true },
                            { label: "Clear CTA", passed: true },
                            { label: "Suitable visual", passed: Boolean(activePost.media_url) },
                          ]
                        ).map((chk: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5 font-medium text-on-surface">
                            {chk.passed ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-amber-500" />
                            )}
                            <span>{chk.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Detected Issues if below threshold */}
                      {activePost.ai_review?.issues && activePost.ai_review.issues.length > 0 && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-300/80 text-amber-950 text-xs space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-amber-900">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Catatan Evaluasi (Perlu Direvisi):</span>
                          </div>
                          <ul className="list-disc list-inside space-y-0.5 text-amber-900/90 text-[11px]">
                            {activePost.ai_review.issues.map((issue, idx) => (
                              <li key={idx}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Suggestions if any */}
                      {activePost.ai_review?.suggestions && activePost.ai_review.suggestions.length > 0 && (
                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-200 text-blue-950 text-xs space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-blue-900">
                            <Lightbulb className="w-3.5 h-3.5 text-blue-600" />
                            <span>Rekomendasi Perbaikan AI:</span>
                          </div>
                          <ul className="list-disc list-inside space-y-0.5 text-blue-900/90 text-[11px]">
                            {activePost.ai_review.suggestions.map((sug, idx) => (
                              <li key={idx}>{sug}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* REVISION ACTION BUTTON: TAMPIL JIKA DI BAWAH AMBANG BATAS */}
                      {isBelowThreshold && (
                        <div className="pt-2.5 border-t border-outline-variant/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                          <div className="text-[11px] text-amber-800 font-medium flex items-center gap-1.5">
                            <Wand2 className="w-4 h-4 text-amber-600" />
                            <span>AI dapat merevisi hook, isi, dan CTA agar lolos ambang batas.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleTriggerRevision(activePost.id!)}
                            disabled={isRevising || isGeneratingLazy}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                          >
                            <Wand2 className={`w-3.5 h-3.5 ${isRevising ? "animate-spin" : ""}`} />
                            <span>{isRevising ? "Sedang Merevisi..." : "🤖 Revisi Konten (AI)"}</span>
                          </button>
                        </div>
                      )}

                      {/* Status Banner */}
                      <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-xs">
                        <span className="text-outline font-medium">Status Konten:</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] tracking-wide uppercase ${
                            activePost.status === "APPROVED"
                              ? "bg-indigo-600 text-white"
                              : activePost.status === "READY FOR APPROVAL"
                              ? "bg-emerald-600 text-white"
                              : activePost.status === "NEEDS_REVISION"
                              ? "bg-amber-600 text-white"
                              : "bg-slate-600 text-white"
                          }`}
                        >
                          {activePost.status === "APPROVED"
                            ? "APPROVED (SIAP TERBIT)"
                            : activePost.status === "READY FOR APPROVAL"
                            ? "READY FOR APPROVAL ✓"
                            : activePost.status === "NEEDS_REVISION"
                            ? "PERLU REVISI ⚠️"
                            : activePost.status || "DRAFT"}
                        </span>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Zernio Scheduled Banner */}
              {activePost.status === "SCHEDULED" && (
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div>
                    <div className="font-bold flex items-center gap-1.5 text-blue-900 text-xs">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>Terjadwal Otomatis di Zernio (Instagram):</span>
                    </div>
                    <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                      Postingan akan otomatis terbit ke Instagram pada <strong>{activePost.scheduledDate} {activePost.scheduledTime} WIB</strong>.
                      {activePost.zernio_post_id && (
                        <span className="block font-mono text-[10px] text-blue-600/90 mt-0.5">
                          Zernio ID: {activePost.zernio_post_id}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRepublishPost(activePost.id!)}
                      disabled={isRepublishing || isSimulatingWebhook}
                      className="px-3 py-1.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-100/50 text-blue-900 font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Hapus jadwal lama di Zernio dan kirim ulang dengan data terbaru"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isRepublishing ? "animate-spin" : ""}`} />
                      <span>{isRepublishing ? "Menjadwalkan Ulang..." : "🔄 Publish Ulang"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSimulateWebhook(activePost.id!)}
                      disabled={isSimulatingWebhook || isRepublishing}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                      title="Simulasikan Zernio mengirimkan webhook bahwa konten telah terbit"
                    >
                      <Send className={`w-3.5 h-3.5 ${isSimulatingWebhook ? "animate-spin" : ""}`} />
                      <span>{isSimulatingWebhook ? "Menerbitkan..." : "⚡ Test Webhook Publish"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Zernio Published Banner */}
              {activePost.status === "PUBLISHED" && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                        <span>✓ Telah Terbit di Instagram</span>
                        <span className="px-2 py-0.2 rounded-full bg-emerald-200/70 text-emerald-800 text-[10px] font-mono font-bold">
                          PUBLISHED
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        Konten telah berhasil dipublikasikan via infrastruktur Zernio.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRepublishPost(activePost.id!)}
                    disabled={isRepublishing}
                    className="px-3.5 py-1.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-100/60 text-emerald-900 font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                    title="Hapus postingan lama dan jadwalkan ulang ke Zernio"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRepublishing ? "animate-spin" : ""}`} />
                    <span>{isRepublishing ? "Menerbitkan Ulang..." : "🔄 Publish Ulang"}</span>
                  </button>
                </div>
              )}

              {/* Sub-status: Caption ✓ | Image ✓ */}
              {(activePost.caption || activePost.media_url) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                      activePost.caption
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {activePost.caption ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Hourglass className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>Caption {activePost.caption ? "✓" : "..."}</span>
                  </span>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                      activePost.media_url
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : activePost.image_status === "FAILED"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : activePost.image_status === "GENERATING"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {activePost.media_url ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : activePost.image_status === "FAILED" ? (
                      <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    ) : activePost.image_status === "GENERATING" ? (
                      <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                    ) : (
                      <Hourglass className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>
                      Image{" "}
                      {activePost.media_url
                        ? "✓"
                        : activePost.image_status === "FAILED"
                        ? "Gagal"
                        : activePost.image_status === "GENERATING"
                        ? "Sedang Dibuat..."
                        : "..."}
                    </span>
                  </span>

                  {/* Refresh Image Button directly in Sub-Status */}
                  {(activePost.image_status === "FAILED" || (!activePost.media_url && Boolean(activePost.caption))) && (
                    <button
                      type="button"
                      onClick={() => handleRetryImage(activePost.id!)}
                      disabled={isRetryingImage || isGeneratingLazy}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-2xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Request ulang pembuatan gambar"
                    >
                      <RotateCw className={`w-3 h-3 ${isRetryingImage ? "animate-spin" : ""}`} />
                      <span>{isRetryingImage ? "Memproses..." : "Request Ulang Image"}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Generation Error Banner with Retry Button */}
              {(activePost.generation_error || activePost.image_status === "FAILED") && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-200 text-red-950 text-xs space-y-2 animate-in fade-in duration-150">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-bold flex items-center gap-1.5 text-red-800">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span>Generasi Gambar Gagal:</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRetryImage(activePost.id!)}
                      disabled={isRetryingImage || isGeneratingLazy}
                      className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isRetryingImage ? "animate-spin" : ""}`} />
                      <span>{isRetryingImage ? "Sedang Memproses..." : "Request Ulang Image"}</span>
                    </button>
                  </div>
                  {activePost.generation_error && (
                    <p className="text-[11px] leading-relaxed text-red-900 font-mono break-all bg-white/70 p-2.5 rounded-xl border border-red-200/60">
                      {activePost.generation_error}
                    </p>
                  )}
                </div>
              )}

              {/* Visual Image Rendered by GPT Image / Multi-slide Carousel */}
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
                    <button
                      type="button"
                      onClick={() => handleRetryImage(activePost.id!)}
                      disabled={isRetryingImage || isGeneratingLazy}
                      className="text-[11px] text-primary hover:text-primary/80 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                      title={activePost.format?.toLowerCase() === "carousel" ? "Generate ulang semua slide carousel" : "Generate ulang gambar ini"}
                    >
                      <RotateCw className={`w-3 h-3 ${isRetryingImage ? "animate-spin" : ""}`} />
                      <span>{isRetryingImage ? "Memproses..." : "Ganti / Request Ulang"}</span>
                    </button>
                  </div>

                  {/* Multi-Slide Carousel Viewer */}
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

                      const currentIndex = Math.min(activeCarouselSlideIndex, slides.length - 1);
                      const currentSlide = slides[currentIndex] || slides[0];

                      return (
                        <div className="space-y-2">
                          <div className="relative rounded-2xl overflow-hidden border border-outline-variant/30 bg-black/5 aspect-square max-h-80 w-full flex items-center justify-center shadow-xs group">
                            <img
                              src={currentSlide.imageUrl}
                              alt={currentSlide.title || `Slide ${currentIndex + 1}`}
                              className="w-full h-full object-cover transition-all duration-300"
                            />

                            {/* Slide Counter Overlay */}
                            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-mono font-bold shadow-md">
                              Slide {currentIndex + 1} / {slides.length}
                            </div>

                            {/* Slide Title Overlay */}
                            {currentSlide.title && (
                              <div className="absolute bottom-3 left-3 right-3 px-3 py-1.5 rounded-xl bg-black/65 backdrop-blur-xs text-white text-[11px] font-medium shadow-md truncate">
                                {currentSlide.title}
                              </div>
                            )}

                            {/* Left Prev Button */}
                            {slides.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setActiveCarouselSlideIndex((prev) => (prev > 0 ? prev - 1 : slides.length - 1))}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-on-surface shadow-md flex items-center justify-center cursor-pointer transition-all opacity-80 hover:opacity-100"
                                title="Slide sebelumnya"
                              >
                                ‹
                              </button>
                            )}

                            {/* Right Next Button */}
                            {slides.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setActiveCarouselSlideIndex((prev) => (prev < slides.length - 1 ? prev + 1 : 0))}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-on-surface shadow-md flex items-center justify-center cursor-pointer transition-all opacity-80 hover:opacity-100"
                                title="Slide berikutnya"
                              >
                                ›
                              </button>
                            )}
                          </div>

                          {/* Slide Thumbnails Selector */}
                          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                            {slides.map((s, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setActiveCarouselSlideIndex(idx)}
                                className={`relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                                  idx === currentIndex
                                    ? "border-primary ring-2 ring-primary/30 scale-105"
                                    : "border-outline-variant/30 opacity-70 hover:opacity-100"
                                }`}
                              >
                                <img src={s.imageUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
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
                    /* Single Image Preview (Standard Feed/Reels/Story) */
                    <div className="rounded-2xl overflow-hidden border border-outline-variant/30 bg-black/5 aspect-square max-h-80 w-full flex items-center justify-center shadow-xs">
                      <img
                        src={activePost.media_url!}
                        alt={activePost.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              ) : (
                activePost.status !== "PLANNED" && !isGeneratingLazy && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-outline uppercase tracking-wider text-[10px] flex items-center justify-between">
                      <span>Visual Instagram</span>
                      <span className="text-red-600 font-semibold">
                        {activePost.image_status === "FAILED" ? "Gagal Dibuat" : "Belum Ada Gambar"}
                      </span>
                    </label>
                    <div className="rounded-2xl border-2 border-dashed border-red-200/80 bg-red-50/20 p-6 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                        {isRetryingImage ? (
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        ) : (
                          <ImageOff className="w-6 h-6" />
                        )}
                      </div>
                      <div className="space-y-1 max-w-sm">
                        <p className="font-bold text-on-surface text-xs">
                          {isRetryingImage
                            ? "Sedang memproses ulang visual..."
                            : activePost.image_status === "FAILED"
                            ? "Gambar Instagram Gagal Dibuat"
                            : "Gambar Belum Tersedia"}
                        </p>
                        <p className="text-[11px] text-outline leading-relaxed">
                          {isRetryingImage
                            ? "AI Image Agent sedang menghasilkan visual baru dari OpenAI..."
                            : "Klik tombol di bawah untuk meminta AI menghasilkan gambar ulang untuk postingan ini."}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRetryImage(activePost.id!)}
                        disabled={isRetryingImage || isGeneratingLazy}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${isRetryingImage ? "animate-spin" : ""}`} />
                        <span>{isRetryingImage ? "Sedang Memproses..." : "Request Ulang Image"}</span>
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Full Caption generated by GPT-5.6 Luna */}
              {activePost.caption && (
                <div className="space-y-1.5">
                  <label className="font-bold text-outline uppercase tracking-wider text-[10px] flex items-center justify-between">
                    <span>Caption Instagram Final</span>
                    <span className="text-primary font-normal lowercase">Model: 5.6 Luna</span>
                  </label>
                  <div className="p-3.5 rounded-2xl bg-surface border border-outline-variant/20 text-on-surface whitespace-pre-wrap leading-relaxed text-xs max-h-56 overflow-y-auto">
                    {activePost.caption}
                  </div>
                </div>
              )}

              {/* Hashtags Chips */}
              {activePost.hashtags && activePost.hashtags.length > 0 && (
                <div className="space-y-1">
                  <label className="font-bold text-outline uppercase tracking-wider text-[10px]">
                    Hashtags ({activePost.hashtags.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {activePost.hashtags.map((tag: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-surface-container text-primary font-mono text-[10px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════
                  LAZY GENERATION CONTENT BRIEF (Initial Brief)
                  ═════════════════════════════════════════════════════════════ */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-on-surface text-xs uppercase tracking-wider text-outline">
                    Content Brief
                  </span>
                  {activePost.status === "PLANNED" && (
                    <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Lazy Generation H-1</span>
                    </span>
                  )}
                </div>

                {/* Hook */}
                <div className="space-y-1">
                  <label className="font-bold text-outline uppercase tracking-wider text-[10px]">
                    Opening Hook Brief
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
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-outline-variant/20 bg-surface flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Pillar info & Image Quality selector */}
              <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
                <span className="text-[11px] text-outline">
                  Pilar: <strong>{activePost.pillar}</strong> ({activePost.content_type})
                </span>

                {/* Inline Quality Selector for Lazy Generation */}
                <div className="flex items-center gap-1.5 bg-surface-container/60 border border-outline-variant/30 px-2.5 py-1 rounded-xl text-xs">
                  <span className="text-[10px] text-outline font-bold uppercase tracking-wider flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-primary" />
                    Quality:
                  </span>
                  <div className="flex items-center gap-0.5">
                    {(["low", "medium", "high", "auto"] as const).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setModalQuality(q)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold capitalize transition-all cursor-pointer ${
                          modalQuality === q
                            ? "bg-primary text-on-primary shadow-xs"
                            : "text-outline hover:text-on-surface"
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                {/* Button for PLANNED state */}
                {activePost.status === "PLANNED" && (
                  <button
                    type="button"
                    onClick={() => handleTriggerLazyGen(activePost.id!)}
                    disabled={isGeneratingLazy}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>⚡ Generate Caption & Image (Lazy Gen)</span>
                  </button>
                )}

                {/* Button to Retry Image when image failed or missing */}
                {(activePost.image_status === "FAILED" || (!activePost.media_url && Boolean(activePost.caption))) && (
                  <button
                    type="button"
                    onClick={() => handleRetryImage(activePost.id!)}
                    disabled={isRetryingImage || isGeneratingLazy}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRetryingImage ? "animate-spin" : ""}`} />
                    <span>{isRetryingImage ? "Memproses..." : "Request Ulang Image"}</span>
                  </button>
                )}

                {/* Button for NEEDS_REVISION state or below threshold */}
                {(activePost.status === "NEEDS_REVISION" ||
                  (activePost.ai_score && activePost.ai_score < 80) ||
                  activePost.ai_review?.status === "NEEDS_REVISION") && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleTriggerRevision(activePost.id!)}
                      disabled={isRevising || isGeneratingLazy}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Wand2 className={`w-3.5 h-3.5 ${isRevising ? "animate-spin" : ""}`} />
                      <span>{isRevising ? "Sedang Merevisi..." : "🤖 Revisi Konten (AI)"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApprovePost(activePost.id!)}
                      disabled={isApproving || isRevising}
                      className="px-3 py-2 rounded-xl border border-outline-variant/40 hover:bg-surface text-outline hover:text-on-surface text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Setujui meskipun skor di bawah rekomendasi"
                    >
                      <span>Tetap Approve</span>
                    </button>
                  </>
                )}

                {/* Button for READY FOR APPROVAL state */}
                {activePost.status === "READY FOR APPROVAL" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleTriggerLazyGen(activePost.id!)}
                      disabled={isGeneratingLazy}
                      className="px-3 py-2 rounded-xl border border-outline-variant/40 hover:bg-surface text-outline hover:text-on-surface text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Regenerate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApprovePost(activePost.id!)}
                      disabled={isApproving}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isApproving ? "Menyetujui..." : "✓ Approve & Jadwalkan Zernio"}</span>
                    </button>
                  </>
                )}

                {/* Button for SCHEDULED state */}
                {activePost.status === "SCHEDULED" && (
                  <button
                    type="button"
                    onClick={() => handleSimulateWebhook(activePost.id!)}
                    disabled={isSimulatingWebhook || isRepublishing}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Simulasikan penerimaan webhook dari Zernio bahwa konten telah terbit ke Instagram"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSimulatingWebhook ? "animate-spin" : ""}`} />
                    <span>{isSimulatingWebhook ? "Menerbitkan..." : "⚡ Test Webhook Publish"}</span>
                  </button>
                )}

                {/* Button for REPUBLISH (Publish Ulang) on SCHEDULED / PUBLISHED / FAILED */}
                {(activePost.status === "SCHEDULED" || activePost.status === "PUBLISHED" || activePost.status === "FAILED" || Boolean(activePost.zernio_post_id)) && (
                  <button
                    type="button"
                    onClick={() => handleRepublishPost(activePost.id!)}
                    disabled={isRepublishing || isSimulatingWebhook}
                    className="px-3.5 py-2 rounded-xl border border-outline-variant/40 bg-surface hover:bg-surface-container text-on-surface font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Hapus jadwal/post sebelumnya di Zernio dan kirim jadwal baru dengan media terbaru"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRepublishing ? "animate-spin" : ""}`} />
                    <span>{isRepublishing ? "Menjadwalkan Ulang..." : "🔄 Publish Ulang (Zernio)"}</span>
                  </button>
                )}

                {/* Display tag for PUBLISHED state */}
                {activePost.status === "PUBLISHED" && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                    <BadgeCheck className="w-4 h-4 text-emerald-600" />
                    <span>✓ Published on Instagram</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setActivePost(null);
                    setLazyFeedback({ type: null, message: "" });
                  }}
                  className="px-4 py-2 rounded-xl border border-outline-variant/30 text-outline hover:text-on-surface hover:bg-surface-container font-semibold text-xs transition-colors cursor-pointer"
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
