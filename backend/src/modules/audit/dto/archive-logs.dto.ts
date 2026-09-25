import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class ArchiveLogsDto {
  @ApiPropertyOptional({
    description: "Number of retention days (logs older than this will be archived)",
    default: 90,
    minimum: 7,
    maximum: 730,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(730)
  retentionDays?: number = 90;
}
