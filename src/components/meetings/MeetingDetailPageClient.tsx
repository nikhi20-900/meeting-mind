"use client";

import { use, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import type { Decision, MeetingSummary, TaskItem } from "@/types";
import type { ConflictRecord } from "@/lib/db/types";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckSquare,
  Share2,
  Clock3,
  FileText,
  Gavel,
  Loader2,
  Users,
} from "lucide-react";
import { MeetingSummaryShareDialog } from "./MeetingSummaryShareDialog";

interface MeetingDetail {
  meeting: MeetingSummary;
  decisions: Decision[];
  tasks: TaskItem[];
  conflicts: ConflictRecord[];
}

export default function MeetingDetailPageClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/meetings/${encodeURIComponent(id)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Meeting details could not be loaded.");
        if (active) setDetail(result);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Meeting details could not be loaded.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-950">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />Meeting overview
        </Link>

        {loading && (
          <div role="status" className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-8 text-sm text-stone-600">
            <Loader2 className="h-5 w-5 animate-spin text-orange-700" aria-hidden="true" />Loading meeting details…
          </div>
        )}

        {!loading && error && (
          <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
            <h1 className="font-semibold">Meeting details unavailable</h1>
            <p className="mt-2">{error}</p>
            <Link href="/" className="mt-4 inline-flex items-center gap-2 font-semibold underline">Return to overview</Link>
          </section>
        )}

        {!loading && !error && detail && (
          <>
            <header className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-800">Meeting record</p>
                <button type="button" onClick={() => setShareOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50">
                  <Share2 className="h-4 w-4" aria-hidden="true" />Share or export
                </button>
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">{detail.meeting.title}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone-600">
                <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-stone-400" aria-hidden="true" />{detail.meeting.date}</span>
                <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-stone-400" aria-hidden="true" />{detail.meeting.duration}</span>
                <span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-stone-400" aria-hidden="true" />{detail.meeting.participants.length ? detail.meeting.participants.join(", ") : "Participants not recorded"}</span>
              </div>
              <nav aria-label="Meeting sections" className="mt-6 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
                <a href="#recap" className="rounded-lg bg-stone-100 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-200">Recap</a>
                <a href="#decisions" className="rounded-lg bg-stone-100 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-200">Decisions · {detail.decisions.length}</a>
                <a href="#conflicts" className="rounded-lg bg-stone-100 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-200">Conflicts · {detail.conflicts.length}</a>
                <a href="#tasks" className="rounded-lg bg-stone-100 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-200">Tasks · {detail.tasks.length}</a>
              </nav>
            </header>

            <section id="recap" className="scroll-mt-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
              <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-stone-500" aria-hidden="true" /><h2 className="text-base font-semibold text-stone-950">Meeting recap</h2></div>
              {detail.meeting.recapText ? (
                <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-stone-700">{detail.meeting.recapText}</div>
              ) : detail.meeting.snippet ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                  <p className="text-sm leading-6 text-stone-800">{detail.meeting.snippet}</p>
                  <p className="mt-3 text-xs leading-5 text-amber-900">This older meeting record contains a short recap preview, but its full transcript or recap was not saved.</p>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-stone-600">No meeting recap is available for this record.</p>
              )}
            </section>

            <section id="decisions" className="scroll-mt-6 space-y-3">
              <SectionHeading icon={<Gavel className="h-4 w-4" aria-hidden="true" />} title="Decisions" count={detail.decisions.length} />
              {detail.decisions.length === 0 ? <EmptySection text="No decisions are linked to this meeting." /> : detail.decisions.map((decision) => {
                const linkedTasks = detail.tasks.filter((task) => task.associatedDecisionId === decision.id);
                const linkedConflicts = detail.conflicts.filter((conflict) => conflict.sourceDecisionId === decision.id || conflict.targetDecisionId === decision.id);
                return (
                  <article id={`decision-${decision.id}`} key={decision.id} className="scroll-mt-6 rounded-2xl border border-stone-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant={decision.status === "Conflict Flagged" ? "conflict" : decision.status === "Active" ? "active" : "neutral"}>{decision.status}</Badge>
                      <Link href={`/decision-memory#decision-${encodeURIComponent(decision.id)}`} className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-900">{decision.id}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
                    </div>
                    <h3 className="mt-3 text-sm font-semibold leading-6 text-stone-950">{decision.decisionText}</h3>
                    {decision.rationale && decision.rationale !== "Unknown" && <p className="mt-2 text-sm leading-6 text-stone-600">{decision.rationale}</p>}
                    {decision.evidence && decision.evidence !== "Unknown" && <blockquote className="mt-3 border-l-2 border-stone-300 pl-3 text-xs italic leading-5 text-stone-600">{decision.evidence}</blockquote>}
                    {(linkedTasks.length > 0 || linkedConflicts.length > 0) && (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                        {linkedTasks.map((task) => <a key={task.id} href={`#task-${encodeURIComponent(task.id)}`} className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-200">Task: {task.title}</a>)}
                        {linkedConflicts.map((conflict) => <a key={conflict.id} href={`#conflict-${encodeURIComponent(conflict.id)}`} className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100">Conflict: {conflict.severity}</a>)}
                      </div>
                    )}
                  </article>
                );
              })}
            </section>

            <section id="conflicts" className="scroll-mt-6 space-y-3">
              <SectionHeading icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />} title="Conflicts" count={detail.conflicts.length} />
              {detail.conflicts.length === 0 ? <EmptySection text="No conflicts are linked to this meeting." /> : detail.conflicts.map((conflict) => (
                <article id={`conflict-${conflict.id}`} key={conflict.id} className="scroll-mt-6 rounded-2xl border border-amber-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-stone-950">{conflict.resolved ? "Resolved conflict" : "Needs review"}</p>
                    <Badge variant={conflict.severity === "Critical" ? "conflict" : "warning"}>{conflict.severity}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-700">{conflict.description}</p>
                  {conflict.resolutionNotes && <p className="mt-3 rounded-lg bg-stone-50 p-3 text-xs leading-5 text-stone-600">Resolution: {conflict.resolutionNotes}</p>}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    <DecisionLink id={conflict.sourceDecisionId} label="Proposed decision" localIds={detail.decisions.map((decision) => decision.id)} />
                    <DecisionLink id={conflict.targetDecisionId} label="Earlier decision" localIds={detail.decisions.map((decision) => decision.id)} />
                  </div>
                </article>
              ))}
            </section>

            <section id="tasks" className="scroll-mt-6 space-y-3">
              <SectionHeading icon={<CheckSquare className="h-4 w-4" aria-hidden="true" />} title="Tasks" count={detail.tasks.length} />
              {detail.tasks.length === 0 ? <EmptySection text="No tasks are linked to this meeting." /> : detail.tasks.map((task) => (
                <article id={`task-${task.id}`} key={task.id} className="scroll-mt-6 rounded-2xl border border-stone-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-stone-950">{task.title}</h3>
                    <Badge variant={task.status === "Completed" ? "confirmed" : task.status === "Awaiting Approval" ? "warning" : "neutral"}>{task.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-stone-600">Owner: {task.owner.name} · Due: {task.dueDate} · Priority: {task.priority}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    <Link href={`/tasks#task-${encodeURIComponent(task.id)}`} className="inline-flex items-center gap-1 font-medium text-stone-600 hover:text-stone-950">Open in task tracker<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
                    {task.associatedDecisionId && <a href={`#decision-${encodeURIComponent(task.associatedDecisionId)}`} className="font-medium text-stone-600 hover:text-stone-950">Related decision: {task.associatedDecisionId}</a>}
                    {task.linkedConflictId && <a href={`#conflict-${encodeURIComponent(task.linkedConflictId)}`} className="font-medium text-amber-800 hover:text-amber-950">Conflict review</a>}
                  </div>
                </article>
              ))}
            </section>
            {shareOpen && (
              <MeetingSummaryShareDialog
                meeting={detail.meeting}
                decisions={detail.decisions}
                tasks={detail.tasks}
                conflicts={detail.conflicts}
                onClose={() => setShareOpen(false)}
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function SectionHeading({ icon, title, count }: { icon: ReactNode; title: string; count: number }) {
  return <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-semibold text-stone-950">{icon}{title}</h2><span className="text-xs text-stone-500">{count}</span></div>;
}

function EmptySection({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-stone-300 bg-white px-5 py-6 text-sm text-stone-600">{text}</p>;
}

function DecisionLink({ id, label, localIds }: { id: string; label: string; localIds: string[] }) {
  const local = localIds.includes(id);
  return local
    ? <a href={`#decision-${encodeURIComponent(id)}`} className="font-medium text-stone-700 hover:text-stone-950">{label}: {id}</a>
    : <Link href={`/decision-memory#decision-${encodeURIComponent(id)}`} className="font-medium text-stone-700 hover:text-stone-950">{label}: {id}<ArrowUpRight className="ml-1 inline h-3 w-3" aria-hidden="true" /></Link>;
}
