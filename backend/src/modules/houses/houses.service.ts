import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../../database/supabase.service";

@Injectable()
export class HousesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(): Promise<any[]> {
    const supabase = this.supabaseService.getAdminClient();

    // 1. Fetch houses
    const { data: houses, error: houseError } = await supabase
      .from("houses")
      .select("id, name, code, capacity, is_active, created_at")
      .order("name", { ascending: true });

    if (houseError) {
      throw houseError;
    }

    // 2. Fetch student house allocations and genders
    const { data: students, error: studentError } = await supabase
      .from("students")
      .select("id, house_id, gender")
      .not("house_id", "is", null)
      .eq("enrollment_status", "active");

    if (studentError) {
      throw studentError;
    }

    // Aggregate counts
    const occupancyMap: Record<
      string,
      { total: number; male: number; female: number }
    > = {};

    for (const student of students ?? []) {
      if (!student.house_id) continue;
      if (!occupancyMap[student.house_id]) {
        occupancyMap[student.house_id] = { total: 0, male: 0, female: 0 };
      }
      occupancyMap[student.house_id].total++;
      if (student.gender?.toLowerCase() === "male") {
        occupancyMap[student.house_id].male++;
      } else if (student.gender?.toLowerCase() === "female") {
        occupancyMap[student.house_id].female++;
      }
    }

    return (houses ?? []).map((h) => {
      const stats = occupancyMap[h.id] ?? { total: 0, male: 0, female: 0 };
      const capacity = h.capacity ?? 150;
      return {
        ...h,
        total_occupants: stats.total,
        male_count: stats.male,
        female_count: stats.female,
        occupancy_rate: Number(((stats.total / capacity) * 100).toFixed(1)),
        available_slots: Math.max(0, capacity - stats.total),
      };
    });
  }

  async getOccupants(houseId: string): Promise<any[]> {
    const supabase = this.supabaseService.getAdminClient();

    // Verify house exists
    const { data: house, error: houseError } = await supabase
      .from("houses")
      .select("id, name")
      .eq("id", houseId)
      .single();

    if (houseError || !house) {
      throw new NotFoundException(`House with ID "${houseId}" not found.`);
    }

    const { data: students, error: studentError } = await supabase
      .from("students")
      .select(
        `
        id,
        first_name,
        middle_name,
        last_name,
        gender,
        jhs_index_number,
        admission_number,
        track,
        enrollment_status
      `
      )
      .eq("house_id", houseId)
      .eq("enrollment_status", "active")
      .order("last_name", { ascending: true });

    if (studentError) {
      throw studentError;
    }

    return students ?? [];
  }
}
