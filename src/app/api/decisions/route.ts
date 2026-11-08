import { NextRequest, NextResponse } from "next/server";
import { getAllDecisions, updateDecisionStatus } from "@/lib/db/repository";
import { DecisionStatus } from "@/types";
import { authenticateApiRequest, enforceRateLimit, readJsonBody } from "@/lib/apiSecurity";

export async function GET(req: NextRequest) {
  const denied = authenticateApiRequest(req);
  if (denied) return denied;
  const limited = await enforceRateLimit(req, "decisions-read", 120, 60_000);
  if (limited) return limited;
  try {
    const decisions = await getAllDecisions();
    return NextResponse.json({ success: true, decisions });
  } catch (error: any) {
    console.error("[api/decisions] Failed to load decisions:", error);
    return NextResponse.json(
      { success: false, error: "FETCH_FAILED", message: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const denied = authenticateApiRequest(req, { mutation: true });
  if (denied) return denied;
  const limited = await enforceRateLimit(req, "decisions-write", 60, 60_000);
  if (limited) return limited;
  try {
    const parsed = await readJsonBody(req, 8 * 1024);
    if (parsed.response) return parsed.response;
    const body = parsed.body;
    const { id, status, resolutionNotes } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "INVALID_REQUEST", message: "Decision ID is required." },
        { status: 400 }
      );
    }

    const validStatuses: DecisionStatus[] = [
      "Active",
      "Superseded",
      "Under Review",
      "Conflict Flagged",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: "INVALID_STATUS", message: `Invalid status: ${status}` },
        { status: 400 }
      );
    }

    const updatedDecision = await updateDecisionStatus(id, status, resolutionNotes);
    return NextResponse.json({ success: true, decision: updatedDecision });
  } catch (error: any) {
    console.error("[api/decisions] Failed to update decision:", error);
    return NextResponse.json(
      { success: false, error: "UPDATE_FAILED", message: error.message },
      { status: 500 }
    );
  }
}

