import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { SupabaseService } from "@/database/supabase.service";
import { AuthenticatedUser } from "../types/auth-user.type";
import { UserRole } from "@/config/constants";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseService: SupabaseService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Authentication token is required");
    }

    const token = authHeader.split(" ")[1];

    // Validate JWT with Supabase Auth
    const {
      data: { user },
      error: authError,
    } = await this.supabaseService.getAdminClient().auth.getUser(token);

    if (authError || !user) {
      throw new UnauthorizedException(
        authError?.message || "Invalid or expired session token"
      );
    }

    // Lookup profile in public.profiles to verify active account and application roles
    const { data: profile, error: profileError } = await this.supabaseService
      .getAdminClient()
      .from("profiles")
      .select(
        "id, full_name, email, role, additional_roles, house_id, house_responsibility, is_active, employment_status"
      )
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      throw new UnauthorizedException(
        "Staff profile record not found. Access denied."
      );
    }

    if (!profile.is_active || profile.employment_status === "suspended") {
      throw new UnauthorizedException(
        "This staff account is currently inactive or suspended. Please contact the administrator."
      );
    }

    // Attach verified user
    const authenticatedUser: AuthenticatedUser = {
      id: profile.id,
      email: profile.email || user.email || "",
      fullName: profile.full_name,
      role: profile.role as UserRole,
      additionalRoles: (profile.additional_roles || []) as UserRole[],
      houseId: profile.house_id || null,
      houseResponsibility: profile.house_responsibility || null,
      isActive: profile.is_active,
      employmentStatus: profile.employment_status,
    };

    request.user = authenticatedUser;
    return true;
  }
}
