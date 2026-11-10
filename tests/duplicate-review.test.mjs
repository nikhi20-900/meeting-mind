import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const jiti = require("jiti")(process.cwd(), { alias: { "@": path.resolve("./src") } });
const { archiveDuplicateGroup, findDuplicateCandidates, restoreDuplicateRecords } = jiti("./src/lib/duplicateReview.ts");

const database = {
  meetings: [
    { id: "meeting-a", title: "Quarterly Access Review", date: "2026-10-31", status: "Processed", participants: ["Sarah"], snippet: "A" },
    { id: "meeting-b", title: "Quarterly Access Review!", date: "Oct 31, 2026", status: "Processed", participants: ["Sarah"], snippet: "B" },
    { id: "meeting-c", title: "Quarterly Access Review", date: "2026-11-01", status: "Processed", participants: ["Sarah"], snippet: "C" },
  ],
  decisions: [
    { id: "decision-a", date: "2026-10-31", meetingReference: "Quarterly Access Review", category: "Governance", status: "Active", decisionText: "Require WebAuthn for production access." },
    { id: "decision-b", date: "Oct 31, 2026", meetingReference: "Quarterly Access Review", category: "Governance", status: "Conflict Flagged", decisionText: "REQUIRE WebAuthn for production access" },
    { id: "decision-c", date: "2026-10-31", meetingReference: "Different meeting", category: "Governance", status: "Active", decisionText: "Require WebAuthn for production access." },
  ],
  tasks: [
    { id: "task-a", title: "Expedite key delivery", owner: { name: "Sarah Chen" }, dueDate: "Nov 07, 2026", meetingDate: "2026-10-31", associatedMeeting: "Quarterly Access Review", status: "Confirmed" },
    { id: "task-b", title: "Expedite key delivery!", owner: { name: "Sarah Chen" }, dueDate: "2026-11-07", meetingDate: "Oct 31, 2026", associatedMeeting: "Quarterly Access Review", status: "Awaiting Approval" },
    { id: "task-c", title: "Expedite key delivery", owner: { name: "Marcus Vance" }, dueDate: "2026-11-07", meetingDate: "2026-10-31", associatedMeeting: "Quarterly Access Review", status: "Confirmed" },
    { id: "task-d", title: "Expedite key delivery", owner: { name: "Sarah Chen" }, dueDate: "2026-11-08", meetingDate: "2026-10-31", associatedMeeting: "Quarterly Access Review", status: "Confirmed" },
  ],
};
const original = structuredClone(database);

const groups = findDuplicateCandidates(database);
assert.deepEqual(database, original, "Duplicate review must not mutate records.");
assert.deepEqual(groups.map((group) => group.entityType), ["meeting", "decision", "task"]);
assert.deepEqual(groups.map((group) => group.records.map((record) => record.id)), [
  ["meeting-a", "meeting-b"],
  ["decision-a", "decision-b"],
  ["task-a", "task-b"],
]);
assert.ok(groups.every((group) => group.matchReason.length > 0));

const cleanupDatabase = { ...structuredClone(database), conflicts: [] };
const meetingGroup = findDuplicateCandidates(cleanupDatabase).find((group) => group.entityType === "meeting");
const cleanupResult = archiveDuplicateGroup(
  cleanupDatabase,
  meetingGroup.id,
  "meeting-a",
  ["meeting-b"],
  "2026-11-10T12:00:00.000Z"
);
assert.equal(cleanupResult.archived.length, 1);
assert.equal(cleanupDatabase.meetings.length, 3, "Archived records must remain stored.");
assert.equal(cleanupDatabase.meetings.find((meeting) => meeting.id === "meeting-b").duplicateOfId, "meeting-a");
assert.equal(findDuplicateCandidates(cleanupDatabase).some((group) => group.entityType === "meeting"), false);
assert.equal(restoreDuplicateRecords(cleanupDatabase, "meeting", ["meeting-b"]), 1);
assert.equal(cleanupDatabase.meetings.find((meeting) => meeting.id === "meeting-b").duplicateOfId, undefined);

const linkedDatabase = { ...structuredClone(database), conflicts: [] };
linkedDatabase.decisions[0].meetingId = "meeting-b";
linkedDatabase.tasks[0].associatedMeetingId = "meeting-b";
linkedDatabase.tasks[0].associatedDecisionId = "decision-b";
const linkedMeetingGroup = findDuplicateCandidates(linkedDatabase).find((group) => group.entityType === "meeting");
archiveDuplicateGroup(linkedDatabase, linkedMeetingGroup.id, "meeting-a", ["meeting-b"]);
assert.equal(linkedDatabase.decisions[0].meetingId, "meeting-a", "Meeting-linked decisions should follow the kept meeting.");
assert.equal(linkedDatabase.tasks[0].associatedMeetingId, "meeting-a", "Meeting-linked tasks should follow the kept meeting.");
restoreDuplicateRecords(linkedDatabase, "meeting", ["meeting-b"]);
assert.equal(linkedDatabase.decisions[0].meetingId, "meeting-b", "Restoring a meeting should restore its decision link.");
assert.equal(linkedDatabase.tasks[0].associatedMeetingId, "meeting-b", "Restoring a meeting should restore its task link.");

const linkedDecisionGroup = findDuplicateCandidates(linkedDatabase).find((group) => group.entityType === "decision");
archiveDuplicateGroup(linkedDatabase, linkedDecisionGroup.id, "decision-a", ["decision-b"]);
assert.equal(linkedDatabase.tasks[0].associatedDecisionId, "decision-a", "Linked tasks should follow the kept decision.");
restoreDuplicateRecords(linkedDatabase, "decision", ["decision-b"]);
assert.equal(linkedDatabase.tasks[0].associatedDecisionId, "decision-b", "Restoring a decision should restore task links.");

const conflictDatabase = { ...structuredClone(database), conflicts: [{ sourceDecisionId: "decision-b", targetDecisionId: "historic-decision" }] };
const conflictGroup = findDuplicateCandidates(conflictDatabase).find((group) => group.entityType === "decision");
assert.throws(
  () => archiveDuplicateGroup(conflictDatabase, conflictGroup.id, "decision-a", ["decision-b"]),
  /conflict history/i,
  "Decision duplicates with linked conflict history must be protected."
);
assert.equal(conflictDatabase.decisions.find((decision) => decision.id === "decision-b").duplicateOfId, undefined);

console.log("PASS: duplicate review is read-only; confirmed archive is reversible, preserves links, and protects conflict history.");
