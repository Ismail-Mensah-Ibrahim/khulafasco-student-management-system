import type { Metadata } from "next";
import Link from "next/link";
import { SCHOOL } from "@/config/branding";
import { requireTeacher } from "@/lib/dal";
import { getClasses, getSubjects, getStudentResults, getRequests } from "@/lib/data";
import {
  CheckSquare,
  FileSpreadsheet,
  BookOpen,
  FileText,
  Users,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: `Teacher Dashboard | ${SCHOOL.shortName}`,
};

export default async function TeacherDashboardPage() {
  const session = await requireTeacher();

  const [classes, subjects, results, myRequests] = await Promise.all([
    getClasses(),
    getSubjects(),
    getStudentResults(),
    getRequests({ requesterId: session.id }),
  ]);

  return (
    <div className="space-y-6">
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
        <div className="flex items-center gap-2">
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
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Classes Available</p>
              <p className="text-2xl font-bold mt-1 text-primary">{classes.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Form 1 to Form 3 streams</p>
            </div>
            <div className="p-2.5 rounded-full bg-primary/10 text-primary">
              <BookOpen className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Curriculum Courses</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">{subjects.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Core & Elective subjects</p>
            </div>
            <div className="p-2.5 rounded-full bg-emerald-50 text-emerald-600">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">My Submissions</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{results.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Assessment records logged</p>
            </div>
            <div className="p-2.5 rounded-full bg-blue-50 text-blue-600">
              <FileSpreadsheet className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">My Requisitions</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{myRequests.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Stationery & classroom items</p>
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
              <FileText className="size-4 text-primary" />
              Classroom Supplies & Support
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
    </div>
  );
}
