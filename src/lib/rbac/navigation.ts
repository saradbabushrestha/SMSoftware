import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Contact,
  School,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  NotebookPen,
  FileSpreadsheet,
  ClipboardList,
  Wallet,
  CreditCard,
  Receipt,
  Landmark,
  Library,
  Bus,
  BedDouble,
  CalendarDays,
  BarChart3,
  FileText,
  UserCog,
  ShieldCheck,
  Settings,
  Megaphone,
  Mail,
  type LucideIcon,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth/types";
import type { PermissionKey } from "@/lib/rbac/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Visible if the user holds any of these permissions. */
  permission: PermissionKey | PermissionKey[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
    ],
  },
  {
    title: "Communication",
    items: [
      { label: "Announcements", href: "/dashboard/announcements", icon: Megaphone, permission: "announcement:view" },
      { label: "Messages", href: "/dashboard/messages", icon: Mail, permission: "message:send" },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Students", href: "/dashboard/students", icon: GraduationCap, permission: "student:view" },
      { label: "Teachers", href: "/dashboard/teachers", icon: Users, permission: "teacher:view" },
      { label: "Guardians", href: "/dashboard/guardians", icon: Contact, permission: "guardian:view" },
    ],
  },
  {
    title: "Academics",
    items: [
      { label: "Classes", href: "/dashboard/classes", icon: School, permission: "class:view" },
      { label: "Subjects", href: "/dashboard/subjects", icon: BookOpen, permission: "subject:view" },
      { label: "Timetable", href: "/dashboard/timetable", icon: CalendarClock, permission: "timetable:view" },
      { label: "Attendance", href: "/dashboard/attendance", icon: ClipboardCheck, permission: "attendance:view" },
      { label: "Exams", href: "/dashboard/exams", icon: NotebookPen, permission: "exam:view" },
      { label: "Grades", href: "/dashboard/grades", icon: FileSpreadsheet, permission: "grade:view" },
      { label: "Assignments", href: "/dashboard/assignments", icon: ClipboardList, permission: "assignment:view" },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Fees", href: "/dashboard/fees", icon: Wallet, permission: "fee:view" },
      { label: "Payments", href: "/dashboard/payments", icon: CreditCard, permission: ["payment:make", "payment:manage"] },
      { label: "Payroll", href: "/dashboard/payroll", icon: Receipt, permission: "payroll:view" },
      { label: "Accounting", href: "/dashboard/accounting", icon: Landmark, permission: "accounting:view" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Library", href: "/dashboard/library", icon: Library, permission: "library:view" },
      { label: "Transport", href: "/dashboard/transport", icon: Bus, permission: "transport:view" },
      { label: "Hostel", href: "/dashboard/hostel", icon: BedDouble, permission: "hostel:view" },
      { label: "Events", href: "/dashboard/events", icon: CalendarDays, permission: "event:view" },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, permission: "analytics:view" },
      { label: "Reports", href: "/dashboard/reports", icon: FileText, permission: "report:view" },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Users", href: "/dashboard/users", icon: UserCog, permission: "user:view" },
      { label: "Schools", href: "/dashboard/schools", icon: School, permission: "school:manage" },
      { label: "Audit Logs", href: "/dashboard/audit", icon: ShieldCheck, permission: "audit:view" },
      { label: "Settings", href: "/dashboard/settings", icon: Settings, permission: "school:view" },
    ],
  },
];

export function userHas(user: SessionUser, permission: PermissionKey | PermissionKey[]): boolean {
  const keys = Array.isArray(permission) ? permission : [permission];
  return keys.some((k) => user.permissions.includes(k));
}

/** Look up a nav item by its href (used by the generic module page). */
export function getNavItemByHref(href: string): NavItem | undefined {
  for (const group of NAV) {
    const item = group.items.find((i) => i.href === href);
    if (item) return item;
  }
  return undefined;
}

/** Build the navigation tree filtered to what the user is allowed to see. */
export function navigationFor(user: SessionUser): NavGroup[] {
  return NAV.map((group) => ({
    title: group.title,
    items: group.items.filter((item) => userHas(user, item.permission)),
  })).filter((group) => group.items.length > 0);
}
