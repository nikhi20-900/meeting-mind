import { NextRequest, NextResponse } from "next/server";
import { getAllTasks, updateTaskStatus } from "@/lib/db/repository";
import { TaskStatus } from "@/types";
import { authenticateApiRequest, enforceRateLimit, readJsonBody } from "@/lib/apiSecurity";

export async function GET(req: NextRequest) {
  const denied = authenticateApiRequest(req);
  if (denied) return denied;
  const limited = await enforceRateLimit(req, "tasks-read", 120, 60_000);
  if (limited) return limited;
  try {
    const tasks = await getAllTasks();
    return NextResponse.json({ success: true, tasks });
  } catch (error: any) {
    console.error("[api/tasks] Failed to load tasks:", error);
    return NextResponse.json(
      { success: false, error: "FETCH_FAILED", message: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const denied = authenticateApiRequest(req, { mutation: true });
  if (denied) return denied;
  const limited = await enforceRateLimit(req, "tasks-write", 60, 60_000);
  if (limited) return limited;
  try {
    const parsed = await readJsonBody(req, 8 * 1024);
    if (parsed.response) return parsed.response;
    const body = parsed.body;
    const { id, status } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "INVALID_REQUEST", message: "Task ID is required." },
        { status: 400 }
      );
    }

    const validStatuses: TaskStatus[] = [
      "Awaiting Approval",
      "Confirmed",
      "In Progress",
      "Completed",
      "Rejected",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: "INVALID_STATUS", message: `Invalid status: ${status}` },
        { status: 400 }
      );
    }

    const updatedTask = await updateTaskStatus(id, status);
    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: any) {
    console.error("[api/tasks] Failed to update task:", error);
    return NextResponse.json(
      { success: false, error: "UPDATE_FAILED", message: error.message },
      { status: error.message?.includes("Resolve the linked decision conflict") ? 409 : 500 }
    );
  }
}

