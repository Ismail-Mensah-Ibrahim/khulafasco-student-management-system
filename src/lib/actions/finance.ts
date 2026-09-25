"use server";

import { revalidatePath } from "next/cache";
import { requireFinanceOrAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import {
  paymentRecordSchema,
  recordStudentPaymentSchema,
  type PaymentRecord,
} from "@/lib/validation/finance";

export type PaymentActionState =
  | { success: true; indexNumber: string; payment: PaymentRecord }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;

function getText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function getDatabaseErrorMessage(code: string | undefined, message: string | undefined): string {
  const lowerMessage = message?.toLowerCase() ?? "";

  if (code === "23505" || lowerMessage.includes("payments_reference_key")) {
    return "This payment reference has already been used. Please enter a different reference.";
  }

  if (code === "42501" || lowerMessage.includes("not authorized") || lowerMessage.includes("unauthorized")) {
    return "You are not authorized to record payments.";
  }

  if (lowerMessage.includes("amount due") && lowerMessage.includes("set")) {
    return "Total Amount Due has not been set for this student.";
  }

  if (lowerMessage.includes("outstanding") || lowerMessage.includes("overpayment") || lowerMessage.includes("exceed")) {
    return "Payment amount exceeds the student's outstanding balance.";
  }

  if (lowerMessage.includes("allocation") && lowerMessage.includes("equal")) {
    return "Payment allocation must exactly equal the payment amount.";
  }

  if (lowerMessage.includes("allocation") || lowerMessage.includes("charge")) {
    return "One or more selected fee allocations are invalid.";
  }

  if (lowerMessage.includes("student") && (lowerMessage.includes("not found") || lowerMessage.includes("does not exist"))) {
    return "No student found with this JHS/BECE Index Number.";
  }

  return "Unable to record the payment right now. Please review the form and try again.";
}

export async function recordStudentPaymentAction(
  _previousState: PaymentActionState,
  formData: FormData
): Promise<PaymentActionState> {
  await requireFinanceOrAdmin();

  let allocations: unknown;
  try {
    allocations = JSON.parse(getText(formData, "allocations"));
  } catch {
    return {
      success: false,
      message: "Select valid fee allocations before submitting the payment.",
    };
  }

  const parsed = recordStudentPaymentSchema.safeParse({
    jhs_index_number: getText(formData, "jhs_index_number"),
    amount: getText(formData, "amount"),
    payment_method: getText(formData, "payment_method"),
    reference: getText(formData, "reference"),
    notes: getText(formData, "notes"),
    allocations,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the payment details before submitting.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const values = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_student_payment", {
    p_jhs_index_number: values.jhs_index_number,
    p_amount: values.amount,
    p_payment_method: values.payment_method,
    p_allocations: values.allocations,
    p_reference: values.reference,
    p_notes: values.notes,
  });

  if (error) {
    console.error("recordStudentPaymentAction RPC error:", {
      code: error.code,
      message: error.message,
    });
    return { success: false, message: getDatabaseErrorMessage(error.code, error.message) };
  }

  const payment = paymentRecordSchema.safeParse(data);
  if (!payment.success) {
    console.error("recordStudentPaymentAction malformed RPC response:", payment.error.issues[0]);
    return {
      success: false,
      message: "The payment was not confirmed because the database returned an invalid response.",
    };
  }

  revalidatePath("/finance");
  revalidatePath("/finance/payments");
  revalidatePath("/finance/receipts");
  revalidatePath("/dashboard");

  return { success: true, indexNumber: values.jhs_index_number, payment: payment.data };
}

export interface ReversePaymentActionResult {
  success: boolean;
  message: string;
}

export async function reverseStudentPaymentAction(
  input: FormData | { payment_id: string; reason: string }
): Promise<ReversePaymentActionResult> {
  await requireFinanceOrAdmin();
  const paymentId = input instanceof FormData ? getText(input, "payment_id") : input.payment_id;
  const reason = input instanceof FormData ? getText(input, "reason") : input.reason;

  if (!paymentId || !reason) {
    return {
      success: false,
      message: "Payment ID and a valid reversal reason are required.",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("reverse_student_payment", {
      p_payment_id: paymentId,
      p_reason: reason.trim(),
    });

    if (error) {
      console.error("reverseStudentPaymentAction error:", error);
      return {
        success: false,
        message: error.message || "Failed to reverse the payment.",
      };
    }

    revalidatePath("/finance");
    revalidatePath("/finance/payments");
    revalidatePath("/finance/receipts");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Payment has been reversed successfully.",
    };
  } catch (err: unknown) {
    console.error("reverseStudentPaymentAction exception:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to reverse payment.",
    };
  }
}

