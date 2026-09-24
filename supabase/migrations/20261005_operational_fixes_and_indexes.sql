-- Migration: 20261005_operational_fixes_and_indexes.sql
-- Description: Production operational fixes applied 2026-09-24
-- - Add sort_order to houses for correct Khalifa display order
-- - Add missing unique constraint on attendance_records
-- - Drop old overly-restrictive attendance constraint
-- - Add performance indexes on high-traffic tables
-- - Set timetable status default to 'draft'
-- - Sync profile emails from auth.users

-- ────────────────────────────────────────────────────────────
-- 1. Houses — Khalifa sort order
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.houses ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 99;

UPDATE public.houses SET sort_order = CASE name
  WHEN 'Abubakar' THEN 1
  WHEN 'Umar'     THEN 2
  WHEN 'Uthman'   THEN 3
  WHEN 'Ali'      THEN 4
  ELSE 99
END;

CREATE INDEX IF NOT EXISTS idx_houses_sort_order ON public.houses(sort_order);

-- ────────────────────────────────────────────────────────────
-- 2. Attendance records — fix unique constraint
-- Previously only (student_id, date) — does not allow
-- the same student to be marked in different classes on same
-- day (edge case but wrong semantic). Replace with
-- (student_id, class_id, date) which matches the server action.
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Drop old constraint if it still exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.attendance_records'::regclass
    AND conname='uq_attendance_student_date'
  ) THEN
    ALTER TABLE public.attendance_records DROP CONSTRAINT uq_attendance_student_date;
  END IF;

  -- Add correct constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.attendance_records'::regclass
    AND conname='attendance_records_student_class_date_key'
  ) THEN
    ALTER TABLE public.attendance_records
    ADD CONSTRAINT attendance_records_student_class_date_key
    UNIQUE (student_id, class_id, date);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 3. Timetable — ensure status column has correct default
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.timetables ALTER COLUMN status SET DEFAULT 'draft';

-- Fix any existing timetable entries without status set
UPDATE public.timetables
SET status = CASE WHEN is_published THEN 'published' ELSE 'draft' END
WHERE status IS NULL OR status = '';

-- ────────────────────────────────────────────────────────────
-- 4. Performance indexes
-- ────────────────────────────────────────────────────────────
-- Timetables
CREATE INDEX IF NOT EXISTS idx_timetables_teacher_id ON public.timetables(teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetables_year_semester ON public.timetables(academic_year_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_timetables_class_day_period ON public.timetables(class_id, day_of_week, period_number);

-- Teacher assignments
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON public.teacher_assignments(teacher_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class ON public.teacher_assignments(class_id, academic_year_id);

-- Student results
CREATE INDEX IF NOT EXISTS idx_student_results_student ON public.student_results(student_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_student_results_class ON public.student_results(class_id, status);

-- Attendance records
CREATE INDEX IF NOT EXISTS idx_attendance_records_class_date ON public.attendance_records(class_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.attendance_records(student_id, date);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id, created_at DESC);

-- Student transfers
CREATE INDEX IF NOT EXISTS idx_student_transfers_status ON public.student_transfers(status, direction);
CREATE INDEX IF NOT EXISTS idx_student_transfers_jhs ON public.student_transfers(jhs_index_number);

-- Students
CREATE INDEX IF NOT EXISTS idx_students_academic_year ON public.students(academic_year_id, enrollment_status);
CREATE INDEX IF NOT EXISTS idx_students_house ON public.students(house_id, enrollment_status);
CREATE INDEX IF NOT EXISTS idx_students_program ON public.students(program_id, enrollment_status);

-- ────────────────────────────────────────────────────────────
-- 5. Sync profile emails from auth.users (one-time fix)
-- ────────────────────────────────────────────────────────────
UPDATE public.profiles p
SET email = au.email,
    updated_at = now()
FROM auth.users au
WHERE p.id = au.id
  AND (p.email IS NULL OR p.email = '')
  AND au.email IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 6. Record this migration
-- ────────────────────────────────────────────────────────────
INSERT INTO public.schema_migrations (version, name, applied_at)
VALUES ('20261005', 'operational_fixes_and_indexes', now())
ON CONFLICT (version) DO NOTHING;
