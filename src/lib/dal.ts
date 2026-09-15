/**
 * Data Access Layer (DAL) — server-only session and profile helpers.
 *
 * Always call verifySession() inside Server Components and Server Actions
 * to get the authenticated user. Never rely on client-side role checks
 * as the security boundary.
 */
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/config/constants";
import type { Profile } from "@/types";

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
}

/**
 * Verify the current session and return the authenticated user.
 * Redirects to /login if no valid session exists.
 * Cached per-request using React cache() to avoid duplicate DB calls.
 */
export const verifySession = cache(async (): Promise<SessionUser> => {
  const supabase = await createClient();

  // getUser() validates the JWT with Supabase Auth server — more secure than getSession()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Fetch the staff profile to get the application role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    // Profile missing — sign out and redirect
    await supabase.auth.signOut();
    redirect("/login");
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login?error=account_disabled");
  }

  return {
    id: user.id,
    email: user.email ?? "",
    role: profile.role as UserRole,
    fullName: profile.full_name,
  };
});

/**
 * Get the current session user without redirecting.
 * Returns null if not authenticated. Use for conditional rendering.
 */
export const getOptionalSession = cache(async (): Promise<SessionUser | null> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, is_active")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.is_active) return null;

    return {
      id: user.id,
      email: user.email ?? "",
      role: profile.role as UserRole,
      fullName: profile.full_name,
    };
  } catch {
    return null;
  }
});

/**
 * Verify session AND require one of the specified roles.
 * Redirects to /unauthorized if role not in allowed list.
 */
export async function requireRole(allowedRoles: readonly UserRole[]): Promise<SessionUser> {
  const session = await verifySession();
  if (!allowedRoles.includes(session.role)) {
    redirect("/unauthorized");
  }
  return session;
}

/**
 * Verify session AND require admin role.
 */
export async function requireAdmin(): Promise<SessionUser> {
  return requireRole(["admin"]);
}

/**
 * Verify session AND require IT officer role.
 */
export async function requireITOfficer(): Promise<SessionUser> {
  return requireRole(["it_officer", "admin"]);
}

/**
 * Verify session AND require Headmaster role.
 */
export async function requireHeadmaster(): Promise<SessionUser> {
  return requireRole(["headmaster", "admin"]);
}

/**
 * Verify session AND require Academic Head role.
 */
export async function requireAcademicHead(): Promise<SessionUser> {
  return requireRole(["academic_head", "admin"]);
}

/**
 * Verify session AND require Teacher role.
 */
export async function requireTeacher(): Promise<SessionUser> {
  return requireRole(["teacher", "academic_head", "admin"]);
}

/**
 * Verify session AND require Finance Officer role.
 */
export async function requireFinanceOfficer(): Promise<SessionUser> {
  return requireRole(["finance_officer", "admin"]);
}

/**
 * Verify session AND require Domestic/Logistics Officer role.
 */
export async function requireDomesticOfficer(): Promise<SessionUser> {
  return requireRole(["domestic_officer", "admin"]);
}

/**
 * Verify session for any authenticated staff member.
 */
export async function requireStaff(): Promise<SessionUser> {
  return verifySession();
}

/**
 * Verify session AND require finance_officer or admin role.
 */
export async function requireFinanceOrAdmin(): Promise<SessionUser> {
  return requireRole(["finance_officer", "admin"]);
}

/**
 * Verify session AND require academic_head or admin role.
 */
export async function requireAcademicOrAdmin(): Promise<SessionUser> {
  return requireRole(["academic_head", "admin"]);
}

/**
 * Verify session AND require Headmaster or Admin (request reviewers).
 */
export async function requireReviewer(): Promise<SessionUser> {
  return requireRole(["headmaster", "admin"]);
}

/**
 * Get the full staff profile for the current user.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data ?? null;
});
