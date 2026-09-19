-- Migration: 20260918_hardening_staff_deletion_audit.sql
-- Hardening: Staff Deletion Auth Consistency
--
-- Problem:
--   The previous delete_staff_account() RPC:
--   1. Wrote an audit log with status = 'SUCCESS' BEFORE attempting deletions.
--   2. Silently swallowed auth.users deletion failure via EXCEPTION WHEN OTHERS THEN NULL.
--   3. Returned { success: true } unconditionally, even when auth.users was NOT deleted.
--   This could produce a false-success state: profile deleted but auth account orphaned
--   with no indication to the administrator.
--
-- Fix:
--   1. Delete from public.profiles first (authoritative app record).
--   2. Attempt auth.users deletion; capture outcome in v_auth_deleted boolean.
--   3. Write audit log AFTER both deletions with the real status:
--      - 'SUCCESS' if both deletions succeeded.
--      - 'PARTIAL' if profile deleted but auth account could not be removed.
--   4. Return auth_deleted in the JSONB result so the server action can surface
--      an accurate message / warning to the administrator.
--
-- Safety:
--   - All other guards unchanged: is_admin(), self-deletion block, safety check.
--   - Historical business records are never touched.
--   - No service-role credentials required or exposed.
--   - SECURITY DEFINER SET search_path = public preserved.

BEGIN;

CREATE OR REPLACE FUNCTION public.delete_staff_account(p_staff_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_safety        jsonb;
  v_staff_name    text;
  v_staff_role    text;
  v_auth_deleted  boolean := false;
  v_audit_status  text;
  v_result_msg    text;
BEGIN
  -- Guard: only admin may call this function
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can delete staff accounts';
  END IF;

  -- Guard: prevent self-deletion
  IF p_staff_id = auth.uid() THEN
    RAISE EXCEPTION 'Administrators cannot delete their own active account';
  END IF;

  -- Fetch target staff details
  SELECT full_name, role::text
  INTO   v_staff_name, v_staff_role
  FROM   public.profiles
  WHERE  id = p_staff_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff account not found';
  END IF;

  -- Safety check: block deletion when historical references exist
  v_safety := public.check_staff_deletion_safety(p_staff_id);
  IF NOT (v_safety->>'safe')::boolean THEN
    RAISE EXCEPTION
      'Cannot delete staff account: account is referenced by historical records (% refs). Deactivate instead.',
      (v_safety->>'total_references');
  END IF;

  -- Step 1: Delete the application profile record (authoritative row)
  DELETE FROM public.profiles WHERE id = p_staff_id;

  -- Step 2: Attempt auth.users deletion; capture outcome without aborting
  BEGIN
    DELETE FROM auth.users WHERE id = p_staff_id;
    v_auth_deleted := true;
  EXCEPTION WHEN OTHERS THEN
    -- auth.users is not accessible at this privilege level (expected on hosted Supabase
    -- when not using service role). Profile has already been removed; record the partial state.
    v_auth_deleted := false;
  END;

  -- Determine audit outcome and user-facing message from actual deletion results
  IF v_auth_deleted THEN
    v_audit_status := 'SUCCESS';
    v_result_msg   := 'Staff account for ' || coalesce(v_staff_name, 'Unknown')
                      || ' permanently and fully deleted.';
  ELSE
    v_audit_status := 'PARTIAL';
    v_result_msg   := 'Staff profile for ' || coalesce(v_staff_name, 'Unknown')
                      || ' has been removed from the system. The underlying authentication'
                      || ' account could not be deleted automatically (requires service role).'
                      || ' Please remove it via the Supabase Authentication dashboard to'
                      || ' prevent an orphaned login credential.';
  END IF;

  -- Step 3: Write audit log AFTER deletions with the real outcome
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
    auth.uid(),
    'admin',
    'STAFF_DELETED',
    'STAFF',
    p_staff_id::text,
    'Permanently deleted staff account: '
      || coalesce(v_staff_name, 'Unknown')
      || ' (' || coalesce(v_staff_role, 'No role') || ')',
    'CRITICAL',
    v_audit_status,
    jsonb_build_object(
      'id',        p_staff_id,
      'full_name', v_staff_name,
      'role',      v_staff_role
    ),
    jsonb_build_object(
      'profile_deleted', true,
      'auth_deleted',    v_auth_deleted
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'success',      true,
    'auth_deleted', v_auth_deleted,
    'message',      v_result_msg
  );
END;
$$;

-- Preserve execute grant for authenticated role (unchanged from previous migration)
GRANT EXECUTE ON FUNCTION public.delete_staff_account(uuid) TO authenticated;

COMMIT;
