import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../../common/pagination/pagination.dto";

export class FindStudentsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Filter by house UUID" })
  @IsOptional()
  @IsUUID()
  house_id?: string;

  @ApiPropertyOptional({ enum: ["green", "gold", "single"] })
  @IsOptional()
  @IsIn(["green", "gold", "single"])
  track?: "green" | "gold" | "single";

  @ApiPropertyOptional({ enum: ["active", "graduated", "transferred", "suspended"] })
  @IsOptional()
  @IsIn(["active", "graduated", "transferred", "suspended"])
  status?: "active" | "graduated" | "transferred" | "suspended";

  @ApiPropertyOptional({ description: "Filter by class UUID" })
  @IsOptional()
  @IsUUID()
  class_id?: string;
}
