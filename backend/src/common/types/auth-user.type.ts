import { UserRole, HouseResponsibility } from "@/config/constants";

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  additionalRoles: UserRole[];
  houseId?: string | null;
  houseResponsibility?: HouseResponsibility | null;
  isActive: boolean;
  employmentStatus: string;
}
