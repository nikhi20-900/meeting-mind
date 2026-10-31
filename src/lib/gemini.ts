import { GoogleGenAI } from "@google/genai";

export type GeminiErrorCode =
  | "MISSING_KEY"
  | "INVALID_KEY"
  | "RATE_LIMIT_EXCEEDED"
  | "API_FAILURE"
  | "INVALID_OUTPUT";

export interface GeminiExtractionError {
  code: GeminiErrorCode;
  message: string;
  statusCode: number;
  details?: string;
}

/**
 * Safely strips any potential API keys from error strings or URLs to prevent leaking.
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return "";
  return message
    .replace(/key=[A-Za-z0-9._-]+/gi, "key=REDACTED")
    .replace(/AIza[0-9A-Za-z-_]{35}/g, "REDACTED_API_KEY")
    .replace(/AQ\.[0-9A-Za-z-_]{30,}/g, "REDACTED_AUTH_KEY")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer REDACTED");
}

function safeJsonParse(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```$/, "").trim();
  }
  return JSON.parse(cleaned);
}

export function parseGeminiError(err: any): GeminiExtractionError {
  const rawMsg = err?.message || String(err || "Unknown Gemini API error");
  const sanitized = sanitizeErrorMessage(rawMsg);
  const status = err?.status || err?.statusCode || 500;

  // 1. Invalid Key
  if (
    sanitized.includes("API_KEY_INVALID") ||
    sanitized.includes("API key not valid") ||
    sanitized.includes("invalid API key") ||
    sanitized.includes("PERMISSION_DENIED") ||
    status === 401 ||
    status === 403
  ) {
    return {
      code: "INVALID_KEY",
      message:
        "The configured Gemini API key is invalid or unauthorized. Please verify the GEMINI_API_KEY value in your .env.local file.",
      statusCode: 401,
      details: sanitized,
    };
  }

  // 2. Rate Limits / Quota Exceeded
  if (
    sanitized.includes("RESOURCE_EXHAUSTED") ||
    sanitized.includes("quota") ||
    sanitized.includes("rate limit") ||
    status === 429
  ) {
    return {
      code: "RATE_LIMIT_EXCEEDED",
      message:
        "Gemini API rate limit or quota exceeded. Please wait a moment before sending another recap or check your Google AI Studio quota.",
      statusCode: 429,
      details: sanitized,
    };
  }

  // 3. General API Failure / Service Unavailable
  return {
    code: "API_FAILURE",
    message: `Gemini API service request failed: ${sanitized.slice(0, 200)}`,
    statusCode: status >= 400 && status < 600 ? status : 502,
    details: sanitized,
  };
}

/**
 * Executes structured extraction using Google's currently supported Gemini Flash model.
 * Never prints or leaks the API key to logs or clients.
 */
export async function generateGeminiExtraction(params: {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<{ rawJson: any; modelUsed: string }> {
  const { apiKey, systemPrompt, userPrompt } = params;

  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    throw {
      code: "MISSING_KEY",
      message:
        "No Gemini API key detected. Please define GEMINI_API_KEY in your .env.local file.",
      statusCode: 400,
    };
  }

  const trimmedKey = apiKey.trim();

  // Candidate models: Gemini 3.5 Flash Lite (ultra fast, high availability) and Gemini 3.8 Flash (active standard)
  const candidateModels = [
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
  ];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const ai = new GoogleGenAI({ apiKey: trimmedKey });
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${systemPrompt}\n\n${userPrompt}`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const responseText = response.text?.trim();

      if (!responseText) {
        throw new Error("Empty text returned from Gemini Flash model.");
      }

      const rawJson = safeJsonParse(responseText);
      return { rawJson, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      const parsed = parseGeminiError(err);
      console.warn(
        `[Gemini Extraction] Attempt with model '${model}' failed: ${sanitizeErrorMessage(err?.message || String(err))}`
      );
      // If it's an invalid key or rate limit, fail fast rather than retrying candidate model
      if (parsed.code === "INVALID_KEY" || parsed.code === "RATE_LIMIT_EXCEEDED") {
        throw parsed;
      }
    }
  }

  // If all candidate models failed, throw parsed error
  throw parseGeminiError(lastError);
}

