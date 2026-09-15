import type { Metadata } from "next";
import { ShieldCheck, Users } from "lucide-react";
import { SCHOOL } from "@/config/branding";
import { ROLE_LABELS } from "@/config/constants";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/dal";
import { getStaffProfiles } from "@/lib/data";
import { StaffCreateForm } from "../_components/AdminCreateForms";

export const metadata: Metadata = {
  title: `Staff Access | ${SCHOOL.shortName}`,
};

export default async function StaffAccessPage() {
  const session = await requireAdmin();
  const staffList = await getStaffProfiles();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Access"
        description={`Manage user accounts, roles, and access credentials for ${SCHOOL.shortName}.`}
      />

      <section
        className="rounded-xl border p-6 md:p-8"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div
              className="inline-flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "var(--brand-accent)", color: "var(--brand-primary)" }}
            >
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div>
              <h2
                className="text-xl font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Provision Staff Account
              </h2>
              <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                Create authorized system accounts across all 8 institutional roles.
              </p>
            </div>
          </div>

          <div
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          >
            Signed in as <span className="font-semibold" style={{ color: "var(--foreground)" }}>{session.fullName}</span>
          </div>
        </div>

        <div className="mt-6">
          <StaffCreateForm />
        </div>
      </section>

      {/* Staff Directory Table */}
      <section
        className="rounded-xl border p-6"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
              Registered Staff Accounts ({staffList.length})
            </h2>
          </div>
        </div>

        <DataTable
          data={staffList}
          keyField="id"
          emptyMessage="No staff profiles found."
          columns={[
            {
              key: "full_name",
              header: "Staff Name",
              cell: (staff) => (
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                    {staff.full_name}
                  </p>
                  {staff.phone && (
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {staff.phone}
                    </p>
                  )}
                </div>
              ),
            },
            {
              key: "role",
              header: "Role / Designation",
              cell: (staff) => (
                <Badge variant="outline" className="text-xs font-semibold">
                  {(ROLE_LABELS as Record<string, string>)[staff.role] ?? staff.role}
                </Badge>
              ),
            },
            {
              key: "is_active",
              header: "Account Status",
              cell: (staff) => (
                <Badge
                  variant={staff.is_active ? "default" : "destructive"}
                  className="text-xs"
                >
                  {staff.is_active ? "Active" : "Disabled"}
                </Badge>
              ),
            },
            {
              key: "created_at",
              header: "Created Date",
              cell: (staff) =>
                new Date(staff.created_at).toLocaleDateString("en-GH", {
                  dateStyle: "medium",
                }),
            },
          ]}
        />
      </section>
    </div>
  );
}
