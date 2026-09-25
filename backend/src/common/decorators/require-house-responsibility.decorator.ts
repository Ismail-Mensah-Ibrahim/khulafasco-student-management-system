import { SetMetadata } from "@nestjs/common";
import { HouseResponsibility } from "@/config/constants";

export const HOUSE_RESPONSIBILITIES_KEY = "houseResponsibilities";
export const RequireHouseResponsibility = (...responsibilities: HouseResponsibility[]) =>
  SetMetadata(HOUSE_RESPONSIBILITIES_KEY, responsibilities);
