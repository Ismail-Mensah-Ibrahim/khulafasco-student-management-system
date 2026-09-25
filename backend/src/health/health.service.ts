import { Injectable } from "@nestjs/common";
import { DatabaseService } from "@/database/database.service";

@Injectable()
export class HealthService {
  constructor(private readonly databaseService: DatabaseService) {}

  async checkLiveness() {
    return {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  async checkReadiness() {
    const isDbConnected = await this.databaseService.ping();

    return {
      status: isDbConnected ? "ok" : "degraded",
      database: isDbConnected ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    };
  }
}
