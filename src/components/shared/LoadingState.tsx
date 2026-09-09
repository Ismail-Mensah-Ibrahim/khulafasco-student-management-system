import { cn } from "@/lib/utils";

interface LoadingStateProps {
  rows?: number;
  cols?: number;
  className?: string;
  variant?: "table" | "cards" | "detail";
}

/**
 * Skeleton loading states for common layouts.
 */
export function LoadingState({
  rows = 5,
  cols = 4,
  className,
  variant = "table",
}: LoadingStateProps) {
  if (variant === "cards") {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4 space-y-3"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex justify-between items-start">
              <div className="skeleton h-3 w-24 rounded" />
              <div className="skeleton h-8 w-8 rounded-lg" />
            </div>
            <div className="skeleton h-7 w-16 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-4 w-64 rounded" />
        <div className="grid grid-cols-2 gap-4 mt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="skeleton h-3 w-20 rounded" />
              <div className="skeleton h-5 w-full rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Table variant (default)
  return (
    <div
      className={cn("rounded-xl overflow-hidden", className)}
      style={{ border: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex gap-4"
        style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton h-3 flex-1 rounded" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="px-4 py-3 flex gap-4"
          style={{
            borderBottom: i < rows - 1 ? "1px solid var(--border)" : undefined,
            background: "var(--surface)",
          }}
        >
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="skeleton h-4 rounded"
              style={{ flex: j === 0 ? 1.5 : 1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
