import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
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
    <div>
      {/* Header */}
      <div className="mb-6 text-center">
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--brand-primary)", fontFamily: "Georgia, serif" }}
        >
          Staff Sign In
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          Enter your credentials to access the system
        </p>
      </div>

      <LoginForm />
    </div>
  );
}
