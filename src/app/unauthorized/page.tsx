import type { Metadata } from "next";
import Link from "next/link";
import { ShieldX, ArrowLeft } from "lucide-react";
import { SCHOOL } from "@/config/branding";
import { getOptionalSession } from "@/lib/dal";

export const metadata: Metadata = {
  title: `Access Denied | ${SCHOOL.shortName}`,
};

/**
 * Unauthorized page — shown when an authenticated user attempts to access
 * a route they do not have permission for.
 *
 * Does NOT expose why access was denied or what the restricted content is.
 */
export default async function UnauthorizedPage() {
  const session = await getOptionalSession();

  const homeHref = session?.role === "admin" ? "/dashboard" : "/dashboard";

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--background)" }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
          style={{ background: "var(--danger-light)" }}
        >
          <ShieldX className="w-10 h-10" style={{ color: "var(--danger)" }} />
        </div>

        {/* Heading */}
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--foreground)", fontFamily: "Georgia, serif" }}
          >
            Access Denied
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
            You do not have permission to access this area of the{" "}
            <strong>{SCHOOL.shortName}</strong> management system.
          </p>
        </div>

        {/* Details */}
        <div
          className="rounded-xl p-4 text-sm text-left"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <p style={{ color: "var(--muted-foreground)" }}>
            If you believe this is an error, please contact your system
            administrator. Do not attempt to bypass this restriction.
          </p>
          {session && (
            <p className="mt-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
              Signed in as:{" "}
              <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                {session.fullName}
              </span>{" "}
              ({session.role === "admin" ? "Administrator" : "Finance Officer"})
            </p>
          )}
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={homeHref}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: "var(--brand-primary)",
              color: "var(--brand-primary-foreground)",
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </Link>
        </div>

        {/* School footer */}
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {SCHOOL.name}
        </p>
      </div>
    </div>
  );
}
