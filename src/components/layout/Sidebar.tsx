"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Gavel,
  Database,
  CheckSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Brain,
  History,
  BookOpen,
} from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export function Sidebar({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: "New Meeting",
      href: "/new-meeting",
      icon: PlusCircle,
      badge: "Wispr",
    },
    {
      name: "Decisions",
      href: "/decision-memory",
      icon: Gavel,
      badge: "6",
    },
    {
      name: "Memory",
      href: "/decision-memory?view=archive",
      icon: History,
      badge: null,
    },
    {
      name: "Task Tracker",
      href: "/tasks",
      icon: CheckSquare,
      badge: "3 pending",
    },
    {
      name: "Weekly Digestion",
      href: "/weekly-digest",
      icon: BookOpen,
      badge: "New",
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#FDFCFB] border-r border-stone-200/90 transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-20" : "w-64"
        } ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-stone-100">
          <Link
            href="/"
            className="flex items-center gap-3 overflow-hidden group focus:outline-none"
            onClick={() => setIsMobileOpen(false)}
          >
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-xs shrink-0 group-hover:bg-orange-700 transition-colors">
              <Brain className="w-5 h-5" />
            </div>

            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-stone-900 text-base tracking-tight leading-none">
                  Meeting Mind
                </span>
                <span className="text-[11px] text-stone-500 font-medium tracking-wide mt-1">
                  Agentic Memory
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            type="button"
            className="hidden lg:flex w-7 h-7 rounded-lg border border-stone-200 bg-white items-center justify-center text-stone-500 hover:text-stone-900 hover:border-stone-300 transition-colors cursor-pointer"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2">
            {!isCollapsed ? (
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                Workspace
              </span>
            ) : (
              <div className="w-full h-px bg-stone-200/60 my-1" />
            )}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href.split("?")[0]);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                title={isCollapsed ? item.name : undefined}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-stone-900 text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/80"
                } ${isCollapsed ? "justify-center" : ""}`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    isActive
                      ? "text-orange-400"
                      : "text-stone-400 group-hover:text-stone-700"
                  }`}
                />

                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate">{item.name}</span>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium shrink-0 ml-2 ${
                          isActive
                            ? "bg-stone-800 text-orange-300 border border-stone-700"
                            : item.badge === "Wispr"
                            ? "bg-orange-50 text-orange-700 border border-orange-200/80"
                            : item.badge.includes("pending")
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-stone-100 text-stone-600 border border-stone-200"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Conflict / Agent Notice Card (Restrained) */}
        {!isCollapsed ? (
          <div className="p-3 m-3 rounded-xl bg-orange-50/70 border border-orange-200/70 text-stone-800">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-orange-600 shrink-0" />
              <span className="text-xs font-semibold text-orange-950">
                Conflict Guardian
              </span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              2 active policy conflicts detected between recent syncs. Human confirmation required.
            </p>
          </div>
        ) : (
          <div className="p-2 flex justify-center">
            <div
              className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-700"
              title="2 conflicts detected"
            >
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Phase 1 Badge Footer */}
        <div className="p-3 border-t border-stone-100 bg-[#FAF8F5]/80">
          {!isCollapsed ? (
            <div className="flex items-center justify-between text-xs text-stone-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-stone-700">Hackathon Phase 1</span>
              </div>
              <span className="text-[11px] bg-white px-1.5 py-0.5 rounded border border-stone-200 text-stone-600 font-mono">
                v0.1
              </span>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Phase 1 Active" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

