import {
  MeetingExtractionResult,
  ExtractedDecision,
  ExtractedActionItem,
  ExtractedSpeaker,
} from "@/types/extraction";
import { TaskPriority, DecisionStatus } from "@/types";

const VALID_CATEGORIES = [
  "Architecture",
  "Product",
  "Governance",
  "Client SLA",
  "Operations",
] as const;

const VALID_PRIORITIES = ["High", "Medium", "Low"] as const;

export function validateExtractionResult(
  raw: any,
  context: { title: string; meetingDate: string; provider: string; model: string }
): MeetingExtractionResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("Model output is not a valid JSON object");
  }

  // 1. Validate summary
  const rawSummary = raw.summary || {};
  const headline =
    typeof rawSummary.headline === "string" && rawSummary.headline.trim()
      ? rawSummary.headline.trim()
      : context.title;

  const executiveSummary =
    typeof rawSummary.executiveSummary === "string" && rawSummary.executiveSummary.trim()
      ? rawSummary.executiveSummary.trim()
      : typeof raw.executiveSummary === "string"
      ? raw.executiveSummary
      : "Summary of discussion points captured during meeting.";

  const keyTakeaways: string[] = Array.isArray(rawSummary.keyTakeaways)
    ? rawSummary.keyTakeaways.filter((item: any) => typeof item === "string" && item.trim())
    : Array.isArray(raw.keyTakeaways)
    ? raw.keyTakeaways.filter((item: any) => typeof item === "string" && item.trim())
    : [];

  const sentimentOrTone =
    typeof rawSummary.sentimentOrTone === "string"
      ? rawSummary.sentimentOrTone
      : "Constructive & aligned";

  const primaryFocus =
    typeof rawSummary.primaryFocus === "string"
      ? rawSummary.primaryFocus
      : "Technical alignment & commitments";

  // 2. Validate decisions
  const rawDecisions = Array.isArray(raw.decisions) ? raw.decisions : [];
  const decisions: ExtractedDecision[] = rawDecisions.map((item: any, idx: number) => {
    const rawCategory = typeof item.category === "string" ? item.category : "";
    const matchedCategory = VALID_CATEGORIES.find(
      (c) => c.toLowerCase() === rawCategory.toLowerCase()
    );
    const category = matchedCategory || "Operations";

    return {
      id: typeof item.id === "string" && item.id.trim() ? item.id : `dec-ext-${idx + 1}`,
      decisionText:
        typeof item.decisionText === "string" && item.decisionText.trim()
          ? item.decisionText.trim()
          : typeof item.text === "string"
          ? item.text
          : "Decision agreed upon during sync.",
      rationale:
        typeof item.rationale === "string" && item.rationale.trim()
          ? item.rationale.trim()
          : "Agreed by consensus to ensure project progression.",
      category,
      status: "Active" as DecisionStatus,
      speakerAttribution:
        typeof item.speakerAttribution === "string" && item.speakerAttribution.trim()
          ? item.speakerAttribution.trim()
          : typeof item.proposedBy === "string"
          ? `Proposed by ${item.proposedBy}`
          : "Attributed to meeting participants",
      confidenceScore: typeof item.confidenceScore === "number" ? item.confidenceScore : 0.95,
    };
  });

  // 3. Validate action items
  const rawActionItems = Array.isArray(raw.actionItems)
    ? raw.actionItems
    : Array.isArray(raw.tasks)
    ? raw.tasks
    : [];

  const actionItems: ExtractedActionItem[] = rawActionItems.map((item: any, idx: number) => {
    const rawPriority = typeof item.priority === "string" ? item.priority : "";
    const matchedPriority = VALID_PRIORITIES.find(
      (p) => p.toLowerCase() === rawPriority.toLowerCase()
    );
    const priority: TaskPriority = matchedPriority || "Medium";

    const ownerName =
      typeof item.ownerName === "string" && item.ownerName.trim()
        ? item.ownerName.trim()
        : typeof item.owner === "string"
        ? item.owner
        : typeof item.assignee === "string"
        ? item.assignee
        : "Unassigned";

    const ownerRole =
      typeof item.ownerRole === "string" && item.ownerRole.trim()
        ? item.ownerRole.trim()
        : "Team Member";

    const deadline =
      typeof item.deadline === "string" && item.deadline.trim()
        ? item.deadline.trim()
        : typeof item.dueDate === "string"
        ? item.dueDate
        : "Within 7 days";

    return {
      id: typeof item.id === "string" && item.id.trim() ? item.id : `tsk-ext-${idx + 1}`,
      title:
        typeof item.title === "string" && item.title.trim()
          ? item.title.trim()
          : typeof item.description === "string"
          ? item.description
          : `Action item #${idx + 1}`,
      ownerName,
      ownerRole,
      deadline,
      priority,
      speakerAttribution:
        typeof item.speakerAttribution === "string" && item.speakerAttribution.trim()
          ? item.speakerAttribution.trim()
          : `Assigned during recap discussion`,
      requiresConfirmation: true, // Meeting Mind principle: always requires confirmation
    };
  });

  // 4. Validate speakers
  const rawSpeakers = Array.isArray(raw.speakers)
    ? raw.speakers
    : Array.isArray(raw.participants)
    ? raw.participants
    : [];

  const speakers: ExtractedSpeaker[] = rawSpeakers.map((item: any) => {
    if (typeof item === "string") {
      return {
        name: item,
        role: "Participant",
        contributions: "Contributed to meeting discussion.",
      };
    }
    return {
      name: typeof item.name === "string" ? item.name : "Participant",
      role: typeof item.role === "string" ? item.role : "Team Member",
      contributions:
        typeof item.contributions === "string"
          ? item.contributions
          : "Participated in meeting consensus.",
    };
  });

  return {
    title: context.title,
    meetingDate: context.meetingDate,
    summary: {
      headline,
      executiveSummary,
      keyTakeaways,
      sentimentOrTone,
      primaryFocus,
    },
    decisions,
    actionItems,
    speakers,
    metadata: {
      provider: context.provider,
      model: context.model,
      extractedAt: new Date().toISOString(),
      tokenUsage: raw.metadata?.tokenUsage,
    },
  };
}

