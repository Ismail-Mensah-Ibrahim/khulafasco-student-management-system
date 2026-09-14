"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, Users, UserPlus, DollarSign, Receipt, CreditCard, Shield, BookOpen, ClipboardList, Search, Home } from "lucide-react";
import { SchoolLogo } from "@/components/branding/SchoolLogo";
import { SCHOOL } from "@/config/branding";
import { LogoutButton } from "@/components/auth/LogoutButton";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: ("admin" | "finance_officer" | "all")[];
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { label: "Students", href: "/students", icon: Users, roles: ["admin"] },
  { label: "Enroll Student", href: "/students/enroll", icon: UserPlus, roles: ["admin"] },
  { label: "Academic Years", href: "/admin/academic-years", icon: BookOpen, roles: ["admin"] },
  { label: "Programs", href: "/admin/programs", icon: BookOpen, roles: ["admin"] },
  { label: "Houses", href: "/admin/houses", icon: Home, roles: ["admin"] },
  { label: "Fee Types", href: "/admin/fee-types", icon: DollarSign, roles: ["admin"] },
  { label: "Financial Overview", href: "/finance", icon: DollarSign, roles: ["admin"] },
  { label: "Payments", href: "/finance/payments", icon: CreditCard, roles: ["admin"] },
  { label: "Reconciliation", href: "/finance/receipts", icon: ClipboardList, roles: ["admin"] },
  { label: "Staff Access", href: "/admin/staff", icon: Shield, roles: ["admin"] },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: ClipboardList, roles: ["admin"] },
];

const FINANCE_NAV_ITEMS: NavItem[] = [
  { label: "Finance Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["finance_officer"] },
  { label: "Find Student", href: "/finance?index=", icon: Search, roles: ["finance_officer"] },
  { label: "Payments", href: "/finance/payments", icon: CreditCard, roles: ["finance_officer"] },
  { label: "Receipts", href: "/finance/receipts", icon: Receipt, roles: ["finance_officer"] },
  { label: "Reconciliation", href: "/finance", icon: ClipboardList, roles: ["finance_officer"] },
  { label: "Students", href: "/students", icon: Users, roles: ["finance_officer"] },
  { label: "Student Financial Records", href: "/finance", icon: DollarSign, roles: ["finance_officer"] },
];

interface MobileSidebarProps {
  userRole?: "admin" | "finance_officer";
  userName?: string;
}

/**
 * Mobile drawer sidebar — triggered by hamburger button in the TopBar.
 * Only visible on small screens (md:hidden).
 */
export function MobileSidebar({ userRole = "admin", userName = "Staff User" }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const visibleItems = (userRole === "finance_officer" ? FINANCE_NAV_ITEMS : ADMIN_NAV_ITEMS).filter(
    (item) => item.roles.includes("all") || item.roles.includes(userRole)
  );

  return (
    <>
      {/* Hamburger trigger — used by TopBar via context or directly here */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 rounded-lg"
        style={{ color: "var(--muted-foreground)" }}
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col transform transition-transform duration-300 md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--sidebar-bg)" }}
        aria-modal="true"
        role="dialog"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--sidebar-border)" }}
        >
          <div className="flex items-center gap-3">
            <SchoolLogo size="sm" />
            <div>
              <p
                className="text-sm font-bold"
                style={{ color: "var(--sidebar-active-fg)", fontFamily: "Georgia, serif" }}
              >
                {SCHOOL.shortName}
              </p>
              <p className="text-xs" style={{ color: "var(--sidebar-muted)" }}>
                {userRole === "admin" ? "Administrator" : "Finance Officer"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded"
            style={{ color: "var(--sidebar-muted)" }}
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={
                  active
                    ? { background: "var(--sidebar-active-bg)", color: "var(--sidebar-active-fg)" }
                    : { color: "var(--sidebar-muted)" }
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User + sign out */}
        <div
          className="p-4 flex-shrink-0"
          style={{ borderTop: "1px solid var(--sidebar-border)" }}
        >
          <p className="text-sm font-medium mb-3" style={{ color: "var(--sidebar-fg)" }}>
            {userName}
          </p>
          <LogoutButton />
        </div>
      </div>
    </>
  );
}
