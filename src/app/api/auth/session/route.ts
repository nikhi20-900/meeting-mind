import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceSessionState } from "@/lib/apiSecurity";

export async function GET(request: NextRequest) {
  const state = getWorkspaceSessionState(request);
  if (state.configurationError) return state.configurationError;
  return NextResponse.json(
    { success: true, authenticated: state.authenticated, protected: state.protected, role: state.role },
    { headers: { "Cache-Control": "no-store" } }
  );
}
