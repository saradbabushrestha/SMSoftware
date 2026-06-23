import { requireUser } from "@/lib/rbac/authorize";
import { DashboardShell } from "@/components/dashboard/shell";
import { userHas } from "@/lib/rbac/navigation";
import { getUnreadCount } from "@/lib/messages/queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Live nav badges (href → count). Currently: unread messages.
  const badges: Record<string, number> = {};
  if (userHas(user, "message:send")) {
    const unread = await getUnreadCount(user);
    if (unread > 0) badges["/dashboard/messages"] = unread;
  }

  return (
    <DashboardShell user={user} badges={badges}>
      {children}
    </DashboardShell>
  );
}
