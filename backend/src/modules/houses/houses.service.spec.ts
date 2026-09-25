import { Test, TestingModule } from "@nestjs/testing";
import { HousesService } from "./houses.service";
import { SupabaseService } from "../../database/supabase.service";

describe("HousesService", () => {
  let service: HousesService;

  const mockSupabaseClient = {
    from: jest.fn().mockImplementation((table: string) => {
      if (table === "houses") {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                { id: "h-1", name: "Abubakar", code: "ABU", capacity: 150 },
                { id: "h-2", name: "Umar", code: "UMR", capacity: 150 },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === "students") {
        return {
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [
                  { id: "s-1", house_id: "h-1", gender: "Male" },
                  { id: "s-2", house_id: "h-1", gender: "Female" },
                  { id: "s-3", house_id: "h-2", gender: "Female" },
                ],
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
        HousesService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<HousesService>(HousesService);
  });

  it("should calculate house occupancy and gender balance correctly", async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(2);

    const abubakar = result.find((h) => h.name === "Abubakar");
    expect(abubakar).toBeDefined();
    expect(abubakar.total_occupants).toBe(2);
    expect(abubakar.male_count).toBe(1);
    expect(abubakar.female_count).toBe(1);
    expect(abubakar.available_slots).toBe(148);

    const umar = result.find((h) => h.name === "Umar");
    expect(umar).toBeDefined();
    expect(umar.total_occupants).toBe(1);
    expect(umar.male_count).toBe(0);
    expect(umar.female_count).toBe(1);
  });
});
