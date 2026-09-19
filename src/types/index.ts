/**
 * Core TypeScript types for the Khulafasco Student Management System.
 * These mirror the Supabase database schema. Do not duplicate or rename tables.
 */

import type {
  AcademicTerm,
  AttendanceStatus,
  AuditModule,
  AuditSeverity,
  BoardingType,
  EnrollmentStatus,
  FormLevel,
  Gender,
  GuardianRelationship,
  ITTicketCategory,
  ITTicketStatus,
  PaymentMethod,
  PaymentMethodValue,
  PaymentStatus,
  PaymentTransactionStatus,
  PromotionStatus,
  RequestCategory,
  RequestPriority,
  RequestStatus,
  RequestType,
  ResultStatus,
  UserRole,
  HouseResponsibility,
  TimetableDay,
} from "@/config/constants";

// ---------------------------------------------------------------------------
// Database row types (snake_case matching Supabase columns)
// ---------------------------------------------------------------------------

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export interface Program {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface House {
  id: string;
  name: string;
  code?: string | null;
  capacity?: number | null;
  is_active?: boolean;
  house_master_id?: string | null;
  house_mistress_id?: string | null;
  house_master?: Profile | null;
  house_mistress?: Profile | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email?: string | null;
  role: UserRole;
  is_active: boolean;
  phone: string | null;
  house_id?: string | null;
  house_responsibility?: HouseResponsibility | null;
  house?: House | null;
  created_at: string;
  updated_at: string;
}

export type ExeatStatus = "active" | "returned" | "overdue" | "cancelled";

export interface HouseExeatRecord {
  id: string;
  student_id: string;
  house_id: string;
  issued_by: string | null;
  reason: string;
  departure_date: string;
  expected_return_date: string;
  actual_return_date: string | null;
  status: ExeatStatus;
  parent_contacted: boolean;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  student?: Student;
  house?: House;
  issuer?: Profile;
}

export interface Student {
  id: string;
  jhs_index_number: string; // JHS/BECE Index Number — the primary identifier
  first_name: string;
  middle_name: string | null;
  last_name: string;
  gender: Gender;
  date_of_birth: string;
  photo_path: string | null;
  previous_school: string | null;
  region: string | null;
  district: string | null;
  parent_name: string;
  parent_relationship: GuardianRelationship;
  parent_phone: string;
  parent_alt_phone: string | null;
  parent_email: string | null;
  parent_address: string | null;
  program_id: string;
  house_id: string | null;
  student_type: BoardingType;
  academic_year_id: string;
  enrollment_status: EnrollmentStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  program?: Program;
  house?: House;
  academic_year?: AcademicYear;
}

export interface FeeType {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  is_active: boolean;
}

export interface FeeConfiguration {
  id: string;
  fee_type_id: string;
  academic_year_id: string;
  amount: number;
  created_at: string;
  fee_type?: FeeType;
}

export interface StudentCharge {
  id: string;
  student_id: string;
  fee_type_id: string;
  academic_year_id: string;
  amount: number;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  student_id: string;
  amount: number;
  payment_method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  receipt_number: string;
  recorded_by: string;
  created_at: string;
  student?: Student;
  recorded_by_profile?: Profile;
}

export interface RecentPayment {
  payment_id: string;
  receipt_number: string;
  amount: number;
  payment_method: PaymentMethodValue;
  reference: string | null;
  status: PaymentTransactionStatus;
  notes: string | null;
  paid_at: string;
  recorded_by: string;
}

export interface PaymentRecord {
  id: string;
  student_id: string;
  amount: number;
  payment_method: PaymentMethodValue;
  reference: string | null;
  status: PaymentTransactionStatus;
  notes: string | null;
  receipt_number: string | null;
  recorded_by: string;
  paid_at: string;
  created_at: string;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  student_charge_id: string;
  amount: number;
  created_at: string;
  student_charge?: StudentCharge;
}

export interface AuditLog {
  id: string;
  user_id: string;
  actor_role?: string | null;
  action: string;
  module?: AuditModule | string | null;
  entity_type: string;
  entity_id: string | null;
  target_identifier?: string | null;
  description: string | null;
  status?: string | null;
  severity?: AuditSeverity | string | null;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  profile?: Profile;
}

// ---------------------------------------------------------------------------
// RPC / function return types
// ---------------------------------------------------------------------------

export interface StudentFinance {
  student: {
    id: string;
    jhs_index_number: string;
    full_name: string;
    program_name: string;
    house_name: string | null;
    student_type: BoardingType;
    academic_year: string;
    photo_path: string | null;
  };
  financial: {
    total_amount_due: number | null;
    total_paid: number;
    outstanding_balance: number | null;
    payment_status: PaymentStatus;
  };
  fee_allocations: StudentCharge[];
  recent_payments: RecentPayment[];
}

export interface FinancialReconciliation {
  total_amount_due: number | null;
  total_fee_charges: number;
  difference: number;
  is_balanced: boolean;
}

// ---------------------------------------------------------------------------
// UI / helper types
// ---------------------------------------------------------------------------

export interface SelectOption {
  value: string;
  label: string;
}

export interface PageMeta {
  title: string;
  description?: string;
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Academic Management Types
// ---------------------------------------------------------------------------

export interface Semester {
  id: string;
  academic_year_id: string;
  name: string;
  semester_number: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
  academic_year?: AcademicYear;
}

export interface SchoolClass {
  id: string;
  name: string;
  form_level: FormLevel | string;
  stream?: string | null;
  capacity?: number;
  is_active?: boolean;
  program_id: string | null;
  academic_year_id: string;
  class_teacher_id: string | null;
  created_at: string;
  updated_at?: string;
  program?: Program;
  class_teacher?: Profile;
}

export interface StudentAcademicEnrollment {
  id: string;
  student_id: string;
  academic_year_id: string;
  semester_id: string | null;
  level: FormLevel | string;
  class_id: string | null;
  enrollment_status: string;
  promotion_status: PromotionStatus | null;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  student?: Student;
  academic_year?: AcademicYear;
  semester?: Semester;
  class?: SchoolClass;
}

export interface StaffDeletionSafety {
  safe: boolean;
  total_references: number;
  reasons: string[];
  recommendation: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  department: string | null;
  is_elective: boolean;
  is_active?: boolean;
  description?: string | null;
  created_at: string;
}

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  academic_year_id: string;
  semester_id?: string | null;
  created_at: string;
  class?: SchoolClass;
  subject?: Subject;
  teacher?: Profile;
  semester?: Semester;
}

export interface TimetableEntry {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
  academic_year_id: string;
  semester_id: string | null;
  day_of_week: TimetableDay;
  period_number: number;
  start_time: string;
  end_time: string;
  room: string | null;
  stream: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  class?: SchoolClass;
  subject?: Subject;
  teacher?: Profile;
  academic_year?: AcademicYear;
  semester?: Semester;
}

export interface StudentClassAssignment {
  id: string;
  student_id: string;
  class_id: string;
  academic_year_id: string;
  created_at: string;
  student?: Student;
  class?: SchoolClass;
}

export interface AttendanceRecord {
  id: string;
  class_id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
  recorded_by: string;
  notes: string | null;
  created_at: string;
  student?: Student;
}

export interface StudentResult {
  id: string;
  student_id: string;
  class_id: string;
  subject_id: string;
  academic_year_id: string;
  term: AcademicTerm | string;
  assessment_score: number | null;
  exam_score: number | null;
  total_score: number | null;
  grade: string | null;
  remarks: string | null;
  conduct?: string | null;
  punctuality?: string | null;
  teacher_comment?: string | null;
  gpa?: number | null;
  status: ResultStatus;
  submitted_by: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  student?: Student;
  subject?: Subject;
  class?: SchoolClass;
}

// ---------------------------------------------------------------------------
// Student Transfer Process (STP) Types
// ---------------------------------------------------------------------------

export type TransferDirection = "transfer_in" | "transfer_out";

export type TransferStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "academic_verification"
  | "academic_clearance"
  | "finance_clearance"
  | "approved"
  | "enrolled"
  | "completed"
  | "rejected"
  | "cancelled";

export type ClearanceStatus = "pending" | "cleared" | "flagged" | "waived";

export interface StudentTransfer {
  id: string;
  transfer_reference: string;
  direction: TransferDirection;
  student_id: string | null;
  jhs_index_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  gender: Gender;
  date_of_birth: string | null;
  previous_school: string | null;
  destination_school: string | null;
  transfer_date: string;
  previous_form: string | null;
  previous_class: string | null;
  previous_academic_year: string | null;
  target_academic_year_id: string | null;
  target_semester_id: string | null;
  target_form: FormLevel | string | null;
  target_program_id: string | null;
  target_class_id: string | null;
  target_house_id: string | null;
  reason: string | null;
  documentation_notes: string | null;
  remarks: string | null;
  status: TransferStatus;
  academic_clearance_status: ClearanceStatus;
  academic_clearance_notes: string | null;
  academic_cleared_by: string | null;
  academic_cleared_at: string | null;
  finance_clearance_status: ClearanceStatus;
  finance_total_due: number;
  finance_total_paid: number;
  finance_balance: number;
  finance_clearance_notes: string | null;
  finance_cleared_by: string | null;
  finance_cleared_at: string | null;
  created_by: string | null;
  reviewed_by: string | null;
  approved_by: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
  student?: Student;
  target_academic_year?: AcademicYear;
  target_program?: Program;
  target_class?: SchoolClass;
  target_house?: House;
  creator?: Profile;
  reviewer?: Profile;
  approver?: Profile;
}

// ---------------------------------------------------------------------------
// Request Management Types
// ---------------------------------------------------------------------------

export interface RequestRecord {
  id: string;
  requester_id: string;
  request_type: RequestType;
  category: RequestCategory | string;
  title: string;
  description: string;
  amount_requested: number;
  amount_approved: number | null;
  amount_released: number | null;
  priority: RequestPriority;
  status: RequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comments: string | null;
  released_by: string | null;
  released_at: string | null;
  release_method: string | null;
  release_reference: string | null;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  requester?: Profile;
  reviewer?: Profile;
  releaser?: Profile;
  items?: RequestItem[];
}

export interface RequestItem {
  id: string;
  request_id: string;
  item_name: string;
  quantity: number;
  estimated_unit_cost: number;
  estimated_total_cost: number;
}

// ---------------------------------------------------------------------------
// IT Ticketing Types
// ---------------------------------------------------------------------------

export interface ITTicket {
  id: string;
  requester_id: string;
  title: string;
  category: ITTicketCategory | string;
  description: string;
  priority: RequestPriority;
  location: string | null;
  status: ITTicketStatus;
  assigned_to: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  requester?: Profile;
  assignee?: Profile;
}
