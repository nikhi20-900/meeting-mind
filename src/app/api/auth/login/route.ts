import { NextRequest, NextResponse } from "next/server";
import {
  getWorkspaceSessionState,
  setWorkspaceSession,
  verifyWorkspaceKey,
  readJsonBody,
  enforceRateLimit,
  isSameOrigin,
} from "@/lib/apiSecurity";

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "auth-login", 5, 15 * 60 * 1000);
  if (limited) return limited;

  if (!isSameOrigin(request)) {
    return NextResponse.json({ success: false, error: "INVALID_ORIGIN", message: "This request must come from this workspace." }, { status: 403 });
  }

  const state = getWorkspaceSessionState(request);
  if (state.configurationError) return state.configurationError;
  if (!state.protected) return NextResponse.json({ success: true, authenticated: true });

  const parsed = await readJsonBody(request, 2 * 1024);
  if (parsed.response) return parsed.response;
  const role = verifyWorkspaceKey(parsed.body?.accessKey);
  if (!role) {
    return NextResponse.json({ success: false, error: "INVALID_ACCESS_KEY", message: "That workspace key isn’t correct." }, { status: 401 });
  }

  const response = NextResponse.json({ success: true, authenticated: true });
  setWorkspaceSession(response, role);
  return response;
}
