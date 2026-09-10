import { z } from "zod";
import {
  BOARDING_TYPES,
  ENROLLMENT_STATUSES,
  GENDERS,
  PAYMENT_METHOD_VALUES,
  PAYMENT_STATUSES,
  PAYMENT_TRANSACTION_STATUSES,
} from "@/config/constants";

const nullableNumber = z.number().finite().nullable();

const feeTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.string(),
});

const chargeSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  fee_type_id: z.string(),
  academic_year_id: z.string(),
  amount_due: z.number().finite(),
  amount_paid: z.number().finite(),
  created_at: z.string(),
  updated_at: z.string(),
  fee_type: feeTypeSchema.optional(),
});

const paymentSchema = z.object({
  payment_id: z.string(),
  receipt_number: z.string(),
  amount: z.number().finite(),
  payment_method: z.enum(PAYMENT_METHOD_VALUES),
  reference: z.string().nullable(),
  status: z.enum(PAYMENT_TRANSACTION_STATUSES),
  notes: z.string().nullable(),
  paid_at: z.string(),
  recorded_by: z.string(),
});

export const studentFinanceSchema = z.object({
  student: z.object({
    id: z.string(),
    gender: z.enum(GENDERS),
    region: z.string().nullable(),
    district: z.string().nullable(),
    house_id: z.string().nullable(),
    last_name: z.string(),
    first_name: z.string(),
    photo_path: z.string().nullable(),
    program_id: z.string().nullable(),
    enrolled_at: z.string(),
    middle_name: z.string().nullable(),
    parent_name: z.string().nullable(),
    parent_email: z.string().nullable(),
    parent_phone: z.string().nullable(),
    jhs_index_number: z.string(),
    student_type: z.enum(BOARDING_TYPES),
    date_of_birth: z.string().nullable(),
    parent_address: z.string().nullable(),
    previous_school: z.string().nullable(),
    academic_year_id: z.string().nullable(),
    parent_alt_phone: z.string().nullable(),
    enrollment_status: z.enum(ENROLLMENT_STATUSES),
    parent_relationship: z.string().nullable(),
  }),
  financial: z.object({
    total_amount_due: nullableNumber,
    total_paid: z.number().finite(),
    outstanding_balance: z.number().finite().nullable(),
    payment_status: z.enum(PAYMENT_STATUSES),
  }),
  fee_allocations: z.array(chargeSchema),
  recent_payments: z.array(paymentSchema),
});

const paymentAllocationInputSchema = z.object({
  charge_id: z.string().uuid(),
  amount: z.number().finite().positive(),
});

export const recordStudentPaymentSchema = z
  .object({
    jhs_index_number: z.string().trim().regex(/^\d{10}$/, "Enter a valid JHS index number."),
    amount: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount with up to two decimal places.")
      .transform(Number)
      .refine((value) => Number.isFinite(value) && value > 0, "Payment amount must be greater than zero."),
    payment_method: z.enum(PAYMENT_METHOD_VALUES),
    reference: z.string().trim().max(120, "Reference must be 120 characters or fewer.").transform((value) => value || null),
    notes: z.string().trim().max(1000, "Notes must be 1000 characters or fewer.").transform((value) => value || null),
    allocations: z.array(paymentAllocationInputSchema).min(1, "Select at least one fee allocation."),
  })
  .superRefine((values, context) => {
    const amountCents = Math.round(values.amount * 100);
    const allocationCents = values.allocations.reduce((total, allocation) => total + Math.round(allocation.amount * 100), 0);

    if (allocationCents !== amountCents) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allocations"],
        message: "Payment allocation must exactly equal the payment amount.",
      });
    }
  });

export const paymentRecordSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  amount: z.number().finite(),
  payment_method: z.enum(PAYMENT_METHOD_VALUES),
  reference: z.string().nullable(),
  status: z.enum(PAYMENT_TRANSACTION_STATUSES),
  notes: z.string().nullable(),
  receipt_number: z.string().nullable(),
  recorded_by: z.string(),
  paid_at: z.string(),
  created_at: z.string(),
});

export type RecordStudentPaymentValues = z.infer<typeof recordStudentPaymentSchema>;
export type PaymentRecord = z.infer<typeof paymentRecordSchema>;

export type StudentFinanceResult = z.infer<typeof studentFinanceSchema>;