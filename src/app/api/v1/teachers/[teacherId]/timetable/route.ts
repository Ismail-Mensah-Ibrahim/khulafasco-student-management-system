import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { TimetableService } from "@/lib/services/timetable.service";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ teacherId: string }> }
) {
  try {
    const session = await verifySession();
    const { teacherId } = await context.params;

    // Authorization: self, or academic leadership/admin
    const isSelf = session.id === teacherId;
    const isAcademicLeaderOrAdmin =
      session.role === "admin" ||
      session.role === "headmaster" ||
      session.role === "assistant_headmaster" ||
      session.role === "academic_head";

    if (!isSelf && !isAcademicLeaderOrAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Insufficient permissions to view this teacher's timetable.",
          },
        },
        { status: 403 }
      );
    }

    const schedule = await TimetableService.getTeacherSchedule(teacherId);

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: { message: "Teacher schedule not found." } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: schedule,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: { message: err instanceof Error ? err.message : "Unauthorized" },
      },
      { status: 401 }
    );
  }
}
