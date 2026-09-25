import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { FinanceService } from "./finance.service";
import { DatabaseService } from "../../database/database.service";
import { SupabaseService } from "../../database/supabase.service";

describe("FinanceService", () => {
  let service: FinanceService;

  const mockDatabaseService = {
    rpc: jest.fn().mockResolvedValue({
      data: { success: true },
      error: null,
    }),
  };

  const mockSupabaseClient = {
    from: jest.fn().mockImplementation((table: string) => {
      if (table === "payments") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: {
                  id: "pay-1",
                  status: "cancelled",
                  receipt_number: "RCP-001",
                  amount: 150,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    }),
  };

  const mockSupabaseService = {
    getAdminClient: jest.fn().mockReturnValue(mockSupabaseClient),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
  });

  it("should reject reversal if payment status is not completed", async () => {
    await expect(
      service.reversePayment("pay-1", "Duplicate entry error")
    ).rejects.toThrow(BadRequestException);
  });
});
