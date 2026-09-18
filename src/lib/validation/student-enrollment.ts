import { z } from "zod";
import {
  BOARDING_TYPES,
  ENROLLMENT_STATUSES,
  GENDERS,
  GUARDIAN_RELATIONSHIPS,
} from "@/config/constants";
import { normalizeIndexNumber } from "@/lib/utils";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(max).nullable()
  );

const optionalEmail = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().trim().email("Enter a valid email address.").max(255).nullable()
);

const dateOfBirth = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth.")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "Enter a valid date of birth.");

export const studentEnrollmentSchema = z.object({
  jhs_index_number: z
    .string()
    .trim()
    .min(1, "JHS index number is required.")
    .max(50, "JHS index number is too long.")
    .transform(normalizeIndexNumber),
  first_name: z.string().trim().min(1, "First name is required.").max(100),
  middle_name: optionalText(100),
  last_name: z.string().trim().min(1, "Last name is required.").max(100),
  gender: z.enum(GENDERS, { errorMap: () => ({ message: "Select a gender." }) }),
  date_of_birth: dateOfBirth,
  previous_school: optionalText(200),
  region: optionalText(100),
  district: optionalText(100),
  parent_name: z.string().trim().min(1, "Parent or guardian name is required.").max(150),
  parent_relationship: z.enum(GUARDIAN_RELATIONSHIPS, {
    errorMap: () => ({ message: "Select a parent or guardian relationship." }),
  }),
  parent_phone: z.string().trim().min(1, "Parent or guardian phone is required.").max(30),
  parent_alt_phone: optionalText(30),
  parent_email: optionalEmail,
  parent_address: optionalText(300),
  program_id: z.string().uuid("Select a valid program."),
  house_id: z.preprocess(
    (value) => (value === "" || value === "auto" ? null : value),
    z.string().uuid("Select a valid house.").nullable()
  ),
  student_type: z.enum(BOARDING_TYPES, { errorMap: () => ({ message: "Select a student type." }) }),
  academic_year_id: z.string().uuid("Select a valid academic year."),
  enrollment_status: z.enum(ENROLLMENT_STATUSES, {
    errorMap: () => ({ message: "Select a valid enrollment status." }),
  }),
});

export type StudentEnrollmentValues = z.infer<typeof studentEnrollmentSchema>;

export const studentUpdateSchema = studentEnrollmentSchema;

export type StudentUpdateValues = StudentEnrollmentValues;