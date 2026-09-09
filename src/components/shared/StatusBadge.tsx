import { cn } from "@/lib/utils";

type PaymentStatus = "not_set" | "unpaid" | "partially_paid" | "paid";

interface StatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  not_set: {
    label: "Amount Due Not Set",
    color: "var(--muted-foreground)",
    bg: "var(--muted)",
    dot: "var(--muted-foreground)",
  },
  unpaid: {
    label: "Unpaid",
    color: "var(--danger-foreground)",
    bg: "var(--danger-light)",
    dot: "var(--danger)",
  },
  partially_paid: {
    label: "Partially Paid",
    color: "var(--warning-foreground)",
    bg: "var(--warning-light)",
    dot: "var(--warning)",
  },
  paid: {
    label: "Paid",
    color: "var(--success-foreground)",
    bg: "var(--success-light)",
    dot: "var(--success)",
  },
};

/**
 * Payment status badge — do NOT use color alone as the only indicator.
 * Always shows a text label alongside the color dot for accessibility.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
        className
      )}
      style={{ background: config.bg, color: config.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: config.dot }}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}
