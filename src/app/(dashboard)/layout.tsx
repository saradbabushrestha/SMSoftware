import { requireUser } from "@/lib/rbac/authorize";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
