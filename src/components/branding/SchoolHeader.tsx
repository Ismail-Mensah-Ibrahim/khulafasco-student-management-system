import { SchoolLogo } from "@/components/branding/SchoolLogo";
import { SCHOOL } from "@/config/branding";
import { cn } from "@/lib/utils";

interface SchoolHeaderProps {
  subtitle?: string;
  className?: string;
  /** compact: used in receipts. full: used in auth pages */
  variant?: "compact" | "full";
}

/**
 * Full school branding header — logo + full name + tagline.
 * Used in receipts and printable pages.
 */
export function SchoolHeader({
  subtitle,
  className,
  variant = "full",
}: SchoolHeaderProps) {
  return (
    <div className={cn("flex flex-col items-center text-center gap-3", className)}>
      <SchoolLogo size={variant === "compact" ? "md" : "lg"} />

      <div>
        <h1
          className={cn(
            "font-bold leading-tight",
            variant === "compact" ? "text-base" : "text-xl md:text-2xl"
          )}
          style={{ color: "var(--brand-primary)", fontFamily: "Georgia, serif" }}
        >
          {SCHOOL.name}
        </h1>

        {variant === "full" && (
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            &ldquo;{SCHOOL.motto}&rdquo;
          </p>
        )}

        {subtitle && (
          <p
            className={cn(
              "font-semibold mt-1",
              variant === "compact" ? "text-sm" : "text-base"
            )}
            style={{ color: "var(--brand-secondary-foreground)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
