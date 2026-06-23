import type { Metadata } from "next";
import Link from "next/link";
import { Home, Compass } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 text-center">
      <Logo className="mb-10" />
      <span className="mb-6 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Compass className="size-7" />
      </span>
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you’re looking for doesn’t exist or may have been moved.
      </p>
      <div className="mt-6">
        <Button asChild>
          <Link href="/dashboard">
            <Home /> Back to dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
