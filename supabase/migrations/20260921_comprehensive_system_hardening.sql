-- Migration: 20260921_comprehensive_system_hardening.sql
-- System hardening for House Management, STP (Student Transfer Process), and WAEC Assessment
BEGIN;

-- 1. Extend houses table with capacity, code, and active state
ALTER TABLE public.houses
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS capacity integer DEFAULT 150,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Update existing default houses with canonical codes and capacities
UPDATE public.houses SET code = 'ABU', capacity = 150, is_active = true WHERE name = 'Abubakar' AND code IS NULL;
UPDATE public.houses SET code = 'UMR', capacity = 150, is_active = true WHERE name = 'Umar' AND code IS NULL;
UPDATE public.houses SET code = 'UTH', capacity = 150, is_active = true WHERE name = 'Uthman' AND code IS NULL;
UPDATE public.houses SET code = 'ALI', capacity = 150, is_active = true WHERE name = 'Ali' AND code IS NULL;

CREATE INDEX IF NOT EXISTS idx_houses_is_active ON public.houses(is_active);

-- 2. Create student_transfers table for STP (Student Transfer Process)
CREATE TABLE IF NOT EXISTS public.student_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_reference text NOT NULL UNIQUE,
  direction text NOT NULL CHECK (direction IN ('transfer_in', 'transfer_out')),
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  jhs_index_number text NOT NULL,
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  date_of_birth date,
  previous_school text,
  destination_school text,
  transfer_date date NOT NULL DEFAULT CURRENT_DATE,
  previous_form text,
  previous_class text,
  previous_academic_year text,
  target_academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  target_semester_id uuid REFERENCES public.semesters(id) ON DELETE SET NULL,
  target_form text CHECK (target_form IN ('Form 1', 'Form 2', 'Form 3')),
  target_program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  target_class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  target_house_id uuid REFERENCES public.houses(id) ON DELETE SET NULL,
  reason text,
  documentation_notes text,
  remarks text,
  status text NOT NULL DEFAULT 'submitted' CHECK (
    status IN (
      'draft',
      'submitted',
      'under_review',
      'academic_verification',
      'academic_clearance',
      'finance_clearance',
      'approved',
      'enrolled',
      'completed',
      'rejected',
      'cancelled'
    )
  ),
  academic_clearance_status text NOT NULL DEFAULT 'pending' CHECK (academic_clearance_status IN ('pending', 'cleared', 'flagged')),
  academic_clearance_notes text,
  academic_cleared_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  academic_cleared_at timestamptz,
  finance_clearance_status text NOT NULL DEFAULT 'pending' CHECK (finance_clearance_status IN ('pending', 'cleared', 'flagged', 'waived')),
  finance_total_due numeric(10,2) DEFAULT 0,
  finance_total_paid numeric(10,2) DEFAULT 0,
  finance_balance numeric(10,2) DEFAULT 0,
  finance_clearance_notes text,
  finance_cleared_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  finance_cleared_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_transfers_ref ON public.student_transfers(transfer_reference);
CREATE INDEX IF NOT EXISTS idx_student_transfers_direction ON public.student_transfers(direction);
CREATE INDEX IF NOT EXISTS idx_student_transfers_status ON public.student_transfers(status);
CREATE INDEX IF NOT EXISTS idx_student_transfers_student_id ON public.student_transfers(student_id);
CREATE INDEX IF NOT EXISTS idx_student_transfers_index ON public.student_transfers(jhs_index_number);
CREATE INDEX IF NOT EXISTS idx_student_transfers_created_at ON public.student_transfers(created_at DESC);

-- Enable RLS on student_transfers
ALTER TABLE public.student_transfers ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.student_transfers TO authenticated, service_role;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can view student transfers' AND tablename = 'student_transfers') THEN
    CREATE POLICY "Staff can view student transfers" ON public.student_transfers
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authorized staff can manage transfers' AND tablename = 'student_transfers') THEN
    CREATE POLICY "Authorized staff can manage transfers" ON public.student_transfers
      FOR ALL TO authenticated
      USING (
        public.is_admin()
        OR public.is_headmaster()
        OR public.is_academic_head()
        OR public.is_finance_officer()
      )
      WITH CHECK (
        public.is_admin()
        OR public.is_headmaster()
        OR public.is_academic_head()
        OR public.is_finance_officer()
      );
  END IF;
END $$;

-- 3. Extend student_results table with qualitative assessment fields for WAEC STP
ALTER TABLE public.student_results
  ADD COLUMN IF NOT EXISTS conduct text,
  ADD COLUMN IF NOT EXISTS punctuality text,
  ADD COLUMN IF NOT EXISTS teacher_comment text,
  ADD COLUMN IF NOT EXISTS gpa numeric(3,2);

-- 4. Sequence and function for STP reference generation (e.g. STP-2026-000001)
CREATE SEQUENCE IF NOT EXISTS public.seq_student_transfer_ref START WITH 1;

CREATE OR REPLACE FUNCTION public.generate_transfer_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text := to_char(CURRENT_DATE, 'YYYY');
  v_seq bigint;
  v_ref text;
BEGIN
  v_seq := nextval('public.seq_student_transfer_ref');
  v_ref := 'STP-' || v_year || '-' || lpad(v_seq::text, 6, '0');
  RETURN v_ref;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_transfer_reference() TO authenticated, service_role;

COMMIT;
