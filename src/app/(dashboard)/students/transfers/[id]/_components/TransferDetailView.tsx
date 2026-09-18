"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Printer,
  ShieldCheck,
  Building2,
  FileCheck,
  CreditCard,
  GraduationCap,
  Scale,
  XCircle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  verifyAcademicTransferAction,
  verifyFinanceTransferAction,
  approveTransferAction,
  finalizeTransferEnrollmentAction,
  finalizeTransferOutAction,
  rejectTransferAction,
} from "@/lib/actions/transfers";
import type { StudentTransfer, ClearanceStatus } from "@/types";
import type { UserRole } from "@/config/constants";

interface TransferDetailViewProps {
  transfer: StudentTransfer;
  userRole: UserRole;
}

export function TransferDetailView({
  transfer,
  userRole,
}: TransferDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Dialog States
  const [isAcademicDialogOpen, setIsAcademicDialogOpen] = useState(false);
  const [academicStatus, setAcademicStatus] = useState<ClearanceStatus>("cleared");
  const [academicNotes, setAcademicNotes] = useState("");

  const [isFinanceDialogOpen, setIsFinanceDialogOpen] = useState(false);
  const [financeStatus, setFinanceStatus] = useState<ClearanceStatus>("cleared");
  const [financeNotes, setFinanceNotes] = useState("");
  const [financeBalance, setFinanceBalance] = useState(transfer.finance_balance || 0);

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const isIn = transfer.direction === "transfer_in";
  const isHeadOrAdmin = ["admin", "headmaster"].includes(userRole);
  const isAcademicOrAdmin = ["admin", "academic_head", "headmaster"].includes(userRole);
  const isFinanceOrAdmin = ["admin", "finance_officer", "headmaster"].includes(userRole);

  // Stepper calculations
  const step1 = true; // Submitted
  const step2 = transfer.academic_clearance_status === "cleared";
  const step3 = transfer.finance_clearance_status === "cleared" || transfer.finance_clearance_status === "waived";
  const step4 = ["approved", "enrolled", "completed"].includes(transfer.status);

  // Submit Academic Clearance
  function handleAcademicClearanceSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("transfer_id", transfer.id);
      fd.append("status", academicStatus);
      if (academicNotes) fd.append("notes", academicNotes);

      const res = await verifyAcademicTransferAction(fd);
      setIsAcademicDialogOpen(false);
      if (res.success) {
        setStatusMessage({ type: "success", text: res.message });
        router.refresh();
      } else {
        setStatusMessage({ type: "error", text: res.message });
      }
    });
  }

  // Submit Financial Clearance
  function handleFinanceClearanceSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("transfer_id", transfer.id);
      fd.append("status", financeStatus);
      if (financeNotes) fd.append("notes", financeNotes);
      fd.append("balance", String(financeBalance));

      const res = await verifyFinanceTransferAction(fd);
      setIsFinanceDialogOpen(false);
      if (res.success) {
        setStatusMessage({ type: "success", text: res.message });
        router.refresh();
      } else {
        setStatusMessage({ type: "error", text: res.message });
      }
    });
  }

  // Approve Transfer
  function handleApproveTransfer() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("transfer_id", transfer.id);

      const res = await approveTransferAction(fd);
      if (res.success) {
        setStatusMessage({ type: "success", text: res.message });
        router.refresh();
      } else {
        setStatusMessage({ type: "error", text: res.message });
      }
    });
  }

  // Finalize Enrollment (Transfer-In)
  function handleFinalizeEnrollment() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("transfer_id", transfer.id);

      const res = await finalizeTransferEnrollmentAction(fd);
      if (res.success) {
        setStatusMessage({ type: "success", text: res.message });
        router.refresh();
      } else {
        setStatusMessage({ type: "error", text: res.message });
      }
    });
  }

  // Finalize Departure (Transfer-Out)
  function handleFinalizeDeparture() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("transfer_id", transfer.id);

      const res = await finalizeTransferOutAction(fd);
      if (res.success) {
        setStatusMessage({ type: "success", text: res.message });
        router.refresh();
      } else {
        setStatusMessage({ type: "error", text: res.message });
      }
    });
  }

  // Reject Transfer
  function handleRejectTransfer() {
    if (!rejectReason) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("transfer_id", transfer.id);
      fd.append("reason", rejectReason);

      const res = await rejectTransferAction(fd);
      setIsRejectDialogOpen(false);
      if (res.success) {
        setStatusMessage({ type: "success", text: res.message });
        router.refresh();
      } else {
        setStatusMessage({ type: "error", text: res.message });
      }
    });
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto print:p-0">
      {/* Top Back & Print Bar */}
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link href="/students/transfers">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <ArrowLeft className="size-4" />
            <span>Back to Transfer Registry</span>
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-xs"
          >
            <Printer className="size-4" />
            <span>Print Transfer Slip</span>
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          role="alert"
          className={`p-4 rounded-xl border text-sm flex items-center justify-between print:hidden ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="size-5 text-destructive shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusMessage(null)}
            className="h-7 text-xs"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Main Header Banner */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-lg font-bold text-foreground">
                  {transfer.transfer_reference}
                </span>
                {isIn ? (
                  <Badge
                    variant="outline"
                    className="text-emerald-700 bg-emerald-50 border-emerald-200 text-xs gap-1"
                  >
                    <ArrowDownLeft className="size-3.5" /> Transfer-In (Admission)
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-amber-700 bg-amber-50 border-amber-200 text-xs gap-1"
                  >
                    <ArrowUpRight className="size-3.5" /> Transfer-Out (Departure)
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={`capitalize text-xs font-semibold ${
                    transfer.status === "completed" || transfer.status === "enrolled" || transfer.status === "approved"
                      ? "text-emerald-800 bg-emerald-50 border-emerald-200"
                      : transfer.status === "rejected"
                      ? "text-destructive bg-destructive/10 border-destructive/30"
                      : "text-amber-800 bg-amber-50 border-amber-200"
                  }`}
                >
                  {transfer.status.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-sm font-semibold text-foreground">
                Student: {transfer.first_name} {transfer.middle_name ? `${transfer.middle_name} ` : ""}{transfer.last_name}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                JHS/BECE Index: {transfer.jhs_index_number} &bull; Gender: <span className="capitalize">{transfer.gender}</span> &bull; Date: {new Date(transfer.transfer_date).toLocaleDateString("en-GH", { dateStyle: "medium" })}
              </p>
            </div>

            {/* WAEC STP Official Badge */}
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/[0.03] text-right space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-primary tracking-wider flex items-center justify-end gap-1">
                <FileCheck className="size-3" /> WAEC / GES STP Standard
              </span>
              <p className="text-[11px] text-muted-foreground">
                Ghanaian SHS Transfer Verification
              </p>
            </div>
          </div>

          {/* Stepper Tracker */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-6 mt-6 border-t border-border">
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                step1 ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground"
              }`}
            >
              <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                1
              </div>
              <div>
                <p className="font-semibold">Application</p>
                <p className="text-[10px] text-muted-foreground">Registered</p>
              </div>
            </div>

            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                step2
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : transfer.academic_clearance_status === "flagged"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-border text-muted-foreground"
              }`}
            >
              <div className="size-6 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                {step2 ? <Check className="size-3.5 text-emerald-700" /> : "2"}
              </div>
              <div>
                <p className="font-semibold">Academic Clearance</p>
                <p className="text-[10px] capitalize">
                  {transfer.academic_clearance_status}
                </p>
              </div>
            </div>

            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                step3
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : transfer.finance_clearance_status === "flagged"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-border text-muted-foreground"
              }`}
            >
              <div className="size-6 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                {step3 ? <Check className="size-3.5 text-emerald-700" /> : "3"}
              </div>
              <div>
                <p className="font-semibold">Finance Clearance</p>
                <p className="text-[10px] capitalize">
                  {transfer.finance_clearance_status}
                </p>
              </div>
            </div>

            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                step4
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : transfer.status === "rejected"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-border text-muted-foreground"
              }`}
            >
              <div className="size-6 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                {step4 ? <Check className="size-3.5 text-emerald-700" /> : "4"}
              </div>
              <div>
                <p className="font-semibold">Headmaster Clearance</p>
                <p className="text-[10px] capitalize">
                  {transfer.status.replace("_", " ")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dual Column Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Academic Clearance Card */}
        <Card className="border-border">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GraduationCap className="size-4 text-primary" />
                Academic Head Clearance
              </CardTitle>
              <CardDescription>
                Verification of academic transcripts, BECE qualifications & level placement.
              </CardDescription>
            </div>
            {transfer.academic_clearance_status === "cleared" ? (
              <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-xs">
                Cleared
              </Badge>
            ) : transfer.academic_clearance_status === "flagged" ? (
              <Badge variant="outline" className="text-destructive bg-destructive/10 border-destructive/30 text-xs">
                Flagged
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 text-xs">
                Pending
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-1">
              <span className="text-muted-foreground font-semibold uppercase text-[10px]">Origin / Destination:</span>
              <p className="font-medium text-foreground">
                {isIn ? `From: ${transfer.previous_school}` : `To: ${transfer.destination_school}`}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground font-semibold uppercase text-[10px]">Academic Notes / Remarks:</span>
              <p className="bg-muted/30 p-2.5 rounded-lg border border-border text-foreground">
                {transfer.academic_clearance_notes || "No academic clearance remarks recorded yet."}
              </p>
            </div>

            {transfer.academic_cleared_at && (
              <p className="text-[11px] text-muted-foreground">
                Cleared on: {new Date(transfer.academic_cleared_at).toLocaleString("en-GH")}
              </p>
            )}

            {isAcademicOrAdmin && transfer.status !== "rejected" && transfer.status !== "completed" && transfer.status !== "enrolled" && (
              <div className="pt-2 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAcademicDialogOpen(true)}
                  className="w-full text-xs gap-1.5"
                >
                  <FileCheck className="size-3.5 text-primary" />
                  Sign Academic Clearance
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Clearance Card */}
        <Card className="border-border">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="size-4 text-primary" />
                Finance Officer Clearance
              </CardTitle>
              <CardDescription>
                Verification of fee settlement, departmental clearances, and outstanding arrears.
              </CardDescription>
            </div>
            {transfer.finance_clearance_status === "cleared" ? (
              <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-xs">
                Cleared
              </Badge>
            ) : transfer.finance_clearance_status === "waived" ? (
              <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 text-xs">
                Waived
              </Badge>
            ) : transfer.finance_clearance_status === "flagged" ? (
              <Badge variant="outline" className="text-destructive bg-destructive/10 border-destructive/30 text-xs">
                Flagged
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 text-xs">
                Pending
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg border border-border bg-muted/20">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold">Total Due</span>
                <p className="font-mono font-bold mt-0.5">GHS {Number(transfer.finance_total_due || 0).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold">Total Paid</span>
                <p className="font-mono font-bold mt-0.5 text-emerald-700">GHS {Number(transfer.finance_total_paid || 0).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold">Arrears</span>
                <p className={`font-mono font-bold mt-0.5 ${Number(transfer.finance_balance || 0) > 0 ? "text-destructive" : "text-emerald-700"}`}>
                  GHS {Number(transfer.finance_balance || 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground font-semibold uppercase text-[10px]">Finance Notes:</span>
              <p className="bg-muted/30 p-2.5 rounded-lg border border-border text-foreground">
                {transfer.finance_clearance_notes || "No financial clearance remarks recorded yet."}
              </p>
            </div>

            {transfer.finance_cleared_at && (
              <p className="text-[11px] text-muted-foreground">
                Cleared on: {new Date(transfer.finance_cleared_at).toLocaleString("en-GH")}
              </p>
            )}

            {isFinanceOrAdmin && transfer.status !== "rejected" && transfer.status !== "completed" && transfer.status !== "enrolled" && (
              <div className="pt-2 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsFinanceDialogOpen(true)}
                  className="w-full text-xs gap-1.5"
                >
                  <CreditCard className="size-3.5 text-primary" />
                  Sign Finance Clearance
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transfer Information Details Card */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Official Grounds & Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="space-y-1">
            <span className="text-muted-foreground font-semibold uppercase text-[10px]">Reason for Transfer:</span>
            <p className="text-foreground p-3 rounded-lg border border-border bg-muted/10 font-medium">
              {transfer.reason || "N/A"}
            </p>
          </div>

          {transfer.documentation_notes && (
            <div className="space-y-1">
              <span className="text-muted-foreground font-semibold uppercase text-[10px]">Supporting Documents / Verification:</span>
              <p className="text-foreground p-3 rounded-lg border border-border bg-muted/10">
                {transfer.documentation_notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* HEADMASTER / ADMIN GOVERNANCE ACTION BAR */}
      {isHeadOrAdmin && transfer.status !== "rejected" && transfer.status !== "completed" && transfer.status !== "enrolled" && (
        <Card className="border-primary/30 bg-primary/[0.02] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              Executive Headmaster Decision & Final Authorization
            </CardTitle>
            <CardDescription className="text-xs">
              As Headmaster or System Admin, verify clearances and authorize the final transfer execution.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsRejectDialogOpen(true)}
                disabled={isPending}
                className="text-xs gap-1.5"
              >
                <XCircle className="size-4" /> Reject Transfer
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {transfer.status !== "approved" && (
                <Button
                  size="sm"
                  onClick={handleApproveTransfer}
                  disabled={isPending}
                  className="bg-primary text-primary-foreground text-xs gap-1.5"
                >
                  <CheckCircle2 className="size-4" /> Approve Transfer
                </Button>
              )}

              {transfer.status === "approved" && isIn && (
                <Button
                  size="sm"
                  onClick={handleFinalizeEnrollment}
                  disabled={isPending}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5"
                >
                  <Scale className="size-4" /> Finalize Admission (Auto-Allocate House)
                </Button>
              )}

              {transfer.status === "approved" && !isIn && (
                <Button
                  size="sm"
                  onClick={handleFinalizeDeparture}
                  disabled={isPending}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5"
                >
                  <Building2 className="size-4" /> Finalize Departure & Release Student
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ACADEMIC CLEARANCE DIALOG */}
      <Dialog open={isAcademicDialogOpen} onOpenChange={setIsAcademicDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Academic Head Clearance</DialogTitle>
            <DialogDescription>
              Review the student&apos;s academic standing, syllabus alignment, and admission records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-2">
              <Label>Academic Decision</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={academicStatus === "cleared" ? "default" : "outline"}
                  onClick={() => setAcademicStatus("cleared")}
                  className="w-full text-xs"
                >
                  Cleared
                </Button>
                <Button
                  type="button"
                  variant={academicStatus === "flagged" ? "destructive" : "outline"}
                  onClick={() => setAcademicStatus("flagged")}
                  className="w-full text-xs"
                >
                  Flagged (Issue)
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="academic-notes">Clearance Notes / Remarks</Label>
              <Textarea
                id="academic-notes"
                value={academicNotes}
                onChange={(e) => setAcademicNotes(e.target.value)}
                placeholder="e.g. Verified BECE certificate and terminal continuous assessment scores."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAcademicDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAcademicClearanceSubmit} disabled={isPending}>
              {isPending ? "Submitting..." : "Save Academic Clearance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FINANCIAL CLEARANCE DIALOG */}
      <Dialog open={isFinanceDialogOpen} onOpenChange={setIsFinanceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finance Officer Clearance</DialogTitle>
            <DialogDescription>
              Confirm account reconciliation, fee bill settlements, or apply an authorized waiver.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-2">
              <Label>Clearance Status</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={financeStatus === "cleared" ? "default" : "outline"}
                  onClick={() => setFinanceStatus("cleared")}
                  className="w-full text-xs"
                >
                  Cleared
                </Button>
                <Button
                  type="button"
                  variant={financeStatus === "waived" ? "secondary" : "outline"}
                  onClick={() => setFinanceStatus("waived")}
                  className="w-full text-xs"
                >
                  Waived
                </Button>
                <Button
                  type="button"
                  variant={financeStatus === "flagged" ? "destructive" : "outline"}
                  onClick={() => setFinanceStatus("flagged")}
                  className="w-full text-xs"
                >
                  Flagged
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="finance-balance">Adjust Outstanding Arrears (GHS)</Label>
              <Input
                id="finance-balance"
                type="number"
                step="0.01"
                value={financeBalance}
                onChange={(e) => setFinanceBalance(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="finance-notes">Finance Notes / Receipt References</Label>
              <Textarea
                id="finance-notes"
                value={financeNotes}
                onChange={(e) => setFinanceNotes(e.target.value)}
                placeholder="e.g. All term charges fully settled; receipt #RC-2025-0819 issued."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFinanceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFinanceClearanceSubmit} disabled={isPending}>
              {isPending ? "Submitting..." : "Save Finance Clearance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REJECT DIALOG */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Student Transfer</DialogTitle>
            <DialogDescription>
              Please enter the official reason for rejecting this transfer application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Rejection Grounds *</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Insufficient academic documentation or unmet Ministry transfer requirements."
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectTransfer}
              disabled={isPending || !rejectReason}
            >
              {isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
