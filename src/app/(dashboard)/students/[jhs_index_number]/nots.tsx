import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { SCHOOL } from "@/config/branding";

export const metadata: Metadata = {
  title: `Student Not Found | ${SCHOOL.shortName}`,
};

export default function StudentNotFoundPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-6 text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--brand-accent)" }}>
          <AlertTriangle className="h-8 w-8" style={{ color: "var(--brand-primary)" }} />
        </div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)", fontFamily: "Georgia, serif" }}>
          Student not found
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
          The student record you requested could not be found.
        </p>
        <div className="mt-5 flex justify-center">
          <Link
            href="/students"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold"
            style={{ background: "var(--brand-primary)", color: "var(--brand-primary-foreground)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to students
          </Link>
        </div>
      </div>
    </div>
  );
}
