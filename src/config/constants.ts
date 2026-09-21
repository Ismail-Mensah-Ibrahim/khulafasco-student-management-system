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

export const ROLES = [
  "admin",
  "it_officer",
  "headmaster",
  "academic_head",
  "teacher",
  "house_master",
  "house_mistress",
  "finance_officer",
  "domestic_officer",
  "general_staff",
] as const;

export type UserRole = (typeof ROLES)[number];

export function hasRole(
  primaryRole: UserRole,
  additionalRoles: readonly UserRole[] | null | undefined,
  requiredRole: UserRole
): boolean {
  return primaryRole === requiredRole || Boolean(additionalRoles?.includes(requiredRole));
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "System Administrator",
  it_officer: "IT Officer / Facilitator",
  headmaster: "Headmaster",
  academic_head: "Academic Head",
  teacher: "Teacher",
  house_master: "House Master",
  house_mistress: "House Mistress",
  finance_officer: "Finance Officer",
  domestic_officer: "Domestic & Logistics Officer",
  general_staff: "General Staff",
};

export const HOUSE_RESPONSIBILITIES = [
  "house_master",
  "house_mistress",
  "senior_house_master",
  "senior_house_mistress",
] as const;

export type HouseResponsibility = (typeof HOUSE_RESPONSIBILITIES)[number];

export const HOUSE_RESPONSIBILITY_LABELS: Record<HouseResponsibility, string> = {
  house_master: "House Master",
  house_mistress: "House Mistress",
  senior_house_master: "Senior House Master",
  senior_house_mistress: "Senior House Mistress",
};

export const TIMETABLE_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

export type TimetableDay = (typeof TIMETABLE_DAYS)[number];

export const REQUEST_CATEGORIES = [
  "Academic",
  "Teaching Materials",
  "Office Supplies",
  "ICT/Technology",
  "Maintenance",
  "Kitchen",
  "Hostel",
  "Cleaning",
  "Logistics",
  "SickBay Supplies",
  "Transportation",
  "Events",
  "Money Request",
  "Other",
] as const;

export type RequestCategory = (typeof REQUEST_CATEGORIES)[number];

export const REQUEST_TYPES = ["item", "money"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];

export const REQUEST_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "returned",
  "waiting_release",
  "released",
  "completed",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const IT_TICKET_CATEGORIES = [
  "Computer / Hardware",
  "Printer / Scanner",
  "Internet / Network",
  "Projector / AV",
  "Software Issue",
  "Login / Account Access",
  "System Bug / Problem",
  "Other Technical Issue",
] as const;

export type ITTicketCategory = (typeof IT_TICKET_CATEGORIES)[number];

export const IT_TICKET_STATUSES = [
  "open",
  "acknowledged",
  "in_progress",
  "resolved",
  "closed",
] as const;

export type ITTicketStatus = (typeof IT_TICKET_STATUSES)[number];

export const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const RESULT_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "published",
] as const;

export type ResultStatus = (typeof RESULT_STATUSES)[number];

export const TERMS = ["Term 1", "Term 2", "Term 3"] as const;
export type AcademicTerm = (typeof TERMS)[number];

export const FORM_LEVELS = ["Form 1", "Form 2", "Form 3"] as const;
export type FormLevel = (typeof FORM_LEVELS)[number];

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

export const AUDIT_SEVERITIES = ["INFO", "WARNING", "SECURITY", "CRITICAL"] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export const AUDIT_MODULES = [
  "AUTH",
  "STAFF",
  "STUDENT",
  "HOUSE",
  "ACADEMIC",
  "FINANCE",
  "OPERATIONS",
  "IT_SUPPORT",
  "SYSTEM",
] as const;
export type AuditModule = (typeof AUDIT_MODULES)[number];

export const PROMOTION_OUTCOMES = [
  "PROMOTED",
  "REPEATING",
  "GRADUATED",
  "WITHDRAWN",
  "TRANSFERRED",
  "DEFERRED",
] as const;
export type PromotionOutcome = (typeof PROMOTION_OUTCOMES)[number];

export const PROMOTION_STATUSES = [
  "promoted",
  "repeating",
  "graduated",
  "withdrawn",
  "transferred",
  "deferred",
  "pending",
] as const;
export type PromotionStatus = (typeof PROMOTION_STATUSES)[number];

export const SEMESTER_NAMES = ["Semester 1", "Semester 2"] as const;
export type SemesterName = (typeof SEMESTER_NAMES)[number];
