import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, enforceRateLimit, readJsonBody } from "@/lib/apiSecurity";
import { resolveConflict } from "@/lib/db/repository";

export async function PATCH(request: NextRequest) {
  const denied = authenticateApiRequest(request, { mutation: true });
  if (denied) return denied;
  const limited = await enforceRateLimit(request, "conflicts-write", 40, 60_000);
  if (limited) return limited;

  const parsed = await readJsonBody(request, 8 * 1024);
  if (parsed.response) return parsed.response;
  const body = parsed.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ success: false, error: "INVALID_REQUEST", message: "A conflict resolution is required." }, { status: 400 });
  }

  const { id, earlierDecisionStatus, resolutionNotes } = body;
  if (typeof id !== "string" || !id.trim()) {
    return NextResponse.json({ success: false, error: "INVALID_REQUEST", message: "Conflict ID is required." }, { status: 400 });
  }
  if (!["Active", "Under Review", "Superseded"].includes(earlierDecisionStatus)) {
    return NextResponse.json({ success: false, error: "INVALID_STATUS", message: "Choose a valid status for the earlier decision." }, { status: 400 });
  }
  if (typeof resolutionNotes !== "string" || resolutionNotes.trim().length < 1 || resolutionNotes.length > 1000) {
    return NextResponse.json({ success: false, error: "INVALID_RESOLUTION_NOTE", message: "A short resolution note is required." }, { status: 400 });
  }

  try {
    const result = await resolveConflict(id, earlierDecisionStatus, resolutionNotes.trim());
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the conflict resolution.";
    const status = message.includes("not found") ? 404 : message.includes("already been resolved") ? 409 : 500;
    return NextResponse.json({ success: false, error: "RESOLUTION_FAILED", message }, { status });
  }
}
