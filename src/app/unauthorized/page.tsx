import type { Metadata } from "next";
import Link from "next/link";
import { ShieldX, ArrowLeft } from "lucide-react";
import { SCHOOL } from "@/config/branding";
import { SchoolLogo } from "@/components/branding/SchoolLogo";
import { LogoutButton } from "@/components/auth/LogoutButton";
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
  const homeHref = "/dashboard";

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6"
      style={{ background: "var(--background)" }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        {/* Brand crest */}
        <div className="flex justify-center">
          <SchoolLogo size="md" />
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-6 sm:p-8 space-y-5"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ background: "var(--danger-light)" }}
          >
            <ShieldX className="w-8 h-8" style={{ color: "var(--danger)" }} />
          </div>

          {/* Heading */}
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--foreground)", fontFamily: "Georgia, serif" }}
            >
              Restricted Access
            </h1>
            <p className="mt-2 text-xs sm:text-sm" style={{ color: "var(--muted-foreground)" }}>
              You do not have permission to view or manage this section of the {SCHOOL.shortName} portal.
            </p>
          </div>

          {/* Details */}
          <div
            className="rounded-xl p-3.5 text-xs text-left"
            style={{
              background: "var(--muted)",
              border: "1px solid var(--border)",
            }}
          >
            <p style={{ color: "var(--muted-foreground)" }}>
              If you require access to this module, please contact your system administrator.
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

          {/* Actions */}
          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              href={homeHref}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: "var(--brand-primary)",
                color: "var(--brand-primary-foreground)",
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </Link>
            <div className="pt-1">
              <LogoutButton />
            </div>
          </div>
        </div>

        {/* School footer */}
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {SCHOOL.name}
        </p>
      </div>
    </div>
  );
}
