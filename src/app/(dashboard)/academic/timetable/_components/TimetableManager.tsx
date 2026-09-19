"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TimetableEntry, SchoolClass, Subject, Profile, AcademicYear, Semester } from "@/types";
import type { TeacherWorkloadItem } from "@/lib/data";
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
  Calendar,
  Plus,
  Trash2,
  BookOpen,
  Users,
  Clock,
  BarChart3,
  Send,
  EyeOff,
  Edit2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  createTimetableEntryAction,
  updateTimetableEntryAction,
  deleteTimetableEntryAction,
  publishTimetableAction,
  unpublishTimetableAction,
} from "@/lib/actions/academics";
import { TIMETABLE_DAYS } from "@/config/constants";

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

interface TimetableManagerProps {
  entries: TimetableEntry[];
  academicYears: AcademicYear[];
  semesters: Semester[];
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Profile[];
  workload: TeacherWorkloadItem[];
}

export default function TimetableManager({
  entries,
  academicYears,
  semesters,
  classes,
  subjects,
  teachers,
  workload,
}: TimetableManagerProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"grid" | "workload" | "manage">("grid");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const currentYear = academicYears.find((y) => y.is_current) ?? academicYears[0];
  const [filterYearId, setFilterYearId] = useState(currentYear?.id ?? "");
  const [filterSemesterId, setFilterSemesterId] = useState("");
  const [filterClassId, setFilterClassId] = useState("");

  // Add dialog
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    class_id: "",
    subject_id: "",
    teacher_id: "",
    academic_year_id: currentYear?.id ?? "",
    semester_id: "",
    day_of_week: "Monday",
    period_number: "1",
    start_time: "07:30",
    end_time: "08:20",
    room: "",
  });

  // Edit dialog
  const [editEntry, setEditEntry] = useState<TimetableEntry | null>(null);
  const [editForm, setEditForm] = useState({
    teacher_id: "",
    day_of_week: "Monday",
    period_number: "1",
    start_time: "07:30",
    end_time: "08:20",
    room: "",
    class_id: "",
  });

  // Delete dialog
  const [deleteEntry, setDeleteEntry] = useState<TimetableEntry | null>(null);

  const filteredEntries = entries.filter((e) => {
    if (filterYearId && e.academic_year_id !== filterYearId) return false;
    if (filterSemesterId && e.semester_id !== filterSemesterId) return false;
    if (filterClassId && e.class_id !== filterClassId) return false;
    return true;
  });

  const filteredSemesters = semesters.filter((s) => !filterYearId || s.academic_year_id === filterYearId);

  const notify = (msg: string, isError = false) => {
    if (isError) setError(msg);
    else setSuccess(msg);
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  };

  function openAdd() {
    setAddForm({
      class_id: filterClassId || "",
      subject_id: "",
      teacher_id: "",
      academic_year_id: filterYearId || currentYear?.id || "",
      semester_id: filterSemesterId || "",
      day_of_week: "Monday",
      period_number: "1",
      start_time: "07:30",
      end_time: "08:20",
      room: "",
    });
    setShowAdd(true);
  }

  function openEdit(entry: TimetableEntry) {
    setEditEntry(entry);
    setEditForm({
      teacher_id: entry.teacher_id ?? "",
      day_of_week: entry.day_of_week,
      period_number: String(entry.period_number),
      start_time: entry.start_time,
      end_time: entry.end_time,
      room: entry.room ?? "",
      class_id: entry.class_id,
    });
  }

  function handleAdd() {
    setError("");
    const fd = new FormData();
    Object.entries(addForm).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const res = await createTimetableEntryAction(fd);
      if (res.success) { setShowAdd(false); notify(res.message); router.refresh(); }
      else notify(res.message, true);
    });
  }

  function handleEdit() {
    if (!editEntry) return;
    setError("");
    const fd = new FormData();
    fd.append("id", editEntry.id);
    Object.entries(editForm).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const res = await updateTimetableEntryAction(fd);
      if (res.success) { setEditEntry(null); notify(res.message); router.refresh(); }
      else notify(res.message, true);
    });
  }

  function handleDelete() {
    if (!deleteEntry) return;
    startTransition(async () => {
      const res = await deleteTimetableEntryAction(deleteEntry.id);
      if (res.success) { setDeleteEntry(null); notify(res.message); router.refresh(); }
      else notify(res.message, true);
    });
  }

  function handlePublish(publish: boolean) {
    const fd = new FormData();
    fd.append("academic_year_id", filterYearId || currentYear?.id || "");
    if (filterSemesterId) fd.append("semester_id", filterSemesterId);
    startTransition(async () => {
      const res = publish ? await publishTimetableAction(fd) : await unpublishTimetableAction(fd);
      if (res.success) notify(res.message);
      else notify(res.message, true);
      router.refresh();
    });
  }

  const isPublished = filteredEntries.length > 0 && filteredEntries.every((e) => e.is_published);
  const hasUnpublished = filteredEntries.some((e) => !e.is_published);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <Calendar className="size-6 text-primary" /> Timetable Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Build, publish, and manage the school weekly timetable.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hasUnpublished && filteredEntries.length > 0 && (
            <Button onClick={() => handlePublish(true)} disabled={isPending} variant="default" size="sm">
              <Send className="size-4 mr-1" /> Publish Timetable
            </Button>
          )}
          {isPublished && (
            <Button onClick={() => handlePublish(false)} disabled={isPending} variant="outline" size="sm">
              <EyeOff className="size-4 mr-1" /> Unpublish
            </Button>
          )}
          <Button onClick={openAdd} disabled={isPending} variant="outline" size="sm">
            <Plus className="size-4 mr-1" /> Add Entry
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {success && <div className="rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-sm flex items-center gap-2"><CheckCircle2 className="size-4 shrink-0" /> {success}</div>}
      {error && <div className="rounded-md bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm flex items-center gap-2"><AlertTriangle className="size-4 shrink-0" /> {error}</div>}

      {/* Filters */}
      <Card className="shadow-xs">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Academic Year</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filterYearId}
                onChange={(e) => { setFilterYearId(e.target.value); setFilterSemesterId(""); }}
              >
                <option value="">All Years</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Semester</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filterSemesterId}
                onChange={(e) => setFilterSemesterId(e.target.value)}
              >
                <option value="">All Semesters</option>
                {filteredSemesters.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Class</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filterClassId}
                onChange={(e) => setFilterClassId(e.target.value)}
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-xs border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Total Periods</p>
            <p className="text-2xl font-bold text-primary mt-1">{filteredEntries.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Published</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{filteredEntries.filter((e) => e.is_published).length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-l-4 border-l-amber-500">
          <CardContent className="pt-4">
            <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Draft</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{filteredEntries.filter((e) => !e.is_published).length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Teachers</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{new Set(filteredEntries.map((e) => e.teacher_id).filter(Boolean)).size}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["grid", "manage", "workload"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t === "grid" ? "📅 Weekly Grid" : t === "manage" ? "📋 Entry List" : "📊 Teacher Workload"}
          </button>
        ))}
      </div>

      {/* Weekly Grid Tab */}
      {tab === "grid" && (
        <Card className="shadow-xs overflow-x-auto">
          <CardContent className="pt-4 p-0">
            <table className="w-full text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border border-border px-3 py-2 text-left font-semibold w-20">Period</th>
                  {TIMETABLE_DAYS.map((day) => (
                    <th key={day} className="border border-border px-3 py-2 text-center font-semibold">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period) => (
                  <tr key={period} className="hover:bg-muted/20">
                    <td className="border border-border px-3 py-2 font-medium text-muted-foreground bg-muted/30">P{period}</td>
                    {TIMETABLE_DAYS.map((day) => {
                      const cell = filteredEntries.find(
                        (e) => e.day_of_week === day && e.period_number === period
                      );
                      return (
                        <td key={day} className="border border-border px-2 py-1.5 min-w-[120px] align-top">
                          {cell ? (
                            <div
                              className={`rounded p-1.5 cursor-pointer transition-colors ${cell.is_published ? "bg-emerald-50 border border-emerald-200 hover:bg-emerald-100" : "bg-blue-50 border border-blue-200 hover:bg-blue-100"}`}
                              onClick={() => openEdit(cell)}
                            >
                              <p className="font-semibold text-foreground leading-tight truncate">{cell.subject?.name ?? "—"}</p>
                              <p className="text-muted-foreground truncate">{cell.class?.name ?? "—"}</p>
                              <p className="text-muted-foreground truncate">{cell.teacher?.full_name ?? "—"}</p>
                              {cell.room && <p className="text-muted-foreground">Room {cell.room}</p>}
                              <p className="text-muted-foreground">{cell.start_time}–{cell.end_time}</p>
                              {!cell.is_published && <Badge variant="outline" className="text-[10px] px-1 py-0 mt-1 border-amber-400 text-amber-600">Draft</Badge>}
                            </div>
                          ) : (
                            <button
                              className="w-full h-12 rounded border border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-colors flex items-center justify-center text-muted-foreground"
                              onClick={() => {
                                setAddForm((f) => ({ ...f, day_of_week: day, period_number: String(period), class_id: filterClassId || "", academic_year_id: filterYearId || currentYear?.id || "", semester_id: filterSemesterId || "" }));
                                setShowAdd(true);
                              }}
                            >
                              <Plus className="size-3" />
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Entry List Tab */}
      {tab === "manage" && (
        <div className="space-y-3">
          {filteredEntries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
              <Calendar className="size-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No timetable entries yet.</p>
              <p className="text-sm mt-1">Use the grid view or &quot;Add Entry&quot; to create entries.</p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/30 transition-colors">
                <div className="text-center min-w-[60px]">
                  <p className="text-xs font-bold text-primary">{entry.day_of_week.slice(0, 3)}</p>
                  <p className="text-xs text-muted-foreground">P{entry.period_number}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{entry.subject?.name ?? "—"}</p>
                    <Badge variant="secondary" className="text-xs">{entry.class?.name ?? "—"}</Badge>
                    {entry.is_published ? (
                      <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">Published</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">Draft</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {entry.teacher && <p className="text-xs text-muted-foreground">{entry.teacher.full_name}</p>}
                    <p className="text-xs text-muted-foreground">{entry.start_time} – {entry.end_time}</p>
                    {entry.room && <p className="text-xs text-muted-foreground">Room {entry.room}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(entry)}>
                    <Edit2 className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteEntry(entry)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Teacher Workload Tab */}
      {tab === "workload" && (
        <div className="space-y-3">
          {workload.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
              <BarChart3 className="size-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No teacher assignments yet.</p>
            </div>
          ) : (
            workload.filter((w) => w.assignedClassesCount > 0 || w.weeklyPeriodsCount > 0).map((w) => (
              <Card key={w.teacherId} className="shadow-xs">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Users className="size-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{w.teacherName}</p>
                        <p className="text-xs text-muted-foreground">{w.teacherEmail}</p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                        <div className="rounded-md bg-muted/30 px-3 py-2 text-center">
                          <p className="text-xs text-muted-foreground">Classes</p>
                          <p className="text-lg font-bold text-primary">{w.assignedClassesCount}</p>
                        </div>
                        <div className="rounded-md bg-muted/30 px-3 py-2 text-center">
                          <p className="text-xs text-muted-foreground">Subjects</p>
                          <p className="text-lg font-bold text-emerald-600">{w.assignedSubjectsCount}</p>
                        </div>
                        <div className="rounded-md bg-muted/30 px-3 py-2 text-center">
                          <p className="text-xs text-muted-foreground">Weekly Periods</p>
                          <p className="text-lg font-bold text-blue-600">{w.weeklyPeriodsCount}</p>
                        </div>
                        <div className="rounded-md bg-muted/30 px-3 py-2 text-center">
                          <p className="text-xs text-muted-foreground">Teaching Days</p>
                          <p className="text-lg font-bold text-amber-600">{w.teachingDaysCount}</p>
                        </div>
                      </div>
                      {w.classesList.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {w.classesList.map((c) => (
                            <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Add Entry Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="size-4" /> Add Timetable Entry</DialogTitle>
            <DialogDescription>Schedule a class period. Conflicts are automatically detected.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Class *</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={addForm.class_id} onChange={(e) => setAddForm((f) => ({ ...f, class_id: e.target.value }))}>
                  <option value="">Select class</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject *</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={addForm.subject_id} onChange={(e) => setAddForm((f) => ({ ...f, subject_id: e.target.value }))}>
                  <option value="">Select subject</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Teacher</label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={addForm.teacher_id} onChange={(e) => setAddForm((f) => ({ ...f, teacher_id: e.target.value }))}>
                <option value="">— Unassigned —</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Academic Year *</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={addForm.academic_year_id} onChange={(e) => setAddForm((f) => ({ ...f, academic_year_id: e.target.value }))}>
                  <option value="">Select year</option>
                  {academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Semester</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={addForm.semester_id} onChange={(e) => setAddForm((f) => ({ ...f, semester_id: e.target.value }))}>
                  <option value="">All Semester</option>
                  {semesters.filter((s) => !addForm.academic_year_id || s.academic_year_id === addForm.academic_year_id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Day *</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={addForm.day_of_week} onChange={(e) => setAddForm((f) => ({ ...f, day_of_week: e.target.value }))}>
                  {TIMETABLE_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Period *</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={addForm.period_number} onChange={(e) => setAddForm((f) => ({ ...f, period_number: e.target.value }))}>
                  {PERIODS.map((p) => <option key={p} value={p}>Period {p}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Time *</label>
                <Input type="time" value={addForm.start_time} onChange={(e) => setAddForm((f) => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">End Time *</label>
                <Input type="time" value={addForm.end_time} onChange={(e) => setAddForm((f) => ({ ...f, end_time: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Room</label>
                <Input placeholder="e.g. A01" value={addForm.room} onChange={(e) => setAddForm((f) => ({ ...f, room: e.target.value }))} />
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={isPending || !addForm.class_id || !addForm.subject_id || !addForm.academic_year_id}>
              {isPending ? "Saving…" : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      <Dialog open={!!editEntry} onOpenChange={(o) => !o && setEditEntry(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit2 className="size-4" /> Edit Timetable Entry</DialogTitle>
            <DialogDescription>
              {editEntry?.subject?.name} — {editEntry?.class?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Teacher</label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editForm.teacher_id} onChange={(e) => setEditForm((f) => ({ ...f, teacher_id: e.target.value }))}>
                <option value="">— Unassigned —</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Day *</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editForm.day_of_week} onChange={(e) => setEditForm((f) => ({ ...f, day_of_week: e.target.value }))}>
                  {TIMETABLE_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Period *</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editForm.period_number} onChange={(e) => setEditForm((f) => ({ ...f, period_number: e.target.value }))}>
                  {PERIODS.map((p) => <option key={p} value={p}>Period {p}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Time</label>
                <Input type="time" value={editForm.start_time} onChange={(e) => setEditForm((f) => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">End Time</label>
                <Input type="time" value={editForm.end_time} onChange={(e) => setEditForm((f) => ({ ...f, end_time: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Room</label>
                <Input placeholder="e.g. A01" value={editForm.room} onChange={(e) => setEditForm((f) => ({ ...f, room: e.target.value }))} />
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" className="mr-auto text-destructive hover:text-destructive" onClick={() => { setEditEntry(null); setDeleteEntry(editEntry); }}>
              <Trash2 className="size-3.5 mr-1" /> Delete
            </Button>
            <Button variant="outline" onClick={() => setEditEntry(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isPending}>
              {isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteEntry} onOpenChange={(o) => !o && setDeleteEntry(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="size-4" /> Delete Entry?</DialogTitle>
            <DialogDescription>
              Remove <strong>{deleteEntry?.subject?.name}</strong> — {deleteEntry?.class?.name} ({deleteEntry?.day_of_week}, Period {deleteEntry?.period_number})? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEntry(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
