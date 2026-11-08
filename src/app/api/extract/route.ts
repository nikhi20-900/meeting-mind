import { NextRequest, NextResponse } from "next/server";
import { validateExtractionResult } from "@/lib/validateExtraction";
import { ExtractApiResponse } from "@/types/extraction";
import { getAllDecisions } from "@/lib/db/repository";
import { detectConflicts } from "@/lib/conflictDetection";
import {
  generateGeminiExtraction,
  parseGeminiError,
  sanitizeErrorMessage,
} from "@/lib/gemini";
import { authenticateApiRequest, enforceRateLimit, readJsonBody } from "@/lib/apiSecurity";

const SYSTEM_PROMPT = `You are Meeting Mind's intelligent meeting extraction engine.
Your task is to analyze meeting recaps and transcripts, and extract:
1. A structured summary (headline, executive summary, key takeaways, sentiment/tone, and primary focus), using "Unknown" or an empty list when unsupported.
2. Explicit consensus decisions (with decision text, rationale, category [one of: "Architecture", "Product", "Governance", "Client SLA", "Operations", "Unknown"], speaker attribution, and confidenceScore from 0 to 1).
3. Explicit action items (with task title, owner name, owner role, deadline/due date, priority ["High", "Medium", "Low", "Unknown"], and speaker attribution).
4. Identified speakers and their key contributions.

Only report information supported by the recap. Do not infer or invent owners, roles, deadlines, priorities, rationales, speakers, or decisions. Use the exact string "Unknown" when a requested text field is not stated. Use an empty list when the recap does not support an item. Set decision confidenceScore below 0.75 when evidence is ambiguous; never use a default confidence.

You MUST respond strictly with valid JSON conforming to the following structure:
{
  "summary": {
    "headline": "A concise headline supported by the recap, or Unknown",
    "executiveSummary": "A concise summary supported by the recap, or Unknown",
    "keyTakeaways": [],
    "sentimentOrTone": "A tone supported by the recap, or Unknown",
    "primaryFocus": "A focus supported by the recap, or Unknown"
  },
  "decisions": [
    {
      "id": "dec-1",
      "decisionText": "Clear statement of what was decided",
      "rationale": "Why this was decided and supporting evidence",
      "category": "Architecture | Product | Governance | Client SLA | Operations | Unknown",
      "speakerAttribution": "Who proposed or agreed to this decision, or Unknown",
      "confidenceScore": 0.0
    }
  ],
  "actionItems": [
    {
      "id": "tsk-1",
      "title": "Specific actionable task",
      "ownerName": "Person explicitly assigned, or Unknown",
      "ownerRole": "Role explicitly stated, or Unknown",
      "deadline": "Deadline stated in the recap, or Unknown",
      "priority": "High | Medium | Low | Unknown",
      "speakerAttribution": "Who explicitly agreed or assigned this task, or Unknown"
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
  const denied = authenticateApiRequest(req, { mutation: true });
  if (denied) return denied;
  const minuteLimit = await enforceRateLimit(req, "extract-minute", 10, 60_000);
  if (minuteLimit) return minuteLimit;
  const dailyLimit = await enforceRateLimit(req, "extract-daily", 200, 24 * 60 * 60 * 1000);
  if (dailyLimit) return dailyLimit;
  const parsed = await readJsonBody(req, 256 * 1024);
  if (parsed.response) return parsed.response;

  try {
    const body = parsed.body;
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

    const meetingDate = typeof date === "string" && date.trim() ? date.trim() : "Unknown";
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

    // Preview conflicts without writing anything. The user reviews these results before save.
    const historicalDecisions = await getAllDecisions();
    const detectedConflicts = await detectConflicts(
      validatedResult.decisions,
      historicalDecisions,
      title
    );

    return NextResponse.json<ExtractApiResponse>({
      success: true,
      result: validatedResult,
      detectedConflicts,
      isPersisted: false,
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
