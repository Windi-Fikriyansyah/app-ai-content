"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Menu,
  Search,
  Bell,
  HelpCircle,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  getAutoApproveAction,
  toggleAutoApproveAction,
} from "@/app/(dashboard)/auto-approve-actions";

interface TopNavbarProps {
  onMenuClick?: () => void;
}

export default function TopNavbar({ onMenuClick }: TopNavbarProps) {
  const [isAutoApprove, setIsAutoApprove] = useState<boolean>(false);
  const [isLoadingSetting, setIsLoadingSetting] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();

  // Load initial auto-approve state
  useEffect(() => {
    let mounted = true;
    async function loadSetting() {
      try {
        const res = await getAutoApproveAction();
        if (mounted && res.success) {
          setIsAutoApprove(Boolean(res.enabled));
        }
      } catch (err) {
        console.warn("Failed to load auto-approve setting:", err);
      } finally {
        if (mounted) setIsLoadingSetting(false);
      }
    }
    loadSetting();

    const handleExternalChange = (e: any) => {
      if (typeof e.detail?.enabled === "boolean") {
        setIsAutoApprove(e.detail.enabled);
      }
    };

    window.addEventListener("auto-approve-changed", handleExternalChange);
    return () => {
      mounted = false;
      window.removeEventListener("auto-approve-changed", handleExternalChange);
    };
  }, []);

  const handleToggle = () => {
    if (isPending) return;
    const nextState = !isAutoApprove;
    // Optimistic UI update
    setIsAutoApprove(nextState);

    // Notify other components on the page
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("auto-approve-changed", {
          detail: { enabled: nextState },
        })
      );
    }

    startTransition(async () => {
      const res = await toggleAutoApproveAction(nextState);
      if (!res.success) {
        // Revert on failure
        setIsAutoApprove(!nextState);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("auto-approve-changed", {
              detail: { enabled: !nextState },
            })
          );
        }
      }
    });
  };

  return (
    <header className="h-16 flex items-center justify-between px-3 sm:px-4 lg:px-gutter-desktop w-full border-b border-outline-variant/30 bg-surface-container-lowest/85 backdrop-blur-md z-40 sticky top-0 gap-2">
      {/* Search Input Area & Mobile Hamburger */}
      <div className="flex items-center gap-2 sm:gap-space-md flex-1 max-w-lg">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-outline hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors shrink-0 cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
          <input
            className="w-full pl-9 pr-10 sm:pr-14 py-2 bg-surface rounded-lg border border-outline-variant/40 text-body-md font-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-xs sm:text-sm transition-all"
            placeholder="Cari konten, prompt, workflow..."
            type="text"
          />
          <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-surface-container-lowest border border-outline-variant/50 rounded font-code-sm text-[10px] text-outline shadow-xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Header Actions Cluster */}
      <div className="flex items-center gap-2 sm:gap-space-md shrink-0">
        {/* Auto-Approve Header Toggle Switch */}
        <div
          className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full border transition-all duration-300 select-none shadow-xs ${
            isAutoApprove
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
              : "bg-surface-container/60 border-outline-variant/40 text-on-surface-variant hover:border-outline-variant/70"
          }`}
          title={
            isAutoApprove
              ? "Auto-Approve Aktif: Konten yang lolos AI Review (skor ≥80) langsung disetujui otomatis tanpa perlu persetujuan manual."
              : "Auto-Approve Nonaktif: Konten yang lolos AI Review akan menunggu persetujuan Anda (READY FOR APPROVAL)."
          }
        >
          <button
            type="button"
            onClick={handleToggle}
            disabled={isLoadingSetting || isPending}
            className="flex items-center gap-1.5 sm:gap-2 text-xs font-medium focus:outline-none cursor-pointer group"
            aria-label="Toggle Auto-Approve"
            aria-pressed={isAutoApprove}
          >
            <div className="relative flex items-center justify-center">
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-outline" />
              ) : (
                <Sparkles
                  className={`w-3.5 h-3.5 transition-transform duration-300 ${
                    isAutoApprove
                      ? "text-emerald-500 animate-pulse scale-110"
                      : "text-outline group-hover:text-on-surface"
                  }`}
                />
              )}
            </div>

            <span className="hidden md:inline-block font-semibold tracking-tight">
              Auto-Approve
            </span>

            {/* Status badge pill */}
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none transition-colors ${
                isAutoApprove
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
                  : "bg-surface-container-highest text-outline"
              }`}
            >
              {isAutoApprove ? "Aktif" : "Manual"}
            </span>

            {/* Switch Pill Track & Thumb */}
            <div
              className={`relative inline-flex h-4.5 sm:h-5 w-8 sm:w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                isAutoApprove ? "bg-emerald-500" : "bg-outline-variant/60 group-hover:bg-outline-variant/80"
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-3.5 sm:h-4 w-3.5 sm:w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                  isAutoApprove ? "translate-x-3.5 sm:translate-x-4" : "translate-x-0"
                }`}
              />
            </div>
          </button>
        </div>

        {/* Trailing Icon Actions: Notifications & Help */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <Link
            href="/notifications"
            className="relative p-2 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            title="Pengaturan Notifikasi Email"
            aria-label="Pengaturan Notifikasi"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-surface-container-lowest" />
          </Link>
          <button
            className="hidden sm:inline-flex p-2 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            title="Help Center"
            aria-label="Help Center"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
