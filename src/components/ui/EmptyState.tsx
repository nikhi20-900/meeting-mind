import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-2xl border border-dashed border-stone-200 bg-[#FCFBF8]">
      <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-orange-600 mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-stone-900">{title}</h3>
      <p className="text-sm text-stone-500 max-w-sm mt-1 mb-5">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          type="button"
          className="inline-flex items-center px-4 py-2 text-xs sm:text-sm font-medium rounded-lg text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

