import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { SchoolLogo } from "@/components/branding/SchoolLogo";
import { LoginForm } from "./_components/LoginForm";

export const metadata: Metadata = {
  title: `Sign In | ${SCHOOL.shortName}`,
};

/**
 * Login page — Server Component for metadata.
 * Interactive form is in LoginForm (Client Component).
 */
export default function LoginPage() {
  return (
    <div className="w-full">
      {/* Brand header */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <SchoolLogo size="lg" />
        <div className="text-center">
          <h1
            className="text-lg font-bold leading-tight"
            style={{ color: "var(--brand-primary)", fontFamily: "Georgia, serif" }}
          >
            {SCHOOL.name}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Staff Management Portal
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        <span className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--muted-foreground)" }}>
          Sign In
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>

      <LoginForm />
    </div>
  );
}
