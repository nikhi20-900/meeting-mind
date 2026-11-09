import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MeetingInputForm } from "@/components/new-meeting/MeetingInputForm";

// This route is intentionally held behind the workspace access check in the root layout.
export const instant = false;

export default function NewMeetingPage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="max-w-2xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-800">New meeting</p>
          <h2 className="text-2xl font-semibold tracking-tight text-stone-950">
            Add a meeting recap
          </h2>
          <p className="text-sm leading-relaxed text-stone-600">
            Add a transcript or short recap. Review the decisions and tasks before saving them.
          </p>
        </div>

        {/* Meeting input and review */}
        <MeetingInputForm />
      </div>
    </AppShell>
  );
}
