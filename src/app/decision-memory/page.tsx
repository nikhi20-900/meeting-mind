"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DecisionList } from "@/components/decision-memory/DecisionList";
import { Decision } from "@/types";
import { Database, ShieldAlert, Sparkles, AlertTriangle, RotateCcw, Loader2 } from "lucide-react";

export default function DecisionMemoryPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDecisions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/decisions");
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to load decisions.");
      }
      setDecisions(data.decisions);
    } catch (err: any) {
      console.error("[decision-memory] Fetch error:", err);
      setError(err.message || "Could not retrieve decisions from persistent storage.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, []);

  const activeConflictsCount = decisions.filter(
    (d) => d.status === "Conflict Flagged" || d.hasConflictWarning
  ).length;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-600" />
              <span className="text-xs font-semibold text-orange-900 tracking-wider uppercase">
                Long-Term Organizational Memory
              </span>
              <span className="text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                Persistent Storage Active
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-stone-900">
              Decision Memory Repository
            </h2>
            <p className="text-sm text-stone-500 max-w-2xl">
              Audit and track all decisions agreed across team meetings. Meeting Mind cross-references this index to prevent contradictory commitments and preserve organizational consensus.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-orange-50 border border-orange-200/80 text-orange-800 text-xs font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-orange-600" />
            {activeConflictsCount} Conflicts Flagged in Memory
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-12 bg-white rounded-2xl border border-stone-200/80 shadow-2xs flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-7 h-7 text-orange-600 animate-spin" />
            <h4 className="text-sm font-semibold text-stone-800">
              Loading Decision Memory...
            </h4>
            <p className="text-xs text-stone-500 max-w-xs">
              Retrieving historical commitments from persistent database storage.
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
              Failed to load Decision Memory
            </h4>
            <p className="text-xs text-rose-800 max-w-md mx-auto">{error}</p>
            <button
              onClick={fetchDecisions}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-rose-700 hover:bg-rose-800 transition-colors shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry Connection
            </button>
          </div>
        )}

        {/* Decision List with Real-time Search, Filters, and Empty State */}
        {!loading && !error && (
          <DecisionList initialDecisions={decisions} />
        )}
      </div>
    </AppShell>
  );
}
