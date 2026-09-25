import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import { PaginationQueryDto } from "../../../common/pagination/pagination.dto";

export class FindStaffDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Filter by primary role" })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: "Filter active/inactive staff" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_active?: boolean;
}
