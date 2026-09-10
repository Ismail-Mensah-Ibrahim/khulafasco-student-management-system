"use server";

import { revalidatePath } from "next/cache";
import { requireFinanceOrAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import {
  setStudentAmountDueSchema,
  setStudentFeeChargeSchema,
  studentChargeMutationResultSchema,
  type SetStudentAmountDueValues,
  type SetStudentFeeChargeValues,
} from "@/lib/validation/finance";

export type FinanceManagementState =
  | { success: true; message: string }
  | { success: false; message: string; fieldErrors?: Record<string, string[]> }
  | undefined;

function getText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function friendlyError(code: string | undefined, message: string | undefined): string {
  const normalized = message?.toLowerCase() ?? "";
  if (code === "42501" || normalized.includes("not authorized") || normalized.includes("unauthorized")) {
    return "You are not authorized to manage student finances.";
  }
  if (normalized.includes("student") && (normalized.includes("not found") || normalized.includes("does not exist"))) {
    return "No student found with that JHS/BECE Index Number.";
  }
  if (normalized.includes("fee") && (normalized.includes("not found") || normalized.includes("inactive") || normalized.includes("active"))) {
    return "That fee type is inactive or unavailable.";
  }
  if (normalized.includes("academic year")) return "The current academic year is unavailable.";
  if (normalized.includes("negative")) return "Amount cannot be negative.";
  return "Unable to save the financial information right now. Please try again.";
}

export async function setStudentFeeChargeAction(
  _previousState: FinanceManagementState,
  formData: FormData
): Promise<FinanceManagementState> {
  await requireFinanceOrAdmin();
  const parsed = setStudentFeeChargeSchema.safeParse({
    jhs_index_number: getText(formData, "jhs_index_number"),
    fee_type_id: getText(formData, "fee_type_id"),
    amount: getText(formData, "amount"),
    description: getText(formData, "description"),
  });
  if (!parsed.success) return { success: false, message: "Please correct the charge details before saving.", fieldErrors: parsed.error.flatten().fieldErrors };

  const values: SetStudentFeeChargeValues = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_student_fee_charge", {
    p_jhs_index_number: values.jhs_index_number,
    p_fee_type_id: values.fee_type_id,
    p_amount: values.amount,
    p_description: values.description,
  });
  if (error) {
    console.error("setStudentFeeChargeAction RPC error:", { code: error.code, message: error.message });
    return { success: false, message: friendlyError(error.code, error.message) };
  }
  if (!studentChargeMutationResultSchema.safeParse(data).success) {
    console.error("setStudentFeeChargeAction malformed RPC response");
    return { success: false, message: "Unable to confirm the saved charge." };
  }
  revalidatePath(`/finance?index=${encodeURIComponent(values.jhs_index_number)}`);
  return { success: true, message: "Student charge saved successfully." };
}

export async function setStudentAmountDueAction(
  _previousState: FinanceManagementState,
  formData: FormData
): Promise<FinanceManagementState> {
  await requireFinanceOrAdmin();
  const parsed = setStudentAmountDueSchema.safeParse({
    jhs_index_number: getText(formData, "jhs_index_number"),
    amount_due: getText(formData, "amount_due"),
  });
  if (!parsed.success) return { success: false, message: "Please enter a valid total amount due.", fieldErrors: parsed.error.flatten().fieldErrors };

  const values: SetStudentAmountDueValues = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_student_amount_due", {
    p_jhs_index_number: values.jhs_index_number,
    p_amount_due: values.amount_due,
  });
  if (error) {
    console.error("setStudentAmountDueAction RPC error:", { code: error.code, message: error.message });
    return { success: false, message: friendlyError(error.code, error.message) };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    console.error("setStudentAmountDueAction malformed RPC response");
    return { success: false, message: "Unable to confirm the saved total amount due." };
  }
  revalidatePath(`/finance?index=${encodeURIComponent(values.jhs_index_number)}`);
  return { success: true, message: "Total amount due saved successfully." };
}