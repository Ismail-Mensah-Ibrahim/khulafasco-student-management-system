"use client";

import { useState } from "react";

interface StudentAvatarProps {
  jhsIndexNumber: string;
  firstName: string;
  lastName: string;
  photoPath?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
  xl: "w-14 h-14 text-base",
};

/**
 * Robust student avatar component.
 * If photo_path is available and loads successfully, displays the photo portrait.
 * If the image is absent or fails to load, gracefully displays high-contrast styled initials.
 * Never renders broken image borders or naked alt-text in UI tables.
 */
export function StudentAvatar({
  jhsIndexNumber,
  firstName,
  lastName,
  photoPath,
  size = "md",
  className = "",
}: StudentAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const initialFirst = firstName?.trim()?.[0]?.toUpperCase() || "";
  const initialLast = lastName?.trim()?.[0]?.toUpperCase() || "";
  const initials = `${initialFirst}${initialLast}` || "?";

  const photoUrl =
    photoPath && !hasError
      ? photoPath.startsWith("data:")
        ? photoPath
        : `/api/student-photo/${encodeURIComponent(jhsIndexNumber)}`
      : null;

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <div
      className={`relative inline-flex flex-shrink-0 items-center justify-center rounded-full overflow-hidden border border-border/70 select-none ${sizeClass} ${className}`}
      style={{
        background: "var(--brand-accent)",
        color: "var(--brand-primary)",
      }}
    >
      {photoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={photoUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <span className="font-bold uppercase tracking-wider">{initials}</span>
      )}
    </div>
  );
}
