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
  is_active: z.boolean().optional(),
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

const moneyInput = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount with up to two decimal places.")
  .transform(Number)
  .refine((value) => Number.isFinite(value) && value >= 0, "Amount cannot be negative.");

const indexInput = z.string().trim().regex(/^\d{10}$/, "Enter a valid JHS index number.");

export const setStudentFeeChargeSchema = z.object({
  jhs_index_number: indexInput,
  fee_type_id: z.string().trim().uuid("Select a valid fee type."),
  amount: moneyInput,
  description: z.string().trim().max(500, "Description must be 500 characters or fewer.").transform((value) => value || null),
});

export const setStudentAmountDueSchema = z.object({
  jhs_index_number: indexInput,
  amount_due: moneyInput,
});

export const studentChargeMutationResultSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  fee_type_id: z.string(),
  academic_year_id: z.string(),
  amount_due: z.number().finite(),
  amount_paid: z.number().finite(),
});

export const studentFinancialReconciliationSchema = z.object({
  student: z.object({
    id: z.string(),
    jhs_index_number: z.string(),
    first_name: z.string(),
    middle_name: z.string().nullable(),
    last_name: z.string(),
    student_type: z.enum(BOARDING_TYPES),
  }),
  financial: z.object({
    total_amount_due: z.number().finite().nullable(),
    total_fee_charges: z.number().finite(),
    total_paid: z.number().finite(),
    outstanding_balance: z.number().finite().nullable(),
    charge_difference: z.number().finite().nullable(),
    reconciliation_status: z.enum([
      "amount_due_not_set",
      "balanced",
      "charges_below_total_due",
      "charges_above_total_due",
    ]),
  }),
});

const optionalDateInput = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()), "Enter a valid date.")
  .optional()
  .or(z.literal(""));

export const paymentListQuerySchema = z.object({
  search: z.string().trim().max(120, "Search must be 120 characters or fewer.").optional().default(""),
  status: z.enum(PAYMENT_TRANSACTION_STATUSES).optional(),
  payment_method: z.enum(PAYMENT_METHOD_VALUES).optional(),
  academic_year_id: z.string().uuid("Select a valid academic year.").optional(),
  paid_from: optionalDateInput,
  paid_to: optionalDateInput,
  page: z.coerce.number().int().min(1, "Page must be at least 1.").default(1),
  page_size: z.coerce.number().int().refine((value) => [25, 50, 100].includes(value), "Page size must be 25, 50, or 100.").default(25),
}).superRefine((values, context) => {
  if (values.paid_from && values.paid_to && values.paid_from >= values.paid_to) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["paid_to"], message: "The end date must be after the start date." });
  }
});

const paymentListItemSchema = z.object({
  id: z.string().uuid(),
  receipt_number: z.string().nullable(),
  amount: z.number().finite(),
  payment_method: z.enum(PAYMENT_METHOD_VALUES),
  reference: z.string().nullable(),
  status: z.enum(PAYMENT_TRANSACTION_STATUSES),
  paid_at: z.string(),
  recorded_by: z.string().uuid(),
  student: z.object({
    id: z.string().uuid(),
    jhs_index_number: z.string(),
    first_name: z.string(),
    middle_name: z.string().nullable(),
    last_name: z.string(),
  }),
  academic_year: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }),
});

export const financePaymentsSchema = z.object({
  items: z.array(paymentListItemSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    page_size: z.number().int().min(1),
    total_count: z.number().int().min(0),
    total_pages: z.number().int().min(0),
  }),
});

export type RecordStudentPaymentValues = z.infer<typeof recordStudentPaymentSchema>;
export type PaymentRecord = z.infer<typeof paymentRecordSchema>;
export type SetStudentFeeChargeValues = z.infer<typeof setStudentFeeChargeSchema>;
export type SetStudentAmountDueValues = z.infer<typeof setStudentAmountDueSchema>;
export type StudentFinancialReconciliation = z.infer<typeof studentFinancialReconciliationSchema>;
export type PaymentListQuery = z.infer<typeof paymentListQuerySchema>;
export type FinancePayments = z.infer<typeof financePaymentsSchema>;

export type StudentFinanceResult = z.infer<typeof studentFinanceSchema>;