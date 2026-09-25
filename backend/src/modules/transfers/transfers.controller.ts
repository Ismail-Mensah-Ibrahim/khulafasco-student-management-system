import {
  Controller,
  Get,
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
import { TransfersService } from "./transfers.service";

@ApiTags("transfers")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin", "headmaster", "assistant_headmaster")
@Controller("transfers")
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Get()
  @ApiOperation({ summary: "List recent student transfer applications" })
  @ApiResponse({ status: 200, description: "List of transfers" })
  async findAll() {
    return this.transfersService.findAll();
  }

  @Get("next-reference")
  @ApiOperation({ summary: "Generate the next sequence-backed transfer reference number" })
  @ApiResponse({ status: 200, description: "Generated transfer reference number (e.g. STP-2026-000001)" })
  async getNextReference() {
    return this.transfersService.getNextReference();
  }
}
