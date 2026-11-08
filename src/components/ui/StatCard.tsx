import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  badge?: string;
  badgeVariant?: "neutral" | "orange" | "warning" | "alert";
  icon: LucideIcon;
  trend?: string;
}

export function StatCard({
  label,
  value,
  subtext,
  badge,
  badgeVariant = "neutral",
  icon: Icon,
  trend,
}: StatCardProps) {
  const badgeColors = {
    neutral: "bg-stone-100 text-stone-700 border-stone-200",
    orange: "bg-orange-50 text-orange-800 border-orange-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    alert: "bg-rose-50 text-rose-800 border-rose-200",
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-stone-300 transition-all duration-150">
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm font-medium text-stone-600">{label}</span>
        <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] border border-stone-200/80 flex items-center justify-center text-stone-700">
          <Icon className="w-4 h-4 text-orange-600" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900">{value}</span>
        {trend && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-md border ${
              trend.startsWith("-")
                ? "text-rose-700 bg-rose-50 border-rose-200/60"
                : trend.startsWith("+")
                ? "text-emerald-700 bg-emerald-50 border-emerald-200/60"
                : "text-stone-600 bg-stone-100 border-stone-200"
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-stone-500 pt-3 border-t border-stone-100">
        <span className="truncate">{subtext}</span>
        {badge && (
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border shrink-0 ${badgeColors[badgeVariant]}`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

