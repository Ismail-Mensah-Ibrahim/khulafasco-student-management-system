import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../../database/supabase.service";
import { FindStaffDto } from "./dto/find-staff.dto";
import { PaginatedResult } from "../../common/pagination/pagination.dto";

@Injectable()
export class StaffService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(query: FindStaffDto): Promise<PaginatedResult<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = this.supabaseService.getAdminClient();
    let q = supabase
      .from("profiles")
      .select(
        `
        id,
        full_name,
        email,
        phone,
        role,
        additional_roles,
        house_responsibility,
        assigned_house_id,
        is_active,
        created_at
      `,
        { count: "exact" }
      );

    if (query.role) {
      q = q.eq("role", query.role);
    }
    if (query.is_active !== undefined) {
      q = q.eq("is_active", query.is_active);
    }
    if (query.search) {
      const s = query.search.trim();
      q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%`);
    }

    q = q.order("full_name", { ascending: true }).range(from, to);

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

  async findById(id: string): Promise<any> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Staff profile with ID "${id}" not found.`);
    }

    return data;
  }

  async getTimetable(staffId: string): Promise<any> {
    // Verify staff exists
    await this.findById(staffId);

    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
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
      .eq("teacher_id", staffId)
      .order("day_of_week", { ascending: true });

    if (error) {
      throw error;
    }

    return {
      teacher_id: staffId,
      periods: data ?? [],
    };
  }
}
