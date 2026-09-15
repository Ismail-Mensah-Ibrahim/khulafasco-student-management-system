import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { requireTeacher } from "@/lib/dal";
import { getClasses, getStudents, getAttendanceRecords } from "@/lib/data";
import { AttendanceClient } from "./_components/AttendanceClient";

export const metadata: Metadata = {
  title: `Attendance Register | ${SCHOOL.shortName}`,
};

export default async function TeacherAttendancePage() {
  await requireTeacher();

  const [classes, students, attendanceToday] = await Promise.all([
    getClasses(),
    getStudents(),
    getAttendanceRecords(undefined, new Date().toISOString().slice(0, 10)),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Class Attendance Register
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Mark and review daily student presence, tardiness, and absences.
        </p>
      </div>

      <AttendanceClient
        classes={classes}
        students={students}
        initialAttendance={attendanceToday}
      />
    </div>
  );
}
