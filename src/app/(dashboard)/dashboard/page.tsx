import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/rbac/authorize";
import { AdminDashboard } from "@/components/dashboard/views/admin-dashboard";
import { TeacherDashboard } from "@/components/dashboard/views/teacher-dashboard";
import { StudentDashboard } from "@/components/dashboard/views/student-dashboard";
import { ParentDashboard } from "@/components/dashboard/views/parent-dashboard";
import { AccountantDashboard } from "@/components/dashboard/views/accountant-dashboard";
import { LibrarianDashboard } from "@/components/dashboard/views/librarian-dashboard";

export const metadata: Metadata = { title: "Dashboard" };

function DeniedBanner() {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning">
      <ShieldAlert className="size-4 shrink-0" />
      You don&apos;t have access to that section. Here&apos;s your dashboard instead.
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);

  const view = (() => {
    switch (user.role) {
      case "SUPER_ADMIN":
      case "SCHOOL_ADMIN":
      case "PRINCIPAL":
        return <AdminDashboard user={user} />;
      case "TEACHER":
        return <TeacherDashboard user={user} />;
      case "STUDENT":
        return <StudentDashboard user={user} />;
      case "PARENT":
        return <ParentDashboard user={user} />;
      case "ACCOUNTANT":
        return <AccountantDashboard user={user} />;
      case "LIBRARIAN":
        return <LibrarianDashboard user={user} />;
      default:
        return null;
    }
  })();

  return (
    <>
      {params.denied ? <DeniedBanner /> : null}
      {view}
    </>
  );
}
