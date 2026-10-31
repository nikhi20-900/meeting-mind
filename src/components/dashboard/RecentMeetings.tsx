import React from "react";
import Link from "next/link";
import { MeetingSummary } from "@/types";
import { Badge } from "@/components/ui/Badge";
import {
  Calendar,
  Clock,
  Users,
  FileCheck2,
  ListTodo,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

export function RecentMeetings({ meetings }: { meetings: MeetingSummary[] }) {
  return (
    <div className="space-y-3">
      {meetings.map((meeting) => (
        <div
          key={meeting.id}
          className="group p-4 sm:p-5 bg-white rounded-xl border border-stone-200/80 hover:border-stone-300 hover:shadow-xs transition-all duration-150"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-semibold text-stone-900 group-hover:text-orange-950 transition-colors text-sm sm:text-base">
                  {meeting.title}
                </span>
                <Badge variant="active" className="text-[11px]">
                  {meeting.status}
                </Badge>
                {meeting.conflictsDetected > 0 && (
                  <Badge variant="conflict" className="flex items-center gap-1 text-[11px]">
                    <AlertTriangle className="w-3 h-3" />
                    {meeting.conflictsDetected} Conflict Flagged
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  {meeting.date}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  {meeting.duration}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-stone-400" />
                  {meeting.participants.length} attendees ({meeting.participants[0]} + {meeting.participants.length - 1})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 shrink-0">
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-stone-50 border border-stone-200 text-stone-700 font-medium">
                <FileCheck2 className="w-3.5 h-3.5 text-stone-500" />
                {meeting.decisionsCount} Decisions
              </span>
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-stone-50 border border-stone-200 text-stone-700 font-medium">
                <ListTodo className="w-3.5 h-3.5 text-stone-500" />
                {meeting.tasksCount} Tasks
              </span>
            </div>
          </div>

          <p className="mt-3 text-xs sm:text-sm text-stone-600 line-clamp-2 leading-relaxed bg-[#FAF9F6] p-2.5 rounded-lg border border-stone-100">
            <span className="font-medium text-stone-700">Recap: </span>
            {meeting.snippet}
          </p>
        </div>
      ))}
    </div>
  );
}
