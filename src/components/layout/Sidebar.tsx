"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Gavel,
  CheckSquare,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const navItems = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "New meeting", href: "/new-meeting", icon: PlusCircle },
  { name: "Decision memory", href: "/decision-memory", icon: Gavel },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Weekly digest", href: "/weekly-digest", icon: BookOpen },
];

export function Sidebar({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-stone-950/35 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-stone-200 bg-[#F8F6F0] transition-[width,transform] duration-200 ease-out ${
          isCollapsed ? "w-20" : "w-64"
        } ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-stone-200/80 px-4">
          <Link
            href="/"
            aria-label="MeetingMind overview"
            className="group flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
            onClick={() => setIsMobileOpen(false)}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-900 text-white">
              <BookOpen className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            {!isCollapsed && (
              <span className="min-w-0">
                <span className="block text-sm font-semibold tracking-tight text-stone-900">MeetingMind</span>
                <span className="mt-0.5 block text-[11px] text-stone-500">Meeting record</span>
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 lg:flex"
            title={isCollapsed ? "Expand navigation" : "Collapse navigation"}
            aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Workspace">
          {!isCollapsed && (
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
              Workspace
            </p>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                title={isCollapsed ? item.name : undefined}
                aria-current={isActive ? "page" : undefined}
                className={`group flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 ${
                  isCollapsed ? "justify-center" : ""
                } ${
                  isActive
                    ? "bg-orange-100 text-stone-950"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${
                    isActive ? "text-orange-800" : "text-stone-500 group-hover:text-stone-800"
                  }`}
                  aria-hidden="true"
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {!isCollapsed && (
          <div className="border-t border-stone-200/80 px-5 py-4">
            <p className="text-[11px] leading-relaxed text-stone-500">
              Decisions, tasks, and meeting notes in one place.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
