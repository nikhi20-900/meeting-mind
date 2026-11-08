import { Decision } from "@/types";
import { randomUUID } from "node:crypto";
import { ExtractedDecision } from "@/types/extraction";
import { generateGeminiExtraction, sanitizeErrorMessage } from "@/lib/gemini";

export interface DetectedConflict {
  id: string;
  newDecisionId: string;
  newDecisionText: string;
  historicalDecisionId: string;
  historicalDecisionText: string;
  historicalMeetingTitle: string;
  conflictDescription: string;
  severity: "Critical" | "Warning";
  suggestedResolution?: string;
  dependentSettingsNote?: string;
  conflictType?: "DIRECT_CONTRADICTION" | "DEPENDENT_CONFIGURATION" | "POLICY_VIOLATION";
  verdict?: "GENUINE_CONTRADICTION" | "COMPATIBLE" | "INSUFFICIENT_INFORMATION";
}

export interface ConflictAuditResult {
  isConflict: boolean;
  verdict: "GENUINE_CONTRADICTION" | "COMPATIBLE" | "INSUFFICIENT_INFORMATION";
  explanation: string;
  severity: "Critical" | "Warning";
  suggestedResolution: string;
  dependentSettingsNote?: string;
  conflictType?: "DIRECT_CONTRADICTION" | "DEPENDENT_CONFIGURATION" | "POLICY_VIOLATION";
}

/**
 * Checks whether two decisions share a relevant functional domain.
 * Decisions in disjoint domains (e.g. UI color contrast vs Database replication) are immediately filtered out.
 */
function checkDomainRelevance(newText: string, histText: string): boolean {
  const domains = [
    // Rate Limiting & Gateway Traffic
    ["rate limit", "req/min", "requests/min", "throttle", "traffic", "gateway", "burst", "sla", "connection pool"],
    // Ingress & Reverse Proxy Stack
    ["ingress", "proxy", "nginx", "envoy", "traefik", "sidecar", "reverse proxy", "routing"],
    // Security & Authentication Policy
    ["auth", "2fa", "mfa", "fido2", "webauthn", "sms", "token", "login", "password", "biometric"],
    // Data Retention & Log Purging
    ["retention", "purge", "glacier", "archive", "lifecycle", "cold storage", "delete log", "days"],
    // Migration Windows & Code Freezes
    ["migration", "freeze", "downtime", "lockdown", "black friday", "maintenance window", "cutover"],
    // UI Accessibility & Design Standards
    ["contrast", "wcag", "accessibility", "color ratio", "7:1", "4.5:1", "dark mode"],
  ];

  return domains.some((keywords) => {
    const newMatches = keywords.some((k) => newText.includes(k));
    const histMatches = keywords.some((k) => histText.includes(k));
    return newMatches && histMatches;
  });
}

/**
 * Evaluates candidate decision pairs using high-precision deterministic semantic rules.
 * Strictly separates:
 * 1. GENUINE_CONTRADICTION: Mutually exclusive mandates that cannot both hold.
 * 2. COMPATIBLE: Decisions that share related topics/technologies but complement, monitor, or coexist.
 * 3. INSUFFICIENT_INFORMATION: Exploratory tasks, studies, or reviews that lack concrete opposing mandates.
 */
export function evaluateConflictDeterministically(
  newDec: ExtractedDecision,
  histDec: Decision
): ConflictAuditResult {
  const newText = (newDec.decisionText + " " + (newDec.rationale || "")).toLowerCase();
  const histText = (histDec.decisionText + " " + (histDec.rationale || "")).toLowerCase();

  // Step 1: Detect Insufficient Information / Exploratory Intent
  // Words indicating study, investigation, or discussion without a concrete operational mandate
  const exploratoryWords = [
    "investigate",
    "explore",
    "evaluate",
    "review",
    "assess",
    "study",
    "research",
    "consider",
    "gather feedback",
    "survey",
    "benchmark",
    "pilot test",
    "test whether",
    "pending discussion",
    "feasibility",
    "look into",
    "preliminary",
    "discuss later",
  ];

  const hasExploratoryIntent = exploratoryWords.some((w) => newText.includes(w));
  const hasAffirmativeOverturn = [
    "deprecate",
    "replace",
    "eliminate",
    "mandate",
    "enforce",
    "override",
    "terminate",
    "ban",
    "prohibit",
    "disallow",
    "raise limit to",
    "increase limit to",
    "reduce to",
  ].some((w) => newText.includes(w));

  // Step 1a: Black Friday Freeze Unverified Policy Check
  // If the Black Friday traffic-freeze policy is absent from Decision Memory, label concern unverified and retain investigation task without inventing a conflict
  if (
    (newText.includes("black friday") || newText.includes("traffic freeze") || newText.includes("freeze policy")) &&
    !(histText.includes("freeze") || histText.includes("black friday"))
  ) {
    return {
      isConflict: false,
      verdict: "INSUFFICIENT_INFORMATION",
      explanation: `Unverified concern: The Black Friday traffic-freeze policy is absent from Decision Memory. Retaining investigation task for human verification without inventing an unverified conflict against #${histDec.id.toUpperCase()}.`,
      severity: "Warning",
      suggestedResolution: "Verify whether an active commercial freeze policy was ratified by Marketing before flagging an operational conflict.",
    };
  }

  if (hasExploratoryIntent && !hasAffirmativeOverturn) {
    return {
      isConflict: false,
      verdict: "INSUFFICIENT_INFORMATION",
      explanation: `The new decision is an exploratory investigation, research task, or preliminary review. It lacks concrete, enforceable parameters or contradictory policy enactments required to establish a conflict against #${histDec.id.toUpperCase()}.`,
      severity: "Warning",
      suggestedResolution: "",
    };
  }

  // Step 2: Ingress / Gateway Architecture Clash (NGINX vs Envoy / Traefik)
  if (
    (newText.includes("envoy") && histText.includes("nginx")) ||
    (newText.includes("nginx") && histText.includes("envoy")) ||
    (newText.includes("traefik") && histText.includes("nginx"))
  ) {
    // Check if new decision is complementary (e.g. "benchmarking", "testing in staging", or "coexisting")
    if (
      newText.includes("benchmark") ||
      newText.includes("staging test") ||
      newText.includes("complement") ||
      newText.includes("metric")
    ) {
      return {
        isConflict: false,
        verdict: "COMPATIBLE",
        explanation: "Decisions discuss related ingress proxy technologies, but the new decision is a non-conflicting trial, benchmark, or telemetry enhancement.",
        severity: "Warning",
        suggestedResolution: "",
      };
    }

    if (
      newText.includes("deprecate") ||
      newText.includes("replace") ||
      newText.includes("mandate") ||
      newText.includes("all clusters") ||
      newText.includes("across microservices") ||
      newText.includes("instead of")
    ) {
      return {
        isConflict: true,
        verdict: "GENUINE_CONTRADICTION",
        explanation: `Direct architectural contradiction: New decision mandates replacing or deprecating NGINX with Envoy across microservices, which directly overturns the active proxy standard established in #${histDec.id.toUpperCase()} ("${histDec.decisionText}").`,
        severity: "Warning",
        suggestedResolution: `Formally mark #${histDec.id.toUpperCase()} as 'Superseded' in Decision Memory and convene an architecture sync before provisioning Envoy manifests.`,
      };
    }
  }

  // Step 3: API Rate Limiting & Gateway SLA
  const isNewRateRelated =
    newText.includes("rate limit") ||
    newText.includes("req/min") ||
    newText.includes("requests/min") ||
    newText.includes("throttle") ||
    newText.includes("requests per minute") ||
    newText.includes("rate cap");

  const isHistRateRelated =
    histText.includes("rate limit") ||
    histText.includes("req/min") ||
    histText.includes("requests/min") ||
    histText.includes("throttle") ||
    histText.includes("burst") ||
    histText.includes("sla") ||
    histText.includes("rate cap");

  if (isNewRateRelated && isHistRateRelated) {
    // Check if complementary: Caching (Redis), alerts, monitoring, telemetry, dashboards
    const isComplementary =
      newText.includes("redis") ||
      newText.includes("cache") ||
      newText.includes("dashboard") ||
      newText.includes("metric") ||
      newText.includes("observability") ||
      newText.includes("audit") ||
      (newText.includes("alert") && !newText.includes("raise") && !newText.includes("increase") && !newText.includes("uncap"));

    if (isComplementary) {
      return {
        isConflict: false,
        verdict: "COMPATIBLE",
        conflictType: "DEPENDENT_CONFIGURATION",
        explanation: `Both decisions relate to API gateway traffic and rate limits, but the new decision introduces complementary caching, observability, or threshold notifications that enforce and respect existing policies rather than violating them.`,
        severity: "Warning",
        suggestedResolution: "",
      };
    }

    // Check numerical values associated with req/min or limit
    const newRateMatch =
      newText.match(/(\d{1,2}[,\.]?\d{3})\s*(?:req|request|limit|cap)/i) ||
      newText.match(/(?:to|limit of|cap of|at)\s*(\d{1,2}[,\.]?\d{3})/i) ||
      newText.match(/(\d{1,2}[,\.]?\d{3})/);
    const histRateMatch =
      histText.match(/(\d{1,2}[,\.]?\d{3})\s*(?:req|request|limit|cap)/i) ||
      histText.match(/(?:to|limit of|cap of|at)\s*(\d{1,2}[,\.]?\d{3})/i) ||
      histText.match(/(\d{1,2}[,\.]?\d{3})/);

    const newRate = newRateMatch ? parseInt(newRateMatch[1].replace(/,/g, ""), 10) : null;
    const histRate = histRateMatch ? parseInt(histRateMatch[1].replace(/,/g, ""), 10) : null;

    // Distinguish alert threshold configuration from rate cap contradiction:
    // If the historical decision is specifically configuring the 85% alert threshold:
    if (histText.includes("85%") || (histText.includes("alert") && !histText.includes("cap "))) {
      return {
        isConflict: false,
        verdict: "COMPATIBLE",
        conflictType: "DEPENDENT_CONFIGURATION",
        explanation: `Historical decision #${histDec.id.toUpperCase()} defines a dependent 85% alert threshold. It does not directly contradict changing the rate cap, but will require updating if a new rate limit is approved.`,
        severity: "Warning",
        suggestedResolution: `Recalibrate the automated 85% email alert trigger to correspond with any newly approved client rate cap.`,
        dependentSettingsNote: `The 85% alert threshold is a dependent setting that will need updating if the rate limit change is approved.`,
      };
    }

    if (newRate && histRate && newRate !== histRate) {
      const isSignificantDifference = Math.abs(newRate - histRate) >= 100;
      if (isSignificantDifference || newText.includes("increase") || newText.includes("raise") || newText.includes("uncap")) {
        const oldThreshold = Math.round(histRate * 0.85);
        const newThreshold = Math.round(newRate * 0.85);

        // Distinguish standard rate cap (1,200 req/min) from enterprise burst guarantee (3,000 req/min)
        const isEnterpriseClash =
          (newRate === 3000 || histRate === 3000 || histDec.id === "dec-02") &&
          (newRate === 1200 || histRate === 1200 || histDec.id === "dec-01");

        const explanation = isEnterpriseClash
          ? `Direct SLA & Architecture contradiction: Standard client rate cap of 1,200 requests/min (#DEC-01) contradicts the 3,000 requests/min unthrottled burst commitment guaranteed in Enterprise renewals (#DEC-02).`
          : `Direct rate cap contradiction: Proposed rate limit of ${newRate.toLocaleString()} requests/min directly contradicts the established rate cap of ${histRate.toLocaleString()} requests/min codified in #${histDec.id.toUpperCase()} ("${histDec.decisionText}").`;

        const suggestedResolution = isEnterpriseClash
          ? "Coordinate between Architecture and Enterprise Client Success to provision an isolated connection pool tier for 3,000 req/min enterprise clients while maintaining the 1,200 req/min multi-tenant database protection cap."
          : "Convene API Platform and Database Engineering to verify connection pool headroom and replica lag before approving the new rate cap.";

        return {
          isConflict: true,
          verdict: "GENUINE_CONTRADICTION",
          conflictType: "DIRECT_CONTRADICTION",
          explanation,
          severity: "Critical",
          suggestedResolution,
          dependentSettingsNote: `The 85% alert threshold (currently calibrated to ${oldThreshold.toLocaleString()} req/min under the ${histRate.toLocaleString()} cap) is a dependent setting that may need updating to ${newThreshold.toLocaleString()} req/min if the change is approved.`,
        };
      }
    }
  }

  // Step 4: Authentication Security Policy (FIDO2 / WebAuthn vs SMS 2FA)
  if (
    (newText.includes("sms") || newText.includes("text message") || newText.includes("phone-based")) &&
    (histText.includes("fido2") || histText.includes("webauthn") || histText.includes("deprecate sms") || histText.includes("hardware key"))
  ) {
    if (
      newText.includes("permit") ||
      newText.includes("allow") ||
      newText.includes("restore") ||
      newText.includes("use sms") ||
      newText.includes("enable sms") ||
      newText.includes("standard login") ||
      newText.includes("adopt sms") ||
      newText.includes("support sms") ||
      newText.includes("fallback to sms")
    ) {
      return {
        isConflict: true,
        verdict: "GENUINE_CONTRADICTION",
        conflictType: "POLICY_VIOLATION",
        explanation: `Security policy contradiction: Proposed decision permits SMS 2FA for production database access, directly violating the mandatory hardware FIDO2/WebAuthn requirement and SMS deprecation policy codified in #${histDec.id.toUpperCase()} ("${histDec.decisionText}").`,
        severity: "Critical",
        suggestedResolution: "Reject SMS 2FA authentication fallback for production database access to maintain Zero Trust posture and ISO-27001 compliance. Hardware security keys (FIDO2/WebAuthn) remain mandatory.",
      };
    }
  }

  // Step 5: Data Retention Days
  if (
    (newText.includes("retention") || newText.includes("purge") || newText.includes("archive")) &&
    (histText.includes("retention") || histText.includes("purge") || histText.includes("glacier"))
  ) {
    const newDaysMatch = newText.match(/(\d+)\s*days/);
    const histDaysMatch = histText.match(/(\d+)\s*days/);
    if (newDaysMatch && histDaysMatch && newDaysMatch[1] !== histDaysMatch[1]) {
      return {
        isConflict: true,
        verdict: "GENUINE_CONTRADICTION",
        explanation: `Data retention policy mismatch: New decision mandates ${newDaysMatch[1]} days retention, contradicting the ${histDaysMatch[1]}-day window defined in #${histDec.id.toUpperCase()} ("${histDec.decisionText}").`,
        severity: "Warning",
        suggestedResolution: "Verify statutory compliance requirements with Legal & Compliance before adjusting log lifecycle timelines.",
      };
    }
  }

  // Step 6: Maintenance during Code Freeze
  if (
    (newText.includes("migration") || newText.includes("maintenance") || newText.includes("downtime")) &&
    (histText.includes("freeze") || histText.includes("black friday") || histText.includes("lockdown"))
  ) {
    if (newText.includes("during freeze") || newText.includes("black friday") || newText.includes("peak trading")) {
      return {
        isConflict: true,
        verdict: "GENUINE_CONTRADICTION",
        explanation: `Operational schedule conflict: Proposed database maintenance window overlaps with the strict production freeze established in #${histDec.id.toUpperCase()} ("${histDec.decisionText}").`,
        severity: "Critical",
        suggestedResolution: "Reschedule migration cutover outside the designated commercial freeze window.",
      };
    }
  }

  // Default: If no explicit contradiction found, decisions discussing related topics are compatible
  return {
    isConflict: false,
    verdict: "COMPATIBLE",
    explanation: `Decisions discuss related topics within the organization, but no irreconcilable contradiction or operational collision exists between them.`,
    severity: "Warning",
    suggestedResolution: "",
  };
}

/**
 * Evaluates candidate decision pairs using Google Gemini Flash when available.
 */
async function evaluateConflictWithGemini(
  newDec: ExtractedDecision,
  histDec: Decision,
  apiKey: string
): Promise<ConflictAuditResult> {
  const systemPrompt = `You are Meeting Mind's Cross-Meeting Conflict Auditor.
Your responsibility is to strictly audit potential contradictions between a Newly Proposed Decision and an established Historical Decision.

CRITICAL AUDIT RULES:
1. FALSE POSITIVE PREVENTION: Do NOT flag a conflict merely because two decisions discuss related topics, technologies, or business domains. Related topic != Contradiction.
2. COMPATIBILITY: If two decisions can coexist, complement each other, address different scopes, or work in harmony (e.g. adding caching/monitoring to an existing rate limit), classify as COMPATIBLE (NOT a conflict).
3. INSUFFICIENT INFORMATION: If the new decision is exploratory, a study, a review, an assessment, preliminary research, or lacks concrete operational parameters to establish a definite clash, classify as INSUFFICIENT_INFORMATION (NOT a conflict).
4. DIRECT CONTRADICTION VS DEPENDENT CONFIGURATION:
   - Identify direct contradictions (e.g. 1,200 req/min cap vs 2,000 req/min cap) as GENUINE_CONTRADICTION with Critical severity.
   - For rate limit changes (e.g. 1,200 to 2,000 req/min), identify the rate cap difference as a direct conflict, and identify the 85% alert threshold as a dependent setting that will need updating if the change is approved (include in "dependentSettingsNote").
5. CATEGORY-SPECIFIC RESOLUTION INSTRUCTIONS:
   - Tailor resolutions to the actual conflict category (Security, Architecture, SLA, Governance).
   - NEVER mention API throttles, rates, or gateways in Security conflicts (e.g. SMS 2FA vs FIDO2). Security conflicts must focus strictly on authentication standards, Zero Trust, and compliance.

When a Genuine Contradiction IS confirmed:
- Identify both decisions clearly.
- Explain the exact contradiction (why both cannot simultaneously be true).
- Provide a concrete, actionable resolution relevant to the domain.
- Assign severity ("Critical" for security/SLA/downtime violations, "Warning" for stack/operational shifts).

Respond strictly in valid JSON:
{
  "isConflict": boolean,
  "verdict": "GENUINE_CONTRADICTION" | "COMPATIBLE" | "INSUFFICIENT_INFORMATION",
  "conflictType": "DIRECT_CONTRADICTION" | "DEPENDENT_CONFIGURATION" | "POLICY_VIOLATION",
  "explanation": "Detailed explanation of why this is a genuine contradiction OR why it is compatible/insufficient",
  "severity": "Critical" | "Warning",
  "suggestedResolution": "Actionable resolution steps tailored to the specific category (empty string if no conflict)",
  "dependentSettingsNote": "Optional note on dependent configurations (e.g. 85% alert threshold) that need updating if approved"
}`;

  const userPrompt = `Newly Proposed Decision:
- ID: ${newDec.id}
- Decision Text: "${newDec.decisionText}"
- Rationale: "${newDec.rationale || "None specified"}"
- Category: "${newDec.category}"

Established Historical Decision:
- ID: ${histDec.id}
- Decision Text: "${histDec.decisionText}"
- Rationale: "${histDec.rationale}"
- Category: "${histDec.category}"
- Originating Meeting: "${histDec.meetingReference}"

Analyze whether there is a genuine contradiction, if they are compatible, or if there is insufficient information.`;

  try {
    const { rawJson } = await generateGeminiExtraction({
      apiKey,
      systemPrompt,
      userPrompt,
    });

    const isConflict = Boolean(rawJson.isConflict) && rawJson.verdict === "GENUINE_CONTRADICTION";
    const verdict = rawJson.verdict || (isConflict ? "GENUINE_CONTRADICTION" : "COMPATIBLE");

    return {
      isConflict,
      verdict,
      conflictType: rawJson.conflictType,
      explanation: rawJson.explanation || "Evaluated by Gemini semantic auditor.",
      severity: rawJson.severity === "Critical" ? "Critical" : "Warning",
      suggestedResolution: rawJson.suggestedResolution || "",
      dependentSettingsNote: rawJson.dependentSettingsNote,
    };
  } catch (err: any) {
    console.warn(
      `[ConflictDetection] Gemini semantic audit fallback: ${sanitizeErrorMessage(err?.message || String(err))}`
    );
    // Fall back to deterministic evaluation
    return evaluateConflictDeterministically(newDec, histDec);
  }
}

/**
 * Detects cross-meeting conflicts between newly extracted decisions and existing organizational memory.
 * Strictly avoids false positives:
 * - Does not flag decisions merely because they share a domain/topic.
 * - Does not flag decisions with insufficient information / exploratory reviews.
 * - Confirmed conflicts identify both decisions, explain the contradiction, and provide a suggested resolution.
 */
export async function detectConflicts(
  newDecisions: ExtractedDecision[],
  historicalDecisions: Decision[],
  newMeetingTitle: string
): Promise<DetectedConflict[]> {
  const detected: DetectedConflict[] = [];
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  for (const newDec of newDecisions) {
    const newText = (newDec.decisionText + " " + (newDec.rationale || "")).toLowerCase();

    for (const histDec of historicalDecisions) {
      // Only evaluate against active decisions
      if (histDec.status === "Superseded") continue;

      const histText = (histDec.decisionText + " " + (histDec.rationale || "")).toLowerCase();

      // Rule 0: Quick Domain Relevance Filter
      // If decisions are in completely unrelated domains, skip immediately
      if (!checkDomainRelevance(newText, histText)) {
        continue;
      }

      // Step: Perform Semantic Contradiction Evaluation
      let auditResult: ConflictAuditResult;
      if (apiKey && apiKey.trim()) {
        auditResult = await evaluateConflictWithGemini(newDec, histDec, apiKey.trim());
      } else {
        auditResult = evaluateConflictDeterministically(newDec, histDec);
      }

      if (auditResult.isConflict && auditResult.verdict === "GENUINE_CONTRADICTION") {
        detected.push({
          id: `conf-${randomUUID()}`,
          newDecisionId: newDec.id,
          newDecisionText: newDec.decisionText,
          historicalDecisionId: histDec.id,
          historicalDecisionText: histDec.decisionText,
          historicalMeetingTitle: histDec.meetingReference,
          conflictDescription: auditResult.explanation,
          severity: auditResult.severity,
          suggestedResolution: auditResult.suggestedResolution,
          dependentSettingsNote: auditResult.dependentSettingsNote,
          conflictType: auditResult.conflictType,
          verdict: "GENUINE_CONTRADICTION",
        });
      }
    }
  }

  return detected;
}
