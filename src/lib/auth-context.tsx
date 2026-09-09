/**
 * Auth context — provides the current session to Client Components
 * without requiring prop drilling through the entire component tree.
 *
 * Usage:
 *   Server layout passes session → AuthProvider → useAuth() in any client child
 */
"use client";

import { createContext, useContext } from "react";
import type { UserRole } from "@/config/constants";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
}

const AuthContext = createContext<AuthUser | null>(null);

export function AuthProvider({
  user,
  children,
}: {
  user: AuthUser;
  children: React.ReactNode;
}) {
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

/**
 * Access the authenticated user in any Client Component inside the dashboard layout.
 * Throws if called outside AuthProvider (programming error — not a runtime scenario).
 */
export function useAuth(): AuthUser {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider (dashboard layout)");
  }
  return ctx;
}

/**
 * Returns true if the current user has admin role.
 */
export function useIsAdmin(): boolean {
  const { role } = useAuth();
  return role === "admin";
}

/**
 * Returns true if the current user is a finance officer (or admin).
 */
export function useCanAccessFinance(): boolean {
  const { role } = useAuth();
  return role === "finance_officer" || role === "admin";
}
