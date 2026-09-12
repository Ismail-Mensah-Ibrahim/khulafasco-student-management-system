import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { verifySession } from "@/lib/dal";
import { getDashboardSummary, getFinanceDashboardMetrics } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  GraduationCap,
  Home,
  Bus,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
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

  if (session.role === "finance_officer") {
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

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Students" value={String(metrics.totalStudents)} icon={Users} color="var(--brand-primary)" bg="var(--brand-accent)" />
          <StatCard label="Amount Due" value={formatCurrency(metrics.amountDue)} icon={DollarSign} color="var(--brand-primary)" bg="var(--brand-accent)" prefix="GH₵" />
          <StatCard label="Total Collected" value={formatCurrency(metrics.totalCollected)} icon={TrendingUp} color="var(--success)" bg="var(--success-light)" prefix="GH₵" />
          <StatCard label="Outstanding Balance" value={formatCurrency(metrics.outstandingBalance)} icon={AlertCircle} color="var(--warning)" bg="var(--warning-light)" prefix="GH₵" />
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Fully Paid" value={String(metrics.fullyPaid)} icon={CheckCircle2} color="var(--success)" bg="var(--success-light)" />
          <StatCard label="Partially Paid" value={String(metrics.partiallyPaid)} icon={TrendingUp} color="var(--warning)" bg="var(--warning-light)" />
          <StatCard label="Unpaid" value={String(metrics.unpaid)} icon={AlertCircle} color="var(--destructive)" bg="var(--destructive-light)" />
          <StatCard label="Not Set" value={String(metrics.notSet)} icon={DollarSign} color="var(--border)" bg="var(--muted)" />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--foreground)" }}>Finance Attention</h3>
            <div className="space-y-3">
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Amount Due Not Set: {metrics.notSet}</p>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Outstanding Balance: {formatCurrency(metrics.outstandingBalance)}</p>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Partially Paid: {metrics.partiallyPaid}</p>
            </div>
          </div>
          <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--foreground)" }}>Today’s Activity</h3>
            <div className="space-y-3">
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Payments recorded today: {metrics.todayPaymentCount}</p>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Amount collected today: {formatCurrency(metrics.todayCollected)}</p>
            </div>
          </div>
        </section>
      </div>
    );
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
          Enrollment
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Students"
            value={String(summary.totalStudents)}
            icon={Users}
            color="var(--brand-primary)"
            bg="var(--brand-accent)"
          />
          <StatCard
            label="Active"
            value={String(summary.activeStudents)}
            icon={GraduationCap}
            color="var(--success)"
            bg="var(--success-light)"
          />
          <StatCard
            label="Boarding"
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
        </div>
      </section>

      {/* ---- Financial Stats ---- */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--muted-foreground)" }}>
          Finance
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Expected"
            value={formatCurrency(metrics.amountDue)}
            icon={DollarSign}
            color="var(--brand-primary)"
            bg="var(--brand-accent)"
            prefix="GH₵"
          />
          <StatCard
            label="Total Collected"
            value={formatCurrency(metrics.totalCollected)}
            icon={TrendingUp}
            color="var(--success)"
            bg="var(--success-light)"
            prefix="GH₵"
          />
          <StatCard
            label="Outstanding"
            value={formatCurrency(metrics.outstandingBalance)}
            icon={AlertCircle}
            color="var(--warning)"
            bg="var(--warning-light)"
            prefix="GH₵"
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

        {/* Recent activity */}
        <div
          className="rounded-xl p-5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--foreground)" }}>
            Recent Activity
          </h3>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
              style={{ background: "var(--muted)" }}
            >
              <Users className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              No activity yet
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
              Activity will appear here once the system is connected.
            </p>
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
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: bg }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--foreground)" }}>
          {prefix && value !== "—" ? prefix : ""}{value}
        </p>
      </div>
    </div>
  );
}
