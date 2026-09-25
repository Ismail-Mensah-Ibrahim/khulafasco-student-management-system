/**
 * Centralized Audit Logging and Archival Service
 */

import { createClient } from "@/lib/supabase/server";
import { AuditModule, AuditSeverity } from "@/config/constants";

export interface LogAuditParams {
  userId?: string | null;
  actorRole?: string | null;
  action: string;
  module?: AuditModule | string;
  entityType?: string;
  entityId?: string | null;
  targetIdentifier?: string | null;
  description: string;
  severity?: AuditSeverity | string;
  status?: "SUCCESS" | "FAILED" | "WARNING";
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export async function logAuditEvent(params: LogAuditParams): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("audit_logs").insert({
      user_id: params.userId || null,
      actor_role: params.actorRole || null,
      action: params.action,
      module: params.module || "SYSTEM",
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      target_identifier: params.targetIdentifier || null,
      description: params.description,
      severity: params.severity || "INFO",
      status: params.status || "SUCCESS",
      before_data: params.beforeData || null,
      after_data: params.afterData || null,
      metadata: params.metadata || null,
    });
  } catch (err) {
    console.error("Failed to write audit log event:", err);
  }
}

export async function archiveOldAuditLogs(
  olderThanDays?: number
): Promise<{ success: boolean; count: number; retentionDays: number; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("archive_audit_logs", {
      p_older_than_days: olderThanDays || null,
    });

    if (error) {
      return { success: false, count: 0, retentionDays: 365, error: error.message };
    }

    const res = data as { archived_count?: number; retention_days?: number };
    return {
      success: true,
      count: res?.archived_count ?? 0,
      retentionDays: res?.retention_days ?? 365,
    };
  } catch (err: unknown) {
    return {
      success: false,
      count: 0,
      retentionDays: 365,
      error: err instanceof Error ? err.message : "Failed to execute audit archival",
    };
  }
}

export async function searchArchivedAuditLogs(
  searchQuery?: string,
  limit: number = 100
): Promise<Record<string, unknown>[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("search_audit_archive", {
      p_search: searchQuery || null,
      p_limit: limit,
    });

    if (error) {
      console.error("search_audit_archive error:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("searchArchivedAuditLogs error:", err);
    return [];
  }
}
