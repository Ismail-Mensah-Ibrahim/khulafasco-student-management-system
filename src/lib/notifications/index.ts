/**
 * Centralized Notification Service
 */

import { createClient } from "@/lib/supabase/server";

export interface CreateNotificationParams {
  recipientId: string;
  title: string;
  message: string;
  type?: "system" | "academic" | "finance" | "timetable" | "security";
  metadata?: Record<string, unknown>;
}

export async function createNotification(
  params: CreateNotificationParams
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("notifications").insert({
      recipient_id: params.recipientId,
      title: params.title,
      message: params.message,
      notification_type: params.type || "system",
      metadata: params.metadata || null,
      is_read: false,
    });

    if (error) {
      console.warn("createNotification error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Failed to create notification:", err);
    return false;
  }
}

export async function getStaffNotifications(
  recipientId: string,
  limit: number = 20
) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", recipientId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("getStaffNotifications error:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("getStaffNotifications error:", err);
    return [];
  }
}

export async function markNotificationAsRead(
  notificationId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    return !error;
  } catch {
    return false;
  }
}
