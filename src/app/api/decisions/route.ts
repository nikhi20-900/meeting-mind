import { NextRequest, NextResponse } from "next/server";
import { getAllDecisions, updateDecisionStatus } from "@/lib/db/repository";
import { DecisionStatus } from "@/types";

export async function GET() {
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
  try {
    const body = await req.json();
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

