import { AlertTriangle, CheckCircle2, ClipboardCheck, Search } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import type { StudentFinancialReconciliationResult } from "@/lib/data";
import { formatCurrency, getFullName } from "@/lib/utils";

interface ReconciliationPanelProps {
  result: StudentFinancialReconciliationResult;
}

function formatAmount(value: number | null): string {
  return value === null ? "Not Set" : formatCurrency(value);
}

function getStatusCopy(status: NonNullable<StudentFinancialReconciliationResult["data"]>["financial"]["reconciliation_status"]): {
  label: string;
  description: string;
  tone: string;
  icon: typeof CheckCircle2;
} {
  switch (status) {
    case "amount_due_not_set":
      return {
        label: "Amount Due Not Set",
        description: "A total amount due has not been set for this student.",
        tone: "border-amber-200 bg-amber-50 text-amber-900",
        icon: AlertTriangle,
      };
    case "charges_below_total_due":
      return {
        label: "Charges Below Total Due",
        description: "Charges are below total amount due.",
        tone: "border-amber-200 bg-amber-50 text-amber-900",
        icon: AlertTriangle,
      };
    case "charges_above_total_due":
      return {
        label: "Charges Above Total Due",
        description: "Charges exceed total amount due.",
        tone: "border-red-200 bg-red-50 text-red-900",
        icon: AlertTriangle,
      };
    case "balanced":
      return {
        label: "Balanced",
        description: "Charges match total amount due.",
        tone: "border-green-200 bg-green-50 text-green-900",
        icon: CheckCircle2,
      };
  }
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      <p className="mt-2 text-xl font-semibold" style={{ color: "var(--foreground)" }}>{value}</p>
    </div>
  );
}

export function ReconciliationPanel({ result }: ReconciliationPanelProps) {
  if (result.error === "not_found") {
    return <EmptyState icon={<Search className="h-7 w-7" />} title="Student Not Found" description="Student not found. Please check the JHS/BECE Index Number." />;
  }

  if (result.error === "unauthorized") {
    return <ErrorState title="You don't have permission to access this financial information." description="Please contact an administrator if you believe you should have access." />;
  }

  if (result.error) {
    return <ErrorState title="Unable to Load Financial Reconciliation" description="Unable to load financial reconciliation." />;
  }

  const { student, financial } = result.data;
  const status = getStatusCopy(financial.reconciliation_status);
  const StatusIcon = status.icon;

  return (
    <section className="rounded-xl border p-4 md:p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
            <h2 className="text-lg font-semibold">Financial Reconciliation</h2>
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Authoritative comparison of total amount due and current academic-year fee charges.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-sm font-semibold">{getFullName(student.first_name, student.middle_name, student.last_name)}</p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{student.jhs_index_number} · {student.student_type === "boarding" ? "Boarding" : "Day"}</p>
        </div>
      </div>

      <div className={`flex items-start gap-3 rounded-lg border p-4 ${status.tone}`}>
        <StatusIcon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">Reconciliation Status</p>
          <p className="mt-1 font-semibold">{status.label}</p>
          <p className="mt-1 text-sm">{status.description}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Total Amount Due" value={formatAmount(financial.total_amount_due)} />
        <Metric label="Total Fee Charges" value={formatCurrency(financial.total_fee_charges)} />
        <Metric label="Total Paid" value={formatCurrency(financial.total_paid)} />
        <Metric label="Outstanding Balance" value={formatAmount(financial.outstanding_balance)} />
        <Metric label="Charge Difference" value={formatAmount(financial.charge_difference)} />
      </div>
    </section>
  );
}