"use client";

import React, { useState } from "react";
import { getDecisionImpact, DecisionImpact, ResolutionOption } from "@/lib/decisionImpact";
import { Badge } from "@/components/ui/Badge";
import { useWorkspaceRole } from "@/components/auth/WorkspaceAccessGate";
import {
  ShieldAlert,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Lock,
  Sparkles,
} from "lucide-react";

interface DecisionImpactPanelProps {
  conflict: {
    id: string;
    newDecisionText: string;
    historicalDecisionId: string;
    historicalDecisionText: string;
    conflictDescription?: string;
    severity?: "Critical" | "Warning";
    suggestedResolution?: string;
    dependentSettingsNote?: string;
  };
  associatedTaskId?: string;
  onConfirmResolution?: (resolution: {
    optionId: string;
    title: string;
    proposedAction: string;
    targetTaskStatus?: string;
  }) => void;
}

export function DecisionImpactPanel({
  conflict,
  associatedTaskId,
  onConfirmResolution,
}: DecisionImpactPanelProps) {
  const workspaceRole = useWorkspaceRole();
  const impact: DecisionImpact = getDecisionImpact(conflict);
  const [selectedOptionId, setSelectedOptionId] = useState<string>(
    impact.resolutionOptions.find((o) => o.recommended)?.id || impact.resolutionOptions[0]?.id
  );
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [appliedAction, setAppliedAction] = useState<string | null>(null);

  const selectedOption: ResolutionOption | undefined = impact.resolutionOptions.find(
    (o) => o.id === selectedOptionId
  );

  const handleApplyResolution = async () => {
    if (!selectedOption) return;
    setIsApplying(true);

    try {
      // If an associated task exists and a task status is specified, update via API
      if (associatedTaskId && selectedOption.targetTaskStatus) {
        await fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: associatedTaskId,
            status: selectedOption.targetTaskStatus,
          }),
        }).catch((err) => console.warn("[DecisionImpactPanel] Task status update non-fatal error:", err));
      }

      // If an associated decision exists and targetDecisionStatus is specified, update decision via API
      if (conflict.historicalDecisionId && selectedOption.targetDecisionStatus) {
        await fetch("/api/decisions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: conflict.historicalDecisionId,
            status: selectedOption.targetDecisionStatus,
            resolutionNotes: selectedOption.proposedAction,
          }),
        }).catch((err) => console.warn("[DecisionImpactPanel] Decision update non-fatal error:", err));
      }

      setAppliedAction(selectedOption.proposedAction);
      setIsConfirmed(true);

      if (onConfirmResolution) {
        onConfirmResolution({
          optionId: selectedOption.id,
          title: selectedOption.title,
          proposedAction: selectedOption.proposedAction,
          targetTaskStatus: selectedOption.targetTaskStatus,
        });
      }
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 space-y-4 shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-2">
              Decision Impact Engine
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                Audited
              </span>
            </h4>
            <p className="text-[11px] text-stone-500">
              Downstream consequence modeling and verified resolution pathways
            </p>
          </div>
        </div>

        <Badge variant={impact.downstreamImpact.riskLevel === "Critical" ? "conflict" : "warning"} className="text-[10px]">
          {impact.downstreamImpact.riskLevel} Risk
        </Badge>
      </div>

      {/* Direct Conflict Section */}
      <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/80 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-950">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Direct Contradiction</span>
        </div>
        <p className="text-xs text-rose-900 leading-relaxed">
          {impact.directConflict}
        </p>
      </div>

      {/* Downstream Impact Section */}
      <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-200/90 space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Potential Downstream Impact</span>
        </div>
        <p className="text-xs text-stone-700 leading-relaxed">
          {impact.downstreamImpact.summary}
        </p>

        {/* Affected Systems / Policies */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-stone-600 mr-1">
            Affected Systems:
          </span>
          {impact.downstreamImpact.affectedSystems.map((sys, idx) => (
            <span
              key={idx}
              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200"
            >
              {sys}
            </span>
          ))}
        </div>

        {/* Dependent Setting Note (if present) */}
        {impact.downstreamImpact.dependentSettings && (
          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200/80 text-[11px] text-amber-950 flex items-start gap-1.5">
            <span className="font-semibold text-amber-900 shrink-0">Dependent Setting:</span>
            <span>{impact.downstreamImpact.dependentSettings}</span>
          </div>
        )}
      </div>

      {/* Resolution Options */}
      <div className="space-y-2 pt-1">
        <label className="block text-xs font-bold text-stone-800">
          Resolution Pathways ({impact.resolutionOptions.length} available)
        </label>
        <div className="space-y-2">
          {impact.resolutionOptions.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => !isConfirmed && setSelectedOptionId(opt.id)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? "bg-orange-50/50 border-orange-300 ring-1 ring-orange-200/80 shadow-2xs"
                    : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/50"
                } ${isConfirmed ? "opacity-75 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`resolution-${conflict.id}`}
                      checked={isSelected}
                      disabled={isConfirmed}
                      onChange={() => setSelectedOptionId(opt.id)}
                      className="accent-orange-600 cursor-pointer"
                    />
                    <span className="font-semibold text-stone-900">
                      {opt.title}
                    </span>
                  </div>
                  {opt.recommended && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Recommended
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-stone-600 text-[11px] pl-5 leading-relaxed">
                  {opt.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Proposed Action & Explicit Human Confirmation */}
      {selectedOption && (
        <div className="mt-3 p-3.5 rounded-xl border border-stone-200 bg-stone-50/70 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-900 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-stone-500" />
              Review Proposed Action Before Execution
            </span>
            <span className="text-[10px] text-stone-500 font-medium">
              Human Gate Required
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-white border border-stone-200 text-xs text-stone-800 space-y-1">
            <div className="text-[11px] text-stone-500 font-medium">
              Action to be recorded:
            </div>
            <p className="font-medium text-stone-900 leading-relaxed text-[11px]">
              {selectedOption.proposedAction}
            </p>
            {selectedOption.targetTaskStatus && (
              <div className="pt-1 text-[10px] text-stone-600">
                <span className="font-semibold">Associated Task Target Status: </span>
                <span className="font-mono px-1 py-0.2 bg-stone-100 rounded text-stone-800">
                  {selectedOption.targetTaskStatus}
                </span>
              </div>
            )}
          </div>

          {/* Confirmation Status / Action */}
          {isConfirmed ? (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span>Resolution Action Confirmed & Applied by Human Operator</span>
                <p className="text-[10px] text-emerald-700 font-normal mt-0.5">
                  {appliedAction}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              <p className="text-[10px] text-stone-500 leading-tight">
                Requires human confirmation. No task status or decision record will change until explicitly confirmed.
              </p>
              <button
                type="button"
                onClick={handleApplyResolution}
                disabled={isApplying || workspaceRole !== "editor"}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-2xs transition-colors shrink-0 disabled:opacity-50"
              >
                {isApplying ? (
                  "Applying..."
                ) : (
                  <>
                    Confirm & Apply Resolution
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

