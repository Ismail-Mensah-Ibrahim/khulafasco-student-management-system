"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, verifySession } from "@/lib/dal";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export interface PendingOperation {
  id: string;
  operation_type: string;
  status: "pending" | "retrying" | "completed" | "failed";
  entity_name: string | null;
  entity_index: string | null;
  payload: Record<string, unknown>;
  error_message: string | null;
  retry_count: number;
  idempotency_key: string;
  created_by: string | null;
  last_attempted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getPendingOperations(): Promise<PendingOperation[]> {
  await requireAdmin();
  const supabase = await createClient();

  // pending_operations table is new — cast until Supabase types regenerate after migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("pending_operations")
    .select("*")
    .in("status", ["pending", "retrying", "failed"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading pending operations:", error);
    return [];
  }

  return (data ?? []) as PendingOperation[];
}

export async function getPendingOperationsSummary(): Promise<{
  total_pending: number;
  total_failed: number;
  total_completed: number;
}> {
  await requireAdmin();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .rpc("get_pending_operations_summary")
    .single();

  if (error || !data) {
    return { total_pending: 0, total_failed: 0, total_completed: 0 };
  }

  return data as { total_pending: number; total_failed: number; total_completed: number };
}

// ---------------------------------------------------------------------------
// Create (called internally when an operation fails transiently)
// ---------------------------------------------------------------------------

export async function createPendingOperation(params: {
  operationType: string;
  entityName: string;
  entityIndex: string;
  payload: Record<string, unknown>;
  errorMessage: string;
  idempotencyKey: string;
}): Promise<boolean> {
  try {
    const session = await verifySession();
    const adminClient = createAdminClient();
    if (!adminClient) {
      console.error("createPendingOperation: admin client unavailable (SERVICE_ROLE_KEY missing)");
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any).from("pending_operations").upsert(
      {
        operation_type: params.operationType,
        entity_name: params.entityName,
        entity_index: params.entityIndex,
        payload: params.payload,
        error_message: params.errorMessage,
        idempotency_key: params.idempotencyKey,
        created_by: session.id,
        status: "pending",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "idempotency_key" }
    );

    if (error) {
      console.error("Failed to record pending operation:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error in createPendingOperation:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Retry
// ---------------------------------------------------------------------------

export async function retryPendingOperationAction(
  operationId: string
): Promise<{ success: boolean; message: string }> {
  await requireAdmin();
  const session = await verifySession();

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { success: false, message: "Admin client unavailable — SUPABASE_SERVICE_ROLE_KEY not configured." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = adminClient as any;

  // 1. Fetch pending operation
  const { data: op, error: fetchErr } = await db
    .from("pending_operations")
    .select("*")
    .eq("id", operationId)
    .single();

  if (fetchErr || !op) {
    return { success: false, message: "Pending operation record not found." };
  }

  if (op.status === "completed") {
    return { success: true, message: "Operation is already marked as completed." };
  }

  // 2. Mark as retrying
  await db
    .from("pending_operations")
    .update({
      status: "retrying",
      retry_count: (op.retry_count ?? 0) + 1,
      last_attempted_at: new Date().toISOString(),
    })
    .eq("id", operationId);

  // 3. Execute based on type
  try {
    if (op.operation_type === "enrollment") {
      const p = op.payload as Record<string, unknown>;
      const { data: student, error: rpcErr } = await db.rpc("enroll_student", {
        p_jhs_index_number: p.jhs_index_number,
        p_first_name: p.first_name,
        p_middle_name: p.middle_name ?? "",
        p_last_name: p.last_name,
        p_gender: p.gender,
        p_date_of_birth: p.date_of_birth,
        p_previous_school: p.previous_school ?? null,
        p_region: p.region ?? null,
        p_district: p.district ?? null,
        p_parent_name: p.parent_name ?? null,
        p_parent_relationship: p.parent_relationship ?? null,
        p_parent_phone: p.parent_phone ?? null,
        p_parent_alt_phone: p.parent_alt_phone ?? null,
        p_parent_email: p.parent_email ?? null,
        p_parent_address: p.parent_address ?? null,
        p_program_id: p.program_id,
        p_house_id: p.house_id ?? null,
        p_student_type: p.student_type,
        p_academic_year_id: p.academic_year_id,
        p_photo_path: p.photo_path ?? null,
      });

      if (rpcErr) throw new Error(rpcErr.message);

      await db
        .from("pending_operations")
        .update({ status: "completed", completed_at: new Date().toISOString(), error_message: null })
        .eq("id", operationId);

      await db.from("audit_logs").insert({
        user_id: session.id,
        action: "RETRY_PENDING_OPERATION_SUCCESS",
        entity_name: "students",
        entity_id: (student as { id?: string })?.id ?? null,
        details: { operation_id: operationId, type: op.operation_type, index: op.entity_index },
      });

      revalidatePath("/students");
      revalidatePath("/dashboard");
      return {
        success: true,
        message: `Successfully enrolled student ${String(op.entity_name ?? "")} (${String(op.entity_index ?? "")}).`,
      };
    }

    if (op.operation_type === "payment") {
      const p = op.payload as Record<string, unknown>;
      const { data: payment, error: rpcErr } = await db.rpc("record_student_payment", {
        p_jhs_index_number: p.jhs_index_number,
        p_amount: p.amount,
        p_payment_method: p.payment_method,
        p_allocations: p.allocations ?? [],
        p_reference: p.reference ?? p.reference_number,
        p_notes: p.notes ?? p.remarks ?? "Retried payment execution",
      });

      if (rpcErr) throw new Error(rpcErr.message);

      await db
        .from("pending_operations")
        .update({ status: "completed", completed_at: new Date().toISOString(), error_message: null })
        .eq("id", operationId);

      await db.from("audit_logs").insert({
        user_id: session.id,
        action: "RETRY_PENDING_PAYMENT_SUCCESS",
        entity_name: "payments",
        entity_id: (payment as { id?: string })?.id ?? null,
        details: { operation_id: operationId, reference: p.reference_number },
      });

      revalidatePath("/finance");
      revalidatePath("/dashboard");
      return { success: true, message: `Successfully executed payment for ${String(op.entity_name ?? "")}.` };
    }

    // Generic resolution for unknown types
    await db
      .from("pending_operations")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", operationId);

    return { success: true, message: "Operation marked as resolved." };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Unknown error during retry execution.";
    await db
      .from("pending_operations")
      .update({ status: "failed", error_message: errMsg })
      .eq("id", operationId);

    return { success: false, message: `Retry failed: ${errMsg}` };
  }
}
