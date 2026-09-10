import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({ title, description, action, className }: ErrorStateProps) {
  return (
    <div
      className={cn("rounded-xl border p-6 text-center", className)}
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "var(--brand-accent)" }}>
        <AlertTriangle className="h-7 w-7" style={{ color: "var(--brand-primary)" }} />
      </div>
      <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
        {title}
      </h3>
      {description && (
        <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
