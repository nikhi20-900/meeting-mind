import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/db/store";

export const SESSION_COOKIE = "meeting_mind_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;
export type WorkspaceRole = "editor" | "viewer";

function accessKey(): string | undefined {
  return process.env.MEETING_MIND_ACCESS_KEY?.trim() || undefined;
}

function sessionSecret(): string | undefined {
  return process.env.MEETING_MIND_SESSION_SECRET?.trim() || undefined;
}

export function isWorkspaceProtectionEnabled(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(accessKey());
}

function configError(): NextResponse | null {
  if (!isWorkspaceProtectionEnabled()) return null;
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
    return NextResponse.json(
      { success: false, error: "DATABASE_NOT_CONFIGURED", message: "Production storage is not configured." },
      { status: 503 }
    );
  }
  const viewerKey = process.env.MEETING_MIND_VIEW_KEY?.trim();
  if (
    !accessKey() || accessKey()!.length < 32 ||
    !sessionSecret() || sessionSecret()!.length < 32 ||
    (viewerKey && viewerKey.length < 32)
  ) {
    return NextResponse.json(
      { success: false, error: "AUTH_NOT_CONFIGURED", message: "Workspace access is not configured." },
      { status: 503 }
    );
  }
  return null;
}

function secureEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function signExpiry(expiry: string, role: WorkspaceRole): string {
  return createHmac("sha256", sessionSecret() || "")
    .update(`meeting-mind:${role}:${expiry}`)
    .digest("base64url");
}

function getSessionRole(request: NextRequest): WorkspaceRole | null {
  const value = request.cookies.get(SESSION_COOKIE)?.value;
  if (!value || !sessionSecret()) return null;
  const [role, expiry, signature, extra] = value.split(".");
  if ((role !== "editor" && role !== "viewer") || !expiry || !signature || extra || !/^\d+$/.test(expiry)) return null;
  if (Number(expiry) <= Math.floor(Date.now() / 1000)) return null;
  return secureEqual(signature, signExpiry(expiry, role)) ? role : null;
}

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

export function authenticateApiRequest(
  request: NextRequest,
  options: { mutation?: boolean } = {}
): NextResponse | null {
  const configurationError = configError();
  if (configurationError) return configurationError;
  if (!isWorkspaceProtectionEnabled()) return null;

  const role = getSessionRole(request);
  if (!role) {
    return NextResponse.json(
      { success: false, error: "UNAUTHENTICATED", message: "Sign in to this workspace to continue." },
      { status: 401 }
    );
  }

  if (options.mutation && role !== "editor") {
    return NextResponse.json(
      { success: false, error: "INSUFFICIENT_PERMISSION", message: "This workspace key only allows viewing." },
      { status: 403 }
    );
  }

  if (options.mutation && !isSameOrigin(request)) {
    return NextResponse.json(
      { success: false, error: "INVALID_ORIGIN", message: "This request must come from this workspace." },
      { status: 403 }
    );
  }

  return null;
}

export function getWorkspaceSessionState(request: NextRequest): {
  authenticated: boolean;
  protected: boolean;
  role: WorkspaceRole | null;
  configurationError: NextResponse | null;
} {
  const error = configError();
  const protectedWorkspace = isWorkspaceProtectionEnabled();
  const role = getSessionRole(request);
  return {
    authenticated: !error && (!protectedWorkspace || role !== null),
    protected: protectedWorkspace,
    role,
    configurationError: error,
  };
}

export function verifyWorkspaceKey(candidate: unknown): WorkspaceRole | null {
  if (typeof candidate !== "string") return null;
  const editorKey = accessKey();
  if (editorKey && secureEqual(candidate, editorKey)) return "editor";
  const viewerKey = process.env.MEETING_MIND_VIEW_KEY?.trim();
  if (viewerKey && secureEqual(candidate, viewerKey)) return "viewer";
  return null;
}

export function setWorkspaceSession(response: NextResponse, role: WorkspaceRole): void {
  const expiry = String(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS);
  response.cookies.set(SESSION_COOKIE, `${role}.${expiry}.${signExpiry(expiry, role)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearWorkspaceSession(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export async function readJsonBody(
  request: NextRequest,
  maxBytes: number
): Promise<{ body?: any; response?: NextResponse }> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { response: bodyTooLarge(maxBytes) };
  }

  if (!request.body) {
    return { response: NextResponse.json({ success: false, error: "INVALID_JSON", message: "A JSON request body is required." }, { status: 400 }) };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { response: bodyTooLarge(maxBytes) };
      }
      chunks.push(value);
    }
  } catch {
    return { response: NextResponse.json({ success: false, error: "INVALID_JSON", message: "Could not read the request body." }, { status: 400 }) };
  }

  try {
    const content = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      content.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { body: JSON.parse(new TextDecoder().decode(content)) };
  } catch {
    return { response: NextResponse.json({ success: false, error: "INVALID_JSON", message: "Request body must be valid JSON." }, { status: 400 }) };
  }
}

function bodyTooLarge(maxBytes: number): NextResponse {
  return NextResponse.json(
    { success: false, error: "REQUEST_TOO_LARGE", message: `Request body must be smaller than ${Math.ceil(maxBytes / 1024)} KB.` },
    { status: 413 }
  );
}

function requesterKey(request: NextRequest): string {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = cookie || forwarded || request.headers.get("x-real-ip") || "unknown-client";
  return createHash("sha256").update(address).digest("hex").slice(0, 32);
}

export async function enforceRateLimit(
  request: NextRequest,
  bucket: string,
  limit: number,
  windowMs: number
): Promise<NextResponse | null> {
  const key = `api:${requesterKey(request)}:${bucket}`;
  try {
    const result = await consumeRateLimit(key, limit, windowMs);
    if (result.allowed) return null;
    return NextResponse.json(
      { success: false, error: "RATE_LIMITED", message: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
    );
  } catch (error) {
    console.error("[api/security] Rate limiter unavailable:", error);
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { success: false, error: "RATE_LIMIT_UNAVAILABLE", message: "Requests are temporarily unavailable." },
        { status: 503 }
      );
    }
    return null;
  }
}
