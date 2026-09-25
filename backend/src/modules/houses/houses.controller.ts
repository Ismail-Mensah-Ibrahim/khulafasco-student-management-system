import {
  Controller,
  Get,
  Param,
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
import { HousesService } from "./houses.service";

@ApiTags("houses")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("houses")
export class HousesController {
  constructor(private readonly housesService: HousesService) {}

  @Get()
  @ApiOperation({ summary: "List all school houses with occupancy and gender metrics" })
  @ApiResponse({ status: 200, description: "List of houses with statistics" })
  async findAll() {
    return this.housesService.findAll();
  }

  @Get(":id/occupants")
  @ApiOperation({ summary: "Get students assigned to a specific house" })
  @ApiResponse({ status: 200, description: "List of active students in the house" })
  @ApiResponse({ status: 404, description: "House not found" })
  async getOccupants(@Param("id") id: string) {
    return this.housesService.getOccupants(id);
  }
}
