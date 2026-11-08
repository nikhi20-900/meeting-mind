import { readDatabase, writeDatabase } from "./store";
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
  const db = await readDatabase();
  const index = db.tasks.findIndex((t) => t.id === taskId);

  if (index === -1) {
    throw new Error(`Task with id "${taskId}" not found.`);
  }

  const updated: TaskItem = {
    ...db.tasks[index],
    status: newStatus,
    requiresUserConfirmation: newStatus === "Awaiting Approval",
  };

  db.tasks[index] = updated;
  await writeDatabase(db);
  return updated;
}

export async function updateDecisionStatus(
  decisionId: string,
  newStatus: Decision["status"],
  resolutionNotes?: string
): Promise<Decision> {
  const db = await readDatabase();
  const index = db.decisions.findIndex((d) => d.id === decisionId);

  if (index === -1) {
    throw new Error(`Decision with id "${decisionId}" not found.`);
  }

  const updated: Decision = {
    ...db.decisions[index],
    status: newStatus,
    conflictResolution: resolutionNotes || db.decisions[index].conflictResolution,
    hasConflictWarning: newStatus === "Conflict Flagged",
  };

  db.decisions[index] = updated;

  // If status is no longer Conflict Flagged, update corresponding conflict records
  if (newStatus !== "Conflict Flagged") {
    db.conflicts = db.conflicts.map((c) => {
      if (c.sourceDecisionId === decisionId || c.targetDecisionId === decisionId) {
        return {
          ...c,
          resolved: true,
          resolutionNotes: resolutionNotes || c.resolutionNotes,
        };
      }
      return c;
    });
  }

  await writeDatabase(db);
  return updated;
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
  const db = await readDatabase();
  const { title, meetingDate, recapText, attendees, extraction } = params;

  // 1. Generate unique meeting ID
  const meetingId = `mtg-${Date.now().toString().slice(-4)}`;

  // 2. Perform Conflict Detection between new decisions and all existing historical decisions
  const conflictsDetected = await detectConflicts(
    extraction.decisions,
    db.decisions,
    title
  );

  // 3. Map decisions, adding conflict flags if detected
  const savedDecisions: Decision[] = extraction.decisions.map((dec, idx) => {
    const matchingConflict = conflictsDetected.find(
      (c) => c.newDecisionId === dec.id
    );

    const decisionId = `dec-${Date.now().toString().slice(-4)}-${idx + 1}`;

    return {
      id: decisionId,
      date: meetingDate || new Date().toISOString().split("T")[0],
      meetingReference: title,
      meetingId: meetingId,
      category: dec.category,
      status: matchingConflict ? "Conflict Flagged" : "Active",
      decisionText: dec.decisionText,
      rationale: dec.rationale,
      hasConflictWarning: !!matchingConflict,
      conflictNotes: matchingConflict ? matchingConflict.conflictDescription : undefined,
      conflictSeverity: matchingConflict ? matchingConflict.severity : undefined,
      conflictResolution: matchingConflict ? matchingConflict.suggestedResolution : undefined,
      dependentSettingsNote: matchingConflict ? matchingConflict.dependentSettingsNote : undefined,
    };
  });

  // 4. Map action items to persistent tasks
  // CRITICAL REQUIREMENT: Do NOT create confirmed tasks automatically.
  // Keep tasks awaiting human approval until the user explicitly confirms them.
  const savedTasks: TaskItem[] = extraction.actionItems.map((action, idx) => {
    const taskId = `tsk-${Date.now().toString().slice(-4)}-${idx + 1}`;

    return {
      id: taskId,
      title: action.title,
      owner: {
        name: action.ownerName || "Unassigned",
        avatar: (action.ownerName || "UN")
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        role: action.ownerRole || "Team Member",
      },
      dueDate: action.deadline || "Within 7 days",
      priority: action.priority || "Medium",
      status: "Awaiting Approval", // MUST be Awaiting Approval per requirement!
      associatedMeeting: title,
      associatedDecisionId: savedDecisions[0]?.id,
      associatedDecisionText: savedDecisions[0]?.decisionText,
      requiresUserConfirmation: true, // Always requires human confirmation
    };
  });

  // 5. Create new MeetingSummary record
  const participantList = attendees
    ? attendees.split(",").map((s) => s.trim()).filter(Boolean)
    : extraction.speakers.map((s) => s.name);

  const newMeeting: MeetingSummary = {
    id: meetingId,
    title: title,
    date: meetingDate || new Date().toISOString().split("T")[0],
    duration: "30 min",
    participants: participantList.length > 0 ? participantList : ["Team"],
    status: "Processed",
    decisionsCount: savedDecisions.length,
    tasksCount: savedTasks.length,
    conflictsDetected: conflictsDetected.length,
    snippet: extraction.summary.executiveSummary.slice(0, 200),
  };

  // 6. Record conflicts into persistent conflict register
  const newConflictRecords: ConflictRecord[] = conflictsDetected.map((c) => ({
    id: c.id,
    sourceDecisionId: c.newDecisionId,
    targetDecisionId: c.historicalDecisionId,
    sourceMeetingTitle: title,
    targetMeetingTitle: c.historicalMeetingTitle,
    description: c.conflictDescription,
    severity: c.severity,
    detectedAt: new Date().toISOString(),
    resolved: false,
    resolutionNotes: c.suggestedResolution,
    dependentSettingsNote: c.dependentSettingsNote,
  }));

  // 7. Persist to storage
  db.meetings.unshift(newMeeting);
  db.decisions.unshift(...savedDecisions);
  db.tasks.unshift(...savedTasks);
  db.conflicts.unshift(...newConflictRecords);

  await writeDatabase(db);

  return {
    meeting: newMeeting,
    savedDecisions,
    savedTasks,
    detectedConflicts: conflictsDetected,
  };
}

