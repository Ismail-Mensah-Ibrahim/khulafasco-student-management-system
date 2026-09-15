"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySession, requireITOfficer } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { IT_TICKET_STATUSES, REQUEST_PRIORITIES, type ITTicketStatus } from "@/config/constants";

export type TicketActionResult =
  | { success: true; message: string; ticketId?: string }
  | { success: false; message: string; fieldErrors?: Record<string, string[]> };

const ticketSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200),
  category: z.string().min(1, "Select an IT issue category."),
  description: z.string().trim().min(5, "Please describe the technical problem.").max(1000),
  priority: z.enum(REQUEST_PRIORITIES).default("medium"),
  location: z.string().trim().max(100).optional(),
});

export async function createTicketAction(
  _prevState: TicketActionResult | undefined,
  formData: FormData
): Promise<TicketActionResult> {
  const session = await verifySession();

  const rawValues = {
    title: formData.get("title"),
    category: formData.get("category"),
    description: formData.get("description"),
    priority: formData.get("priority") || "medium",
    location: formData.get("location") || undefined,
  };

  const parsed = ticketSchema.safeParse(rawValues);
  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const values = parsed.data;

  const { data: ticket, error } = await supabase
    .from("it_tickets")
    .insert({
      requester_id: session.id,
      title: values.title,
      category: values.category,
      description: values.description,
      priority: values.priority,
      location: values.location || null,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !ticket) {
    console.error("createTicketAction error:", error);
    return { success: false, message: "Unable to submit your IT ticket. Please try again." };
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id: session.id,
    action: "CREATE",
    entity_type: "it_ticket",
    entity_id: ticket.id,
    description: `Submitted IT Support ticket: "${values.title}" (${values.category})`,
  });

  revalidatePath("/it/tickets");
  revalidatePath("/it/dashboard");
  revalidatePath("/teacher/dashboard");
  revalidatePath("/staff/dashboard");

  return { success: true, message: "IT support ticket submitted successfully.", ticketId: ticket.id };
}

export async function updateTicketStatusAction(
  _prevState: TicketActionResult | undefined,
  formData: FormData
): Promise<TicketActionResult> {
  const session = await requireITOfficer();
  const ticketId = String(formData.get("ticket_id") || "");
  const status = String(formData.get("status") || "") as ITTicketStatus;
  const resolutionNotes = String(formData.get("resolution_notes") || "").trim();

  if (!ticketId) {
    return { success: false, message: "Ticket ID is required." };
  }

  if (!IT_TICKET_STATUSES.includes(status)) {
    return { success: false, message: "Invalid ticket status." };
  }

  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = {
    status,
    assigned_to: session.id,
    updated_at: new Date().toISOString(),
  };

  if (resolutionNotes) {
    updatePayload.resolution_notes = resolutionNotes;
  }

  if (status === "resolved" || status === "closed") {
    updatePayload.resolved_at = new Date().toISOString();
  }

  const { error } = await supabase.from("it_tickets").update(updatePayload).eq("id", ticketId);

  if (error) {
    console.error("updateTicketStatusAction error:", error);
    return { success: false, message: "Failed to update ticket status." };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    action: "UPDATE",
    entity_type: "it_ticket",
    entity_id: ticketId,
    description: `Updated IT Ticket status to ${status.toUpperCase()}`,
  });

  revalidatePath("/it/tickets");
  revalidatePath("/it/dashboard");

  return { success: true, message: `Ticket status updated to ${status}.` };
}

export async function initiatePasswordResetAction(
  _prevState: { success: boolean; message: string } | undefined,
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  const session = await requireITOfficer();
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return { success: false, message: "Please provide a valid staff email address." };
  }

  const supabase = await createClient();

  // Trigger Supabase Auth password reset email without exposing or handling plaintext passwords
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://khulafasco-sms.vercel.app"}/login`,
  });

  if (error) {
    console.error("initiatePasswordResetAction error:", error);
    return { success: false, message: "Unable to initiate password reset for this email." };
  }

  // Audit log the password reset initiation
  await supabase.from("audit_logs").insert({
    user_id: session.id,
    action: "UPDATE",
    entity_type: "user_account",
    description: `Initiated secure password reset email for staff user ${email}`,
  });

  return {
    success: true,
    message: `Password reset link has been dispatched securely to ${email}.`,
  };
}
