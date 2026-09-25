import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { SupabaseService } from "../../database/supabase.service";
import { FindPaymentsDto } from "./dto/find-payments.dto";
import { PaginatedResult } from "../../common/pagination/pagination.dto";

@Injectable()
export class FinanceService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly supabaseService: SupabaseService
  ) {}

  async getMetrics(): Promise<any> {
    const supabase = this.supabaseService.getAdminClient();

    // 1. Get active academic year
    const { data: activeYear } = await supabase
      .from("academic_years")
      .select("id, name")
      .eq("is_active", true)
      .maybeSingle();

    if (!activeYear) {
      return {
        totalBilled: 0,
        totalCollected: 0,
        outstandingBalance: 0,
        collectionRate: 0,
        academicYear: null,
      };
    }

    // 2. Get students in current academic year
    const { data: enrollments } = await supabase
      .from("class_enrollments")
      .select("student_id")
      .eq("academic_year_id", activeYear.id);

    const studentIds = Array.from(
      new Set((enrollments ?? []).map((e) => e.student_id))
    );

    if (studentIds.length === 0) {
      return {
        totalBilled: 0,
        totalCollected: 0,
        outstandingBalance: 0,
        collectionRate: 0,
        academicYear: activeYear.name,
      };
    }

    // 3. Sum balances for current year students
    const { data: balances } = await supabase
      .from("student_fee_balances")
      .select("total_billed, total_paid, outstanding_balance")
      .in("student_id", studentIds);

    let totalBilled = 0;
    let totalCollected = 0;
    let outstandingBalance = 0;

    for (const b of balances ?? []) {
      totalBilled += Number(b.total_billed || 0);
      totalCollected += Number(b.total_paid || 0);
      outstandingBalance += Number(b.outstanding_balance || 0);
    }

    const collectionRate =
      totalBilled > 0
        ? Number(((totalCollected / totalBilled) * 100).toFixed(1))
        : 0;

    return {
      totalBilled,
      totalCollected,
      outstandingBalance,
      collectionRate,
      studentCount: studentIds.length,
      academicYear: activeYear.name,
    };
  }

  async findPayments(query: FindPaymentsDto): Promise<PaginatedResult<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = this.supabaseService.getAdminClient();
    let q = supabase
      .from("payments")
      .select(
        `
        id,
        amount,
        payment_method,
        status,
        receipt_number,
        reference,
        notes,
        paid_at,
        created_at,
        student:student_id (
          id,
          first_name,
          middle_name,
          last_name,
          jhs_index_number,
          admission_number
        )
      `,
        { count: "exact" }
      );

    if (query.status) {
      q = q.eq("status", query.status);
    }
    if (query.student_id) {
      q = q.eq("student_id", query.student_id);
    }
    if (query.search) {
      const s = query.search.trim();
      q = q.or(`receipt_number.ilike.%${s}%,reference.ilike.%${s}%`);
    }

    q = q.order("paid_at", { ascending: false }).range(from, to);

    const { data, count, error } = await q;
    if (error) {
      throw error;
    }

    const total = count ?? 0;
    return {
      items: data ?? [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async reversePayment(paymentId: string, reason: string): Promise<any> {
    const supabase = this.supabaseService.getAdminClient();

    // Verify payment exists
    const { data: payment, error: checkError } = await supabase
      .from("payments")
      .select("id, status, receipt_number, amount")
      .eq("id", paymentId)
      .maybeSingle();

    if (checkError || !payment) {
      throw new NotFoundException(`Payment with ID "${paymentId}" not found.`);
    }

    if (payment.status !== "completed") {
      throw new BadRequestException(
        `Only completed payments can be reversed. Current status is "${payment.status}".`
      );
    }

    // Call PostgreSQL RPC reverse_student_payment
    const { data, error } = await this.databaseService.rpc(
      "reverse_student_payment",
      {
        p_payment_id: paymentId,
        p_reason: reason.trim(),
      }
    );

    if (error) {
      throw new BadRequestException(error.message || "Failed to reverse payment.");
    }

    return {
      success: true,
      message: `Payment receipt ${payment.receipt_number ?? payment.id} of GHS ${payment.amount} reversed successfully.`,
      result: data,
    };
  }
}
