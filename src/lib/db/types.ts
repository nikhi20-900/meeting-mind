import { Decision, MeetingSummary, TaskItem } from "@/types";

export interface ConflictRecord {
  id: string;
  sourceDecisionId: string;
  targetDecisionId: string;
  sourceMeetingTitle: string;
  targetMeetingTitle: string;
  description: string;
  severity: "Critical" | "Warning";
  detectedAt: string;
  resolved: boolean;
  resolutionNotes?: string;
}

export interface MeetingMindDatabase {
  meetings: MeetingSummary[];
  decisions: Decision[];
  tasks: TaskItem[];
  conflicts: ConflictRecord[];
  meta: {
    version: number;
    lastUpdated: string;
    initializedAt: string;
  };
}

