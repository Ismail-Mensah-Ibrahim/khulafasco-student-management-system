"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { normalizeIndexNumber } from "@/lib/utils";
import {
  GENDERS,
  BOARDING_TYPES,
  FORM_LEVELS,
  type FormLevel,
  type Gender,
  type BoardingType,
} from "@/config/constants";
import { getHouseDistributionData, batchAssignBalancedHouses } from "@/lib/services/house-allocation";

export interface RawImportRow {
  jhs_index_number?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string;
  previous_school?: string;
  region?: string;
  district?: string;
  parent_name?: string;
  parent_relationship?: string;
  parent_phone?: string;
  parent_alt_phone?: string;
  parent_email?: string;
  parent_address?: string;
  program?: string;
  house?: string;
  student_type?: string;
  academic_year?: string;
  semester?: string;
  level?: string;
  class?: string;
  enrollment_status?: string;
}

export interface ValidatedImportRow {
  rowNumber: number;
  jhs_index_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  gender: Gender;
  date_of_birth: string;
  previous_school: string | null;
  region: string | null;
  district: string | null;
  parent_name: string;
  parent_relationship: string;
  parent_phone: string;
  parent_alt_phone: string | null;
  parent_email: string | null;
  parent_address: string | null;
  program_id: string;
  program_name: string;
  house_id: string | null;
  house_name: string | null;
  student_type: BoardingType;
  academic_year_id: string;
  academic_year_name: string;
  semester_id: string | null;
  semester_name: string | null;
  level: FormLevel;
  class_id: string | null;
  class_name: string | null;
  enrollment_status: string;
  isExisting: boolean;
}

export interface InvalidImportRow {
  rowNumber: number;
  jhs_index_number: string;
  raw: RawImportRow;
  errors: string[];
}

export interface ImportValidationSummary {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateInFileCount: number;
  existingInDbCount: number;
  validRows: ValidatedImportRow[];
  invalidRows: InvalidImportRow[];
  duplicateIndicesInFile: string[];
}

export interface ImportExecutionResult {
  success: boolean;
  message: string;
  totalProcessed: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: { row: number; index: string; error: string }[];
}

export async function validateStudentImportAction(
  rows: RawImportRow[]
): Promise<ImportValidationSummary> {
  await requireAdmin();
  const supabase = await createClient();

  // 1. Fetch reference lookup data from database
  const [
    { data: programs },
    { data: houses },
    { data: academicYears },
    { data: semesters },
    { data: classes },
  ] = await Promise.all([
    supabase.from("programs").select("id, name, code"),
    supabase.from("houses").select("id, name"),
    supabase.from("academic_years").select("id, name, is_current"),
    supabase.from("semesters").select("id, name, academic_year_id"),
    supabase.from("classes").select("id, name, form_level, academic_year_id"),
  ]);

  const programMap = new Map<string, { id: string; name: string }>();
  programs?.forEach((p) => {
    programMap.set(p.name.toLowerCase(), { id: p.id, name: p.name });
    programMap.set(p.code.toLowerCase(), { id: p.id, name: p.name });
  });

  const houseMap = new Map<string, { id: string; name: string }>();
  houses?.forEach((h) => houseMap.set(h.name.toLowerCase(), { id: h.id, name: h.name }));

  const yearMap = new Map<string, { id: string; name: string }>();
  let defaultYearId = "";
  let defaultYearName = "";
  academicYears?.forEach((y) => {
    yearMap.set(y.name.toLowerCase(), { id: y.id, name: y.name });
    if (y.is_current) {
      defaultYearId = y.id;
      defaultYearName = y.name;
    }
  });

  const semesterMap = new Map<string, { id: string; name: string; yearId: string }>();
  semesters?.forEach((s) => {
    semesterMap.set(`${s.academic_year_id}_${s.name.toLowerCase()}`, { id: s.id, name: s.name, yearId: s.academic_year_id });
    semesterMap.set(s.name.toLowerCase(), { id: s.id, name: s.name, yearId: s.academic_year_id });
  });

  const classMap = new Map<string, { id: string; name: string; level: string }>();
  classes?.forEach((c) => {
    classMap.set(c.name.toLowerCase(), { id: c.id, name: c.name, level: c.form_level });
  });

  // 2. Pre-fetch existing students to test for duplicates in DB
  const rawIndices = rows
    .map((r) => normalizeIndexNumber(r.jhs_index_number || ""))
    .filter(Boolean);

  const existingIndicesSet = new Set<string>();
  if (rawIndices.length > 0) {
    const { data: existingStudents } = await supabase
      .from("students")
      .select("jhs_index_number")
      .in("jhs_index_number", rawIndices);

    existingStudents?.forEach((s) => existingIndicesSet.add(s.jhs_index_number.toUpperCase()));
  }

  // 3. Process rows, detect file-level duplicates and validate constraints
  const seenInFile = new Map<string, number>();
  const duplicateIndicesInFile: string[] = [];
  const validRows: ValidatedImportRow[] = [];
  const invalidRows: InvalidImportRow[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // Accounting for header row (1-indexed)
    const rowErrors: string[] = [];

    // Normalize index number
    const normalizedIndex = normalizeIndexNumber(row.jhs_index_number || "");
    if (!normalizedIndex) {
      rowErrors.push("Missing or invalid JHS/BECE Index Number (must be exactly 10 digits).");
    } else if (normalizedIndex.length !== 10) {
      rowErrors.push(`JHS Index Number must be exactly 10 digits (got ${normalizedIndex.length}).`);
    } else {
      // Check file-level duplicate
      if (seenInFile.has(normalizedIndex)) {
        rowErrors.push(`Duplicate index number in file (first seen at row ${seenInFile.get(normalizedIndex)}).`);
        duplicateIndicesInFile.push(normalizedIndex);
      } else {
        seenInFile.set(normalizedIndex, rowNumber);
      }
    }

    // Required names
    const firstName = (row.first_name || "").trim();
    const lastName = (row.last_name || "").trim();
    const middleName = (row.middle_name || "").trim() || null;

    if (!firstName) rowErrors.push("First name is required.");
    if (!lastName) rowErrors.push("Last name is required.");

    // Gender
    const genderRaw = (row.gender || "").toLowerCase().trim();
    if (!GENDERS.includes(genderRaw as Gender)) {
      rowErrors.push(`Invalid gender "${row.gender}". Allowed: male, female.`);
    }

    // Date of Birth
    const dobRaw = (row.date_of_birth || "").trim();
    if (!dobRaw) {
      rowErrors.push("Date of birth is required (YYYY-MM-DD).");
    } else {
      const parsedDate = new Date(dobRaw);
      if (isNaN(parsedDate.getTime())) {
        rowErrors.push(`Invalid date of birth format "${dobRaw}". Use YYYY-MM-DD.`);
      }
    }

    // Parent details
    const parentName = (row.parent_name || "").trim();
    const parentPhone = (row.parent_phone || "").trim();
    const parentRel = (row.parent_relationship || "Guardian").trim();

    if (!parentName) rowErrors.push("Parent/Guardian name is required.");
    if (!parentPhone) rowErrors.push("Parent/Guardian phone is required.");

    // Program
    const progRaw = (row.program || "").toLowerCase().trim();
    const matchedProgram = programMap.get(progRaw);
    if (!matchedProgram) {
      rowErrors.push(`Program "${row.program || ""}" not found. Select a valid school program.`);
    }

    // House (optional)
    const houseRaw = (row.house || "").toLowerCase().trim();
    const matchedHouse = houseRaw ? houseMap.get(houseRaw) : null;
    if (houseRaw && !matchedHouse) {
      rowErrors.push(`House "${row.house}" not recognized.`);
    }

    // Student type (boarding / day)
    const typeRaw = (row.student_type || "day").toLowerCase().trim();
    if (!BOARDING_TYPES.includes(typeRaw as BoardingType)) {
      rowErrors.push(`Student type "${row.student_type}" must be 'boarding' or 'day'.`);
    }

    // Academic year
    const yearRaw = (row.academic_year || "").toLowerCase().trim();
    let resolvedYearId = defaultYearId;
    let resolvedYearName = defaultYearName;

    if (yearRaw) {
      const matchedYear = yearMap.get(yearRaw);
      if (matchedYear) {
        resolvedYearId = matchedYear.id;
        resolvedYearName = matchedYear.name;
      } else {
        rowErrors.push(`Academic year "${row.academic_year}" not found in system.`);
      }
    } else if (!defaultYearId && academicYears && academicYears.length > 0) {
      resolvedYearId = academicYears[0].id;
      resolvedYearName = academicYears[0].name;
    }

    // Form level
    const levelRaw = (row.level || "Form 1").trim();
    if (!FORM_LEVELS.includes(levelRaw as FormLevel)) {
      rowErrors.push(`Form level "${row.level}" must be Form 1, Form 2, or Form 3.`);
    }

    // Class (optional)
    const classRaw = (row.class || "").toLowerCase().trim();
    const matchedClass = classRaw ? classMap.get(classRaw) : null;

    // Semester (optional)
    const semRaw = (row.semester || "").toLowerCase().trim();
    const matchedSemester = semRaw ? semesterMap.get(`${resolvedYearId}_${semRaw}`) || semesterMap.get(semRaw) : null;

    const isExisting = existingIndicesSet.has(normalizedIndex);

    if (rowErrors.length > 0) {
      invalidRows.push({
        rowNumber,
        jhs_index_number: normalizedIndex || "UNKNOWN",
        raw: row,
        errors: rowErrors,
      });
    } else {
      validRows.push({
        rowNumber,
        jhs_index_number: normalizedIndex,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        gender: genderRaw as Gender,
        date_of_birth: dobRaw,
        previous_school: (row.previous_school || "").trim() || null,
        region: (row.region || "").trim() || null,
        district: (row.district || "").trim() || null,
        parent_name: parentName,
        parent_relationship: parentRel,
        parent_phone: parentPhone,
        parent_alt_phone: (row.parent_alt_phone || "").trim() || null,
        parent_email: (row.parent_email || "").trim() || null,
        parent_address: (row.parent_address || "").trim() || null,
        program_id: matchedProgram!.id,
        program_name: matchedProgram!.name,
        house_id: matchedHouse ? matchedHouse.id : null,
        house_name: matchedHouse ? matchedHouse.name : null,
        student_type: typeRaw as BoardingType,
        academic_year_id: resolvedYearId,
        academic_year_name: resolvedYearName,
        semester_id: matchedSemester ? matchedSemester.id : null,
        semester_name: matchedSemester ? matchedSemester.name : null,
        level: levelRaw as FormLevel,
        class_id: matchedClass ? matchedClass.id : null,
        class_name: matchedClass ? matchedClass.name : null,
        enrollment_status: (row.enrollment_status || "active").toLowerCase().trim(),
        isExisting,
      });
    }
  });

  return {
    totalRows: rows.length,
    validCount: validRows.length,
    invalidCount: invalidRows.length,
    duplicateInFileCount: duplicateIndicesInFile.length,
    existingInDbCount: validRows.filter((r) => r.isExisting).length,
    validRows,
    invalidRows,
    duplicateIndicesInFile,
  };
}

export async function executeStudentImportAction(
  rows: ValidatedImportRow[],
  mode: "new_only" | "update_existing",
  houseAllocationMode: "auto_balanced" | "csv_column" | "unassigned" = "auto_balanced"
): Promise<ImportExecutionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  if (!rows || rows.length === 0) {
    return {
      success: false,
      message: "No rows provided for import.",
      totalProcessed: 0,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      errors: [],
    };
  }

  // Audit import start
  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "STUDENT_IMPORT_STARTED",
    module: "STUDENT",
    description: `Initiated bulk student import for ${rows.length} records (mode: ${mode}, houseMode: ${houseAllocationMode})`,
    severity: "INFO",
    status: "SUCCESS",
    metadata: { total_rows: rows.length, mode, houseAllocationMode },
  });

  let processedRows = rows;
  if (houseAllocationMode === "auto_balanced") {
    try {
      const distributions = await getHouseDistributionData(supabase);
      if (distributions.length > 0) {
        const batchResult = batchAssignBalancedHouses(rows, distributions);
        processedRows = batchResult.assignedItems.map((item) => ({
          ...item,
          house_id: item.house_id,
          house_name: item.house_name,
        }));
      }
    } catch (allocErr) {
      console.warn("Auto-balance during bulk import fallback:", allocErr);
    }
  } else if (houseAllocationMode === "unassigned") {
    processedRows = rows.map((r) => ({ ...r, house_id: null, house_name: null }));
  }

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const executionErrors: { row: number; index: string; error: string }[] = [];

  for (const row of processedRows) {
    try {
      if (row.isExisting && mode === "new_only") {
        skippedCount++;
        continue;
      }

      // Upsert into students table
      const { data: studentRecord, error: studentError } = await supabase
        .from("students")
        .upsert(
          {
            jhs_index_number: row.jhs_index_number,
            first_name: row.first_name,
            middle_name: row.middle_name,
            last_name: row.last_name,
            gender: row.gender,
            date_of_birth: row.date_of_birth,
            previous_school: row.previous_school,
            region: row.region,
            district: row.district,
            parent_name: row.parent_name,
            parent_relationship: row.parent_relationship,
            parent_phone: row.parent_phone,
            parent_alt_phone: row.parent_alt_phone,
            parent_email: row.parent_email,
            parent_address: row.parent_address,
            program_id: row.program_id,
            house_id: row.house_id,
            student_type: row.student_type,
            academic_year_id: row.academic_year_id,
            enrollment_status: row.enrollment_status,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "jhs_index_number" }
        )
        .select("id")
        .single();

      if (studentError || !studentRecord) {
        throw new Error(studentError?.message || "Failed to upsert student record.");
      }

      const studentId = studentRecord.id;

      // Upsert student_academic_enrollments history record
      await supabase.from("student_academic_enrollments").upsert(
        {
          student_id: studentId,
          academic_year_id: row.academic_year_id,
          semester_id: row.semester_id,
          level: row.level,
          class_id: row.class_id,
          enrollment_status: row.enrollment_status,
          promotion_status: "pending",
          created_by: session.id,
          updated_by: session.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,academic_year_id" }
      );

      // If class is assigned, also record in student_class_assignments
      if (row.class_id) {
        await supabase.from("student_class_assignments").upsert(
          {
            student_id: studentId,
            class_id: row.class_id,
            academic_year_id: row.academic_year_id,
          },
          { onConflict: "student_id,academic_year_id" }
        );
      }

      if (row.isExisting) {
        updatedCount++;
      } else {
        insertedCount++;
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown database error";
      executionErrors.push({
        row: row.rowNumber,
        index: row.jhs_index_number,
        error: errorMessage,
      });
    }
  }

  // Audit import completion
  const isOverallSuccess = executionErrors.length === 0;
  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: isOverallSuccess ? "STUDENT_IMPORT_COMPLETED" : "STUDENT_IMPORT_PARTIAL",
    module: "STUDENT",
    description: `Student bulk import finished: ${insertedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped, ${executionErrors.length} errors.`,
    severity: executionErrors.length > 0 ? "WARNING" : "INFO",
    status: isOverallSuccess ? "SUCCESS" : "FAILED",
    metadata: {
      total: rows.length,
      inserted: insertedCount,
      updated: updatedCount,
      skipped: skippedCount,
      failed: executionErrors.length,
    },
  });

  revalidatePath("/students");
  revalidatePath("/dashboard");
  revalidatePath("/admin/classes");
  revalidatePath("/it/dashboard");
  revalidatePath("/it/audit");

  return {
    success: isOverallSuccess,
    message: `Import processed: ${insertedCount} new student(s) enrolled, ${updatedCount} updated, ${skippedCount} skipped, ${executionErrors.length} error(s).`,
    totalProcessed: rows.length,
    insertedCount,
    updatedCount,
    skippedCount,
    errorCount: executionErrors.length,
    errors: executionErrors,
  };
}
