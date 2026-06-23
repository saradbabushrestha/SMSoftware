"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENT_TYPE_LABELS } from "@/lib/events/display";
import type { EventType } from "@prisma/client";

const WHEN = [
  ["upcoming", "Upcoming"],
  ["past", "Past"],
  ["all", "All"],
] as const;

export function EventsFilters({ initialType, initialWhen }: { initialType?: string; initialWhen?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function apply(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v && v !== "all-types") params.set(k, v);
      else params.delete(k);
    }
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="mb-4 flex items-center gap-2">
      <Select defaultValue={initialWhen ?? "upcoming"} onValueChange={(v) => apply({ when: v })}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="When" />
        </SelectTrigger>
        <SelectContent>
          {WHEN.map(([v, label]) => (
            <SelectItem key={v} value={v}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select defaultValue={initialType ?? "all-types"} onValueChange={(v) => apply({ type: v })}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all-types">All types</SelectItem>
          {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((t) => (
            <SelectItem key={t} value={t}>
              {EVENT_TYPE_LABELS[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isPending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
    </div>
  );
}
