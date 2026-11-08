import { NextRequest, NextResponse } from "next/server";
import { getDashboardOverview } from "@/lib/db/repository";
import { authenticateApiRequest, enforceRateLimit } from "@/lib/apiSecurity";

export async function GET(req: NextRequest) {
  const denied = authenticateApiRequest(req);
  if (denied) return denied;
  const limited = await enforceRateLimit(req, "dashboard-read", 120, 60_000);
  if (limited) return limited;
  try {
    const data = await getDashboardOverview();
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    console.error("[api/dashboard] Failed to load dashboard data:", error);
    return NextResponse.json(
      { success: false, error: "FETCH_FAILED", message: error.message },
      { status: 500 }
    );
  }
}

