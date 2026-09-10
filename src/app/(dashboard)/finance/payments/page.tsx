import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CreditCard, Search } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { requireFinanceOrAdmin } from "@/lib/dal";
import { getAcademicYears, getFinancePayments } from "@/lib/data";
import { formatCurrency, getFullName } from "@/lib/utils";
import { paymentListQuerySchema, type FinancePayments, type PaymentListQuery } from "@/lib/validation/finance";
import { SCHOOL } from "@/config/branding";

export const metadata: Metadata = {
  title: `Payments | ${SCHOOL.shortName}`,
};

type PaymentItem = FinancePayments["items"][number];

type SearchParams = Record<string, string | string[] | undefined>;

const PAYMENT_METHOD_LABELS = {
  cash: "Cash",
  mobile_money: "Mobile Money",
  bank_transfer: "Bank Transfer",
  other: "Other",
} as const;

const PAYMENT_STATUS_LABELS = {
  completed: "Completed",
  cancelled: "Cancelled",
  reversed: "Reversed",
} as const;

function getParam(params: SearchParams, name: string): string | undefined {
  const value = params[name];
  return Array.isArray(value) ? value[0] : value;
}

function formatPaidAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : new Intl.DateTimeFormat("en-GH", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusClass(status: PaymentItem["status"]): string {
  switch (status) {
    case "completed":
      return "border-green-200 bg-green-50 text-green-800";
    case "cancelled":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "reversed":
      return "border-red-200 bg-red-50 text-red-800";
  }
}

function StatusBadge({ status }: { status: PaymentItem["status"] }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(status)}`}>
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}

function buildHref(query: Record<string, string>, page: number): string {
  const next = new URLSearchParams(query);
  next.set("page", String(page));
  return `/finance/payments?${next.toString()}`;
}

function Filters({ query, academicYears }: { query: PaymentListQuery; academicYears: Awaited<ReturnType<typeof getAcademicYears>> }) {
  return (
    <form method="get" className="space-y-4">
      <input type="hidden" name="page" value="1" />
      <div className="grid gap-3 lg:grid-cols-[minmax(16rem,2fr)_repeat(4,minmax(0,1fr))]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
          <label htmlFor="payment-search" className="sr-only">Search payments</label>
          <input id="payment-search" name="search" defaultValue={query.search} placeholder="Search by student, index number, receipt or reference..." className="h-9 w-full rounded-lg border border-input bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
        </div>
        <div>
          <label htmlFor="payment-status" className="sr-only">Payment status</label>
          <select id="payment-status" name="status" defaultValue={query.status ?? ""} className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="reversed">Reversed</option>
          </select>
        </div>
        <div>
          <label htmlFor="payment-method" className="sr-only">Payment method</label>
          <select id="payment-method" name="payment_method" defaultValue={query.payment_method ?? ""} className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">
            <option value="">All methods</option>
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="payment-academic-year" className="sr-only">Academic year</label>
          <select id="payment-academic-year" name="academic_year_id" defaultValue={query.academic_year_id ?? ""} className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">
            <option value="">All academic years</option>
            {academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold" style={{ background: "var(--brand-primary)", color: "var(--brand-primary-foreground)" }}>
            <Search className="h-4 w-4" />
            Apply
          </button>
          <Link href="/finance/payments" className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted">Reset</Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
        <div>
          <label htmlFor="paid-from" className="mb-1 block text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Paid from</label>
          <input id="paid-from" name="paid_from" type="date" defaultValue={query.paid_from} className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="paid-to" className="mb-1 block text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Paid to</label>
          <input id="paid-to" name="paid_to" type="date" defaultValue={query.paid_to} className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" />
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm" style={{ color: "var(--muted-foreground)" }}>
        <label htmlFor="payment-page-size">Rows per page</label>
        <select id="payment-page-size" name="page_size" defaultValue={String(query.page_size)} className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm">
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
    </form>
  );
}

export default async function PaymentsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await requireFinanceOrAdmin();
  const params = (await searchParams) ?? {};
  const parsedQuery = paymentListQuerySchema.safeParse({
    search: getParam(params, "search"),
    status: getParam(params, "status") || undefined,
    payment_method: getParam(params, "payment_method") || undefined,
    academic_year_id: getParam(params, "academic_year_id") || undefined,
    paid_from: getParam(params, "paid_from"),
    paid_to: getParam(params, "paid_to"),
    page: getParam(params, "page"),
    page_size: getParam(params, "page_size"),
  });

  let academicYears;
  try {
    academicYears = await getAcademicYears();
  } catch {
    return <ErrorState title="Unable to load payments" description="Unable to load payment filters right now. Please try again." />;
  }

  if (!parsedQuery.success) {
    return <ErrorState title="Invalid payment filters" description="Please review the search and filter values, then try again." action={<Link href="/finance/payments" className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted">Clear filters</Link>} />;
  }

  const query = parsedQuery.data;
  const result = await getFinancePayments(query);
  const queryForUrl: Record<string, string> = {};
  if (query.search) queryForUrl.search = query.search;
  if (query.status) queryForUrl.status = query.status;
  if (query.payment_method) queryForUrl.payment_method = query.payment_method;
  if (query.academic_year_id) queryForUrl.academic_year_id = query.academic_year_id;
  if (query.paid_from) queryForUrl.paid_from = query.paid_from;
  if (query.paid_to) queryForUrl.paid_to = query.paid_to;
  queryForUrl.page_size = String(query.page_size);

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Read-only payment history and management." />
      <section className="rounded-xl border p-4 md:p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--brand-accent)", color: "var(--brand-primary)" }}><CreditCard className="h-5 w-5" /></div>
          <div><h2 className="text-lg font-semibold">Payment history</h2><p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Search and filter payment records without changing financial data.</p></div>
        </div>
        <Filters query={query} academicYears={academicYears} />
      </section>

      {result.error === "unauthorized" ? <ErrorState title="You don't have permission to access payments." description="Please contact an administrator if you believe you should have access." /> : result.error ? <ErrorState title="Unable to load payments" description="Unable to load payment history right now. Please try again." action={<Link href={buildHref(queryForUrl, query.page)} className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted">Try again</Link>} /> : result.data.items.length === 0 ? <EmptyState icon={<CreditCard className="h-7 w-7" />} title="No payments found" description={Object.keys(queryForUrl).length > 1 ? "There are no payments matching your current search or filters." : "No payments have been recorded yet."} /> : (
        <section className="space-y-4">
          <DataTable
            columns={[
              { key: "receipt", header: "Receipt", cell: (payment: PaymentItem) => payment.receipt_number ?? "—" },
              { key: "student", header: "Student", cell: (payment: PaymentItem) => <div><p className="font-medium">{getFullName(payment.student.first_name, payment.student.middle_name, payment.student.last_name)}</p><p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{payment.student.jhs_index_number}</p></div> },
              { key: "amount", header: "Amount", cell: (payment: PaymentItem) => <span className="font-semibold">{formatCurrency(payment.amount)}</span> },
              { key: "method", header: "Method", cell: (payment: PaymentItem) => PAYMENT_METHOD_LABELS[payment.payment_method] },
              { key: "reference", header: "Reference", cell: (payment: PaymentItem) => payment.reference ?? "—" },
              { key: "status", header: "Status", cell: (payment: PaymentItem) => <StatusBadge status={payment.status} /> },
              { key: "paid_at", header: "Paid At", cell: (payment: PaymentItem) => formatPaidAt(payment.paid_at) },
            ]}
            data={result.data.items}
            keyField="id"
          />
          <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Page {result.data.pagination.page} of {result.data.pagination.total_pages} · {result.data.pagination.total_count} results</p>
            <div className="flex gap-2">
              <Link aria-disabled={result.data.pagination.page <= 1} className={`inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium ${result.data.pagination.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-muted"}`} href={buildHref(queryForUrl, result.data.pagination.page - 1)}><ChevronLeft className="h-4 w-4" />Previous</Link>
              <Link aria-disabled={result.data.pagination.page >= result.data.pagination.total_pages} className={`inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium ${result.data.pagination.page >= result.data.pagination.total_pages ? "pointer-events-none opacity-50" : "hover:bg-muted"}`} href={buildHref(queryForUrl, result.data.pagination.page + 1)}>Next<ChevronRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
