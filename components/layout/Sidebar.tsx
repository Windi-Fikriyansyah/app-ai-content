"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutUser } from "@/app/(onboarding)/onboarding/actions";
import {
  Sparkles,
  X,
  ChevronsUpDown,
  LayoutDashboard,
  Bot,
  FileEdit,
  Sliders,
  Activity,
  ChevronDown,
  Calendar,
  FolderOpen,
  Share2,
  BarChart3,
  Settings,
  Zap,
  BookOpen,
  Terminal,
  LogOut,
  LucideIcon,
} from "lucide-react";

interface SubNavItem {
  name: string;
  icon: LucideIcon;
  href: string;
  hasPulse?: boolean;
}

interface NavItem {
  name: string;
  icon: LucideIcon;
  href?: string;
  exact?: boolean;
  isAccordion?: boolean;
  subItems?: SubNavItem[];
  badge?: string;
  socialTags?: string[];
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  // Default tertutup saat halaman di-refresh, hanya terbuka jika user memang sedang membuka halaman /ai-agent
  const [isAiAgentOpen, setIsAiAgentOpen] = useState(() => pathname.startsWith("/ai-agent"));

  const navItems: NavItem[] = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      href: "/",
      exact: true,
    },
    {
      name: "AI Agent",
      icon: Bot,
      isAccordion: true,
      subItems: [
        {
          name: "Content Generation",
          icon: FileEdit,
          href: "/ai-agent/content-generation",
        },
        {
          name: "Automation",
          icon: Sliders,
          href: "/ai-agent/automation",
        },
        {
          name: "Agent Activity",
          icon: Activity,
          href: "/ai-agent/activity",
          hasPulse: true,
        },
      ],
    },
    {
      name: "Content Calendar",
      icon: Calendar,
      href: "/content-calendar",
      badge: "14",
    },
    {
      name: "Content Library",
      icon: FolderOpen,
      href: "/content-library",
    },
    {
      name: "Social Accounts",
      icon: Share2,
      href: "/social-accounts",
      socialTags: ["IG", "in", "𝕏"],
    },
    {
      name: "Analytics",
      icon: BarChart3,
      href: "/analytics",
    },
    {
      name: "Settings",
      icon: Settings,
      href: "/settings",
    },
  ];

  const isLinkActive = (href: string, exact = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Rail Container */}
      <aside
        className={`fixed top-0 left-0 h-screen w-sidebar-width flex flex-col justify-between border-r border-outline-variant/30 bg-surface-container-lowest z-50 overflow-hidden select-none transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Scrollable Navigation & Workspace Cluster */}
        <div className="flex-1 overflow-y-auto p-space-base flex flex-col gap-space-lg">
          {/* Brand Logo Header */}
          <div className="flex items-center justify-between px-space-xs">
            <Link href="/" className="flex items-center gap-space-sm group">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-sm ring-2 ring-primary/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight block leading-tight">
                  AutoContent AI
                </span>
                <span className="font-code-sm text-code-sm text-outline tracking-tight">
                  v3.4 · Autonomous
                </span>
              </div>
            </Link>

            {/* Mobile Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-1.5 text-outline hover:text-on-surface rounded-md hover:bg-surface transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Workspace Selector Dropdown Pill */}
          <div className="p-space-sm rounded-lg bg-surface border border-outline-variant/40 flex items-center justify-between hover:border-primary/40 cursor-pointer transition-all">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="w-6 h-6 rounded bg-primary-container/20 text-primary flex items-center justify-center font-bold text-xs">
                AL
              </div>
              <div className="truncate">
                <div className="font-label-md text-label-md text-on-surface truncate">
                  Acme Media Lab
                </div>
                <div className="font-label-sm text-label-sm text-outline flex items-center gap-1">
                  <span>Enterprise Tier</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container inline-block"></span>
                </div>
              </div>
            </div>
            <ChevronsUpDown className="w-4 h-4 text-outline shrink-0" />
          </div>

          {/* Navigation Tabs (9 Items) */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const ItemIcon = item.icon;

              if (item.isAccordion && item.subItems) {
                const isAnySubActive = item.subItems.some((sub) =>
                  pathname.startsWith(sub.href)
                );

                return (
                  <div key={item.name} className="flex flex-col">
                    <button
                      onClick={() => setIsAiAgentOpen(!isAiAgentOpen)}
                      type="button"
                      className={`w-full rounded-lg px-space-md py-space-sm flex items-center justify-between transition-colors group cursor-pointer ${
                        isAnySubActive
                          ? "text-primary font-semibold"
                          : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                      }`}
                    >
                      <div className="flex items-center gap-space-sm">
                        <ItemIcon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isAnySubActive
                              ? "text-primary"
                              : "text-outline group-hover:text-primary"
                          }`}
                        />
                        <span className="font-label-md text-label-md">
                          {item.name}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-outline shrink-0 transition-transform duration-200 ${
                          isAiAgentOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Sub-items Accordion Tree */}
                    {isAiAgentOpen && (
                      <div className="ml-6 pl-3 border-l border-outline-variant/40 flex flex-col gap-1 my-1">
                        {item.subItems.map((sub) => {
                          const SubIcon = sub.icon;
                          const subActive = isLinkActive(sub.href);
                          return (
                            <Link
                              key={sub.name}
                              href={sub.href}
                              onClick={onClose}
                              className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors ${
                                subActive
                                  ? "bg-secondary-container text-primary font-semibold"
                                  : "text-on-surface-variant hover:bg-surface hover:text-primary"
                              }`}
                            >
                              <div className="flex items-center gap-space-sm">
                                <SubIcon
                                  className={`w-4 h-4 shrink-0 ${
                                    sub.hasPulse
                                      ? "text-tertiary"
                                      : subActive
                                      ? "text-primary"
                                      : "text-outline"
                                  }`}
                                />
                                <span className="font-label-sm text-label-sm">
                                  {sub.name}
                                </span>
                              </div>
                              {sub.hasPulse && (
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const active = item.href ? isLinkActive(item.href, item.exact) : false;

              return (
                <Link
                  key={item.name}
                  href={item.href || "#"}
                  onClick={onClose}
                  className={`rounded-lg px-space-md py-space-sm flex items-center justify-between transition-all ${
                    active
                      ? "bg-secondary-container text-primary font-semibold border-l-4 border-primary"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <div className="flex items-center gap-space-sm">
                    <ItemIcon
                      className={`w-4 h-4 shrink-0 ${
                        active ? "text-primary" : "text-outline"
                      }`}
                    />
                    <span className="font-label-md text-label-md">
                      {item.name}
                    </span>
                  </div>

                  {/* Active dot indicator */}
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  )}

                  {/* Badge count */}
                  {item.badge && !active && (
                    <span className="font-code-sm text-[10px] px-1.5 py-0.5 rounded bg-surface-variant text-on-surface-variant font-medium">
                      {item.badge}
                    </span>
                  )}

                  {/* Social tags pills */}
                  {item.socialTags && !active && (
                    <div className="flex items-center -space-x-1">
                      <span className="w-4 h-4 rounded-full bg-pink-100 text-pink-600 border border-white text-[9px] font-bold flex items-center justify-center">
                        IG
                      </span>
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 border border-white text-[9px] font-bold flex items-center justify-center">
                        in
                      </span>
                      <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-800 border border-white text-[9px] font-bold flex items-center justify-center">
                        𝕏
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Fixed Sidebar Bottom Hub & Footers */}
        <div className="p-space-base pt-space-md border-t border-outline-variant/30 bg-surface-container-lowest shrink-0 flex flex-col gap-space-base shadow-xs">
          {/* AI Credits Consumption Card */}
          <div className="p-space-sm rounded-lg bg-surface border border-outline-variant/40 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span className="font-label-sm text-label-sm text-on-surface">AI Credits</span>
              </div>
              <span className="font-code-sm text-code-sm text-primary font-semibold">84.5%</span>
            </div>
            <div className="w-full bg-outline-variant/30 h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all" style={{ width: "84.5%" }}></div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-label-sm text-outline">
              <span>8,450 / 10,000 used</span>
              <a href="#" className="text-primary hover:underline">
                Top-up
              </a>
            </div>
          </div>

          {/* Ancillary Docs Links */}
          <div className="flex items-center justify-between text-xs px-1 text-outline">
            <a href="#" className="flex items-center gap-1.5 hover:text-on-surface transition-colors">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="font-label-sm text-label-sm">Docs & Support</span>
            </a>
            <a href="#" className="flex items-center gap-1.5 hover:text-on-surface transition-colors">
              <Terminal className="w-3.5 h-3.5" />
              <span className="font-label-sm text-label-sm">API Status</span>
            </a>
          </div>

          {/* User Profile Card */}
          <div className="pt-space-xs flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <div className="relative w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/40 flex items-center justify-center font-bold text-xs text-primary overflow-hidden">
                <img
                  className="w-full h-full object-cover"
                  alt="Alex Morgan profile portrait"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqjd4YGt5_tG3aTThJNvaH3G9U_ZBXl-ZCUOpKgRVBhAlQnxm7WSVqYpvoOcmjM2sUru8zJbQ9Ux8YBfCQ4uGz7wGcgMnwcmZT9CKdgTNo4UMpQG8yqQdKiaaBke_8vioyB3eIav9KXYbyjX81d3SBekdQLNtkCRDkTpqsAd1axHITLS9vDfk6kDHYsB8RWSLq_2xF9KIHIuxaQl2y6kWXCMS2RARZlVigSKnw4jQCsIqo0usATS_M"
                />
              </div>
              <div className="truncate">
                <p className="font-label-md text-label-md text-on-surface leading-tight truncate">
                  Alex Morgan
                </p>
                <p className="font-label-sm text-label-sm text-outline truncate">
                  Lead Growth Marketer
                </p>
              </div>
            </div>
            <form action={logoutUser}>
              <button
                type="submit"
                className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container/40 transition-colors cursor-pointer flex items-center justify-center"
                title="Keluar / Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
