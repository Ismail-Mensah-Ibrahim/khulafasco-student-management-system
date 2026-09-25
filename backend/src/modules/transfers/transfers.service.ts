import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { SupabaseService } from "../../database/supabase.service";

@Injectable()
export class TransfersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly supabaseService: SupabaseService
  ) {}

  async findAll(): Promise<any[]> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from("student_transfers")
      .select(
        `
        id,
        transfer_type,
        status,
        approval_status,
        reference_number,
        previous_school,
        destination_school,
        reason,
        created_at,
        student:student_id (
          id,
          first_name,
          middle_name,
          last_name,
          jhs_index_number
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async getNextReference(): Promise<{ reference: string }> {
    const { data, error } = await this.databaseService.rpc<string>(
      "generate_transfer_reference"
    );

    if (error) {
      throw error;
    }

    return {
      reference: data ?? `STP-${new Date().getFullYear()}-000001`,
    };
  }
}
