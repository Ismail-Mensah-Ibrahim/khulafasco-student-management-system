"use client";

import { useState, useTransition } from "react";
import type { SchoolClass, Student, AttendanceRecord } from "@/types";
import { recordAttendanceAction } from "@/lib/actions/academics";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/config/constants";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckSquare, Search } from "lucide-react";
import { getFullName } from "@/lib/utils";

interface AttendanceClientProps {
  classes: SchoolClass[];
  students: Student[];
  initialAttendance: AttendanceRecord[];
}

export function AttendanceClient({
  classes,
  students,
  initialAttendance,
}: AttendanceClientProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || "");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>(() => {
    const map: Record<string, AttendanceStatus> = {};
    for (const record of initialAttendance) {
      map[record.student_id] = record.status;
    }
    return map;
  });
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  const [isPending, startTransition] = useTransition();

  const filteredStudents = students.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      const stName = getFullName(s.first_name, s.middle_name, s.last_name).toLowerCase();
      return (
        stName.includes(q) ||
        s.jhs_index_number.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleMarkStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));

    const formData = new FormData();
    formData.append("class_id", selectedClassId);
    formData.append("student_id", studentId);
    formData.append("date", selectedDate);
    formData.append("status", status);

    startTransition(async () => {
      const res = await recordAttendanceAction(undefined, formData);
      if (res.success) {
        setFeedback({ text: "Attendance updated.", isError: false });
      } else {
        setFeedback({ text: res.message, isError: true });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label htmlFor="cls" className="block text-xs font-semibold text-muted-foreground mb-1">
              Select Class
            </label>
            <select
              id="cls"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.form_level})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dt" className="block text-xs font-semibold text-muted-foreground mb-1">
              Date
            </label>
            <div className="relative">
              <Input
                id="dt"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 text-sm w-40"
              />
            </div>
          </div>
        </div>

        <div className="self-end sm:self-auto w-full sm:w-64">
          <label htmlFor="searchSt" className="block text-xs font-semibold text-muted-foreground mb-1">
            Search Student
          </label>
          <div className="relative">
            <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              id="searchSt"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or index..."
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-2.5 rounded-lg text-xs font-medium border ${
            feedback.isError
              ? "bg-destructive/10 border-destructive/20 text-destructive"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Attendance Roster Card */}
      <Card className="shadow-xs border-border">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckSquare className="size-4 text-emerald-600" />
              Class Roll Call ({filteredStudents.length} Students)
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {selectedDate}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No students found in this roster.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredStudents.map((student) => {
                const currentStatus = attendanceMap[student.id] || "present";

                return (
                  <div
                    key={student.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        {getFullName(student.first_name, student.middle_name, student.last_name)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono font-medium">{student.jhs_index_number}</span>
                        <span>•</span>
                        <span className="capitalize">{student.student_type}</span>
                        <span>•</span>
                        <span className="capitalize">{student.gender}</span>
                      </div>
                    </div>

                    {/* Status Toggle Buttons */}
                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      {ATTENDANCE_STATUSES.map((status) => {
                        const isSelected = currentStatus === status;

                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => handleMarkStatus(student.id, status)}
                            disabled={isPending}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all capitalize ${
                              isSelected
                                ? status === "present"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : status === "absent"
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : status === "late"
                                  ? "bg-amber-600 text-white shadow-xs"
                                  : "bg-blue-600 text-white shadow-xs"
                                : "bg-muted/60 text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {status}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
