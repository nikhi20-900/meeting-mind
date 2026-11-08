"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Plus } from "lucide-react";
import { useWorkspaceProtected } from "@/components/auth/WorkspaceAccessGate";

interface TopHeaderProps {
  onToggleMobileMenu: () => void;
}

function getPageMeta(pathname: string) {
  if (pathname === "/") {
    return { title: "Overview", subtitle: "Recent meetings, decisions, and work to review" };
  }
  if (pathname.startsWith("/new-meeting")) {
    return { title: "New meeting", subtitle: "Add a recap and review what the team agreed" };
  }
  if (pathname.startsWith("/decision-memory")) {
    return { title: "Decision memory", subtitle: "Find and review decisions from past meetings" };
  }
  if (pathname.startsWith("/tasks")) {
    return { title: "Tasks", subtitle: "Review proposed work and track what is in progress" };
  }
  if (pathname.startsWith("/weekly-digest")) {
    return { title: "Weekly digest", subtitle: "A summary of decisions, tasks, and deadlines" };
  }
  return { title: "MeetingMind", subtitle: "" };
}

export function TopHeader({ onToggleMobileMenu }: TopHeaderProps) {
  const pathname = usePathname();
  const workspaceProtected = useWorkspaceProtected();
  const { title, subtitle } = getPageMeta(pathname);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 border-b border-stone-200/80 bg-[#F8F6F0]/95 px-4 py-3 backdrop-blur-sm sm:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          type="button"
          className="rounded-md border border-stone-200 bg-white p-2 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 lg:hidden"
          aria-label="Open navigation menu"
          aria-haspopup="true"
        >
          <Menu className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight text-stone-950 sm:text-lg">{title}</h1>
          <p className="mt-0.5 hidden truncate text-xs text-stone-500 sm:block">{subtitle}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {pathname !== "/new-meeting" && (
          <Link
            href="/new-meeting"
            className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-orange-700 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>New meeting</span>
          </Link>
        )}
        {workspaceProtected && (
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        )}
      </div>
    </header>
  );
}
