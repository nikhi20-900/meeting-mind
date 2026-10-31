import { NextRequest, NextResponse } from "next/server";
import { validateExtractionResult } from "@/lib/validateExtraction";
import { ExtractApiResponse } from "@/types/extraction";
import { saveExtractedMeetingData } from "@/lib/db/repository";
import {
  generateGeminiExtraction,
  parseGeminiError,
  sanitizeErrorMessage,
} from "@/lib/gemini";

const SYSTEM_PROMPT = `You are Meeting Mind's intelligent meeting extraction engine.
Your task is to analyze meeting recaps and transcripts, and extract:
1. A structured summary (headline, executive summary, 3-5 key takeaways, sentiment/tone, and primary focus).
2. Explicit and implicit consensus decisions (with decision text, rationale, category [one of: "Architecture", "Product", "Governance", "Client SLA", "Operations"], and speaker attribution).
3. Action items (with task title, owner name, owner role, deadline/due date, priority ["High", "Medium", "Low"], and speaker attribution).
4. Identified speakers and their key contributions.

You MUST respond strictly with valid JSON conforming to the following structure:
{
  "summary": {
    "headline": "Short punchy headline",
    "executiveSummary": "2-3 sentences summarizing core accomplishments and discussion",
    "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
    "sentimentOrTone": "e.g. Collaborative, decisive, urgent",
    "primaryFocus": "e.g. Infrastructure scaling and SLA compliance"
  },
  "decisions": [
    {
      "id": "dec-1",
      "decisionText": "Clear statement of what was decided",
      "rationale": "Why this was decided and supporting evidence",
      "category": "Architecture | Product | Governance | Client SLA | Operations",
      "speakerAttribution": "Who proposed or agreed to this decision (e.g. 'Proposed by Marcus Vance, confirmed by team')"
    }
  ],
  "actionItems": [
    {
      "id": "tsk-1",
      "title": "Specific actionable task",
      "ownerName": "Person assigned (extract from text or 'Unassigned')",
      "ownerRole": "Role of owner if mentioned or inferred (e.g. 'Infrastructure Lead')",
      "deadline": "Deadline mentioned in text (e.g. 'Nov 10, 2026' or 'Within 7 days')",
      "priority": "High | Medium | Low",
      "speakerAttribution": "Who agreed or assigned this task"
    }
  ],
  "speakers": [
    {
      "name": "Speaker Name",
      "role": "Role or title",
      "contributions": "Key topics or agreements contributed"
    }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      date,
      recapText,
      attendees,
      sessionApiKey,
      allowDemonstrationFallback,
    } = body;

    // Validate request inputs early before any server-side API processing
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json<ExtractApiResponse>(
        {
          success: false,
          error: "INVALID_REQUEST",
          message: "Meeting title is required.",
        },
        { status: 400 }
      );
    }

    if (!recapText || typeof recapText !== "string" || recapText.trim().length < 15) {
      return NextResponse.json<ExtractApiResponse>(
        {
          success: false,
          error: "INVALID_REQUEST",
          message: "Meeting recap text must be at least 15 characters long.",
        },
        { status: 400 }
      );
    }

    // 1. Read GEMINI_API_KEY from environment (.env.local) or session key
    // Securely kept server-side; NEVER exposed to the browser or logged.
    const resolvedKey =
      (typeof sessionApiKey === "string" && sessionApiKey.trim().length > 0
        ? sessionApiKey.trim()
        : null) ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    let rawJson: any = null;
    let providerUsed = "Google Gemini";
    let modelUsed = "gemini-2.5-flash";

    // 2. Clear error handling if GEMINI_API_KEY is missing
    if (!resolvedKey || resolvedKey.trim() === "") {
      if (allowDemonstrationFallback) {
        providerUsed = "Verified Pipeline Demo (Deterministic Fallback)";
        modelUsed = "gemini-flash-demonstration";
        rawJson = {
          summary: {
            headline: `${title} — Strategic Architecture & Decision Alignment`,
            executiveSummary: `Discussion focused on technical and policy commitments for ${title}. The team agreed on critical operational constraints and outlined actionable milestones with assigned owners.`,
            keyTakeaways: [
              "Formally locked in consensus commitments and operational guidelines.",
              "Flagged prospective cross-meeting policy clashes with existing SLA terms.",
              "Created human-governed action items awaiting explicit operator authorization."
            ],
            sentimentOrTone: "Decisive & structured",
            primaryFocus: "Cross-meeting consistency & task governance"
          },
          decisions: [
            {
              id: "dec-demo-1",
              decisionText: `Adopt standardized policy for ${title.slice(0, 50)} and cap client requests at 1,200 req/min during peak trading windows.`,
              rationale: "Ensures connection pool resilience and prevents cascade failovers across database replicas.",
              category: "Architecture",
              speakerAttribution: "Proposed by Marcus Vance, agreed by Sarah Chen"
            }
          ],
          actionItems: [
            {
              id: "tsk-demo-1",
              title: `Run latency benchmark under simulated load for ${title.slice(0, 40)}`,
              ownerName: "Marcus Vance",
              ownerRole: "Infrastructure Lead",
              deadline: "Nov 08, 2026",
              priority: "High",
              speakerAttribution: "Assigned during meeting discussion"
            },
            {
              id: "tsk-demo-2",
              title: `Verify policy compliance and rollback procedures for ${title.slice(0, 40)}`,
              ownerName: "Sarah Chen",
              ownerRole: "DevOps Engineer",
              deadline: "Nov 12, 2026",
              priority: "Medium",
              speakerAttribution: "Agreed by DevOps team"
            }
          ],
          speakers: [
            { name: "Marcus Vance", role: "Infrastructure Lead", contributions: "Technical architecture & rate limit specifications" },
            { name: "Sarah Chen", role: "DevOps Engineer", contributions: "Operational rollback & infrastructure compliance" },
            { name: "Alex Morgan", role: "Product Ops", contributions: "Facilitation & task confirmation governance" }
          ]
        };
      } else {
        return NextResponse.json<ExtractApiResponse>(
          {
            success: false,
            error: "MISSING_API_KEY",
            message:
              "Missing GEMINI_API_KEY. Please define GEMINI_API_KEY in your .env.local file or provide an active session API key to enable Gemini Flash extraction.",
            supportedProviders: ["GEMINI_API_KEY (.env.local)"],
          },
          { status: 400 }
        );
      }
    }

    const meetingDate = date || new Date().toISOString().split("T")[0];
    const userPrompt = `Meeting Title: ${title}
Meeting Date: ${meetingDate}
Participants / Attendees: ${attendees || "Not explicitly specified"}

Meeting Recap / Transcript:
"""
${recapText}
"""

Please extract structured summary, decisions, action items with owner and deadline, and speaker attributions strictly as specified in JSON format.`;

    // 3. Invoke currently supported Gemini Flash model via @google/genai SDK
    if (!rawJson && resolvedKey) {
      try {
        const extraction = await generateGeminiExtraction({
          apiKey: resolvedKey,
          systemPrompt: SYSTEM_PROMPT,
          userPrompt,
        });
        rawJson = extraction.rawJson;
        modelUsed = extraction.modelUsed;
      } catch (geminiError: any) {
        // Detailed error classification without printing or leaking keys
        const classified = geminiError.code ? geminiError : parseGeminiError(geminiError);

        return NextResponse.json<ExtractApiResponse>(
          {
            success: false,
            error: classified.code === "MISSING_KEY" ? "MISSING_API_KEY" : "LLM_API_ERROR",
            message: classified.message,
            details: sanitizeErrorMessage(classified.details || classified.message),
          },
          { status: classified.statusCode || 500 }
        );
      }
    }

    // 4. Validate and shape model output before saving
    const validatedResult = validateExtractionResult(rawJson, {
      title,
      meetingDate,
      provider: providerUsed,
      model: modelUsed,
    });

    // 5. Save to persistent database with conflict detection
    // Tasks are held as "Awaiting Approval" (NEVER confirmed automatically)
    const savedData = await saveExtractedMeetingData({
      title,
      meetingDate,
      recapText,
      attendees: attendees || "",
      extraction: validatedResult,
    });

    return NextResponse.json<ExtractApiResponse>({
      success: true,
      result: validatedResult,
      savedMeeting: savedData.meeting,
      savedDecisions: savedData.savedDecisions,
      savedTasks: savedData.savedTasks,
      detectedConflicts: savedData.detectedConflicts,
      isPersisted: true,
    });
  } catch (error: any) {
    const sanitizedMsg = sanitizeErrorMessage(error.message || "Failed to process meeting extraction.");
    console.error("[api/extract] Extraction failure:", sanitizedMsg);

    return NextResponse.json<ExtractApiResponse>(
      {
        success: false,
        error: "VALIDATION_FAILED",
        message: sanitizedMsg,
      },
      { status: 500 }
    );
  }
}
