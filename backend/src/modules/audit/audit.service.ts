import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { SupabaseService } from "../../database/supabase.service";
import { QueryAuditDto } from "./dto/query-audit.dto";
import { PaginatedResult } from "../../common/pagination/pagination.dto";

@Injectable()
export class AuditService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly supabaseService: SupabaseService
  ) {}

  async findAll(query: QueryAuditDto): Promise<PaginatedResult<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = this.supabaseService.getAdminClient();
    let q = supabase
      .from("audit_logs")
      .select(
        `
        id,
        user_id,
        actor_role,
        action,
        module,
        target_identifier,
        description,
        severity,
        status,
        created_at,
        profile:user_id (id, full_name, email, role)
      `,
        { count: "exact" }
      );

    if (query.module) {
      q = q.eq("module", query.module);
    }
    if (query.severity) {
      q = q.eq("severity", query.severity);
    }
    if (query.status) {
      q = q.eq("status", query.status);
    }
    if (query.search) {
      const s = query.search.trim();
      q = q.or(`action.ilike.%${s}%,description.ilike.%${s}%,target_identifier.ilike.%${s}%`);
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

  async archive(
    retentionDays: number = 90,
    actorId?: string,
    actorRole?: string
  ): Promise<{ success: boolean; archived_count: number; retentionDays: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffIso = cutoffDate.toISOString();

    const supabase = this.supabaseService.getAdminClient();

    // 1. Try PostgreSQL RPC archive_audit_logs if defined
    try {
      const { data, error } = await this.databaseService.rpc("archive_audit_logs", {
        p_cutoff_timestamp: cutoffIso,
      });

      if (!error && data !== null) {
        return {
          success: true,
          archived_count: typeof data === "number" ? data : data?.archived_count ?? 0,
          retentionDays,
        };
      }
    } catch {
      // Fall through to table-based archival
    }

    // 2. Fallback: Copy to cold partition / archive table and clean hot table
    const { data: toArchive, error: fetchError } = await supabase
      .from("audit_logs")
      .select("*")
      .lt("created_at", cutoffIso)
      .limit(1000);

    if (fetchError || !toArchive || toArchive.length === 0) {
      return {
        success: true,
        archived_count: 0,
        retentionDays,
      };
    }

    // Insert into archive table if present
    await supabase.from("audit_logs_archive").insert(toArchive);

    const idsToDelete = toArchive.map((l) => l.id);
    const { error: deleteError } = await supabase
      .from("audit_logs")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      throw deleteError;
    }

    // Record audit event for the archival itself
    if (actorId) {
      await supabase.from("audit_logs").insert({
        user_id: actorId,
        actor_role: actorRole || "admin",
        action: "AUDIT_LOGS_ARCHIVED",
        module: "SECURITY",
        description: `Archived ${toArchive.length} logs older than ${retentionDays} days (${cutoffIso})`,
        severity: "SECURITY",
        status: "SUCCESS",
      });
    }

    return {
      success: true,
      archived_count: toArchive.length,
      retentionDays,
    };
  }
}
