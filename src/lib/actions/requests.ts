"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySession, requireReviewer, requireFinanceOfficer } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import {
  REQUEST_PRIORITIES,
  REQUEST_TYPES,
} from "@/config/constants";

export type RequestActionResult =
  | { success: true; message: string; requestId?: string }
  | { success: false; message: string; fieldErrors?: Record<string, string[]> };

const createRequestSchema = z.object({
  request_type: z.enum(REQUEST_TYPES, { errorMap: () => ({ message: "Select a request type." }) }),
  category: z.string().min(1, "Select a category."),
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200),
  description: z.string().trim().min(5, "Description must be at least 5 characters.").max(1000),
  priority: z.enum(REQUEST_PRIORITIES).default("medium"),
  amount_requested: z.coerce.number().min(0, "Amount cannot be negative.").default(0),
});

export async function createRequestAction(
  _prevState: RequestActionResult | undefined,
  formData: FormData
): Promise<RequestActionResult> {
  const session = await verifySession();

  const rawValues = {
    request_type: formData.get("request_type"),
    category: formData.get("category"),
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority") || "medium",
    amount_requested: formData.get("amount_requested") || 0,
  };

  const parsed = createRequestSchema.safeParse(rawValues);
  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const values = parsed.data;

  const { data: request, error: requestError } = await supabase
    .from("requests")
    .insert({
      requester_id: session.id,
      request_type: values.request_type,
      category: values.category,
      title: values.title,
      description: values.description,
      priority: values.priority,
      amount_requested: values.amount_requested,
      status: "submitted",
    })
    .select("id")
    .single();

  if (requestError || !request) {
    console.error("createRequestAction error:", requestError);
    return { success: false, message: "Unable to submit your request. Please try again." };
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id: session.id,
    action: "CREATE",
    entity_type: "request",
    entity_id: request.id,
    description: `Submitted ${values.request_type} request: "${values.title}" (${values.category})`,
  });

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  revalidatePath("/teacher/dashboard");
  revalidatePath("/operations/dashboard");
  revalidatePath("/staff/dashboard");

  return { success: true, message: "Your request has been submitted successfully.", requestId: request.id };
}

export async function reviewRequestAction(
  _prevState: RequestActionResult | undefined,
  formData: FormData
): Promise<RequestActionResult> {
  const session = await requireReviewer();
  const requestId = String(formData.get("request_id") || "");
  const decision = String(formData.get("decision") || ""); // 'approved' | 'rejected' | 'returned'
  const reviewComments = String(formData.get("comments") || "").trim();
  const amountApproved = Number(formData.get("amount_approved") || 0);

  if (!requestId) {
    return { success: false, message: "Request ID is required." };
  }

  if (!["approved", "rejected", "returned"].includes(decision)) {
    return { success: false, message: "Invalid review decision." };
  }

  const supabase = await createClient();

  // Fetch the request to verify existence and enforce NO SELF-APPROVAL
  const { data: existing, error: fetchError } = await supabase
    .from("requests")
    .select("id, requester_id, request_type, amount_requested, title")
    .eq("id", requestId)
    .single();

  if (fetchError || !existing) {
    return { success: false, message: "Request not found." };
  }

  // Strict Segregation of Duties: Requester CANNOT approve their own request
  if (existing.requester_id === session.id) {
    return {
      success: false,
      message: "Security Policy Violation: You cannot review or approve your own request.",
    };
  }

  let newStatus = decision;
  let finalApprovedAmount = null;

  if (decision === "approved") {
    finalApprovedAmount = amountApproved > 0 ? amountApproved : existing.amount_requested;
    if (existing.request_type === "money" || finalApprovedAmount > 0) {
      newStatus = "waiting_release";
    }
  }

  const { error: updateError } = await supabase
    .from("requests")
    .update({
      status: newStatus,
      amount_approved: finalApprovedAmount,
      reviewed_by: session.id,
      reviewed_at: new Date().toISOString(),
      review_comments: reviewComments || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    console.error("reviewRequestAction error:", updateError);
    return { success: false, message: "Failed to update request status. Please try again." };
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id: session.id,
    action: "UPDATE",
    entity_type: "request",
    entity_id: requestId,
    description: `Reviewed request "${existing.title}": Decision = ${decision.toUpperCase()}${
      finalApprovedAmount ? ` (Approved GH₵${finalApprovedAmount})` : ""
    }`,
  });

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  revalidatePath("/headmaster/dashboard");
  revalidatePath("/finance");

  return { success: true, message: `Request successfully ${decision}.` };
}

export async function releaseRequestFundsAction(
  _prevState: RequestActionResult | undefined,
  formData: FormData
): Promise<RequestActionResult> {
  const session = await requireFinanceOfficer();
  const requestId = String(formData.get("request_id") || "");
  const amountReleased = Number(formData.get("amount_released") || 0);
  const releaseMethod = String(formData.get("release_method") || "Cash").trim();
  const releaseReference = String(formData.get("release_reference") || "").trim();

  if (!requestId || amountReleased <= 0) {
    return { success: false, message: "Valid request ID and release amount are required." };
  }

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("requests")
    .select("id, requester_id, amount_approved, status, title")
    .eq("id", requestId)
    .single();

  if (fetchError || !existing) {
    return { success: false, message: "Request not found." };
  }

  // Strict Segregation of Duties: Requester CANNOT release their own funds
  if (existing.requester_id === session.id) {
    return {
      success: false,
      message: "Security Policy Violation: You cannot release funds for your own request.",
    };
  }

  if (existing.status !== "waiting_release" && existing.status !== "approved") {
    return { success: false, message: "This request is not ready for financial release." };
  }

  const { error: updateError } = await supabase
    .from("requests")
    .update({
      status: "released",
      amount_released: amountReleased,
      released_by: session.id,
      released_at: new Date().toISOString(),
      release_method: releaseMethod,
      release_reference: releaseReference || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    console.error("releaseRequestFundsAction error:", updateError);
    return { success: false, message: "Failed to record fund release." };
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id: session.id,
    action: "UPDATE",
    entity_type: "request",
    entity_id: requestId,
    description: `Released GH₵${amountReleased} via ${releaseMethod} (Ref: ${releaseReference || "N/A"}) for request "${existing.title}"`,
  });

  revalidatePath("/requests");
  revalidatePath("/finance");

  return { success: true, message: `Funds of GH₵${amountReleased.toFixed(2)} recorded as released.` };
}

export async function confirmRequestFulfillmentAction(
  _prevState: RequestActionResult | undefined,
  formData: FormData
): Promise<RequestActionResult> {
  const session = await verifySession();
  const requestId = String(formData.get("request_id") || "");

  if (!requestId) return { success: false, message: "Request ID is required." };

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("requests")
    .select("id, requester_id, title, status")
    .eq("id", requestId)
    .single();

  if (fetchError || !existing) return { success: false, message: "Request not found." };

  if (existing.requester_id !== session.id && session.role !== "admin") {
    return { success: false, message: "Only the requester or Administrator can mark completion." };
  }

  const { error: updateError } = await supabase
    .from("requests")
    .update({
      status: "completed",
      completed_by: session.id,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    return { success: false, message: "Failed to mark completion." };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    action: "UPDATE",
    entity_type: "request",
    entity_id: requestId,
    description: `Confirmed completion of request "${existing.title}"`,
  });

  revalidatePath("/requests");
  return { success: true, message: "Request has been marked as completed." };
}
