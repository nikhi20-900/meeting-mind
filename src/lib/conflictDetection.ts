import { Decision } from "@/types";
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
  verdict?: "GENUINE_CONTRADICTION" | "COMPATIBLE" | "INSUFFICIENT_INFORMATION";
}

export interface ConflictAuditResult {
  isConflict: boolean;
  verdict: "GENUINE_CONTRADICTION" | "COMPATIBLE" | "INSUFFICIENT_INFORMATION";
  explanation: string;
  severity: "Critical" | "Warning";
  suggestedResolution: string;
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
    newText.includes("requests per minute");

  const isHistRateRelated =
    histText.includes("rate limit") ||
    histText.includes("req/min") ||
    histText.includes("requests/min") ||
    histText.includes("throttle") ||
    histText.includes("burst") ||
    histText.includes("sla");

  if (isNewRateRelated && isHistRateRelated) {
    // Check if complementary: Caching (Redis), alerts, monitoring, telemetry, dashboards
    const isComplementary =
      newText.includes("redis") ||
      newText.includes("cache") ||
      newText.includes("alert") ||
      newText.includes("email alert") ||
      newText.includes("monitor") ||
      newText.includes("dashboard") ||
      newText.includes("metric") ||
      newText.includes("observability") ||
      newText.includes("audit") ||
      newText.includes("notification");

    if (isComplementary) {
      return {
        isConflict: false,
        verdict: "COMPATIBLE",
        explanation: `Both decisions relate to API gateway traffic and rate limits, but the new decision introduces complementary caching, observability, or threshold notifications that enforce and respect existing policies rather than violating them.`,
        severity: "Warning",
        suggestedResolution: "",
      };
    }

    // Check numerical contradiction:
    // Extract numbers associated with req/min or limit
    const newRateMatch = newText.match(/(\d{1,2}[,\.]?\d{3})\s*(?:req|request|limit)/i) || newText.match(/(?:to|limit of)\s*(\d{1,2}[,\.]?\d{3})/i);
    const histRateMatch = histText.match(/(\d{1,2}[,\.]?\d{3})\s*(?:req|request|limit)/i);

    const newRate = newRateMatch ? parseInt(newRateMatch[1].replace(/,/g, ""), 10) : null;
    const histRate = histRateMatch ? parseInt(histRateMatch[1].replace(/,/g, ""), 10) : null;

    if (newRate && histRate && newRate !== histRate) {
      const isSignificantDifference = Math.abs(newRate - histRate) > 500;
      if (isSignificantDifference || newText.includes("increase") || newText.includes("raise") || newText.includes("uncap")) {
        return {
          isConflict: true,
          verdict: "GENUINE_CONTRADICTION",
          explanation: `Rate limit contradiction: New decision establishes client rate limit of ${newRate.toLocaleString()} req/min, directly clashing with the established threshold of ${histRate.toLocaleString()} req/min in #${histDec.id.toUpperCase()} ("${histDec.decisionText}").`,
          severity: "Critical",
          suggestedResolution: "Align API Platform engineering and Client Success before adjusting client rate limits or connection pool headroom.",
        };
      }
    }
  }

  // Step 4: Authentication Security Policy (FIDO2 / WebAuthn vs SMS 2FA)
  if (
    (newText.includes("sms") || newText.includes("text message")) &&
    (histText.includes("fido2") || histText.includes("webauthn") || histText.includes("deprecate sms"))
  ) {
    if (
      newText.includes("permit") ||
      newText.includes("allow") ||
      newText.includes("restore") ||
      newText.includes("use sms") ||
      newText.includes("enable sms") ||
      newText.includes("standard login")
    ) {
      return {
        isConflict: true,
        verdict: "GENUINE_CONTRADICTION",
        explanation: `Security policy contradiction: New decision permits SMS 2FA, directly violating the mandatory hardware FIDO2/WebAuthn requirement and SMS deprecation policy codified in #${histDec.id.toUpperCase()} ("${histDec.decisionText}").`,
        severity: "Critical",
        suggestedResolution: "Reject SMS authentication fallback for production access to maintain Zero Trust and ISO-27001 regulatory compliance.",
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
4. GENUINE CONTRADICTION: ONLY flag as a conflict if the New Decision makes it impossible to fulfill the Historical Decision, directly overturns the established policy, or establishes mutually exclusive requirements.

When a Genuine Contradiction IS confirmed:
- Identify both decisions clearly.
- Explain the exact contradiction (why both cannot simultaneously be true).
- Provide a concrete, actionable resolution.
- Assign severity ("Critical" for security/SLA/downtime violations, "Warning" for stack/operational shifts).

Respond strictly in valid JSON:
{
  "isConflict": boolean,
  "verdict": "GENUINE_CONTRADICTION" | "COMPATIBLE" | "INSUFFICIENT_INFORMATION",
  "explanation": "Detailed explanation of why this is a genuine contradiction OR why it is compatible/insufficient",
  "severity": "Critical" | "Warning",
  "suggestedResolution": "Actionable steps to resolve the conflict (empty string if no conflict)"
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
      explanation: rawJson.explanation || "Evaluated by Gemini semantic auditor.",
      severity: rawJson.severity === "Critical" ? "Critical" : "Warning",
      suggestedResolution: rawJson.suggestedResolution || "",
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
          id: `conf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          newDecisionId: newDec.id,
          newDecisionText: newDec.decisionText,
          historicalDecisionId: histDec.id,
          historicalDecisionText: histDec.decisionText,
          historicalMeetingTitle: histDec.meetingReference,
          conflictDescription: auditResult.explanation,
          severity: auditResult.severity,
          suggestedResolution: auditResult.suggestedResolution,
          verdict: "GENUINE_CONTRADICTION",
        });
      }
    }
  }

  return detected;
}
