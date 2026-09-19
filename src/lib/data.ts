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
import type {
  AcademicYear,
  AuditLog,
  FeeType,
  House,
  Program,
  Semester,
  Student,
  SchoolClass,
  StaffDeletionSafety,
  StudentAcademicEnrollment,
  Subject,
  RequestRecord,
  ITTicket,
  AttendanceRecord,
  StudentResult,
  Profile,
  StudentTransfer,
  HouseExeatRecord,
  TeacherAssignment,
  TimetableEntry,
} from "@/types";
import type { Gender, UserRole, HouseResponsibility, TimetableDay } from "@/config/constants";
import { getHouseDistributionData, type HouseDistributionItem } from "@/lib/services/house-allocation";

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
  maleStudents: number;
  femaleStudents: number;
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

export interface AuditLogFilters {
  fromDate?: string;
  toDate?: string;
  userId?: string;
  actorRole?: string;
  module?: string;
  severity?: string;
  status?: string;
  action?: string;
  targetIdentifier?: string;
  search?: string;
  limit?: number;
  offset?: number;
  throwOnError?: boolean;
}

export async function getAuditLogs(options: AuditLogFilters = {}): Promise<AuditLog[]> {
  const supabase = await createClient();

  let query = supabase
    .from("audit_logs")
    .select(`
      *,
      profile:profiles!audit_logs_user_id_fkey(id, full_name, email, role)
    `)
    .order("created_at", { ascending: false });

  if (options.fromDate) {
    query = query.gte("created_at", `${options.fromDate}T00:00:00.000Z`);
  }
  if (options.toDate) {
    query = query.lte("created_at", `${options.toDate}T23:59:59.999Z`);
  }
  if (options.userId) {
    query = query.eq("user_id", options.userId);
  }
  if (options.actorRole && options.actorRole !== "all") {
    query = query.eq("actor_role", options.actorRole);
  }
  if (options.module && options.module !== "all") {
    query = query.eq("module", options.module);
  }
  if (options.severity && options.severity !== "all") {
    query = query.eq("severity", options.severity);
  }
  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }
  if (options.action && options.action !== "all") {
    query = query.eq("action", options.action);
  }
  if (options.targetIdentifier) {
    query = query.ilike("target_identifier", `%${options.targetIdentifier}%`);
  }
  if (options.search) {
    query = query.or(`description.ilike.%${options.search}%,target_identifier.ilike.%${options.search}%,action.ilike.%${options.search}%`);
  }

  const limit = options.limit ?? 200;
  query = query.limit(limit);

  if (options.offset) {
    query = query.range(options.offset, options.offset + limit - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.warn("getAuditLogs join warning, falling back to manual batch profile resolution:", error.message);
    let fallbackQuery = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (options.fromDate) {
      fallbackQuery = fallbackQuery.gte("created_at", `${options.fromDate}T00:00:00.000Z`);
    }
    if (options.toDate) {
      fallbackQuery = fallbackQuery.lte("created_at", `${options.toDate}T23:59:59.999Z`);
    }
    if (options.userId) {
      fallbackQuery = fallbackQuery.eq("user_id", options.userId);
    }
    if (options.actorRole && options.actorRole !== "all") {
      fallbackQuery = fallbackQuery.eq("actor_role", options.actorRole);
    }
    if (options.module && options.module !== "all") {
      fallbackQuery = fallbackQuery.eq("module", options.module);
    }
    if (options.severity && options.severity !== "all") {
      fallbackQuery = fallbackQuery.eq("severity", options.severity);
    }
    if (options.status && options.status !== "all") {
      fallbackQuery = fallbackQuery.eq("status", options.status);
    }
    if (options.action && options.action !== "all") {
      fallbackQuery = fallbackQuery.eq("action", options.action);
    }
    if (options.targetIdentifier) {
      fallbackQuery = fallbackQuery.ilike("target_identifier", `%${options.targetIdentifier}%`);
    }
    if (options.search) {
      fallbackQuery = fallbackQuery.or(`description.ilike.%${options.search}%,target_identifier.ilike.%${options.search}%,action.ilike.%${options.search}%`);
    }

    fallbackQuery = fallbackQuery.limit(limit);

    if (options.offset) {
      fallbackQuery = fallbackQuery.range(options.offset, options.offset + limit - 1);
    }

    const fallback = await fallbackQuery;

    if (fallback.data && fallback.data.length > 0) {
      const userIds = Array.from(
        new Set(fallback.data.map((l: { user_id?: string | null }) => l.user_id).filter((id): id is string => Boolean(id)))
      );
      let profileMap = new Map<string, Profile>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, role, phone, is_active, created_at, updated_at")
          .in("id", userIds);
        if (profiles) {
          profileMap = new Map(profiles.map((p) => [p.id, p as Profile]));
        }
      }
      return (fallback.data as AuditLog[]).map((log) => ({
        ...log,
        profile: log.user_id ? profileMap.get(log.user_id) : undefined,
      }));
    }

    if (options.throwOnError) {
      throw new Error("Unable to load audit logs.");
    }
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
  gender?: string | null;
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

  if (filters.gender) {
    query = query.eq("gender", filters.gender);
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

  const [totalStudents, activeStudents, boardingStudents, dayStudents, maleStudents, femaleStudents] = await Promise.all([
    countStudents({ academicYearId }),
    countStudents({ academicYearId, enrollmentStatus: "active" }),
    countStudents({ academicYearId, studentType: "boarding" }),
    countStudents({ academicYearId, studentType: "day" }),
    countStudents({ academicYearId, gender: "male" }),
    countStudents({ academicYearId, gender: "female" }),
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
    maleStudents,
    femaleStudents,
    currentAcademicYear,
    programStats: programStats.sort((a, b) => b.count - a.count),
    houseStats: houseStats.sort((a, b) => b.count - a.count),
  };
}

// ---------------------------------------------------------------------------
// Multi-Role Data Fetching Helpers
// ---------------------------------------------------------------------------

export async function getRequests(filters?: {
  status?: string;
  requesterId?: string;
  category?: string;
}): Promise<RequestRecord[]> {
  const supabase = await createClient();
  let query = supabase
    .from("requests")
    .select(`
      *,
      requester:profiles!requests_requester_id_fkey(id, full_name, email, role),
      reviewer:profiles!requests_reviewed_by_fkey(id, full_name, email, role),
      releaser:profiles!requests_released_by_fkey(id, full_name, email, role)
    `)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.requesterId) {
    query = query.eq("requester_id", filters.requesterId);
  }
  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getRequests error:", error);
    return [];
  }
  return (data ?? []) as RequestRecord[];
}

export async function getRequestById(id: string): Promise<RequestRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requests")
    .select(`
      *,
      requester:profiles!requests_requester_id_fkey(id, full_name, email, role),
      reviewer:profiles!requests_reviewed_by_fkey(id, full_name, email, role),
      releaser:profiles!requests_released_by_fkey(id, full_name, email, role),
      items:request_items(*)
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("getRequestById error:", error);
    return null;
  }
  return data as RequestRecord;
}

export async function getITTickets(filters?: {
  status?: string;
  requesterId?: string;
}): Promise<ITTicket[]> {
  const supabase = await createClient();
  let query = supabase
    .from("it_tickets")
    .select(`
      *,
      requester:profiles!it_tickets_requester_id_fkey(id, full_name, email, role),
      assignee:profiles!it_tickets_assigned_to_fkey(id, full_name, email, role)
    `)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.requesterId) {
    query = query.eq("requester_id", filters.requesterId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getITTickets error:", error);
    return [];
  }
  return (data ?? []) as ITTicket[];
}

export async function getClasses(academicYearId?: string): Promise<SchoolClass[]> {
  const supabase = await createClient();
  let query = supabase
    .from("classes")
    .select(`
      *,
      program:programs(id, name, code),
      academic_year:academic_years(id, name, is_current),
      class_teacher:profiles!classes_class_teacher_id_fkey(id, full_name, email)
    `)
    .order("name", { ascending: true });

  if (academicYearId) {
    query = query.eq("academic_year_id", academicYearId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getClasses error:", error);
    return [];
  }
  return (data ?? []) as SchoolClass[];
}

export async function getSubjects(): Promise<Subject[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("getSubjects error:", error);
    return [];
  }
  return (data ?? []) as Subject[];
}

export async function getTeacherAssignments(filters?: {
  classId?: string;
  teacherId?: string;
  subjectId?: string;
  academicYearId?: string;
  semesterId?: string;
}): Promise<TeacherAssignment[]> {
  const supabase = await createClient();
  let query = supabase
    .from("teacher_assignments")
    .select(`
      *,
      teacher:profiles!teacher_assignments_teacher_id_fkey(id, full_name, email, role),
      class:classes!teacher_assignments_class_id_fkey(id, name, form_level, stream),
      subject:subjects!teacher_assignments_subject_id_fkey(id, name, code, department, is_elective),
      semester:semesters!teacher_assignments_semester_id_fkey(id, name, semester_number)
    `)
    .order("created_at", { ascending: false });

  if (filters?.classId) query = query.eq("class_id", filters.classId);
  if (filters?.teacherId) query = query.eq("teacher_id", filters.teacherId);
  if (filters?.subjectId) query = query.eq("subject_id", filters.subjectId);
  if (filters?.academicYearId) query = query.eq("academic_year_id", filters.academicYearId);
  if (filters?.semesterId) query = query.eq("semester_id", filters.semesterId);

  const { data, error } = await query;
  if (error) {
    console.error("getTeacherAssignments error:", error);
    return [];
  }
  return (data ?? []) as TeacherAssignment[];
}

export async function getTimetableEntries(filters?: {
  classId?: string;
  teacherId?: string;
  subjectId?: string;
  academicYearId?: string;
  semesterId?: string;
  dayOfWeek?: string;
  isPublished?: boolean;
}): Promise<TimetableEntry[]> {
  const supabase = await createClient();
  let query = supabase
    .from("timetables")
    .select(`
      *,
      class:classes(id, name, form_level, stream),
      subject:subjects(id, name, code, department),
      teacher:profiles(id, full_name, email),
      academic_year:academic_years(id, name, is_current),
      semester:semesters(id, name, semester_number)
    `)
    .order("day_of_week", { ascending: true })
    .order("period_number", { ascending: true });

  if (filters?.classId) query = query.eq("class_id", filters.classId);
  if (filters?.teacherId) query = query.eq("teacher_id", filters.teacherId);
  if (filters?.subjectId) query = query.eq("subject_id", filters.subjectId);
  if (filters?.academicYearId) query = query.eq("academic_year_id", filters.academicYearId);
  if (filters?.semesterId) query = query.eq("semester_id", filters.semesterId);
  if (filters?.dayOfWeek) query = query.eq("day_of_week", filters.dayOfWeek);
  if (typeof filters?.isPublished === "boolean") query = query.eq("is_published", filters.isPublished);

  const { data, error } = await query;
  if (error) {
    console.error("getTimetableEntries error:", error);
    return [];
  }
  return (data ?? []) as TimetableEntry[];
}

export interface TeacherWorkloadItem {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  assignedClassesCount: number;
  assignedSubjectsCount: number;
  weeklyPeriodsCount: number;
  teachingDaysCount: number;
  classesList: string[];
  subjectsList: string[];
}

export async function getTeacherWorkloadSummary(
  academicYearId?: string,
  semesterId?: string
): Promise<TeacherWorkloadItem[]> {
  const supabase = await createClient();

  const [staff, assignments, timetables] = await Promise.all([
    getStaffProfiles(),
    getTeacherAssignments({ academicYearId, semesterId }),
    getTimetableEntries({ academicYearId, semesterId }),
  ]);

  const teachers = staff.filter((s) => s.role === "teacher" || s.is_active);

  return teachers.map((teacher) => {
    const teacherAssignments = assignments.filter((a) => a.teacher_id === teacher.id);
    const teacherTimetable = timetables.filter((t) => t.teacher_id === teacher.id);

    const classesSet = new Set<string>();
    const subjectsSet = new Set<string>();
    const daysSet = new Set<string>();

    teacherAssignments.forEach((a) => {
      if (a.class?.name) classesSet.add(a.class.name);
      if (a.subject?.name) subjectsSet.add(a.subject.name);
    });

    teacherTimetable.forEach((t) => {
      if (t.class?.name) classesSet.add(t.class.name);
      if (t.subject?.name) subjectsSet.add(t.subject.name);
      if (t.day_of_week) daysSet.add(t.day_of_week);
    });

    return {
      teacherId: teacher.id,
      teacherName: teacher.full_name,
      teacherEmail: teacher.email || "",
      assignedClassesCount: classesSet.size,
      assignedSubjectsCount: subjectsSet.size,
      weeklyPeriodsCount: teacherTimetable.length,
      teachingDaysCount: daysSet.size,
      classesList: Array.from(classesSet),
      subjectsList: Array.from(subjectsSet),
    };
  });
}

export async function getAttendanceRecords(classId?: string, date?: string): Promise<AttendanceRecord[]> {
  const supabase = await createClient();
  let query = supabase
    .from("attendance_records")
    .select(`
      *,
      student:students(id, jhs_index_number, first_name, last_name, photo_path)
    `)
    .order("date", { ascending: false });

  if (classId) query = query.eq("class_id", classId);
  if (date) query = query.eq("date", date);

  const { data, error } = await query;
  if (error) {
    console.error("getAttendanceRecords error:", error);
    return [];
  }
  return (data ?? []) as AttendanceRecord[];
}

export async function getStudentResults(filters?: {
  classId?: string;
  subjectId?: string;
  status?: string;
}): Promise<StudentResult[]> {
  const supabase = await createClient();
  let query = supabase
    .from("student_results")
    .select(`
      *,
      student:students(id, jhs_index_number, first_name, last_name),
      subject:subjects(id, name, code),
      class:classes(id, name)
    `)
    .order("created_at", { ascending: false });

  if (filters?.classId) query = query.eq("class_id", filters.classId);
  if (filters?.subjectId) query = query.eq("subject_id", filters.subjectId);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) {
    console.error("getStudentResults error:", error);
    return [];
  }
  return (data ?? []) as StudentResult[];
}

export async function getStaffProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getStaffProfiles error:", error);
    return [];
  }
  return (data ?? []) as Profile[];
}

export async function getSemesters(academicYearId?: string): Promise<Semester[]> {
  const supabase = await createClient();
  let query = supabase
    .from("semesters")
    .select("*, academic_year:academic_years(id, name, is_current)")
    .order("semester_number", { ascending: true });

  if (academicYearId) {
    query = query.eq("academic_year_id", academicYearId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getSemesters error:", error);
    return [];
  }
  return (data ?? []) as Semester[];
}

export async function getStudentAcademicHistory(studentId: string): Promise<StudentAcademicEnrollment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_academic_enrollments")
    .select(`
      *,
      academic_year:academic_years(id, name, is_current),
      semester:semesters(id, name, semester_number),
      class:classes(id, name, form_level)
    `)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getStudentAcademicHistory error:", error);
    return [];
  }
  return (data ?? []) as StudentAcademicEnrollment[];
}

export async function getStaffSafetyCheck(staffId: string): Promise<StaffDeletionSafety> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_staff_deletion_safety", {
    p_staff_id: staffId,
  });

  if (error || !data) {
    console.error("getStaffSafetyCheck error:", error);
    return {
      safe: false,
      total_references: 999,
      reasons: ["Unable to verify account safety. Deactivate account instead."],
      recommendation: "Deactivate account instead of permanent deletion.",
    };
  }

  return data as StaffDeletionSafety;
}

export async function getITSecurityMetrics(): Promise<{
  activeStaff: number;
  inactiveStaff: number;
  securityEventsCount: number;
  warningEventsCount: number;
  recentSecurityLogs: AuditLog[];
}> {
  const supabase = await createClient();

  const staff = await getStaffProfiles();
  const activeStaff = staff.filter((s) => s.is_active).length;
  const inactiveStaff = staff.filter((s) => !s.is_active).length;

  const { data: secLogs } = await supabase
    .from("audit_logs")
    .select(`
      *,
      profile:profiles!audit_logs_user_id_fkey(id, full_name, email, role)
    `)
    .in("severity", ["SECURITY", "CRITICAL"])
    .order("created_at", { ascending: false })
    .limit(10);

  const { count: secCount } = await supabase
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .in("severity", ["SECURITY", "CRITICAL"]);

  const { count: warnCount } = await supabase
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("severity", "WARNING");

  return {
    activeStaff,
    inactiveStaff,
    securityEventsCount: secCount ?? 0,
    warningEventsCount: warnCount ?? 0,
    recentSecurityLogs: (secLogs ?? []) as AuditLog[],
  };
}

export async function getHouseDistributions(): Promise<HouseDistributionItem[]> {
  const supabase = await createClient();
  try {
    return await getHouseDistributionData(supabase);
  } catch (error) {
    console.error("getHouseDistributions error:", error);
    return [];
  }
}

export interface HouseStudentRosterItem {
  id: string;
  jhsIndexNumber: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  photoPath?: string | null;
  gender: Gender;
  houseId: string | null;
  houseName: string;
  programName?: string;
  enrollmentStatus: string;
}

export async function getHouseStudentsForRebalance(): Promise<HouseStudentRosterItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("id, jhs_index_number, first_name, last_name, gender, house_id, photo_path, enrollment_status, house:houses(id, name), program:programs(name)")
    .eq("enrollment_status", "active")
    .order("last_name", { ascending: true });

  if (error || !data) {
    console.error("getHouseStudentsForRebalance error:", error);
    return [];
  }

  return data.map((s) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const house = s.house as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const program = s.program as any;
    return {
      id: s.id,
      jhsIndexNumber: s.jhs_index_number || "---",
      fullName: `${s.first_name} ${s.last_name}`,
      firstName: s.first_name,
      lastName: s.last_name,
      photoPath: s.photo_path,
      gender: s.gender as Gender,
      houseId: s.house_id as string | null,
      houseName: house?.name || "Unassigned",
      programName: program?.name || "General",
      enrollmentStatus: s.enrollment_status,
    };
  });
}

export interface TransferFilters {
  direction?: "in" | "out";
  status?: string;
  search?: string;
}

export interface TransferMetrics {
  total: number;
  transferInCount: number;
  transferOutCount: number;
  pendingCount: number;
  approvedCount: number;
  completedCount: number;
  rejectedCount: number;
}

export async function getTransfers(filters?: TransferFilters): Promise<StudentTransfer[]> {
  const supabase = await createClient();
  let query = supabase
    .from("student_transfers")
    .select(`
      *,
      student:student_id (
        id,
        jhs_index_number,
        first_name,
        last_name,
        gender
      )
    `)
    .order("created_at", { ascending: false });

  if (filters?.direction) {
    query = query.eq("direction", filters.direction);
  }
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.search) {
    const s = filters.search.trim();
    query = query.or(`transfer_reference.ilike.%${s}%,previous_school.ilike.%${s}%,destination_school.ilike.%${s}%,first_name.ilike.%${s}%,last_name.ilike.%${s}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getTransfers error:", error);
    return [];
  }
  return (data ?? []) as StudentTransfer[];
}

export async function getTransferById(id: string): Promise<StudentTransfer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_transfers")
    .select(`
      *,
      student:student_id (
        id,
        jhs_index_number,
        first_name,
        middle_name,
        last_name,
        gender,
        student_type,
        program_id,
        house_id
      )
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("getTransferById error:", error);
    return null;
  }
  return data as StudentTransfer;
}

export async function getTransferMetrics(): Promise<TransferMetrics> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_transfers")
    .select("direction, status");

  if (error || !data) {
    return {
      total: 0,
      transferInCount: 0,
      transferOutCount: 0,
      pendingCount: 0,
      approvedCount: 0,
      completedCount: 0,
      rejectedCount: 0,
    };
  }

  const metrics: TransferMetrics = {
    total: data.length,
    transferInCount: data.filter((t) => t.direction === "in").length,
    transferOutCount: data.filter((t) => t.direction === "out").length,
    pendingCount: data.filter((t) => t.status === "pending" || t.status === "submitted" || t.status === "under_review").length,
    approvedCount: data.filter((t) => t.status === "approved").length,
    completedCount: data.filter((t) => t.status === "completed").length,
    rejectedCount: data.filter((t) => t.status === "rejected").length,
  };

  return metrics;
}

export interface ActiveTransferStudent {
  id: string;
  jhs_index_number: string;
  fullName: string;
  gender: string;
  programName?: string;
  houseName?: string;
  balance: number;
}

export async function getActiveStudentsForTransfer(): Promise<ActiveTransferStudent[]> {
  const supabase = await createClient();
  const { data: students, error } = await supabase
    .from("students")
    .select(`
      id,
      jhs_index_number,
      first_name,
      last_name,
      gender,
      program:programs(name),
      house:houses(name)
    `)
    .eq("enrollment_status", "active")
    .order("last_name", { ascending: true })
    .limit(300);

  if (error || !students) {
    console.error("getActiveStudentsForTransfer error:", error);
    return [];
  }

  const studentIds = students.map((s) => s.id);
  const [{ data: charges }, { data: payments }] = await Promise.all([
    supabase.from("student_fee_charges").select("student_id, amount_due").in("student_id", studentIds),
    supabase.from("payments").select("student_id, amount").in("student_id", studentIds),
  ]);

  const chargeMap = new Map<string, number>();
  charges?.forEach((c: { student_id: string; amount_due: number }) => {
    chargeMap.set(c.student_id, (chargeMap.get(c.student_id) || 0) + Number(c.amount_due || 0));
  });

  const paymentMap = new Map<string, number>();
  payments?.forEach((p: { student_id: string; amount: number }) => {
    paymentMap.set(p.student_id, (paymentMap.get(p.student_id) || 0) + Number(p.amount || 0));
  });

  interface StudentBalanceRow {
    id: string;
    jhs_index_number: string;
    first_name: string;
    last_name: string;
    gender: Gender;
    program?: { name: string } | null;
    house?: { name: string } | null;
  }

  return (students as unknown as StudentBalanceRow[]).map((s) => {
    const due = chargeMap.get(s.id) || 0;
    const paid = paymentMap.get(s.id) || 0;
    const bal = Math.max(0, due - paid);

    return {
      id: s.id,
      jhs_index_number: s.jhs_index_number,
      fullName: `${s.first_name} ${s.last_name}`,
      gender: s.gender,
      programName: s.program?.name,
      houseName: s.house?.name,
      balance: bal,
    };
  });
}

export interface WaecStpCandidate {
  id: string;
  jhs_index_number: string;
  fullName: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string | null;
  programName: string | null;
  programCode: string | null;
  houseName: string | null;
  resultsCount: number;
  hasValidIndex: boolean;
  hasFullBiodata: boolean;
  hasProgram: boolean;
  hasContinuousAssessment: boolean;
  hasValidLetterGrades: boolean;
  hasQualitativeRemarks: boolean;
  isStpReady: boolean;
  missingRequirements: string[];
}

interface StudentResultRow {
  id: string;
  assessment_score: number | null;
  exam_score: number | null;
  total_score: number | null;
  grade: string | null;
  remarks: string | null;
  conduct: string | null;
  punctuality: string | null;
  teacher_comment: string | null;
}

interface WaecStudentRow {
  id: string;
  jhs_index_number: string;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string | null;
  program?: { name: string; code: string } | null;
  house?: { name: string } | null;
  results?: StudentResultRow[] | null;
}

export async function getWaecStpCandidates(): Promise<WaecStpCandidate[]> {
  const supabase = await createClient();

  const { data: students, error } = await supabase
    .from("students")
    .select(`
      id,
      jhs_index_number,
      first_name,
      last_name,
      gender,
      date_of_birth,
      program:programs(name, code),
      house:houses(name),
      results:student_results(
        id,
        assessment_score,
        exam_score,
        total_score,
        grade,
        remarks,
        conduct,
        punctuality,
        teacher_comment
      )
    `)
    .eq("enrollment_status", "active")
    .order("last_name", { ascending: true })
    .limit(300);

  if (error || !students) {
    console.error("getWaecStpCandidates error:", error);
    return [];
  }

  const validWaecGrades = new Set(["A1", "B2", "B3", "C4", "C5", "C6", "D7", "E8", "F9", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);

  return (students as unknown as WaecStudentRow[]).map((s) => {
    const missing: string[] = [];

    // 1. 10-digit index
    const hasValidIndex = /^\d{10}$/.test(s.jhs_index_number?.trim() || "");
    if (!hasValidIndex) missing.push("Invalid JHS Index Number (must be exactly 10 digits)");

    // 2. Full Biodata
    const hasFullBiodata = Boolean(s.first_name && s.last_name && s.gender && s.date_of_birth);
    if (!hasFullBiodata) {
      if (!s.date_of_birth) missing.push("Missing Date of Birth");
    }

    // 3. Program
    const hasProgram = Boolean(s.program?.name);
    if (!hasProgram) missing.push("No Academic Program Assigned");

    // 4. Assessment Scores (30% continuous + 70% exam)
    const results = s.results || [];
    const hasResults = results.length > 0;
    const hasContinuousAssessment = hasResults && results.every((r) => r.assessment_score != null && r.exam_score != null);
    if (!hasResults) missing.push("No Terminal Results / Continuous Assessments Recorded");
    else if (!hasContinuousAssessment) missing.push("Incomplete 30% Class / 70% Exam Score Breakdown");

    // 5. Letter Grades
    const hasValidLetterGrades = hasResults && results.every((r) => r.grade && validWaecGrades.has(r.grade));
    if (hasResults && !hasValidLetterGrades) missing.push("Non-Standard WAEC Grading");

    // 6. Qualitative Remarks
    const hasQualitativeRemarks = results.some((r) => r.remarks || r.teacher_comment || r.conduct);
    if (hasResults && !hasQualitativeRemarks) missing.push("Missing Teacher Remarks / Conduct");

    const isStpReady = hasValidIndex && hasFullBiodata && hasProgram && hasResults && hasContinuousAssessment;

    return {
      id: s.id,
      jhs_index_number: s.jhs_index_number,
      fullName: `${s.first_name} ${s.last_name}`,
      firstName: s.first_name,
      lastName: s.last_name,
      gender: s.gender,
      dateOfBirth: s.date_of_birth,
      programName: s.program?.name || null,
      programCode: s.program?.code || null,
      houseName: s.house?.name || null,
      resultsCount: results.length,
      hasValidIndex,
      hasFullBiodata,
      hasProgram,
      hasContinuousAssessment,
      hasValidLetterGrades,
      hasQualitativeRemarks,
      isStpReady,
      missingRequirements: missing,
    };
  });
}

export interface HouseDashboardData {
  house: House | null;
  isAssigned: boolean;
  totalStudents: number;
  maleCount: number;
  femaleCount: number;
  boardingCount: number;
  dayCount: number;
  capacity: number;
  occupancyPercent: number;
  houseMaster: Profile | null;
  houseMistress: Profile | null;
  students: (HouseStudentRosterItem & { studentType?: string; parentName?: string; parentPhone?: string })[];
  activeExeatsCount: number;
  recentExeats: HouseExeatRecord[];
}

export async function getHouseDashboardData(
  userId: string,
  userRole: UserRole,
  overrideHouseId?: string,
  houseResponsibility?: HouseResponsibility | null
): Promise<HouseDashboardData> {
  const supabase = await createClient();

  const isSenior =
    userRole === "admin" ||
    houseResponsibility === "senior_house_master" ||
    houseResponsibility === "senior_house_mistress";

  let targetHouseId: string | null = overrideHouseId || null;

  if (!targetHouseId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("house_id")
      .eq("id", userId)
      .single();

    targetHouseId = (profile as { house_id?: string | null })?.house_id || null;
  }

  // If Admin or Senior House staff with no specific house assigned, default to "all" houses
  if (!targetHouseId && isSenior) {
    targetHouseId = "all";
  }

  if (!targetHouseId) {
    return {
      house: null,
      isAssigned: false,
      totalStudents: 0,
      maleCount: 0,
      femaleCount: 0,
      boardingCount: 0,
      dayCount: 0,
      capacity: 150,
      occupancyPercent: 0,
      houseMaster: null,
      houseMistress: null,
      students: [],
      activeExeatsCount: 0,
      recentExeats: [],
    };
  }

  // --- SCHOOL-WIDE OVERSIGHT ("ALL" HOUSES) ---
  if (targetHouseId === "all" && isSenior) {
    const { data: allHousesData } = await supabase
      .from("houses")
      .select("*")
      .order("name", { ascending: true });

    const allHouses = allHousesData || [];
    const totalCapacity = allHouses.reduce((sum, h) => sum + (h.capacity ?? 150), 0);

    const houseData: House = {
      id: "all",
      name: "All Residential Houses",
      code: "ALL",
      capacity: totalCapacity,
      created_at: new Date().toISOString(),
      is_active: true,
    };

    // Fetch all active students across all houses
    const { data: studentRows } = await supabase
      .from("students")
      .select("id, jhs_index_number, first_name, middle_name, last_name, gender, student_type, enrollment_status, photo_path, parent_name, parent_phone, house_id, house:houses(name), program:programs(name)")
      .not("house_id", "is", null)
      .eq("enrollment_status", "active")
      .order("last_name", { ascending: true });

    const students = (studentRows || []).map((s) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const program = s.program as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const h = s.house as any;
      return {
        id: s.id,
        jhsIndexNumber: s.jhs_index_number,
        fullName: `${s.first_name} ${s.last_name}`,
        firstName: s.first_name,
        lastName: s.last_name,
        photoPath: s.photo_path,
        gender: s.gender as Gender,
        houseId: s.house_id,
        houseName: h?.name || "Assigned House",
        programName: program?.name || "General",
        enrollmentStatus: s.enrollment_status,
        studentType: s.student_type,
        parentName: s.parent_name,
        parentPhone: s.parent_phone,
      };
    });

    const maleCount = students.filter((s) => s.gender === "male").length;
    const femaleCount = students.filter((s) => s.gender === "female").length;
    const boardingCount = students.filter((s) => s.studentType === "boarding").length;
    const dayCount = students.filter((s) => s.studentType === "day").length;
    const total = students.length;
    const occupancyPercent = totalCapacity > 0 ? Math.round((total / totalCapacity) * 100) : 0;

    // Fetch exeats across all houses
    const { data: exeats } = await supabase
      .from("house_exeats")
      .select("*, student:students(id, jhs_index_number, first_name, last_name, gender, photo_path), issuer:profiles!house_exeats_issued_by_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(30);

    const activeExeatsCount = (exeats || []).filter((e) => e.status === "active").length;

    return {
      house: houseData,
      isAssigned: true,
      totalStudents: total,
      maleCount,
      femaleCount,
      boardingCount,
      dayCount,
      capacity: totalCapacity,
      occupancyPercent,
      houseMaster: null,
      houseMistress: null,
      students,
      activeExeatsCount,
      recentExeats: (exeats || []) as unknown as HouseExeatRecord[],
    };
  }

  // --- SINGLE HOUSE DETAIL ---
  const { data: houseData } = await supabase
    .from("houses")
    .select("*")
    .eq("id", targetHouseId)
    .single();

  // Fetch house leadership profiles
  const { data: leaders } = await supabase
    .from("profiles")
    .select("*")
    .eq("house_id", targetHouseId)
    .or("role.in.(house_master,house_mistress),house_responsibility.in.(house_master,house_mistress)");

  const houseMaster = leaders?.find((l) => l.role === "house_master" || l.house_responsibility === "house_master") || null;
  const houseMistress = leaders?.find((l) => l.role === "house_mistress" || l.house_responsibility === "house_mistress") || null;

  // Fetch active students in this house
  const { data: studentRows } = await supabase
    .from("students")
    .select("id, jhs_index_number, first_name, middle_name, last_name, gender, student_type, enrollment_status, photo_path, parent_name, parent_phone, program:programs(name)")
    .eq("house_id", targetHouseId)
    .eq("enrollment_status", "active")
    .order("last_name", { ascending: true });

  const students = (studentRows || []).map((s) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const program = s.program as any;
    return {
      id: s.id,
      jhsIndexNumber: s.jhs_index_number,
      fullName: `${s.first_name} ${s.last_name}`,
      firstName: s.first_name,
      lastName: s.last_name,
      photoPath: s.photo_path,
      gender: s.gender as Gender,
      houseId: targetHouseId,
      houseName: houseData?.name || "Assigned House",
      programName: program?.name || "General",
      enrollmentStatus: s.enrollment_status,
      studentType: s.student_type,
      parentName: s.parent_name,
      parentPhone: s.parent_phone,
    };
  });

  const maleCount = students.filter((s) => s.gender === "male").length;
  const femaleCount = students.filter((s) => s.gender === "female").length;
  const boardingCount = students.filter((s) => s.studentType === "boarding").length;
  const dayCount = students.filter((s) => s.studentType === "day").length;
  const capacity = houseData?.capacity ?? 150;
  const total = students.length;
  const occupancyPercent = capacity > 0 ? Math.round((total / capacity) * 100) : 0;

  // Fetch exeats for this house
  const { data: exeats } = await supabase
    .from("house_exeats")
    .select("*, student:students(id, jhs_index_number, first_name, last_name, gender, photo_path), issuer:profiles!house_exeats_issued_by_fkey(full_name)")
    .eq("house_id", targetHouseId)
    .order("created_at", { ascending: false })
    .limit(20);

  const activeExeatsCount = (exeats || []).filter((e) => e.status === "active").length;

  return {
    house: houseData as House | null,
    isAssigned: true,
    totalStudents: total,
    maleCount,
    femaleCount,
    boardingCount,
    dayCount,
    capacity,
    occupancyPercent,
    houseMaster: houseMaster as Profile | null,
    houseMistress: houseMistress as Profile | null,
    students,
    activeExeatsCount,
    recentExeats: (exeats || []) as unknown as HouseExeatRecord[],
  };
}

export async function getHouseExeats(houseId: string): Promise<HouseExeatRecord[]> {
  const supabase = await createClient();
  let query = supabase
    .from("house_exeats")
    .select("*, student:students(id, jhs_index_number, first_name, last_name, gender, photo_path), issuer:profiles!house_exeats_issued_by_fkey(full_name)")
    .order("created_at", { ascending: false });

  if (houseId && houseId !== "all") {
    query = query.eq("house_id", houseId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getHouseExeats error:", error);
    return [];
  }
  return (data || []) as unknown as HouseExeatRecord[];
}

