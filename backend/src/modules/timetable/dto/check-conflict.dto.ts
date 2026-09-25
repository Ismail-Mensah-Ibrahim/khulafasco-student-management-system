import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsUUID } from "class-validator";

export class CheckConflictDto {
  @ApiProperty({ description: "Teacher UUID" })
  @IsUUID()
  @IsNotEmpty()
  teacher_id!: string;

  @ApiProperty({ description: "Class UUID" })
  @IsUUID()
  @IsNotEmpty()
  class_id!: string;

  @ApiProperty({ enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] })
  @IsIn(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
  @IsNotEmpty()
  day_of_week!: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";

  @ApiProperty({ description: "Period UUID" })
  @IsUUID()
  @IsNotEmpty()
  period_id!: string;

  @ApiPropertyOptional({ description: "Optional entry ID to exclude from conflict check (for editing)" })
  @IsOptional()
  @IsUUID()
  exclude_entry_id?: string;
}
