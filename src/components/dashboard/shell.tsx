import { SidebarContent } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import type { SessionUser } from "@/lib/auth/types";

export function DashboardShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 border-r lg:block">
        <SidebarContent user={user} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="scrollbar-thin flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
