import { DecisionStatus } from "@/types";

export interface ResolutionOption {
  id: string;
  title: string;
  description: string;
  targetDecisionStatus: DecisionStatus;
}

export interface DecisionImpact {
  conflictId: string;
  directConflict: string;
  suggestedNextStep?: string;
  downstreamImpact: {
    summary: string;
    affectedSystems: string[];
    dependentSettings?: string;
    riskLevel: "Critical" | "Warning";
  };
  resolutionOptions: ResolutionOption[];
}

/** Build an impact view only from the two stored decisions and their recorded conflict evidence. */
export function getDecisionImpact(conflict: {
  id: string;
  historicalDecisionId: string;
  conflictDescription?: string;
  severity?: "Critical" | "Warning";
  suggestedResolution?: string;
  dependentSettingsNote?: string;
}): DecisionImpact {
  const earlierId = conflict.historicalDecisionId || "the earlier decision";
  const hasLinkedDecision = Boolean(conflict.historicalDecisionId);

  return {
    conflictId: conflict.id,
    directConflict: conflict.conflictDescription || "No evidence summary was recorded for this conflict. Review both decision statements before changing either one.",
    suggestedNextStep: conflict.suggestedResolution,
    downstreamImpact: {
      summary: conflict.dependentSettingsNote
        ? "Recorded dependent setting is shown below. Other affected systems or tasks have not been verified."
        : "Affected systems and tasks have not been verified from the available records. Check with the people responsible before changing either decision.",
      affectedSystems: [],
      dependentSettings: conflict.dependentSettingsNote,
      riskLevel: conflict.severity || "Warning",
    },
    resolutionOptions: hasLinkedDecision
      ? [
          {
            id: "keep-under-review",
            title: "Keep the earlier decision under review",
            description: `Leave #${earlierId.toUpperCase()} open for a follow-up discussion. The newer decision will remain under review.`,
            targetDecisionStatus: "Under Review",
          },
          {
            id: "uphold-earlier",
            title: "Keep the earlier decision active",
            description: `Record that #${earlierId.toUpperCase()} remains the agreed direction. The newer decision will remain under review.`,
            targetDecisionStatus: "Active",
          },
          {
            id: "supersede-earlier",
            title: "Replace the earlier decision",
            description: `Mark #${earlierId.toUpperCase()} as superseded after the team has agreed to replace it.`,
            targetDecisionStatus: "Superseded",
          },
        ]
      : [],
  };
}
