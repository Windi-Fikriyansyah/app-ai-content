"use client";

import React from "react";

interface TopNavbarProps {
  onMenuClick?: () => void;
}

export default function TopNavbar({ onMenuClick }: TopNavbarProps) {
  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-gutter-desktop w-full border-b border-outline-variant/30 bg-surface-container-lowest/85 backdrop-blur-md z-40 sticky top-0">
      {/* Search Input Area & Mobile Hamburger */}
      <div className="flex items-center gap-space-sm sm:gap-space-md w-full max-w-lg">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-outline hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>

        {/* Global Search Bar */}
        <div className="relative w-full">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg"
            data-icon="search"
          >
            search
          </span>
          <input
            className="w-full pl-9 pr-14 py-2 bg-surface rounded-lg border border-outline-variant/40 text-body-md font-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all"
            placeholder="Cari konten, prompt, workflow, atau analitik..."
            type="text"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-surface-container-lowest border border-outline-variant/50 rounded font-code-sm text-[10px] text-outline shadow-xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Header Actions Cluster */}
      <div className="flex items-center gap-space-xs sm:gap-space-md">
        {/* Trailing Icon Actions: Notifications & Help */}
        <div className="flex items-center gap-1">
          <button
            className="relative p-2 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-xl" data-icon="notifications">
              notifications
            </span>
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-error text-white font-label-sm text-[10px] rounded-full flex items-center justify-center font-bold">
              3
            </span>
          </button>
          <button
            className="p-2 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
            title="Help Center"
          >
            <span className="material-symbols-outlined text-xl" data-icon="help">
              help
            </span>
          </button>
        </div>

        <div className="hidden sm:block h-6 w-px bg-outline-variant/40 mx-1"></div>

        {/* Secondary CTA: Buat Workflow Baru */}
        <button className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg border border-outline-variant/50 bg-surface-container-lowest hover:bg-surface text-on-surface font-label-md text-label-md shadow-xs transition-all">
          <span className="material-symbols-outlined text-base text-outline" data-icon="tune">
            tune
          </span>
          <span>+ Buat Workflow Baru</span>
        </button>

        {/* Trailing Primary Action: AI Generate Button */}
        <button className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-lg font-label-md text-label-md shadow-sm hover:opacity-95 active:scale-[0.98] transition-all">
          <span className="material-symbols-outlined text-base" data-icon="auto_awesome">
            auto_awesome
          </span>
          <span className="hidden sm:inline">AI Generate</span>
        </button>
      </div>
    </header>
  );
}
