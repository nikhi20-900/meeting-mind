"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ExtractedDecision, MeetingExtractionResult } from "@/types/extraction";
import { Decision, TaskItem } from "@/types";
import { DetectedConflict } from "@/lib/conflictDetection";
import { findTaskDecisionAssociation } from "@/lib/taskDecisionAssociation";
import { daysOverdue } from "@/lib/dateUtils";
import { DecisionImpactPanel } from "@/components/conflicts/DecisionImpactPanel";
import { Badge } from "@/components/ui/Badge";
import {
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
  Quote,
  FileText,
  ShieldAlert,
} from "lucide-react";

interface ExtractionResultViewProps {
  result: MeetingExtractionResult;
  isPersisted?: boolean;
  savedDecisions?: Decision[];
  savedTasks?: TaskItem[];
  detectedConflicts?: DetectedConflict[];
  onReset?: () => void;
  onConfirmSave?: (reviewedResult: MeetingExtractionResult) => void;
  isSaving?: boolean;
}

export function ExtractionResultView({
  result,
  isPersisted = false,
  savedDecisions = [],
  savedTasks = [],
  detectedConflicts = [],
  onReset,
  onConfirmSave,
  isSaving = false,
}: ExtractionResultViewProps) {
  const [copied, setCopied] = useState(false);
  const [reviewedDecisions, setReviewedDecisions] = useState<ExtractedDecision[]>(result.decisions);
  const [setAsideDecisions, setSetAsideDecisions] = useState<ExtractedDecision[]>([]);
  const [editingDecision, setEditingDecision] = useState<ExtractedDecision | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const currentConflicts = (detectedConflicts || []).filter((conflict) =>
    reviewedDecisions.some(
      (decision) =>
        decision.id === conflict.newDecisionId &&
        (!conflict.newDecisionText || conflict.newDecisionText === decision.decisionText)
    )
  );

  const handleSetAsideDecision = (decision: ExtractedDecision) => {
    setReviewedDecisions((current) => current.filter((item) => item.id !== decision.id));
    setSetAsideDecisions((current) => [...current, decision]);
    if (editingDecision?.id === decision.id) setEditingDecision(null);
  };

  const handleRestoreDecision = (decision: ExtractedDecision) => {
    setSetAsideDecisions((current) => current.filter((item) => item.id !== decision.id));
    setReviewedDecisions((current) => [...current, decision]);
  };

  const handleSaveDecisionEdit = () => {
    if (!editingDecision) return;
    if (!editingDecision.decisionText.trim()) {
      setDecisionError("Add the decision wording, or set this item aside.");
      return;
    }
    setReviewedDecisions((current) =>
      current.map((item) => (item.id === editingDecision.id ? editingDecision : item))
    );
    setEditingDecision(null);
    setDecisionError(null);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {!isPersisted && (
        <div role="status" aria-live="polite" className="rounded-xl border border-stone-200 bg-white px-4 py-3">
          <p className="text-sm font-semibold text-stone-900">Review these results before saving</p>
          <p className="mt-1 text-sm text-stone-600">
            Check the decisions and proposed tasks below. Nothing has been added to your workspace yet.
          </p>
        </div>
      )}

      {isPersisted && (
        <div role="status" aria-live="polite" className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-950">Meeting saved</p>
            <p className="mt-1 text-xs text-emerald-900">
              The meeting and decisions are saved. Tasks are waiting for your approval.
            </p>
          </div>
          <Link
            href="/tasks"
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            Review tasks <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Conflict Detection Banner (if any conflict detected) */}
      {currentConflicts.length > 0 && (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <span>Possible conflict with an earlier decision ({currentConflicts.length})</span>
            <span className="text-[10px] bg-rose-200/80 text-rose-950 px-2 py-0.5 rounded-full font-semibold border border-rose-300">
              Review suggested
            </span>
          </div>

          <div className="space-y-2.5">
            {currentConflicts.map((conf) => (
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
                  {conf.dependentSettingsNote && (
                    <p className="text-amber-900 text-[11px] font-medium bg-amber-50 p-2 rounded-lg border border-amber-200">
                      <strong>Dependent Setting Note: </strong>
                      {conf.dependentSettingsNote}
                    </p>
                  )}
                </div>

                {/* Decision Impact Engine */}
                {isPersisted && (
                  <div className="pt-2 border-t border-rose-100">
                    <DecisionImpactPanel
                      conflict={conf}
                    />
                  </div>
                )}
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
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-stone-900">
                  Meeting summary
                </h3>
                
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

        {/* 1. Meeting Summary */}
        <div className="space-y-3 pt-1">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 font-semibold block">
              {currentConflicts.length > 0 ? "Discussion summary · decision unresolved" : "Meeting summary"}
            </span>
            <h4 className="text-base sm:text-lg font-semibold text-stone-900 mt-0.5">
              {currentConflicts.length > 0 ? "Decision needs review" : result.summary.headline}
            </h4>
          </div>

          {currentConflicts.length > 0 ? (
            <div role="note" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-amber-950">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <p>
                The recap includes a proposed decision that may conflict with an earlier one. Review the two statements below before treating it as approved. Nothing is approved yet.
              </p>
            </div>
          ) : (
            <p className="text-sm text-stone-700 leading-relaxed bg-[#FAF9F6] p-4 rounded-xl border border-stone-100">
              {result.summary.executiveSummary}
            </p>
          )}

          {/* Key Takeaways */}
          {currentConflicts.length === 0 && result.summary.keyTakeaways && result.summary.keyTakeaways.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                
                Key takeaways:
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

          {currentConflicts.length === 0 && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 pt-2 border-t border-stone-100">
              <span>Primary Focus: <strong className="text-stone-800">{result.summary.primaryFocus}</strong></span>
              <span>•</span>
              <span>Tone: <strong className="text-stone-800">{result.summary.sentimentOrTone}</strong></span>
            </div>
          )}
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
                  Decisions to review
                </h3>
                <p className="text-[11px] text-stone-500">
                  Edit or set aside before saving
                </p>
              </div>
            </div>
            <span className="text-xs bg-stone-100 px-2 py-0.5 rounded-full font-medium text-stone-700">
              {reviewedDecisions.length} proposed
            </span>
          </div>

          {!isPersisted && (
            <p className="-mt-2 text-xs text-stone-600">
              Only the decisions listed here will be added. Edits are checked for conflicts again when you save.
            </p>
          )}

          {reviewedDecisions.length === 0 ? (
            <p className="text-xs text-stone-500 py-6 text-center">
              No decisions selected. You can still save the meeting and its proposed tasks.
            </p>
          ) : (
            <div className="space-y-3.5">
              {reviewedDecisions.map((dec) => {
                const matchingConflict = currentConflicts.find((c) => c.newDecisionId === dec.id);
                const hasConflict = Boolean(matchingConflict);

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
                          <>
                            <Badge variant="conflict" className="text-[10px]">
                              Conflict Flagged
                            </Badge>
                            <Badge variant="conflict" className="text-[10px]">
                              {matchingConflict?.severity ? `${matchingConflict.severity} Severity` : "Severity unknown"}
                            </Badge>
                          </>
                        )}
                        {dec.status === "Under Review" && (
                          <Badge variant="warning" className="text-[10px]">Needs review</Badge>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-stone-400">
                        #{dec.id}
                      </span>
                    </div>
                    {dec.status === "Under Review" && !isPersisted && (
                      <p className="text-[11px] text-amber-900">
                        Confidence {dec.confidenceScore === undefined ? "unknown" : `${Math.round(dec.confidenceScore * 100)}%`} — will remain under review if saved.
                      </p>
                    )}

                    {editingDecision?.id === dec.id ? (
                      <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-3">
                        <label className="block space-y-1 text-xs font-medium text-stone-700">
                          <span>Decision</span>
                          <textarea
                            value={editingDecision.decisionText}
                            onChange={(event) => setEditingDecision((current) => current ? { ...current, decisionText: event.target.value } : current)}
                            rows={3}
                            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
                          />
                        </label>
                        <label className="block space-y-1 text-xs font-medium text-stone-700">
                          <span>Context or reason</span>
                          <textarea
                            value={editingDecision.rationale}
                            onChange={(event) => setEditingDecision((current) => current ? { ...current, rationale: event.target.value } : current)}
                            rows={2}
                            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
                          />
                        </label>
                        <label className="block space-y-1 text-xs font-medium text-stone-700">
                          <span>Category</span>
                          <select
                            value={editingDecision.category}
                            onChange={(event) => setEditingDecision((current) => current ? { ...current, category: event.target.value as ExtractedDecision["category"] } : current)}
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-normal text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
                          >
                            {(["Architecture", "Product", "Governance", "Client SLA", "Operations", "Unknown"] as const).map((category) => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block space-y-1 text-xs font-medium text-stone-700">
                          <span>Who said it (optional)</span>
                          <input
                            value={editingDecision.speakerAttribution}
                            onChange={(event) => setEditingDecision((current) => current ? { ...current, speakerAttribution: event.target.value } : current)}
                            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
                          />
                        </label>
                        {decisionError && <p role="alert" className="text-xs text-rose-700">{decisionError}</p>}
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={handleSaveDecisionEdit} className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800">Save edits</button>
                          <button type="button" onClick={() => { setEditingDecision(null); setDecisionError(null); }} className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-stone-900 leading-snug">{dec.decisionText}</p>
                        <div className="text-xs text-stone-600 bg-white p-2.5 rounded-lg border border-stone-100">
                          <span className="font-medium text-stone-700">Context: </span>
                          {dec.rationale || "Not provided"}
                        </div>
                        <div className="text-xs text-stone-600 bg-white p-2.5 rounded-lg border border-stone-100">
                          <span className="font-medium text-stone-700">Evidence from recap: </span>
                          {dec.evidence && dec.evidence !== "Unknown" ? `“${dec.evidence}”` : "Not identified in the recap."}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button type="button" onClick={() => { setEditingDecision({ ...dec }); setDecisionError(null); }} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">Edit</button>
                          <button type="button" onClick={() => handleSetAsideDecision(dec)} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-rose-300 hover:text-rose-800">Set aside</button>
                        </div>
                      </>
                    )}

                    {dec.speakerAttribution && editingDecision?.id !== dec.id && (
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-500 pt-1">
                        <Quote className="w-3 h-3 text-orange-600 shrink-0" />
                        <span className="font-medium text-stone-700">Attribution:</span>
                        <span className="truncate">{dec.speakerAttribution}</span>
                      </div>
                    )}

                    {matchingConflict && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1 mt-2">
                        <div className="font-semibold flex items-center justify-between">
                          <span>Contradiction with #{matchingConflict.historicalDecisionId.toUpperCase()}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200 text-rose-900">
                            {matchingConflict.severity}
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-800">{matchingConflict.conflictDescription}</p>
                        {matchingConflict.suggestedResolution && (
                          <p className="text-[11px] text-rose-950 font-medium">
                            <strong>Resolution: </strong>{matchingConflict.suggestedResolution}
                          </p>
                        )}
                        {matchingConflict.dependentSettingsNote && (
                          <p className="text-[11px] text-amber-900 font-medium bg-amber-50 p-1.5 rounded border border-amber-200">
                            <strong>Dependent Setting: </strong>{matchingConflict.dependentSettingsNote}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      {/* Proposed tasks Section */}
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
                  Saved tasks will wait for your approval
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
              {result.actionItems.map((action) => {
                const relatedDecision = findTaskDecisionAssociation(action.title, reviewedDecisions);
                const relatedConflict = relatedDecision
                  ? currentConflicts.find((conflict) => conflict.newDecisionId === relatedDecision.id)
                  : undefined;
                return (
                  <div
                    key={action.id}
                    className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/15 space-y-2.5"
                  >
                    {(() => {
                      const pastDueBy = daysOverdue(
                        action.deadline,
                        result.meetingDate,
                        new Date(result.metadata.extractedAt)
                      );
                      return pastDueBy ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800">
                          <Clock className="h-3.5 w-3.5" />
                          Past due by {pastDueBy} {pastDueBy === 1 ? "day" : "days"} when this review was created
                        </div>
                      ) : null;
                    })()}
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
                        {action.priority === "Unknown" ? "Priority unknown" : `${action.priority} priority`}
                      </Badge>

                      <span className="text-[11px] text-amber-800 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        Awaiting User Confirmation
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-stone-900 leading-snug">
                      {action.title}
                    </p>

                    {relatedConflict && (
                      <div role="note" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs leading-relaxed text-rose-900">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
                        <p>
                          <strong>Linked to a decision conflict.</strong>{" "}
                          {isPersisted
                            ? `This task remains unapproved until the conflict with #${relatedConflict.historicalDecisionId.toUpperCase()} is resolved.`
                            : `If you save this meeting, this task will remain unapproved until the conflict with #${relatedConflict.historicalDecisionId.toUpperCase()} is resolved.`}
                        </p>
                      </div>
                    )}

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
                    <div className="text-[11px] leading-relaxed text-stone-600">
                      <span className="font-medium text-stone-700">Evidence from recap: </span>
                      {action.evidence && action.evidence !== "Unknown" ? `“${action.evidence}”` : "Not identified in the recap."}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {setAsideDecisions.length > 0 && !isPersisted && (
        <section aria-labelledby="set-aside-decisions" className="rounded-2xl border border-stone-200 bg-stone-50 p-5 sm:p-6">
          <div className="mb-3">
            <h3 id="set-aside-decisions" className="text-sm font-semibold text-stone-900">Set aside</h3>
            <p className="mt-1 text-xs text-stone-600">These decisions will not be added to memory unless you restore them.</p>
          </div>
          <ul className="space-y-2">
            {setAsideDecisions.map((decision) => (
              <li key={decision.id} className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-stone-700">{decision.decisionText}</span>
                <button type="button" onClick={() => handleRestoreDecision(decision)} className="shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">Restore</button>
              </li>
            ))}
          </ul>
        </section>
      )}

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

      {/* Review decision */}
      <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-900">
            {isPersisted ? "What would you like to review next?" : "Ready to add this meeting?"}
          </p>
          <p className="mt-1 text-xs text-stone-600">
            {isPersisted
              ? "You can review task approvals or return to your decision memory."
              : currentConflicts.length > 0
              ? "Saving adds the meeting and decisions you keep. Conflicting decisions stay flagged until someone resolves them; tasks remain unapproved."
              : "Saving adds the meeting and decisions you keep. Tasks remain unapproved until you confirm them."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isPersisted && onConfirmSave && (
            <button
              type="button"
              onClick={() => onConfirmSave({ ...result, decisions: reviewedDecisions })}
              disabled={isSaving}
              aria-busy={isSaving}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-orange-700 px-4 text-sm font-medium text-white transition-colors hover:bg-orange-800 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2"
            >
              {isSaving ? "Saving meeting…" : "Save meeting"}
            </button>
          )}
          {isPersisted && (
            <>
              <Link href="/tasks" className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-stone-200 px-3 text-xs font-medium text-stone-700 hover:bg-stone-50">
                Review tasks <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/decision-memory" className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-stone-200 px-3 text-xs font-medium text-stone-700 hover:bg-stone-50">
                Decision memory <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
          {onReset && !isPersisted && (
            <button type="button" onClick={onReset} className="min-h-10 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900">
              Discard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
