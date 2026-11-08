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
const DECISION_REVIEW_CONFIDENCE = 0.75;

function knownText(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "Unknown";
}

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
      ? raw.executiveSummary.trim() || "Unknown"
      : "Unknown";

  const keyTakeaways: string[] = Array.isArray(rawSummary.keyTakeaways)
    ? rawSummary.keyTakeaways.filter((item: any) => typeof item === "string" && item.trim())
    : Array.isArray(raw.keyTakeaways)
    ? raw.keyTakeaways.filter((item: any) => typeof item === "string" && item.trim())
    : [];

  const sentimentOrTone =
    typeof rawSummary.sentimentOrTone === "string" && rawSummary.sentimentOrTone.trim()
      ? rawSummary.sentimentOrTone.trim()
      : "Unknown";

  const primaryFocus =
    typeof rawSummary.primaryFocus === "string" && rawSummary.primaryFocus.trim()
      ? rawSummary.primaryFocus.trim()
      : "Unknown";

  // 2. Validate decisions
  const rawDecisions = Array.isArray(raw.decisions) ? raw.decisions : [];
  const decisions: ExtractedDecision[] = rawDecisions.map((rawItem: any, idx: number) => {
    const item = rawItem && typeof rawItem === "object" ? rawItem : {};
    const rawCategory = typeof item.category === "string" ? item.category : "";
    const matchedCategory = VALID_CATEGORIES.find(
      (c) => c.toLowerCase() === rawCategory.toLowerCase()
    );
    const category = matchedCategory || "Unknown";
    const decisionText =
      knownText(item.decisionText) !== "Unknown"
        ? knownText(item.decisionText)
        : knownText(item.text);
    const confidenceScore =
      typeof item.confidenceScore === "number" && Number.isFinite(item.confidenceScore)
        ? Math.max(0, Math.min(1, item.confidenceScore))
        : undefined;

    return {
      id: typeof item.id === "string" && item.id.trim() ? item.id : `dec-ext-${idx + 1}`,
      decisionText,
      rationale: knownText(item.rationale),
      category,
      status:
        decisionText === "Unknown" ||
        confidenceScore === undefined ||
        confidenceScore < DECISION_REVIEW_CONFIDENCE
          ? ("Under Review" as DecisionStatus)
          : ("Active" as DecisionStatus),
      speakerAttribution:
        typeof item.speakerAttribution === "string" && item.speakerAttribution.trim()
          ? item.speakerAttribution.trim()
          : typeof item.proposedBy === "string" && item.proposedBy.trim()
          ? `Proposed by ${item.proposedBy.trim()}`
          : "Unknown",
      confidenceScore,
    };
  });

  // 3. Validate action items
  const rawActionItems = Array.isArray(raw.actionItems)
    ? raw.actionItems
    : Array.isArray(raw.tasks)
    ? raw.tasks
    : [];

  const actionItems: ExtractedActionItem[] = rawActionItems.map((rawItem: any, idx: number) => {
    const item = rawItem && typeof rawItem === "object" ? rawItem : {};
    const rawPriority = typeof item.priority === "string" ? item.priority : "";
    const matchedPriority = VALID_PRIORITIES.find(
      (p) => p.toLowerCase() === rawPriority.toLowerCase()
    );
    const priority: TaskPriority = matchedPriority || "Unknown";

    const ownerName =
      knownText(item.ownerName) !== "Unknown"
        ? knownText(item.ownerName)
        : knownText(item.owner) !== "Unknown"
        ? knownText(item.owner)
        : knownText(item.assignee);

    const ownerRole = knownText(item.ownerRole);

    const deadline =
      knownText(item.deadline) !== "Unknown"
        ? knownText(item.deadline)
        : knownText(item.dueDate);

    return {
      id: typeof item.id === "string" && item.id.trim() ? item.id : `tsk-ext-${idx + 1}`,
      title: knownText(item.title) !== "Unknown" ? knownText(item.title) : knownText(item.description),
      ownerName,
      ownerRole,
      deadline,
      priority,
      speakerAttribution:
        typeof item.speakerAttribution === "string" && item.speakerAttribution.trim()
          ? item.speakerAttribution.trim()
          : "Unknown",
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
        name: knownText(item),
        role: "Unknown",
        contributions: "Unknown",
      };
    }
    const speaker = item && typeof item === "object" ? item : {};
    return {
      name: knownText(speaker.name),
      role: knownText(speaker.role),
      contributions: knownText(speaker.contributions),
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

