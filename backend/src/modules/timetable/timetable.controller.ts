import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthGuard } from "../../common/guards/auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { TimetableService } from "./timetable.service";
import { CheckConflictDto } from "./dto/check-conflict.dto";

@ApiTags("timetable")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("timetable")
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Get("teachers/:teacherId")
  @ApiOperation({ summary: "Get weekly timetable for a teacher" })
  @ApiResponse({ status: 200, description: "Teacher weekly schedule grouped by day" })
  async getTeacherSchedule(@Param("teacherId") teacherId: string) {
    return this.timetableService.getTeacherSchedule(teacherId);
  }

  @Post("check-conflict")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Check for timetable teacher or class collision" })
  @ApiResponse({ status: 200, description: "Conflict validation result" })
  async checkConflict(@Body() dto: CheckConflictDto) {
    return this.timetableService.checkConflict(dto);
  }
}
