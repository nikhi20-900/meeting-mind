import { DetectedConflict } from "./conflictDetection";
import { TaskStatus, DecisionStatus } from "@/types";

export interface ResolutionOption {
  id: string;
  title: string;
  description: string;
  recommended?: boolean;
  proposedAction: string;
  targetTaskStatus?: TaskStatus;
  targetDecisionStatus?: DecisionStatus;
}

export interface DecisionImpact {
  conflictId: string;
  directConflict: string;
  downstreamImpact: {
    summary: string;
    affectedSystems: string[];
    dependentSettings?: string;
    riskLevel: "Critical" | "Warning" | "Moderate";
  };
  resolutionOptions: ResolutionOption[];
}

/**
 * Minimal Decision Impact Engine
 * Analyzes detected conflict data and historical decision memory to project:
 * 1. Direct contradiction
 * 2. Downstream impact on dependent configurations, database connection pools, or security standards
 * 3. 2–3 actionable resolution options with explicit proposed actions requiring human confirmation
 */
export function getDecisionImpact(conflict: {
  id: string;
  newDecisionText: string;
  historicalDecisionId: string;
  historicalDecisionText: string;
  conflictDescription?: string;
  severity?: "Critical" | "Warning";
  suggestedResolution?: string;
  dependentSettingsNote?: string;
}): DecisionImpact {
  const newText = (conflict.newDecisionText || "").toLowerCase();
  const histText = (conflict.historicalDecisionText || "").toLowerCase();
  const histId = (conflict.historicalDecisionId || "DEC-HIST").toUpperCase();

  // Case 1: Security Policy & Authentication (SMS 2FA vs FIDO2 / WebAuthn #DEC-06)
  if (
    newText.includes("sms") ||
    newText.includes("text message") ||
    histText.includes("fido2") ||
    histText.includes("webauthn") ||
    histId === "DEC-06"
  ) {
    return {
      conflictId: conflict.id,
      directConflict: `Proposed decision permits SMS 2FA authentication, directly violating the mandatory hardware security key policy and SMS deprecation codified in #${histId} ("${conflict.historicalDecisionText}").`,
      downstreamImpact: {
        summary:
          "Adopting SMS authentication fallback reintroduces telephony-based vulnerability vectors (SIM swapping, interception, phishing) to production database infrastructure. This violates ISO-27001 Zero Trust access controls and directly undermines active security task #TSK-07 ('Revoke legacy SSH keys and distribute WebAuthn YubiKeys').",
        affectedSystems: [
          "Production Database Perimeter",
          "ISO-27001 Compliance Certification",
          "Hardware Security Tokens (YubiKey / WebAuthn)",
          "Enforcement Task #TSK-07",
        ],
        riskLevel: "Critical",
      },
      resolutionOptions: [
        {
          id: "opt-enforce-fido2",
          title: "Enforce Hardware Keys & Reject SMS Fallback (Recommended)",
          description:
            "Strictly maintain Zero Trust hardware key requirements. Reject the proposed SMS authentication fallback for production access and expedite physical YubiKey distribution for contractors.",
          recommended: true,
          proposedAction:
            "Reject proposed SMS 2FA decision, maintain #DEC-06 as Active, and set associated task status to 'Rejected'.",
          targetTaskStatus: "Rejected",
          targetDecisionStatus: "Active",
        },
        {
          id: "opt-time-bound-exemption",
          title: "Authorize 14-Day Temporary Key Exemption",
          description:
            "Grant a time-bound 14-day contractor exemption with mandatory per-session MFA audit logging while replacement hardware keys are in transit.",
          recommended: false,
          proposedAction:
            "Mark decision as 'Under Review' with 14-day expiry limit; retain downstream tasks in 'Awaiting Approval' pending security lead sign-off.",
          targetTaskStatus: "Awaiting Approval",
          targetDecisionStatus: "Under Review",
        },
        {
          id: "opt-security-steering-escalation",
          title: "Escalate to Security Steering Committee",
          description:
            "Defer deployment until the Security & Authentication Steering Committee formally reviews contractor onboarding friction against audit liabilities.",
          recommended: false,
          proposedAction:
            "Hold proposed decision and downstream tasks in 'Awaiting Approval' pending steering committee sync.",
          targetTaskStatus: "Awaiting Approval",
          targetDecisionStatus: "Under Review",
        },
      ],
    };
  }

  // Case 2: API Gateway Rate Limiting (1,200 standard cap vs 2,000 req/min or 3,000 enterprise commitment)
  if (
    newText.includes("rate") ||
    newText.includes("req/min") ||
    newText.includes("requests/min") ||
    newText.includes("throttle") ||
    histText.includes("1,200") ||
    histText.includes("3,000") ||
    histId === "DEC-01" ||
    histId === "DEC-02"
  ) {
    const isEnterpriseBurst =
      newText.includes("3,000") ||
      histText.includes("3,000") ||
      (conflict.conflictDescription || "").includes("3,000") ||
      (conflict.conflictDescription || "").includes("DEC-02") ||
      histId === "DEC-02";

    const dependentNote =
      conflict.dependentSettingsNote ||
      "Dependent setting: The 85% alert threshold (currently calibrated to 1,020 req/min under the 1,200 cap) must be recalibrated to 1,700 req/min if the 2,000 req/min cap is approved.";

    if (isEnterpriseBurst) {
      return {
        conflictId: conflict.id,
        directConflict:
          "Direct SLA & Architecture contradiction: Standard client rate cap of 1,200 requests/minute (#DEC-01) directly contradicts the 3,000 requests/minute unthrottled burst commitment guaranteed in Enterprise renewals (#DEC-02).",
        downstreamImpact: {
          summary:
            "Analysis of September outage showed unbounded retry storms overwhelmed PostgreSQL write replicas. Fulfilling the 3,000 requests/min Enterprise burst commitment while standard clients are capped at 1,200 requests/min risks multi-tenant database replica starvation unless traffic tiers are strictly isolated.",
          affectedSystems: [
            "API Gateway Rate Limiter",
            "PostgreSQL Write Replica Pools",
            "Enterprise Client SLA Commitments",
            "Automated 85% Alert Notification Rule",
          ],
          dependentSettings:
            "Dependent setting: Alert triggers and connection pools must distinguish standard 1,200 req/min limits from 3,000 req/min enterprise burst thresholds.",
          riskLevel: "Critical",
        },
        resolutionOptions: [
          {
            id: "opt-isolate-enterprise-pool",
            title: "Provision Isolated Enterprise Connection Pool (Recommended)",
            description:
              "Maintain standard client cap at 1,200 req/min while provisioning dedicated, isolated connection pool headroom to fulfill the 3,000 req/min Enterprise burst guarantee.",
            recommended: true,
            proposedAction:
              "Confirm 1,200 req/min standard cap for public clients, isolate 3,000 req/min enterprise burst traffic to dedicated database replicas, and update SLA addendum.",
            targetTaskStatus: "Confirmed",
            targetDecisionStatus: "Active",
          },
          {
            id: "opt-renegotiate-burst-window",
            title: "Renegotiate Enterprise Burst Ceiling with Rate Throttling",
            description:
              "Cap enterprise burst at 2,000 req/min instead of 3,000 req/min to protect database connection pools until multi-region sharding is completed.",
            recommended: false,
            proposedAction:
              "Mark #DEC-02 as 'Under Review' and hold SLA contract renewals pending technical review.",
            targetTaskStatus: "Awaiting Approval",
            targetDecisionStatus: "Under Review",
          },
          {
            id: "opt-supersede-standard-cap",
            title: "Supersede 1,200 req/min Standard Cap",
            description:
              "Increase all gateway cluster tiers to accommodate 3,000 req/min bursts uniformly across all client tiers.",
            recommended: false,
            proposedAction:
              "Mark #DEC-01 as 'Superseded' and confirm gateway infrastructure scaling task.",
            targetTaskStatus: "Confirmed",
            targetDecisionStatus: "Superseded",
          },
        ],
      };
    }

    return {
      conflictId: conflict.id,
      directConflict: `Proposed client rate limit of 2,000 requests/minute directly clashes with the 1,200 requests/minute standard rate cap codified in #${histId} ("${conflict.historicalDecisionText}"), while Enterprise tier renewals specify a 3,000 requests/minute burst ceiling.`,
      downstreamImpact: {
        summary:
          "Analysis of September outage showed unbounded retry storms overwhelmed PostgreSQL write replicas. Raising throughput from 1,200 to 2,000 req/min without scaling connection pool headroom increases database failover risk. Additionally, the dependent 85% email alert threshold must be updated from 1,020 to 1,700 req/min.",
        affectedSystems: [
          "API Gateway Ingress Rate Limiter",
          "PostgreSQL Write Replica Connection Pools",
          "Automated 85% Alert Notification Rule",
        ],
        dependentSettings: dependentNote,
        riskLevel: "Critical",
      },
      resolutionOptions: [
        {
          id: "opt-scale-pool-approve",
          title: "Approve 2,000 req/min & Recalibrate Dependent 85% Alert Threshold (Recommended)",
          description:
            "Formally supersede #DEC-01, scale PostgreSQL write replica connection pools for higher concurrency, and update automated email alert trigger from 1,020 to 1,700 req/min (85% of 2,000).",
          recommended: true,
          proposedAction:
            "Mark #DEC-01 as 'Superseded', adopt 2,000 req/min cap, recalibrate dependent 85% alert setting to 1,700 req/min, and confirm proposed rate adjustment task.",
          targetTaskStatus: "Confirmed",
          targetDecisionStatus: "Superseded",
        },
        {
          id: "opt-maintain-cap-redis",
          title: "Maintain 1,200 req/min Database Cap with Edge Redis Caching",
          description:
            "Retain the 1,200 req/min database protection ceiling. Fulfill higher client query volume via Redis edge caching to absorb read traffic without overloading replica pools.",
          recommended: false,
          proposedAction:
            "Maintain #DEC-01 as Active, reject unconstrained rate cap increase, and set proposed task status to 'Rejected'.",
          targetTaskStatus: "Rejected",
          targetDecisionStatus: "Active",
        },
        {
          id: "opt-isolated-enterprise-burst",
          title: "Establish Isolated Enterprise Connection Tier",
          description:
            "Provision an isolated connection pool with dedicated burst headroom for Enterprise clients while keeping the standard 1,200 req/min ceiling intact for public clients.",
          recommended: false,
          proposedAction:
            "Mark decision as 'Under Review' and keep downstream tasks in 'Awaiting Approval' pending infrastructure capacity validation.",
          targetTaskStatus: "Awaiting Approval",
          targetDecisionStatus: "Under Review",
        },
      ],
    };
  }

  // Fallback: General Architectural or Governance Conflict
  return {
    conflictId: conflict.id,
    directConflict:
      conflict.conflictDescription ||
      `Direct contradiction with established policy in #${histId} ("${conflict.historicalDecisionText}").`,
    downstreamImpact: {
      summary:
        "Contradictory decisions create divergence across active team workflows and conflicting infrastructure configurations.",
      affectedSystems: ["Organizational Policy Memory", "Downstream Team Deployments"],
      riskLevel: conflict.severity === "Critical" ? "Critical" : "Warning",
      dependentSettings: conflict.dependentSettingsNote,
    },
    resolutionOptions: [
      {
        id: "opt-supersede-historical",
        title: `Supersede #${histId} with New Mandate`,
        description: `Formally supersede historical decision #${histId} and adopt the newly proposed direction across the organization.`,
        recommended: false,
        proposedAction: `Mark #${histId} as 'Superseded', adopt the newly proposed decision, and confirm associated implementation tasks.`,
        targetTaskStatus: "Confirmed",
        targetDecisionStatus: "Superseded",
      },
      {
        id: "opt-uphold-historical",
        title: `Uphold #${histId} & Reject Proposed Change (Recommended)`,
        description: `Preserve the existing standard in #${histId} and reject the conflicting proposal to maintain operational consistency.`,
        recommended: true,
        proposedAction: `Maintain #${histId} as Active and reject proposed downstream tasks.`,
        targetTaskStatus: "Rejected",
        targetDecisionStatus: "Active",
      },
    ],
  };
}
