import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, enforceRateLimit, readJsonBody } from "@/lib/apiSecurity";
import { archiveDuplicateGroup, findDuplicateCandidates, listArchivedDuplicateRecords, restoreDuplicateRecords } from "@/lib/duplicateReview";
import { mutateDatabase, readDatabase } from "@/lib/db/store";

export async function GET(request: NextRequest) {
  const denied = authenticateApiRequest(request);
  if (denied) return denied;
  const limited = await enforceRateLimit(request, "duplicates-read", 60, 60_000);
  if (limited) return limited;

  try {
    const database = await readDatabase();
    const groups = findDuplicateCandidates(database).map((group) => {
      if (group.entityType !== "decision") return group;
      const recordIds = new Set(group.records.map((record) => record.id));
      const hasConflictHistory = database.conflicts.some(
        (conflict) => recordIds.has(conflict.sourceDecisionId) || recordIds.has(conflict.targetDecisionId)
      );
      return hasConflictHistory
        ? { ...group, cleanupBlockedReason: "Conflict history is linked to these decisions. Review those conflicts before archiving duplicates." }
        : group;
    });
    return NextResponse.json({
      success: true,
      groups,
      archived: listArchivedDuplicateRecords(database),
      summary: {
        groups: groups.length,
        records: groups.reduce((total, group) => total + group.records.length, 0),
      },
    });
  } catch (error) {
    console.error("[api/duplicates] Failed to review duplicate candidates:", error);
    return NextResponse.json(
      { success: false, error: "FETCH_FAILED", message: "Duplicate candidates could not be loaded." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const denied = authenticateApiRequest(request, { mutation: true });
  if (denied) return denied;
  const limited = await enforceRateLimit(request, "duplicates-cleanup", 20, 60_000);
  if (limited) return limited;
  const parsed = await readJsonBody(request, 8_192);
  if (parsed.response) return parsed.response;
  const body = parsed.body as {
    action?: unknown;
    groupId?: unknown;
    keeperId?: unknown;
    duplicateIds?: unknown;
    entityType?: unknown;
    recordIds?: unknown;
  };

  try {
    if (body.action === "archive") {
      if (typeof body.groupId !== "string" || typeof body.keeperId !== "string" ||
          !Array.isArray(body.duplicateIds) || !body.duplicateIds.every((id) => typeof id === "string")) {
        return NextResponse.json({ success: false, error: "INVALID_REQUEST", message: "Choose one record to keep and the duplicate records to archive." }, { status: 400 });
      }
      const result = await mutateDatabase((database) => archiveDuplicateGroup(
        database,
        body.groupId as string,
        body.keeperId as string,
        body.duplicateIds as string[]
      ));
      return NextResponse.json({ success: true, archivedCount: result.archived.length, keeper: result.keeper, entityType: result.entityType });
    }

    if (body.action === "restore") {
      if (!["meeting", "decision", "task"].includes(String(body.entityType)) ||
          !Array.isArray(body.recordIds) || !body.recordIds.every((id) => typeof id === "string")) {
        return NextResponse.json({ success: false, error: "INVALID_REQUEST", message: "Choose archived records to restore." }, { status: 400 });
      }
      const restoredCount = await mutateDatabase((database) => restoreDuplicateRecords(
        database,
        body.entityType as "meeting" | "decision" | "task",
        body.recordIds as string[]
      ));
      return NextResponse.json({ success: true, restoredCount });
    }

    return NextResponse.json({ success: false, error: "INVALID_REQUEST", message: "Choose an archive or restore action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Duplicate records could not be updated.";
    const conflictHistory = message.includes("conflict history");
    const changedGroup = message.includes("changed") || message.includes("could not be found") || message.includes("no longer archived");
    return NextResponse.json(
      { success: false, error: conflictHistory ? "CONFLICT_HISTORY" : changedGroup ? "REVIEW_CHANGED" : "CLEANUP_FAILED", message },
      { status: conflictHistory || changedGroup ? 409 : 400 }
    );
  }
}
