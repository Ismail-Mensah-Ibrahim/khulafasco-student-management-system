"use client";

import { useState, useTransition } from "react";
import type { SchoolClass, Subject, Student, AcademicYear, StudentResult } from "@/types";
import { submitStudentResultAction } from "@/lib/actions/academics";
import { TERMS } from "@/config/constants";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, PlusCircle } from "lucide-react";
import { getFullName } from "@/lib/utils";

interface TeacherResultsClientProps {
  classes: SchoolClass[];
  subjects: Subject[];
  students: Student[];
  academicYears: AcademicYear[];
  initialResults: StudentResult[];
}

export function TeacherResultsClient({
  classes,
  subjects,
  students,
  academicYears,
  initialResults,
}: TeacherResultsClientProps) {
  const [resultsList, setResultsList] = useState<StudentResult[]>(initialResults);

  // Form states
  const [classId, setClassId] = useState(classes[0]?.id || "");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [studentId, setStudentId] = useState(students[0]?.id || "");
  const [term, setTerm] = useState<string>("Term 1");
  const [assessmentScore, setAssessmentScore] = useState<string>("");
  const [examScore, setExamScore] = useState<string>("");

  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentYear = academicYears.find((y) => y.is_current) || academicYears[0];

  const totalCalculated =
    (parseFloat(assessmentScore) || 0) + (parseFloat(examScore) || 0);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentYear) return;

    const formData = new FormData();
    formData.append("student_id", studentId);
    formData.append("class_id", classId);
    formData.append("subject_id", subjectId);
    formData.append("academic_year_id", currentYear.id);
    formData.append("term", term);
    formData.append("assessment_score", assessmentScore);
    formData.append("exam_score", examScore);

    startTransition(async () => {
      const res = await submitStudentResultAction(undefined, formData);
      if (res.success) {
        setFeedback({ text: res.message, isError: false });
        const selectedStudent = students.find((s) => s.id === studentId);
        const selectedSubject = subjects.find((s) => s.id === subjectId);
        const selectedClass = classes.find((c) => c.id === classId);

        setResultsList((prev) => [
          {
            id: `temp-${Date.now()}`,
            student_id: studentId,
            class_id: classId,
            subject_id: subjectId,
            academic_year_id: currentYear.id,
            term,
            assessment_score: parseFloat(assessmentScore) || 0,
            exam_score: parseFloat(examScore) || 0,
            total_score: totalCalculated,
            grade: totalCalculated >= 80 ? "1" : totalCalculated >= 70 ? "2" : totalCalculated >= 60 ? "4" : "6",
            remarks: "Submitted",
            status: "submitted",
            submitted_by: null,
            approved_by: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            student: selectedStudent,
            subject: selectedSubject,
            class: selectedClass,
          },
          ...prev,
        ]);

        setAssessmentScore("");
        setExamScore("");
      } else {
        setFeedback({ text: res.message, isError: true });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Grade Entry Form */}
      <div className="lg:col-span-1">
        <Card className="shadow-xs border-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PlusCircle className="size-4 text-primary" />
              New Grade Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="student" className="text-xs font-semibold">Student</Label>
                <select
                  id="student"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {getFullName(s.first_name, s.middle_name, s.last_name)} ({s.jhs_index_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="classSel" className="text-xs font-semibold">Class</Label>
                <select
                  id="classSel"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.form_level})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subjectSel" className="text-xs font-semibold">Subject</Label>
                <select
                  id="subjectSel"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code} - {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="termSel" className="text-xs font-semibold">Academic Term</Label>
                <select
                  id="termSel"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {TERMS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="assmt" className="text-xs font-semibold">Assessment (30)</Label>
                  <Input
                    id="assmt"
                    type="number"
                    min="0"
                    max="30"
                    step="0.1"
                    placeholder="e.g. 24"
                    value={assessmentScore}
                    onChange={(e) => setAssessmentScore(e.target.value)}
                    required
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="exam" className="text-xs font-semibold">Exam (70)</Label>
                  <Input
                    id="exam"
                    type="number"
                    min="0"
                    max="70"
                    step="0.1"
                    placeholder="e.g. 55"
                    value={examScore}
                    onChange={(e) => setExamScore(e.target.value)}
                    required
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Computed Total:</span>
                <span className="font-bold text-foreground text-sm">{totalCalculated.toFixed(1)} / 100</span>
              </div>

              {feedback && (
                <p className={`text-xs font-medium ${feedback.isError ? "text-destructive" : "text-emerald-600"}`}>
                  {feedback.text}
                </p>
              )}

              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Submitting..." : "Submit for Head Review"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Recent Submissions List */}
      <div className="lg:col-span-2">
        <Card className="shadow-xs border-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-primary" />
              Recent Grade Submissions ({resultsList.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {resultsList.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No grades entered yet. Fill the form to submit assessment scores.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {resultsList.map((r) => (
                  <div key={r.id} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {r.student ? getFullName(r.student.first_name, r.student.middle_name, r.student.last_name) : "Student"}
                        </p>
                        <Badge variant="outline" className="text-[10px]">
                          {r.student?.jhs_index_number}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {r.subject?.code}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>Class: {r.class?.name ?? "-"}</span>
                        <span>Assessment: {r.assessment_score}</span>
                        <span>Exam: {r.exam_score}</span>
                        <span>Total: <strong>{r.total_score}%</strong> (Grade {r.grade})</span>
                      </div>
                    </div>

                    <Badge
                      variant={r.status === "approved" ? "default" : "outline"}
                      className="text-[11px] capitalize"
                    >
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
