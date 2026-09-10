-- Minimal migration to grant authenticated SELECT on reference tables
-- and add a safe SELECT policy for students allowing only admin/finance staff.

BEGIN;

-- Allow authenticated users to read reference data needed by the dashboard.
GRANT SELECT ON public.programs TO authenticated;
GRANT SELECT ON public.houses TO authenticated;
GRANT SELECT ON public.academic_years TO authenticated;

-- Ensure authenticated can SELECT students rows, but control visibility via RLS policy below.
GRANT SELECT ON public.students TO authenticated;

-- Enable RLS on students if not already enabled and add a policy that permits
-- staff members (admin, finance_officer) to SELECT student rows. This policy
-- checks the `profiles` table for the current user's application role.

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'allow_staff_select_students' AND polrelid = 'public.students'::regclass
  ) THEN
    CREATE POLICY allow_staff_select_students ON public.students
      FOR SELECT
      USING (
        auth.role() = 'authenticated' AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin','finance_officer')
          )
        )
      );
  END IF;
END$$;

COMMIT;
