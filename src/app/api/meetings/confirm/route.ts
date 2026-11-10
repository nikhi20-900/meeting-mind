import { NextRequest, NextResponse } from "next/server";
import { saveExtractedMeetingData } from "@/lib/db/repository";
import { validateExtractionResult } from "@/lib/validateExtraction";
import { ExtractApiResponse } from "@/types/extraction";
import { authenticateApiRequest, enforceRateLimit, readJsonBody } from "@/lib/apiSecurity";

export async function POST(req: NextRequest) {
  const denied = authenticateApiRequest(req, { mutation: true });
  if (denied) return denied;
  const limited = await enforceRateLimit(req, "meeting-confirm", 40, 60_000);
  if (limited) return limited;
  const parsed = await readJsonBody(req, 512 * 1024);
  if (parsed.response) return parsed.response;

  try {
    const body = parsed.body;
    const { title, date, recapText, attendees, extraction } = body;

    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "INVALID_REQUEST", message: "Meeting title is required." },
        { status: 400 }
      );
    }
    if (typeof recapText !== "string" || recapText.trim().length < 15) {
      return NextResponse.json(
        { success: false, error: "INVALID_REQUEST", message: "Meeting recap is required." },
        { status: 400 }
      );
    }
    if (!extraction || typeof extraction !== "object") {
      return NextResponse.json(
        { success: false, error: "INVALID_REQUEST", message: "Reviewed meeting details are required." },
        { status: 400 }
      );
    }

    const meetingDate = typeof date === "string" && date.trim() ? date.trim() : "Unknown";
    const result = validateExtractionResult(extraction, {
      title: title.trim(),
      meetingDate,
      provider: typeof extraction.metadata?.provider === "string" ? extraction.metadata.provider : "Unknown",
      model: typeof extraction.metadata?.model === "string" ? extraction.metadata.model : "unknown",
      recapText,
    });

    const savedData = await saveExtractedMeetingData({
      title: title.trim(),
      meetingDate,
      recapText: recapText.trim(),
      attendees: typeof attendees === "string" ? attendees : "",
      extraction: result,
    });

    return NextResponse.json<ExtractApiResponse>({
      success: true,
      result,
      savedMeeting: savedData.meeting,
      savedDecisions: savedData.savedDecisions,
      savedTasks: savedData.savedTasks,
      detectedConflicts: savedData.detectedConflicts,
      isPersisted: true,
    });
  } catch (error: any) {
    console.error("[api/meetings/confirm] Failed to save reviewed meeting:", error);
    return NextResponse.json(
      { success: false, error: "VALIDATION_FAILED", message: error.message || "Could not save this meeting." },
      { status: 500 }
    );
  }
}
