import type { Metadata } from "next";
import Link from "next/link";
import { SCHOOL } from "@/config/branding";
import { requireTeacher } from "@/lib/dal";
import {
  getStudentResults,
  getRequests,
  getTeacherAssignments,
  getTimetableEntries,
} from "@/lib/data";
import {
  CheckSquare,
  FileSpreadsheet,
  BookOpen,
  FileText,
  ArrowRight,
  Calendar,
  Home,
  GraduationCap,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HOUSE_RESPONSIBILITY_LABELS } from "@/config/constants";

export const metadata: Metadata = {
  title: `Teacher Dashboard | ${SCHOOL.shortName}`,
};

export default async function TeacherDashboardPage() {
  const session = await requireTeacher();

  const [results, myRequests, myAssignments, myTimetable] = await Promise.all([
    getStudentResults(),
    getRequests({ requesterId: session.id }),
    getTeacherAssignments({ teacherId: session.id }),
    getTimetableEntries({ teacherId: session.id }),
  ]);

  // Derive unique classes and subjects from assignments
  const uniqueClasses = new Set(myAssignments.map((a) => a.class_id));
  const uniqueSubjects = new Set(myAssignments.map((a) => a.subject_id));
  const houseLabel = session.houseResponsibility
    ? HOUSE_RESPONSIBILITY_LABELS[session.houseResponsibility]
    : null;

  // suppress unused variable warning
  void results;

  return (
    <div className="space-y-6">
      {/* House Responsibility Banner */}
      {houseLabel && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-4 py-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <Home className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                House Responsibility: <span className="font-bold">{houseLabel}</span>
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                You have additional responsibilities. Manage your house via the House section in the sidebar.
              </p>
            </div>
          </div>
          <Button render={<Link href="/house/dashboard" />} variant="outline" size="sm" className="shrink-0 self-start sm:self-auto border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400">
            Go to House <ArrowRight className="size-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            Faculty Teaching Workspace
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Logged in as <strong>{session.fullName}</strong>. Classroom roll-call, term grade entry, and requisition tracking.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button render={<Link href="/teacher/attendance" />} variant="default" size="sm">
            <CheckSquare className="size-4 mr-1" /> Daily Attendance
          </Button>
          <Button render={<Link href="/teacher/results" />} variant="outline" size="sm">
            <FileSpreadsheet className="size-4 mr-1 text-primary" /> Grade Entry
          </Button>
        </div>
      </div>


      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">My Assigned Classes</p>
              <p className="text-2xl font-bold mt-1 text-primary">{uniqueClasses.size}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{myAssignments.length} subject assignment{myAssignments.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="p-2.5 rounded-full bg-primary/10 text-primary">
              <BookOpen className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Subjects Teaching</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">{uniqueSubjects.size}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Across all assigned classes</p>
            </div>
            <div className="p-2.5 rounded-full bg-emerald-50 text-emerald-600">
              <GraduationCap className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Weekly Periods</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{myTimetable.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Scheduled timetable slots</p>
            </div>
            <div className="p-2.5 rounded-full bg-blue-50 text-blue-600">
              <Calendar className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">My Requisitions</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{myRequests.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Stationery &amp; classroom items</p>
            </div>
            <div className="p-2.5 rounded-full bg-amber-50 text-amber-600">
              <FileText className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Action Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-xs border-border hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckSquare className="size-4 text-emerald-600" />
              Take Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Perform daily morning or period-by-period roll-call for students in your assigned class.
            </p>
            <Button render={<Link href="/teacher/attendance" />} variant="outline" size="sm" className="w-full">
              Launch Attendance Register <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-blue-600" />
              Enter Student Grades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Submit class assessments (30%) and end-of-term examination scores (70%) with automatic grade computation.
            </p>
            <Button render={<Link href="/teacher/results" />} variant="outline" size="sm" className="w-full">
              Open Grade Entry Sheet <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              My Timetable
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {myTimetable.length > 0
                ? `You have ${myTimetable.length} scheduled period${myTimetable.length !== 1 ? "s" : ""} this week. View your full weekly timetable.`
                : "Your timetable has not been published yet. Check back after the Academic Head publishes the schedule."}
            </p>
            <Button render={<Link href="/teacher/timetable" />} variant="outline" size="sm" className="w-full">
              View My Timetable <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* My Assignments Quick View */}
      {myAssignments.length > 0 && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              My Teaching Assignments
              <Badge variant="secondary" className="ml-auto">{myAssignments.length} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {myAssignments.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 bg-muted/30">
                  <GraduationCap className="size-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{a.subject?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.class?.name ?? "—"}</p>
                  </div>
                </div>
              ))}
            </div>
            {myAssignments.length > 6 && (
              <p className="text-xs text-muted-foreground mt-2">+{myAssignments.length - 6} more assignments</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Requisitions */}
      <Card className="shadow-xs border-border hover:border-primary/50 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            Classroom Supplies &amp; Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Need markers, notebooks, or IT assistance with lab equipment or classroom displays?
          </p>
          <div className="flex gap-2">
            <Button render={<Link href="/requests/new" />} variant="outline" size="sm" className="flex-1 text-xs">
              New Request
            </Button>
            <Button render={<Link href="/it/tickets" />} variant="outline" size="sm" className="flex-1 text-xs">
              IT Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
