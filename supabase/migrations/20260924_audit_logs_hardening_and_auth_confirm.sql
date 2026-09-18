-- ==============================================================================
-- Migration: 20260924_audit_logs_hardening_and_auth_confirm.sql
-- Description: 
--   1. Adds email column to public.profiles and backfills from auth.users.
--   2. Adds foreign key constraint audit_logs_user_id_fkey referencing profiles(id).
--   3. Explicitly GRANTS table permissions on audit_logs to authenticated & service_role.
--   4. Adds trigger on profiles to keep email synced with auth.users.
--   5. Adds trigger to auto-confirm admin email accounts so admins never get blocked.
--   6. Adds SECURITY DEFINER function create_system_audit_log for guaranteed audit delivery.
-- ==============================================================================

-- 1. Profiles email column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email <> u.email);

-- 2. Audit logs foreign key
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- 3. Explicit table-level privileges for PostgreSQL PostgREST API
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- 4. Sync profile email trigger on auth.users changes
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email,
      updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_profile_email ON auth.users;
CREATE TRIGGER trigger_sync_profile_email
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_email();

-- 5. Admin auto-confirm trigger so admins never get blocked by unconfirmed email
CREATE OR REPLACE FUNCTION public.handle_admin_auto_confirm()
RETURNS trigger AS $$
BEGIN
  IF (NEW.raw_user_meta_data->>'role' = 'admin' OR NEW.email LIKE 'admin@%') AND NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_admin_auto_confirm ON auth.users;
CREATE TRIGGER trigger_admin_auto_confirm
BEFORE INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_admin_auto_confirm();

-- 6. Helper RPC for writing audit logs from any context with guaranteed execution
CREATE OR REPLACE FUNCTION public.create_system_audit_log(
  p_user_id uuid,
  p_actor_role text,
  p_action text,
  p_module text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_target_identifier text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_severity text DEFAULT 'INFO',
  p_status text DEFAULT 'SUCCESS',
  p_metadata jsonb DEFAULT NULL,
  p_before_data jsonb DEFAULT NULL,
  p_after_data jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    actor_role,
    action,
    module,
    entity_type,
    entity_id,
    target_identifier,
    description,
    severity,
    status,
    metadata,
    before_data,
    after_data,
    created_at
  ) VALUES (
    p_user_id,
    p_actor_role,
    p_action,
    p_module,
    p_entity_type,
    p_entity_id,
    p_target_identifier,
    p_description,
    p_severity,
    p_status,
    p_metadata,
    p_before_data,
    p_after_data,
    NOW()
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_system_audit_log TO authenticated, service_role, anon;
