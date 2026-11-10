import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, enforceRateLimit } from "@/lib/apiSecurity";
import { getMeetingDetail } from "@/lib/db/repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = authenticateApiRequest(request);
  if (denied) return denied;
  const limited = await enforceRateLimit(request, "meeting-detail-read", 120, 60_000);
  if (limited) return limited;

  try {
    const { id } = await params;
    if (!id || id.length > 128) {
      return NextResponse.json({ success: false, error: "INVALID_MEETING_ID", message: "A valid meeting ID is required." }, { status: 400 });
    }
    const detail = await getMeetingDetail(id);
    if (!detail) {
      return NextResponse.json({ success: false, error: "MEETING_NOT_FOUND", message: "This meeting could not be found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...detail });
  } catch (error) {
    console.error("[api/meetings/[id]] Failed to load meeting details:", error);
    return NextResponse.json(
      { success: false, error: "FETCH_FAILED", message: "Meeting details could not be loaded." },
      { status: 500 }
    );
  }
}
