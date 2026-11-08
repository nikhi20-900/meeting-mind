"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { RecentMeetings } from "@/components/dashboard/RecentMeetings";
import { UpcomingTasks } from "@/components/dashboard/UpcomingTasks";
import { RecentDecisions } from "@/components/dashboard/RecentDecisions";
import { DashboardStats, MeetingSummary, TaskItem, Decision } from "@/types";
import { ConflictRecord } from "@/lib/db/types";
import {
  FileText,
  CheckSquare,
  Clock,
  ShieldAlert,
  Plus,
  ArrowRight,
  Sparkles,
  Layers,
  History,
  Database,
  Loader2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<{
    stats: DashboardStats;
    recentMeetings: MeetingSummary[];
    upcomingTasks: TaskItem[];
    recentDecisions: Decision[];
    conflicts: ConflictRecord[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || "Failed to load dashboard data.");
      }
      setData({
        stats: json.stats,
        recentMeetings: json.recentMeetings,
        upcomingTasks: json.upcomingTasks,
        recentDecisions: json.recentDecisions,
        conflicts: json.conflicts || [],
      });
    } catch (err: any) {
      console.error("[dashboard] Fetch error:", err);
      setError(err.message || "Could not retrieve persistent dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-800">Workspace</p>
            <h2 className="text-2xl font-semibold tracking-tight text-stone-950">Meeting activity</h2>
            <p className="text-sm leading-relaxed text-stone-600">
              A clear view of recent meetings, decisions, and work that needs review.
            </p>
          </div>
          <Link
            href="/new-meeting"
            className="inline-flex min-h-10 items-center gap-2 self-start rounded-lg bg-orange-700 px-4 text-sm font-medium text-white transition-colors hover:bg-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2 sm:self-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New meeting
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-16 bg-white rounded-2xl border border-stone-200/80 shadow-2xs flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
            <h4 className="text-sm font-semibold text-stone-800">
              Loading Executive Dashboard...
            </h4>
            <p className="text-xs text-stone-500 max-w-sm">
              Synchronizing with persistent database storage.
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-8 bg-rose-50/50 rounded-2xl border border-rose-200 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-rose-950">
              Failed to load dashboard overview
            </h4>
            <p className="text-xs text-rose-800 max-w-md mx-auto">{error}</p>
            <button
              onClick={fetchDashboard}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-rose-700 hover:bg-rose-800 transition-colors shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry Connection
            </button>
          </div>
        )}

        {/* Loaded Dashboard Content */}
        {!loading && !error && data && (
          <>
            {/* 4 Summary Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              <StatCard
                label="Meetings Processed"
                value={data.stats.meetingsProcessed}
                trend={data.stats.meetingsThisWeekDelta}
                subtext="Persisted in local database"
                badge="Healthy"
                badgeVariant="neutral"
                icon={FileText}
              />
              <StatCard
                label="Pending Tasks"
                value={data.stats.pendingTasks}
                subtext="Awaiting or confirmed"
                badge={`${data.stats.pendingTasksConfirmationCount} need confirmation`}
                badgeVariant="warning"
                icon={CheckSquare}
              />
              <StatCard
                label="Upcoming Deadlines"
                value={data.stats.upcomingDeadlines}
                subtext="Across active work"
                badge={`${data.stats.deadlinesWithin48Hours} within 48h`}
                badgeVariant="orange"
                icon={Clock}
              />
              <StatCard
                label="Unresolved Conflicts"
                value={data.stats.unresolvedConflicts}
                subtext="Cross-meeting policy clashes"
                badge={data.stats.conflictsAttentionNeeded}
                badgeVariant={data.stats.unresolvedConflicts > 0 ? "alert" : "neutral"}
                icon={ShieldAlert}
              />
            </div>

            {/* Main Content Grid: Left 2 cols, Right 1 col */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
              {/* Left Column (2 cols on large screen): Recent Meetings & Recent Decisions */}
              <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                {/* Recent Meetings Section */}
                <Card>
                  <CardHeader
                    title="Recent Meetings"
                    subtitle="Transcripts and recaps processed by Meeting Mind"
                    action={
                      <Link
                        href="/new-meeting"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 hover:text-orange-800 transition-colors"
                      >
                        + Add Meeting
                      </Link>
                    }
                  />
                  <CardContent>
                    <RecentMeetings meetings={data.recentMeetings} />
                  </CardContent>
                </Card>

                {/* Recent Decisions Section */}
                <Card>
                  <CardHeader
                    title="Recent Decisions"
                    subtitle="Binding consensus and policies extracted from meetings"
                    action={
                      <Link
                        href="/decision-memory"
                        className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors"
                      >
                        View All <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    }
                  />
                  <CardContent>
                    <RecentDecisions decisions={data.recentDecisions} />
                  </CardContent>
                </Card>
              </div>

              {/* Right Column (1 col): Upcoming Tasks & Conflict Intelligence Panel */}
              <div className="space-y-6 sm:space-y-8">
                {/* Upcoming Tasks Section */}
                <Card>
                  <CardHeader
                    title="Upcoming Tasks"
                    subtitle="Tasks with deadlines awaiting or confirmed by user"
                    action={
                      <Link
                        href="/tasks"
                        className="text-xs font-medium text-stone-500 hover:text-stone-900"
                      >
                        Full Tracker
                      </Link>
                    }
                  />
                  <CardContent>
                    <UpcomingTasks initialTasks={data.upcomingTasks} />
                  </CardContent>
                </Card>

                {/* Conflict Intelligence Protocol Card */}
                <div className="p-5 rounded-2xl bg-[#FCFAF7] border border-stone-200/90 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-700">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-stone-900">
                        Conflict checks
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        Cross-meeting memory verification
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    Review decisions that may conflict with an existing team policy.
                  </p>

                  <div className="pt-2 border-t border-stone-200/70 flex items-center justify-between text-xs">
                    <span className="text-stone-500 font-medium">Memory Storage Status</span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <Database className="w-3.5 h-3.5 text-emerald-600" />
                      Persisted ({data.stats.meetingsProcessed} Meetings)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
