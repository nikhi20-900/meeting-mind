"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Layers, Loader2, ShieldAlert } from "lucide-react";
import { DecisionStatus } from "@/types";
import { getDecisionImpact } from "@/lib/decisionImpact";
import { useWorkspaceRole } from "@/components/auth/WorkspaceAccessGate";
import { Badge } from "@/components/ui/Badge";

interface DecisionImpactPanelProps {
  conflict: {
    id: string;
    historicalDecisionId: string;
    historicalDecisionText: string;
    conflictDescription?: string;
    severity?: "Critical" | "Warning";
    suggestedResolution?: string;
    dependentSettingsNote?: string;
  };
  onSaved?: () => void;
}

export function DecisionImpactPanel({ conflict, onSaved }: DecisionImpactPanelProps) {
  const workspaceRole = useWorkspaceRole();
  const impact = getDecisionImpact(conflict);
  const [selectedStatus, setSelectedStatus] = useState<DecisionStatus | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [savedStatus, setSavedStatus] = useState<DecisionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function applyDecisionStatus() {
    if (!selectedStatus || !conflict.historicalDecisionId) return;
    setIsApplying(true);
    setError(null);
    try {
      const response = await fetch("/api/conflicts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: conflict.id,
          earlierDecisionStatus: selectedStatus,
          resolutionNotes: `Human selected: ${selectedStatus}`,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "The earlier decision could not be updated.");
      }
      setSavedStatus(selectedStatus);
      onSaved?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The earlier decision could not be updated.");
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs sm:p-5" aria-label="Conflict review">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-stone-200 bg-stone-100 text-stone-700">
            <Layers className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h4 className="text-sm font-semibold text-stone-900">Review the conflict</h4>
            <p className="text-[11px] text-stone-500">Compare the recorded evidence before changing the earlier decision.</p>
          </div>
        </div>
        <Badge variant={impact.downstreamImpact.riskLevel === "Critical" ? "conflict" : "warning"}>
          {impact.downstreamImpact.riskLevel} attention
        </Badge>
      </div>

      <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-rose-950">
          <ShieldAlert className="h-4 w-4 text-rose-700" aria-hidden="true" />
          Recorded conflict evidence
        </div>
        <p className="whitespace-pre-line text-xs leading-relaxed text-rose-900">{impact.directConflict}</p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-[#FAF9F6] p-3.5">
        <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-stone-900">
          <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden="true" />
          What is known about impact
        </div>
        <p className="text-xs leading-relaxed text-stone-700">{impact.downstreamImpact.summary}</p>
        {impact.downstreamImpact.dependentSettings && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] leading-relaxed text-amber-950">
            <strong>Recorded dependent setting: </strong>{impact.downstreamImpact.dependentSettings}
          </p>
        )}
        {impact.suggestedNextStep && (
          <p className="mt-2 rounded-lg border border-stone-200 bg-white p-2 text-[11px] leading-relaxed text-stone-700">
            <strong>Suggested next step for review: </strong>{impact.suggestedNextStep}
          </p>
        )}
      </div>

      {impact.resolutionOptions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-stone-800">Choose how to update the earlier decision</p>
          {impact.resolutionOptions.map((option) => (
            <label key={option.id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-xs transition-colors ${selectedStatus === option.targetDecisionStatus ? "border-stone-500 bg-stone-50" : "border-stone-200 bg-white hover:bg-stone-50"}`}>
              <input
                type="radio"
                name={`conflict-resolution-${conflict.id}`}
                checked={selectedStatus === option.targetDecisionStatus}
                disabled={savedStatus !== null}
                onChange={() => setSelectedStatus(option.targetDecisionStatus)}
                className="mt-0.5 accent-stone-800"
              />
              <span>
                <span className="block font-semibold text-stone-900">{option.title}</span>
                <span className="mt-1 block leading-relaxed text-stone-600">{option.description}</span>
              </span>
            </label>
          ))}
          <p className="text-[11px] text-stone-500">This updates the earlier decision and moves the newer conflicting decision to Under Review. Tasks are unchanged.</p>

          {savedStatus ? (
            <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
              <span>Earlier decision saved as <strong>{savedStatus}</strong>.</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={applyDecisionStatus}
              disabled={!selectedStatus || isApplying || workspaceRole !== "editor"}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-stone-900 px-3.5 text-xs font-semibold text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isApplying && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Save earlier decision status
            </button>
          )}
          {error && <p role="alert" className="text-xs text-rose-700">{error} Refresh the record to confirm its current status.</p>}
        </div>
      ) : (
        <p className="text-xs text-stone-600">The earlier decision link is missing, so no status change is available from this panel.</p>
      )}
    </section>
  );
}
