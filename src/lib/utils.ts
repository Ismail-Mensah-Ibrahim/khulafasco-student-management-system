import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS class names safely, resolving conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Ghana Cedis currency.
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date string for display.
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  return new Intl.DateTimeFormat("en-GH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateString));
}

/**
 * Normalize an index number: uppercase and trim whitespace.
 * Used consistently everywhere the JHS/BECE Index Number appears.
 */
export function normalizeIndexNumber(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * Get a student's full name from parts.
 */
export function getFullName(
  firstName: string,
  middleName: string | null | undefined,
  lastName: string
): string {
  return [firstName, middleName, lastName].filter(Boolean).join(" ");
}

/**
 * Get initials for an avatar from a full name.
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Returns a human-readable label for a payment status.
 */
export function getPaymentStatusLabel(
  status: "not_set" | "unpaid" | "partially_paid" | "paid"
): string {
  switch (status) {
    case "not_set":
      return "Amount Due Not Set";
    case "unpaid":
      return "Unpaid";
    case "partially_paid":
      return "Partially Paid";
    case "paid":
      return "Paid";
  }
}

/**
 * Calculate outstanding balance — always non-negative.
 */
export function calculateOutstanding(
  totalDue: number | null,
  totalPaid: number
): number {
  if (totalDue === null) return 0;
  return Math.max(totalDue - totalPaid, 0);
}
