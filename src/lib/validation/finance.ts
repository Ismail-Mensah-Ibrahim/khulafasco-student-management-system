import { z } from "zod";
import { BOARDING_TYPES, PAYMENT_STATUSES, PAYMENT_TRANSACTION_STATUSES } from "@/config/constants";

const PAYMENT_METHOD_TYPES = ["cash", "mobile_money", "bank_transfer", "other"] as const;

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
  payment_method: z.enum(PAYMENT_METHOD_TYPES),
  reference: z.string().nullable(),
  status: z.enum(PAYMENT_TRANSACTION_STATUSES),
  notes: z.string().nullable(),
  paid_at: z.string(),
  recorded_by: z.string(),
});

export const studentFinanceSchema = z.object({
  student: z.object({
    id: z.string(),
    jhs_index_number: z.string(),
    full_name: z.string(),
    program_name: z.string(),
    house_name: z.string().nullable(),
    student_type: z.enum(BOARDING_TYPES),
    academic_year: z.string(),
    photo_path: z.string().nullable(),
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

export type StudentFinanceResult = z.infer<typeof studentFinanceSchema>;