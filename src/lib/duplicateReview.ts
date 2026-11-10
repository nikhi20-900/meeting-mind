import { createHash } from "node:crypto";
import type { Decision, MeetingSummary, TaskItem } from "@/types";

export type DuplicateEntityType = "meeting" | "decision" | "task";

export interface DuplicateReviewRecord {
  id: string;
  title: string;
  context: string;
  status: string;
  duplicateOfId?: string;
  duplicateMarkedAt?: string;
}

export interface DuplicateCandidateGroup {
  id: string;
  entityType: DuplicateEntityType;
  entityLabel: string;
  matchReason: string;
  cleanupBlockedReason?: string;
  records: DuplicateReviewRecord[];
}

export interface ArchivedDuplicateRecord extends DuplicateReviewRecord {
  entityType: DuplicateEntityType;
  keeperTitle: string;
}

interface DuplicateReviewData {
  meetings: MeetingSummary[];
  decisions: Decision[];
  tasks: TaskItem[];
}

export interface DuplicateCleanupDatabase extends DuplicateReviewData {
  conflicts: Array<{ sourceDecisionId: string; targetDecisionId: string }>;
}

function normalizeText(value: string | undefined): string {
  return (value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeDate(value: string | undefined): string | null {
  if (!value || /^(unknown|not specified|unspecified)$/i.test(value.trim())) return null;
  const exactDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (exactDate) return `${exactDate[1]}-${exactDate[2]}-${exactDate[3]}`;

  // Parse common month-name dates as calendar dates instead of timestamps.
  // Date.parse("Oct 31, 2026") is interpreted in the machine's local timezone,
  // which can shift it to the previous UTC day in some locales.
  const textualDate = value.trim().match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (textualDate) {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = months.indexOf(textualDate[1].slice(0, 3).toLowerCase());
    const day = Number(textualDate[2]);
    const year = Number(textualDate[3]);
    const calendarDate = new Date(Date.UTC(year, month, day));
    if (month < 0 || calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month || calendarDate.getUTCDate() !== day) return null;
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // For explicit timestamps, timezone conversion is meaningful and stable.
  if (!/[T ]\d{1,2}:\d{2}/.test(value)) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  const parsed = new Date(timestamp);
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-${String(parsed.getUTCDate()).padStart(2, "0")}`;
}

function groupId(entityType: DuplicateEntityType, signature: string): string {
  const digest = createHash("sha256").update(`${entityType}:${signature}`).digest("hex").slice(0, 16);
  return `${entityType}-${digest}`;
}

function collectGroups(
  entityType: DuplicateEntityType,
  entityLabel: string,
  matchReason: string,
  rows: Array<{ signature: string; record: DuplicateReviewRecord }>
): DuplicateCandidateGroup[] {
  const grouped = new Map<string, DuplicateReviewRecord[]>();
  for (const row of rows) {
    const records = grouped.get(row.signature) || [];
    records.push(row.record);
    grouped.set(row.signature, records);
  }

  return [...grouped.entries()]
    .filter(([, records]) => records.length > 1)
    .map(([signature, records]) => ({
      id: groupId(entityType, signature),
      entityType,
      entityLabel,
      matchReason,
      records: records.slice().sort((a, b) => a.id.localeCompare(b.id)),
    }));
}

export function findDuplicateCandidates(database: DuplicateReviewData): DuplicateCandidateGroup[] {
  const meetingRows = database.meetings.filter((meeting) => !meeting.duplicateOfId).flatMap((meeting) => {
    const title = normalizeText(meeting.title);
    const date = normalizeDate(meeting.date);
    if (!title || !date) return [];
    return [{
      signature: `${title}|${date}`,
      record: {
        id: meeting.id,
        title: meeting.title,
        context: `${meeting.date} · ${meeting.participants?.length || 0} participants`,
        status: meeting.status,
      },
    }];
  });

  const decisionRows = database.decisions.filter((decision) => !decision.duplicateOfId).flatMap((decision) => {
    const decisionText = normalizeText(decision.decisionText);
    const meetingTitle = normalizeText(decision.meetingReference);
    const meetingDate = normalizeDate(decision.date);
    if (!decisionText || !meetingTitle || !meetingDate) return [];
    return [{
      signature: `${decisionText}|${meetingTitle}|${meetingDate}`,
      record: {
        id: decision.id,
        title: decision.decisionText,
        context: `${decision.meetingReference} · ${decision.date} · ${decision.category}`,
        status: decision.status,
      },
    }];
  });

  const meetingDatesByTitle = new Map<string, Set<string>>();
  for (const meeting of database.meetings.filter((meeting) => !meeting.duplicateOfId)) {
    const title = normalizeText(meeting.title);
    const date = normalizeDate(meeting.date);
    if (!title || !date) continue;
    const dates = meetingDatesByTitle.get(title) || new Set<string>();
    dates.add(date);
    meetingDatesByTitle.set(title, dates);
  }

  const taskRows = database.tasks.filter((task) => !task.duplicateOfId).flatMap((task) => {
    const taskTitle = normalizeText(task.title);
    const meetingTitle = normalizeText(task.associatedMeeting);
    const owner = normalizeText(task.owner?.name);
    const explicitDate = normalizeDate(task.meetingDate);
    const knownMeetingDates = meetingDatesByTitle.get(meetingTitle);
    const meetingDate = explicitDate || (knownMeetingDates?.size === 1 ? [...knownMeetingDates][0] : null);
    const dueDate = normalizeDate(task.dueDate) || normalizeText(task.dueDate);
    if (!taskTitle || !meetingTitle || !owner || !meetingDate) return [];
    return [{
      signature: `${taskTitle}|${meetingTitle}|${meetingDate}|${owner}|${dueDate}`,
      record: {
        id: task.id,
        title: task.title,
        context: `${task.associatedMeeting} · ${task.owner.name} · due ${task.dueDate}`,
        status: task.status,
      },
    }];
  });

  return [
    ...collectGroups("meeting", "Meetings", "Same normalized title and meeting date", meetingRows),
    ...collectGroups("decision", "Decisions", "Same decision wording, meeting title, and meeting date", decisionRows),
    ...collectGroups("task", "Tasks", "Same task wording, meeting date, owner, and due date", taskRows),
  ].sort((a, b) => {
    const typeOrder: Record<DuplicateEntityType, number> = { meeting: 0, decision: 1, task: 2 };
    return typeOrder[a.entityType] - typeOrder[b.entityType] || a.id.localeCompare(b.id);
  });
}

export function archiveDuplicateGroup(
  database: DuplicateCleanupDatabase,
  groupId: string,
  keeperId: string,
  duplicateIds: string[],
  markedAt = new Date().toISOString()
): { entityType: DuplicateEntityType; keeper: DuplicateReviewRecord; archived: DuplicateReviewRecord[] } {
  const group = findDuplicateCandidates(database).find((candidate) => candidate.id === groupId);
  if (!group) throw new Error("This duplicate group has changed. Refresh the review and try again.");

  const keeper = group.records.find((record) => record.id === keeperId);
  const uniqueDuplicateIds = [...new Set(duplicateIds)];
  const expectedIds = group.records.map((record) => record.id).filter((id) => id !== keeperId).sort();
  if (!keeper || !expectedIds.length || expectedIds.join("|") !== uniqueDuplicateIds.slice().sort().join("|")) {
    throw new Error("Choose one record to keep and include every other record in this group.");
  }

  if (group.entityType === "decision") {
    const linkedIds = new Set(uniqueDuplicateIds);
    const hasConflictHistory = database.conflicts.some(
      (conflict) => linkedIds.has(conflict.sourceDecisionId) || linkedIds.has(conflict.targetDecisionId)
    );
    if (hasConflictHistory) {
      throw new Error("This decision group has conflict history. Resolve or review those conflicts before archiving duplicates.");
    }
  }

  const entityRows = group.entityType === "meeting"
    ? database.meetings
    : group.entityType === "decision"
      ? database.decisions
      : database.tasks;
  const archived: DuplicateReviewRecord[] = [];
  for (const id of uniqueDuplicateIds) {
    const entity = entityRows.find((row) => row.id === id);
    const record = group.records.find((row) => row.id === id);
    if (!entity || !record) throw new Error("A record in this group could not be found. Refresh the review and try again.");
    entity.duplicateOfId = keeperId;
    entity.duplicateMarkedAt = markedAt;
    archived.push({ ...record, duplicateOfId: keeperId, duplicateMarkedAt: markedAt });
  }

  if (group.entityType === "meeting") {
    for (const decision of database.decisions) {
      if (uniqueDuplicateIds.includes(decision.meetingId)) {
        decision.duplicateReviewOriginalMeetingId ||= decision.meetingId;
        decision.meetingId = keeperId;
      }
    }
    for (const task of database.tasks) {
      if (task.associatedMeetingId && uniqueDuplicateIds.includes(task.associatedMeetingId)) {
        task.duplicateReviewOriginalMeetingId ||= task.associatedMeetingId;
        task.associatedMeetingId = keeperId;
      }
    }
  }

  if (group.entityType === "decision") {
    for (const task of database.tasks) {
      if (task.associatedDecisionId && uniqueDuplicateIds.includes(task.associatedDecisionId)) {
        task.duplicateReviewOriginalDecisionId ||= task.associatedDecisionId;
        task.associatedDecisionId = keeperId;
      }
    }
  }

  return { entityType: group.entityType, keeper, archived };
}

export function restoreDuplicateRecords(
  database: DuplicateCleanupDatabase,
  entityType: DuplicateEntityType,
  recordIds: string[]
): number {
  const rows = entityType === "meeting"
    ? database.meetings
    : entityType === "decision"
      ? database.decisions
      : database.tasks;
  const ids = [...new Set(recordIds)];
  if (!ids.length) throw new Error("Choose at least one archived record to restore.");
  const records = ids.map((id) => rows.find((row) => row.id === id));
  if (records.some((record) => !record?.duplicateOfId)) {
    throw new Error("One or more records are no longer archived. Refresh the review and try again.");
  }
  for (const record of records) {
    delete record!.duplicateOfId;
    delete record!.duplicateMarkedAt;
  }
  if (entityType === "meeting") {
    const restoredIds = new Set(ids);
    for (const decision of database.decisions) {
      if (decision.duplicateReviewOriginalMeetingId && restoredIds.has(decision.duplicateReviewOriginalMeetingId)) {
        decision.meetingId = decision.duplicateReviewOriginalMeetingId;
        delete decision.duplicateReviewOriginalMeetingId;
      }
    }
    for (const task of database.tasks) {
      if (task.duplicateReviewOriginalMeetingId && restoredIds.has(task.duplicateReviewOriginalMeetingId)) {
        task.associatedMeetingId = task.duplicateReviewOriginalMeetingId;
        delete task.duplicateReviewOriginalMeetingId;
      }
    }
  }
  if (entityType === "decision") {
    const restoredIds = new Set(ids);
    for (const task of database.tasks) {
      if (task.duplicateReviewOriginalDecisionId && restoredIds.has(task.duplicateReviewOriginalDecisionId)) {
        task.associatedDecisionId = task.duplicateReviewOriginalDecisionId;
        delete task.duplicateReviewOriginalDecisionId;
      }
    }
  }
  return records.length;
}

export function listArchivedDuplicateRecords(database: DuplicateCleanupDatabase): ArchivedDuplicateRecord[] {
  const archived: ArchivedDuplicateRecord[] = [];
  for (const meeting of database.meetings.filter((row) => row.duplicateOfId)) {
    const keeper = database.meetings.find((row) => row.id === meeting.duplicateOfId);
    archived.push({
      id: meeting.id,
      entityType: "meeting",
      title: meeting.title,
      context: `${meeting.date} · ${meeting.participants?.length || 0} participants`,
      status: meeting.status,
      duplicateOfId: meeting.duplicateOfId,
      duplicateMarkedAt: meeting.duplicateMarkedAt,
      keeperTitle: keeper?.title || "Kept record unavailable",
    });
  }
  for (const decision of database.decisions.filter((row) => row.duplicateOfId)) {
    const keeper = database.decisions.find((row) => row.id === decision.duplicateOfId);
    archived.push({
      id: decision.id,
      entityType: "decision",
      title: decision.decisionText,
      context: `${decision.meetingReference} · ${decision.date} · ${decision.category}`,
      status: decision.status,
      duplicateOfId: decision.duplicateOfId,
      duplicateMarkedAt: decision.duplicateMarkedAt,
      keeperTitle: keeper?.decisionText || "Kept record unavailable",
    });
  }
  for (const task of database.tasks.filter((row) => row.duplicateOfId)) {
    const keeper = database.tasks.find((row) => row.id === task.duplicateOfId);
    archived.push({
      id: task.id,
      entityType: "task",
      title: task.title,
      context: `${task.associatedMeeting} · ${task.owner.name} · due ${task.dueDate}`,
      status: task.status,
      duplicateOfId: task.duplicateOfId,
      duplicateMarkedAt: task.duplicateMarkedAt,
      keeperTitle: keeper?.title || "Kept record unavailable",
    });
  }
  return archived.sort((a, b) => (b.duplicateMarkedAt || "").localeCompare(a.duplicateMarkedAt || ""));
}
