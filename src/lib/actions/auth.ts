"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export type LoginState =
  | { error: string; field?: "email" | "password" | "general" }
  | { success: true }
  | undefined;

// ---------------------------------------------------------------------------
// Login Server Action
// ---------------------------------------------------------------------------

/**
 * Handles staff login via Supabase Auth.
 * Called from the LoginForm client component via useActionState.
 * Runs server-side only — credentials never touch client code.
 */
export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  // 1. Parse and validate form fields
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = LoginSchema.safeParse(raw);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const field = firstIssue.path[0] as "email" | "password" | undefined;
    return {
      error: firstIssue.message,
      field: field ?? "general",
    };
  }

  // 2. Authenticate with Supabase Auth
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Record audit log for failed login attempt
    try {
      await supabase.rpc("create_system_audit_log", {
        p_user_id: null,
        p_actor_role: null,
        p_action: "LOGIN_FAILED",
        p_module: "AUTH",
        p_entity_type: "auth",
        p_entity_id: null,
        p_target_identifier: parsed.data.email,
        p_description: `Failed login attempt for ${parsed.data.email}: ${error.message}`,
        p_severity: "WARNING",
        p_status: "FAILED",
        p_metadata: { email: parsed.data.email, error: error.message },
      });
    } catch (logErr) {
      console.error("Audit log error on failed login:", logErr);
    }

    // Return user-friendly messages — do not expose internal Supabase error codes
    if (error.message.toLowerCase().includes("invalid login credentials")) {
      return { error: "Invalid email or password. Please try again.", field: "general" };
    }
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { error: "Please verify your email address before signing in.", field: "general" };
    }
    return { error: "Sign in failed. Please try again.", field: "general" };
  }

  // 3. Verify the profile exists and is active
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication failed. Please try again.", field: "general" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active, role, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile) {
    try {
      await supabase.rpc("create_system_audit_log", {
        p_user_id: user.id,
        p_actor_role: null,
        p_action: "LOGIN_BLOCKED",
        p_module: "AUTH",
        p_entity_type: "auth",
        p_entity_id: user.id,
        p_target_identifier: user.email,
        p_description: `Login blocked for ${user.email}: Profile record missing`,
        p_severity: "SECURITY",
        p_status: "DENIED",
      });
    } catch (logErr) {
      console.error("Audit log error on blocked login:", logErr);
    }

    await supabase.auth.signOut();
    return {
      error: "Your account is not set up. Please contact the administrator.",
      field: "general",
    };
  }

  if (!profile.is_active) {
    try {
      await supabase.rpc("create_system_audit_log", {
        p_user_id: user.id,
        p_actor_role: profile.role,
        p_action: "LOGIN_BLOCKED",
        p_module: "AUTH",
        p_entity_type: "auth",
        p_entity_id: user.id,
        p_target_identifier: user.email,
        p_description: `Login blocked for disabled staff account: ${user.email}`,
        p_severity: "SECURITY",
        p_status: "DENIED",
      });
    } catch (logErr) {
      console.error("Audit log error on disabled account login:", logErr);
    }

    await supabase.auth.signOut();
    return {
      error: "Your account has been disabled. Please contact the administrator.",
      field: "general",
    };
  }

  // Log successful login in audit trail
  try {
    await supabase.rpc("create_system_audit_log", {
      p_user_id: user.id,
      p_actor_role: profile.role,
      p_action: "LOGIN_SUCCESS",
      p_module: "AUTH",
      p_entity_type: "auth",
      p_entity_id: user.id,
      p_target_identifier: user.email,
      p_description: `${profile.full_name || user.email} signed into Khulafasco SMS`,
      p_severity: "INFO",
      p_status: "SUCCESS",
      p_metadata: { role: profile.role, email: user.email },
    });
  } catch (logErr) {
    console.error("Audit log error on successful login:", logErr);
  }

  // 4. Success — redirect by role to the correct operational dashboard
  switch (profile.role) {
    case "house_master":
    case "house_mistress":
      redirect("/house/dashboard");
    case "it_officer":
      redirect("/it/dashboard");
    case "headmaster":
      redirect("/headmaster/dashboard");
    case "academic_head":
      redirect("/academic/dashboard");
    case "teacher":
      redirect("/teacher/dashboard");
    case "finance_officer":
      redirect("/finance");
    case "domestic_officer":
      redirect("/operations/dashboard");
    case "general_staff":
      redirect("/staff/dashboard");
    case "admin":
    default:
      redirect("/dashboard");
  }
}

// ---------------------------------------------------------------------------
// Logout Server Action
// ---------------------------------------------------------------------------

/**
 * Signs out the current user and redirects to /login.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

      await supabase.rpc("create_system_audit_log", {
        p_user_id: user.id,
        p_actor_role: profile?.role || "staff",
        p_action: "LOGOUT",
        p_module: "AUTH",
        p_entity_type: "auth",
        p_entity_id: user.id,
        p_target_identifier: user.email,
        p_description: `${profile?.full_name || user.email} signed out of Khulafasco SMS`,
        p_severity: "INFO",
        p_status: "SUCCESS",
      });
    }
  } catch (logErr) {
    console.error("Audit log error on logout:", logErr);
  }

  await supabase.auth.signOut();
  redirect("/login");
}
