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
import { StaffService } from "./staff.service";
import { FindStaffDto } from "./dto/find-staff.dto";

@ApiTags("staff")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("staff")
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @ApiOperation({ summary: "List staff members with pagination and role filters" })
  @ApiResponse({ status: 200, description: "Paginated list of staff profiles" })
  async findAll(@Query() query: FindStaffDto) {
    return this.staffService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get staff member details by UUID" })
  @ApiResponse({ status: 200, description: "Staff profile details" })
  @ApiResponse({ status: 404, description: "Staff profile not found" })
  async findById(@Param("id") id: string) {
    return this.staffService.findById(id);
  }

  @Get(":id/timetable")
  @ApiOperation({ summary: "Get teacher weekly timetable by staff UUID" })
  @ApiResponse({ status: 200, description: "Weekly teaching timetable periods" })
  async getTimetable(@Param("id") id: string) {
    return this.staffService.getTimetable(id);
  }
}
