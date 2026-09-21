-- ============================================================================
-- Khulafasco SMS: Restore missing security helper functions used by RLS and
-- server-side authorization checks across the application.
-- ============================================================================

-- Core role checks used by the app and by all earlier migrations.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text = 'admin'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_it_officer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text = 'it_officer'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_headmaster()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text = 'headmaster'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_academic_head()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text = 'academic_head'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text = 'teacher'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_finance_officer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text = 'finance_officer'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_domestic_officer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text = 'domestic_officer'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_general_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text = 'general_staff'
      AND is_active = true
  );
$$;

-- House leadership checks used by house/student policy layers.
CREATE OR REPLACE FUNCTION public.is_senior_house_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND (
        role::text = 'admin'
        OR house_responsibility IN ('senior_house_master', 'senior_house_mistress')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_house_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND (
        role::text IN ('admin', 'house_master', 'house_mistress')
        OR house_responsibility IN ('house_master', 'house_mistress', 'senior_house_master', 'senior_house_mistress')
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_it_officer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_headmaster() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_academic_head() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_finance_officer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_domestic_officer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_general_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_senior_house_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_house_staff() TO authenticated;
