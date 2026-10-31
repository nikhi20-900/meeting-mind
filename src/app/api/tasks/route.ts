import { NextRequest, NextResponse } from "next/server";
import { getAllTasks, updateTaskStatus } from "@/lib/db/repository";
import { TaskStatus } from "@/types";

export async function GET() {
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
  try {
    const body = await req.json();
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
      { status: 500 }
    );
  }
}

