import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Branded empty state component — used when lists or searches return no results.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl",
        className
      )}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      {icon && (
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ background: "var(--brand-accent)" }}
        >
          <span style={{ color: "var(--brand-primary)" }}>{icon}</span>
        </div>
      )}

      <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
        {title}
      </h3>

      {description && (
        <p className="text-sm mt-1 max-w-xs" style={{ color: "var(--muted-foreground)" }}>
          {description}
        </p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
