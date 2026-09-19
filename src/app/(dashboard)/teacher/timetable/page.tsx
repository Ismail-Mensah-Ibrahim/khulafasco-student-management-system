import type { Metadata } from "next";
import { requireTeacher } from "@/lib/dal";
import { getTimetableEntries, getTeacherAssignments, getAcademicYears } from "@/lib/data";
import { SCHOOL } from "@/config/branding";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, BookOpen, Clock, GraduationCap } from "lucide-react";
import { TIMETABLE_DAYS } from "@/config/constants";
import PrintButton from "./_components/PrintButton";

export const metadata: Metadata = {
  title: `My Timetable | ${SCHOOL.shortName}`,
};

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export default async function TeacherTimetablePage() {
  const session = await requireTeacher();

  const [myTimetable, myAssignments, academicYears] = await Promise.all([
    getTimetableEntries({ teacherId: session.id }),
    getTeacherAssignments({ teacherId: session.id }),
    getAcademicYears(),
  ]);

  const currentYear = academicYears.find((y) => y.is_current) ?? academicYears[0];

  const publishedEntries = myTimetable.filter((e) => e.is_published);
  const teachingDays = new Set(publishedEntries.map((e) => e.day_of_week)).size;
  const uniqueClasses = new Set(myAssignments.map((a) => a.class_id));
  const uniqueSubjects = new Set(myAssignments.map((a) => a.subject_id));

  return (
    <div className="space-y-6">
      {/* Print header (shown only when printing via Tailwind print: utilities) */}
      <div className="hidden print:block text-center mb-8">
        <h1 className="text-xl font-bold">{SCHOOL.name}</h1>
        <h2 className="text-lg">Personal Teaching Timetable</h2>
        <p className="text-sm mt-1">Teacher: <strong>{session.fullName}</strong></p>
        {currentYear && <p className="text-sm">Academic Year: {currentYear.name}</p>}
      </div>

      {/* Screen header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <Calendar className="size-6 text-primary" /> My Weekly Timetable
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {session.fullName} — {currentYear?.name ?? "Current Year"}
          </p>
        </div>
        <PrintButton />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-xs border-l-4 border-l-primary">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Weekly Periods</p>
              <p className="text-2xl font-bold text-primary mt-1">{publishedEntries.length}</p>
            </div>
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <Clock className="size-4" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-l-4 border-l-emerald-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Teaching Days</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{teachingDays}</p>
            </div>
            <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
              <Calendar className="size-4" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-l-4 border-l-blue-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Assigned Classes</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{uniqueClasses.size}</p>
            </div>
            <div className="p-2 rounded-full bg-blue-50 text-blue-600">
              <BookOpen className="size-4" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-l-4 border-l-amber-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Subjects</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{uniqueSubjects.size}</p>
            </div>
            <div className="p-2 rounded-full bg-amber-50 text-amber-600">
              <GraduationCap className="size-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timetable Grid */}
      {publishedEntries.length === 0 ? (
        <Card className="shadow-xs">
          <CardContent className="pt-12 pb-12 text-center">
            <Calendar className="size-12 mx-auto text-muted-foreground opacity-40 mb-3" />
            <p className="font-medium text-muted-foreground">Your timetable has not been published yet.</p>
            <p className="text-sm text-muted-foreground mt-1">The Academic Head will publish your schedule. Check back soon.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              Weekly Schedule — {currentYear?.name ?? ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border border-border px-3 py-2 text-left font-semibold w-16">Period</th>
                  <th className="border border-border px-3 py-2 text-left font-semibold w-28">Time</th>
                  {TIMETABLE_DAYS.map((day) => (
                    <th key={day} className="border border-border px-3 py-2 text-center font-semibold">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period) => {
                  const rowEntries = publishedEntries.filter((e) => e.period_number === period);
                  const ref = rowEntries[0];
                  const timeLabel = ref ? `${ref.start_time}–${ref.end_time}` : "";

                  return (
                    <tr key={period} className="hover:bg-muted/20">
                      <td className="border border-border px-3 py-2 font-semibold text-center bg-muted/30">P{period}</td>
                      <td className="border border-border px-2 py-2 text-muted-foreground text-xs">{timeLabel}</td>
                      {TIMETABLE_DAYS.map((day) => {
                        const cell = publishedEntries.find((e) => e.day_of_week === day && e.period_number === period);
                        return (
                          <td key={day} className="border border-border px-2 py-2 min-w-[110px] align-top">
                            {cell ? (
                              <div className="rounded-md p-2 bg-primary/5 border border-primary/20">
                                <p className="font-semibold text-foreground leading-tight">{cell.subject?.name ?? "—"}</p>
                                <p className="text-muted-foreground mt-0.5">{cell.class?.name ?? "—"}</p>
                                {cell.room && <p className="text-muted-foreground">Room {cell.room}</p>}
                              </div>
                            ) : (
                              <div className="text-center text-muted-foreground opacity-30 text-xs">—</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* My Teaching Assignments */}
      {myAssignments.length > 0 && (
        <Card className="shadow-xs print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              My Subject Assignments
              <Badge variant="secondary" className="ml-auto">{myAssignments.length} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left py-2 pr-4 font-semibold">Subject</th>
                    <th className="text-left py-2 pr-4 font-semibold">Class</th>
                    <th className="text-left py-2 font-semibold">Semester</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {myAssignments.map((a) => (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium">{a.subject?.name ?? "—"}</span>
                          {a.subject?.is_elective && <Badge variant="outline" className="text-xs">Elective</Badge>}
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{a.class?.name ?? "—"}</td>
                      <td className="py-2 text-muted-foreground">{a.semester?.name ?? "All Semesters"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
