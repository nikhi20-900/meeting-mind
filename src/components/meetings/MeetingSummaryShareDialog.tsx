"use client";

import { useState } from "react";
import { Copy, Download, Share2, X } from "lucide-react";
import type { Decision, MeetingSummary, TaskItem } from "@/types";
import type { ConflictRecord } from "@/lib/db/types";
import { createMeetingSummaryMarkdown } from "@/lib/meetingSummaryExport";

interface Props {
  meeting: MeetingSummary;
  decisions: Decision[];
  tasks: TaskItem[];
  conflicts: ConflictRecord[];
  onClose: () => void;
}

function fileName(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return `${slug || "meeting"}-summary.md`;
}

export function MeetingSummaryShareDialog({ meeting, decisions, tasks, conflicts, onClose }: Props) {
  const [summary, setSummary] = useState(() => createMeetingSummaryMarkdown({ meeting, decisions, tasks, conflicts }));
  const [feedback, setFeedback] = useState("");

  async function copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback(successMessage);
    } catch {
      setFeedback("Clipboard access is unavailable. Select and copy the preview text instead.");
    }
  }

  function downloadSummary() {
    const file = new Blob([summary], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName(meeting.title);
    link.click();
    URL.revokeObjectURL(url);
    setFeedback("Summary downloaded.");
  }

  async function shareSummary() {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: meeting.title, text: summary, url });
        setFeedback("Share sheet opened.");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setFeedback("Could not open sharing. You can copy the summary or download it instead.");
      }
      return;
    }
    await copyText(`${summary}\n\nMeeting record: ${url}`, "Summary and meeting link copied.");
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-stone-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-share-heading"
        className="my-auto flex max-h-[min(90vh,900px)] w-full max-w-2xl flex-col rounded-2xl border border-stone-200 bg-white shadow-xl"
        onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-stone-100 p-5 sm:p-6">
          <div>
            <h2 id="meeting-share-heading" className="text-lg font-semibold tracking-tight text-stone-950">Share or download a summary</h2>
            <p className="mt-1 max-w-xl text-sm leading-5 text-stone-600">Review or edit the summary before sharing. The full transcript is not included.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close sharing options" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900"><X className="h-4 w-4" /></button>
        </header>
        <div className="min-h-0 flex-1 p-5 sm:p-6">
          <label htmlFor="meeting-summary-preview" className="mb-2 block text-sm font-medium text-stone-800">Summary preview</label>
          <textarea
            id="meeting-summary-preview"
            value={summary}
            onChange={(event) => { setSummary(event.target.value); setFeedback(""); }}
            rows={16}
            className="h-[min(52vh,520px)] w-full resize-y rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-3 font-mono text-xs leading-5 text-stone-800 outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
          />
          <p className="mt-2 text-xs leading-5 text-stone-500">The meeting link opens this workspace record. People may need workspace access.</p>
          <p role="status" aria-live="polite" className="mt-2 min-h-5 text-xs font-medium text-stone-700">{feedback}</p>
        </div>
        <footer className="flex flex-col-reverse gap-2 border-t border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <button type="button" onClick={() => void copyText(summary, "Summary copied.")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"><Copy className="h-4 w-4" />Copy summary</button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={downloadSummary} className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"><Download className="h-4 w-4" />Download .md</button>
            <button type="button" onClick={() => void shareSummary()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-700"><Share2 className="h-4 w-4" />Share</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
