import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../../common/pagination/pagination.dto";

export class FindPaymentsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ["completed", "cancelled", "reversed"] })
  @IsOptional()
  @IsIn(["completed", "cancelled", "reversed"])
  status?: "completed" | "cancelled" | "reversed";

  @ApiPropertyOptional({ description: "Filter by student UUID" })
  @IsOptional()
  @IsUUID()
  student_id?: string;

  @ApiPropertyOptional({ description: "Filter by academic year UUID" })
  @IsOptional()
  @IsUUID()
  academic_year_id?: string;
}
