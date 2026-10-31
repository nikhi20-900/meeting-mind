"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MeetingExtractionResult } from "@/types/extraction";
import { Decision, TaskItem } from "@/types";
import { DetectedConflict } from "@/lib/conflictDetection";
import { Badge } from "@/components/ui/Badge";
import {
  Sparkles,
  Gavel,
  CheckSquare,
  Users,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Copy,
  Layers,
  Bot,
  Database,
  Quote,
  ShieldAlert,
} from "lucide-react";

interface ExtractionResultViewProps {
  result: MeetingExtractionResult;
  isPersisted?: boolean;
  savedDecisions?: Decision[];
  savedTasks?: TaskItem[];
  detectedConflicts?: DetectedConflict[];
  onReset?: () => void;
}

export function ExtractionResultView({
  result,
  isPersisted = false,
  savedDecisions = [],
  savedTasks = [],
  detectedConflicts = [],
  onReset,
}: ExtractionResultViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Persistent Storage Confirmation Banner */}
      {isPersisted && (
        <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm block">
                Saved to Persistent Storage
              </span>
              <span className="text-[11px] text-emerald-800 block">
                Meeting, decisions, and tasks written to lightweight database. Remains available after restarts & refreshes.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/tasks"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs transition-colors"
            >
              Review Proposed Tasks <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Conflict Detection Banner (if any conflict detected) */}
      {detectedConflicts && detectedConflicts.length > 0 && (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <span>Cross-Meeting Conflict Detected ({detectedConflicts.length})</span>
            <span className="text-[10px] bg-rose-200/80 text-rose-950 px-2 py-0.5 rounded-full font-semibold border border-rose-300">
              Human Review Required
            </span>
          </div>

          <div className="space-y-2.5">
            {detectedConflicts.map((conf) => (
              <div
                key={conf.id}
                className="p-4 rounded-xl bg-white/95 border border-rose-200 text-xs space-y-2.5 shadow-2xs"
              >
                <div className="flex items-center justify-between font-semibold text-rose-900 border-b border-rose-100 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Contradiction with #{conf.historicalDecisionId.toUpperCase()} ({conf.historicalMeetingTitle})</span>
                  </div>
                  <Badge variant="conflict" className="text-[10px]">
                    {conf.severity} Severity
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200/80">
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                      Historical Decision (#{conf.historicalDecisionId.toUpperCase()})
                    </span>
                    <p className="text-stone-800 font-medium text-[11px] leading-relaxed">
                      "{conf.historicalDecisionText}"
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-200">
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block mb-1">
                      Newly Proposed Decision
                    </span>
                    <p className="text-stone-900 font-medium text-[11px] leading-relaxed">
                      "{conf.newDecisionText || 'New Decision'}"
                    </p>
                  </div>
                </div>

                <div className="pt-1 space-y-1.5">
                  <p className="text-stone-700 leading-relaxed text-[11px]">
                    <strong className="text-rose-950 font-semibold">Contradiction Analysis: </strong>
                    {conf.conflictDescription}
                  </p>
                  {conf.suggestedResolution && (
                    <p className="text-rose-900 text-[11px] font-medium bg-rose-100/50 p-2 rounded-lg border border-rose-200/80">
                      <strong>Suggested Resolution: </strong>
                      {conf.suggestedResolution}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extraction Success Header */}
      <div className="p-5 sm:p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-600 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-stone-900">
                  Meeting Intelligence Extracted
                </h3>
                <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Real LLM Pipeline
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Model: <strong className="text-stone-700">{result.metadata.provider} ({result.metadata.model})</strong> • Captured at {new Date(result.metadata.extractedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleCopyJson}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl text-stone-700 bg-stone-50 border border-stone-200 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-stone-500" />
              {copied ? "Copied JSON" : "Copy Payload"}
            </button>
            {onReset && (
              <button
                onClick={onReset}
                type="button"
                className="px-3 py-1.5 text-xs font-medium rounded-xl text-stone-600 hover:text-stone-900 bg-white border border-stone-200 transition-colors cursor-pointer"
              >
                Process Another
              </button>
            )}
          </div>
        </div>

        {/* 1. Structured Executive Summary */}
        <div className="space-y-3 pt-1">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 font-semibold block">
              Executive Headline
            </span>
            <h4 className="text-base sm:text-lg font-semibold text-stone-900 mt-0.5">
              {result.summary.headline}
            </h4>
          </div>

          <p className="text-sm text-stone-700 leading-relaxed bg-[#FAF9F6] p-4 rounded-xl border border-stone-100">
            {result.summary.executiveSummary}
          </p>

          {/* Key Takeaways */}
          {result.summary.keyTakeaways && result.summary.keyTakeaways.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                Key Strategic Takeaways:
              </span>
              <ul className="space-y-1.5 pl-1">
                {result.summary.keyTakeaways.map((takeaway, i) => (
                  <li key={i} className="text-xs sm:text-sm text-stone-600 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-2 shrink-0" />
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 pt-2 border-t border-stone-100">
            <span>Primary Focus: <strong className="text-stone-800">{result.summary.primaryFocus}</strong></span>
            <span>•</span>
            <span>Tone: <strong className="text-stone-800">{result.summary.sentimentOrTone}</strong></span>
          </div>
        </div>
      </div>

      {/* 2-Column Grid: Decisions & Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Extracted Decisions Section */}
        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center">
                <Gavel className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Extracted Decisions
                </h3>
                <p className="text-[11px] text-stone-500">
                  Indexed in Decision Memory
                </p>
              </div>
            </div>
            <span className="text-xs bg-stone-100 px-2 py-0.5 rounded-full font-medium text-stone-700">
              {result.decisions.length} decisions
            </span>
          </div>

          {result.decisions.length === 0 ? (
            <p className="text-xs text-stone-500 py-6 text-center">
              No explicit consensus decisions detected in this transcript.
            </p>
          ) : (
            <div className="space-y-3.5">
              {result.decisions.map((dec) => {
                const hasConflict = detectedConflicts?.some((c) => c.newDecisionId === dec.id);

                return (
                  <div
                    key={dec.id}
                    className={`p-4 rounded-xl border space-y-2 transition-colors ${
                      hasConflict
                        ? "bg-rose-50/20 border-rose-300"
                        : "bg-[#FAF9F6] border-stone-200/80 hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="neutral" className="text-[10px]">
                          {dec.category}
                        </Badge>
                        {hasConflict && (
                          <Badge variant="conflict" className="text-[10px]">
                            Conflict Flagged
                          </Badge>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-stone-400">
                        #{dec.id}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-stone-900 leading-snug">
                      {dec.decisionText}
                    </p>

                    <div className="text-xs text-stone-600 bg-white p-2.5 rounded-lg border border-stone-100">
                      <span className="font-medium text-stone-700">Rationale: </span>
                      {dec.rationale}
                    </div>

                    {dec.speakerAttribution && (
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-500 pt-1">
                        <Quote className="w-3 h-3 text-orange-600 shrink-0" />
                        <span className="font-medium text-stone-700">Attribution:</span>
                        <span className="truncate">{dec.speakerAttribution}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Extracted Action Items Section */}
        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Extracted Action Items
                </h3>
                <p className="text-[11px] text-stone-500">
                  Stored as Awaiting Approval
                </p>
              </div>
            </div>
            <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
              {result.actionItems.length} awaiting confirmation
            </span>
          </div>

          {result.actionItems.length === 0 ? (
            <p className="text-xs text-stone-500 py-6 text-center">
              No actionable commitments detected in this transcript.
            </p>
          ) : (
            <div className="space-y-3.5">
              {result.actionItems.map((action) => (
                <div
                  key={action.id}
                  className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/15 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant={
                        action.priority === "High"
                          ? "high"
                          : action.priority === "Medium"
                          ? "warning"
                          : "neutral"
                      }
                      className="text-[10px]"
                    >
                      {action.priority} Priority
                    </Badge>

                    <span className="text-[11px] text-amber-800 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      Awaiting User Confirmation
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-stone-900 leading-snug">
                    {action.title}
                  </p>

                  {/* Owner & Deadline Row */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-stone-100 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-stone-800 text-white text-[10px] font-semibold flex items-center justify-center">
                        {action.ownerName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-stone-900 block leading-tight">
                          {action.ownerName}
                        </span>
                        <span className="text-[10px] text-stone-500 leading-tight block">
                          {action.ownerRole}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 font-mono uppercase block">
                        Deadline
                      </span>
                      <span className="font-semibold text-stone-800 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        {action.deadline}
                      </span>
                    </div>
                  </div>

                  {action.speakerAttribution && (
                    <div className="text-[11px] text-stone-500 flex items-center gap-1.5 pt-0.5">
                      <Quote className="w-3 h-3 text-stone-400 shrink-0" />
                      <span className="font-medium text-stone-700">Attribution:</span>
                      <span className="truncate">{action.speakerAttribution}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Identified Speakers Card */}
      {result.speakers && result.speakers.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Users className="w-4 h-4 text-orange-600" />
            <h3 className="text-sm font-bold text-stone-900">
              Identified Speakers & Contributions
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {result.speakers.map((spk, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-[#FAF9F6] border border-stone-100 text-xs space-y-1">
                <div className="flex items-center gap-2 font-semibold text-stone-900">
                  <div className="w-5 h-5 rounded-full bg-stone-800 text-[9px] text-white flex items-center justify-center font-bold">
                    {spk.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span>{spk.name}</span>
                </div>
                <p className="text-[11px] text-stone-500">{spk.role}</p>
                <p className="text-stone-600 text-[11px] line-clamp-2 mt-1">{spk.contributions}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation & Next Step Prompts */}
      <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <span className="text-stone-600">
          Decisions and tasks saved to persistent database. Review and confirm tasks to proceed with execution.
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1 font-semibold text-orange-700 hover:text-orange-800"
          >
            Review & Confirm Tasks <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <span className="text-stone-300">•</span>
          <Link
            href="/decision-memory"
            className="inline-flex items-center gap-1 font-semibold text-stone-600 hover:text-stone-900"
          >
            Decision Memory <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
