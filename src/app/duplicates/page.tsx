import DuplicateReviewPageClient from "@/components/duplicates/DuplicateReviewPageClient";

// The root layout checks workspace access before rendering protected page content.
export const instant = false;

export default function DuplicateReviewPage() {
  return <DuplicateReviewPageClient />;
}
