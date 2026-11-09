import DashboardPageClient from "@/components/dashboard/DashboardPageClient";

// The root layout checks workspace access before rendering protected page content.
// Opt this route out of instant-navigation validation because that gate delays it.
export const instant = false;

export default function DashboardPage() {
  return <DashboardPageClient />;
}
