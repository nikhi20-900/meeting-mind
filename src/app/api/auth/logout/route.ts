import { NextRequest, NextResponse } from "next/server";
import { clearWorkspaceSession, isSameOrigin } from "@/lib/apiSecurity";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ success: false, error: "INVALID_ORIGIN" }, { status: 403 });
  }
  const response = NextResponse.json({ success: true });
  clearWorkspaceSession(response);
  return response;
}
