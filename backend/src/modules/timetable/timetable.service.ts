import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../database/supabase.service";
import { CheckConflictDto } from "./dto/check-conflict.dto";

@Injectable()
export class TimetableService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getTeacherSchedule(teacherId: string): Promise<any> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: periods, error } = await supabase
      .from("timetable_periods")
      .select(
        `
        id,
        day_of_week,
        start_time,
        end_time,
        subject:subject_id (id, name, code),
        class:class_id (id, name, code)
      `
      )
      .eq("teacher_id", teacherId)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      throw error;
    }

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const scheduleByDay: Record<string, any[]> = {};

    for (const day of days) {
      scheduleByDay[day] = [];
    }

    for (const p of periods ?? []) {
      const day = p.day_of_week;
      if (scheduleByDay[day]) {
        scheduleByDay[day].push(p);
      }
    }

    return {
      teacher_id: teacherId,
      total_periods: periods?.length ?? 0,
      schedule: scheduleByDay,
    };
  }

  async checkConflict(dto: CheckConflictDto): Promise<{
    hasConflict: boolean;
    conflicts: string[];
  }> {
    const supabase = this.supabaseService.getAdminClient();
    const conflicts: string[] = [];

    // 1. Check teacher collision
    let teacherQuery = supabase
      .from("timetable_periods")
      .select("id, class:class_id(name)")
      .eq("teacher_id", dto.teacher_id)
      .eq("day_of_week", dto.day_of_week)
      .eq("id", dto.period_id);

    if (dto.exclude_entry_id) {
      teacherQuery = teacherQuery.neq("id", dto.exclude_entry_id);
    }

    const { data: teacherCollisions } = await teacherQuery;
    if (teacherCollisions && teacherCollisions.length > 0) {
      const clsName =
        (teacherCollisions[0] as any)?.class?.name ?? "another class";
      conflicts.push(
        `Teacher is already scheduled to teach ${clsName} on ${dto.day_of_week}.`
      );
    }

    // 2. Check class collision
    let classQuery = supabase
      .from("timetable_periods")
      .select("id, subject:subject_id(name)")
      .eq("class_id", dto.class_id)
      .eq("day_of_week", dto.day_of_week)
      .eq("id", dto.period_id);

    if (dto.exclude_entry_id) {
      classQuery = classQuery.neq("id", dto.exclude_entry_id);
    }

    const { data: classCollisions } = await classQuery;
    if (classCollisions && classCollisions.length > 0) {
      const subjName =
        (classCollisions[0] as any)?.subject?.name ?? "another subject";
      conflicts.push(
        `Class already has ${subjName} scheduled during this period on ${dto.day_of_week}.`
      );
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }
}
