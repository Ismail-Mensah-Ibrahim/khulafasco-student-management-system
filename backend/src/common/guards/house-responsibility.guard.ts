import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { HOUSE_RESPONSIBILITIES_KEY } from "../decorators/require-house-responsibility.decorator";
import { HouseResponsibility } from "@/config/constants";
import { AuthenticatedUser } from "../types/auth-user.type";

@Injectable()
export class HouseResponsibilityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredResponsibilities = this.reflector.getAllAndOverride<
      HouseResponsibility[]
    >(HOUSE_RESPONSIBILITIES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredResponsibilities || requiredResponsibilities.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new ForbiddenException("Unauthenticated access attempt");
    }

    // Admins and school executive heads have overarching oversight
    if (
      user.role === "admin" ||
      user.role === "headmaster" ||
      user.role === "assistant_headmaster"
    ) {
      return true;
    }

    const userResp = user.houseResponsibility;
    if (userResp && requiredResponsibilities.includes(userResp)) {
      return true;
    }

    throw new ForbiddenException(
      `Insufficient house administrative responsibility. Requires: [${requiredResponsibilities.join(", ")}].`
    );
  }
}
