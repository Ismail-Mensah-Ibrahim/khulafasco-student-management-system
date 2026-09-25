import { Test, TestingModule } from "@nestjs/testing";
import { TimetableService } from "./timetable.service";
import { SupabaseService } from "../../database/supabase.service";

describe("TimetableService", () => {
  let service: TimetableService;

  const mockSupabaseClient = {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ id: "period-1", class: { name: "General Science 1" } }],
              error: null,
            }),
          }),
        }),
      }),
    }),
  };

  const mockSupabaseService = {
    getAdminClient: jest.fn().mockReturnValue(mockSupabaseClient),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetableService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<TimetableService>(TimetableService);
  });

  it("should detect teacher collision if teacher already scheduled in another class", async () => {
    const result = await service.checkConflict({
      teacher_id: "teacher-1",
      class_id: "class-2",
      day_of_week: "Monday",
      period_id: "period-1",
    });

    expect(result.hasConflict).toBe(true);
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0]).toContain("Teacher is already scheduled");
  });
});
