/**
 * Authoritative Finance Service
 * Enforces server-authoritative calculations, academic-year scoping, and transactional mutations.
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { formatUserErrorMessage, ValidationError } from "@/lib/errors";
import { SessionUser } from "@/lib/dal";

export interface RecordPaymentInput {
  jhsIndexNumber: string;
  amount: number;
  paymentMethod: string;
  reference?: string | null;
  notes?: string | null;
  allocations: { fee_type_id: string; amount: number }[];
  actor: SessionUser;
}

export interface ReversePaymentInput {
  paymentId: string;
  reason: string;
  actor: SessionUser;
}

export class FinanceService {
  /**
   * Revalidate all finance-related UI paths
   */
  static revalidateFinancePaths() {
    revalidatePath("/finance");
    revalidatePath("/finance/payments");
    revalidatePath("/finance/receipts");
    revalidatePath("/dashboard");
  }

  /**
   * Record a student payment atomically using the database RPC
   */
  static async recordPayment(input: RecordPaymentInput) {
    if (!input.jhsIndexNumber || !input.amount || input.amount <= 0) {
      throw new ValidationError("Valid student index and positive payment amount are required.");
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("record_student_payment", {
      p_jhs_index_number: input.jhsIndexNumber.toUpperCase().trim(),
      p_amount: input.amount,
      p_payment_method: input.paymentMethod,
      p_allocations: input.allocations,
      p_reference: input.reference || null,
      p_notes: input.notes || null,
    });

    if (error) {
      console.error("FinanceService.recordPayment error:", error);
      throw new Error(formatUserErrorMessage(error));
    }

    FinanceService.revalidateFinancePaths();
    return data;
  }

  /**
   * Reverse an existing completed payment
   */
  static async reversePayment(input: ReversePaymentInput) {
    if (!input.paymentId || !input.reason.trim()) {
      throw new ValidationError("Payment ID and non-empty reversal reason are required.");
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("reverse_student_payment", {
      p_payment_id: input.paymentId,
      p_reason: input.reason.trim(),
    });

    if (error) {
      console.error("FinanceService.reversePayment error:", error);
      throw new Error(formatUserErrorMessage(error));
    }

    FinanceService.revalidateFinancePaths();
    return data;
  }

  /**
   * Calculate dashboard metrics strictly scoped to the current academic year
   */
  static async getYearScopedMetrics(academicYearId: string) {
    const supabase = await createClient();

    // 1. Fetch students enrolled in this academic year
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, total_amount_due")
      .eq("academic_year_id", academicYearId)
      .eq("enrollment_status", "active");

    if (studentsError) {
      console.error("getYearScopedMetrics students query error:", studentsError);
      return null;
    }

    const studentIds = (students || []).map((s) => s.id);
    if (studentIds.length === 0) {
      return {
        totalStudents: 0,
        amountDue: 0,
        totalCollected: 0,
        outstandingBalance: 0,
        fullyPaid: 0,
        partiallyPaid: 0,
        unpaid: 0,
      };
    }

    // 2. Fetch payments ONLY for these students
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("student_id, amount, status")
      .in("student_id", studentIds)
      .eq("status", "completed");

    if (paymentsError) {
      console.error("getYearScopedMetrics payments query error:", paymentsError);
    }

    const studentPaidMap = new Map<string, number>();
    let totalCollected = 0;

    for (const p of payments || []) {
      const amt = Number(p.amount || 0);
      totalCollected += amt;
      studentPaidMap.set(p.student_id, (studentPaidMap.get(p.student_id) || 0) + amt);
    }

    let amountDue = 0;
    let fullyPaid = 0;
    let partiallyPaid = 0;
    let unpaid = 0;

    for (const s of students || []) {
      const due = Number(s.total_amount_due || 0);
      const paid = studentPaidMap.get(s.id) || 0;
      amountDue += due;

      if (paid >= due && due > 0) {
        fullyPaid++;
      } else if (paid > 0 && paid < due) {
        partiallyPaid++;
      } else {
        unpaid++;
      }
    }

    const outstandingBalance = Math.max(0, amountDue - totalCollected);

    return {
      totalStudents: students.length,
      amountDue,
      totalCollected,
      outstandingBalance,
      fullyPaid,
      partiallyPaid,
      unpaid,
    };
  }
}
