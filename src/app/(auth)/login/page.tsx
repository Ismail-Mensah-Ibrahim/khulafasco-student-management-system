import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { ShieldCheck } from "lucide-react";
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
      {/* Card Header */}
      <div className="text-center mb-6">
        <div
          className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
          style={{
            background: "var(--brand-accent)",
            color: "var(--brand-primary)",
          }}
        >
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2
          className="text-xl font-bold tracking-tight"
          style={{ color: "var(--foreground)", fontFamily: "Georgia, serif" }}
        >
          Staff Sign In
        </h2>
        <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
          Enter your authorized credentials to access the portal
        </p>
      </div>

      <LoginForm />
    </div>
  );
}
