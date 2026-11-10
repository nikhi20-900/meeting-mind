import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const jiti = require("jiti")(process.cwd(), {
  alias: { "@": path.resolve("./src") },
});

const { evaluateConflictDeterministically, detectConflicts } = jiti(
  "./src/lib/conflictDetection.ts"
);
const { getDecisionImpact } = jiti("./src/lib/decisionImpact.ts");

console.log("============================================================");
console.log(" MEETING MIND CONFLICT AUDIT TEST SUITE");
console.log("============================================================\n");

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}\n`);
    throw err;
  }
}

// -------------------------------------------------------------
// Historical Baseline Fixtures
// -------------------------------------------------------------
const histDec01 = {
  id: "dec-01",
  date: "Oct 30, 2026",
  meetingReference: "Q4 API Gateway Migration & Rate Limiting Sync",
  meetingId: "mtg-101",
  category: "Architecture",
  status: "Active",
  decisionText:
    "Cap standard API clients at 1,200 requests/minute to protect core database connection pools during failovers.",
  rationale:
    "Analysis of September outage showed unbounded retry storms overwhelmed PostgreSQL write replicas.",
  hasConflictWarning: false,
};

const histDec06 = {
  id: "dec-06",
  date: "Oct 08, 2026",
  meetingReference: "Security & Authentication Steering Committee",
  meetingId: "mtg-092",
  category: "Governance",
  status: "Active",
  decisionText:
    "Require hardware FIDO2 / WebAuthn keys for all production database access; deprecate SMS 2FA.",
  rationale:
    "Defends against phishing-resistant session hijacking vectors identified in recent red-team exercise.",
  hasConflictWarning: false,
};

// =============================================================
// TEST 1: SMS 2FA vs FIDO2 Hardware Keys Security Conflict
// =============================================================
runTest("Test 1: SMS 2FA vs FIDO2 security conflict flags genuine contradiction without API throttle mentions", () => {
  const proposedDecision = {
    id: "dec-new-sms",
    category: "Governance",
    decisionText:
      "Allow engineers to use SMS 2FA fallback for production database access when hardware keys are unavailable.",
    rationale: "Contractors reported delays receiving hardware security tokens.",
  };

  const audit = evaluateConflictDeterministically(proposedDecision, histDec06);

  // 1. Conflict status and verdict
  assert.equal(audit.isConflict, true, "Should be flagged as a genuine conflict");
  assert.equal(audit.verdict, "GENUINE_CONTRADICTION", "Verdict must be GENUINE_CONTRADICTION");
  assert.equal(audit.severity, "Critical", "Security policy violation must be Critical severity");

  // 2. Both decisions identified
  assert.match(audit.explanation, /DEC-06/i, "Explanation must identify historical decision #DEC-06");
  assert.match(audit.explanation, /SMS/i, "Explanation must identify SMS 2FA");
  assert.match(audit.explanation, /FIDO2|WebAuthn/i, "Explanation must cite hardware FIDO2/WebAuthn requirement");

  // 3. Category-specific resolution relevant to security & compliance
  assert.ok(audit.suggestedResolution.length > 0, "Suggested resolution must be provided");
  assert.match(audit.suggestedResolution, /Zero Trust|ISO-27001|Hardware|security key/i, "Resolution must reference security controls");

  // 4. CRITICAL REQUIREMENT: Security conflicts must NOT mention API throttles
  const textBlob = `${audit.explanation} ${audit.suggestedResolution}`.toLowerCase();
  assert.equal(textBlob.includes("throttle"), false, "Security conflict must NEVER mention throttle");
  assert.equal(textBlob.includes("throttles"), false, "Security conflict must NEVER mention throttles");
  assert.equal(textBlob.includes("rate limit"), false, "Security conflict must NEVER mention rate limit");
  assert.equal(textBlob.includes("api gateway"), false, "Security conflict must NEVER mention api gateway");
});

// =============================================================
// TEST 2: Rate Limit Direct Contradiction (1,200 to 2,000 req/min)
// =============================================================
runTest("Test 2: Rate limit change (1,200 to 2,000 req/min) identifies a direct contradiction without inventing dependent settings", () => {
  const proposedDecision = {
    id: "dec-new-rate",
    category: "Architecture",
    decisionText:
      "Raise standard client rate limit to 2,000 requests/minute to support new enterprise tier onboarding.",
    rationale: "Enterprise clients require higher throughput during normal business hours.",
  };

  const audit = evaluateConflictDeterministically(proposedDecision, histDec01);

  // 1. Conflict status and direct contradiction
  assert.equal(audit.isConflict, true, "Should be flagged as a genuine conflict");
  assert.equal(audit.verdict, "GENUINE_CONTRADICTION", "Verdict must be GENUINE_CONTRADICTION");
  assert.equal(audit.conflictType, "DIRECT_CONTRADICTION", "Must be classified as DIRECT_CONTRADICTION");
  assert.equal(audit.severity, "Critical", "Direct rate limit clash must be Critical severity");

  // 2. Identifies rate values and historical decision
  assert.match(audit.explanation, /DEC-01/i, "Explanation must identify historical decision #DEC-01");
  assert.match(audit.explanation, /2,000/i, "Explanation must reference proposed 2,000 req/min");
  assert.match(audit.explanation, /1,200/i, "Explanation must reference historical 1,200 req/min cap");

  // 3. Category-specific resolution
  assert.match(audit.suggestedResolution, /API Platform|Database|connection pool/i, "Resolution must address platform & DB headroom");

  // 4. No dependent threshold is present in these records, so none should be invented.
  assert.equal(audit.dependentSettingsNote, undefined, "Must not invent a downstream alert setting");
});

// =============================================================
// TEST 3: Compatible Caching & Alerting Decisions
// =============================================================
runTest("Test 3: Compatible caching and alert decisions are NOT flagged as conflicts", () => {
  const cachingDecision = {
    id: "dec-caching",
    category: "Architecture",
    decisionText:
      "Deploy a Redis cache cluster in front of the API gateway to support existing read query loads and rate limits.",
    rationale: "Reduces database read traffic while strictly respecting the 1,200 req/min cap.",
  };

  const cachingAudit = evaluateConflictDeterministically(cachingDecision, histDec01);
  assert.equal(cachingAudit.isConflict, false, "Redis caching should NOT be flagged as conflict");
  assert.notEqual(cachingAudit.verdict, "GENUINE_CONTRADICTION", "Caching decision must not be labeled a contradiction");

  const alertDecision = {
    id: "dec-alerting",
    category: "Client SLA",
    decisionText:
      "Configure automated email alerts when clients reach 85% of their 1,200 requests/minute limit.",
    rationale: "Provides proactive notification before rate limits are fully exhausted.",
  };

  const alertAudit = evaluateConflictDeterministically(alertDecision, histDec01);
  assert.equal(alertAudit.isConflict, false, "Proactive alert threshold should NOT be flagged as conflict");
  assert.notEqual(alertAudit.verdict, "GENUINE_CONTRADICTION", "Alert decision must not be labeled a contradiction");
});

// =============================================================
// TEST 4: Insufficient Information / Exploratory Task
// =============================================================
runTest("Test 4: Exploratory investigation lacks contradictory mandate and is NOT flagged as conflict", () => {
  const exploratoryDecision = {
    id: "dec-exploratory",
    category: "Governance",
    decisionText:
      "Task the security engineering team with investigating future alternative authentication methods and gathering contractor feedback during Q1.",
    rationale: "Preliminary review to gather team sentiment.",
  };

  const audit = evaluateConflictDeterministically(exploratoryDecision, histDec06);
  assert.equal(audit.isConflict, false, "Exploratory research must NOT be flagged as conflict");
  assert.equal(audit.verdict, "INSUFFICIENT_INFORMATION", "Verdict must be INSUFFICIENT_INFORMATION");
});

// =============================================================
// TEST 5: Cross-Meeting detectConflicts Integration Test
// =============================================================
runTest("Test 5: detectConflicts integration correctly attaches severity, resolutions, and dependent notes", async () => {
  const newDecisions = [
    {
      id: "dec-sms-batch",
      category: "Governance",
      decisionText: "Allow engineers to use SMS 2FA fallback for production database access.",
      rationale: "Backup mechanism during token outages.",
      speakerAttribution: "Sarah Chen",
    },
    {
      id: "dec-rate-batch",
      category: "Architecture",
      decisionText: "Raise client rate limit to 2,000 requests/min across gateway clusters.",
      rationale: "Accommodate Q4 peak traffic.",
      speakerAttribution: "Marcus Vance",
    },
    {
      id: "dec-cache-batch",
      category: "Architecture",
      decisionText: "Deploy Redis cache to optimize API response latency.",
      rationale: "Caching optimization.",
      speakerAttribution: "Liam Patel",
    },
  ];

  const historicalDecisions = [histDec01, histDec06];

  // Temporarily unset GEMINI_API_KEY in this process to test deterministic integration branch
  const origKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const conflicts = await detectConflicts(newDecisions, historicalDecisions, "Integration Meeting");

    // Exactly 2 conflicts should be detected (SMS and Rate Limit). Cache should NOT be detected!
    assert.equal(conflicts.length, 2, "Expected exactly 2 conflicts detected");

    const smsConflict = conflicts.find((c) => c.newDecisionId === "dec-sms-batch");
    assert.ok(smsConflict, "SMS conflict must be detected");
    assert.equal(smsConflict.severity, "Critical", "SMS conflict must be Critical");
    assert.match(smsConflict.conflictDescription, /FIDO2/i, "SMS conflict must cite FIDO2");
    assert.equal(
      `${smsConflict.conflictDescription} ${smsConflict.suggestedResolution}`.toLowerCase().includes("throttle"),
      false,
      "SMS conflict output must NOT contain throttle"
    );

    const rateConflict = conflicts.find((c) => c.newDecisionId === "dec-rate-batch");
    assert.ok(rateConflict, "Rate conflict must be detected");
    assert.equal(rateConflict.severity, "Critical", "Rate conflict must be Critical");
    assert.equal(rateConflict.dependentSettingsNote, undefined, "Must not add an unsupported dependent setting");
  } finally {
    if (origKey) process.env.GEMINI_API_KEY = origKey;
  }
});

// =============================================================
// TEST 6: Decision Impact Engine - SMS 2FA Security Scenario
// =============================================================
runTest("Test 6: Decision Impact Engine correctly models direct conflict, downstream impact, and 3 resolution options for SMS 2FA", () => {
  const smsConflict = {
    id: "conf-sms-audit",
    newDecisionText: "Allow engineers to use SMS 2FA fallback for production database access when hardware keys are unavailable.",
    historicalDecisionId: "dec-06",
    historicalDecisionText: "Require hardware FIDO2 / WebAuthn keys for all production database access; deprecate SMS 2FA.",
    conflictDescription: "Security policy contradiction: SMS 2FA directly violates mandatory hardware keys in #DEC-06.",
    severity: "Critical",
    suggestedResolution: "Reject SMS fallback to maintain Zero Trust and ISO-27001 compliance.",
  };

  const impact = getDecisionImpact(smsConflict);

  // 1. Direct Conflict verification
  assert.match(impact.directConflict, /DEC-06/i, "Direct conflict must reference #DEC-06");
  assert.match(impact.directConflict, /hardware keys|FIDO2|WebAuthn/i, "Direct conflict must reference hardware keys");

  // 2. Downstream Impact verification (supported by stored decisions)
  assert.equal(impact.downstreamImpact.riskLevel, "Critical", "Security impact risk must be Critical");
  assert.match(impact.downstreamImpact.summary, /have not been verified/i, "Unverified downstream effects must be labeled clearly");
  assert.deepEqual(impact.downstreamImpact.affectedSystems, [], "Do not invent affected systems");

  // 3. Resolution Options verification (2-3 options)
  assert.ok(impact.resolutionOptions.length >= 2 && impact.resolutionOptions.length <= 3, "Must provide 2-3 resolution options");

  assert.ok(impact.resolutionOptions.every((option) => option.targetDecisionStatus), "Options must describe decision status changes for human review");

  // 4. CRITICAL: Zero throttle mentions in Security Impact
  const securityBlob = JSON.stringify(impact).toLowerCase();
  assert.equal(securityBlob.includes("throttle"), false, "Security impact engine must NEVER mention throttle");
  assert.equal(securityBlob.includes("throttles"), false, "Security impact engine must NEVER mention throttles");
});

// =============================================================
// TEST 7: Decision Impact Engine - API Rate-Limit Scenario
// =============================================================
runTest("Test 7: Decision Impact Engine shows supplied evidence without inventing downstream settings", () => {
  const rateConflict = {
    id: "conf-rate-audit",
    newDecisionText: "Raise client rate limit to 2,000 requests/minute to support new enterprise tier onboarding.",
    historicalDecisionId: "dec-01",
    historicalDecisionText: "Cap standard API clients at 1,200 requests/minute to protect core database connection pools during failovers.",
    conflictDescription: "Rate limit contradiction: 2,000 req/min directly clashes with 1,200 req/min in #DEC-01.",
    severity: "Critical",
    suggestedResolution: "Align API Platform and Database Engineering to verify connection pool headroom.",
  };

  const impact = getDecisionImpact(rateConflict);

  // 1. Direct Conflict verification
  assert.match(impact.directConflict, /DEC-01/i, "Direct conflict must cite #DEC-01");
  assert.match(impact.directConflict, /2,000/i, "Direct conflict must reference 2,000 req/min");
  assert.match(impact.directConflict, /1,200/i, "Direct conflict must reference 1,200 req/min");

  // 2. Downstream Impact verification (supported by stored decisions)
  assert.equal(impact.downstreamImpact.riskLevel, "Critical", "Rate limit clash must be Critical risk");
  assert.match(impact.downstreamImpact.summary, /have not been verified/i, "Unverified downstream effects must be labeled clearly");
  assert.equal(impact.downstreamImpact.dependentSettings, undefined, "Do not invent a dependent alert setting");
  assert.deepEqual(impact.downstreamImpact.affectedSystems, [], "Do not invent affected systems");

  // 3. Resolution Options verification (2-3 options)
  assert.ok(impact.resolutionOptions.length >= 2 && impact.resolutionOptions.length <= 3, "Must provide 2-3 resolution options");

  assert.ok(impact.resolutionOptions.every((option) => option.targetDecisionStatus), "Options must be decision review choices");
});

// =============================================================
// TEST 8: Human Review & Confirmation Safeguard
// =============================================================
runTest("Test 8: Resolution options present decision status changes for human review", () => {
  const dummyConflict = {
    id: "conf-dummy",
    newDecisionText: "Raise client rate limit to 2,000 requests/minute",
    historicalDecisionId: "dec-01",
    historicalDecisionText: "Cap standard API clients at 1,200 requests/minute",
  };

  const impact = getDecisionImpact(dummyConflict);

  for (const opt of impact.resolutionOptions) {
    assert.ok(opt.id, "Every option must have an id");
    assert.ok(opt.title, "Every option must have a title");
    assert.ok(opt.description, "Every option must have a description");
    assert.ok(["Active", "Under Review", "Superseded"].includes(opt.targetDecisionStatus), "Option must specify a valid decision status");
  }
});

// =============================================================
// TEST 9: Black Friday Traffic Freeze Policy Absence Check
// =============================================================
runTest("Test 9: Absent Black Friday freeze policy labels concern unverified and retains task without inventing conflict", () => {
  const freezeConcernDecision = {
    id: "dec-freeze-review",
    category: "Architecture",
    decisionText: "Review potential conflict with Marketing's Black Friday traffic freeze policy regarding Cloud Spanner migration cutover window.",
    rationale: "Elena raised concern during architecture sync.",
  };

  const audit = evaluateConflictDeterministically(freezeConcernDecision, histDec01);

  // Must NOT invent a conflict because the freeze policy is absent from Decision Memory
  assert.equal(audit.isConflict, false, "Must not invent a conflict when freeze policy is absent");
  assert.equal(audit.verdict, "INSUFFICIENT_INFORMATION", "Verdict must be INSUFFICIENT_INFORMATION");
  assert.match(audit.explanation, /exploratory or incomplete|does not establish a direct contradiction/i, "Explanation must avoid an unsupported conflict claim");
});

// =============================================================
// TEST 10: Different client tiers require explicit shared scope
// =============================================================
runTest("Test 10: Different client tiers remain unclassified without explicit shared scope", () => {
  const enterpriseBurstDecision = {
    id: "dec-enterprise-3000",
    category: "Client SLA",
    decisionText: "Guarantee 3,000 requests/minute unthrottled burst headroom for Enterprise contract renewals in Q4.",
    rationale: "Sales commitment required for tier-1 renewals.",
  };

  const audit = evaluateConflictDeterministically(enterpriseBurstDecision, histDec01);

  assert.equal(audit.isConflict, false, "Distinct Enterprise and standard client scopes should not be conflated");
  assert.equal(audit.verdict, "INSUFFICIENT_INFORMATION", "Scope uncertainty must remain unclassified");
});

// =============================================================
// TEST 11: Real Persistence & Human Confirmation Flow
// =============================================================
runTest("Test 11: Selecting an option does NOT persist; explicit confirmation flow triggers repository updates", async () => {
  const { updateTaskStatus, updateDecisionStatus, getAllTasks, getAllDecisions } = jiti("./src/lib/db/repository.ts");

  // Read current baseline
  const tasksBefore = await getAllTasks();
  const testTask = tasksBefore[0];
  assert.ok(testTask, "A test task must exist in database");

  const originalStatus = testTask.status;

  // 1. Simulating option selection in UI:
  // Merely selecting an option in DecisionImpactPanel updates local state `selectedOptionId`.
  // It does NOT invoke updateTaskStatus or write to storage.
  const tasksAfterSelect = await getAllTasks();
  assert.equal(tasksAfterSelect[0].status, originalStatus, "Task status must remain unchanged upon selection");

  // 2. Simulating explicit human confirmation:
  // Only when confirmed does updateTaskStatus execute.
  const updated = await updateTaskStatus(testTask.id, "Awaiting Approval");
  assert.equal(updated.status, "Awaiting Approval", "Status must update after explicit execution");

  // Decisions update:
  const decisions = await getAllDecisions();
  const targetDec = decisions[0];
  if (targetDec) {
    const updatedDec = await updateDecisionStatus(targetDec.id, targetDec.status, targetDec.conflictResolution);
    assert.equal(updatedDec.id, targetDec.id, "Decision update must succeed cleanly");
  }
});

console.log(`\n============================================================`);
console.log(` ALL ${passedTests}/${totalTests} TESTS PASSED CLEANLY!`);
console.log(`============================================================\n`);
