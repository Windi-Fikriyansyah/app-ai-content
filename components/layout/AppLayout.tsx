"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="h-full bg-surface text-on-surface antialiased flex overflow-hidden">
      {/* 1. Left Collapsible / Static Sidebar Rail */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* 2. Main Application Content Canvas */}
      <div className="lg:ml-sidebar-width flex-1 flex flex-col h-screen overflow-hidden w-full">
        {/* Top Sticky Navigation App Bar */}
        <TopNavbar onMenuClick={() => setIsMobileMenuOpen(true)} />

        {/* Scrollable Page Content Canvas */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-gutter-desktop py-space-lg space-y-space-xl bg-surface">
          {children}
        </main>
      </div>
    </div>
  );
}
