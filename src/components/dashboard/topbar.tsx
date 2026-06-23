"use client";

import { useState } from "react";
import { Bell, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarContent } from "@/components/dashboard/sidebar";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { UserMenu } from "@/components/dashboard/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth/types";

export function Topbar({ user, badges }: { user: SessionUser; badges?: Record<string, number> }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      {/* Mobile menu */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent user={user} badges={badges} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Global search */}
      <GlobalSearch />

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="size-4" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-destructive" />
        </Button>
        <div className="mx-1 h-6 w-px bg-border" />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
