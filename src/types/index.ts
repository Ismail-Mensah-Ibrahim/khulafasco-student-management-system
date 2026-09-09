/**
 * Core TypeScript types for the Khulafasco Student Management System.
 * These mirror the Supabase database schema. Do not duplicate or rename tables.
 */

import type {
  BoardingType,
  EnrollmentStatus,
  Gender,
  GuardianRelationship,
  PaymentMethod,
  PaymentStatus,
  UserRole,
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
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  index_number: string; // JHS/BECE Index Number — the primary identifier
  first_name: string;
  middle_name: string | null;
  last_name: string;
  gender: Gender;
  date_of_birth: string;
  photo_path: string | null;
  previous_school: string | null;
  region: string | null;
  district: string | null;
  guardian_name: string;
  guardian_relationship: GuardianRelationship;
  guardian_phone: string;
  guardian_alternate_phone: string | null;
  guardian_email: string | null;
  guardian_address: string | null;
  program_id: string;
  house_id: string | null;
  boarding_type: BoardingType;
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
  amount_due: number;
  amount_paid: number;
  created_at: string;
  updated_at: string;
  fee_type?: FeeType;
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
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  profile?: Profile;
}

// ---------------------------------------------------------------------------
// RPC / function return types
// ---------------------------------------------------------------------------

export interface StudentFinance {
  student_id: string;
  index_number: string;
  full_name: string;
  program_name: string;
  house_name: string | null;
  boarding_type: BoardingType;
  academic_year: string;
  photo_path: string | null;
  total_amount_due: number | null;
  total_paid: number;
  outstanding_balance: number;
  payment_status: PaymentStatus;
  charges: StudentCharge[];
  payments: Payment[];
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
