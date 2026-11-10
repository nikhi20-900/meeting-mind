export type DecisionStatus = "Active" | "Superseded" | "Under Review" | "Conflict Flagged";

export type TaskStatus =
  | "Awaiting Approval"
  | "Confirmed"
  | "In Progress"
  | "Completed"
  | "Rejected";

export type TaskPriority = "High" | "Medium" | "Low" | "Unknown";

export interface Decision {
  id: string;
  duplicateOfId?: string;
  duplicateMarkedAt?: string;
  duplicateReviewOriginalMeetingId?: string;
  date: string;
  meetingReference: string;
  meetingId: string;
  category: "Architecture" | "Product" | "Governance" | "Client SLA" | "Operations" | "Unknown";
  status: DecisionStatus;
  confidenceScore?: number;
  decisionText: string;
  rationale: string;
  evidence?: string;
  hasConflictWarning?: boolean;
  conflictRecordId?: string;
  conflictNotes?: string;
  conflictWithDecisionId?: string;
  conflictWithDecisionText?: string;
  conflictWithMeetingTitle?: string;
  conflictSeverity?: "Critical" | "Warning";
  conflictResolution?: string;
  dependentSettingsNote?: string;
}

export interface TaskItem {
  id: string;
  duplicateOfId?: string;
  duplicateMarkedAt?: string;
  associatedMeetingId?: string;
  duplicateReviewOriginalMeetingId?: string;
  duplicateReviewOriginalDecisionId?: string;
  title: string;
  owner: {
    name: string;
    avatar: string;
    role: string;
    email?: string;
  };
  dueDate: string;
  meetingDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  associatedMeeting: string;
  associatedDecisionId?: string;
  associatedDecisionText?: string;
  linkedConflictId?: string;
  evidence?: string;
  requiresUserConfirmation: boolean;
}

export interface MeetingSummary {
  id: string;
  duplicateOfId?: string;
  duplicateMarkedAt?: string;
  title: string;
  date: string;
  duration: string;
  participants: string[];
  status: "Processed" | "Draft" | "Pending Review";
  decisionsCount: number;
  tasksCount: number;
  conflictsDetected: number;
  snippet: string;
  recapText?: string;
}

export interface DashboardStats {
  meetingsProcessed: number;
  meetingsThisWeekDelta: string;
  pendingTasks: number;
  pendingTasksConfirmationCount: number;
  upcomingDeadlines: number;
  deadlinesWithin48Hours: number;
  unresolvedConflicts: number;
  conflictsAttentionNeeded: string;
}

export interface TeamMemberWeeklyDigest {
  id: string;
  name: string;
  role: string;
  avatar: string;
  weeklySummary: string;
  decisionsMade: Array<{
    id: string;
    text: string;
    meeting: string;
    date: string;
  }>;
  assignedTasks: Array<{
    id: string;
    title: string;
    priority: TaskPriority;
    dueDate: string;
    status: TaskStatus;
  }>;
  completedWork: Array<{
    id: string;
    title: string;
    completedDate: string;
    impact: string;
  }>;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    deadline: string;
    daysLeft: number;
    urgency: "Immediate" | "Approaching" | "On Track";
  }>;
}
