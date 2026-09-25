import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

describe("HealthController", () => {
  let controller: HealthController;
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            checkLiveness: jest.fn().mockResolvedValue({
              status: "ok",
              uptime: 123,
              timestamp: "2026-09-25T12:00:00.000Z",
            }),
            checkReadiness: jest.fn().mockResolvedValue({
              status: "ok",
              database: "connected",
              timestamp: "2026-09-25T12:00:00.000Z",
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should return liveness status", async () => {
    const result = await controller.checkHealth();
    expect(result.status).toBe("ok");
    expect(service.checkLiveness).toHaveBeenCalled();
  });

  it("should return readiness status", async () => {
    const result = await controller.checkReady();
    expect(result.status).toBe("ok");
    expect(result.database).toBe("connected");
    expect(service.checkReadiness).toHaveBeenCalled();
  });
});
