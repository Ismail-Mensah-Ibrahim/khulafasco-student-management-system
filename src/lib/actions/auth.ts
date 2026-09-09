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
    .select("is_active, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    return {
      error: "Your account is not set up. Please contact the administrator.",
      field: "general",
    };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return {
      error: "Your account has been disabled. Please contact the administrator.",
      field: "general",
    };
  }

  // 4. Success — redirect to dashboard
  redirect("/dashboard");
}

// ---------------------------------------------------------------------------
// Logout Server Action
// ---------------------------------------------------------------------------

/**
 * Signs out the current user and redirects to /login.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
