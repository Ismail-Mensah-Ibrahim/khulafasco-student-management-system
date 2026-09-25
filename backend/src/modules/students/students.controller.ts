import {
  Controller,
  Get,
  Param,
  Query,
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
import { StudentsService } from "./students.service";
import { FindStudentsDto } from "./dto/find-students.dto";

@ApiTags("students")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("students")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @ApiOperation({ summary: "List students with pagination, house, and track filters" })
  @ApiResponse({ status: 200, description: "Paginated list of students" })
  async findAll(@Query() query: FindStudentsDto) {
    return this.studentsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get student details by UUID or JHS index number" })
  @ApiResponse({ status: 200, description: "Student profile with current enrollment and house" })
  @ApiResponse({ status: 404, description: "Student not found" })
  async findById(@Param("id") id: string) {
    return this.studentsService.findById(id);
  }

  @Get(":id/balances")
  @ApiOperation({ summary: "Get fee balances for a student" })
  @ApiResponse({ status: 200, description: "Fee balance summary from student_fee_balances" })
  async getBalances(@Param("id") id: string) {
    return this.studentsService.getBalances(id);
  }

  @Get(":id/stp-readiness")
  @ApiOperation({ summary: "Check student readiness for WAEC STP upload" })
  @ApiResponse({ status: 200, description: "Validation status with any missing fields" })
  async getSTPReadiness(@Param("id") id: string) {
    return this.studentsService.getSTPReadiness(id);
  }
}
