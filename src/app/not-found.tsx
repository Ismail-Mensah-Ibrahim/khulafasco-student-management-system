import type { Metadata } from "next";
import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";
import { SCHOOL } from "@/config/branding";

export const metadata: Metadata = {
  title: `Page Not Found | ${SCHOOL.shortName}`,
};

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--background)" }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
          style={{ background: "var(--brand-accent)" }}
        >
          <Compass className="w-10 h-10" style={{ color: "var(--brand-primary)" }} />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--muted-foreground)" }}>
            404 Error
          </p>
          <h1
            className="mt-3 text-3xl font-bold"
            style={{ color: "var(--foreground)", fontFamily: "Georgia, serif" }}
          >
            Page Not Found
          </h1>
          <p className="mt-3 text-sm" style={{ color: "var(--muted-foreground)" }}>
            The page you requested does not exist or may have moved.
          </p>
        </div>

        <div
          className="rounded-xl p-4 text-sm text-left"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <p style={{ color: "var(--muted-foreground)" }}>
            Check the URL and try again, or return to the staff portal.
          </p>
        </div>

        <div className="flex justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: "var(--brand-primary)",
              color: "var(--brand-primary-foreground)",
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
