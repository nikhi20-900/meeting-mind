import { Suspense } from "react";
import MeetingDetailPageClient from "@/components/meetings/MeetingDetailPageClient";

// The root layout checks workspace access before rendering protected page content.
export const instant = false;

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-40 rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600">Opening meeting…</div>}>
      <MeetingDetailPageClient params={params} />
    </Suspense>
  );
}
