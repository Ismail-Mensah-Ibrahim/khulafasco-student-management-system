-- Migration: 20260919_staff_deletion_architecture_redesign.sql
-- Staff Deletion Architecture Redesign
--
-- Problem with previous architecture (20260918):
--   The deletion flow was:
--     1. RPC deletes public.profiles
--     2. RPC attempts DELETE FROM auth.users (may fail silently)
--     3. RPC reports PARTIAL if auth deletion failed
--
--   This cannot guarantee atomicity: the profile is already gone before knowing
--   whether the auth account can be removed. An orphaned auth account is possible
--   whenever the RPC lacks auth.users DELETE privilege.
--
-- Redesigned architecture (server-action-owns-deletion):
--
--   The server action (safeDeleteStaffAction) now drives the full operation:
--
--     A. Verify business safety (check_staff_deletion_safety RPC) — unchanged.
--     B. Verify SUPABASE_SERVICE_ROLE_KEY is configured (createAdminClient != null).
--        If missing → BLOCKED. Nothing deleted. Audit FAILED attempt.
--     C. Delete auth.users via supabase.auth.admin.deleteUser() (Admin API).
--        If fails → FAILED. Nothing deleted. Audit FAILED attempt.
--     D. Call finalize_staff_deletion RPC to delete public.profiles + write audit.
--        Auth is already gone at this point.
--     E. Return SUCCESS only after both C and D succeed.
--
--   Guarantee: public.profiles is NEVER deleted unless auth.users deletion
--   succeeded first. No orphaned auth account is possible.
--
-- New RPCs:
--   finalize_staff_deletion  — deletes profile + writes SUCCESS audit (post-auth-deletion)
--   audit_failed_deletion_attempt — writes FAILED audit, touches nothing else
--   delete_staff_account     — retired stub, raises exception for any direct caller

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. finalize_staff_deletion
--    Called ONLY after the server action has successfully deleted auth.users.
--    Deletes public.profiles and writes the canonical audit event.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_staff_deletion(
  p_staff_id    uuid,
  p_actor_id    uuid,
  p_actor_role  text,
  p_staff_name  text,
  p_staff_role  text,
  p_status      text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_deleted boolean := false;
BEGIN
  -- Guard: only admin or service_role may finalize deletions
  IF NOT (
    public.is_admin()
    OR coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    OR coalesce(current_setting('role', true), '') = 'service_role'
  ) THEN
    RAISE EXCEPTION 'Only administrators can finalize staff account deletion';
  END IF;

  -- Delete the application profile (auth account already removed by server action)
  DELETE FROM public.profiles WHERE id = p_staff_id;
  v_profile_deleted := FOUND;

  -- Write authoritative audit log
  INSERT INTO public.audit_logs (
    user_id,
    actor_role,
    action,
    module,
    target_identifier,
    description,
    severity,
    status,
    before_data,
    metadata,
    created_at
  ) VALUES (
    p_actor_id,
    p_actor_role,
    'STAFF_DELETED',
    'STAFF',
    p_staff_id::text,
    'Permanently deleted staff account: '
      || coalesce(p_staff_name, 'Unknown')
      || ' (' || coalesce(p_staff_role, 'No role') || ')',
    'CRITICAL',
    p_status,
    jsonb_build_object(
      'id',        p_staff_id,
      'full_name', p_staff_name,
      'role',      p_staff_role
    ),
    jsonb_build_object(
      'auth_deleted',    true,
      'profile_deleted', v_profile_deleted
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'success',         true,
    'profile_deleted', v_profile_deleted,
    'message',
      'Staff account for ' || coalesce(p_staff_name, 'Unknown')
        || ' permanently and fully deleted.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_staff_deletion(uuid, uuid, text, text, text, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. audit_failed_deletion_attempt
--    Called when the server action cannot complete the full deletion
--    (service role key not configured, Admin API error, etc.).
--    Leaves all data intact. Only writes the blocked-attempt audit trail.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_failed_deletion_attempt(
  p_staff_id    uuid,
  p_actor_id    uuid,
  p_actor_role  text,
  p_staff_name  text,
  p_staff_role  text,
  p_reason      text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_admin()
    OR coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    OR coalesce(current_setting('role', true), '') = 'service_role'
  ) THEN
    RAISE EXCEPTION 'Only administrators can record deletion attempts';
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    actor_role,
    action,
    module,
    target_identifier,
    description,
    severity,
    status,
    metadata,
    created_at
  ) VALUES (
    p_actor_id,
    p_actor_role,
    'STAFF_DELETION_BLOCKED',
    'STAFF',
    p_staff_id::text,
    'Permanent deletion blocked for: '
      || coalesce(p_staff_name, 'Unknown')
      || ' (' || coalesce(p_staff_role, 'No role') || '). Reason: ' || p_reason,
    'CRITICAL',
    'FAILED',
    jsonb_build_object(
      'reason',          p_reason,
      'staff_id',        p_staff_id,
      'staff_name',      p_staff_name,
      'auth_deleted',    false,
      'profile_deleted', false
    ),
    NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.audit_failed_deletion_attempt(uuid, uuid, text, text, text, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Retire delete_staff_account
--    Replace with a stub that immediately raises an exception so any direct
--    caller gets a clear error rather than silently executing old logic.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_staff_account(p_staff_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION
    'delete_staff_account() is retired as of migration 20260919. '
    'Staff deletion is now performed via the application server action '
    'using the Supabase Admin API with a service-role client. '
    'Contact your system administrator if you see this message directly.';
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_staff_account(uuid) TO authenticated;

COMMIT;
