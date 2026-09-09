import Image from "next/image";
import { SCHOOL } from "@/config/branding";
import { cn } from "@/lib/utils";

interface SchoolLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showName?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 32,
  md: 48,
  lg: 80,
  xl: 120,
};

/**
 * Official school logo component.
 * Use throughout the application at appropriate sizes.
 * Do not display raw <img> tags for the logo elsewhere.
 */
export function SchoolLogo({
  size = "md",
  showName = false,
  className,
}: SchoolLogoProps) {
  const px = sizeMap[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="flex-shrink-0 rounded-full overflow-hidden"
        style={{
          width: px,
          height: px,
          boxShadow: "0 2px 8px rgba(107, 26, 42, 0.2)",
        }}
      >
        <Image
          src={SCHOOL.logo}
          alt={`${SCHOOL.name} Logo`}
          width={px}
          height={px}
          className="object-cover w-full h-full"
          priority
        />
      </div>

      {showName && (
        <div>
          <p
            className="font-bold leading-tight"
            style={{
              color: "var(--brand-primary)",
              fontFamily: "Georgia, serif",
              fontSize: size === "sm" ? "0.75rem" : size === "md" ? "0.875rem" : "1rem",
            }}
          >
            {SCHOOL.shortName}
          </p>
          {size !== "sm" && (
            <p
              className="text-xs leading-tight"
              style={{ color: "var(--muted-foreground)" }}
            >
              {SCHOOL.abbreviation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
