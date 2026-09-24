-- ============================================================================
-- PRODUCTION BASELINE — core identity, school structure, students, finance
-- Additive and idempotent. Does not drop operational tables or school data.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Enums (create if missing; add values if the type already exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.user_role AS ENUM (
      'admin',
      'it_officer',
      'headmaster',
      'assistant_headmaster',
      'academic_head',
      'teacher',
      'house_master',
      'house_mistress',
      'finance_officer',
      'domestic_officer',
      'general_staff'
    );
  ELSE
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'assistant_headmaster';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Profiles (application staff identity; PK = auth.users.id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  full_name text NOT NULL,
  first_name text,
  middle_name text,
  last_name text,
  email text,
  phone text,
  gender text CHECK (gender IS NULL OR gender IN ('male', 'female')),
  date_of_birth date,
  staff_number text,
  photo_path text,
  role public.user_role NOT NULL,
  additional_roles public.user_role[] NOT NULL DEFAULT '{}',
  house_id uuid,
  house_responsibility text
    CHECK (house_responsibility IS NULL OR house_responsibility IN (
      'house_master', 'house_mistress', 'senior_house_master', 'senior_house_mistress'
    )),
  employment_status text NOT NULL DEFAULT 'active'
    CHECK (employment_status IN ('active', 'inactive', 'suspended', 'left')),
  is_active boolean NOT NULL DEFAULT true,
  date_joined date,
  date_left date,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  deletion_reason text
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS middle_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS staff_number text,
  ADD COLUMN IF NOT EXISTS photo_path text,
  ADD COLUMN IF NOT EXISTS additional_roles public.user_role[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS house_id uuid,
  ADD COLUMN IF NOT EXISTS house_responsibility text,
  ADD COLUMN IF NOT EXISTS employment_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS date_joined date,
  ADD COLUMN IF NOT EXISTS date_left date,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deletion_reason text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_staff_number
  ON public.profiles (staff_number) WHERE staff_number IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_house ON public.profiles (house_id);

-- ---------------------------------------------------------------------------
-- Academic years / programs / houses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academic_years_dates_chk CHECK (end_date > start_date)
);

ALTER TABLE public.academic_years
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_years_name ON public.academic_years (name);
DO $$
BEGIN
  EXECUTE $idx$
    CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_years_one_current
      ON public.academic_years ((true)) WHERE is_current = true
  $idx$;
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'Multiple current academic years exist; unique current-year index skipped until data is corrected.';
END $$;

CREATE TABLE IF NOT EXISTS public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS uq_programs_code ON public.programs (code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_programs_name ON public.programs (name);

CREATE TABLE IF NOT EXISTS public.houses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  description text,
  color text,
  capacity integer DEFAULT 150 CHECK (capacity IS NULL OR capacity > 0),
  is_active boolean NOT NULL DEFAULT true,
  house_master_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  house_mistress_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.houses
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS capacity integer DEFAULT 150,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS house_master_id uuid,
  ADD COLUMN IF NOT EXISTS house_mistress_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS uq_houses_name ON public.houses (name);
CREATE UNIQUE INDEX IF NOT EXISTS uq_houses_code ON public.houses (code) WHERE code IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_house_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_house_id_fkey
      FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Students (BECE/JHS index is the natural unique identifier)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jhs_index_number text NOT NULL,
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  date_of_birth date,
  photo_path text,
  nationality text,
  place_of_birth text,
  previous_school text,
  region text,
  district text,
  parent_name text,
  parent_relationship text,
  parent_phone text,
  parent_alt_phone text,
  parent_email text,
  parent_address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  program_id uuid REFERENCES public.programs(id) ON DELETE RESTRICT,
  house_id uuid REFERENCES public.houses(id) ON DELETE SET NULL,
  student_type text NOT NULL DEFAULT 'boarding' CHECK (student_type IN ('boarding', 'day')),
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  enrollment_status text NOT NULL DEFAULT 'active',
  total_amount_due numeric(12,2) CHECK (total_amount_due IS NULL OR total_amount_due >= 0),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  archived_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deletion_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS place_of_birth text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship text,
  ADD COLUMN IF NOT EXISTS total_amount_due numeric(12,2),
  ADD COLUMN IF NOT EXISTS enrolled_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deletion_reason text;

UPDATE public.students SET enrolled_at = COALESCE(enrolled_at, created_at) WHERE enrolled_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_students_jhs_index
  ON public.students (jhs_index_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_last_name ON public.students (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_students_academic_year ON public.students (academic_year_id);
CREATE INDEX IF NOT EXISTS idx_students_program ON public.students (program_id);
CREATE INDEX IF NOT EXISTS idx_students_house ON public.students (house_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students (enrollment_status);
CREATE INDEX IF NOT EXISTS idx_students_name_trgm ON public.students USING gin ((first_name || ' ' || last_name) gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Finance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fee_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fee_types_name ON public.fee_types (name);

CREATE TABLE IF NOT EXISTS public.fee_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_type_id uuid NOT NULL REFERENCES public.fee_types(id) ON DELETE RESTRICT,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_fee_config_type_year UNIQUE (fee_type_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS public.student_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  fee_type_id uuid NOT NULL REFERENCES public.fee_types(id) ON DELETE RESTRICT,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  description text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_charges_student ON public.student_charges (student_id);
CREATE INDEX IF NOT EXISTS idx_student_charges_year ON public.student_charges (academic_year_id);

-- Compatibility table used by transfer/finance lookups (mirrors charges as amount_due).
CREATE TABLE IF NOT EXISTS public.student_fee_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  fee_type_id uuid REFERENCES public.fee_types(id) ON DELETE SET NULL,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  amount_due numeric(12,2) NOT NULL CHECK (amount_due >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_fee_charges_student ON public.student_fee_charges (student_id);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'mobile_money', 'bank_transfer', 'other')),
  reference text,
  notes text,
  receipt_number text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'reversed')),
  recorded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  reversed_at timestamptz,
  reversed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reversal_reason text
);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reversed_by uuid,
  ADD COLUMN IF NOT EXISTS reversal_reason text;

UPDATE public.payments SET paid_at = COALESCE(paid_at, created_at) WHERE paid_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_receipt_number
  ON public.payments (receipt_number) WHERE receipt_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_reference
  ON public.payments (reference) WHERE reference IS NOT NULL AND status = 'completed';
CREATE INDEX IF NOT EXISTS idx_payments_student ON public.payments (student_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON public.payments (paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_recorded_by ON public.payments (recorded_by);

CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  student_charge_id uuid NOT NULL REFERENCES public.student_charges(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON public.payment_allocations (payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_charge ON public.payment_allocations (student_charge_id);

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  actor_role text,
  action text NOT NULL,
  module text DEFAULT 'SYSTEM',
  entity_type text,
  entity_id uuid,
  target_identifier text,
  description text,
  status text DEFAULT 'SUCCESS',
  severity text DEFAULT 'INFO',
  before_data jsonb,
  after_data jsonb,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_role text,
  ADD COLUMN IF NOT EXISTS module text DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS target_identifier text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'SUCCESS',
  ADD COLUMN IF NOT EXISTS severity text DEFAULT 'INFO',
  ADD COLUMN IF NOT EXISTS before_data jsonb,
  ADD COLUMN IF NOT EXISTS after_data jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text;

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs (module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs (target_identifier);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);

-- Never allow ordinary UPDATE/DELETE of audit history at the table privilege layer.
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated, anon, PUBLIC;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fee_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_years TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.houses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.fee_types, public.fee_configurations, public.student_charges, public.student_fee_charges TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payments, public.payment_allocations TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
