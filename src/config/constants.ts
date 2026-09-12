/**
 * Application-wide constants — school structure, roles, payment methods, etc.
 * All values here match the existing Supabase database schema.
 */

export const PROGRAMS = [
  "General Arts",
  "General Science",
  "Business",
  "Home Economics",
  "General Agric",
] as const;

export type Program = (typeof PROGRAMS)[number];

export const HOUSES = ["Abubakar", "Umar", "Uthman", "Ali"] as const;

export type House = (typeof HOUSES)[number];

export const BOARDING_TYPES = ["boarding", "day"] as const;

export type BoardingType = (typeof BOARDING_TYPES)[number];

export const CURRENT_ACADEMIC_YEAR = "2026/2027";

export const GENDERS = ["male", "female"] as const;

export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  male: "Male",
  female: "Female",
};

export const PAYMENT_METHODS = [
  "Cash",
  "Mobile Money",
  "Bank Transfer",
  "Other",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_VALUES = ["cash", "mobile_money", "bank_transfer", "other"] as const;

export type PaymentMethodValue = (typeof PAYMENT_METHOD_VALUES)[number];

export const PAYMENT_STATUSES = [
  "not_set",
  "unpaid",
  "partially_paid",
  "paid",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_TRANSACTION_STATUSES = ["completed", "cancelled", "reversed"] as const;

export type PaymentTransactionStatus = (typeof PAYMENT_TRANSACTION_STATUSES)[number];

export const ROLES = ["admin", "finance_officer"] as const;

export type UserRole = (typeof ROLES)[number];

export const ENROLLMENT_STATUSES = ["active", "inactive", "transferred", "graduated"] as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const FEE_TYPES = [
  "Admission Form",
  "Hostel Fee",
  "Maintenance Fee",
  "Madrasat Fee",
] as const;

export type FeeType = (typeof FEE_TYPES)[number];

export const GUARDIAN_RELATIONSHIPS = [
  "Father",
  "Mother",
  "Guardian",
  "Uncle",
  "Aunt",
  "Grandparent",
  "Sibling",
  "Other",
] as const;

export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIPS)[number];

/** Receipt number format: KHA-YYYY-000001 */
export const RECEIPT_PREFIX = "KHA";

export const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Eastern",
  "Central",
  "Northern",
  "Upper East",
  "Upper West",
  "Volta",
  "Brong-Ahafo",
  "Oti",
  "Ahafo",
  "Bono East",
  "North East",
  "Savannah",
  "Western North",
] as const;

export type GhanaRegion = (typeof GHANA_REGIONS)[number];
