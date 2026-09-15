"use client";

import { Plus, Calendar, Landmark, Users, GraduationCap, Home, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAcademicYearAction, createHouseAction, createProgramAction, createFeeTypeAction, createStaffAction } from "@/lib/actions/admin";
import { ROLES, ROLE_LABELS } from "@/config/constants";

export function AcademicYearCreateForm() {
  return (
    <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="h-4 w-4" /> <span className="font-semibold">Create Academic Year</span>
      </div>
      <form action={createAcademicYearAction} className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2"><Label htmlFor="year-name">Name</Label><Input id="year-name" name="name" required /></div>
        <div className="space-y-2"><Label htmlFor="year-start">Start date</Label><Input id="year-start" name="start_date" type="date" required /></div>
        <div className="space-y-2"><Label htmlFor="year-end">End date</Label><Input id="year-end" name="end_date" type="date" required /></div>
        <div className="flex items-end"><Button type="submit" className="w-full"><Plus className="mr-2 h-4 w-4" />Create</Button></div>
      </form>
    </div>
  );
}

export function HouseCreateForm() {
  return (
    <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="mb-3 flex items-center gap-2">
        <Home className="h-4 w-4" /> <span className="font-semibold">Create House</span>
      </div>
      <form action={createHouseAction} className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="house-name">House name</Label><Input id="house-name" name="name" required /></div>
        <div className="flex items-end"><Button type="submit" className="w-full"><Plus className="mr-2 h-4 w-4" />Create</Button></div>
      </form>
    </div>
  );
}

export function ProgramCreateForm() {
  return (
    <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="mb-3 flex items-center gap-2">
        <GraduationCap className="h-4 w-4" /> <span className="font-semibold">Create Program</span>
      </div>
      <form action={createProgramAction} className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2"><Label htmlFor="program-name">Program name</Label><Input id="program-name" name="name" required /></div>
        <div className="space-y-2"><Label htmlFor="program-code">Code</Label><Input id="program-code" name="code" /></div>
        <div className="flex items-end"><Button type="submit" className="w-full"><Plus className="mr-2 h-4 w-4" />Create</Button></div>
      </form>
    </div>
  );
}

export function FeeTypeCreateForm() {
  return (
    <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="mb-3 flex items-center gap-2">
        <Landmark className="h-4 w-4" /> <span className="font-semibold">Create Fee Type</span>
      </div>
      <form action={createFeeTypeAction} className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2"><Label htmlFor="fee-name">Fee type name</Label><Input id="fee-name" name="name" required /></div>
        <div className="space-y-2"><Label htmlFor="fee-description">Description</Label><Input id="fee-description" name="description" /></div>
        <div className="flex items-end"><Button type="submit" className="w-full"><Plus className="mr-2 h-4 w-4" />Create</Button></div>
      </form>
    </div>
  );
}

export function StaffCreateForm() {
  return (
    <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="mb-3 flex items-center gap-2">
        <Shield className="h-4 w-4" /> <span className="font-semibold">Create Staff</span>
      </div>
      <form action={createStaffAction} className="grid gap-4 md:grid-cols-5">
        <div className="space-y-2"><Label htmlFor="staff-full-name">Full name</Label><Input id="staff-full-name" name="full_name" required /></div>
        <div className="space-y-2"><Label htmlFor="staff-email">Email</Label><Input id="staff-email" name="email" type="email" required /></div>
        <div className="space-y-2"><Label htmlFor="staff-phone">Phone</Label><Input id="staff-phone" name="phone" /></div>
        <div className="space-y-2"><Label htmlFor="staff-role">Role</Label><select id="staff-role" name="role" required className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">
          <option value="">Select role</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r] ?? r}
            </option>
          ))}
        </select></div>
        <div className="space-y-2"><Label htmlFor="staff-password">Password</Label><Input id="staff-password" name="password" type="password" required /></div>
        <div className="flex items-end col-span-full"><Button type="submit" className="w-full"><Users className="mr-2 h-4 w-4" />Create Staff</Button></div>
      </form>
    </div>
  );
}
