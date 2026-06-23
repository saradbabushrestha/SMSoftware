"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SchoolsFilters({ initialQ }: { initialQ?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(initialQ ?? "");

  useEffect(() => {
    const handle = setTimeout(() => {
      if ((searchParams.get("q") ?? "") !== q) {
        const params = new URLSearchParams(searchParams.toString());
        if (q) params.set("q", q);
        else params.delete("q");
        params.delete("page");
        startTransition(() => router.push(`${pathname}?${params.toString()}`));
      }
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="relative flex-1 sm:max-w-xs">
        {isPending ? (
          <Loader2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, code or city"
          className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
        />
      </div>
      {initialQ ? (
        <Button variant="ghost" size="sm" onClick={() => { setQ(""); startTransition(() => router.push(pathname)); }}>
          <X /> Clear
        </Button>
      ) : null}
    </div>
  );
}
