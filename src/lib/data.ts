import { createClient } from "@/lib/supabase/server";
import { normalizeIndexNumber } from "@/lib/utils";
import {
  studentFinanceSchema,
  studentFinancialReconciliationSchema,
  financePaymentsSchema,
  type FinancePayments,
  type PaymentListQuery,
  type StudentFinanceResult,
  type StudentFinancialReconciliation,
} from "@/lib/validation/finance";
import type { AcademicYear, AuditLog, FeeType, House, Program, Student } from "@/types";

export interface DashboardProgramStat {
  name: string;
  count: number;
  percentage: number;
}

export interface DashboardHouseStat {
  name: string;
  count: number;
  percentage: number;
}

export interface DashboardSummary {
  totalStudents: number;
  activeStudents: number;
  boardingStudents: number;
  dayStudents: number;
  currentAcademicYear: AcademicYear | null;
  programStats: DashboardProgramStat[];
  houseStats: DashboardHouseStat[];
}

export interface FinanceDashboardMetrics {
  totalStudents: number;
  amountDue: number;
  totalCollected: number;
  outstandingBalance: number;
  fullyPaid: number;
  partiallyPaid: number;
  unpaid: number;
  notSet: number;
  todayPaymentCount: number;
  todayCollected: number;
}

export interface StudentQueryFilters {
  search?: string;
  academicYearId?: string;
  programId?: string;
  houseId?: string;
  studentType?: string;
  enrollmentStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface StudentPageResult {
  students: Student[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error: string | null;
}

export type StudentFinanceLookupResult =
  | { data: StudentFinanceResult; error: null }
  | { data: null; error: "not_found" | "unauthorized" | "unavailable" | "malformed" };

export type StudentFinancialReconciliationResult =
  | { data: StudentFinancialReconciliation; error: null }
  | { data: null; error: "not_found" | "unauthorized" | "unavailable" | "malformed" };

export type FinancePaymentsResult =
  | { data: FinancePayments; error: null }
  | { data: null; error: "unauthorized" | "unavailable" | "malformed" };

function isStudentNotFoundError(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  if (normalizedMessage.startsWith("no student found with jhs/bece index number:")) {
    return true;
  }

  return normalizedMessage.includes("student") && (
    normalizedMessage.includes("not found") ||
    normalizedMessage.includes("does not exist") ||
    normalizedMessage.includes("no record")
  );
}

function isFinanceUnauthorizedError(code: string | undefined, message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  return code === "42501" || normalizedMessage.includes("not authorized") || normalizedMessage.includes("unauthorized");
}

function mapReconciliationError(
  code: string | undefined,
  message: string
): Exclude<StudentFinancialReconciliationResult["error"], null> {
  if (isFinanceUnauthorizedError(code, message)) return "unauthorized";
  if (isStudentNotFoundError(message)) return "not_found";
  return "unavailable";
}

export async function getStudentFinanceByIndex(
  rawIndexNumber: string
): Promise<StudentFinanceLookupResult> {
  try {
    const indexNumber = normalizeIndexNumber(rawIndexNumber);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_student_finance_by_index", {
      p_jhs_index_number: indexNumber,
    });

    if (error) {
      console.error("getStudentFinanceByIndex RPC error:", {
        code: error.code,
        message: error.message,
      });
      if (isFinanceUnauthorizedError(error.code, error.message)) {
        return { data: null, error: "unauthorized" };
      }

      return { data: null, error: isStudentNotFoundError(error.message) ? "not_found" : "unavailable" };
    }

    if (data === null || data === undefined) {
      return { data: null, error: "not_found" };
    }

    const parsed = studentFinanceSchema.safeParse(data);
    if (!parsed.success) {
      console.error("getStudentFinanceByIndex malformed RPC response:", parsed.error.issues[0]);
      return { data: null, error: "malformed" };
    }

    return { data: parsed.data, error: null };
  } catch (error) {
    console.error("getStudentFinanceByIndex unexpected error:", error instanceof Error ? error.message : "Unknown error");
    return { data: null, error: "unavailable" };
  }
}

export async function getStudentFinancialReconciliation(
  rawIndexNumber: string
): Promise<StudentFinancialReconciliationResult> {
  try {
    const indexNumber = normalizeIndexNumber(rawIndexNumber);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_student_financial_reconciliation", {
      p_jhs_index_number: indexNumber,
    });

    if (error) {
      console.error("getStudentFinancialReconciliation RPC error:", {
        code: error.code,
        message: error.message,
      });
      return { data: null, error: mapReconciliationError(error.code, error.message) };
    }

    const parsed = studentFinancialReconciliationSchema.safeParse(data);
    if (!parsed.success) {
      console.error("getStudentFinancialReconciliation malformed RPC response:", parsed.error.issues[0]);
      return { data: null, error: "malformed" };
    }

    return { data: parsed.data, error: null };
  } catch (error) {
    console.error(
      "getStudentFinancialReconciliation unexpected error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return { data: null, error: "unavailable" };
  }
}

function toRpcDate(value: string | undefined, endOfDay = false): string | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (endOfDay) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}

export async function getFinancePayments(query: PaymentListQuery): Promise<FinancePaymentsResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_finance_payments", {
      p_page: query.page,
      p_page_size: query.page_size,
      p_search: query.search || null,
      p_status: query.status ?? null,
      p_payment_method: query.payment_method ?? null,
      p_academic_year_id: query.academic_year_id ?? null,
      p_paid_from: toRpcDate(query.paid_from || undefined),
      p_paid_to: toRpcDate(query.paid_to || undefined, true),
    });

    if (error) {
      console.error("getFinancePayments RPC error:", { code: error.code, message: error.message });
      return { data: null, error: isFinanceUnauthorizedError(error.code, error.message) ? "unauthorized" : "unavailable" };
    }

    const parsed = financePaymentsSchema.safeParse(data);
    if (!parsed.success) {
      console.error("getFinancePayments malformed RPC response:", parsed.error.issues[0]);
      return { data: null, error: "malformed" };
    }

    return { data: parsed.data, error: null };
  } catch (error) {
    console.error("getFinancePayments unexpected error:", error instanceof Error ? error.message : "Unknown error");
    return { data: null, error: "unavailable" };
  }
}

export async function getAcademicYears(): Promise<AcademicYear[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("academic_years")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) {
    throw new Error("Unable to load academic years.");
  }

  return (data ?? []) as AcademicYear[];
}

export async function getPrograms(options: { throwOnError?: boolean } = {}): Promise<Program[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    if (options.throwOnError) {
      throw new Error("Unable to load programs.");
    }
    // Log and return an empty list instead of throwing so the dashboard
    // page can render even when a transient DB/storage error occurs.
    // The error is logged for diagnostics.
    console.error("getPrograms error:", error);
    return [] as Program[];
  }

  return (data ?? []) as Program[];
}

export async function getHouses(options: { throwOnError?: boolean } = {}): Promise<House[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("houses")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    if (options.throwOnError) {
      throw new Error("Unable to load houses.");
    }
    // Log and return an empty list so the dashboard can still render
    // when houses cannot be fetched (transient DB issues).
    // Attempt to stringify the error (handles non-enumerable fields)
    try {
      const errStr = typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error);
      console.error("getHouses error:", errStr);
    } catch {
      console.error("getHouses error: (unstringifiable)", error);
    }
    return [] as House[];
  }

  return (data ?? []) as House[];
}

export async function getFeeTypes(options: { throwOnError?: boolean } = {}): Promise<FeeType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fee_types")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    if (options.throwOnError) throw new Error("Unable to load fee types.");
    console.error("getFeeTypes error:", error);
    return [];
  }

  return (data ?? []) as FeeType[];
}

export async function getAuditLogs(options: { throwOnError?: boolean } = {}): Promise<AuditLog[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, user_id, action, entity_type, entity_id, description, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    if (options.throwOnError) {
      throw new Error("Unable to load audit logs.");
    }
    console.error("getAuditLogs error:", error);
    return [] as AuditLog[];
  }

  return (data ?? []) as AuditLog[];
}

export async function getStudentsPage(filters: StudentQueryFilters = {}): Promise<StudentPageResult> {
  const supabase = await createClient();
  const pageSize = filters.pageSize ?? 25;
  const page = Math.max(1, Number(filters.page ?? 1) || 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("students")
    .select(
      "*, program:programs(name), house:houses(name), academic_year:academic_years(name)",
      { count: "exact" }
    );

  if (filters.academicYearId) {
    query = query.eq("academic_year_id", filters.academicYearId);
  }

  if (filters.programId) {
    query = query.eq("program_id", filters.programId);
  }

  if (filters.houseId) {
    query = query.eq("house_id", filters.houseId);
  }

  if (filters.studentType) {
    query = query.eq("student_type", filters.studentType);
  }

  if (filters.enrollmentStatus) {
    query = query.eq("enrollment_status", filters.enrollmentStatus);
  }

  const searchTerm = filters.search?.trim();
  if (searchTerm) {
    const normalizedSearch = normalizeIndexNumber(searchTerm);
    query = query.or(
      `jhs_index_number.ilike.%${normalizedSearch}%,first_name.ilike.%${searchTerm}%,middle_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`
    );
  }

  const { data, count, error } = await query
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })
    .range(from, to);

  if (error) {
    return {
      students: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
      error: "Unable to load students from the database.",
    };
  }

  const list = (data ?? []) as Student[];
  const totalCount = count ?? list.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    students: list,
    totalCount,
    page: Math.min(page, totalPages),
    pageSize,
    totalPages,
    error: null,
  };
}

export async function getStudents(): Promise<Student[]> {
  const queryResult = await getStudentsPage();

  if (queryResult.error) {
    throw new Error(queryResult.error);
  }

  return queryResult.students;
}

export async function getStudentByJhsIndexNumber(jhsIndexNumber: string): Promise<Student | null> {
  const normalizedIndex = normalizeIndexNumber(jhsIndexNumber);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("students")
    .select("*, program:programs(name), house:houses(name), academic_year:academic_years(name)")
    .eq("jhs_index_number", normalizedIndex)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load student record for ${normalizedIndex}.`);
  }

  return (data as Student | null) ?? null;
}

/**
 * Returns an internal proxied URL for the student's photo. The photo itself
 * remains in the private `student-photos` bucket and is served through a
 * server-side API route which enforces authentication.
 */
export async function getStudentPhotoProxyUrl(jhsIndexNumber: string, photoPath: string | null): Promise<string | null> {
  if (!photoPath) return null;
  return `/api/student-photo/${encodeURIComponent(jhsIndexNumber)}`;
}

async function countStudents(filters: {
  academicYearId?: string | null;
  programId?: string | null;
  houseId?: string | null;
  studentType?: string | null;
  enrollmentStatus?: string | null;
} = {}): Promise<number> {
  const supabase = await createClient();

  let query = supabase.from("students").select("*", { count: "exact", head: true });

  if (filters.academicYearId) {
    query = query.eq("academic_year_id", filters.academicYearId);
  }

  if (filters.programId) {
    query = query.eq("program_id", filters.programId);
  }

  if (filters.houseId) {
    query = query.eq("house_id", filters.houseId);
  }

  if (filters.studentType) {
    query = query.eq("student_type", filters.studentType);
  }

  if (filters.enrollmentStatus) {
    query = query.eq("enrollment_status", filters.enrollmentStatus);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error("Unable to calculate dashboard statistics.");
  }

  return count ?? 0;
}

export async function getFinanceDashboardMetrics(): Promise<FinanceDashboardMetrics> {
  const supabase = await createClient();
  const academicYears = await getAcademicYears();
  const currentAcademicYear = academicYears.find((year) => year.is_current) ?? academicYears[0] ?? null;

  const studentQuery = supabase
    .from("students")
    .select("id, total_amount_due, academic_year_id")
    .order("created_at", { ascending: false });

  if (currentAcademicYear?.id) {
    studentQuery.eq("academic_year_id", currentAcademicYear.id);
  }

  const [studentsResult, paymentsResult] = await Promise.allSettled([
    studentQuery,
    supabase.from("payments").select("student_id, amount, paid_at, status").order("paid_at", { ascending: false }),
  ]);

  const studentsQuery = studentsResult.status === "fulfilled" ? studentsResult.value : null;
  const paymentsQuery = paymentsResult.status === "fulfilled" ? paymentsResult.value : null;

  if (studentsQuery?.error) {
    console.warn("getFinanceDashboardMetrics students query failed", {
      code: studentsQuery.error.code,
      message: studentsQuery.error.message,
      details: studentsQuery.error.details,
      hint: studentsQuery.error.hint,
    });
  }

  if (paymentsQuery?.error) {
    console.warn("getFinanceDashboardMetrics payments query failed", {
      code: paymentsQuery.error.code,
      message: paymentsQuery.error.message,
      details: paymentsQuery.error.details,
      hint: paymentsQuery.error.hint,
    });
  }

  const studentRows = studentsQuery?.data ?? [];
  const paymentRows = paymentsQuery?.data ?? [];

  const totalStudents = studentRows.length;
  let amountDue = 0;
  let totalCollected = 0;
  let outstandingBalance = 0;
  let fullyPaid = 0;
  let partiallyPaid = 0;
  let unpaid = 0;
  let notSet = 0;

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
  const endTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).toISOString();

  const studentPaid = new Map<string, number>();

  for (const payment of paymentRows.filter((row: { status?: string; student_id?: string; amount?: number | string; paid_at?: string }) => row.status === "completed")) {
    const studentId = payment.student_id as string;
    const amount = Number(payment.amount ?? 0);
    totalCollected += amount;

    studentPaid.set(studentId, (studentPaid.get(studentId) ?? 0) + amount);
  }

  for (const student of studentRows) {
    const due = student.total_amount_due == null ? null : Number(student.total_amount_due);
    const paid = studentPaid.get(student.id) ?? 0;

    if (due === null) {
      notSet += 1;
      continue;
    }

    amountDue += due;
    const outstanding = Math.max(due - paid, 0);
    outstandingBalance += outstanding;

    if (paid === 0) {
      unpaid += 1;
    } else if (paid >= due) {
      fullyPaid += 1;
    } else {
      partiallyPaid += 1;
    }
  }

  const todayPaymentCount = paymentRows.filter((row: { status?: string; paid_at?: string }) => row.status === "completed" && row.paid_at && row.paid_at >= startToday && row.paid_at < endTomorrow).length;
  const todayCollected = paymentRows
    .filter((row: { status?: string; paid_at?: string; amount?: number | string }) => row.status === "completed" && row.paid_at && row.paid_at >= startToday && row.paid_at < endTomorrow)
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  return {
    totalStudents,
    amountDue,
    totalCollected,
    outstandingBalance,
    fullyPaid,
    partiallyPaid,
    unpaid,
    notSet,
    todayPaymentCount,
    todayCollected,
  };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [programs, houses, academicYears] = await Promise.all([
    getPrograms(),
    getHouses(),
    getAcademicYears(),
  ]);

  const currentAcademicYear = academicYears.find((year) => year.is_current) ?? academicYears[0] ?? null;
  const academicYearId = currentAcademicYear?.id ?? null;

  const [totalStudents, activeStudents, boardingStudents, dayStudents] = await Promise.all([
    countStudents({ academicYearId }),
    countStudents({ academicYearId, enrollmentStatus: "active" }),
    countStudents({ academicYearId, studentType: "boarding" }),
    countStudents({ academicYearId, studentType: "day" }),
  ]);

  const programStats: DashboardProgramStat[] = await Promise.all(
    programs.map(async (program) => {
      const count = await countStudents({ academicYearId, programId: program.id });

      return {
        name: program.name,
        count,
        percentage: totalStudents > 0 ? (count / totalStudents) * 100 : 0,
      };
    })
  );

  const houseStats: DashboardHouseStat[] = await Promise.all(
    houses.map(async (house) => {
      const count = await countStudents({ academicYearId, houseId: house.id });

      return {
        name: house.name,
        count,
        percentage: totalStudents > 0 ? (count / totalStudents) * 100 : 0,
      };
    })
  );

  return {
    totalStudents,
    activeStudents,
    boardingStudents,
    dayStudents,
    currentAcademicYear,
    programStats: programStats.sort((a, b) => b.count - a.count),
    houseStats: houseStats.sort((a, b) => b.count - a.count),
  };
}
