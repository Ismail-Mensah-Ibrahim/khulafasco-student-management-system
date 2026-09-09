"use client";

import { useState } from "react";

/**
 * Login form — Client Component.
 * Auth logic (Supabase signInWithPassword) will be wired in Milestone 2.
 */
export function LoginForm() {
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const focusStyle = (field: string) =>
    focusedField === field
      ? {
          borderColor: "var(--brand-primary)",
          boxShadow: "0 0 0 3px rgba(107,26,42,0.1)",
          outline: "none",
        }
      : { outline: "none" };

  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      {/* Email */}
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="w-full px-3 py-2.5 rounded-lg text-sm transition-all"
          style={{
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--foreground)",
            ...focusStyle("email"),
          }}
          onFocus={() => setFocusedField("email")}
          onBlur={() => setFocusedField(null)}
        />
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="w-full px-3 py-2.5 rounded-lg text-sm transition-all"
          style={{
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--foreground)",
            ...focusStyle("password"),
          }}
          onFocus={() => setFocusedField("password")}
          onBlur={() => setFocusedField(null)}
        />
      </div>

      {/* Role notice */}
      <div
        className="rounded-lg px-3 py-2.5 text-xs"
        style={{
          background: "var(--brand-accent)",
          color: "var(--brand-accent-foreground)",
          border: "1px solid var(--brand-secondary-light)",
        }}
      >
        <strong>Admin</strong> and <strong>Finance Officer</strong> accounts are
        managed by the system administrator.
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all"
        style={{
          background: "var(--brand-primary)",
          color: "var(--brand-primary-foreground)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            "var(--brand-primary-dark)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            "var(--brand-primary)";
        }}
      >
        Sign In
      </button>

      <p
        className="text-center text-xs pt-1"
        style={{ color: "var(--muted-foreground)" }}
      >
        Authorized staff only. Unauthorized access is prohibited.
      </p>
    </form>
  );
}
