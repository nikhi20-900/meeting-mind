"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Menu,
  Plus,
  Bell,
  Sparkles,
  Command,
} from "lucide-react";

interface TopHeaderProps {
  onToggleMobileMenu: () => void;
  isSidebarCollapsed: boolean;
}

export function TopHeader({ onToggleMobileMenu }: TopHeaderProps) {
  const pathname = usePathname();

  const getPageMeta = () => {
    if (pathname === "/") {
      return {
        title: "Executive Dashboard",
        subtitle: "Decision health, cross-meeting commitments, and conflict status",
      };
    }
    if (pathname.startsWith("/new-meeting")) {
      return {
        title: "New Meeting Processing",
        subtitle: "Capture discussions via Wispr Flow dictation or transcript input",
      };
    }
    if (pathname.startsWith("/decision-memory")) {
      return {
        title: "Decision Memory",
        subtitle: "Auditable organizational repository of commitments and consensus",
      };
    }
    if (pathname.startsWith("/tasks")) {
      return {
        title: "Task Tracker",
        subtitle: "Agent-proposed actions awaiting user confirmation and deadlines",
      };
    }
    if (pathname.startsWith("/weekly-digest")) {
      return {
        title: "Weekly Digestion",
        subtitle: "Synthesized executive briefing of weekly decisions and open resolutions",
      };
    }
    return {
      title: "Meeting Mind",
      subtitle: "Agentic AI Meeting & Decision Intelligence",
    };
  };

  const { title, subtitle } = getPageMeta();

  return (
    <header className="sticky top-0 z-30 bg-[#FBF9F5]/90 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 transition-all">
      {/* Left: Mobile trigger & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          type="button"
          className="lg:hidden p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 truncate">
            {title}
          </h1>
          <p className="hidden sm:block text-xs text-stone-500 font-medium truncate mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Middle/Right: Search bar, Quick Action & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search Field */}
        <div className="relative hidden md:block w-64 lg:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search decisions, tasks..."
            className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-stone-800 placeholder:text-stone-400 shadow-2xs transition-all"
            readOnly
            onClick={() => {}}
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-stone-400 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded font-mono">
            ⌘K
          </kbd>
        </div>

        {/* Quick New Meeting Action (if not already on the page) */}
        {pathname !== "/new-meeting" && (
          <Link
            href="/new-meeting"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl text-white bg-orange-600 hover:bg-orange-700 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Meeting</span>
          </Link>
        )}

        {/* Notifications Placeholder */}
        <button
          type="button"
          className="relative p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-white border border-transparent hover:border-stone-200 transition-all cursor-pointer"
          title="2 alerts require confirmation"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-600" />
        </button>

        {/* User Profile Placeholder */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-stone-200/80">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-stone-800 text-white flex items-center justify-center font-semibold text-xs ring-2 ring-orange-500/30">
              AM
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
          </div>

          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-stone-900 leading-tight">
              Alex Morgan
            </span>
            <span className="text-[11px] text-stone-500 leading-tight">
              Product Ops
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

