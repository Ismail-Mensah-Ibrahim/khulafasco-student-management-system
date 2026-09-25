import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { TimetableService } from "@/lib/services/timetable.service";

export async function GET() {
  try {
    const session = await verifySession();
    const schedule = await TimetableService.getTeacherSchedule(session.id);

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
