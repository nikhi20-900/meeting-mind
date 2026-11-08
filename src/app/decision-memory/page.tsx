"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DecisionList } from "@/components/decision-memory/DecisionList";
import { Decision } from "@/types";
import { ShieldAlert, AlertTriangle, RotateCcw, Loader2 } from "lucide-react";

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
            <h2 className="text-2xl font-semibold tracking-tight text-stone-950">Decision memory</h2>
            <p className="text-sm text-stone-600 max-w-2xl">Find what your team decided, where it came from, and what may need review.</p>
          </div>
          {activeConflictsCount > 0 && (
            <div className="flex items-center gap-2 self-start sm:self-auto rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-900">
              <ShieldAlert className="h-4 w-4" />
              {activeConflictsCount} {activeConflictsCount === 1 ? "decision needs" : "decisions need"} review
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-12 bg-white rounded-2xl border border-stone-200/80 shadow-2xs flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-7 h-7 text-orange-600 animate-spin" />
            <h4 className="text-sm font-semibold text-stone-800">
              Loading decisions…
            </h4>
            <p className="text-xs text-stone-500 max-w-xs">
              Just a moment.
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
              Decisions could not be loaded
            </h4>
            <p className="text-xs text-rose-800 max-w-md mx-auto">{error}</p>
            <button
              onClick={fetchDecisions}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-rose-700 hover:bg-rose-800 transition-colors shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Try again
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
