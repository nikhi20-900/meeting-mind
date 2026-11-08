"use client";

import React, { useState } from "react";
import { TaskItem } from "@/types";
import { Badge } from "@/components/ui/Badge";
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";

export function UpcomingTasks({ initialTasks }: { initialTasks: TaskItem[] }) {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  const handleConfirm = async (taskId: string) => {
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: "Confirmed" }),
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: "Confirmed", requiresUserConfirmation: false }
            : t
        )
      );
      setConfirmedId(taskId);
      setTimeout(() => setConfirmedId(null), 2500);
    } catch (err) {
      console.error("Failed to confirm task:", err);
    }
  };

  return (
    <div className="space-y-3">
      {tasks.slice(0, 4).map((task) => {
        const isAwaitingApproval =
          task.status === "Awaiting Approval" || task.requiresUserConfirmation;

        return (
          <div
            key={task.id}
            className={`p-4 bg-white rounded-xl border transition-all duration-150 ${
              isAwaitingApproval
                ? "border-amber-200/90 bg-amber-50/20"
                : "border-stone-200/80 hover:border-stone-300"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      task.priority === "High"
                        ? "high"
                        : task.priority === "Medium"
                        ? "warning"
                        : "neutral"
                    }
                    className="text-[11px]"
                  >
                    {task.priority === "Unknown" ? "Priority unknown" : `${task.priority} Priority`}
                  </Badge>

                  {isAwaitingApproval ? (
                    <Badge variant="warning" className="flex items-center gap-1 text-[11px]">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      Awaiting Approval
                    </Badge>
                  ) : (
                    <Badge variant="confirmed" className="flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {task.status}
                    </Badge>
                  )}

                  <span className="text-xs text-stone-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    Due {task.dueDate}
                  </span>
                </div>

                <p className="text-sm font-medium text-stone-900 leading-snug">
                  {task.title}
                </p>

                <p className="text-xs text-stone-500 truncate">
                  Source: <span className="text-stone-700">{task.associatedMeeting}</span>
                </p>
              </div>

              {/* Owner & Action */}
              <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-stone-800 text-[10px] text-white flex items-center justify-center font-medium">
                    {task.owner.avatar}
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs font-semibold text-stone-800 leading-tight">
                      {task.owner.name}
                    </p>
                    <p className="text-[10px] text-stone-500 leading-tight">
                      {task.owner.role}
                    </p>
                  </div>
                </div>

                {isAwaitingApproval ? (
                  <button
                    onClick={() => handleConfirm(task.id)}
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 transition-colors shadow-2xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirm
                  </button>
                ) : confirmedId === task.id ? (
                  <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
