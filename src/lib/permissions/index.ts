/**
 * Centralized Role and Responsibility Permissions
 * Handles primary roles, additional roles, and assigned responsibilities.
 */

import { SessionUser } from "@/lib/dal";

export function isStaffAdmin(user: SessionUser): boolean {
  return user.role === "admin";
}

export function isHeadmasterOrAssistant(user: SessionUser): boolean {
  return (
    user.role === "headmaster" ||
    user.role === "assistant_headmaster" ||
    user.role === "admin"
  );
}

export function canManageStaff(user: SessionUser): boolean {
  return user.role === "admin";
}

export function canManageStudents(user: SessionUser): boolean {
  return (
    user.role === "admin" ||
    user.role === "headmaster" ||
    user.role === "assistant_headmaster" ||
    user.role === "academic_head"
  );
}

export function canManageFinance(user: SessionUser): boolean {
  return user.role === "finance_officer" || user.role === "admin";
}

export function canManageAcademics(user: SessionUser): boolean {
  return (
    user.role === "academic_head" ||
    user.role === "assistant_headmaster" ||
    user.role === "headmaster" ||
    user.role === "admin"
  );
}

export function canManageTimetable(user: SessionUser): boolean {
  return canManageAcademics(user);
}

export function isTeachingEligible(user: SessionUser): boolean {
  return (
    user.role === "teacher" ||
    user.role === "academic_head" ||
    user.role === "assistant_headmaster" ||
    user.role === "admin" ||
    Boolean(user.additionalRoles?.includes("teacher"))
  );
}

export function isSeniorHouseStaff(user: SessionUser): boolean {
  return (
    user.role === "admin" ||
    user.role === "headmaster" ||
    user.role === "assistant_headmaster" ||
    user.houseResponsibility === "senior_house_master" ||
    user.houseResponsibility === "senior_house_mistress"
  );
}

export function canManageHouse(user: SessionUser, houseId?: string | null): boolean {
  if (isSeniorHouseStaff(user)) return true;
  if (!houseId) return false;

  const isAssignedHouseLeader =
    (user.role === "house_master" ||
      user.role === "house_mistress" ||
      user.houseResponsibility === "house_master" ||
      user.houseResponsibility === "house_mistress") &&
    user.houseId === houseId;

  return isAssignedHouseLeader;
}

export function canViewAuditLogs(user: SessionUser): boolean {
  return (
    user.role === "admin" ||
    user.role === "it_officer" ||
    user.role === "headmaster"
  );
}

export function canArchiveAuditLogs(user: SessionUser): boolean {
  return user.role === "admin" || user.role === "it_officer";
}
