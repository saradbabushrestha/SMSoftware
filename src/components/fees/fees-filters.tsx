"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FEE_CATEGORY_LABELS } from "@/lib/fees/display";
import type { FeeCategory } from "@prisma/client";

const STATUS_OPTIONS = [
  ["PENDING", "Pending"],
  ["PARTIAL", "Partial"],
  ["PAID", "Paid"],
  ["OVERDUE", "Overdue"],
  ["CANCELLED", "Cancelled"],
] as const;

export function FeesFilters({
  showSearch = true,
  initialQ,
  initialStatus,
  initialCategory,
}: {
  showSearch?: boolean;
  initialQ?: string;
  initialStatus?: string;
  initialCategory?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(initialQ ?? "");

  function apply(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v && v !== "all") params.set(k, v);
      else params.delete(k);
    }
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  useEffect(() => {
    if (!showSearch) return;
    const handle = setTimeout(() => {
      if ((searchParams.get("q") ?? "") !== q) apply({ q });
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters = !!(initialQ || (initialStatus && initialStatus !== "all") || (initialCategory && initialCategory !== "all"));

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      {showSearch ? (
        <div className="relative flex-1 sm:max-w-xs">
          {isPending ? (
            <Loader2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : (
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by student"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          />
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <Select defaultValue={initialStatus ?? "all"} onValueChange={(v) => apply({ status: v })}>
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUS_OPTIONS.map(([v, label]) => (
            <SelectItem key={v} value={v}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select defaultValue={initialCategory ?? "all"} onValueChange={(v) => apply({ category: v })}>
        <SelectTrigger className="sm:w-44">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {(Object.keys(FEE_CATEGORY_LABELS) as FeeCategory[]).map((c) => (
            <SelectItem key={c} value={c}>
              {FEE_CATEGORY_LABELS[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button variant="ghost" size="sm" onClick={() => { setQ(""); startTransition(() => router.push(pathname)); }}>
          <X /> Clear
        </Button>
      ) : null}
    </div>
  );
}
