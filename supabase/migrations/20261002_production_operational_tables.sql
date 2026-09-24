-- ============================================================================
-- PRODUCTION OPERATIONAL TABLES — academics, responsibilities, documents,
-- notifications, archival, assessments, rooms, guardians
-- Additive. Existing table contracts are preserved.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- School settings (single-row operational configuration)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text NOT NULL DEFAULT 'AL-KHULAFau AR-RASHIDUUN ISLAMIC SENIOR HIGH SCHOOL',
  short_name text NOT NULL DEFAULT 'Khulafasco',
  audit_retention_days integer NOT NULL DEFAULT 365 CHECK (audit_retention_days >= 30),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

INSERT INTO public.school_settings (school_name, short_name)
SELECT 'AL-KHULAFau AR-RASHIDUUN ISLAMIC SENIOR HIGH SCHOOL', 'Khulafasco'
WHERE NOT EXISTS (SELECT 1 FROM public.school_settings);

-- ---------------------------------------------------------------------------
-- Departments, learning areas, classrooms
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text UNIQUE,
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Staff responsibilities / appointments (historical, independent of primary role)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_responsibilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  responsibility text NOT NULL CHECK (responsibility IN (
    'housemaster', 'housemistress', 'senior_housemaster', 'senior_housemistress',
    'house_master', 'house_mistress', 'senior_house_master', 'senior_house_mistress',
    'form_teacher', 'class_teacher', 'assistant_headmaster'
  )),
  house_id uuid REFERENCES public.houses(id) ON DELETE SET NULL,
  class_id uuid,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  scope text,
  notes text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_responsibilities_staff ON public.staff_responsibilities (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_responsibilities_active ON public.staff_responsibilities (staff_id) WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- Academic structure extensions already created in earlier migrations
-- ---------------------------------------------------------------------------
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS learning_area_id uuid REFERENCES public.learning_areas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS credit_hours numeric(5,2) CHECK (credit_hours IS NULL OR credit_hours >= 0);

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS room text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_reason text;

ALTER TABLE public.student_academic_enrollments
  ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS house_id uuid REFERENCES public.houses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS boarding_type text CHECK (boarding_type IS NULL OR boarding_type IN ('boarding', 'day')),
  ADD COLUMN IF NOT EXISTS admission_date date,
  ADD COLUMN IF NOT EXISTS exit_date date;

CREATE TABLE IF NOT EXISTS public.program_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  form_level text,
  is_core boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_program_subject_form UNIQUE (program_id, subject_id, form_level)
);

CREATE TABLE IF NOT EXISTS public.class_teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_class_teacher_year UNIQUE (teacher_id, class_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_program_subjects_program ON public.program_subjects (program_id);
CREATE INDEX IF NOT EXISTS idx_program_subjects_subject ON public.program_subjects (subject_id);

-- ---------------------------------------------------------------------------
-- Guardians (canonical contacts; student parent_* columns remain for compatibility)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  relationship text,
  phone text,
  email text,
  address text,
  occupation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_id uuid NOT NULL REFERENCES public.guardians(id) ON DELETE RESTRICT,
  is_primary boolean NOT NULL DEFAULT false,
  is_emergency boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_guardian UNIQUE (student_id, guardian_id)
);

-- ---------------------------------------------------------------------------
-- House assignment history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.house_assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  from_house_id uuid REFERENCES public.houses(id) ON DELETE SET NULL,
  to_house_id uuid REFERENCES public.houses(id) ON DELETE SET NULL,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  reason text,
  is_manual_override boolean NOT NULL DEFAULT false,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_house_assignment_history_student ON public.house_assignment_history (student_id);

-- ---------------------------------------------------------------------------
-- Timetable publication hardening
-- ---------------------------------------------------------------------------
ALTER TABLE public.timetables
  ADD COLUMN IF NOT EXISTS classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'validating', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

UPDATE public.timetables
SET status = CASE WHEN is_published THEN 'published' ELSE 'draft' END
WHERE status IS NULL OR (is_published = true AND status = 'draft');

-- Collision exclusion: unique per class/teacher/room + day + period + year/semester while not archived
DO $$
BEGIN
  BEGIN
    EXECUTE $idx$
      CREATE UNIQUE INDEX IF NOT EXISTS uq_timetable_class_slot
        ON public.timetables (
          class_id,
          academic_year_id,
          (COALESCE(semester_id, '00000000-0000-0000-0000-000000000000'::uuid)),
          day_of_week,
          period_number
        )
        WHERE status <> 'archived'
    $idx$;
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Class timetable collisions exist; unique class-slot index skipped.';
  WHEN others THEN
    RAISE NOTICE 'Class timetable unique index skipped: %', SQLERRM;
  END;
  BEGIN
    EXECUTE $idx$
      CREATE UNIQUE INDEX IF NOT EXISTS uq_timetable_teacher_slot
        ON public.timetables (
          teacher_id,
          academic_year_id,
          (COALESCE(semester_id, '00000000-0000-0000-0000-000000000000'::uuid)),
          day_of_week,
          period_number
        )
        WHERE teacher_id IS NOT NULL AND status <> 'archived'
    $idx$;
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Teacher timetable collisions exist; unique teacher-slot index skipped.';
  WHEN others THEN
    RAISE NOTICE 'Teacher timetable unique index skipped: %', SQLERRM;
  END;
  BEGIN
    EXECUTE $idx$
      CREATE UNIQUE INDEX IF NOT EXISTS uq_timetable_room_slot
        ON public.timetables (
          room,
          academic_year_id,
          (COALESCE(semester_id, '00000000-0000-0000-0000-000000000000'::uuid)),
          day_of_week,
          period_number
        )
        WHERE room IS NOT NULL AND btrim(room) <> '' AND status <> 'archived'
    $idx$;
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Room timetable collisions exist; unique room-slot index skipped.';
  WHEN others THEN
    RAISE NOTICE 'Room timetable unique index skipped: %', SQLERRM;
  END;
END $$;

-- ---------------------------------------------------------------------------
-- Assessments (raw assessment events; student_results remain the published scores)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  assessment_type text NOT NULL DEFAULT 'continuous'
    CHECK (assessment_type IN (
      'continuous', 'test', 'assignment', 'quiz', 'examination', 'practical', 'project', 'other'
    )),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  semester_id uuid REFERENCES public.semesters(id) ON DELETE SET NULL,
  max_score numeric(6,2) NOT NULL DEFAULT 100 CHECK (max_score > 0),
  assessment_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assessment_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  raw_score numeric(6,2) CHECK (raw_score IS NULL OR raw_score >= 0),
  percentage numeric(6,2),
  grade text,
  grade_point numeric(4,2),
  remarks text,
  teacher_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_assessment_student UNIQUE (assessment_id, student_id)
);

ALTER TABLE public.student_results
  ADD COLUMN IF NOT EXISTS credit_hours numeric(5,2),
  ADD COLUMN IF NOT EXISTS grade_point numeric(4,2),
  ADD COLUMN IF NOT EXISTS correction_of uuid REFERENCES public.student_results(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.qualitative_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  semester_id uuid REFERENCES public.semesters(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  character_assessment text,
  conduct text,
  attendance_observation text,
  strengths text,
  areas_for_improvement text,
  teacher_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_staff_attendance_day UNIQUE (staff_id, date)
);

-- ---------------------------------------------------------------------------
-- Documents / notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL CHECK (owner_type IN ('student', 'staff', 'payment', 'academic', 'other')),
  owner_id uuid NOT NULL,
  bucket text NOT NULL,
  object_path text NOT NULL,
  file_name text,
  mime_type text,
  document_kind text,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_files_owner ON public.document_files (owner_type, owner_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  notification_type text NOT NULL DEFAULT 'system',
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications (recipient_id, is_read, created_at DESC);

-- ---------------------------------------------------------------------------
-- Audit archive (archiving is not deletion)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs_archive (
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
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz NOT NULL DEFAULT now(),
  archived_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_created_at ON public.audit_logs_archive (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_target ON public.audit_logs_archive (target_identifier);

-- ---------------------------------------------------------------------------
-- Promotion batch records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promotion_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  destination_academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  source_level text NOT NULL,
  destination_level text,
  performed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

-- ---------------------------------------------------------------------------
-- RLS enable
-- ---------------------------------------------------------------------------
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualitative_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_batches ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.school_settings TO authenticated;
GRANT UPDATE ON public.school_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.departments, public.learning_areas, public.classrooms TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.staff_responsibilities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.class_teacher_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.guardians, public.student_guardians TO authenticated;
GRANT SELECT, INSERT ON public.house_assignment_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.assessments, public.assessment_scores, public.qualitative_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.staff_attendance TO authenticated;
GRANT SELECT, INSERT ON public.document_files TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT ON public.audit_logs_archive TO authenticated;
GRANT SELECT, INSERT ON public.promotion_batches TO authenticated;
