import { NextResponse } from "next/server";
import { getDashboardOverview } from "@/lib/db/repository";

export async function GET() {
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

