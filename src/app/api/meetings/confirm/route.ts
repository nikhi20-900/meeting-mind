import { NextRequest, NextResponse } from "next/server";
import { saveExtractedMeetingData } from "@/lib/db/repository";
import { validateExtractionResult } from "@/lib/validateExtraction";
import { ExtractApiResponse } from "@/types/extraction";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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

    const meetingDate =
      typeof date === "string" && date ? date : new Date().toISOString().slice(0, 10);
    const result = validateExtractionResult(extraction, {
      title: title.trim(),
      meetingDate,
      provider: typeof extraction.metadata?.provider === "string" ? extraction.metadata.provider : "Google Gemini",
      model: typeof extraction.metadata?.model === "string" ? extraction.metadata.model : "unknown",
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
