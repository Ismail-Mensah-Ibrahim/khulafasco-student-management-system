import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { UserRole } from "@/config/constants";
import { AuthenticatedUser } from "../types/auth-user.type";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No specific role restrictions on this handler
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new ForbiddenException("Unauthenticated access attempt");
    }

    // Admins always have overarching access across administrative operations
    if (user.role === "admin") {
      return true;
    }

    const hasRequiredRole = requiredRoles.some((role) => {
      if (user.role === role) return true;
      if (user.additionalRoles && user.additionalRoles.includes(role)) return true;
      return false;
    });

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Insufficient privileges. Required role: [${requiredRoles.join(", ")}]. Current role: [${user.role}].`
      );
    }

    return true;
  }
}
