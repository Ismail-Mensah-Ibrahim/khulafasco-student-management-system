"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_METHOD_VALUES } from "@/config/constants";
import { recordStudentPaymentAction, type PaymentActionState } from "@/lib/actions/finance";
import { formatCurrency, getFullName } from "@/lib/utils";
import type { StudentFinanceResult } from "@/lib/validation/finance";

type PaymentFormProps = Pick<StudentFinanceResult, "student" | "financial" | "fee_allocations">;

type AllocationValues = Record<string, string>;

const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHOD_VALUES)[number], string> = {
  cash: "Cash",
  mobile_money: "Mobile Money",
  bank_transfer: "Bank Transfer",
  other: "Other",
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : new Intl.DateTimeFormat("en-GH", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function parseCents(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return 0;
  return Math.round(Number(value) * 100);
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" disabled={pending} className="min-w-44">
      {pending ? <Loader2 className="animate-spin" /> : null}
      {pending ? "Recording..." : "Record payment"}
    </Button>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

export function PaymentForm({ student, financial, fee_allocations }: PaymentFormProps) {
  const [state, formAction] = useActionState<PaymentActionState, FormData>(recordStudentPaymentAction, undefined);
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [allocations, setAllocations] = useState<AllocationValues>({});
  const refreshRequested = useRef(false);
  const fieldErrors = state && !state.success ? state.fieldErrors ?? {} : {};
  const amountCents = parseCents(amount);
  const allocationCents = fee_allocations.reduce((total, charge) => total + parseCents(allocations[charge.id] ?? ""), 0);
  const allocationPayload = fee_allocations
    .filter((charge) => (allocations[charge.id] ?? "").trim() !== "")
    .map((charge) => ({ charge_id: charge.id, amount: Number(allocations[charge.id]) }));
  const hasAllocatableCharges = fee_allocations.some((charge) => charge.amount_due > charge.amount_paid);

  useEffect(() => {
    if (!state?.success || refreshRequested.current) return;
    refreshRequested.current = true;
    setAmount("");
    setAllocations({});
    router.refresh();
  }, [router, state]);

  function updateAllocation(chargeId: string, value: string) {
    setAllocations((current) => ({ ...current, [chargeId]: value }));
  }

  return (
    <section className="rounded-xl border p-4 md:p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="mb-5">
        <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Record Payment</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Record a confirmed payment for {getFullName(student.first_name, student.middle_name, student.last_name)} ({student.jhs_index_number}).
        </p>
      </div>

      {state?.success ? (
        <div role="status" className="mb-5 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">Payment recorded successfully.</p>
            <p>Amount: {formatCurrency(state.payment.amount)}</p>
            <p>Payment method: {PAYMENT_METHOD_LABELS[state.payment.payment_method]}</p>
            <p>Receipt number: {state.payment.receipt_number ?? "Not provided"}</p>
            <p>Payment date: {formatDateTime(state.payment.paid_at)}</p>
            {state.payment.reference ? <p>Reference: {state.payment.reference}</p> : null}
          </div>
        </div>
      ) : null}

      {state && !state.success ? (
        <div role="alert" className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p>{state.message}</p>
          {Object.values(fieldErrors).flat().map((error) => <p key={error}>{error}</p>)}
        </div>
      ) : null}

      {!hasAllocatableCharges ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No fee charges with an outstanding balance are available for allocation.
        </div>
      ) : (
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="jhs_index_number" value={student.jhs_index_number} />
          <input type="hidden" name="allocations" value={JSON.stringify(allocationPayload)} readOnly />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={Boolean(fieldErrors.amount)}
              />
              <FieldError message={fieldErrors.amount?.[0]} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment method *</Label>
              <select id="payment_method" name="payment_method" required defaultValue="" aria-invalid={Boolean(fieldErrors.payment_method)} className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                <option value="">Select payment method</option>
                {PAYMENT_METHOD_VALUES.map((method) => <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>)}
              </select>
              <FieldError message={fieldErrors.payment_method?.[0]} />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Fee allocation</h3>
              <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>Allocate the full payment across one or more outstanding charges.</p>
            </div>
            <div className="space-y-3">
              {fee_allocations.map((charge) => {
                const remaining = Math.max(charge.amount_due - charge.amount_paid, 0);
                const disabled = remaining <= 0;
                return (
                  <div key={charge.id} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_auto_10rem] md:items-end" style={{ borderColor: "var(--border)" }}>
                    <div>
                      <p className="font-medium">{charge.fee_type?.name ?? "Fee charge"}</p>
                      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        Due {formatCurrency(charge.amount_due)} | Paid {formatCurrency(charge.amount_paid)} | Remaining {formatCurrency(remaining)}
                      </p>
                    </div>
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{disabled ? "Fully paid" : "Outstanding"}</div>
                    <div className="space-y-2">
                      <Label htmlFor={`allocation-${charge.id}`}>Allocation</Label>
                      <Input
                        id={`allocation-${charge.id}`}
                        type="number"
                        min="0"
                        max={remaining.toFixed(2)}
                        step="0.01"
                        inputMode="decimal"
                        disabled={disabled}
                        value={allocations[charge.id] ?? ""}
                        onChange={(event) => updateAllocation(charge.id, event.target.value)}
                        aria-label={`Allocation for ${charge.fee_type?.name ?? "fee charge"}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span>Outstanding balance: {financial.outstanding_balance === null ? "Not Set" : formatCurrency(financial.outstanding_balance)}</span>
              <span className={amountCents === allocationCents && amountCents > 0 ? "text-green-700" : "text-muted-foreground"}>
                Allocated: {formatCurrency(allocationCents / 100)} of {amount ? formatCurrency(Number(amount)) : formatCurrency(0)}
              </span>
            </div>
            <FieldError message={fieldErrors.allocations?.[0]} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input id="reference" name="reference" maxLength={120} aria-invalid={Boolean(fieldErrors.reference)} />
              <FieldError message={fieldErrors.reference?.[0]} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" maxLength={1000} aria-invalid={Boolean(fieldErrors.notes)} />
              <FieldError message={fieldErrors.notes?.[0]} />
            </div>
          </div>

          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      )}
    </section>
  );
}
