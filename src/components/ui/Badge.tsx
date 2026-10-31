import React from "react";

export type BadgeVariant =
  | "active"
  | "neutral"
  | "warning"
  | "conflict"
  | "orange"
  | "confirmed"
  | "high";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "neutral", className = "" }: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    active: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    confirmed: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    neutral: "bg-stone-100 text-stone-700 border-stone-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    conflict: "bg-rose-50 text-rose-800 border-rose-200",
    orange: "bg-orange-50 text-orange-800 border-orange-200",
    high: "bg-orange-50 text-orange-800 border-orange-200 font-medium",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

