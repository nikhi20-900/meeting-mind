"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import type { ArchivedDuplicateRecord, DuplicateCandidateGroup } from "@/lib/duplicateReview";
import { AlertTriangle, CalendarDays, CheckCircle2, Copy, Gavel, Loader2, Search, CheckSquare, Archive, RotateCcw, X } from "lucide-react";

type EntityFilter = "all" | "meeting" | "decision" | "task";

export default function DuplicateReviewPageClient() {
  const [groups, setGroups] = useState<DuplicateCandidateGroup[]>([]);
  const [archived, setArchived] = useState<ArchivedDuplicateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<EntityFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<DuplicateCandidateGroup | null>(null);
  const [keeperId, setKeeperId] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/duplicates")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Duplicate candidates could not be loaded.");
        }
        if (active) {
          setGroups(result.groups);
          setArchived(result.archived || []);
        }
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Duplicate candidates could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function refreshReview() {
    const response = await fetch("/api/duplicates");
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || "Duplicate candidates could not be loaded.");
    setGroups(result.groups);
    setArchived(result.archived || []);
  }

  async function confirmArchive() {
    if (!selectedGroup || !keeperId) return;
    setSaving(true);
    setActionError("");
    setActionMessage("");
    try {
      const response = await fetch("/api/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "archive",
          groupId: selectedGroup.id,
          keeperId,
          duplicateIds: selectedGroup.records.map((record) => record.id).filter((id) => id !== keeperId),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "These records could not be archived.");
      setActionMessage(`${result.archivedCount} duplicate ${selectedGroup.entityType}${result.archivedCount === 1 ? "" : "s"} archived. You can restore them below.`);
      setSelectedGroup(null);
      setKeeperId("");
      await refreshReview();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "These records could not be archived.");
    } finally {
      setSaving(false);
    }
  }

  async function restoreRecord(record: ArchivedDuplicateRecord) {
    setSaving(true);
    setActionError("");
    setActionMessage("");
    try {
      const response = await fetch("/api/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", entityType: record.entityType, recordIds: [record.id] }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "This record could not be restored.");
      setActionMessage("Record restored to the workspace and duplicate review.");
      await refreshReview();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "This record could not be restored.");
    } finally {
      setSaving(false);
    }
  }

  const visibleGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return groups.filter((group) => {
      if (filter !== "all" && group.entityType !== filter) return false;
      if (!normalizedQuery) return true;
      return group.records.some((record) =>
        `${record.id} ${record.title} ${record.context} ${record.status}`.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [filter, groups, query]);

  const recordCount = groups.reduce((total, group) => total + group.records.length, 0);
  const filterOptions: Array<{ id: EntityFilter; label: string; count: number }> = [
    { id: "all", label: "All records", count: recordCount },
    { id: "meeting", label: "Meetings", count: groups.filter((group) => group.entityType === "meeting").reduce((sum, group) => sum + group.records.length, 0) },
    { id: "decision", label: "Decisions", count: groups.filter((group) => group.entityType === "decision").reduce((sum, group) => sum + group.records.length, 0) },
    { id: "task", label: "Tasks", count: groups.filter((group) => group.entityType === "task").reduce((sum, group) => sum + group.records.length, 0) },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-800">Workspace review</p>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-950">Possible duplicates</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-stone-600">
            Check records that share the same wording and meeting context. These are suggestions; similar records may still be intentional.
          </p>
        </header>

        <section aria-label="Duplicate review status" className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
              <Copy className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-900">
                {loading ? "Checking records…" : `${groups.length} ${groups.length === 1 ? "group" : "groups"} to review`}
              </p>
              <p className="mt-1 text-xs leading-5 text-stone-600">
                {loading ? "Comparing meeting wording, dates, and owners." : `${recordCount} records are included in these groups.`}
              </p>
            </div>
          </div>
          <div role="note" className="rounded-lg bg-[#F8F6F0] px-3 py-2 text-xs leading-5 text-stone-700">
            Review only. Nothing has been merged, edited, or removed.
          </div>
        </section>

        {actionMessage && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{actionMessage}</p>}
        {actionError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{actionError}</p>}

        {!loading && !error && groups.length > 0 && (
          <section className="space-y-4" aria-label="Filter duplicate groups">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
              <input
                type="search"
                aria-label="Search duplicate candidates"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search wording, meeting, owner, or record ID"
                className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-600/15"
              />
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by record type">
              {filterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={filter === option.id}
                  onClick={() => setFilter(option.id)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${filter === option.id ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"}`}
                >
                  {option.label}<span className="ml-1.5 opacity-70">{option.count}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {loading && (
          <div role="status" className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-8 text-sm text-stone-600">
            <Loader2 className="h-5 w-5 animate-spin text-orange-700" aria-hidden="true" />
            Finding exact matches…
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
            <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" aria-hidden="true" />Could not load duplicate candidates</div>
            <p className="mt-2">{error}</p>
          </div>
        )}

        {!loading && !error && groups.length === 0 && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-800" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-emerald-950">No exact duplicate groups found</h2>
                <p className="mt-1 text-sm leading-6 text-emerald-900">Records with different wording or meeting context are left out of this review.</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && groups.length > 0 && visibleGroups.length === 0 && (
          <p className="rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">No groups match these filters.</p>
        )}

        {!loading && !error && visibleGroups.map((group) => {
          const Icon = group.entityType === "meeting" ? CalendarDays : group.entityType === "decision" ? Gavel : CheckSquare;
          return (
            <section key={group.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <header className="flex flex-col gap-3 border-b border-stone-100 bg-[#FBFAF7] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-stone-700 ring-1 ring-stone-200">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-stone-950">{group.entityLabel} · {group.records.length} matching records</h2>
                    <p className="mt-0.5 text-xs text-stone-600">{group.matchReason}</p>
                  </div>
                </div>
                <span className="w-fit rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-900">Needs human review</span>
              </header>
              <ol className="divide-y divide-stone-100">
                {group.records.map((record) => (
                  <li key={record.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium leading-6 text-stone-900">{record.title}</p>
                      <p className="mt-1 text-xs leading-5 text-stone-600">{record.context}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500 sm:justify-end">
                      <span className="rounded-md bg-stone-100 px-2 py-1">{record.status}</span>
                      <code className="rounded-md border border-stone-200 bg-white px-2 py-1">{record.id}</code>
                    </div>
                  </li>
                ))}
              </ol>
              <footer className="flex flex-col gap-3 border-t border-stone-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                {group.cleanupBlockedReason ? (
                  <p className="max-w-xl text-xs leading-5 text-amber-900"><span className="font-semibold">Needs conflict review:</span> {group.cleanupBlockedReason}</p>
                ) : (
                  <p className="text-xs text-stone-600">Choose the copy to keep. Other copies will be hidden and can be restored.</p>
                )}
                <button
                  type="button"
                  disabled={Boolean(group.cleanupBlockedReason) || saving}
                  onClick={() => { setActionError(""); setKeeperId(""); setSelectedGroup(group); }}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Archive className="h-3.5 w-3.5" aria-hidden="true" />Review archive
                </button>
              </footer>
            </section>
          );
        })}

        {!loading && archived.length > 0 && (
          <section className="space-y-3" aria-label="Recently archived duplicates">
            <div>
              <h2 className="text-base font-semibold text-stone-950">Recently archived</h2>
              <p className="mt-1 text-sm text-stone-600">Archived records stay in storage and can be restored at any time.</p>
            </div>
            <div className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
              {archived.map((record) => (
                <div key={`${record.entityType}:${record.id}`} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-stone-900">{record.title}</p>
                    <p className="mt-1 text-xs leading-5 text-stone-600">{record.entityType} · Kept copy: {record.keeperTitle} · {record.context}</p>
                  </div>
                  <button type="button" disabled={saving} onClick={() => restoreRecord(record)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50">
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Restore
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/40 p-0 sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setSelectedGroup(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="archive-dialog-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-800">Review cleanup</p>
                <h2 id="archive-dialog-title" className="mt-1 text-lg font-semibold text-stone-950">Choose the copy to keep</h2>
              </div>
              <button type="button" aria-label="Close review" disabled={saving} onClick={() => setSelectedGroup(null)} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 disabled:opacity-50"><X className="h-4 w-4" /></button>
            </header>
            <p className="mt-3 text-sm leading-6 text-stone-600">Select the record that should stay in your workspace. Every other record in this group will be archived.</p>
            <fieldset className="mt-5 space-y-2">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">Keep one record</legend>
              {selectedGroup.records.map((record) => (
                <label key={record.id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${keeperId === record.id ? "border-stone-900 bg-stone-50" : "border-stone-200"}`}>
                  <input type="radio" name="duplicate-keeper" value={record.id} checked={keeperId === record.id} onChange={() => setKeeperId(record.id)} className="mt-1 accent-stone-900" />
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-medium leading-5 text-stone-900">{record.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-stone-600">{record.context} · {record.status} · {record.id}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <p className="font-semibold">What happens next</p>
              <p>The other {selectedGroup.records.length - 1} record(s) will be marked as duplicates and hidden from the normal workspace lists. They remain stored and can be restored here.</p>
              {selectedGroup.entityType === "decision" && <p className="mt-2">Conflict-linked decisions cannot be archived until their conflict history is reviewed.</p>}
            </div>
            {actionError && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-900">{actionError}</p>}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" disabled={saving} onClick={() => setSelectedGroup(null)} className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50">Cancel</button>
              <button type="button" disabled={!keeperId || saving} onClick={confirmArchive} className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Archive className="h-4 w-4" aria-hidden="true" />}
                {saving ? "Archiving…" : `Archive ${selectedGroup.records.length - 1} duplicates`}
              </button>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
