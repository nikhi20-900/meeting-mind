"use client";

import React, { useState, useMemo } from "react";
import { Decision, DecisionStatus } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { DecisionImpactPanel } from "@/components/conflicts/DecisionImpactPanel";
import {
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  Gavel,
  FileText,
  RotateCcw,
  Layers,
} from "lucide-react";

export function DecisionList({ initialDecisions }: { initialDecisions: Decision[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [expandedImpactId, setExpandedImpactId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set(initialDecisions.map((d) => d.category));
    return ["ALL", ...Array.from(set)];
  }, [initialDecisions]);

  const statusOptions = ["ALL", "Active", "Conflict Flagged", "Under Review", "Superseded"];

  const filteredDecisions = useMemo(() => {
    return initialDecisions.filter((decision) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        decision.decisionText.toLowerCase().includes(q) ||
        decision.meetingReference.toLowerCase().includes(q) ||
        decision.rationale.toLowerCase().includes(q) ||
        (decision.conflictNotes && decision.conflictNotes.toLowerCase().includes(q)) ||
        decision.category.toLowerCase().includes(q);

      const matchesStatus =
        selectedStatus === "ALL" || decision.status === selectedStatus;

      const matchesCategory =
        selectedCategory === "ALL" || decision.category === selectedCategory;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [initialDecisions, searchQuery, selectedStatus, selectedCategory]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedStatus("ALL");
    setSelectedCategory("ALL");
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedStatus !== "ALL" ||
    selectedCategory !== "ALL";

  return (
    <div className="space-y-6">
      {/* Search & Comprehensive Multi-Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
        {/* Search Input Field */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search decisions, notes, or meeting names"
            className="w-full pl-10 pr-20 py-2.5 text-sm bg-stone-50/70 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-stone-900 placeholder:text-stone-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-stone-400 hover:text-stone-700 bg-stone-200/60 hover:bg-stone-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Controls Row: Status Filters + Category Filters */}
        <div className="space-y-3 pt-1 border-t border-stone-100">
          {/* Status Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5 shrink-0">
              <Filter className="w-3.5 h-3.5 text-orange-600" />
              Status
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              {statusOptions.map((status) => {
                const count =
                  status === "ALL"
                    ? initialDecisions.length
                    : initialDecisions.filter((d) => d.status === status).length;

                return (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedStatus === status
                        ? "bg-stone-900 text-white border-stone-900 shadow-2xs font-semibold"
                        : "bg-stone-50/80 text-stone-600 border-stone-200 hover:bg-stone-100 hover:text-stone-900"
                    }`}
                  >
                    <span>{status === "ALL" ? "All Statuses" : status}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        selectedStatus === status
                          ? "bg-stone-800 text-stone-200"
                          : "bg-stone-200 text-stone-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-stone-100/80">
            <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5 shrink-0">
              <Layers className="w-3.5 h-3.5 text-stone-500" />
              Category
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map((category) => {
                const count =
                  category === "ALL"
                    ? initialDecisions.length
                    : initialDecisions.filter((d) => d.category === category).length;

                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedCategory === category
                        ? "bg-orange-600 text-white border-orange-600 shadow-2xs font-semibold"
                        : "bg-white text-stone-600 border-stone-200 hover:bg-orange-50/50 hover:text-stone-900"
                    }`}
                  >
                    <span>{category === "ALL" ? "All Categories" : category}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        selectedCategory === category
                          ? "bg-orange-700 text-orange-100"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Results summary & Active Reset Button */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-stone-900 font-semibold">{filteredDecisions.length}</strong> of {initialDecisions.length} decisions
            </span>
            {hasActiveFilters && (
              <span className="text-orange-700 font-medium">
                (filters active)
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200/80 transition-colors cursor-pointer font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Decision Results or Empty State */}
      {filteredDecisions.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="No matching decisions"
          description={
            hasActiveFilters
              ? `No decisions match your search "${searchQuery}" with status "${selectedStatus}" and category "${selectedCategory}". Try clearing your filters.`
              : "No decisions yet. Add a meeting recap to start building this list."
          }
          actionLabel={hasActiveFilters ? "Clear All Filters" : undefined}
          onAction={hasActiveFilters ? handleResetFilters : undefined}
        />
      ) : (
        <div className="space-y-3.5">
          {filteredDecisions.map((decision) => (
            <div
              key={decision.id}
              className={`p-5 sm:p-6 bg-white rounded-2xl border transition-all duration-150 ${
                decision.hasConflictWarning
                  ? "border-rose-200/90 shadow-2xs bg-rose-50/10"
                  : "border-stone-200/80 hover:border-stone-300 shadow-2xs"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-2 flex-1 min-w-0">
                  {/* Top badges row */}
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
                    >
                      {decision.status}
                    </Badge>

                    {decision.status === "Conflict Flagged" && (
                      <Badge variant="conflict" className="text-[11px]">
                        {decision.conflictSeverity || "Critical"} Severity
                      </Badge>
                    )}

                    <Badge variant="neutral">
                      {decision.category}
                    </Badge>

                    <span className="text-xs text-stone-500 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      {decision.date}
                    </span>
                  </div>

                  {/* Decision Text */}
                  <h3 className="text-base sm:text-lg font-semibold text-stone-900 leading-snug">
                    {decision.decisionText}
                  </h3>

                  {/* Meeting Reference */}
                  <div className="flex items-center gap-1.5 text-xs text-stone-500">
                    <FileText className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>Meeting:</span>
                    <span className="font-medium text-stone-800">
                      {decision.meetingReference}
                    </span>
                  </div>
                </div>

                {/* ID Tag */}
                <div className="shrink-0 font-mono text-xs text-stone-400 sm:text-right">
                  #{decision.id.toUpperCase()}
                </div>
              </div>

              {/* Rationale explanation */}
              <div className="mt-3.5 p-3 rounded-xl bg-[#FAF9F6] border border-stone-100 text-xs text-stone-600 leading-relaxed">
                <span className="font-semibold text-stone-800">Context: </span>
                {decision.rationale}
              </div>

              {/* Conflict Highlight Callout */}
              {decision.hasConflictWarning && decision.conflictNotes && (
                <div className="mt-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="font-semibold text-rose-950 flex items-center justify-between gap-2">
                      <span>Possible conflict with an earlier decision</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 border border-rose-300">
                        {decision.conflictSeverity || "Critical"} Severity
                      </span>
                    </div>
                    <p className="text-rose-800 leading-relaxed">
                      {decision.conflictNotes}
                    </p>
                    {decision.conflictResolution ? (
                      <div className="pt-1 text-[11px] text-rose-900 bg-rose-100/60 p-2 rounded-lg border border-rose-200/60 font-medium">
                        <strong className="text-rose-950">Suggested next step: </strong>
                        {decision.conflictResolution}
                      </div>
                    ) : (
                      <div className="pt-1 text-[11px] text-rose-700 font-medium">
                        {decision.category === "Governance"
                          ? "Requires Security & Compliance review before modifying authentication or governance standards."
                          : decision.category === "Architecture"
                          ? "Requires Architecture sync to resolve infrastructure divergence and capacity constraints."
                          : decision.category === "Client SLA"
                          ? "Requires Client Success alignment before adjusting contractual service level thresholds."
                          : "Requires human review and resolution before changes are adopted."}
                      </div>
                    )}
                    {decision.dependentSettingsNote && (
                      <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 font-medium">
                        <strong className="text-amber-950">Related note: </strong>
                        {decision.dependentSettingsNote}
                      </div>
                    )}

                    {/* Interactive Decision Impact Engine toggle */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedImpactId(
                            expandedImpactId === decision.id ? null : decision.id
                          )
                        }
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-orange-700 hover:text-orange-800 bg-orange-100/60 hover:bg-orange-100 px-2.5 py-1 rounded-lg border border-orange-200 transition-colors"
                      >
                        <Layers className="w-3.5 h-3.5 text-orange-600" />
                        {expandedImpactId === decision.id
                          ? "Hide impact notes"
                          : "View possible impact"}
                      </button>
                    </div>

                    {expandedImpactId === decision.id && (
                      <div className="pt-2">
                        <DecisionImpactPanel
                          conflict={{
                            id: `conf-${decision.id}`,
                            newDecisionText: decision.decisionText,
                            historicalDecisionId: decision.id,
                            historicalDecisionText: decision.decisionText,
                            conflictDescription: decision.conflictNotes,
                            severity: decision.conflictSeverity || "Critical",
                            suggestedResolution: decision.conflictResolution,
                            dependentSettingsNote: decision.dependentSettingsNote,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
