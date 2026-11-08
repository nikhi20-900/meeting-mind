"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { sampleTeamDigests } from "@/data/mockData";
import {
  CalendarRange,
  Users,
  Gavel,
  CheckSquare,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
  Share2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileText,
  User,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";

export default function WeeklyDigestPage() {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");

  const digest = sampleTeamDigests[selectedMemberId] || sampleTeamDigests["all"];

  const memberOptions = [
    { id: "all", name: "Entire Workspace Team", role: "Cross-functional Org" },
    { id: "marcus-vance", name: "Marcus Vance", role: "Infrastructure Lead" },
    { id: "sarah-chen", name: "Sarah Chen", role: "DevOps Engineer" },
    { id: "elena-rostova", name: "Elena Rostova", role: "Design Systems Lead" },
    { id: "claire-dupont", name: "Claire Dupont", role: "Client Success VP" },
  ];

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header with Demo Content Tag */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-600" />
              <span className="text-xs font-semibold text-orange-900 tracking-wider uppercase">
                Executive Synthesis
              </span>
              <span className="text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full ml-1">
                Demo Content
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-stone-900">
              Weekly Digestion
            </h2>
            <p className="text-sm text-stone-500 max-w-2xl">
              An agent-synthesized briefing capturing weekly consensus decisions, assigned action items, completed work, and upcoming deadlines.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 transition-colors shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5 text-stone-500" />
              Share
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-stone-500" />
              Export
            </button>
          </div>
        </div>

        {/* Team Member Selector Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-700 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide block">
                Digest Scope
              </span>
              <span className="text-sm font-bold text-stone-900">
                Viewing Digest for: {digest.name}
              </span>
            </div>
          </div>

          {/* Interactive Selector Tabs / Dropdown */}
          <div className="flex flex-wrap items-center gap-1.5">
            {memberOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedMemberId(opt.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                  selectedMemberId === opt.id
                    ? "bg-stone-900 text-white border-stone-900 shadow-2xs font-semibold"
                    : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                {opt.name.split(" ")[0]} {opt.id === "all" ? "Team" : ""}
              </button>
            ))}
          </div>
        </div>

        {/* 1. Weekly Summary Section */}
        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-6 sm:p-7 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <h3 className="text-base font-bold text-stone-900">
                Weekly Summary Briefing
              </h3>
            </div>
            <span className="text-xs font-mono text-stone-400">
              Oct 26 – Oct 31, 2026
            </span>
          </div>

          <p className="text-sm sm:text-base text-stone-700 leading-relaxed">
            {digest.weeklySummary}
          </p>

          <div className="pt-2 flex items-center gap-4 text-xs text-stone-500">
            <span>Focus Area: <strong className="text-stone-800">{digest.role}</strong></span>
            <span>•</span>
            <span className="text-emerald-700 font-medium">Memory Indexed & Verified</span>
          </div>
        </div>

        {/* 2-Column Grid: Decisions Made & Assigned Tasks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Decisions Made Section */}
          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Gavel className="w-4 h-4 text-orange-600" />
                <h3 className="text-base font-bold text-stone-900">
                  Decisions Made
                </h3>
              </div>
              <span className="text-xs bg-stone-100 px-2 py-0.5 rounded-full font-medium text-stone-700">
                {digest.decisionsMade.length} recorded
              </span>
            </div>

            {digest.decisionsMade.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">
                No new binding decisions attributed to this scope this week.
              </p>
            ) : (
              <div className="space-y-3">
                {digest.decisionsMade.map((dec) => (
                  <div
                    key={dec.id}
                    className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-100 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-stone-900 line-clamp-1">
                        {dec.text}
                      </span>
                      <span className="font-mono text-[10px] text-stone-400 shrink-0">
                        #{dec.id.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span className="truncate">{dec.meeting}</span>
                      <span className="shrink-0">{dec.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assigned Tasks Section */}
          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-orange-600" />
                <h3 className="text-base font-bold text-stone-900">
                  Assigned Tasks
                </h3>
              </div>
              <span className="text-xs bg-stone-100 px-2 py-0.5 rounded-full font-medium text-stone-700">
                {digest.assignedTasks.length} in scope
              </span>
            </div>

            {digest.assignedTasks.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">
                No pending tasks currently assigned to this member.
              </p>
            ) : (
              <div className="space-y-3">
                {digest.assignedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-100 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-stone-900 line-clamp-1">
                        {t.title}
                      </span>
                      <Badge
                        variant={
                          t.priority === "High"
                            ? "high"
                            : t.priority === "Medium"
                            ? "warning"
                            : "neutral"
                        }
                        className="text-[10px]"
                      >
                        {t.priority === "Unknown" ? "Priority unknown" : t.priority}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-400" />
                        Due {t.dueDate}
                      </span>
                      <span className="font-medium text-stone-700">{t.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2-Column Grid: Completed Work & Upcoming Deadlines */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Completed Work Section */}
          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-base font-bold text-stone-900">
                  Completed Work
                </h3>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                {digest.completedWork.length} achieved
              </span>
            </div>

            {digest.completedWork.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">
                No completed deliverables logged yet for this period.
              </p>
            ) : (
              <div className="space-y-3">
                {digest.completedWork.map((work) => (
                  <div
                    key={work.id}
                    className="p-3.5 rounded-xl bg-emerald-50/20 border border-emerald-100 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-900 line-clamp-1">
                        {work.title}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono shrink-0">
                        {work.completedDate}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed">
                      <strong className="text-stone-700">Impact: </strong>
                      {work.impact}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Deadlines Section */}
          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <h3 className="text-base font-bold text-stone-900">
                  Upcoming Deadlines
                </h3>
              </div>
              <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
                Next 14 Days
              </span>
            </div>

            {digest.upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">
                No immediate deadlines looming in this scope.
              </p>
            ) : (
              <div className="space-y-3">
                {digest.upcomingDeadlines.map((dl) => (
                  <div
                    key={dl.id}
                    className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-100 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-semibold text-stone-900 line-clamp-1">
                        {dl.title}
                      </p>
                      <p className="text-stone-500 text-[11px]">
                        Target Date: <strong className="text-stone-700">{dl.deadline}</strong>
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          dl.urgency === "Immediate"
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : dl.urgency === "Approaching"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-stone-100 text-stone-700 border-stone-200"
                        }`}
                      >
                        {dl.daysLeft} {dl.daysLeft === 1 ? "day" : "days"} left
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Demo Content Disclaimer Banner */}
        <div className="p-4 rounded-xl bg-stone-100/70 border border-stone-200 text-stone-600 text-xs flex items-center justify-between">
          <span>
            <strong>Demo Content:</strong> All summaries and member metrics are generated from realistic hackathon test scenarios. In Phase 2, this is compiled automatically by the agent at the end of each weekly cycle.
          </span>
          <span className="font-mono text-[10px] text-stone-400 shrink-0 ml-3">
            Meeting Mind v0.1
          </span>
        </div>
      </div>
    </AppShell>
  );
}
