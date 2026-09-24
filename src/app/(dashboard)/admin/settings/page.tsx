import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Layers,
  Home,
  DollarSign,
  Shield,
  ClipboardList,
  ArrowRight,
  School,
} from "lucide-react";
import { SCHOOL } from "@/config/branding";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/dal";
import {
  getAcademicYears,
  getPrograms,
  getHouses,
  getFeeTypes,
  getStaffProfiles,
} from "@/lib/data";

export const metadata: Metadata = {
  title: `System Settings | ${SCHOOL.shortName}`,
};

export default async function SettingsPage() {
  await requireAdmin();

  const [academicYears, programs, houses, feeTypes, staff] = await Promise.all([
    getAcademicYears(),
    getPrograms(),
    getHouses(),
    getFeeTypes(),
    getStaffProfiles(),
  ]);

  const currentYear = academicYears.find((y) => y.is_current);

  const modules = [
    {
      title: "Academic Years",
      description: "Manage academic sessions, term calendars, and set the active academic year.",
      href: "/admin/academic-years",
      icon: BookOpen,
      count: `${academicYears.length} configured`,
      badge: currentYear ? `Active: ${currentYear.name}` : undefined,
    },
    {
      title: "Academic Programs",
      description: "Define study courses, departments, and educational tracks for admission.",
      href: "/admin/programs",
      icon: Layers,
      count: `${programs.length} programs`,
    },
    {
      title: "Houses of Residence",
      description: "Configure boarding houses, hall names, and residential allocations.",
      href: "/admin/houses",
      icon: Home,
      count: `${houses.length} houses`,
    },
    {
      title: "Fee Types & Structure",
      description: "Establish tuition, boarding, PTA, and operational charge categories.",
      href: "/admin/fee-types",
      icon: DollarSign,
      count: `${feeTypes.length} fee types`,
    },
    {
      title: "Staff Access & Accounts",
      description: "Provision staff user accounts across institutional system roles.",
      href: "/admin/staff",
      icon: Shield,
      count: `${staff.length} staff members`,
    },
    {
      title: "Security & Audit Logs",
      description: "Inspect immutable audit records of all administrative and financial actions.",
      href: "/admin/audit-logs",
      icon: ClipboardList,
      count: "System-wide tracking",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings"
        description={`Institutional configurations and master data management for ${SCHOOL.shortName}.`}
      />

      {/* Institutional Profile Card */}
      <Card className="shadow-xs border-border">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <School className="size-4 text-primary" />
            Institutional Identity & Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Official Institution</p>
              <p className="font-semibold text-foreground mt-0.5">{SCHOOL.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">School Motto</p>
              <p className="font-semibold text-foreground mt-0.5 italic">&ldquo;{SCHOOL.motto}&rdquo;</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Official Abbreviation</p>
              <p className="font-semibold text-foreground mt-0.5">{SCHOOL.abbreviation} / {SCHOOL.shortName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Receipt Number Prefix</p>
              <p className="font-semibold text-foreground mt-0.5 font-mono">{SCHOOL.receiptPrefix}-YYYY-XXXX</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Modules Grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Master Data & System Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.href} className="shadow-xs border-border hover:border-primary/40 transition-colors">
                <CardContent className="pt-5 flex flex-col justify-between h-full space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {m.count}
                      </span>
                    </div>
                    <h3 className="font-semibold text-base text-foreground">{m.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{m.description}</p>
                    {m.badge && (
                      <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {m.badge}
                      </span>
                    )}
                  </div>

                  <Button
                    render={<Link href={m.href} />}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs justify-between group"
                  >
                    <span>Configure {m.title}</span>
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
