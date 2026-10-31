import { NextRequest, NextResponse } from "next/server";
import { getAllDecisions } from "@/lib/db/repository";

export async function GET() {
  try {
    const decisions = await getAllDecisions();
    return NextResponse.json({ success: true, decisions });
  } catch (error: any) {
    console.error("[api/decisions] Failed to load decisions:", error);
    return NextResponse.json(
      { success: false, error: "FETCH_FAILED", message: error.message },
      { status: 500 }
    );
  }
}

