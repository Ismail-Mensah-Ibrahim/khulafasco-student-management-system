/**
 * Timetable Engine & Teacher Schedule Service
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { TimetableDay, TIMETABLE_DAYS } from "@/config/constants";

export interface TimetableSlot {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string | null;
  teacherName: string | null;
  academicYearId: string;
  dayOfWeek: TimetableDay;
  periodNumber: number;
  startTime: string;
  endTime: string;
  room: string | null;
  isPublished: boolean;
}

export interface TeacherWeeklySchedule {
  teacherId: string;
  teacherName: string;
  totalPeriods: number;
  totalClasses: number;
  totalSubjects: number;
  days: {
    day: TimetableDay;
    periods: {
      periodNumber: number;
      startTime: string;
      endTime: string;
      className: string;
      subjectName: string;
      room: string | null;
    }[];
  }[];
}

export class TimetableService {
  static revalidateTimetablePaths() {
    revalidatePath("/academic/timetable");
    revalidatePath("/teacher/timetable");
    revalidatePath("/teacher/dashboard");
    revalidatePath("/academic/dashboard");
  }

  /**
   * Validate potential timetable collision
   */
  static async checkConflict(params: {
    classId: string;
    dayOfWeek: string;
    periodNumber: number;
    teacherId?: string | null;
    excludeId?: string;
  }): Promise<{ hasConflict: boolean; reason?: string }> {
    const supabase = await createClient();

    // 1. Class conflict
    let classQuery = supabase
      .from("timetables")
      .select("id")
      .eq("class_id", params.classId)
      .eq("day_of_week", params.dayOfWeek)
      .eq("period_number", params.periodNumber);

    if (params.excludeId) {
      classQuery = classQuery.neq("id", params.excludeId);
    }

    const { data: classConflict } = await classQuery.maybeSingle();
    if (classConflict) {
      return {
        hasConflict: true,
        reason: `This class already has a scheduled subject for Period ${params.periodNumber} on ${params.dayOfWeek}.`,
      };
    }

    // 2. Teacher conflict
    if (params.teacherId) {
      let teacherQuery = supabase
        .from("timetables")
        .select("id")
        .eq("teacher_id", params.teacherId)
        .eq("day_of_week", params.dayOfWeek)
        .eq("period_number", params.periodNumber);

      if (params.excludeId) {
        teacherQuery = teacherQuery.neq("id", params.excludeId);
      }

      const { data: teacherConflict } = await teacherQuery.maybeSingle();
      if (teacherConflict) {
        return {
          hasConflict: true,
          reason: `This teacher is already assigned to another class during Period ${params.periodNumber} on ${params.dayOfWeek}.`,
        };
      }
    }

    return { hasConflict: false };
  }

  /**
   * Query the complete organized weekly schedule for an individual teacher
   */
  static async getTeacherSchedule(
    teacherId: string,
    academicYearId?: string
  ): Promise<TeacherWeeklySchedule | null> {
    const supabase = await createClient();

    // Fetch teacher profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", teacherId)
      .single();

    if (!profile) return null;

    let query = supabase
      .from("timetables")
      .select(`
        id,
        period_number,
        day_of_week,
        start_time,
        end_time,
        room,
        is_published,
        class:classes(id, name),
        subject:subjects(id, name, code)
      `)
      .eq("teacher_id", teacherId)
      .eq("is_published", true)
      .order("period_number", { ascending: true });

    if (academicYearId) {
      query = query.eq("academic_year_id", academicYearId);
    }

    const { data: entries, error } = await query;
    if (error) {
      console.error("getTeacherSchedule error:", error);
      return null;
    }

    const distinctClasses = new Set<string>();
    const distinctSubjects = new Set<string>();

    interface ScheduledPeriod {
      periodNumber: number;
      startTime: string;
      endTime: string;
      className: string;
      subjectName: string;
      room: string | null;
    }

    const dayMap = new Map<TimetableDay, ScheduledPeriod[]>();
    for (const day of TIMETABLE_DAYS) {
      dayMap.set(day, []);
    }

    for (const e of entries || []) {
      const day = e.day_of_week as TimetableDay;
      const classObj = e.class as unknown as { name?: string } | null;
      const subjectObj = e.subject as unknown as { name?: string } | null;
      const className = classObj?.name || "Unknown Class";
      const subjectName = subjectObj?.name || "Unknown Subject";

      distinctClasses.add(className);
      distinctSubjects.add(subjectName);

      if (dayMap.has(day)) {
        dayMap.get(day)!.push({
          periodNumber: e.period_number,
          startTime: e.start_time,
          endTime: e.end_time,
          className,
          subjectName,
          room: e.room,
        });
      }
    }

    const days = TIMETABLE_DAYS.map((day) => ({
      day,
      periods: dayMap.get(day) || [],
    }));

    return {
      teacherId: profile.id,
      teacherName: profile.full_name,
      totalPeriods: (entries || []).length,
      totalClasses: distinctClasses.size,
      totalSubjects: distinctSubjects.size,
      days,
    };
  }
}
