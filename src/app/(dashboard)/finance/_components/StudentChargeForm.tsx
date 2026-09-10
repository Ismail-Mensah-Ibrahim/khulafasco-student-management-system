"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { setStudentFeeChargeAction, type FinanceManagementState } from "@/lib/actions/finance-management";
import type { StudentFinanceResult } from "@/lib/validation/finance";
import type { FeeType } from "@/types";

function SubmitButton() { const { pending } = useFormStatus(); return <Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : null}{pending ? "Saving..." : "Save charge"}</Button>; }

export function StudentChargeForm({ student, feeTypes }: { student: StudentFinanceResult["student"]; feeTypes: FeeType[] }) {
  const [state, formAction] = useActionState<FinanceManagementState, FormData>(setStudentFeeChargeAction, undefined);
  const router = useRouter();
  const fieldErrors = state && !state.success ? state.fieldErrors ?? {} : {};
  useEffect(() => { if (state?.success) router.refresh(); }, [router, state]);
  return <section className="rounded-xl border p-4 md:p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
    <div className="mb-5"><h2 className="text-lg font-semibold">Student Charges</h2><p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>Add or update an individual fee charge. Charges use the current academic year selected by the database.</p></div>
    {state?.success ? <div role="status" className="mb-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"><CheckCircle2 className="h-5 w-5 shrink-0" />{state.message}</div> : null}
    {state && !state.success ? <div role="alert" className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><p>{state.message}</p>{Object.values(fieldErrors).flat().map((error) => <p key={error}>{error}</p>)}</div> : null}
    {feeTypes.length === 0 ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No active fee types are available.</p> : <form action={formAction} className="space-y-5"><input type="hidden" name="jhs_index_number" value={student.jhs_index_number} /><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="charge-fee-type">Fee type *</Label><select id="charge-fee-type" name="fee_type_id" required defaultValue="" className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"><option value="">Select fee type</option>{feeTypes.map((feeType) => <option key={feeType.id} value={feeType.id}>{feeType.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="charge-amount">Amount *</Label><Input id="charge-amount" name="amount" type="number" min="0" step="0.01" inputMode="decimal" required /></div></div><div className="space-y-2"><Label htmlFor="charge-description">Description</Label><Textarea id="charge-description" name="description" maxLength={500} /></div><div className="flex justify-end"><SubmitButton /></div></form>}
  </section>;
}