import { randomUUID } from "node:crypto";
import { mutateDatabase, readDatabase } from "./store";
import { Decision, MeetingSummary, TaskItem, DashboardStats, TaskStatus } from "@/types";
import { MeetingExtractionResult } from "@/types/extraction";
import { ConflictRecord, MeetingTemplate } from "./types";
import { detectConflicts, DetectedConflict } from "@/lib/conflictDetection";
import { findTaskDecisionAssociation } from "@/lib/taskDecisionAssociation";

function dateStartUTC(value?: string): number | null {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  const date = new Date(parsed);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function isOpenTask(task: TaskItem): boolean {
  return task.status !== "Completed" && task.status !== "Rejected";
}

function normalizeMeetingLabel(value: string | undefined): string {
  return (value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeMeetingDate(value: string | undefined): string | null {
  if (!value || /^(unknown|not specified|unspecified)$/i.test(value.trim())) return null;
  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
  const textualDate = value.trim().match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (textualDate) {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = months.indexOf(textualDate[1].slice(0, 3).toLowerCase());
    const date = new Date(Date.UTC(Number(textualDate[3]), month, Number(textualDate[2])));
    if (month < 0 || date.getUTCMonth() !== month || date.getUTCDate() !== Number(textualDate[2])) return null;
    return `${textualDate[3]}-${String(month + 1).padStart(2, "0")}-${String(Number(textualDate[2])).padStart(2, "0")}`;
  }
  return null;
}

function withoutMeetingRecap(meeting: MeetingSummary): MeetingSummary {
  const summary = { ...meeting };
  delete summary.recapText;
  return summary;
}

export async function getDashboardOverview(): Promise<{
  stats: DashboardStats;
  recentMeetings: MeetingSummary[];
  upcomingTasks: TaskItem[];
  recentDecisions: Decision[];
  conflicts: ConflictRecord[];
}> {
  const db = await readDatabase();
  const today = new Date();
  const todayStart = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const dayMs = 24 * 60 * 60 * 1000;
  const last7DaysStart = todayStart - 6 * dayMs;
  const prior7DaysStart = todayStart - 13 * dayMs;

  const activeTasks = db.tasks.filter((task) => !task.duplicateOfId && isOpenTask(task));
  const activeMeetings = db.meetings.filter((meeting) => !meeting.duplicateOfId);
  const activeDecisions = db.decisions.filter((decision) => !decision.duplicateOfId);
  const datedActiveTasks = activeTasks
    .map((task) => ({ task, due: dateStartUTC(task.dueDate) }))
    .filter((entry): entry is { task: TaskItem; due: number } => entry.due !== null);

  const meetingsLast7Days = activeMeetings.filter((meeting) => {
    const date = dateStartUTC(meeting.date);
    return date !== null && date >= last7DaysStart && date <= todayStart;
  }).length;
  const meetingsPrior7Days = activeMeetings.filter((meeting) => {
    const date = dateStartUTC(meeting.date);
    return date !== null && date >= prior7DaysStart && date < last7DaysStart;
  }).length;
  const weeklyChange = meetingsLast7Days - meetingsPrior7Days;
  const weeklyTrend =
    weeklyChange === 0
      ? "No change vs prior week"
      : (weeklyChange > 0 ? "+" : "") + weeklyChange + " vs prior week";

  const unresolvedConflictsCount = db.conflicts.filter((conflict) => !conflict.resolved).length;

  const stats: DashboardStats = {
    meetingsProcessed: activeMeetings.length,
    meetingsThisWeekDelta: weeklyTrend,
    pendingTasks: activeTasks.length,
    pendingTasksConfirmationCount: activeTasks.filter(
      (task) => task.status === "Awaiting Approval" || task.requiresUserConfirmation
    ).length,
    upcomingDeadlines: datedActiveTasks.filter(
      ({ due }) => due >= todayStart && due < todayStart + 7 * dayMs
    ).length,
    deadlinesWithin48Hours: datedActiveTasks.filter(
      ({ due }) => due >= todayStart && due < todayStart + 2 * dayMs
    ).length,
    unresolvedConflicts: unresolvedConflictsCount,
    conflictsAttentionNeeded:
      unresolvedConflictsCount > 0
        ? unresolvedConflictsCount + " need review"
        : "None need review",
  };

  const sortByRecentDate = <T extends { date: string }>(a: T, b: T) =>
    (dateStartUTC(b.date) ?? 0) - (dateStartUTC(a.date) ?? 0);

  const upcomingTasks = activeTasks
    .slice()
    .sort((a, b) => {
      const aDue = dateStartUTC(a.dueDate) ?? Number.MAX_SAFE_INTEGER;
      const bDue = dateStartUTC(b.dueDate) ?? Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    })
    .slice(0, 6);

  return {
    stats,
    recentMeetings: activeMeetings.slice().sort(sortByRecentDate).slice(0, 5).map(withoutMeetingRecap),
    upcomingTasks,
    recentDecisions: activeDecisions.slice().sort(sortByRecentDate).slice(0, 6),
    conflicts: db.conflicts,
  };
}

export async function getAllMeetings(): Promise<MeetingSummary[]> {
  const db = await readDatabase();
  return db.meetings.filter((meeting) => !meeting.duplicateOfId);
}

export async function getMeetingTemplates(): Promise<MeetingTemplate[]> {
  const db = await readDatabase();
  return db.templates || [];
}

export async function createMeetingTemplate(input: { name: string; title: string; recapText: string }): Promise<MeetingTemplate> {
  return mutateDatabase((db) => {
    if ((db.templates || []).some((template) => template.name.toLocaleLowerCase() === input.name.toLocaleLowerCase())) {
      throw new Error("A template with this name already exists.");
    }
    const now = new Date().toISOString();
    const template: MeetingTemplate = { id: `tpl-${randomUUID()}`, ...input, createdAt: now, updatedAt: now };
    db.templates ||= [];
    db.templates.unshift(template);
    return template;
  });
}

export async function deleteMeetingTemplate(templateId: string): Promise<boolean> {
  return mutateDatabase((db) => {
    const templates = db.templates || [];
    const next = templates.filter((template) => template.id !== templateId);
    if (next.length === templates.length) return false;
    db.templates = next;
    return true;
  });
}

export async function getAllDecisions(): Promise<Decision[]> {
  const db = await readDatabase();
  return db.decisions.filter((decision) => !decision.duplicateOfId);
}

export async function getAllTasks(): Promise<TaskItem[]> {
  const db = await readDatabase();
  const activeMeetings = db.meetings.filter((meeting) => !meeting.duplicateOfId);
  return db.tasks.filter((task) => !task.duplicateOfId).map((task) => {
    const meeting = activeMeetings.find((item) => item.id === task.associatedMeetingId) || activeMeetings.find((item) =>
          normalizeMeetingLabel(item.title) === normalizeMeetingLabel(task.associatedMeeting) &&
          normalizeMeetingDate(item.date) !== null && normalizeMeetingDate(item.date) === normalizeMeetingDate(task.meetingDate)
        );
    const withMeeting = meeting ? { ...task, associatedMeetingId: meeting.id } : task;
    if (!withMeeting.linkedConflictId) return withMeeting;
    const unresolved = db.conflicts.some(
      (conflict) => conflict.id === withMeeting.linkedConflictId && !conflict.resolved
    );
    return unresolved ? withMeeting : { ...withMeeting, linkedConflictId: undefined };
  });
}

export async function getAllConflicts(): Promise<ConflictRecord[]> {
  const db = await readDatabase();
  return db.conflicts;
}

export async function getMeetingDetail(meetingId: string): Promise<{
  meeting: MeetingSummary;
  decisions: Decision[];
  tasks: TaskItem[];
  conflicts: ConflictRecord[];
} | null> {
  const db = await readDatabase();
  const meeting = db.meetings.find((item) => item.id === meetingId && !item.duplicateOfId);
  if (!meeting) return null;

  const meetingTitle = normalizeMeetingLabel(meeting.title);
  const meetingDate = normalizeMeetingDate(meeting.date);
  const decisions = db.decisions.filter((decision) => {
    if (decision.duplicateOfId) return false;
    if (decision.meetingId && decision.meetingId === meeting.id) return true;
    return normalizeMeetingLabel(decision.meetingReference) === meetingTitle &&
      meetingDate !== null && normalizeMeetingDate(decision.date) === meetingDate;
  });
  const decisionIds = new Set(decisions.map((decision) => decision.id));
  const tasks = db.tasks.filter((task) => {
    if (task.duplicateOfId) return false;
    if (task.associatedMeetingId === meeting.id) return true;
    if (task.associatedDecisionId && decisionIds.has(task.associatedDecisionId)) return true;
    return normalizeMeetingLabel(task.associatedMeeting) === meetingTitle &&
      meetingDate !== null && normalizeMeetingDate(task.meetingDate) === meetingDate;
  });
  const conflicts = db.conflicts.filter((conflict) =>
    decisionIds.has(conflict.sourceDecisionId) || decisionIds.has(conflict.targetDecisionId)
  );
  return { meeting, decisions, tasks, conflicts };
}

export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus
): Promise<TaskItem> {
  return mutateDatabase((db) => {
    const index = db.tasks.findIndex((t) => t.id === taskId);
    if (index === -1) throw new Error(`Task with id "${taskId}" not found.`);

    const task = db.tasks[index];
    if (
      task.linkedConflictId &&
      ["Confirmed", "In Progress", "Completed"].includes(newStatus) &&
      db.conflicts.some((conflict) => conflict.id === task.linkedConflictId && !conflict.resolved)
    ) {
      throw new Error("Resolve the linked decision conflict before confirming this task.");
    }

    const updated: TaskItem = {
      ...task,
      status: newStatus,
      requiresUserConfirmation: newStatus === "Awaiting Approval",
    };
    db.tasks[index] = updated;
    return updated;
  });
}

export async function updateDecisionStatus(
  decisionId: string,
  newStatus: Decision["status"],
  resolutionNotes?: string
): Promise<Decision> {
  return mutateDatabase((db) => {
    const index = db.decisions.findIndex((d) => d.id === decisionId);
    if (index === -1) throw new Error(`Decision with id "${decisionId}" not found.`);
    const hasUnresolvedConflict = db.conflicts.some(
      (conflict) => !conflict.resolved && (conflict.sourceDecisionId === decisionId || conflict.targetDecisionId === decisionId)
    );
    if (hasUnresolvedConflict && newStatus !== "Conflict Flagged") {
      throw new Error("Resolve the linked conflict before changing this decision’s status.");
    }

    const updated: Decision = {
      ...db.decisions[index],
      status: newStatus,
      conflictResolution: resolutionNotes || db.decisions[index].conflictResolution,
      hasConflictWarning: newStatus === "Conflict Flagged" || hasUnresolvedConflict,
    };
    db.decisions[index] = updated;
    return updated;
  });
}

export async function resolveConflict(
  conflictId: string,
  earlierDecisionStatus: "Active" | "Under Review" | "Superseded",
  resolutionNotes: string
): Promise<{ sourceDecision: Decision; earlierDecision: Decision }> {
  return mutateDatabase((db) => {
    const conflict = db.conflicts.find((item) => item.id === conflictId);
    if (!conflict) throw new Error(`Conflict with id "${conflictId}" not found.`);
    if (conflict.resolved) throw new Error("This conflict has already been resolved.");

    const source = db.decisions.find((decision) => decision.id === conflict.sourceDecisionId);
    const earlier = db.decisions.find((decision) => decision.id === conflict.targetDecisionId);
    if (!source || !earlier) throw new Error("A decision linked to this conflict could not be found.");

    conflict.resolved = true;
    conflict.resolutionNotes = resolutionNotes;
    earlier.status = earlierDecisionStatus;
    earlier.conflictResolution = resolutionNotes;
    if (source.status === "Conflict Flagged") source.status = "Under Review";
    source.conflictResolution = resolutionNotes;

    for (const decision of [source, earlier]) {
      const anotherOpenConflict = db.conflicts.some(
        (item) => !item.resolved && (item.sourceDecisionId === decision.id || item.targetDecisionId === decision.id)
      );
      decision.hasConflictWarning = anotherOpenConflict;
      if (anotherOpenConflict) decision.status = "Conflict Flagged";
    }

    return { sourceDecision: source, earlierDecision: earlier };
  });
}

export async function saveExtractedMeetingData(params: {
  title: string;
  meetingDate: string;
  recapText: string;
  attendees: string;
  extraction: MeetingExtractionResult;
}): Promise<{
  meeting: MeetingSummary;
  savedDecisions: Decision[];
  savedTasks: TaskItem[];
  detectedConflicts: DetectedConflict[];
}> {
  const { title, extraction } = params;
  const snapshot = await readDatabase();
  const snapshotConflicts = await detectConflicts(extraction.decisions, snapshot.decisions.filter((decision) => !decision.duplicateOfId), title);

  return mutateDatabase(async (db) => {
    const { meetingDate, attendees } = params;

    // 1. Generate collision-resistant IDs before writing the transaction.
    const meetingId = `mtg-${randomUUID()}`;

    // 2. Recheck against the latest decisions if another save completed meanwhile.
    const conflictsDetected =
      db.meta.version === snapshot.meta.version
        ? snapshotConflicts
        : await detectConflicts(extraction.decisions, db.decisions.filter((decision) => !decision.duplicateOfId), title);

    // 3. Save decisions with stable persisted IDs and their review status.
    const persistedDecisionIds = new Map<string, string>();
    const savedDecisions: Decision[] = extraction.decisions.map((dec) => {
      const matchingConflict = conflictsDetected.find((conflict) => conflict.newDecisionId === dec.id);
      const decisionId = `dec-${randomUUID()}`;
      persistedDecisionIds.set(dec.id, decisionId);

      return {
        id: decisionId,
        date: meetingDate || "Unknown",
        meetingReference: title,
        meetingId,
        category: dec.category,
        status: matchingConflict ? "Conflict Flagged" : dec.status,
        confidenceScore: dec.confidenceScore,
        decisionText: dec.decisionText,
        rationale: dec.rationale,
        evidence: dec.evidence,
        hasConflictWarning: !!matchingConflict,
        conflictRecordId: matchingConflict?.id,
        conflictNotes: matchingConflict?.conflictDescription,
        conflictWithDecisionId: matchingConflict?.historicalDecisionId,
        conflictWithDecisionText: matchingConflict?.historicalDecisionText,
        conflictWithMeetingTitle: matchingConflict?.historicalMeetingTitle,
        conflictSeverity: matchingConflict?.severity,
        conflictResolution: matchingConflict?.suggestedResolution,
        dependentSettingsNote: matchingConflict?.dependentSettingsNote,
      };
    });

    // 4. Keep proposed tasks awaiting explicit human approval.
    const savedTasks: TaskItem[] = extraction.actionItems.map((action) => {
      const extractedDecision = findTaskDecisionAssociation(action.title, extraction.decisions);
      const persistedDecisionId = extractedDecision
        ? persistedDecisionIds.get(extractedDecision.id)
        : undefined;
      const associatedDecision = savedDecisions.find((decision) => decision.id === persistedDecisionId);
      const linkedConflictId = associatedDecision?.conflictRecordId && conflictsDetected.some(
        (conflict) => conflict.id === associatedDecision.conflictRecordId
      )
        ? associatedDecision.conflictRecordId
        : undefined;
      const ownerName = action.ownerName || "Unknown";
      return {
        id: `tsk-${randomUUID()}`,
        associatedMeetingId: meetingId,
        title: action.title,
        owner: {
          name: ownerName,
          avatar: ownerName.split(" ").map((name) => name[0]).join("").slice(0, 2).toUpperCase() || "UN",
          role: action.ownerRole || "Unknown",
        },
        dueDate: action.deadline || "Unknown",
        meetingDate: meetingDate || undefined,
        priority: action.priority || "Unknown",
        status: "Awaiting Approval",
        associatedMeeting: title,
        associatedDecisionId: associatedDecision?.id,
        associatedDecisionText: associatedDecision?.decisionText,
        linkedConflictId,
        evidence: action.evidence,
        requiresUserConfirmation: true,
      };
    });

    const participantList = attendees
      ? attendees.split(",").map((name) => name.trim()).filter(Boolean)
      : extraction.speakers.map((speaker) => speaker.name);

    const newMeeting: MeetingSummary = {
      id: meetingId,
      title,
      date: meetingDate || "Unknown",
      duration: "Unknown",
      participants: participantList,
      status: "Processed",
      decisionsCount: savedDecisions.length,
      tasksCount: savedTasks.length,
      conflictsDetected: conflictsDetected.length,
      snippet: extraction.summary.executiveSummary.slice(0, 200),
      recapText: params.recapText,
    };

    const newConflictRecords: ConflictRecord[] = conflictsDetected.map((conflict) => ({
      id: conflict.id,
      sourceDecisionId: persistedDecisionIds.get(conflict.newDecisionId) || conflict.newDecisionId,
      targetDecisionId: conflict.historicalDecisionId,
      sourceMeetingTitle: title,
      targetMeetingTitle: conflict.historicalMeetingTitle,
      description: conflict.conflictDescription,
      severity: conflict.severity,
      detectedAt: new Date().toISOString(),
      resolved: false,
      resolutionNotes: conflict.suggestedResolution,
      dependentSettingsNote: conflict.dependentSettingsNote,
    }));

    db.meetings.unshift(newMeeting);
    db.decisions.unshift(...savedDecisions);
    db.tasks.unshift(...savedTasks);
    db.conflicts.unshift(...newConflictRecords);

    return {
      meeting: newMeeting,
      savedDecisions,
      savedTasks,
      detectedConflicts: conflictsDetected,
    };
  });
}

