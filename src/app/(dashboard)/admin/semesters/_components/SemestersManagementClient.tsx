"use client";

import { useState, useTransition } from "react";
import {
  Calendar,
  PlusCircle,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Star,
} from "lucide-react";
import type { AcademicYear, Semester } from "@/types";
import {
  createSemesterAction,
  updateSemesterAction,
  setCurrentSemesterAction,
  deleteSemesterAction,
} from "@/lib/actions/academic-lifecycle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SemestersManagementClientProps {
  initialSemesters: Semester[];
  academicYears: AcademicYear[];
  canManage: boolean;
}

export function SemestersManagementClient({
  initialSemesters,
  academicYears,
  canManage,
}: SemestersManagementClientProps) {
  const [semestersList, setSemestersList] = useState<Semester[]>(initialSemesters);
  const [selectedYearId, setSelectedYearId] = useState<string>(
    academicYears.find((y) => y.is_current)?.id || academicYears[0]?.id || "all"
  );

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editModalSemester, setEditModalSemester] = useState<Semester | null>(null);
  const [deleteModalSemester, setDeleteModalSemester] = useState<Semester | null>(null);

  // Form State
  const [createYearId, setCreateYearId] = useState(
    academicYears.find((y) => y.is_current)?.id || academicYears[0]?.id || ""
  );
  const [createName, setCreateName] = useState("Semester 1");
  const [createNumber, setCreateNumber] = useState(1);
  const [createStartDate, setCreateStartDate] = useState("");
  const [createEndDate, setCreateEndDate] = useState("");
  const [createIsCurrent, setCreateIsCurrent] = useState(false);

  // Filter
  const filteredSemesters = semestersList.filter((s) => {
    return selectedYearId === "all" || s.academic_year_id === selectedYearId;
  });

  function handleCreate() {
    if (!createYearId || !createName.trim() || !createStartDate || !createEndDate) {
      setFeedback({ type: "error", message: "All fields are required to create a semester." });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("academic_year_id", createYearId);
      formData.set("name", createName);
      formData.set("semester_number", String(createNumber));
      formData.set("start_date", createStartDate);
      formData.set("end_date", createEndDate);
      formData.set("is_current", String(createIsCurrent));

      const result = await createSemesterAction(formData);
      if (result.success) {
        setFeedback({ type: "success", message: result.message });
        setIsCreateOpen(false);
        window.location.reload();
      } else {
        setFeedback({ type: "error", message: result.message });
      }
    });
  }

  function handleUpdate() {
    if (!editModalSemester) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("semester_id", editModalSemester.id);
      formData.set("name", editModalSemester.name);
      formData.set("start_date", editModalSemester.start_date);
      formData.set("end_date", editModalSemester.end_date);

      const result = await updateSemesterAction(formData);
      if (result.success) {
        setFeedback({ type: "success", message: result.message });
        setEditModalSemester(null);
      } else {
        setFeedback({ type: "error", message: result.message });
      }
    });
  }

  function handleSetCurrent(s: Semester) {
    if (s.is_current) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("semester_id", s.id);
      formData.set("academic_year_id", s.academic_year_id);

      const result = await setCurrentSemesterAction(formData);
      if (result.success) {
        setFeedback({ type: "success", message: result.message });
        setSemestersList((prev) =>
          prev.map((item) =>
            item.academic_year_id === s.academic_year_id
              ? { ...item, is_current: item.id === s.id }
              : item
          )
        );
      } else {
        setFeedback({ type: "error", message: result.message });
      }
    });
  }

  function handleDelete() {
    if (!deleteModalSemester) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("semester_id", deleteModalSemester.id);

      const result = await deleteSemesterAction(formData);
      if (result.success) {
        setFeedback({ type: "success", message: result.message });
        setSemestersList((prev) => prev.filter((item) => item.id !== deleteModalSemester.id));
        setDeleteModalSemester(null);
      } else {
        setFeedback({ type: "error", message: result.message });
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
              <AlertCircle className="size-5 text-red-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <Button variant="ghost" size="xs" onClick={() => setFeedback(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="size-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold font-heading text-foreground">
              Academic Semesters
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure terms and active semester periods tied to academic years.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Academic Years</option>
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name} {y.is_current ? "(Current Year)" : ""}
              </option>
            ))}
          </select>

          {canManage && (
            <Button onClick={() => setIsCreateOpen(true)} size="sm">
              <PlusCircle className="size-4 mr-1.5" /> Add Semester
            </Button>
          )}
        </div>
      </div>

      {/* Semesters Cards / List */}
      {filteredSemesters.length === 0 ? (
        <Card className="shadow-xs border-border border-dashed">
          <CardContent className="py-16 text-center">
            <Calendar className="size-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground">No semesters configured</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Semesters have not been configured for this academic year yet. The application continues to operate without interruption.
            </p>
            {canManage && (
              <Button onClick={() => setIsCreateOpen(true)} size="sm" className="mt-4">
                <PlusCircle className="size-4 mr-1.5" /> Configure Semester
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSemesters.map((s) => (
            <Card
              key={s.id}
              className={`shadow-xs border-border ${
                s.is_current ? "border-primary/50 bg-primary/[0.02]" : ""
              }`}
            >
              <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold">{s.name}</CardTitle>
                    {s.is_current && (
                      <Badge className="bg-primary text-white text-[10px] px-2 py-0.5">
                        <Star className="size-2.5 mr-1 fill-white" /> Active Semester
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Year: <strong>{s.academic_year?.name || "Standard Year"}</strong>
                  </p>
                </div>

                <Badge variant="outline" className="text-xs">
                  Term #{s.semester_number}
                </Badge>
              </CardHeader>

              <CardContent className="pt-3.5 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Start Date</span>
                    <span className="font-semibold text-foreground">
                      {new Date(s.start_date).toLocaleDateString("en-GH", { dateStyle: "medium" })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">End Date</span>
                    <span className="font-semibold text-foreground">
                      {new Date(s.end_date).toLocaleDateString("en-GH", { dateStyle: "medium" })}
                    </span>
                  </div>
                </div>

                {canManage && (
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                    {!s.is_current ? (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleSetCurrent(s)}
                        disabled={isPending}
                        className="text-xs"
                      >
                        Set as Active
                      </Button>
                    ) : (
                      <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> Current Academic Term
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditModalSemester(s)}
                        title="Edit Dates"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setDeleteModalSemester(s)}
                        disabled={s.is_current || isPending}
                        title="Delete Semester"
                        className="text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE SEMESTER MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="size-5 text-primary" /> Create Semester Record
            </DialogTitle>
            <DialogDescription>
              Configure Semester 1 or Semester 2 tied to an academic year.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Academic Year *
              </label>
              <select
                value={createYearId}
                onChange={(e) => setCreateYearId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium focus:ring-1 focus:ring-primary"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.is_current ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Semester Name *
                </label>
                <Input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Semester 1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Semester Number
                </label>
                <Input
                  type="number"
                  value={createNumber}
                  onChange={(e) => setCreateNumber(Number(e.target.value) || 1)}
                  min={1}
                  max={4}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Start Date *
                </label>
                <Input
                  type="date"
                  value={createStartDate}
                  onChange={(e) => setCreateStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  End Date *
                </label>
                <Input
                  type="date"
                  value={createEndDate}
                  onChange={(e) => setCreateEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isCurrentSem"
                checked={createIsCurrent}
                onChange={(e) => setCreateIsCurrent(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary size-4"
              />
              <label htmlFor="isCurrentSem" className="text-xs font-medium text-foreground cursor-pointer">
                Set as active current semester for this academic year
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} loading={isPending} loadingText="Creating..." disabled={isPending || !createName.trim()}>
              Save Semester
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={!!editModalSemester} onOpenChange={(open) => !open && setEditModalSemester(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="size-5 text-primary" /> Edit Semester
            </DialogTitle>
          </DialogHeader>

          {editModalSemester && (
            <div className="space-y-4 py-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Semester Name
                </label>
                <Input
                  value={editModalSemester.name}
                  onChange={(e) => setEditModalSemester({ ...editModalSemester, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={editModalSemester.start_date}
                    onChange={(e) => setEditModalSemester({ ...editModalSemester, start_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={editModalSemester.end_date}
                    onChange={(e) => setEditModalSemester({ ...editModalSemester, end_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setEditModalSemester(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleUpdate} loading={isPending} loadingText="Saving...">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE MODAL */}
      <Dialog open={!!deleteModalSemester} onOpenChange={(open) => !open && setDeleteModalSemester(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="size-5" /> Delete Semester
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteModalSemester?.name}</strong>? This action will fail if student enrollments depend on it.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setDeleteModalSemester(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} loading={isPending} loadingText="Deleting...">
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
