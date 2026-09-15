"use client";

import { useState, useTransition } from "react";
import type { StudentResult, SchoolClass, Subject } from "@/types";
import { reviewStudentResultAction } from "@/lib/actions/academics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { getFullName } from "@/lib/utils";

interface ResultsReviewClientProps {
  initialResults: StudentResult[];
  classes: SchoolClass[];
  subjects: Subject[];
}

export function ResultsReviewClient({
  initialResults,
  classes,
  subjects,
}: ResultsReviewClientProps) {
  const [resultsList, setResultsList] = useState<StudentResult[]>(initialResults);
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  const [isPending, startTransition] = useTransition();

  const filteredResults = resultsList.filter((r) => {
    if (filterClass !== "all" && r.class_id !== filterClass) return false;
    if (filterSubject !== "all" && r.subject_id !== filterSubject) return false;
    if (search) {
      const q = search.toLowerCase();
      const stName = r.student ? getFullName(r.student.first_name, r.student.middle_name, r.student.last_name).toLowerCase() : "";
      return (
        stName.includes(q) ||
        (r.student?.jhs_index_number && r.student.jhs_index_number.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleApprove = (resultId: string) => {
    const formData = new FormData();
    formData.append("result_id", resultId);
    formData.append("decision", "approved");

    startTransition(async () => {
      const res = await reviewStudentResultAction(undefined, formData);
      if (res.success) {
        setFeedback({ text: "Result record approved successfully.", isError: false });
        setResultsList((prev) =>
          prev.map((r) => (r.id === resultId ? { ...r, status: "approved" } : r))
        );
      } else {
        setFeedback({ text: res.message, isError: true });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name or index..."
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-sm border ${
            feedback.isError
              ? "bg-destructive/10 border-destructive/20 text-destructive"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Results Table */}
      <Card className="shadow-xs border-border">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-primary" />
            Submitted Results ({filteredResults.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {filteredResults.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No results match your filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs text-muted-foreground uppercase">
                    <th className="pb-3 font-semibold">Student</th>
                    <th className="pb-3 font-semibold">Class</th>
                    <th className="pb-3 font-semibold">Subject</th>
                    <th className="pb-3 font-semibold">Term</th>
                    <th className="pb-3 font-semibold text-center">Assmt (30%)</th>
                    <th className="pb-3 font-semibold text-center">Exam (70%)</th>
                    <th className="pb-3 font-semibold text-center">Total (100%)</th>
                    <th className="pb-3 font-semibold text-center">Grade</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredResults.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3">
                        <p className="font-semibold text-foreground">
                          {r.student ? getFullName(r.student.first_name, r.student.middle_name, r.student.last_name) : "Student"}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono">{r.student?.jhs_index_number}</p>
                      </td>
                      <td className="py-3 text-xs">{r.class?.name ?? "-"}</td>
                      <td className="py-3 text-xs">
                        <span className="font-medium">{r.subject?.code}</span>
                      </td>
                      <td className="py-3 text-xs">{r.term}</td>
                      <td className="py-3 text-xs text-center">{r.assessment_score ?? "-"}</td>
                      <td className="py-3 text-xs text-center">{r.exam_score ?? "-"}</td>
                      <td className="py-3 text-xs text-center font-bold">{r.total_score ?? "-"}%</td>
                      <td className="py-3 text-xs text-center">
                        <Badge variant="outline" className="font-bold">
                          {r.grade ?? "-"}
                        </Badge>
                      </td>
                      <td className="py-3 text-xs">
                        <Badge
                          variant={r.status === "approved" ? "default" : "outline"}
                          className="capitalize text-[11px]"
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-xs text-right">
                        {r.status !== "approved" && r.status !== "published" ? (
                          <Button
                            onClick={() => handleApprove(r.id)}
                            disabled={isPending}
                            size="xs"
                            variant="outline"
                            className="text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                          >
                            Approve
                          </Button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-medium inline-flex items-center gap-1">
                            <CheckCircle2 className="size-3.5" /> Approved
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
