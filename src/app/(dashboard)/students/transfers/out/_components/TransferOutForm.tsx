"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Building2,
  AlertTriangle,
  CreditCard,
  User,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createTransferOutAction, type TransferActionResult } from "@/lib/actions/transfers";
import type { ActiveTransferStudent } from "@/lib/data";

interface TransferOutFormProps {
  students: ActiveTransferStudent[];
}

export function TransferOutForm({ students }: TransferOutFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<TransferActionResult | null>(null);

  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [studentSearch, setStudentSearch] = useState<string>("");

  // Filter students by search term
  const filteredStudents = students.filter((s) => {
    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.jhs_index_number.toLowerCase().includes(q) ||
      (s.programName && s.programName.toLowerCase().includes(q))
    );
  });

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedStudentId) {
      setResult({ success: false, message: "Please select an active student to transfer out." });
      return;
    }

    setResult(null);
    const formData = new FormData(e.currentTarget);
    formData.set("student_id", selectedStudentId);

    startTransition(async () => {
      const res = await createTransferOutAction(formData);
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

      {/* Section 1: Student Selection & Live Clearance Pre-Check */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="size-5 text-primary" />
            1. Select Active Student for Transfer Clearance
          </CardTitle>
          <CardDescription>
            Choose an actively enrolled student to begin their clearance process. Historical academic and fee records will remain intact.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student-filter">Search Student by Name or Index Number</Label>
            <div className="relative">
              <Search className="size-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                id="student-filter"
                placeholder="Type student name or 10-digit index..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="student_id">Active Student Directory *</Label>
            <select
              id="student_id"
              name="student_id"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">-- Choose a student ({filteredStudents.length} available) --</option>
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.jhs_index_number}) &mdash; {s.programName || "General"} &bull; Balance: GHS {s.balance.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Student Pre-Check Card */}
          {selectedStudent && (
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-foreground text-sm">
                    {selectedStudent.fullName}
                  </h4>
                  <p className="text-xs text-muted-foreground font-mono">
                    Index: {selectedStudent.jhs_index_number} &bull; Gender: <span className="capitalize">{selectedStudent.gender}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedStudent.programName && (
                    <Badge variant="outline" className="text-xs">
                      {selectedStudent.programName}
                    </Badge>
                  )}
                  {selectedStudent.houseName && (
                    <Badge variant="outline" className="text-xs">
                      {selectedStudent.houseName}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Financial Balance Check */}
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="size-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Account Balance Check:</span>
                </div>
                {selectedStudent.balance === 0 ? (
                  <Badge
                    variant="outline"
                    className="text-emerald-700 bg-emerald-50 border-emerald-200 text-xs gap-1"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Fees Fully Cleared (GHS 0.00)
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-amber-800 bg-amber-50 border-amber-200 text-xs gap-1"
                  >
                    <AlertTriangle className="size-3.5 text-amber-600" />
                    Outstanding Arrears: GHS {selectedStudent.balance.toFixed(2)}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Destination School */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            2. Destination School Details
          </CardTitle>
          <CardDescription>
            Specify the admitting institution receiving the student.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="destination_school">Destination Senior High School Name *</Label>
            <Input
              id="destination_school"
              name="destination_school"
              placeholder="e.g. Prempeh College, Kumasi"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Transfer Justification & Notes */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ArrowUpRight className="size-5 text-primary" />
            3. Transfer Reason & Clearance Documentation
          </CardTitle>
          <CardDescription>
            State the formal reason and attach notes on official departure documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Transfer-Out *</Label>
            <Textarea
              id="reason"
              name="reason"
              placeholder="e.g. Family relocation to Ashanti Region; official transfer granted by Headmaster."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentation_notes">Supporting Documents & Clearance Checklist</Label>
            <Textarea
              id="documentation_notes"
              name="documentation_notes"
              placeholder="e.g. Parent application letter attached; Library books returned; Departmental laboratory equipment cleared."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Internal Remarks</Label>
            <Input
              id="remarks"
              name="remarks"
              placeholder="e.g. Transfer certificate requested for collection on Friday."
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link href="/students/transfers">
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
        <Button
          type="submit"
          disabled={isPending || !selectedStudentId}
          className="min-w-44"
        >
          {isPending ? "Submitting Clearance..." : "Initiate Transfer-Out Clearance"}
        </Button>
      </div>
    </form>
  );
}
