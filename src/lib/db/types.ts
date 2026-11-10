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
  dependentSettingsNote?: string;
}

export interface MeetingTemplate {
  id: string;
  name: string;
  title: string;
  recapText: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingMindDatabase {
  meetings: MeetingSummary[];
  decisions: Decision[];
  tasks: TaskItem[];
  conflicts: ConflictRecord[];
  templates: MeetingTemplate[];
  meta: {
    version: number;
    lastUpdated: string;
    initializedAt: string;
  };
}

