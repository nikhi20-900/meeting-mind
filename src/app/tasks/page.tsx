import TaskTrackerPageClient from "@/components/tasks/TaskTrackerPageClient";

// The root layout checks workspace access before rendering protected page content.
// Opt this route out of instant-navigation validation because that gate delays it.
export const instant = false;

export default function TasksPage() {
  return <TaskTrackerPageClient />;
}
