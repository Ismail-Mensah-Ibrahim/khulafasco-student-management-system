import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { SCHOOL } from "@/config/branding";
import { PageHeader } from "@/components/shared/PageHeader";
import { requireAdmin } from "@/lib/dal";
import { getStaffProfiles, getHouses } from "@/lib/data";
import { StaffCreateForm } from "../_components/AdminCreateForms";
import { StaffManagementClient } from "./_components/StaffManagementClient";

export const metadata: Metadata = {
  title: `Staff Access | ${SCHOOL.shortName}`,
};

export default async function StaffAccessPage() {
  const session = await requireAdmin();
  const [staffList, houses] = await Promise.all([getStaffProfiles(), getHouses()]);

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
                Create authorized system accounts across institutional roles.
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

      {/* Staff Management & Directory */}
      <StaffManagementClient
        initialStaffList={staffList}
        currentUserId={session.id}
        houses={houses}
      />
    </div>
  );
}
