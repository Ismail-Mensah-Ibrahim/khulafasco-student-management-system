"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Building2,
  GraduationCap,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createTransferInAction, type TransferActionResult } from "@/lib/actions/transfers";
import type { AcademicYear, Program, House, SchoolClass } from "@/types";

interface TransferInFormProps {
  academicYears: AcademicYear[];
  programs: Program[];
  houses: House[];
  classes: SchoolClass[];
}

export function TransferInForm({
  academicYears,
  programs,
  houses,
  classes,
}: TransferInFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<TransferActionResult | null>(null);

  const currentYear = academicYears.find((y) => y.is_current) || academicYears[0];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createTransferInAction(formData);
      setResult(res);
      if (res.success && res.transferId) {
        setTimeout(() => {
          router.push(`/students/transfers/${res.transferId}`);
        }, 1500);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      {result && !result.success && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center gap-2"
        >
          <AlertCircle className="size-5 shrink-0" />
          <span>{result.message}</span>
        </div>
      )}

      {result && result.success && (
        <div
          role="status"
          className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm flex items-center gap-2"
        >
          <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold">{result.message}</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Redirecting to clearance and verification dashboard...
            </p>
          </div>
        </div>
      )}

      {/* Section 1: Student Biodata */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ArrowDownLeft className="size-5 text-primary" />
            1. Student Identification & Biodata
          </CardTitle>
          <CardDescription>
            Enter the student&apos;s canonical BECE/JHS 10-digit index number and official biodata.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jhs_index_number">
                JHS/BECE Index Number *
              </Label>
              <Input
                id="jhs_index_number"
                name="jhs_index_number"
                placeholder="e.g. 1012345678"
                maxLength={20}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Canonical 10-digit identifier required by the Ghana Education Service.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <select
                id="gender"
                name="gender"
                required
                defaultValue="male"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input id="first_name" name="first_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="middle_name">Middle Name</Label>
              <Input id="middle_name" name="middle_name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input id="last_name" name="last_name" required />
            </div>
          </div>

          <div className="space-y-2 sm:w-1/2">
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input id="date_of_birth" name="date_of_birth" type="date" />
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Origin School & Previous Academic Records */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            2. Origin School & Prior Enrollment History
          </CardTitle>
          <CardDescription>
            Specify where the student is transferring from and their last completed class.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="previous_school">Origin School Name *</Label>
            <Input
              id="previous_school"
              name="previous_school"
              placeholder="e.g. Achimota Senior High School"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="previous_form">Last Form Completed</Label>
              <select
                id="previous_form"
                name="previous_form"
                defaultValue="Form 1"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="Form 1">Form 1</option>
                <option value="Form 2">Form 2</option>
                <option value="Form 3">Form 3</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="previous_class">Previous Class / Stream</Label>
              <Input
                id="previous_class"
                name="previous_class"
                placeholder="e.g. Science 1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="previous_academic_year">Previous Academic Year</Label>
              <Input
                id="previous_academic_year"
                name="previous_academic_year"
                placeholder="e.g. 2024/2025"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Target Placement at Khulafasco */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <GraduationCap className="size-5 text-primary" />
            3. Placement at Khulafasco Senior High
          </CardTitle>
          <CardDescription>
            Set the admitting academic year, program, level, stream, and residential house.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_academic_year_id">
                Admitting Academic Year *
              </Label>
              <select
                id="target_academic_year_id"
                name="target_academic_year_id"
                required
                defaultValue={currentYear?.id}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.is_current ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_form">Target Level *</Label>
              <select
                id="target_form"
                name="target_form"
                required
                defaultValue="Form 1"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="Form 1">Form 1</option>
                <option value="Form 2">Form 2</option>
                <option value="Form 3">Form 3</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_program_id">Program</Label>
              <select
                id="target_program_id"
                name="target_program_id"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select Program</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_class_id">Class / Stream</Label>
              <select
                id="target_class_id"
                name="target_class_id"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select Stream</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_house_id" className="flex items-center gap-1">
                <span>Residential House</span>
                <Scale className="size-3.5 text-primary" />
              </Label>
              <select
                id="target_house_id"
                name="target_house_id"
                defaultValue=""
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Auto-Assign (Gender-Balanced)</option>
                {houses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Transfer Justification & Documentation */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileCheck className="size-5 text-primary" />
            4. Transfer Justification & Documentation
          </CardTitle>
          <CardDescription>
            Record the official grounds for admission and supporting document references.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Transfer *</Label>
            <Textarea
              id="reason"
              name="reason"
              placeholder="e.g. Parental relocation from Greater Accra to Ashanti Region; recommendation from Regional Education Directorate."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentation_notes">
              Documentation & Official Verification Notes
            </Label>
            <Textarea
              id="documentation_notes"
              name="documentation_notes"
              placeholder="e.g. Official WAEC STP Slip Verified (#WAEC-2025-0982); Original Terminal Report cards from Origin School inspected."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Internal Remarks / Academic Head Notes</Label>
            <Input
              id="remarks"
              name="remarks"
              placeholder="e.g. Admitted on protocol; pending official transcript from previous headmaster."
            />
          </div>
        </CardContent>
      </Card>

      {/* Submission Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link href="/students/transfers">
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-emerald-700 hover:bg-emerald-800 text-white min-w-44"
        >
          {isPending ? "Submitting Application..." : "Submit Transfer-In Application"}
        </Button>
      </div>
    </form>
  );
}
