import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
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
 * Real data will be wired from Supabase in Milestone 3.
 */
export default function DashboardPage() {
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
          Welcome back. Here is an overview of {SCHOOL.shortName}.
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
            value="—"
            icon={Users}
            color="var(--brand-primary)"
            bg="var(--brand-accent)"
          />
          <StatCard
            label="Active"
            value="—"
            icon={GraduationCap}
            color="var(--success)"
            bg="var(--success-light)"
          />
          <StatCard
            label="Boarding"
            value="—"
            icon={Home}
            color="var(--brand-secondary-foreground)"
            bg="var(--brand-accent)"
          />
          <StatCard
            label="Day Students"
            value="—"
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
            value="—"
            icon={DollarSign}
            color="var(--brand-primary)"
            bg="var(--brand-accent)"
            prefix="GH₵"
          />
          <StatCard
            label="Total Collected"
            value="—"
            icon={TrendingUp}
            color="var(--success)"
            bg="var(--success-light)"
            prefix="GH₵"
          />
          <StatCard
            label="Outstanding"
            value="—"
            icon={AlertCircle}
            color="var(--warning)"
            bg="var(--warning-light)"
            prefix="GH₵"
          />
          <StatCard
            label="Fully Paid"
            value="—"
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
            {[
              "General Arts",
              "General Science",
              "Business",
              "Home Economics",
              "General Agric",
            ].map((program) => (
              <div key={program} className="flex items-center gap-3">
                <span className="text-sm flex-1 truncate" style={{ color: "var(--foreground)" }}>
                  {program}
                </span>
                <div
                  className="h-2 rounded-full flex-1 max-w-[120px]"
                  style={{ background: "var(--muted)" }}
                >
                  <div
                    className="h-2 rounded-full"
                    style={{ width: "0%", background: "var(--brand-primary)" }}
                  />
                </div>
                <span className="text-xs w-6 text-right tabular-nums"
                  style={{ color: "var(--muted-foreground)" }}>
                  —
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs mt-4 text-center" style={{ color: "var(--muted-foreground)" }}>
            Data will load after Supabase is connected (Milestone 3)
          </p>
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
          {["Abubakar", "Umar", "Uthman", "Ali"].map((house, i) => {
            const colors = [
              "var(--brand-primary)",
              "var(--brand-secondary)",
              "var(--success)",
              "var(--info)",
            ];
            return (
              <div
                key={house}
                className="rounded-lg p-4 text-center"
                style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
              >
                <div
                  className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: colors[i] }}
                >
                  {house[0]}
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  {house}
                </p>
                <p className="text-xl font-bold mt-1" style={{ color: colors[i] }}>
                  —
                </p>
              </div>
            );
          })}
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
