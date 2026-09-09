import type { ReactNode } from "react";
import { SCHOOL } from "@/config/branding";
import { SchoolLogo } from "@/components/branding/SchoolLogo";

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Auth layout — centered card on a branded background.
 * Used by /login and any other unauthenticated pages.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{
        background: `linear-gradient(135deg, var(--brand-primary-dark) 0%, var(--brand-primary) 50%, var(--brand-primary-light) 100%)`,
      }}
    >
      {/* Decorative pattern overlay */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M30 0l30 30-30 30L0 30z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* School branding header */}
      <div className="relative z-10 mb-8 text-center">
        <SchoolLogo size="lg" className="mx-auto mb-4" />
        <h1
          className="text-2xl font-display font-bold text-white tracking-wide"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {SCHOOL.name}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--brand-secondary-light)" }}>
          Student Enrollment &amp; Fee Management System
        </p>
      </div>

      {/* Auth card */}
      <div className="relative z-10 w-full max-w-md">
        <div
          className="rounded-xl shadow-2xl p-8"
          style={{
            background: "var(--surface)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
          }}
        >
          {children}
        </div>
      </div>

      {/* Footer */}
      <p
        className="relative z-10 mt-8 text-xs opacity-70"
        style={{ color: "var(--brand-secondary-light)" }}
      >
        &ldquo;{SCHOOL.motto}&rdquo;
      </p>
    </div>
  );
}
