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

export function ExamPicker({
  exams,
  examId,
}: {
  exams: { id: string; label: string }[];
  examId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function pick(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("examId", id);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={examId} onValueChange={pick}>
        <SelectTrigger className="sm:w-80">
          <SelectValue placeholder="Select an exam to view results" />
        </SelectTrigger>
        <SelectContent>
          {exams.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
    </div>
  );
}
