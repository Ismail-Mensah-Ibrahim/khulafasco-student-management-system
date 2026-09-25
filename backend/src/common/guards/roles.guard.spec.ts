import { Reflector } from "@nestjs/core";
import { ForbiddenException } from "@nestjs/common";
import { RolesGuard } from "./roles.guard";
import { AuthenticatedUser } from "../types/auth-user.type";

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (user?: Partial<AuthenticatedUser>): any => ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  });

  it("should allow access when no roles are required", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
    const context = createMockContext({ role: "teacher" });
    expect(guard.canActivate(context)).toBe(true);
  });

  it("should always allow admin access", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["finance_officer"]);
    const context = createMockContext({
      role: "admin",
      additionalRoles: [],
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it("should allow access when primary role matches", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["academic_head"]);
    const context = createMockContext({
      role: "academic_head",
      additionalRoles: [],
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it("should allow access when role is in additionalRoles (e.g. Teacher + House Master)", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["house_master"]);
    const context = createMockContext({
      role: "teacher",
      additionalRoles: ["house_master"],
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it("should throw ForbiddenException when user lacks the required role", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin", "finance_officer"]);
    const context = createMockContext({
      role: "teacher",
      additionalRoles: ["general_staff"],
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
