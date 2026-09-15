-- ============================================================================
-- Khulafasco SMS: Multi-Role System Architecture & Core Modules Expansion
-- ============================================================================

-- 1. EXPAND USER ROLES ENUM
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'it_officer';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'headmaster';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'academic_head';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'teacher';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'domestic_officer';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'general_staff';

-- 2. ROLE HELPER FUNCTIONS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_it_officer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'it_officer' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_headmaster()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'headmaster' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_academic_head()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'academic_head' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'teacher' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_domestic_officer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'domestic_officer' AND is_active = true
  );
$$;

-- 3. ACADEMIC MANAGEMENT TABLES
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  form_level text NOT NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE RESTRICT,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  class_teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  department text,
  is_elective boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_teacher_class_subject_year UNIQUE (teacher_id, class_id, subject_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS public.student_class_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_class_year UNIQUE (student_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  recorded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_attendance_student_date UNIQUE (student_id, date)
);

CREATE TABLE IF NOT EXISTS public.student_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  term text NOT NULL,
  assessment_score numeric(5,2) CHECK (assessment_score >= 0 AND assessment_score <= 100),
  exam_score numeric(5,2) CHECK (exam_score >= 0 AND exam_score <= 100),
  total_score numeric(5,2) CHECK (total_score >= 0 AND total_score <= 100),
  grade text,
  remarks text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'published')),
  submitted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_result_student_subject_term UNIQUE (student_id, subject_id, academic_year_id, term)
);

-- 4. CENTRAL REQUEST MANAGEMENT TABLES
CREATE TABLE IF NOT EXISTS public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  request_type text NOT NULL CHECK (request_type IN ('item', 'money')),
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  amount_requested numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount_requested >= 0),
  amount_approved numeric(12,2) CHECK (amount_approved >= 0),
  amount_released numeric(12,2) CHECK (amount_released >= 0),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'returned', 'waiting_release', 'released', 'completed')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_comments text,
  released_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  released_at timestamptz,
  release_method text,
  release_reference text,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  estimated_unit_cost numeric(12,2) NOT NULL DEFAULT 0 CHECK (estimated_unit_cost >= 0),
  estimated_total_cost numeric(12,2) NOT NULL DEFAULT 0 CHECK (estimated_total_cost >= 0)
);

-- 5. IT SUPPORT TICKETING TABLE
CREATE TABLE IF NOT EXISTS public.it_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  location text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'closed')),
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_classes_academic_year ON public.classes(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_classes_program ON public.classes(program_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON public.teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class ON public.teacher_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_class_date ON public.attendance_records(class_id, date);
CREATE INDEX IF NOT EXISTS idx_student_results_class ON public.student_results(class_id);
CREATE INDEX IF NOT EXISTS idx_requests_requester ON public.requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);
CREATE INDEX IF NOT EXISTS idx_it_tickets_requester ON public.it_tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_it_tickets_status ON public.it_tickets(status);

-- 7. ENABLE ROW-LEVEL SECURITY (RLS)
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_tickets ENABLE ROW LEVEL SECURITY;

-- 8. GRANTS
GRANT ALL ON public.classes TO authenticated;
GRANT ALL ON public.subjects TO authenticated;
GRANT ALL ON public.teacher_assignments TO authenticated;
GRANT ALL ON public.student_class_assignments TO authenticated;
GRANT ALL ON public.attendance_records TO authenticated;
GRANT ALL ON public.student_results TO authenticated;
GRANT ALL ON public.requests TO authenticated;
GRANT ALL ON public.request_items TO authenticated;
GRANT ALL ON public.it_tickets TO authenticated;

-- 9. RLS POLICIES

-- Classes: Viewable by staff, managed by Admin and Academic Head
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can view classes' AND tablename = 'classes') THEN
    CREATE POLICY "Staff can view classes" ON public.classes FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin and Academic Head can manage classes' AND tablename = 'classes') THEN
    CREATE POLICY "Admin and Academic Head can manage classes" ON public.classes FOR ALL TO authenticated
    USING (public.is_admin() OR public.is_academic_head())
    WITH CHECK (public.is_admin() OR public.is_academic_head());
  END IF;
END $$;

-- Subjects: Viewable by staff, managed by Admin and Academic Head
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can view subjects' AND tablename = 'subjects') THEN
    CREATE POLICY "Staff can view subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin and Academic Head can manage subjects' AND tablename = 'subjects') THEN
    CREATE POLICY "Admin and Academic Head can manage subjects" ON public.subjects FOR ALL TO authenticated
    USING (public.is_admin() OR public.is_academic_head())
    WITH CHECK (public.is_admin() OR public.is_academic_head());
  END IF;
END $$;

-- Teacher Assignments: Viewable by staff, managed by Admin and Academic Head
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can view teacher assignments' AND tablename = 'teacher_assignments') THEN
    CREATE POLICY "Staff can view teacher assignments" ON public.teacher_assignments FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin and Academic Head can manage teacher assignments' AND tablename = 'teacher_assignments') THEN
    CREATE POLICY "Admin and Academic Head can manage teacher assignments" ON public.teacher_assignments FOR ALL TO authenticated
    USING (public.is_admin() OR public.is_academic_head())
    WITH CHECK (public.is_admin() OR public.is_academic_head());
  END IF;
END $$;

-- Student Class Assignments: Viewable by staff, managed by Admin and Academic Head
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can view student class assignments' AND tablename = 'student_class_assignments') THEN
    CREATE POLICY "Staff can view student class assignments" ON public.student_class_assignments FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin and Academic Head can manage student class assignments' AND tablename = 'student_class_assignments') THEN
    CREATE POLICY "Admin and Academic Head can manage student class assignments" ON public.student_class_assignments FOR ALL TO authenticated
    USING (public.is_admin() OR public.is_academic_head())
    WITH CHECK (public.is_admin() OR public.is_academic_head());
  END IF;
END $$;

-- Attendance: Teachers can record for assigned classes, Admins/Heads can view/manage
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can view attendance' AND tablename = 'attendance_records') THEN
    CREATE POLICY "Staff can view attendance" ON public.attendance_records FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authorized staff can record attendance' AND tablename = 'attendance_records') THEN
    CREATE POLICY "Authorized staff can record attendance" ON public.attendance_records FOR INSERT TO authenticated
    WITH CHECK (
      public.is_admin() OR public.is_academic_head() OR
      EXISTS (SELECT 1 FROM public.teacher_assignments WHERE teacher_id = auth.uid() AND class_id = attendance_records.class_id)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authorized staff can update attendance' AND tablename = 'attendance_records') THEN
    CREATE POLICY "Authorized staff can update attendance" ON public.attendance_records FOR UPDATE TO authenticated
    USING (
      public.is_admin() OR public.is_academic_head() OR
      EXISTS (SELECT 1 FROM public.teacher_assignments WHERE teacher_id = auth.uid() AND class_id = attendance_records.class_id)
    )
    WITH CHECK (
      public.is_admin() OR public.is_academic_head() OR
      EXISTS (SELECT 1 FROM public.teacher_assignments WHERE teacher_id = auth.uid() AND class_id = attendance_records.class_id)
    );
  END IF;
END $$;

-- Student Results: Scoped entry by teachers, review by Academic Head and Admin
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authorized staff can view results' AND tablename = 'student_results') THEN
    CREATE POLICY "Authorized staff can view results" ON public.student_results FOR SELECT TO authenticated
    USING (
      public.is_admin() OR public.is_headmaster() OR public.is_academic_head() OR
      EXISTS (SELECT 1 FROM public.teacher_assignments WHERE teacher_id = auth.uid() AND class_id = student_results.class_id AND subject_id = student_results.subject_id)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers and Academic Head can manage results' AND tablename = 'student_results') THEN
    CREATE POLICY "Teachers and Academic Head can manage results" ON public.student_results FOR ALL TO authenticated
    USING (
      public.is_admin() OR public.is_academic_head() OR
      EXISTS (SELECT 1 FROM public.teacher_assignments WHERE teacher_id = auth.uid() AND class_id = student_results.class_id AND subject_id = student_results.subject_id)
    )
    WITH CHECK (
      public.is_admin() OR public.is_academic_head() OR
      EXISTS (SELECT 1 FROM public.teacher_assignments WHERE teacher_id = auth.uid() AND class_id = student_results.class_id AND subject_id = student_results.subject_id)
    );
  END IF;
END $$;

-- Central Requests:
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can view own requests or authorized reviewers can view all' AND tablename = 'requests') THEN
    CREATE POLICY "Staff can view own requests or authorized reviewers can view all" ON public.requests FOR SELECT TO authenticated
    USING (
      requester_id = auth.uid() OR
      public.is_admin() OR
      public.is_headmaster() OR
      (public.is_finance_officer() AND status IN ('approved', 'waiting_release', 'released', 'completed'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can create own requests' AND tablename = 'requests') THEN
    CREATE POLICY "Staff can create own requests" ON public.requests FOR INSERT TO authenticated
    WITH CHECK (requester_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authorized staff can update requests' AND tablename = 'requests') THEN
    CREATE POLICY "Authorized staff can update requests" ON public.requests FOR UPDATE TO authenticated
    USING (
      requester_id = auth.uid() OR
      public.is_admin() OR
      public.is_headmaster() OR
      public.is_finance_officer()
    );
  END IF;
END $$;

-- Request Items:
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can view request items for accessible requests' AND tablename = 'request_items') THEN
    CREATE POLICY "Staff can view request items for accessible requests" ON public.request_items FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.requests r
        WHERE r.id = request_items.request_id
        AND (
          r.requester_id = auth.uid() OR
          public.is_admin() OR
          public.is_headmaster() OR
          (public.is_finance_officer() AND r.status IN ('approved', 'waiting_release', 'released', 'completed'))
        )
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Requesters and Admins can insert request items' AND tablename = 'request_items') THEN
    CREATE POLICY "Requesters and Admins can insert request items" ON public.request_items FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.requests r
        WHERE r.id = request_items.request_id AND (r.requester_id = auth.uid() OR public.is_admin())
      )
    );
  END IF;
END $$;

-- IT Tickets:
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can view own tickets or IT/Admin can view all' AND tablename = 'it_tickets') THEN
    CREATE POLICY "Staff can view own tickets or IT/Admin can view all" ON public.it_tickets FOR SELECT TO authenticated
    USING (requester_id = auth.uid() OR public.is_it_officer() OR public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can create own IT tickets' AND tablename = 'it_tickets') THEN
    CREATE POLICY "Staff can create own IT tickets" ON public.it_tickets FOR INSERT TO authenticated
    WITH CHECK (requester_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'IT Officers and Admins can update tickets' AND tablename = 'it_tickets') THEN
    CREATE POLICY "IT Officers and Admins can update tickets" ON public.it_tickets FOR UPDATE TO authenticated
    USING (public.is_it_officer() OR public.is_admin());
  END IF;
END $$;

-- 10. SEED DEFAULT CORE SUBJECTS
INSERT INTO public.subjects (name, code, department, is_elective) VALUES
  ('English Language', 'ENG', 'Languages', false),
  ('Core Mathematics', 'MATH', 'Mathematics', false),
  ('Integrated Science', 'SCI', 'Sciences', false),
  ('Social Studies', 'SOC', 'Social Sciences', false),
  ('Information & Communications Technology', 'ICT', 'Technology', false)
ON CONFLICT (code) DO NOTHING;
