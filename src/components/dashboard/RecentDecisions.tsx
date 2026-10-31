import React from "react";
import Link from "next/link";
import { Decision } from "@/types";
import { Badge } from "@/components/ui/Badge";
import {
  Gavel,
  Calendar,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export function RecentDecisions({ decisions }: { decisions: Decision[] }) {
  return (
    <div className="space-y-3">
      {decisions.slice(0, 4).map((decision) => (
        <div
          key={decision.id}
          className={`p-4 bg-white rounded-xl border transition-all duration-150 ${
            decision.hasConflictWarning
              ? "border-rose-200/90 bg-rose-50/15"
              : "border-stone-200/80 hover:border-stone-300"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    decision.status === "Conflict Flagged"
                      ? "conflict"
                      : decision.status === "Active"
                      ? "active"
                      : decision.status === "Under Review"
                      ? "warning"
                      : "neutral"
                  }
                  className="text-[11px]"
                >
                  {decision.status}
                </Badge>

                {decision.status === "Conflict Flagged" && (
                  <Badge variant="conflict" className="text-[11px]">
                    {decision.conflictSeverity || "Critical"} Severity
                  </Badge>
                )}

                <Badge variant="neutral" className="text-[11px]">
                  {decision.category}
                </Badge>

                <span className="text-xs text-stone-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  {decision.date}
                </span>
              </div>

              <p className="text-sm font-semibold text-stone-900 leading-snug">
                {decision.decisionText}
              </p>

              <p className="text-xs text-stone-500">
                <span className="font-medium text-stone-700">Meeting: </span>
                {decision.meetingReference}
              </p>
            </div>

            <div className="shrink-0 text-xs font-mono text-stone-400 sm:text-right">
              #{decision.id.toUpperCase()}
            </div>
          </div>

          {/* Rationale snippet */}
          <div className="mt-2.5 text-xs text-stone-600 bg-[#FAF9F6] p-2.5 rounded-lg border border-stone-100">
            <span className="font-medium text-stone-700">Rationale: </span>
            {decision.rationale}
          </div>

          {/* Conflict Alert Callout */}
          {decision.hasConflictWarning && decision.conflictNotes && (
            <div className="mt-2.5 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-rose-950">
                    Potential Cross-Meeting Conflict Detected
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200 text-rose-900 border border-rose-300">
                    {decision.conflictSeverity || "Critical"} Severity
                  </span>
                </div>
                <p className="text-rose-800 leading-relaxed">{decision.conflictNotes}</p>
                {decision.conflictResolution ? (
                  <p className="text-[11px] text-rose-900 font-medium bg-rose-100/50 p-1.5 rounded border border-rose-200/60">
                    <strong className="text-rose-950">Resolution Guidance: </strong>
                    {decision.conflictResolution}
                  </p>
                ) : (
                  <p className="text-[11px] text-rose-700 font-medium">
                    {decision.category === "Governance"
                      ? "Requires Security & Compliance review before modifying authentication or governance standards."
                      : decision.category === "Architecture"
                      ? "Requires Architecture sync to resolve infrastructure divergence and capacity constraints."
                      : decision.category === "Client SLA"
                      ? "Requires Client Success alignment before adjusting contractual service level thresholds."
                      : "Requires human review and resolution before changes are adopted."}
                  </p>
                )}
                {decision.dependentSettingsNote && (
                  <p className="text-[11px] text-amber-900 font-medium bg-amber-50 p-1.5 rounded border border-amber-200">
                    <strong className="text-amber-950">Dependent Setting: </strong>
                    {decision.dependentSettingsNote}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="pt-2 text-center">
        <Link
          href="/decision-memory"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-700 hover:text-orange-800 transition-colors"
        >
          View all historical decisions in Decision Memory
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
