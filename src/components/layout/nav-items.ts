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
  Settings,
  Calendar,
  ShieldAlert,
  UploadCloud,
  ArrowRightLeft,
  FileCheck,
  ClipboardList,
} from "lucide-react";
import type { UserRole, HouseResponsibility } from "@/config/constants";

export interface NavItem {
  label: string;
  href: string;
  icon: ElementType;
  roles: UserRole[];
  section?: string;
}

export function getNavItemsForRole(
  role: UserRole,
  houseResponsibility?: HouseResponsibility | null,
  additionalRoles: readonly UserRole[] = []
): NavItem[] {
  let items: NavItem[] = [];

  switch (role) {
    case "admin":
      items = [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin"] },
        { label: "Students", href: "/students", icon: Users, roles: ["admin"], section: "Students" },
        { label: "Enroll Student", href: "/students/enroll", icon: UserPlus, roles: ["admin"], section: "Students" },
        { label: "Import Students", href: "/students/import", icon: UploadCloud, roles: ["admin"], section: "Students" },
        { label: "Cohort Promotion", href: "/students/promotion", icon: GraduationCap, roles: ["admin"], section: "Students" },
        { label: "Transfers (STP)", href: "/students/transfers", icon: ArrowRightLeft, roles: ["admin"], section: "Students" },
        { label: "Academic Years", href: "/admin/academic-years", icon: BookOpen, roles: ["admin"], section: "Academics" },
        { label: "Semesters", href: "/admin/semesters", icon: Calendar, roles: ["admin"], section: "Academics" },
        { label: "Classes & Curriculum", href: "/academic/classes", icon: BookOpen, roles: ["admin"], section: "Academics" },
        { label: "Timetable Management", href: "/academic/timetable", icon: Calendar, roles: ["admin"], section: "Academics" },
        { label: "Programs", href: "/admin/programs", icon: Layers, roles: ["admin"], section: "Academics" },
        { label: "Houses", href: "/admin/houses", icon: Home, roles: ["admin"], section: "Academics" },
        { label: "WAEC STP Portal", href: "/academic/waec-stp", icon: FileCheck, roles: ["admin"], section: "Academics" },
        { label: "Fee Types", href: "/admin/fee-types", icon: DollarSign, roles: ["admin"], section: "Finance" },
        { label: "Financial Overview", href: "/finance", icon: DollarSign, roles: ["admin"], section: "Finance" },
        { label: "Payments", href: "/finance/payments", icon: CreditCard, roles: ["admin"], section: "Finance" },
        { label: "Reconciliation", href: "/finance/receipts", icon: Receipt, roles: ["admin"], section: "Finance" },
        { label: "All Requests", href: "/requests", icon: FileText, roles: ["admin"], section: "Operations" },
        { label: "Staff Access", href: "/admin/staff", icon: Shield, roles: ["admin"], section: "Administration" },
        { label: "Security & Audit", href: "/it/audit", icon: ShieldAlert, roles: ["admin"], section: "Administration" },
        { label: "Settings", href: "/admin/settings", icon: Settings, roles: ["admin"], section: "Administration" },
      ];
      break;

    case "it_officer":
      items = [
        { label: "IT Dashboard", href: "/it/dashboard", icon: LayoutDashboard, roles: ["it_officer"] },
        { label: "User Support", href: "/it/tickets#reset", icon: Shield, roles: ["it_officer"], section: "Support" },
        { label: "IT Tickets", href: "/it/tickets", icon: LifeBuoy, roles: ["it_officer"], section: "Support" },
        { label: "System Health", href: "/it/dashboard#health", icon: Activity, roles: ["it_officer"], section: "Monitoring" },
        { label: "Security & Audit", href: "/it/audit", icon: ShieldAlert, roles: ["it_officer"], section: "Monitoring" },
        { label: "My Requests", href: "/requests", icon: FileText, roles: ["it_officer"], section: "Staff" },
      ];
      break;

    case "headmaster":
      items = [
        { label: "Executive Dashboard", href: "/headmaster/dashboard", icon: LayoutDashboard, roles: ["headmaster"] },
        { label: "Students Directory", href: "/students", icon: Users, roles: ["headmaster"], section: "School" },
        { label: "Cohort Promotion", href: "/students/promotion", icon: GraduationCap, roles: ["headmaster"], section: "School" },
        { label: "Transfers (STP)", href: "/students/transfers", icon: ArrowRightLeft, roles: ["headmaster"], section: "School" },
        { label: "Academics Overview", href: "/academic/dashboard", icon: GraduationCap, roles: ["headmaster"], section: "School" },
        { label: "Timetables", href: "/academic/timetable", icon: Calendar, roles: ["headmaster"], section: "School" },
        { label: "WAEC STP Portal", href: "/academic/waec-stp", icon: FileCheck, roles: ["headmaster"], section: "School" },
        { label: "Finance Overview", href: "/finance", icon: DollarSign, roles: ["headmaster"], section: "Finance" },
        { label: "Operational Requests", href: "/requests", icon: FileText, roles: ["headmaster"], section: "Governance" },
        { label: "Security & Audit", href: "/it/audit", icon: ShieldAlert, roles: ["headmaster"], section: "Governance" },
      ];
      break;

    case "academic_head":
      items = [
        { label: "Academic Dashboard", href: "/academic/dashboard", icon: LayoutDashboard, roles: ["academic_head"] },
        { label: "Students", href: "/students", icon: Users, roles: ["academic_head"], section: "Academics" },
        { label: "Cohort Promotion", href: "/students/promotion", icon: GraduationCap, roles: ["academic_head"], section: "Academics" },
        { label: "Transfers (STP)", href: "/students/transfers", icon: ArrowRightLeft, roles: ["academic_head"], section: "Academics" },
        { label: "Classes & Curriculum", href: "/academic/classes", icon: BookOpen, roles: ["academic_head"], section: "Academics" },
        { label: "Timetable Management", href: "/academic/timetable", icon: Calendar, roles: ["academic_head"], section: "Academics" },
        { label: "WAEC STP Portal", href: "/academic/waec-stp", icon: FileCheck, roles: ["academic_head"], section: "Academics" },
        { label: "Results Review", href: "/academic/results", icon: FileSpreadsheet, roles: ["academic_head"], section: "Assessments" },
        { label: "Academic Requests", href: "/requests", icon: FileText, roles: ["academic_head"], section: "Requests" },
      ];
      break;

    case "teacher":
      items = [
        { label: "Teacher Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard, roles: ["teacher"] },
        { label: "Attendance", href: "/teacher/attendance", icon: CheckSquare, roles: ["teacher"], section: "Teaching" },
        { label: "Student Results", href: "/teacher/results", icon: FileSpreadsheet, roles: ["teacher"], section: "Teaching" },
        { label: "My Timetable", href: "/teacher/timetable", icon: Calendar, roles: ["teacher"], section: "Teaching" },
        { label: "My Requests", href: "/requests", icon: FileText, roles: ["teacher"], section: "Workplace" },
        { label: "IT Support", href: "/it/tickets", icon: LifeBuoy, roles: ["teacher"], section: "Support" },
      ];
      break;

    case "house_master":
    case "house_mistress":
      items = [
        { label: "House Dashboard", href: "/house/dashboard", icon: LayoutDashboard, roles: [role] },
        { label: "House Students", href: "/house/students", icon: Users, roles: [role], section: "House Operations" },
        { label: "Exeat Slips", href: "/house/exeats", icon: ClipboardList, roles: [role], section: "Hostel & Welfare" },
        { label: "Hostel Requests", href: "/requests", icon: FileText, roles: [role], section: "Supplies & Maintenance" },
        { label: "New Request", href: "/requests/new", icon: Package, roles: [role], section: "Supplies & Maintenance" },
        { label: "IT Support", href: "/it/tickets", icon: LifeBuoy, roles: [role], section: "Support" },
      ];
      break;

    case "finance_officer":
      items = [
        { label: "Finance Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["finance_officer"] },
        { label: "Find Student", href: "/finance?index=", icon: Search, roles: ["finance_officer"], section: "Student Accounts" },
        { label: "Students Directory", href: "/students", icon: Users, roles: ["finance_officer"], section: "Student Accounts" },
        { label: "Transfers (STP)", href: "/students/transfers", icon: ArrowRightLeft, roles: ["finance_officer"], section: "Student Accounts" },
        { label: "Payments", href: "/finance/payments", icon: CreditCard, roles: ["finance_officer"], section: "Transactions" },
        { label: "Receipts", href: "/finance/receipts", icon: Receipt, roles: ["finance_officer"], section: "Transactions" },
        { label: "Operational Releases", href: "/requests?status=waiting_release", icon: FileText, roles: ["finance_officer"], section: "Disbursements" },
      ];
      break;

    case "domestic_officer":
      items = [
        { label: "Operations Dashboard", href: "/operations/dashboard", icon: LayoutDashboard, roles: ["domestic_officer"] },
        { label: "My Requests", href: "/requests", icon: FileText, roles: ["domestic_officer"], section: "Supplies & Logistics" },
        { label: "New Request", href: "/requests/new", icon: Package, roles: ["domestic_officer"], section: "Supplies & Logistics" },
        { label: "IT Support", href: "/it/tickets", icon: LifeBuoy, roles: ["domestic_officer"], section: "Support" },
      ];
      break;

    case "general_staff":
    default:
      items = [
        { label: "Staff Dashboard", href: "/staff/dashboard", icon: LayoutDashboard, roles: ["general_staff"] },
        { label: "My Requests", href: "/requests", icon: FileText, roles: ["general_staff"], section: "Workplace" },
        { label: "New Request", href: "/requests/new", icon: Package, roles: ["general_staff"], section: "Workplace" },
        { label: "IT Support", href: "/it/tickets", icon: LifeBuoy, roles: ["general_staff"], section: "Support" },
      ];
      break;
  }

  for (const additionalRole of additionalRoles) {
    if (additionalRole === role) continue;
    const additionalItems = getNavItemsForRole(additionalRole, houseResponsibility);
    for (const item of additionalItems) {
      if (!items.some((existingItem) => existingItem.href === item.href)) {
        items.push(item);
      }
    }
  }

  // If staff has additional house responsibility, append residential house items
  if (
    houseResponsibility &&
    role !== "house_master" &&
    role !== "house_mistress" &&
    role !== "admin"
  ) {
    if (
      houseResponsibility === "senior_house_master" ||
      houseResponsibility === "senior_house_mistress"
    ) {
      items.push(
        {
          label: "House Oversight",
          href: "/house/dashboard",
          icon: Home,
          roles: [role],
          section: "House Leadership",
        },
        {
          label: "All House Students",
          href: "/house/students",
          icon: Users,
          roles: [role],
          section: "House Leadership",
        },
        {
          label: "All Exeat Slips",
          href: "/house/exeats",
          icon: ClipboardList,
          roles: [role],
          section: "House Leadership",
        }
      );
    } else {
      items.push(
        {
          label: "House Dashboard",
          href: "/house/dashboard",
          icon: Home,
          roles: [role],
          section: "House Responsibility",
        },
        {
          label: "House Students",
          href: "/house/students",
          icon: Users,
          roles: [role],
          section: "House Responsibility",
        },
        {
          label: "Exeat Slips",
          href: "/house/exeats",
          icon: ClipboardList,
          roles: [role],
          section: "House Responsibility",
        }
      );
    }
  }

  return items;
}
