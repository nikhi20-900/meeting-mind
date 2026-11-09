import { randomUUID } from "node:crypto";
import { mutateDatabase, readDatabase } from "./store";
import { Decision, MeetingSummary, TaskItem, DashboardStats, TaskStatus } from "@/types";
import { MeetingExtractionResult } from "@/types/extraction";
import { ConflictRecord } from "./types";
import { detectConflicts, DetectedConflict } from "@/lib/conflictDetection";

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

  const activeTasks = db.tasks.filter(isOpenTask);
  const datedActiveTasks = activeTasks
    .map((task) => ({ task, due: dateStartUTC(task.dueDate) }))
    .filter((entry): entry is { task: TaskItem; due: number } => entry.due !== null);

  const meetingsLast7Days = db.meetings.filter((meeting) => {
    const date = dateStartUTC(meeting.date);
    return date !== null && date >= last7DaysStart && date <= todayStart;
  }).length;
  const meetingsPrior7Days = db.meetings.filter((meeting) => {
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
    meetingsProcessed: db.meetings.length,
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
    recentMeetings: db.meetings.slice().sort(sortByRecentDate).slice(0, 5),
    upcomingTasks,
    recentDecisions: db.decisions.slice().sort(sortByRecentDate).slice(0, 6),
    conflicts: db.conflicts,
  };
}

export async function getAllMeetings(): Promise<MeetingSummary[]> {
  const db = await readDatabase();
  return db.meetings;
}

export async function getAllDecisions(): Promise<Decision[]> {
  const db = await readDatabase();
  return db.decisions;
}

export async function getAllTasks(): Promise<TaskItem[]> {
  const db = await readDatabase();
  return db.tasks;
}

export async function getAllConflicts(): Promise<ConflictRecord[]> {
  const db = await readDatabase();
  return db.conflicts;
}

export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus
): Promise<TaskItem> {
  return mutateDatabase((db) => {
    const index = db.tasks.findIndex((t) => t.id === taskId);
    if (index === -1) throw new Error(`Task with id "${taskId}" not found.`);

    const updated: TaskItem = {
      ...db.tasks[index],
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
  const snapshotConflicts = await detectConflicts(extraction.decisions, snapshot.decisions, title);

  return mutateDatabase(async (db) => {
    const { meetingDate, attendees } = params;

    // 1. Generate collision-resistant IDs before writing the transaction.
    const meetingId = `mtg-${randomUUID()}`;

    // 2. Recheck against the latest decisions if another save completed meanwhile.
    const conflictsDetected =
      db.meta.version === snapshot.meta.version
        ? snapshotConflicts
        : await detectConflicts(extraction.decisions, db.decisions, title);

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
    const savedTasks: TaskItem[] = extraction.actionItems.map((action) => ({
      id: `tsk-${randomUUID()}`,
      title: action.title,
      owner: {
        name: action.ownerName || "Unknown",
        avatar: (action.ownerName || "UN")
          .split(" ")
          .map((name) => name[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        role: action.ownerRole || "Unknown",
      },
      dueDate: action.deadline || "Unknown",
      priority: action.priority || "Unknown",
      status: "Awaiting Approval",
      associatedMeeting: title,
      associatedDecisionId: savedDecisions[0]?.id,
      associatedDecisionText: savedDecisions[0]?.decisionText,
      requiresUserConfirmation: true,
    }));

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

