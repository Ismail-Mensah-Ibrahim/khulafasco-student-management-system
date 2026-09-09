"use client";

import { useActionState, useEffect, useRef } from "react";
import { loginAction, type LoginState } from "@/lib/actions/auth";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";

/**
 * Production login form.
 * Uses React's useActionState to wire to the loginAction Server Action.
 * All credential handling happens server-side.
 */
export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    undefined
  );
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // Focus email field on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const hasError = state && "error" in state;
  const generalError = hasError && state.field === "general" ? state.error : null;
  const emailError = hasError && state.field === "email" ? state.error : null;
  const passwordError = hasError && state.field === "password" ? state.error : null;

  return (
    <form action={action} className="space-y-5" noValidate>
      {/* General error banner */}
      {generalError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg px-4 py-3 text-sm"
          style={{
            background: "var(--danger-light)",
            border: "1px solid var(--danger)",
            color: "var(--danger-foreground)",
          }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

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
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          placeholder="staff@khulafasco.edu.gh"
          aria-describedby={emailError ? "email-error" : undefined}
          aria-invalid={emailError ? "true" : undefined}
          className="w-full px-3 py-2.5 rounded-lg text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            border: `1px solid ${emailError ? "var(--danger)" : "var(--border)"}`,
            background: "var(--surface)",
            color: "var(--foreground)",
            outline: "none",
          }}
          onFocus={(e) => {
            if (!emailError) {
              e.target.style.borderColor = "var(--brand-primary)";
              e.target.style.boxShadow = "0 0 0 3px rgba(107,26,42,0.1)";
            }
          }}
          onBlur={(e) => {
            if (!emailError) {
              e.target.style.borderColor = "var(--border)";
              e.target.style.boxShadow = "none";
            }
          }}
        />
        {emailError && (
          <p id="email-error" className="text-xs" style={{ color: "var(--danger)" }}>
            {emailError}
          </p>
        )}
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
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            disabled={pending}
            placeholder="••••••••"
            aria-describedby={passwordError ? "password-error" : undefined}
            aria-invalid={passwordError ? "true" : undefined}
            className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              border: `1px solid ${passwordError ? "var(--danger)" : "var(--border)"}`,
              background: "var(--surface)",
              color: "var(--foreground)",
              outline: "none",
            }}
            onFocus={(e) => {
              if (!passwordError) {
                e.target.style.borderColor = "var(--brand-primary)";
                e.target.style.boxShadow = "0 0 0 3px rgba(107,26,42,0.1)";
              }
            }}
            onBlur={(e) => {
              if (!passwordError) {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "none";
              }
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded"
            style={{ color: "var(--muted-foreground)" }}
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {passwordError && (
          <p id="password-error" className="text-xs" style={{ color: "var(--danger)" }}>
            {passwordError}
          </p>
        )}
      </div>

      {/* Info notice */}
      <div
        className="rounded-lg px-3 py-2.5 text-xs"
        style={{
          background: "var(--brand-accent)",
          color: "var(--brand-accent-foreground)",
          border: "1px solid var(--brand-secondary-light)",
        }}
      >
        Authorized staff only. Accounts are managed by the administrator.
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        style={{
          background: pending ? "var(--brand-primary-light)" : "var(--brand-primary)",
          color: "var(--brand-primary-foreground)",
        }}
      >
        {pending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign In"
        )}
      </button>

      <p
        className="text-center text-xs"
        style={{ color: "var(--muted-foreground)" }}
      >
        Unauthorized access is prohibited and will be logged.
      </p>
    </form>
  );
}
