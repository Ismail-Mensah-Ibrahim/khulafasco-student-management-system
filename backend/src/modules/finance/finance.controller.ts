import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { FinanceService } from "./finance.service";
import { FindPaymentsDto } from "./dto/find-payments.dto";
import { ReversePaymentDto } from "./dto/reverse-payment.dto";

@ApiTags("finance")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin", "finance_officer", "headmaster")
@Controller("finance")
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get("metrics")
  @ApiOperation({ summary: "Get current academic year financial metrics" })
  @ApiResponse({ status: 200, description: "Total billed, collected, and outstanding balances" })
  async getMetrics() {
    return this.financeService.getMetrics();
  }

  @Get("payments")
  @ApiOperation({ summary: "List school payments with pagination and status filters" })
  @ApiResponse({ status: 200, description: "Paginated list of payments" })
  async findPayments(@Query() query: FindPaymentsDto) {
    return this.financeService.findPayments(query);
  }

  @Post("payments/:id/reverse")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reverse a completed student payment" })
  @ApiResponse({ status: 200, description: "Payment reversed and student balance adjusted" })
  @ApiResponse({ status: 400, description: "Payment is not in completed state or reason is invalid" })
  @ApiResponse({ status: 404, description: "Payment not found" })
  async reversePayment(
    @Param("id") id: string,
    @Body() dto: ReversePaymentDto
  ) {
    return this.financeService.reversePayment(id, dto.reason);
  }
}
