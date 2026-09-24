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
import { hasRole, type UserRole, type HouseResponsibility } from "@/config/constants";
import type { Profile } from "@/types";

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  additionalRoles: UserRole[];
  fullName: string;
  houseId?: string | null;
  houseResponsibility?: HouseResponsibility | null;
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

  // Fetch the staff profile to get the application role and house affiliation
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, additional_roles, full_name, is_active, house_id, house_responsibility")
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
    additionalRoles: (profile.additional_roles ?? []) as UserRole[],
    fullName: profile.full_name,
    houseId: (profile as { house_id?: string | null }).house_id ?? null,
    houseResponsibility: (profile as { house_responsibility?: HouseResponsibility | null }).house_responsibility ?? null,
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
      .select("role, additional_roles, full_name, is_active, house_id, house_responsibility")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.is_active) return null;

    return {
      id: user.id,
      email: user.email ?? "",
      role: profile.role as UserRole,
      additionalRoles: (profile.additional_roles ?? []) as UserRole[],
      fullName: profile.full_name,
      houseId: (profile as { house_id?: string | null }).house_id ?? null,
      houseResponsibility: (profile as { house_responsibility?: HouseResponsibility | null }).house_responsibility ?? null,
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
  if (!allowedRoles.some((role) => hasRole(session.role, session.additionalRoles, role))) {
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
  return requireRole(["academic_head", "assistant_headmaster", "headmaster", "admin"]);
}

/**
 * Verify session AND require Teacher role.
 */
export async function requireTeacher(): Promise<SessionUser> {
  return requireRole(["teacher", "academic_head", "assistant_headmaster", "admin"]);
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
 * Verify session AND require House Master, House Mistress, Senior House staff, or Admin.
 */
export async function requireHouseStaff(): Promise<SessionUser> {
  const session = await verifySession();
  const isAllowed =
    hasRole(session.role, session.additionalRoles, "admin") ||
    hasRole(session.role, session.additionalRoles, "house_master") ||
    hasRole(session.role, session.additionalRoles, "house_mistress") ||
    session.houseResponsibility === "house_master" ||
    session.houseResponsibility === "house_mistress" ||
    session.houseResponsibility === "senior_house_master" ||
    session.houseResponsibility === "senior_house_mistress";

  if (!isAllowed) {
    redirect("/unauthorized");
  }
  return session;
}

/**
 * Verify session AND require Senior House Master, Senior House Mistress, or Admin.
 */
export async function requireSeniorHouseStaff(): Promise<SessionUser> {
  const session = await verifySession();
  const isAllowed =
    hasRole(session.role, session.additionalRoles, "admin") ||
    session.houseResponsibility === "senior_house_master" ||
    session.houseResponsibility === "senior_house_mistress";

  if (!isAllowed) {
    redirect("/unauthorized");
  }
  return session;
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
  return requireRole(["academic_head", "assistant_headmaster", "admin"]);
}

/**
 * Verify session AND require Headmaster or Admin (request reviewers).
 */
export async function requireReviewer(): Promise<SessionUser> {
  return requireRole(["headmaster", "assistant_headmaster", "admin"]);
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
