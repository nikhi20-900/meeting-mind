import type { Decision, MeetingSummary, TaskItem } from "@/types";
import type { ConflictRecord } from "@/lib/db/types";

export interface MeetingSummaryExportData {
  meeting: MeetingSummary;
  decisions: Decision[];
  tasks: TaskItem[];
  conflicts: ConflictRecord[];
}

function excerpt(value: string, limit: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit).replace(/\s+\S*$/, "").trimEnd();
  return `${cut}…`;
}

export function createMeetingSummaryMarkdown(detail: MeetingSummaryExportData): string {
  const { meeting, decisions, tasks, conflicts } = detail;
  const lines = [
    `# ${meeting.title}`,
    "",
    `**Date:** ${meeting.date || "Unknown"}`,
    `**Participants:** ${meeting.participants.length ? meeting.participants.join(", ") : "Not recorded"}`,
    "",
    "## Recap",
    excerpt(meeting.recapText || meeting.snippet || "No recap was saved for this meeting.", 520),
    "",
    `## Decisions (${decisions.length})`,
    ...(decisions.length ? decisions.map((decision) => `- **${decision.status}**${decision.id ? ` (${decision.id})` : ""}: ${excerpt(decision.decisionText, 240)}`) : ["- No decisions linked."]),
    "",
    `## Conflicts (${conflicts.length})`,
    ...(conflicts.length ? conflicts.map((conflict) => `- **${conflict.severity} · ${conflict.resolved ? "Resolved" : "Needs review"}:** ${excerpt(conflict.description, 240)}`) : ["- No conflicts linked."]),
    "",
    `## Action items (${tasks.length})`,
    ...(tasks.length ? tasks.map((task) => `- **${task.status}**: ${excerpt(task.title, 180)} — ${task.owner.name || "Owner unknown"}; due ${task.dueDate || "unknown"}`) : ["- No action items linked."]),
    "",
    "---",
    "Meeting summary from MeetingMind",
  ];
  return lines.join("\n");
}
