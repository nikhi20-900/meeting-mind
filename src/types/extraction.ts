import { TaskPriority, DecisionStatus, MeetingSummary, Decision, TaskItem } from "./index";
import { DetectedConflict } from "@/lib/conflictDetection";

export interface ExtractedSummary {
  headline: string;
  executiveSummary: string;
  keyTakeaways: string[];
  sentimentOrTone: string;
  primaryFocus: string;
}

export interface ExtractedDecision {
  id: string;
  decisionText: string;
  rationale: string;
  category: "Architecture" | "Product" | "Governance" | "Client SLA" | "Operations";
  status: DecisionStatus;
  speakerAttribution: string;
  confidenceScore?: number;
}

export interface ExtractedActionItem {
  id: string;
  title: string;
  ownerName: string;
  ownerRole: string;
  deadline: string;
  priority: TaskPriority;
  speakerAttribution: string;
  requiresConfirmation: boolean;
}

export interface ExtractedSpeaker {
  name: string;
  role: string;
  contributions: string;
}

export interface MeetingExtractionResult {
  title: string;
  meetingDate: string;
  summary: ExtractedSummary;
  decisions: ExtractedDecision[];
  actionItems: ExtractedActionItem[];
  speakers: ExtractedSpeaker[];
  metadata: {
    provider: string;
    model: string;
    extractedAt: string;
    tokenUsage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
  };
}

export type ExtractApiResponse =
  | {
      success: true;
      result: MeetingExtractionResult;
      savedMeeting?: MeetingSummary;
      savedDecisions?: Decision[];
      savedTasks?: TaskItem[];
      detectedConflicts?: DetectedConflict[];
      isPersisted: boolean;
    }
  | {
      success: false;
      error: "MISSING_API_KEY" | "LLM_API_ERROR" | "VALIDATION_FAILED" | "INVALID_REQUEST";
      message: string;
      details?: string;
      supportedProviders?: string[];
    };
