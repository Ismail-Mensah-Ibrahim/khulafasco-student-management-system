import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: string;
  bg?: string;
  prefix?: string;
  suffix?: string;
  trend?: { value: number; label?: string };
  className?: string;
}

/**
 * Reusable stat/metric card for dashboards.
 */
export function StatCard({
  label,
  value,
  icon,
  color = "var(--brand-primary)",
  bg = "var(--brand-accent)",
  prefix,
  suffix,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn("rounded-xl p-4 flex min-h-[132px] flex-col justify-between gap-3", className)}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
          {label}
        </span>
        {icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: bg }}
          >
            <span style={{ color }}>{icon}</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-2xl md:text-3xl font-black tabular-nums leading-none"
          style={{ color: "var(--foreground)" }}>
          {prefix}<span>{value}</span>{suffix}
        </p>

        {trend && (
          <p className="text-xs mt-1"
            style={{ color: trend.value >= 0 ? "var(--success)" : "var(--danger)" }}>
            {trend.value >= 0 ? "+" : ""}{trend.value}%
            {trend.label && <span style={{ color: "var(--muted-foreground)" }}> {trend.label}</span>}
          </p>
        )}
      </div>
    </div>
  );
}
