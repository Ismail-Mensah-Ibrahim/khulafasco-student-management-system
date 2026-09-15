import type { ElementType } from "react";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  DollarSign,
  Receipt,
  CreditCard,
  Shield,
  BookOpen,
  ClipboardList,
  Home,
  Search,
  FileText,
  CheckSquare,
  LifeBuoy,
  Activity,
  Package,
  GraduationCap,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import type { UserRole } from "@/config/constants";

export interface NavItem {
  label: string;
  href: string;
  icon: ElementType;
  roles: UserRole[];
  section?: string;
}

export function getNavItemsForRole(role: UserRole): NavItem[] {
  switch (role) {
    case "admin":
      return [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin"] },
        { label: "Students", href: "/students", icon: Users, roles: ["admin"], section: "Students" },
        { label: "Enroll Student", href: "/students/enroll", icon: UserPlus, roles: ["admin"], section: "Students" },
        { label: "Academic Years", href: "/admin/academic-years", icon: BookOpen, roles: ["admin"], section: "Academics" },
        { label: "Programs", href: "/admin/programs", icon: Layers, roles: ["admin"], section: "Academics" },
        { label: "Houses", href: "/admin/houses", icon: Home, roles: ["admin"], section: "Academics" },
        { label: "Fee Types", href: "/admin/fee-types", icon: DollarSign, roles: ["admin"], section: "Finance" },
        { label: "Financial Overview", href: "/finance", icon: DollarSign, roles: ["admin"], section: "Finance" },
        { label: "Payments", href: "/finance/payments", icon: CreditCard, roles: ["admin"], section: "Finance" },
        { label: "Reconciliation", href: "/finance/receipts", icon: Receipt, roles: ["admin"], section: "Finance" },
        { label: "All Requests", href: "/requests", icon: FileText, roles: ["admin"], section: "Operations" },
        { label: "Staff Access", href: "/admin/staff", icon: Shield, roles: ["admin"], section: "Administration" },
        { label: "Audit Logs", href: "/admin/audit-logs", icon: ClipboardList, roles: ["admin"], section: "Administration" },
      ];

    case "it_officer":
      return [
        { label: "IT Dashboard", href: "/it/dashboard", icon: LayoutDashboard, roles: ["it_officer"] },
        { label: "User Support", href: "/admin/staff", icon: Shield, roles: ["it_officer"], section: "Support" },
        { label: "IT Tickets", href: "/it/tickets", icon: LifeBuoy, roles: ["it_officer"], section: "Support" },
        { label: "System Health", href: "/it/dashboard#health", icon: Activity, roles: ["it_officer"], section: "Monitoring" },
        { label: "Security Logs", href: "/admin/audit-logs", icon: ClipboardList, roles: ["it_officer"], section: "Monitoring" },
        { label: "My Requests", href: "/requests", icon: FileText, roles: ["it_officer"], section: "Staff" },
      ];

    case "headmaster":
      return [
        { label: "Executive Dashboard", href: "/headmaster/dashboard", icon: LayoutDashboard, roles: ["headmaster"] },
        { label: "Students Directory", href: "/students", icon: Users, roles: ["headmaster"], section: "School" },
        { label: "Academics Overview", href: "/academic/dashboard", icon: GraduationCap, roles: ["headmaster"], section: "School" },
        { label: "Finance Overview", href: "/finance", icon: DollarSign, roles: ["headmaster"], section: "Finance" },
        { label: "Operational Requests", href: "/requests", icon: FileText, roles: ["headmaster"], section: "Governance" },
        { label: "Audit History", href: "/admin/audit-logs", icon: ClipboardList, roles: ["headmaster"], section: "Governance" },
      ];

    case "academic_head":
      return [
        { label: "Academic Dashboard", href: "/academic/dashboard", icon: LayoutDashboard, roles: ["academic_head"] },
        { label: "Students", href: "/students", icon: Users, roles: ["academic_head"], section: "Academics" },
        { label: "Classes & Subjects", href: "/academic/classes", icon: BookOpen, roles: ["academic_head"], section: "Academics" },
        { label: "Results Review", href: "/academic/results", icon: FileSpreadsheet, roles: ["academic_head"], section: "Assessments" },
        { label: "Academic Requests", href: "/requests", icon: FileText, roles: ["academic_head"], section: "Requests" },
      ];

    case "teacher":
      return [
        { label: "Teacher Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard, roles: ["teacher"] },
        { label: "Attendance", href: "/teacher/attendance", icon: CheckSquare, roles: ["teacher"], section: "Teaching" },
        { label: "Student Results", href: "/teacher/results", icon: FileSpreadsheet, roles: ["teacher"], section: "Teaching" },
        { label: "My Requests", href: "/requests", icon: FileText, roles: ["teacher"], section: "Workplace" },
        { label: "IT Support", href: "/it/tickets", icon: LifeBuoy, roles: ["teacher"], section: "Support" },
      ];

    case "finance_officer":
      return [
        { label: "Finance Dashboard", href: "/finance", icon: LayoutDashboard, roles: ["finance_officer"] },
        { label: "Find Student", href: "/finance?index=", icon: Search, roles: ["finance_officer"], section: "Student Accounts" },
        { label: "Students Directory", href: "/students", icon: Users, roles: ["finance_officer"], section: "Student Accounts" },
        { label: "Payments", href: "/finance/payments", icon: CreditCard, roles: ["finance_officer"], section: "Transactions" },
        { label: "Receipts", href: "/finance/receipts", icon: Receipt, roles: ["finance_officer"], section: "Transactions" },
        { label: "Operational Releases", href: "/requests?status=waiting_release", icon: FileText, roles: ["finance_officer"], section: "Disbursements" },
      ];

    case "domestic_officer":
      return [
        { label: "Operations Dashboard", href: "/operations/dashboard", icon: LayoutDashboard, roles: ["domestic_officer"] },
        { label: "My Requests", href: "/requests", icon: FileText, roles: ["domestic_officer"], section: "Supplies & Logistics" },
        { label: "New Request", href: "/requests/new", icon: Package, roles: ["domestic_officer"], section: "Supplies & Logistics" },
        { label: "IT Support", href: "/it/tickets", icon: LifeBuoy, roles: ["domestic_officer"], section: "Support" },
      ];

    case "general_staff":
    default:
      return [
        { label: "Staff Dashboard", href: "/staff/dashboard", icon: LayoutDashboard, roles: ["general_staff"] },
        { label: "My Requests", href: "/requests", icon: FileText, roles: ["general_staff"], section: "Workplace" },
        { label: "New Request", href: "/requests/new", icon: Package, roles: ["general_staff"], section: "Workplace" },
        { label: "IT Support", href: "/it/tickets", icon: LifeBuoy, roles: ["general_staff"], section: "Support" },
      ];
  }
}
