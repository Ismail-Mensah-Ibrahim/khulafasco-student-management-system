/**
 * Application Constants for Khulafasco Backend
 * Exact mirror of existing database enums, roles, and school structure.
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

export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];

export const ROLES = [
  "admin",
  "it_officer",
  "headmaster",
  "assistant_headmaster",
  "academic_head",
  "teacher",
  "house_master",
  "house_mistress",
  "finance_officer",
  "domestic_officer",
  "general_staff",
] as const;

export type UserRole = (typeof ROLES)[number];

export const HOUSE_RESPONSIBILITIES = [
  "house_master",
  "house_mistress",
  "senior_house_master",
  "senior_house_mistress",
] as const;

export type HouseResponsibility = (typeof HOUSE_RESPONSIBILITIES)[number];

export const TIMETABLE_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

export type TimetableDay = (typeof TIMETABLE_DAYS)[number];

export const FORM_LEVELS = ["Form 1", "Form 2", "Form 3"] as const;
export type FormLevel = (typeof FORM_LEVELS)[number];

export const PAYMENT_METHODS = [
  "cash",
  "mobile_money",
  "bank_transfer",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  "completed",
  "cancelled",
  "reversed",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

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

export const AUDIT_SEVERITIES = ["INFO", "WARNING", "SECURITY", "CRITICAL"] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];
