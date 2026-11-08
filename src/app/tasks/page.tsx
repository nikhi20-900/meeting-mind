"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskItem } from "@/types";
import {
  CheckSquare,
  AlertCircle,
  Calendar,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  RotateCcw,
  Clock,
  Layers,
  FileText,
  Gavel,
  Loader2,
  AlertTriangle,
} from "lucide-react";

export default function TaskTrackerPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "confirm" | "reject" | "undo";
    undoTaskId?: string;
  } | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Tasks could not be loaded.");
      }
      setTasks(data.tasks);
    } catch (err: any) {
      console.error("[tasks] Fetch error:", err);
      setError(err.message || "Failed to load tasks from persistent storage.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Status options for filtering
  const statusOptions: Array<{ id: string; label: string }> = [
    { id: "ALL", label: "All Statuses" },
    { id: "Awaiting Approval", label: "Awaiting Approval" },
    { id: "Confirmed", label: "Confirmed" },
    { id: "In Progress", label: "In Progress" },
    { id: "Completed", label: "Completed" },
    { id: "Rejected", label: "Rejected" },
  ];

  const priorityOptions: Array<{ id: string; label: string }> = [
    { id: "ALL", label: "All Priorities" },
    { id: "High", label: "High" },
    { id: "Medium", label: "Medium" },
    { id: "Low", label: "Low" },
  ];

  // Actions for tasks with "Awaiting Approval" (Persisted via PATCH /api/tasks)
  const handleConfirmTask = async (taskId: string) => {
    setActionInProgressId(taskId);
    setActionError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: "Confirmed" }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to update task.");
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: "Confirmed", requiresUserConfirmation: false }
            : t
        )
      );

      setToastMessage({
        text: "Task confirmed.",
        type: "confirm",
        undoTaskId: taskId,
      });
      setTimeout(() => setToastMessage((curr) => (curr?.undoTaskId === taskId ? null : curr)), 4500);
    } catch (err: any) {
      setActionError(err.message || "Could not confirm this task. Try again.");
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleRejectTask = async (taskId: string) => {
    setActionInProgressId(taskId);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: "Rejected" }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to reject task.");
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: "Rejected", requiresUserConfirmation: false }
            : t
        )
      );

      setToastMessage({
        text: "Task declined.",
        type: "reject",
        undoTaskId: taskId,
      });
      setTimeout(() => setToastMessage((curr) => (curr?.undoTaskId === taskId ? null : curr)), 4500);
    } catch (err: any) {
      setActionError(err.message || "Could not decline this task. Try again.");
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleUndo = async (taskId: string) => {
    setActionError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: "Awaiting Approval" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Could not undo this change.");

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: "Awaiting Approval", requiresUserConfirmation: true }
            : t
        )
      );
      setToastMessage(null);
    } catch (err: any) {
      setActionError(err.message || "Could not undo this change. Try again.");
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        task.title.toLowerCase().includes(q) ||
        task.owner.name.toLowerCase().includes(q) ||
        task.owner.role.toLowerCase().includes(q) ||
        task.associatedMeeting.toLowerCase().includes(q) ||
        (task.associatedDecisionText &&
          task.associatedDecisionText.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "ALL" || task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "ALL" || task.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "ALL" ||
    priorityFilter !== "ALL";

  const awaitingApprovalCount = tasks.filter(
    (t) => t.status === "Awaiting Approval"
  ).length;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header & Phase 3 Context */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-stone-950">Tasks</h2>
            <p className="text-sm text-stone-600 max-w-2xl">Review suggested tasks, confirm the ones your team agreed to, and track what is in progress.</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">
            <span className="font-semibold text-stone-950">{awaitingApprovalCount}</span> need your review
          </div>
        </div>

        {actionError && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {actionError}
          </div>
        )}

        {/* Action feedback */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className={`p-3.5 px-4 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in duration-150 ${
              toastMessage.type === "confirm"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-stone-100 border-stone-200 text-stone-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === "confirm" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{toastMessage.text}</span>
            </div>

            {toastMessage.undoTaskId && (
              <button
                type="button"
                onClick={() => handleUndo(toastMessage.undoTaskId!)}
                className="text-xs font-semibold text-stone-700 underline hover:text-stone-900 shrink-0 cursor-pointer"
              >
                Undo Action
              </button>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="p-12 bg-white rounded-2xl border border-stone-200/80 shadow-2xs flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-7 h-7 text-orange-600 animate-spin" />
            <h4 role="status" aria-live="polite" className="text-sm font-semibold text-stone-800">
              Loading tasks…
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
              Failed to load tasks
            </h4>
            <p className="text-xs text-rose-800 max-w-md mx-auto">{error}</p>
            <button
              onClick={fetchTasks}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-rose-700 hover:bg-rose-800 transition-colors shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Search & Filter Bar */}
        {!loading && !error && (
          <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                aria-label="Search tasks"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, owners, meetings, or decisions"
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

            {/* Filters Row: Status + Priority */}
            <div className="space-y-3 pt-1 border-t border-stone-100">
              {/* Status Filter Tabs */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-orange-600" />
                  Status
                </span>

                <div role="group" aria-label="Filter tasks by status" className="flex flex-wrap items-center gap-1.5">
                  {statusOptions.map((opt) => {
                    const count =
                      opt.id === "ALL"
                        ? tasks.length
                        : tasks.filter((t) => t.status === opt.id).length;

                    return (
                      <button
                        type="button"
                        key={opt.id}
                        aria-pressed={statusFilter === opt.id}
                        onClick={() => setStatusFilter(opt.id)}
                        className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                          statusFilter === opt.id
                            ? "bg-stone-900 text-white border-stone-900 shadow-2xs font-semibold"
                            : "bg-stone-50/80 text-stone-600 border-stone-200 hover:bg-stone-100 hover:text-stone-900"
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            statusFilter === opt.id
                              ? "bg-stone-800 text-stone-200"
                              : opt.id === "Awaiting Approval" && count > 0
                              ? "bg-amber-100 text-amber-800 font-semibold"
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

              {/* Priority Filter Chips */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-stone-100/80">
                <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5 shrink-0">
                  <Layers className="w-3.5 h-3.5 text-stone-500" />
                  Priority
                </span>

                <div role="group" aria-label="Filter tasks by priority" className="flex flex-wrap items-center gap-1.5">
                  {priorityOptions.map((opt) => {
                    const count =
                      opt.id === "ALL"
                        ? tasks.length
                        : tasks.filter((t) => t.priority === opt.id).length;

                    return (
                      <button
                        type="button"
                        key={opt.id}
                        aria-pressed={priorityFilter === opt.id}
                        onClick={() => setPriorityFilter(opt.id)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                          priorityFilter === opt.id
                            ? "bg-orange-600 text-white border-orange-600 shadow-2xs font-semibold"
                            : "bg-white text-stone-600 border-stone-200 hover:bg-orange-50/50 hover:text-stone-900"
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            priorityFilter === opt.id
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

            {/* Results Summary */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-500">
              <div>
                Showing <strong className="text-stone-900 font-semibold">{filteredTasks.length}</strong> of {tasks.length} tasks
                {awaitingApprovalCount > 0 && (
                  <span className="ml-2 text-amber-700 font-medium">
                    ({awaitingApprovalCount} need review)
                  </span>
                )}
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200/80 transition-colors cursor-pointer font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset all filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Task Cards or Empty State */}
        {!loading && !error && filteredTasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="No matching tasks"
            description={
              hasActiveFilters
                ? `No tasks found for query "${searchQuery}" with status "${statusFilter}" and priority "${priorityFilter}".`
                : "No tasks yet. Add a meeting recap to capture suggested tasks."
            }
            actionLabel={hasActiveFilters ? "Clear All Filters" : undefined}
            onAction={hasActiveFilters ? handleResetFilters : undefined}
          />
        ) : !loading && !error ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {filteredTasks.map((task) => {
              const isAwaiting = task.status === "Awaiting Approval";
              const isActionRunning = actionInProgressId === task.id;

              return (
                <div
                  key={task.id}
                  className={`p-5 sm:p-6 bg-white rounded-2xl border transition-all duration-150 flex flex-col justify-between ${
                    isAwaiting
                      ? "border-amber-300/90 bg-amber-50/15 shadow-xs ring-1 ring-amber-400/20"
                      : task.status === "Rejected"
                      ? "border-stone-200/60 bg-stone-50/40 opacity-75"
                      : "border-stone-200/80 hover:border-stone-300 shadow-2xs"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Priority Badge, Status Badge & Task ID */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            task.priority === "High"
                              ? "high"
                              : task.priority === "Medium"
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {task.priority} Priority
                        </Badge>

                        {task.status === "Awaiting Approval" ? (
                          <Badge variant="warning" className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            Awaiting Approval
                          </Badge>
                        ) : task.status === "Confirmed" ? (
                          <Badge variant="confirmed" className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Confirmed
                          </Badge>
                        ) : task.status === "In Progress" ? (
                          <Badge variant="neutral" className="flex items-center gap-1 bg-sky-50 text-sky-800 border-sky-200">
                            <Clock className="w-3 h-3 text-sky-600" />
                            In Progress
                          </Badge>
                        ) : task.status === "Completed" ? (
                          <Badge variant="confirmed" className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="flex items-center gap-1 bg-stone-100 text-stone-500 border-stone-200">
                            <XCircle className="w-3 h-3 text-stone-400" />
                            Rejected
                          </Badge>
                        )}
                      </div>

                      <span className="font-mono text-xs text-stone-400 shrink-0">
                        #{task.id}
                      </span>
                    </div>

                    {/* Task Title */}
                    <h3 className="text-base sm:text-lg font-semibold text-stone-900 leading-snug">
                      {task.title}
                    </h3>

                    {/* Owner & Due Date Card Block */}
                    <div className="p-3 rounded-xl bg-stone-50/70 border border-stone-200/70 flex items-center justify-between gap-3 text-xs">
                      {/* Owner Info */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-stone-800 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                          {task.owner.avatar}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-stone-900 block leading-tight truncate">
                            {task.owner.name}
                          </span>
                          <span className="text-[11px] text-stone-500 leading-tight block truncate">
                            {task.owner.role}
                          </span>
                        </div>
                      </div>

                      {/* Due Date */}
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-stone-400 font-mono uppercase block">
                          Due Date
                        </span>
                        <span className="font-semibold text-stone-800 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          {task.dueDate}
                        </span>
                      </div>
                    </div>

                    {/* Associated Context Section: Origin Meeting & Linked Decision */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 text-stone-600">
                        <FileText className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="font-medium text-stone-700">Associated Meeting:</span>
                        <span className="text-stone-800 truncate">{task.associatedMeeting}</span>
                      </div>

                      {task.associatedDecisionText && (
                        <div className="flex items-start gap-1.5 text-stone-600 bg-[#FAF9F6] p-2.5 rounded-lg border border-stone-100">
                          <Gavel className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium text-stone-700">Linked Decision: </span>
                            <span className="text-stone-600">{task.associatedDecisionText}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Area: Confirm & Reject for tasks with "Awaiting Approval" */}
                  {isAwaiting ? (
                    <div className="mt-4 pt-3.5 border-t border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-amber-800 font-medium">
                        Review this suggested task before confirming it:
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          aria-busy={isActionRunning}
                          onClick={() => handleRejectTask(task.id)}
                          disabled={isActionRunning}
                          type="button"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-stone-700 bg-white border border-stone-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 disabled:opacity-50 transition-colors cursor-pointer shadow-2xs"
                          title="Reject and archive task"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          Reject
                        </button>

                        <button
                          type="button"
                          aria-busy={isActionRunning}
                          onClick={() => handleConfirmTask(task.id)}
                          disabled={isActionRunning}
                          type="button"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                          title="Confirm task and authorize assignment"
                        >
                          {isActionRunning ? (
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Confirm task
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                      <span>Status: <strong className="text-stone-800 font-semibold">{task.status}</strong></span>
                      <span className="text-[11px] text-stone-400 font-mono"></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
