import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { SupabaseService } from "../../database/supabase.service";
import { FindStudentsDto } from "./dto/find-students.dto";
import { PaginatedResult } from "../../common/pagination/pagination.dto";

@Injectable()
export class StudentsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly supabaseService: SupabaseService
  ) {}

  async findAll(query: FindStudentsDto): Promise<PaginatedResult<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = this.supabaseService.getAdminClient();
    let q = supabase
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
        enrollment_status,
        created_at,
        house:house_id (id, name, code)
      `,
        { count: "exact" }
      );

    if (query.house_id) {
      q = q.eq("house_id", query.house_id);
    }
    if (query.track) {
      q = q.eq("track", query.track);
    }
    if (query.status) {
      q = q.eq("enrollment_status", query.status);
    }
    if (query.search) {
      const s = query.search.trim();
      q = q.or(
        `first_name.ilike.%${s}%,last_name.ilike.%${s}%,jhs_index_number.ilike.%${s}%,admission_number.ilike.%${s}%`
      );
    }

    q = q.order("created_at", { ascending: false }).range(from, to);

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
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id
      );

    let query = supabase
      .from("students")
      .select(
        `
        *,
        house:house_id (id, name, code),
        class_enrollments (
          id,
          academic_year_id,
          semester_id,
          class_id,
          is_current,
          classes (id, name, code)
        )
      `
      );

    query = isUuid ? query.eq("id", id) : query.eq("jhs_index_number", id);

    const { data, error } = await query.single();
    if (error || !data) {
      throw new NotFoundException(`Student with identifier "${id}" not found.`);
    }

    return data;
  }

  async getBalances(id: string): Promise<any> {
    const supabase = this.supabaseService.getAdminClient();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id
      );

    let studentId = id;
    if (!isUuid) {
      const student = await this.findById(id);
      studentId = student.id;
    }

    const { data, error } = await supabase
      .from("student_fee_balances")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (
      data ?? {
        student_id: studentId,
        total_billed: 0,
        total_paid: 0,
        outstanding_balance: 0,
      }
    );
  }

  async getSTPReadiness(id: string): Promise<any> {
    const student = await this.findById(id);
    const { data, error } = await this.databaseService.rpc(
      "validate_stp_readiness",
      {
        p_student_id: student.id,
      }
    );

    if (error) {
      throw error;
    }

    return (
      data ?? {
        is_ready: false,
        missing_fields: ["STP validation record missing"],
      }
    );
  }
}
