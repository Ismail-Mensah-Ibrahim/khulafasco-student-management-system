import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
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
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../common/types/auth-user.type";
import { AuditService } from "./audit.service";
import { QueryAuditDto } from "./dto/query-audit.dto";
import { ArchiveLogsDto } from "./dto/archive-logs.dto";

@ApiTags("audit")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin", "it_officer", "headmaster")
@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get("logs")
  @ApiOperation({ summary: "Query chronological audit logs with filters" })
  @ApiResponse({ status: 200, description: "Paginated audit trail records" })
  async findAll(@Query() query: QueryAuditDto) {
    return this.auditService.findAll(query);
  }

  @Post("archive")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Archive old audit logs to cold partition" })
  @ApiResponse({ status: 200, description: "Count of archived logs" })
  async archive(
    @Body() dto: ArchiveLogsDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.auditService.archive(
      dto.retentionDays ?? 90,
      user?.id,
      user?.role
    );
  }
}
