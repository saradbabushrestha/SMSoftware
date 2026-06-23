"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LedgerFilters({
  initialType,
  initialFrom,
  initialTo,
}: {
  initialType?: string;
  initialFrom?: string;
  initialTo?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function apply(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v && v !== "all") params.set(k, v);
      else params.delete(k);
    }
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const hasFilters = !!((initialType && initialType !== "all") || initialFrom || initialTo);

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-2">
        {isPending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      </div>

      <Select defaultValue={initialType ?? "all"} onValueChange={(v) => apply({ type: v })}>
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="INCOME">Income</SelectItem>
          <SelectItem value="EXPENSE">Expense</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="date"
        defaultValue={initialFrom ?? ""}
        aria-label="From date"
        className="sm:w-40"
        onChange={(e) => apply({ from: e.target.value || undefined })}
      />
      <Input
        type="date"
        defaultValue={initialTo ?? ""}
        aria-label="To date"
        className="sm:w-40"
        onChange={(e) => apply({ to: e.target.value || undefined })}
      />

      {hasFilters ? (
        <Button variant="ghost" size="sm" onClick={() => startTransition(() => router.push(pathname))}>
          <X /> Clear
        </Button>
      ) : null}
    </div>
  );
}
