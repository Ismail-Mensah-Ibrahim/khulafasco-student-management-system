import { createClient } from "@/lib/supabase/server";
import { normalizeIndexNumber } from "@/lib/utils";
import type { AcademicYear, House, Program, Student } from "@/types";

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

export async function getPrograms(): Promise<Program[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    // Log and return an empty list instead of throwing so the dashboard
    // page can render even when a transient DB/storage error occurs.
    // The error is logged for diagnostics.
    console.error("getPrograms error:", error);
    return [] as Program[];
  }

  return (data ?? []) as Program[];
}

export async function getHouses(): Promise<House[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("houses")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
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
    countStudents({ academicYearId, studentType: "Boarding" }),
    countStudents({ academicYearId, studentType: "Day" }),
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
