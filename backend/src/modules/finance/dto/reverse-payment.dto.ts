import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ReversePaymentDto {
  @ApiProperty({
    description: "Detailed justification for reversing the payment",
    example: "Duplicate payment recorded or bank reversal",
    minLength: 5,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  reason!: string;
}
