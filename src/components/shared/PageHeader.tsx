import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  className?: string;
}

/**
 * Consistent page header component.
 * Used at the top of every major page.
 */
export function PageHeader({
  title,
  description,
  action,
  breadcrumb,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1 md:flex-row md:items-center md:justify-between", className)}>
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="flex items-center gap-1 text-xs mb-1" aria-label="Breadcrumb">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && (
                  <span style={{ color: "var(--muted-foreground)" }}>/</span>
                )}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="hover:underline"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span style={{ color: "var(--brand-primary)", fontWeight: 500 }}>
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}

        <h1
          className="text-xl md:text-2xl font-bold truncate"
          style={{ color: "var(--foreground)", fontFamily: "Georgia, serif" }}
        >
          {title}
        </h1>

        {description && (
          <p className="text-sm mt-0.5 line-clamp-2" style={{ color: "var(--muted-foreground)" }}>
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="flex-shrink-0 mt-3 md:mt-0">{action}</div>
      )}
    </div>
  );
}
