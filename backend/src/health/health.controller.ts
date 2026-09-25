import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "@/common/decorators/public.decorator";
import { HealthService } from "./health.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Liveness probe" })
  async checkHealth() {
    return this.healthService.checkLiveness();
  }

  @Public()
  @Get("ready")
  @ApiOperation({ summary: "Readiness probe checking database connectivity" })
  async checkReady() {
    return this.healthService.checkReadiness();
  }
}
