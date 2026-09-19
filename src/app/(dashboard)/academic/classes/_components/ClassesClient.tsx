"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SchoolClass, Subject, TeacherAssignment, Profile, AcademicYear, Semester } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import {
  Search,
  BookOpen,
  GraduationCap,
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Layers,
  UserCheck,
} from "lucide-react";
import {
  createSubjectAction,
  updateSubjectAction,
  toggleSubjectStatusAction,
  deleteSubjectAction,
  assignTeacherAction,
  removeTeacherAssignmentAction,
} from "@/lib/actions/academics";

interface ClassesClientProps {
  classes: SchoolClass[];
  subjects: Subject[];
  assignments?: TeacherAssignment[];
  teachers?: Profile[];
  academicYears?: AcademicYear[];
  semesters?: Semester[];
}

export function ClassesClient({
  classes,
  subjects,
  assignments = [],
  teachers = [],
  academicYears = [],
  semesters = [],
}: ClassesClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"classes" | "assignments" | "subjects">("assignments");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Subject Modal states
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectDept, setSubjectDept] = useState("");
  const [subjectIsElective, setSubjectIsElective] = useState(false);
  const [subjectDesc, setSubjectDesc] = useState("");

  // Teacher Assignment Modal states
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTeacherId, setAssignTeacherId] = useState("");
  const [assignClassId, setAssignClassId] = useState("");
  const [assignSubjectId, setAssignSubjectId] = useState("");
  const [assignYearId, setAssignYearId] = useState(
    academicYears.find((y) => y.is_current)?.id || academicYears[0]?.id || ""
  );
  const [assignSemesterId, setAssignSemesterId] = useState(
    semesters.find((s) => s.is_current)?.id || semesters[0]?.id || ""
  );

  // Filtered datasets
  const filteredClasses = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.form_level && c.form_level.toLowerCase().includes(search.toLowerCase())) ||
      (c.stream && c.stream.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      (s.department && s.department.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredAssignments = assignments.filter((a) => {
    const teacherName = a.teacher?.full_name?.toLowerCase() || "";
    const className = a.class?.name?.toLowerCase() || "";
    const subjectName = a.subject?.name?.toLowerCase() || "";
    const q = search.toLowerCase();
    return teacherName.includes(q) || className.includes(q) || subjectName.includes(q);
  });

  // Handlers for Subject Management
  function handleOpenCreateSubject() {
    setEditingSubject(null);
    setSubjectName("");
    setSubjectCode("");
    setSubjectDept("");
    setSubjectIsElective(false);
    setSubjectDesc("");
    setSubjectModalOpen(true);
    setFeedback(null);
  }

  function handleOpenEditSubject(sub: Subject) {
    setEditingSubject(sub);
    setSubjectName(sub.name);
    setSubjectCode(sub.code);
    setSubjectDept(sub.department || "");
    setSubjectIsElective(sub.is_elective);
    setSubjectDesc(sub.description || "");
    setSubjectModalOpen(true);
    setFeedback(null);
  }

  function handleSaveSubject() {
    if (!subjectName.trim() || !subjectCode.trim()) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", subjectName.trim());
      formData.set("code", subjectCode.trim());
      formData.set("department", subjectDept.trim());
      formData.set("is_elective", String(subjectIsElective));
      formData.set("description", subjectDesc.trim());

      let res;
      if (editingSubject) {
        formData.set("subject_id", editingSubject.id);
        res = await updateSubjectAction(formData);
      } else {
        res = await createSubjectAction(formData);
      }

      if (res.success) {
        setFeedback({ type: "success", message: res.message });
        setSubjectModalOpen(false);
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.message });
      }
    });
  }

  function handleToggleSubjectActive(sub: Subject) {
    const nextStatus = !sub.is_active;
    const msg = nextStatus
      ? `Activate subject ${sub.name}?`
      : `Deactivate subject ${sub.name}? It will no longer be available for new assignments.`;

    if (!confirm(msg)) return;

    startTransition(async () => {
      const res = await toggleSubjectStatusAction(sub.id, nextStatus);
      if (res.success) {
        setFeedback({ type: "success", message: res.message });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.message });
      }
    });
  }

  function handleDeleteSubject(sub: Subject) {
    if (!confirm(`Permanently delete subject "${sub.name}" (${sub.code})? This cannot be undone.`)) return;

    startTransition(async () => {
      const res = await deleteSubjectAction(sub.id);
      if (res.success) {
        setFeedback({ type: "success", message: res.message });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.message });
      }
    });
  }

  // Handlers for Teacher Assignment
  function handleOpenAssignModal() {
    setAssignTeacherId(teachers[0]?.id || "");
    setAssignClassId(classes[0]?.id || "");
    setAssignSubjectId(subjects[0]?.id || "");
    setAssignModalOpen(true);
    setFeedback(null);
  }

  function handleSaveAssignment() {
    if (!assignTeacherId || !assignClassId || !assignSubjectId || !assignYearId) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("teacher_id", assignTeacherId);
      formData.set("class_id", assignClassId);
      formData.set("subject_id", assignSubjectId);
      formData.set("academic_year_id", assignYearId);
      formData.set("semester_id", assignSemesterId || "");

      const res = await assignTeacherAction(formData);
      if (res.success) {
        setFeedback({ type: "success", message: res.message });
        setAssignModalOpen(false);
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.message });
      }
    });
  }

  function handleRemoveAssignment(assignmentId: string, teacherName: string, subjectName: string) {
    if (!confirm(`Remove teaching assignment: ${teacherName} for ${subjectName}?`)) return;

    startTransition(async () => {
      const res = await removeTeacherAssignmentAction(assignmentId);
      if (res.success) {
        setFeedback({ type: "success", message: res.message });
        router.refresh();
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
          className={`p-3.5 rounded-lg flex items-center justify-between text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs uppercase hover:underline opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Controls & Tab Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit flex-wrap">
          <button
            type="button"
            onClick={() => setTab("assignments")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              tab === "assignments"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Teacher Assignments ({assignments.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("classes")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              tab === "classes"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Classes ({classes.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("subjects")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              tab === "subjects"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Subjects &amp; Curriculum ({subjects.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${tab}...`}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {tab === "assignments" && (
            <Button size="sm" onClick={handleOpenAssignModal} className="shrink-0 text-xs">
              <Plus className="size-3.5 mr-1" /> Assign Teacher
            </Button>
          )}

          {tab === "subjects" && (
            <Button size="sm" onClick={handleOpenCreateSubject} className="shrink-0 text-xs">
              <Plus className="size-3.5 mr-1" /> Add Subject
            </Button>
          )}
        </div>
      </div>

      {/* 1. TEACHER ASSIGNMENTS TAB */}
      {tab === "assignments" && (
        <Card className="shadow-xs border-border">
          <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserCheck className="size-4 text-primary" />
                Faculty Class &amp; Subject Assignments
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official instructional allocations linking teachers to subjects and class streams.
              </p>
            </div>
            <Button size="xs" onClick={handleOpenAssignModal}>
              <Plus className="size-3 mr-1" /> New Allocation
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {filteredAssignments.length === 0 ? (
              <div className="py-14 text-center">
                <Users className="size-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">No Teacher Allocations Found</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Assign instructors to academic classes and subjects so they can mark attendance and enter examination scores.
                </p>
                <Button size="sm" onClick={handleOpenAssignModal} className="mt-4">
                  <Plus className="size-3.5 mr-1" /> Create First Assignment
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/60">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Teacher</th>
                      <th className="px-4 py-3 font-semibold">Subject</th>
                      <th className="px-4 py-3 font-semibold">Class / Stream</th>
                      <th className="px-4 py-3 font-semibold">Academic Term</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredAssignments.map((a) => (
                      <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          <div>
                            <p className="font-semibold">{a.teacher?.full_name ?? "Instructor"}</p>
                            <p className="text-[11px] text-muted-foreground">{a.teacher?.email ?? "Staff"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">{a.subject?.name}</span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {a.subject?.code}
                            </Badge>
                          </div>
                          {a.subject?.is_elective && (
                            <span className="text-[10px] text-muted-foreground">Elective</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-[11px] font-medium">
                            {a.class?.name ?? "Class"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {a.semester?.name ? (
                            <span>{a.semester.name}</span>
                          ) : (
                            <span>Full Academic Year</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="xs"
                            disabled={isPending}
                            onClick={() =>
                              handleRemoveAssignment(
                                a.id,
                                a.teacher?.full_name || "Teacher",
                                a.subject?.name || "Subject"
                              )
                            }
                            className="text-destructive hover:bg-destructive/10"
                            title="Remove Allocation"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2. CLASSES ROSTER TAB */}
      {tab === "classes" && (
        <Card className="shadow-xs border-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <GraduationCap className="size-4 text-primary" />
              School Forms &amp; Classes Roster
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {filteredClasses.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No classes match the filter criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClasses.map((cls) => (
                  <div key={cls.id} className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-foreground">{cls.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {cls.form_level}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Program: <strong className="text-foreground">{cls.program?.name ?? "General Stream"}</strong>
                    </p>
                    {cls.stream && (
                      <p className="text-xs text-muted-foreground">
                        Stream / Division: <strong className="text-foreground">{cls.stream}</strong>
                      </p>
                    )}
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Class Teacher:</span>
                      <strong className="text-foreground">{cls.class_teacher?.full_name ?? "Unassigned"}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. CURRICULUM SUBJECTS TAB */}
      {tab === "subjects" && (
        <Card className="shadow-xs border-border">
          <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                Curriculum Subjects Directory
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Core and Elective academic subjects registered for WAEC and continuous assessment.
              </p>
            </div>
            <Button size="xs" onClick={handleOpenCreateSubject}>
              <Plus className="size-3 mr-1" /> Add Subject
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            {filteredSubjects.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No subjects found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSubjects.map((sub) => (
                  <div
                    key={sub.id}
                    className={`p-4 rounded-xl border bg-card shadow-xs space-y-2.5 transition-all ${
                      sub.is_active === false ? "opacity-60 border-border/60 bg-muted/20" : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{sub.name}</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Dept: <strong>{sub.department || "General"}</strong>
                        </p>
                      </div>
                      <Badge variant={sub.is_elective ? "secondary" : "default"} className="text-xs font-mono">
                        {sub.code}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-[10px]">
                        {sub.is_elective ? "Elective Subject" : "Core Subject"}
                      </Badge>
                      <Badge
                        variant={sub.is_active !== false ? "default" : "destructive"}
                        className="text-[10px]"
                      >
                        {sub.is_active !== false ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {sub.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{sub.description}</p>
                    )}

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleOpenEditSubject(sub)}
                        className="text-xs text-primary"
                      >
                        <Edit2 className="size-3 mr-1" /> Edit
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleToggleSubjectActive(sub)}
                          disabled={isPending}
                          className={sub.is_active !== false ? "text-amber-600" : "text-emerald-600"}
                        >
                          {sub.is_active !== false ? (
                            <XCircle className="size-3 mr-1" />
                          ) : (
                            <CheckCircle2 className="size-3 mr-1" />
                          )}
                          {sub.is_active !== false ? "Deactivate" : "Activate"}
                        </Button>

                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleDeleteSubject(sub)}
                          disabled={isPending}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* DIALOG: CREATE / EDIT SUBJECT */}
      <Dialog open={subjectModalOpen} onOpenChange={setSubjectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="size-5 text-primary" />
              {editingSubject ? "Edit Subject" : "Add New Subject"}
            </DialogTitle>
            <DialogDescription>
              Configure school curriculum subject code, department, and classification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <label className="font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Subject Name *
              </label>
              <Input
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g. Core Mathematics"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Subject Code *
                </label>
                <Input
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  placeholder="e.g. MATH"
                  className="font-mono uppercase"
                />
              </div>

              <div>
                <label className="font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Department
                </label>
                <Input
                  value={subjectDept}
                  onChange={(e) => setSubjectDept(e.target.value)}
                  placeholder="e.g. Mathematics"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Subject Type
              </label>
              <div className="flex items-center gap-4 mt-1.5">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="subjectType"
                    checked={!subjectIsElective}
                    onChange={() => setSubjectIsElective(false)}
                    className="accent-primary"
                  />
                  <span>Core Subject (Compulsory)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="subjectType"
                    checked={subjectIsElective}
                    onChange={() => setSubjectIsElective(true)}
                    className="accent-primary"
                  />
                  <span>Elective Subject</span>
                </label>
              </div>
            </div>

            <div>
              <label className="font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Description (Optional)
              </label>
              <Input
                value={subjectDesc}
                onChange={(e) => setSubjectDesc(e.target.value)}
                placeholder="Brief syllabus outline or course note"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setSubjectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isPending || !subjectName.trim() || !subjectCode.trim()}
              onClick={handleSaveSubject}
            >
              {isPending ? "Saving..." : editingSubject ? "Save Changes" : "Create Subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: ASSIGN TEACHER */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="size-5 text-primary" /> Assign Teacher to Class
            </DialogTitle>
            <DialogDescription>
              Assign an instructor to deliver a subject for a specific class and semester.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <label className="font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Select Instructor / Teacher *
              </label>
              <select
                value={assignTeacherId}
                onChange={(e) => setAssignTeacherId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Choose Teacher --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({t.email || t.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Select Subject *
              </label>
              <select
                value={assignSubjectId}
                onChange={(e) => setAssignSubjectId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Choose Subject --</option>
                {subjects
                  .filter((s) => s.is_active !== false)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) - {s.is_elective ? "Elective" : "Core"}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Select Class &amp; Stream *
              </label>
              <select
                value={assignClassId}
                onChange={(e) => setAssignClassId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Choose Class --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.form_level})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Academic Year *
                </label>
                <select
                  value={assignYearId}
                  onChange={(e) => setAssignYearId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.is_current ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Semester (Optional)
                </label>
                <select
                  value={assignSemesterId}
                  onChange={(e) => setAssignSemesterId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  <option value="">Full Academic Year</option>
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.is_current ? "(Active)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isPending || !assignTeacherId || !assignClassId || !assignSubjectId || !assignYearId}
              onClick={handleSaveAssignment}
            >
              {isPending ? "Assigning..." : "Confirm Allocation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
