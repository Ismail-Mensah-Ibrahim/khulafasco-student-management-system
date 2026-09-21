import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SCHOOL } from "@/config/branding";
import { verifySession } from "@/lib/dal";
import { getDashboardSummary, getFinanceDashboardMetrics } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import { hasRole } from "@/config/constants";
import {
  Users,
  Home,
  Bus,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  User,
  UserCheck,
  UserPlus,
  ArrowRight,
  CreditCard,
  Receipt,
  ClipboardList,
} from "lucide-react";

export const metadata: Metadata = {
  title: `Dashboard | ${SCHOOL.shortName}`,
};

/**
 * Dashboard visual shell.
 * Admin receives an administration overview. Finance Officers receive a
 * finance-focused dashboard experience through the same route.
 */
export default async function DashboardPage() {
  const session = await verifySession();

  if (hasRole(session.role, session.additionalRoles, "finance_officer")) {
    const metrics = await getFinanceDashboardMetrics();

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)", fontFamily: "Georgia, serif" }}>
            Finance Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Welcome back, <strong>{session.fullName}</strong>. Today’s student finance operations.
          </p>
        </div>

        <section className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          <StatCard label="Total Students" value={String(metrics.totalStudents)} icon={Users} color="var(--brand-primary)" bg="var(--brand-accent)" />
          <StatCard label="Amount Due" value={formatCurrency(metrics.amountDue)} icon={DollarSign} color="var(--brand-primary)" bg="var(--brand-accent)" />
          <StatCard label="Total Collected" value={formatCurrency(metrics.totalCollected)} icon={TrendingUp} color="var(--success)" bg="var(--success-light)" />
          <StatCard label="Outstanding Balance" value={formatCurrency(metrics.outstandingBalance)} icon={AlertCircle} color="var(--warning)" bg="var(--warning-light)" />
        </section>

        <section className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          <StatCard label="Fully Paid" value={String(metrics.fullyPaid)} icon={CheckCircle2} color="var(--success)" bg="var(--success-light)" />
          <StatCard label="Partially Paid" value={String(metrics.partiallyPaid)} icon={TrendingUp} color="var(--warning)" bg="var(--warning-light)" />
          <StatCard label="Unpaid" value={String(metrics.unpaid)} icon={AlertCircle} color="var(--destructive)" bg="var(--destructive-light)" />
          <StatCard label="Not Set" value={String(metrics.notSet)} icon={DollarSign} color="var(--border)" bg="var(--muted)" />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>Payment Method Breakdown</h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--brand-accent)", color: "var(--brand-primary)" }}>
                All Payment Types
              </span>
            </div>
            <div className="space-y-3">
              {metrics.paymentBreakdown.map((item) => (
                <div key={item.method} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>{item.label}</p>
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{item.count} payment{item.count === 1 ? "" : "s"}</p>
                  </div>
                  <span className="text-sm font-bold tabular-nums" style={{ color: "var(--foreground)" }}>
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>Fee Type Totals</h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--brand-accent)", color: "var(--brand-primary)" }}>
                Active Charges
              </span>
            </div>
            <div className="space-y-3">
              {metrics.feeTypeTotals.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>No fee charges have been recorded yet.</p>
              ) : (
                metrics.feeTypeTotals.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>{item.name}</p>
                      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{item.count} charge{item.count === 1 ? "" : "s"}</p>
                    </div>
                    <span className="text-sm font-bold tabular-nums" style={{ color: "var(--foreground)" }}>
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>Finance Priority Items</h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--warning-light)", color: "var(--warning)" }}>
                Attention Needed
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Amount Due Not Set</p>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Students requiring fee assignment</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tabular-nums" style={{ color: "var(--danger)" }}>{metrics.notSet}</span>
                  <Link
                    href="/finance"
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded border transition-colors"
                    style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--brand-primary)" }}
                  >
                    Configure <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Outstanding Balances</p>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Total fees pending collection</p>
                </div>
                <span className="text-sm font-bold tabular-nums" style={{ color: "var(--warning)" }}>
                  {formatCurrency(metrics.outstandingBalance)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Partially Paid Students</p>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Students with partial payments</p>
                </div>
                <span className="text-sm font-bold tabular-nums" style={{ color: "var(--foreground)" }}>
                  {metrics.partiallyPaid}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>Today&apos;s Activity &amp; Quick Actions</h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--success-light)", color: "var(--success)" }}>
                Live System
              </span>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Payments Today</p>
                  <p className="text-xl font-bold mt-1 tabular-nums" style={{ color: "var(--foreground)" }}>{metrics.todayPaymentCount}</p>
                </div>
                <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Collected Today</p>
                  <p className="text-xl font-bold mt-1 tabular-nums" style={{ color: "var(--success)" }}>{formatCurrency(metrics.todayCollected)}</p>
                </div>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-3">
                <Link
                  href="/finance/payments"
                  className="inline-flex items-center justify-center gap-2 rounded-lg p-3 text-xs font-semibold text-center transition-colors"
                  style={{ background: "var(--brand-primary)", color: "var(--brand-primary-foreground)" }}
                >
                  <CreditCard className="w-4 h-4" /> Record Payment
                </Link>
                <Link
                  href="/finance/receipts"
                  className="inline-flex items-center justify-center gap-2 rounded-lg p-3 text-xs font-semibold border text-center transition-colors"
                  style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--foreground)" }}
                >
                  <Receipt className="w-4 h-4" /> View Receipts
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!hasRole(session.role, session.additionalRoles, "admin")) {
    switch (session.role) {
      case "it_officer":
        redirect("/it/dashboard");
      case "headmaster":
        redirect("/headmaster/dashboard");
      case "academic_head":
        redirect("/academic/dashboard");
      case "teacher":
        redirect("/teacher/dashboard");
      case "house_master":
      case "house_mistress":
        redirect("/house/dashboard");
      case "domestic_officer":
        redirect("/operations/dashboard");
      case "general_staff":
      default:
        redirect("/staff/dashboard");
    }
  }

  const [summary, metrics] = await Promise.all([
    getDashboardSummary(),
    getFinanceDashboardMetrics(),
  ]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--foreground)", fontFamily: "Georgia, serif" }}
        >
          Dashboard
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          Welcome back, <strong>{session.fullName}</strong>. Here is an overview of {SCHOOL.shortName}.
        </p>
      </div>

      {/* ---- Enrollment Stats ---- */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--muted-foreground)" }}>
          Student Statistics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            label="Total Students"
            value={String(summary.totalStudents)}
            icon={Users}
            color="var(--brand-primary)"
            bg="var(--brand-accent)"
          />
          <StatCard
            label="Boarding Students"
            value={String(summary.boardingStudents)}
            icon={Home}
            color="var(--brand-secondary-foreground)"
            bg="var(--brand-accent)"
          />
          <StatCard
            label="Day Students"
            value={String(summary.dayStudents)}
            icon={Bus}
            color="var(--info)"
            bg="var(--info-light)"
          />
          <StatCard
            label="Male Students"
            value={String(summary.maleStudents)}
            icon={User}
            color="var(--brand-primary)"
            bg="var(--brand-accent)"
          />
          <StatCard
            label="Female Students"
            value={String(summary.femaleStudents)}
            icon={UserCheck}
            color="var(--brand-secondary)"
            bg="var(--brand-accent)"
          />
        </div>
      </section>

      {/* ---- Financial Stats ---- */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--muted-foreground)" }}>
          Finance
        </h2>
        <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          <StatCard
            label="Total Expected"
            value={formatCurrency(metrics.amountDue)}
            icon={DollarSign}
            color="var(--brand-primary)"
            bg="var(--brand-accent)"
          />
          <StatCard
            label="Total Collected"
            value={formatCurrency(metrics.totalCollected)}
            icon={TrendingUp}
            color="var(--success)"
            bg="var(--success-light)"
          />
          <StatCard
            label="Outstanding"
            value={formatCurrency(metrics.outstandingBalance)}
            icon={AlertCircle}
            color="var(--warning)"
            bg="var(--warning-light)"
          />
          <StatCard
            label="Fully Paid"
            value={String(metrics.fullyPaid)}
            icon={CheckCircle2}
            color="var(--success)"
            bg="var(--success-light)"
          />
        </div>
      </section>

      {/* ---- Two column: Programs + Recent Activity ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Program distribution */}
        <div
          className="rounded-xl p-5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--foreground)" }}>
            Students by Program
          </h3>
          <div className="space-y-3">
            {summary.programStats.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                No program metrics are available for the current academic year.
              </p>
            ) : (
              summary.programStats.map((program) => (
                <div key={program.name} className="flex items-center gap-3">
                  <span className="text-sm flex-1 truncate" style={{ color: "var(--foreground)" }}>
                    {program.name}
                  </span>
                  <div
                    className="h-2 rounded-full flex-1 max-w-[120px]"
                    style={{ background: "var(--muted)" }}
                  >
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${Math.max(program.percentage, 6)}%`, background: "var(--brand-primary)" }}
                    />
                  </div>
                  <span className="text-xs w-8 text-right tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                    {program.count}
                  </span>
                </div>
              ))
            )}
          </div>
          {summary.currentAcademicYear && (
            <p className="text-xs mt-4 text-center" style={{ color: "var(--muted-foreground)" }}>
              {summary.currentAcademicYear.name}
            </p>
          )}
        </div>

        {/* Administrative Quick Actions */}
        <div
          className="rounded-xl p-5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
              Administrative Quick Actions
            </h3>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "var(--brand-accent)", color: "var(--brand-primary)" }}
            >
              Portal Shortcuts
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/students/enroll"
              className="flex items-center gap-3 p-3.5 rounded-xl border transition-all hover:shadow-xs group"
              style={{
                borderColor: "var(--border)",
                background: "var(--background)",
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                style={{ background: "var(--brand-accent)", color: "var(--brand-primary)" }}
              >
                <UserPlus className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
                  Enroll Student
                </p>
                <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
                  Register admission
                </p>
              </div>
            </Link>

            <Link
              href="/students"
              className="flex items-center gap-3 p-3.5 rounded-xl border transition-all hover:shadow-xs group"
              style={{
                borderColor: "var(--border)",
                background: "var(--background)",
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                style={{ background: "var(--info-light)", color: "var(--info)" }}
              >
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
                  Student Directory
                </p>
                <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
                  Search &amp; edit records
                </p>
              </div>
            </Link>

            <Link
              href="/finance"
              className="flex items-center gap-3 p-3.5 rounded-xl border transition-all hover:shadow-xs group"
              style={{
                borderColor: "var(--border)",
                background: "var(--background)",
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                style={{ background: "var(--success-light)", color: "var(--success)" }}
              >
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
                  Fee Overview
                </p>
                <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
                  Reconciliation &amp; charges
                </p>
              </div>
            </Link>

            <Link
              href="/admin/audit-logs"
              className="flex items-center gap-3 p-3.5 rounded-xl border transition-all hover:shadow-xs group"
              style={{
                borderColor: "var(--border)",
                background: "var(--background)",
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                style={{ background: "var(--brand-accent)", color: "var(--brand-secondary-foreground)" }}
              >
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
                  Audit History
                </p>
                <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
                  Security &amp; event logs
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* House distribution */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--foreground)" }}>
          Students by House
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summary.houseStats.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              No house allocations are available for the current academic year.
            </p>
          ) : (
            summary.houseStats.map((house, i) => {
              const colors = [
                "var(--brand-primary)",
                "var(--brand-secondary)",
                "var(--success)",
                "var(--info)",
              ];
              return (
                <div
                  key={house.name}
                  className="rounded-lg p-4 text-center"
                  style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
                >
                  <div
                    className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: colors[i % colors.length] }}
                  >
                    {house.name[0]}
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                    {house.name}
                  </p>
                  <p className="text-xl font-bold mt-1" style={{ color: colors[i % colors.length] }}>
                    {house.count}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard component (local to dashboard)
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  prefix?: string;
}

function StatCard({ label, value, icon: Icon, color, bg, prefix }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-3.5 sm:p-4 flex flex-col gap-2.5 sm:gap-3 min-w-0"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-xs font-medium truncate" style={{ color: "var(--muted-foreground)" }}>
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: bg }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-lg sm:text-2xl font-bold tabular-nums truncate" style={{ color: "var(--foreground)" }}>
          {prefix && value !== "—" ? prefix : ""}{value}
        </p>
      </div>
    </div>
  );
}

