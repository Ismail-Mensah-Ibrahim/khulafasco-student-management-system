"use client";

import { useState, useTransition } from "react";
import {
  BookOpen,
  PlusCircle,
  Edit2,
  Archive,
  CheckCircle2,
  Search,
  Filter,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { FORM_LEVELS, type FormLevel } from "@/config/constants";
import type { AcademicYear, Profile, Program, SchoolClass } from "@/types";
import {
  createClassAction,
  updateClassAction,
  assignClassTeacherAction,
  toggleClassActiveAction,
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

interface ClassesManagementClientProps {
  initialClasses: SchoolClass[];
  academicYears: AcademicYear[];
  programs: Program[];
  teachers: Profile[];
  canManage: boolean;
}

export function ClassesManagementClient({
  initialClasses,
  academicYears,
  programs,
  teachers,
  canManage,
}: ClassesManagementClientProps) {
  const [classesList, setClassesList] = useState<SchoolClass[]>(initialClasses);
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editModalClass, setEditModalClass] = useState<SchoolClass | null>(null);
  const [teacherModalClass, setTeacherModalClass] = useState<SchoolClass | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

  // Create Form State
  const [createName, setCreateName] = useState("");
  const [createLevel, setCreateLevel] = useState<FormLevel>("Form 1");
  const [createStream, setCreateStream] = useState("");
  const [createProgramId, setCreateProgramId] = useState("");
  const [createYearId, setCreateYearId] = useState(academicYears.find((y) => y.is_current)?.id || academicYears[0]?.id || "");
  const [createTeacherId, setCreateTeacherId] = useState("");
  const [createCapacity, setCreateCapacity] = useState(50);

  // Filter
  const filteredClasses = classesList.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.stream && c.stream.toLowerCase().includes(search.toLowerCase()));
    const matchesLevel = selectedLevel === "all" || c.form_level === selectedLevel;
    const matchesYear = selectedYear === "all" || c.academic_year_id === selectedYear;
    return matchesSearch && matchesLevel && matchesYear;
  });

  function handleCreateClass() {
    if (!createName.trim()) {
      setFeedback({ type: "error", message: "Class name is required." });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", createName);
      formData.set("form_level", createLevel);
      formData.set("stream", createStream);
      formData.set("program_id", createProgramId);
      formData.set("academic_year_id", createYearId);
      formData.set("class_teacher_id", createTeacherId);
      formData.set("capacity", String(createCapacity));

      const result = await createClassAction(formData);
      if (result.success) {
        setFeedback({ type: "success", message: result.message });
        setIsCreateOpen(false);
        setCreateName("");
        setCreateStream("");
        // Reload list via window or optimistic state
        window.location.reload();
      } else {
        setFeedback({ type: "error", message: result.message });
      }
    });
  }

  function handleUpdateClass() {
    if (!editModalClass) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("class_id", editModalClass.id);
      formData.set("name", editModalClass.name);
      formData.set("form_level", editModalClass.form_level);
      formData.set("stream", editModalClass.stream || "");
      formData.set("program_id", editModalClass.program_id || "");
      formData.set("capacity", String(editModalClass.capacity || 50));

      const result = await updateClassAction(formData);
      if (result.success) {
        setFeedback({ type: "success", message: result.message });
        setEditModalClass(null);
      } else {
        setFeedback({ type: "error", message: result.message });
      }
    });
  }

  function handleSaveTeacherAssignment() {
    if (!teacherModalClass) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("class_id", teacherModalClass.id);
      formData.set("teacher_id", selectedTeacherId);

      const result = await assignClassTeacherAction(formData);
      if (result.success) {
        setFeedback({ type: "success", message: result.message });
        const teacherObj = teachers.find((t) => t.id === selectedTeacherId) || null;
        teacherModalClass.class_teacher_id = selectedTeacherId || null;
        teacherModalClass.class_teacher = teacherObj || undefined;
        setTeacherModalClass(null);
      } else {
        setFeedback({ type: "error", message: result.message });
      }
    });
  }

  function handleToggleClassStatus(c: SchoolClass) {
    const nextActive = !c.is_active;
    const confirmMsg = nextActive
      ? `Re-activate class "${c.name}"?`
      : `Archive class "${c.name}"? Active enrollments will remain historically preserved.`;

    if (!confirm(confirmMsg)) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("class_id", c.id);
      formData.set("active", String(nextActive));

      const result = await toggleClassActiveAction(formData);
      if (result.success) {
        setFeedback({ type: "success", message: result.message });
        c.is_active = nextActive;
        setClassesList([...classesList]);
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

      {/* Action Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="size-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold font-heading text-foreground">
              Class Streams & Cohorts
            </h2>
            <p className="text-xs text-muted-foreground">
              Manage Form 1, Form 2, and Form 3 class streams, capacities, and assigned teachers.
            </p>
          </div>
        </div>

        {canManage && (
          <Button onClick={() => setIsCreateOpen(true)} size="sm">
            <PlusCircle className="size-4 mr-1.5" /> Create Class Stream
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="shadow-xs border-border">
        <CardContent className="pt-4 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search classes or stream labels..."
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="size-4 text-muted-foreground shrink-0" />
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Levels (Form 1 - 3)</option>
              {FORM_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Academic Years</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.is_current ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Classes Grid / Table */}
      {filteredClasses.length === 0 ? (
        <Card className="shadow-xs border-border border-dashed">
          <CardContent className="py-16 text-center">
            <BookOpen className="size-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground">No classes configured</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Classes have not been set up for this academic year yet. The rest of the system continues to operate normally.
            </p>
            {canManage && (
              <Button onClick={() => setIsCreateOpen(true)} size="sm" className="mt-4">
                <PlusCircle className="size-4 mr-1.5" /> Create First Class Stream
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((c) => (
            <Card
              key={c.id}
              className={`shadow-xs border-border transition-all ${
                c.is_active === false ? "opacity-60 bg-muted/30" : ""
              }`}
            >
              <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold">{c.name}</CardTitle>
                    <Badge variant="outline" className="text-[11px] font-semibold">
                      {c.form_level}
                    </Badge>
                  </div>
                  {c.program && (
                    <p className="text-xs text-primary font-medium mt-0.5">{c.program.name}</p>
                  )}
                </div>

                <Badge
                  variant={c.is_active === false ? "destructive" : "default"}
                  className="text-[10px]"
                >
                  {c.is_active === false ? "Archived" : "Active"}
                </Badge>
              </CardHeader>

              <CardContent className="pt-3.5 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Capacity</span>
                    <span className="font-semibold text-foreground">{c.capacity ?? 50} students</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Stream</span>
                    <span className="font-semibold text-foreground">{c.stream || "Standard"}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <UserCheck className="size-3.5 text-primary" />
                    <span>Teacher: <strong>{c.class_teacher?.full_name || "Unassigned"}</strong></span>
                  </div>
                </div>

                {canManage && (
                  <div className="pt-2 border-t border-border/50 flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => {
                        setTeacherModalClass(c);
                        setSelectedTeacherId(c.class_teacher_id || "");
                      }}
                      className="text-xs"
                    >
                      Assign Teacher
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setEditModalClass(c)}
                      title="Edit Class"
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleToggleClassStatus(c)}
                      disabled={isPending}
                      title={c.is_active === false ? "Activate" : "Archive"}
                    >
                      <Archive className="size-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE CLASS MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="size-5 text-primary" /> Create Class Stream
            </DialogTitle>
            <DialogDescription>
              Add a new class for Form 1, Form 2, or Form 3 with program alignment and stream assignment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Class Display Name *
              </label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Form 1A, Form 2 General Arts 1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Form Level *
                </label>
                <select
                  value={createLevel}
                  onChange={(e) => setCreateLevel(e.target.value as FormLevel)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium focus:ring-1 focus:ring-primary"
                >
                  {FORM_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Stream Tag (Optional)
                </label>
                <Input
                  value={createStream}
                  onChange={(e) => setCreateStream(e.target.value)}
                  placeholder="e.g. A, B, Green"
                />
              </div>
            </div>

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
                    {y.name} {y.is_current ? "(Current Academic Year)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Program Alignment (Optional)
              </label>
              <select
                value={createProgramId}
                onChange={(e) => setCreateProgramId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium focus:ring-1 focus:ring-primary"
              >
                <option value="">General / All Programs</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Class Teacher (Optional)
                </label>
                <select
                  value={createTeacherId}
                  onChange={(e) => setCreateTeacherId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium focus:ring-1 focus:ring-primary"
                >
                  <option value="">None Assigned</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Student Capacity
                </label>
                <Input
                  type="number"
                  value={createCapacity}
                  onChange={(e) => setCreateCapacity(Number(e.target.value) || 50)}
                  min={10}
                  max={120}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateClass} loading={isPending} loadingText="Creating..." disabled={isPending || !createName.trim()}>
              Create Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT CLASS MODAL */}
      <Dialog open={!!editModalClass} onOpenChange={(open) => !open && setEditModalClass(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="size-5 text-primary" /> Edit Class Details
            </DialogTitle>
          </DialogHeader>

          {editModalClass && (
            <div className="space-y-4 py-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Class Display Name
                </label>
                <Input
                  value={editModalClass.name}
                  onChange={(e) => setEditModalClass({ ...editModalClass, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Form Level
                  </label>
                  <select
                    value={editModalClass.form_level}
                    onChange={(e) => setEditModalClass({ ...editModalClass, form_level: e.target.value as FormLevel })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium focus:ring-1 focus:ring-primary"
                  >
                    {FORM_LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Stream Tag
                  </label>
                  <Input
                    value={editModalClass.stream || ""}
                    onChange={(e) => setEditModalClass({ ...editModalClass, stream: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Capacity
                </label>
                <Input
                  type="number"
                  value={editModalClass.capacity || 50}
                  onChange={(e) => setEditModalClass({ ...editModalClass, capacity: Number(e.target.value) || 50 })}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setEditModalClass(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleUpdateClass} loading={isPending} loadingText="Saving...">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ASSIGN TEACHER MODAL */}
      <Dialog open={!!teacherModalClass} onOpenChange={(open) => !open && setTeacherModalClass(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="size-5 text-primary" /> Assign Class Teacher
            </DialogTitle>
            <DialogDescription>
              Assign the primary form teacher for <strong>{teacherModalClass?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Select Faculty Member
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium focus:ring-1 focus:ring-primary"
            >
              <option value="">No Class Teacher Assigned</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name} ({t.role.replace("_", " ")})
                </option>
              ))}
            </select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setTeacherModalClass(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveTeacherAssignment} loading={isPending} loadingText="Saving...">
              Save Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
