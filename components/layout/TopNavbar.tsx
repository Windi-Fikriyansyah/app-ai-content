"use client";

import React from "react";
import {
  Menu,
  Search,
  Bell,
  HelpCircle,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

interface TopNavbarProps {
  onMenuClick?: () => void;
}

export default function TopNavbar({ onMenuClick }: TopNavbarProps) {
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
      <div className="flex items-center gap-1 sm:gap-space-md shrink-0">
        {/* Trailing Icon Actions: Notifications & Help */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            className="relative p-2 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            title="Notifikasi"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-error text-white font-label-sm text-[9px] sm:text-[10px] rounded-full flex items-center justify-center font-bold">
              3
            </span>
          </button>
          <button
            className="hidden sm:inline-flex p-2 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            title="Help Center"
            aria-label="Help Center"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="hidden sm:block h-6 w-px bg-outline-variant/40 mx-1"></div>

        {/* Secondary CTA: Buat Workflow Baru */}
        <button className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg border border-outline-variant/50 bg-surface-container-lowest hover:bg-surface text-on-surface font-label-md text-label-md shadow-xs transition-all cursor-pointer">
          <SlidersHorizontal className="w-4 h-4 text-outline" />
          <span>+ Buat Workflow</span>
        </button>

        {/* Trailing Primary Action: AI Generate Button */}
        <button className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-lg font-label-md text-label-md shadow-sm hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">AI Generate</span>
        </button>
      </div>
    </header>
  );
}
