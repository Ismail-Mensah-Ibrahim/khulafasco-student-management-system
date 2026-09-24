import type { Metadata } from "next";
import Link from "next/link";
import { Search, WalletCards } from "lucide-react";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PaymentForm } from "./_components/PaymentForm";
import { StudentChargeForm } from "./_components/StudentChargeForm";
import { AmountDueForm } from "./_components/AmountDueForm";
import { ReconciliationPanel } from "./_components/ReconciliationPanel";
import { requireRole } from "@/lib/dal";
import { getAcademicYears, getFeeTypes, getHouses, getPrograms, getStudentFinanceByIndex, getStudentFinancialReconciliation } from "@/lib/data";
import { formatCurrency, getFullName } from "@/lib/utils";
import { SCHOOL } from "@/config/branding";
import { hasRole } from "@/config/constants";

export const metadata: Metadata = {
  title: `Finance | ${SCHOOL.shortName}`,
};

function formatAmount(amount: number | null): string {
  return amount === null ? "Not available" : formatCurrency(amount);
}

function formatFinancialAmount(amount: number | null): string {
  return amount === null ? "Not Set" : formatCurrency(amount);
}

function formatFinanceStatus(status: "not_set" | "paid" | "partially_paid" | "unpaid"): string {
  switch (status) {
    case "not_set":
      return "Amount Due Not Set";
    case "partially_paid":
      return "Partially Paid";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function formatPaymentMethod(method: "cash" | "mobile_money" | "bank_transfer" | "other"): string {
  switch (method) {
    case "mobile_money":
      return "Mobile Money";
    case "bank_transfer":
      return "Bank Transfer";
    default:
      return method.charAt(0).toUpperCase() + method.slice(1);
  }
}

function formatTransactionStatus(status: "completed" | "cancelled" | "reversed"): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatPaidAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : new Intl.DateTimeFormat("en-GH", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole(["admin", "finance_officer", "headmaster", "assistant_headmaster"]);
  const canManageFinance = hasRole(session.role, session.additionalRoles, "admin") || hasRole(session.role, session.additionalRoles, "finance_officer");
  const params = (await searchParams) ?? {};
  const indexNumber = typeof params.index === "string" ? params.index.trim() : "";
  const invalidIndex = indexNumber.length > 0 && !/^\d{10}$/.test(indexNumber);
  const lookup = indexNumber && !invalidIndex ? await getStudentFinanceByIndex(indexNumber) : null;
  const reconciliation = indexNumber && !invalidIndex ? await getStudentFinancialReconciliation(indexNumber) : null;
  const finance = lookup && !lookup.error ? lookup.data : null;
  let referenceData: Awaited<ReturnType<typeof Promise.all<[ReturnType<typeof getPrograms>, ReturnType<typeof getHouses>, ReturnType<typeof getAcademicYears>, ReturnType<typeof getFeeTypes>]>>> | null = null;

  if (finance) {
    referenceData = await Promise.all([
      getPrograms(),
      getHouses(),
      getAcademicYears(),
      getFeeTypes(),
    ]);
  }

  const [programs, houses, academicYears, feeTypes] = referenceData ?? [[], [], [], []];
  const programName = finance?.student.program_id
    ? programs.find((program) => program.id === finance.student.program_id)?.name ?? "Not assigned"
    : "Not assigned";
  const houseName = finance?.student.house_id
    ? houses.find((house) => house.id === finance.student.house_id)?.name ?? "Not assigned"
    : "Not assigned";
  const academicYearName = finance?.student.academic_year_id
    ? academicYears.find((year) => year.id === finance.student.academic_year_id)?.name ?? "Not assigned"
    : "Not assigned";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Student Financial Overview"
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/requests?status=waiting_release"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-card text-foreground hover:bg-muted shadow-xs transition-all"
            >
              Operational Releases
            </Link>
          </div>
        }
      />

      <section className="rounded-xl border p-4 md:p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--brand-accent)", color: "var(--brand-primary)" }}>
            <Search className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Find a student</h2>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Search by the JHS index number.</p>
          </div>
        </div>

        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <label htmlFor="index" className="text-sm font-medium">JHS Index Number</label>
            <input
              id="index"
              name="index"
              defaultValue={indexNumber}
              inputMode="numeric"
              pattern="[0-9]{10}"
              placeholder="5230101247"
              className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold" style={{ background: "var(--brand-primary)", color: "var(--brand-primary-foreground)" }}>
            <Search className="h-4 w-4" />
            Search
          </button>
        </form>

        {invalidIndex ? (
          <p role="alert" className="mt-3 text-sm text-destructive">Please enter a valid JHS index number.</p>
        ) : null}
      </section>

      {!indexNumber ? (
        <EmptyState icon={<WalletCards className="h-7 w-7" />} title="Search for a student" description="Search for a student to view their financial information." />
      ) : invalidIndex ? null : lookup?.error ? (
        lookup.error === "not_found" ? (
          <EmptyState
            icon={<Search className="h-7 w-7" />}
            title="Student Not Found"
            description="We couldn't find a student with that JHS index number. Please check the index number and try again."
          />
        ) : lookup.error === "unauthorized" ? (
          <ErrorState
            title="You don't have permission to access this financial information."
            description="Please contact an administrator if you believe you should have access."
          />
        ) : (
          <ErrorState
            title="Unable to Load Financial Information"
            description="We could not load this student's financial information. Please try again."
            action={<Link className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted" href={`/finance?index=${encodeURIComponent(indexNumber)}`}>Try again</Link>}
          />
        )
      ) : lookup ? (
        <section className="space-y-6">
          <div className="rounded-xl border p-4 md:p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Student</p>
                <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>{getFullName(lookup.data.student.first_name, lookup.data.student.middle_name, lookup.data.student.last_name)}</h2>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{lookup.data.student.jhs_index_number}</p>
              </div>
              <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--muted)", color: "var(--foreground)" }}>
                {formatFinanceStatus(lookup.data.financial.payment_status)}
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div><p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Academic year</p><p className="font-medium">{academicYearName}</p></div>
              <div><p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Program</p><p className="font-medium">{programName}</p></div>
              <div><p className="text-xs" style={{ color: "var(--muted-foreground)" }}>House</p><p className="font-medium">{houseName}</p></div>
              <div><p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Student type</p><p className="font-medium">{lookup.data.student.student_type === "boarding" ? "Boarding" : "Day"}</p></div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[ ["Total due", lookup.data.financial.total_amount_due], ["Total paid", lookup.data.financial.total_paid], ["Outstanding", lookup.data.financial.outstanding_balance]].map(([label, amount]) => (
              <div key={String(label)} className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{label}</p>
                <p className="mt-2 text-2xl font-semibold" style={{ color: "var(--foreground)" }}>{formatFinancialAmount(amount as number | null)}</p>
              </div>
            ))}
          </div>

          {reconciliation ? <ReconciliationPanel result={reconciliation} /> : null}

          {canManageFinance ? (
            <>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <StudentChargeForm student={lookup.data.student} feeTypes={feeTypes} />
                <AmountDueForm student={lookup.data.student} currentAmount={lookup.data.financial.total_amount_due} />
              </div>

              <PaymentForm
                student={lookup.data.student}
                financial={lookup.data.financial}
                fee_allocations={lookup.data.fee_allocations}
              />
            </>
          ) : null}

          <div className="rounded-xl border p-4 md:p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <h2 className="mb-4 text-lg font-semibold">Charges</h2>
            {lookup.data.fee_allocations.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No student charges are currently available.</p>
            ) : (
              <div className="space-y-3">
                {lookup.data.fee_allocations.map((charge) => (
                  <div key={charge.charge_id} className="flex flex-col gap-1 border-b pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="font-medium">{charge.fee_name}</p><p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{formatAmount(charge.amount_paid)} paid</p></div>
                    <p className="font-semibold">{formatAmount(charge.amount_due)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border p-4 md:p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <h2 className="mb-4 text-lg font-semibold">Recent Payments</h2>
            {lookup.data.recent_payments.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No payments recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs" style={{ color: "var(--muted-foreground)" }}>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Amount</th>
                      <th className="px-3 py-2 font-medium">Payment Method</th>
                      <th className="px-3 py-2 font-medium">Reference</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lookup.data.recent_payments.map((payment) => (
                      <tr key={payment.payment_id} className="border-b last:border-0">
                        <td className="px-3 py-3">{formatPaidAt(payment.paid_at)}</td>
                        <td className="px-3 py-3 font-medium">{formatCurrency(payment.amount)}</td>
                        <td className="px-3 py-3">{formatPaymentMethod(payment.payment_method)}</td>
                        <td className="px-3 py-3">{payment.reference ?? "Not provided"}</td>
                        <td className="px-3 py-3">{formatTransactionStatus(payment.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}