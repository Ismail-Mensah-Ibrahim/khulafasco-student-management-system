import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles email verification tokens from Supabase Auth emails
 * (signup confirmation, email change, staff invitations, recovery).
 *
 * After successful verification:
 * 1. Records an audit log entry for the confirmation event.
 * 2. Signs out any temporary session to require the user to log in explicitly.
 * 3. Redirects to the login page (/login?verified=true) with a branded confirmation banner.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();

  // 1. Handle token_hash verification (standard Supabase OTP link)
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error && data?.user) {
      // Audit log the confirmation
      try {
        await supabase.rpc("create_system_audit_log", {
          p_user_id: data.user.id,
          p_actor_role: data.user.user_metadata?.role || "staff",
          p_action: "EMAIL_CONFIRMED",
          p_module: "AUTH",
          p_entity_type: "auth",
          p_entity_id: data.user.id,
          p_target_identifier: data.user.email,
          p_description: `User ${data.user.email} confirmed their email address via OTP link`,
          p_severity: "INFO",
          p_status: "SUCCESS",
          p_metadata: { type, email: data.user.email },
        });
      } catch (logErr) {
        console.error("Audit log error on email confirmation:", logErr);
      }

      // Explicitly sign out so user logs in cleanly with their credentials
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?verified=true", request.url));
    }
  }

  // 2. Handle PKCE authorization code exchange (if code is provided)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      try {
        await supabase.rpc("create_system_audit_log", {
          p_user_id: data.user.id,
          p_actor_role: data.user.user_metadata?.role || "staff",
          p_action: "EMAIL_CONFIRMED",
          p_module: "AUTH",
          p_entity_type: "auth",
          p_entity_id: data.user.id,
          p_target_identifier: data.user.email,
          p_description: `User ${data.user.email} verified their account via auth code exchange`,
          p_severity: "INFO",
          p_status: "SUCCESS",
          p_metadata: { email: data.user.email },
        });
      } catch (logErr) {
        console.error("Audit log error on code exchange:", logErr);
      }

      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?verified=true", request.url));
    }
  }

  // 3. If token invalid or expired, redirect with error banner
  return NextResponse.redirect(new URL("/login?error=verification_failed", request.url));
}
