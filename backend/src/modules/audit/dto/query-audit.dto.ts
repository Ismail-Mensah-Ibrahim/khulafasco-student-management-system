import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../../common/pagination/pagination.dto";

export class QueryAuditDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Module filter (e.g. AUTH, STUDENT, FINANCE, SECURITY)" })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ description: "Severity filter (e.g. INFO, WARNING, SECURITY, CRITICAL)" })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ description: "Status filter (e.g. SUCCESS, FAILED, DENIED)" })
  @IsOptional()
  @IsString()
  status?: string;
}
