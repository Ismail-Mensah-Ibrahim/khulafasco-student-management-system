import type { Metadata } from "next";
import Link from "next/link";
import { SCHOOL } from "@/config/branding";
import { requireAcademicHead } from "@/lib/dal";
import { getClasses, getSubjects, getStudentResults, getDashboardSummary } from "@/lib/data";
import {
  GraduationCap,
  BookOpen,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFullName } from "@/lib/utils";

export const metadata: Metadata = {
  title: `Academic Dashboard | ${SCHOOL.shortName}`,
};

export default async function AcademicDashboardPage() {
  const session = await requireAcademicHead();

  const [classes, subjects, results, summary] = await Promise.all([
    getClasses(),
    getSubjects(),
    getStudentResults(),
    getDashboardSummary(),
  ]);

  const pendingResults = results.filter((r) => r.status === "submitted" || r.status === "under_review");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            Academic Affairs & Curriculum Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Logged in as <strong>{session.fullName}</strong>. Curriculum supervision, class allocation, and terminal result verification.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button render={<Link href="/academic/results" />} variant="default" size="sm">
            <FileSpreadsheet className="size-4 mr-1" /> Pending Results ({pendingResults.length})
          </Button>
          <Button render={<Link href="/academic/classes" />} variant="outline" size="sm">
            <BookOpen className="size-4 mr-1 text-primary" /> Classes & Subjects
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Total Students</p>
              <p className="text-2xl font-bold mt-1 text-primary">{summary.totalStudents}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{summary.activeStudents} actively enrolled</p>
            </div>
            <div className="p-2.5 rounded-full bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">School Classes</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{classes.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Across Form 1 to Form 3</p>
            </div>
            <div className="p-2.5 rounded-full bg-blue-50 text-blue-600">
              <GraduationCap className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Subjects</p>
              <p className="text-2xl font-bold mt-1 text-indigo-600">{subjects.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Core & Elective courses</p>
            </div>
            <div className="p-2.5 rounded-full bg-indigo-50 text-indigo-600">
              <BookOpen className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Awaiting Sign-off</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{pendingResults.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Assessment entries to review</p>
            </div>
            <div className="p-2.5 rounded-full bg-amber-50 text-amber-600">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Pending Results Queue & Curriculum Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results Awaiting Approval */}
        <div className="lg:col-span-2">
          <Card className="shadow-xs border-border">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Student Assessment Submissions</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Exam and assessment grades submitted by subject teachers</p>
              </div>
              <Button render={<Link href="/academic/results" />} variant="ghost" size="sm" className="text-xs">
                View All <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {pendingResults.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="size-10 text-emerald-500/60 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">All submitted results are reviewed</p>
                  <p className="text-xs text-muted-foreground mt-1">Teacher assessment batches will appear here for verification.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {pendingResults.slice(0, 6).map((res) => (
                    <div key={res.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {res.student ? getFullName(res.student.first_name, res.student.middle_name, res.student.last_name) : "Student"}
                          </p>
                          <Badge variant="outline" className="text-[10px]">
                            {res.student?.jhs_index_number}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {res.subject?.code} - {res.subject?.name}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>Class: <strong>{res.class?.name ?? "General"}</strong></span>
                          <span>Score: <strong>{res.total_score ?? "-"}%</strong> (Grade {res.grade ?? "-"})</span>
                          <span>Term: {res.term}</span>
                        </div>
                      </div>
                      <Button render={<Link href="/academic/results" />} variant="outline" size="xs">
                        Review
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Classes Overview Panel */}
        <div className="space-y-4">
          <Card className="shadow-xs border-border">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                Active Classes Directory
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {classes.length === 0 ? (
                <p className="text-xs text-muted-foreground">No classes registered yet.</p>
              ) : (
                classes.slice(0, 6).map((cls) => (
                  <div key={cls.id} className="flex items-center justify-between text-xs pb-2 border-b border-border/50 last:border-0 last:pb-0">
                    <div>
                      <p className="font-semibold text-foreground">{cls.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {cls.form_level} • {cls.program?.name ?? "General"}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {cls.class_teacher?.full_name ? cls.class_teacher.full_name.split(" ")[0] : "No Teacher"}
                    </Badge>
                  </div>
                ))
              )}
              <div className="pt-2">
                <Button render={<Link href="/academic/classes" />} variant="outline" size="sm" className="w-full text-xs">
                  Manage All Classes & Subject Allocations
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
