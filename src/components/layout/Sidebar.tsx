"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { SchoolLogo } from "@/components/branding/SchoolLogo";
import { SCHOOL } from "@/config/branding";
import { cn } from "@/lib/utils";
import { useState } from "react";

import { UserRole, ROLE_LABELS, type HouseResponsibility } from "@/config/constants";
import { getNavItemsForRole, type NavItem } from "@/components/layout/nav-items";

interface SidebarProps {
  userRole?: UserRole;
  userName?: string;
  userEmail?: string;
  houseResponsibility?: HouseResponsibility | null;
  additionalRoles?: UserRole[];
}

/**
 * Application sidebar — role-aware navigation, collapsible on desktop.
 * On mobile, this is hidden and replaced by MobileSidebar (drawer).
 */
export function Sidebar({
  userRole = "admin",
  userName = "Staff User",
  userEmail = "",
  houseResponsibility,
  additionalRoles = [],
}: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = getNavItemsForRole(userRole, houseResponsibility, additionalRoles);

  // Group by section
  const sections: string[] = [];
  const grouped: Record<string, NavItem[]> = {};
  for (const item of visibleItems) {
    const section = item.section ?? "__none__";
    if (!grouped[section]) {
      grouped[section] = [];
      if (section !== "__none__") sections.push(section);
    }
    grouped[section].push(item);
  }

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 flex-shrink-0 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
      style={{
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Logo area */}
      <div
        className="flex items-center justify-between p-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <SchoolLogo size="sm" />
            <div className="min-w-0">
              <p
                className="text-sm font-bold truncate leading-tight"
                style={{ color: "var(--sidebar-active-fg)", fontFamily: "Georgia, serif" }}
              >
                {SCHOOL.shortName}
              </p>
              <p className="text-xs truncate" style={{ color: "var(--sidebar-muted)" }}>
                Management System
              </p>
            </div>
          </div>
        )}
        {collapsed && <SchoolLogo size="sm" className="mx-auto" />}

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex-shrink-0 rounded p-1 transition-colors ml-auto"
          style={{ color: "var(--sidebar-muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--sidebar-fg)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--sidebar-muted)";
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
        {/* Items with no section */}
        {(grouped["__none__"] ?? []).map((item) => (
          <NavLink
            key={`${item.href}-${item.label}`}
            item={item}
            active={
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(item.href + "/"))
            }
            collapsed={collapsed}
          />
        ))}

        {/* Sectioned items */}
        {sections.map((section) => (
          <div key={section} className="pt-3">
            {!collapsed && (
              <p
                className="px-3 mb-1 text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--sidebar-muted)" }}
              >
                {section}
              </p>
            )}
            {collapsed && (
              <div
                className="mx-2 mb-1 h-px"
                style={{ background: "var(--sidebar-border)" }}
              />
            )}
            {(grouped[section] ?? []).map((item) => (
              <NavLink
                key={`${item.href}-${item.label}`}
                item={item}
                active={
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href + "/"))
                }
                collapsed={collapsed}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* User info + logout */}
      <div
        className="p-3 flex-shrink-0"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        {!collapsed && (
          <div className="mb-2 px-2">
            <p
              className="text-xs font-semibold truncate"
              style={{ color: "var(--sidebar-fg)" }}
            >
              {userName}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--sidebar-muted)" }}>
              {ROLE_LABELS[userRole] ?? "Staff Member"}
            </p>
            {userEmail && (
              <p className="text-xs truncate" style={{ color: "var(--sidebar-muted)" }}>
                {userEmail}
              </p>
            )}
          </div>
        )}
        <LogoutButton collapsed={collapsed} />
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// NavLink sub-component
// ---------------------------------------------------------------------------

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-all",
        collapsed && "justify-center"
      )}
      style={
        active
          ? {
              background: "var(--sidebar-active-bg)",
              color: "var(--sidebar-active-fg)",
            }
          : { color: "var(--sidebar-muted)" }
      }
      title={collapsed ? item.label : undefined}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}
