import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MeetingInputForm } from "@/components/new-meeting/MeetingInputForm";
import { Bot, Sparkles } from "lucide-react";

export default function NewMeetingPage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Intro */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-600" />
            <span className="text-xs font-semibold text-orange-900 tracking-wider uppercase">
              Phase 2 Extraction Engine
            </span>
            <span className="text-[11px] font-medium bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 rounded-full">
              Live LLM Extraction
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900">
            Process Meeting Recap
          </h2>
          <p className="text-sm text-stone-500 max-w-2xl">
            Dictate with Wispr Flow or paste your meeting recap. Meeting Mind extracts structured summaries, consensus decisions, action items with owners and deadlines, and speaker attributions via server-side LLM intelligence.
          </p>
        </div>

        {/* Meeting Input Form & Extraction Results */}
        <MeetingInputForm />
      </div>
    </AppShell>
  );
}
