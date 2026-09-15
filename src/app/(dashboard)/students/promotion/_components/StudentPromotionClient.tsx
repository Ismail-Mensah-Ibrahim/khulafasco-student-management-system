"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Users,
  ShieldAlert,
} from "lucide-react";
import {
  FORM_LEVELS,
  PROMOTION_OUTCOMES,
  type FormLevel,
  type PromotionOutcome,
} from "@/config/constants";
import type { AcademicYear, SchoolClass, Student } from "@/types";
import {
  executeStudentPromotionAction,
  type PromotionExecutionResult,
} from "@/lib/actions/promotion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StudentPromotionClientProps {
  academicYears: AcademicYear[];
  classes: SchoolClass[];
  students: Student[];
}

export function StudentPromotionClient({
  academicYears,
  classes,
  students,
}: StudentPromotionClientProps) {
  const currentYear = academicYears.find((y) => y.is_current) || academicYears[0];
  const nextYear = academicYears.find((y) => y.id !== currentYear?.id) || currentYear;

  // Cohort selections
  const [sourceYearId, setSourceYearId] = useState<string>(currentYear?.id || "");
  const [sourceLevel, setSourceLevel] = useState<FormLevel>("Form 1");
  const [sourceClassId, setSourceClassId] = useState<string>("all");

  const [destYearId, setDestYearId] = useState<string>(nextYear?.id || "");
  const [destLevel, setDestLevel] = useState<FormLevel | "Graduated">("Form 2");
  const [destClassId, setDestClassId] = useState<string>("");

  // Student list & outcomes
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [studentOutcomes, setStudentOutcomes] = useState<Record<string, PromotionOutcome>>({});

  // Transition & results
  const [isPending, startTransition] = useTransition();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [result, setResult] = useState<PromotionExecutionResult | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Available destination classes for selected destination level
  const destinationClasses = classes.filter(
    (c) =>
      c.academic_year_id === destYearId &&
      (destLevel === "Graduated" || c.form_level === destLevel) &&
      c.is_active !== false
  );

  // Filter eligible students from source
  const eligibleStudents = students.filter((s) => {
    const matchesYear = s.academic_year_id === sourceYearId;
    return matchesYear && s.enrollment_status === "active";
  });

  // Automatically update destination level when source level changes
  function handleSourceLevelChange(newLevel: FormLevel) {
    setSourceLevel(newLevel);
    if (newLevel === "Form 1") {
      setDestLevel("Form 2");
    } else if (newLevel === "Form 2") {
      setDestLevel("Form 3");
    } else if (newLevel === "Form 3") {
      setDestLevel("Graduated");
    }
  }

  // Toggle selection
  function toggleSelectAll() {
    if (selectedStudentIds.size === eligibleStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      const allIds = new Set(eligibleStudents.map((s) => s.id));
      setSelectedStudentIds(allIds);

      // Default all outcomes to PROMOTED (or GRADUATED if Form 3)
      const defaultOutcome: PromotionOutcome = sourceLevel === "Form 3" ? "GRADUATED" : "PROMOTED";
      const initialOutcomes: Record<string, PromotionOutcome> = {};
      eligibleStudents.forEach((s) => {
        initialOutcomes[s.id] = defaultOutcome;
      });
      setStudentOutcomes(initialOutcomes);
    }
  }

  function toggleSelectStudent(id: string) {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      if (!studentOutcomes[id]) {
        setStudentOutcomes((prev) => ({
          ...prev,
          [id]: sourceLevel === "Form 3" ? "GRADUATED" : "PROMOTED",
        }));
      }
    }
    setSelectedStudentIds(next);
  }

  function handleSetStudentOutcome(id: string, outcome: PromotionOutcome) {
    setStudentOutcomes((prev) => ({ ...prev, [id]: outcome }));
  }

  function handleOpenConfirm() {
    if (selectedStudentIds.size === 0) {
      setFeedback({ type: "error", message: "Please select at least one student to promote." });
      return;
    }
    setFeedback(null);
    setIsConfirmOpen(true);
  }

  function handleExecutePromotion() {
    setIsConfirmOpen(false);
    startTransition(async () => {
      const studentItems = Array.from(selectedStudentIds).map((id) => {
        const student = eligibleStudents.find((s) => s.id === id);
        return {
          studentId: id,
          jhsIndexNumber: student?.jhs_index_number || "",
          fullName: `${student?.first_name || ""} ${student?.last_name || ""}`.trim(),
          outcome: studentOutcomes[id] || (sourceLevel === "Form 3" ? "GRADUATED" : "PROMOTED"),
        };
      });

      const res = await executeStudentPromotionAction({
        sourceAcademicYearId: sourceYearId,
        sourceLevel,
        sourceClassId: sourceClassId === "all" ? undefined : sourceClassId,
        destinationAcademicYearId: destYearId,
        destinationLevel: destLevel,
        destinationClassId: destClassId || undefined,
        students: studentItems,
      });

      setResult(res);
      if (res.success) {
        setFeedback({ type: "success", message: res.message });
        setSelectedStudentIds(new Set());
      } else {
        setFeedback({ type: "error", message: res.message });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-lg border text-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="size-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="size-5 text-red-600" />
            )}
            <div>
              <span>{feedback.message}</span>
              {result && result.success && (
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-800 border-emerald-300">
                    Promoted: {result.promotedCount}
                  </Badge>
                  {result.graduatedCount > 0 && (
                    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-300">
                      Graduated: {result.graduatedCount}
                    </Badge>
                  )}
                  {result.repeatedCount > 0 && (
                    <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                      Repeated: {result.repeatedCount}
                    </Badge>
                  )}
                  {result.otherCount > 0 && (
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                      Other / Status Changed: {result.otherCount}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          <Button variant="ghost" size="xs" onClick={() => setFeedback(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Cohort Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Cohort */}
        <Card className="shadow-xs border-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="size-5 text-primary" /> 1. Source Cohort
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Source Academic Year
              </label>
              <select
                value={sourceYearId}
                onChange={(e) => setSourceYearId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.is_current ? "(Current Year)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Current Level
                </label>
                <select
                  value={sourceLevel}
                  onChange={(e) => handleSourceLevelChange(e.target.value as FormLevel)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
                >
                  {FORM_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Class Stream
                </label>
                <select
                  value={sourceClassId}
                  onChange={(e) => setSourceClassId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Class Streams</option>
                  {classes
                    .filter((c) => c.academic_year_id === sourceYearId && c.form_level === sourceLevel)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Destination Cohort */}
        <Card className="shadow-xs border-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <GraduationCap className="size-5 text-emerald-600" /> 2. Destination Placement
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Destination Academic Year
              </label>
              <select
                value={destYearId}
                onChange={(e) => setDestYearId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.is_current ? "(Current Year)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Target Level
                </label>
                <select
                  value={destLevel}
                  onChange={(e) => setDestLevel(e.target.value as FormLevel | "Graduated")}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
                >
                  {sourceLevel === "Form 1" && <option value="Form 2">Form 2</option>}
                  {sourceLevel === "Form 2" && <option value="Form 3">Form 3</option>}
                  {sourceLevel === "Form 3" && <option value="Graduated">Graduated</option>}
                  <option value={sourceLevel}>Repeat {sourceLevel}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Target Class Stream
                </label>
                <select
                  value={destClassId}
                  onChange={(e) => setDestClassId(e.target.value)}
                  disabled={destLevel === "Graduated"}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary disabled:opacity-50"
                >
                  <option value="">
                    {destLevel === "Graduated" ? "N/A (Graduation)" : "Unassigned / Later"}
                  </option>
                  {destinationClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {destLevel !== "Graduated" && destinationClasses.length === 0 && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                <span>Destination classes have not been configured for this year.</span>
                <Link
                  href="/admin/classes"
                  className="font-semibold underline text-amber-900 hover:text-primary"
                >
                  Configure Classes
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Student Cohort Selection Table */}
      <Card className="shadow-xs border-border">
        <CardHeader className="pb-3 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <CardTitle className="text-base font-semibold">
              Eligible Students ({eligibleStudents.length})
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {selectedStudentIds.size} Selected
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="xs" onClick={toggleSelectAll}>
              {selectedStudentIds.size === eligibleStudents.length ? "Deselect All" : "Select All"}
            </Button>
            <Button
              size="xs"
              onClick={handleOpenConfirm}
              disabled={selectedStudentIds.size === 0 || isPending}
            >
              Review & Promote ({selectedStudentIds.size}) <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {eligibleStudents.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="size-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No active students found in this cohort</p>
              <p className="text-xs text-muted-foreground mt-1">Select a different academic year or form level.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border sticky top-0">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.size === eligibleStudents.length && eligibleStudents.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-input text-primary size-4"
                      />
                    </th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">JHS Index Number</th>
                    <th className="px-4 py-3">Program</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Individual Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {eligibleStudents.map((s) => {
                    const isSelected = selectedStudentIds.has(s.id);
                    const outcome =
                      studentOutcomes[s.id] || (sourceLevel === "Form 3" ? "GRADUATED" : "PROMOTED");

                    return (
                      <tr
                        key={s.id}
                        className={`hover:bg-muted/20 transition-colors ${
                          isSelected ? "bg-primary/[0.02]" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectStudent(s.id)}
                            className="rounded border-input text-primary size-4"
                          />
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {s.first_name} {s.middle_name ? `${s.middle_name} ` : ""}{s.last_name}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {s.jhs_index_number}
                        </td>
                        <td className="px-4 py-3">{s.program?.name || "General"}</td>
                        <td className="px-4 py-3 capitalize">{s.student_type}</td>
                        <td className="px-4 py-3">
                          <select
                            value={outcome}
                            onChange={(e) =>
                              handleSetStudentOutcome(s.id, e.target.value as PromotionOutcome)
                            }
                            disabled={!isSelected}
                            className="h-8 px-2 rounded border border-input bg-background text-[11px] font-medium focus:ring-1 focus:ring-primary disabled:opacity-50"
                          >
                            {PROMOTION_OUTCOMES.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CONFIRMATION DIALOG */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-primary" /> Confirm Cohort Promotion
            </DialogTitle>
            <DialogDescription>
              Review the batch academic movement details before writing updates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source Period:</span>
                <span className="font-semibold text-foreground">{sourceLevel} ({academicYears.find((y) => y.id === sourceYearId)?.name})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Destination Period:</span>
                <span className="font-semibold text-foreground">{destLevel} ({academicYears.find((y) => y.id === destYearId)?.name})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Selected:</span>
                <span className="font-bold text-primary">{selectedStudentIds.size} student(s)</span>
              </div>
            </div>

            <p className="text-muted-foreground">
              Every student&apos;s academic enrollment history will be preserved. No previous academic or financial records will be overwritten.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleExecutePromotion} disabled={isPending}>
              {isPending ? "Promoting..." : "Confirm & Execute Promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
