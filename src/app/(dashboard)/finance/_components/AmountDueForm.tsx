"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setStudentAmountDueAction, type FinanceManagementState } from "@/lib/actions/finance-management";
import type { StudentFinanceResult } from "@/lib/validation/finance";
import { formatCurrency } from "@/lib/utils";

function SubmitButton() { const { pending } = useFormStatus(); return <Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : null}{pending ? "Saving..." : "Save total due"}</Button>; }

export function AmountDueForm({ student, currentAmount }: { student: StudentFinanceResult["student"]; currentAmount: number | null }) {
  const [state, formAction] = useActionState<FinanceManagementState, FormData>(setStudentAmountDueAction, undefined);
  const router = useRouter();
  const fieldErrors = state && !state.success ? state.fieldErrors ?? {} : {};
  useEffect(() => { if (state?.success) router.refresh(); }, [router, state]);
  return <section className="rounded-xl border p-4 md:p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}><div className="mb-5"><h2 className="text-lg font-semibold">Total Amount Due</h2><p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>This is the separate authoritative student-level amount due. It is not calculated from student charges.</p></div><p className="mb-4 text-sm font-medium">Current: {currentAmount === null ? "Not Set" : formatCurrency(currentAmount)}</p>{state?.success ? <div role="status" className="mb-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"><CheckCircle2 className="h-5 w-5 shrink-0" />{state.message}</div> : null}{state && !state.success ? <div role="alert" className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><p>{state.message}</p>{Object.values(fieldErrors).flat().map((error) => <p key={error}>{error}</p>)}</div> : null}<form action={formAction} className="space-y-5"><input type="hidden" name="jhs_index_number" value={student.jhs_index_number} /><div className="space-y-2"><Label htmlFor="amount-due">New total amount due *</Label><Input id="amount-due" name="amount_due" type="number" min="0" step="0.01" inputMode="decimal" required /></div><div className="flex justify-end"><SubmitButton /></div></form></section>;
}