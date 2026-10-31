import { readDatabase, writeDatabase } from "./store";
import { Decision, MeetingSummary, TaskItem, DashboardStats, TaskStatus } from "@/types";
import { MeetingExtractionResult } from "@/types/extraction";
import { ConflictRecord } from "./types";
import { detectConflicts, DetectedConflict } from "@/lib/conflictDetection";

export async function getDashboardOverview(): Promise<{
  stats: DashboardStats;
  recentMeetings: MeetingSummary[];
  upcomingTasks: TaskItem[];
  recentDecisions: Decision[];
  conflicts: ConflictRecord[];
}> {
  const db = await readDatabase();

  const awaitingTasksCount = db.tasks.filter(
    (t) => t.status === "Awaiting Approval" || t.requiresUserConfirmation
  ).length;

  const unresolvedConflictsCount = db.conflicts.filter((c) => !c.resolved).length;

  const stats: DashboardStats = {
    meetingsProcessed: db.meetings.length,
    meetingsThisWeekDelta: `+${Math.min(db.meetings.length, 4)} this week`,
    pendingTasks: db.tasks.filter((t) => t.status !== "Completed" && t.status !== "Rejected").length,
    pendingTasksConfirmationCount: awaitingTasksCount,
    upcomingDeadlines: db.tasks.filter((t) => t.status !== "Completed" && t.status !== "Rejected").length,
    deadlinesWithin48Hours: 2,
    unresolvedConflicts: unresolvedConflictsCount,
    conflictsAttentionNeeded:
      unresolvedConflictsCount > 0
        ? `${unresolvedConflictsCount} require review`
        : "All policies aligned",
  };

  return {
    stats,
    recentMeetings: db.meetings.slice(0, 5),
    upcomingTasks: db.tasks.slice(0, 6),
    recentDecisions: db.decisions.slice(0, 6),
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

