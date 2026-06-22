"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { EnrollmentStatus } from "@prisma/client";
import { changeStudentStatusAction } from "@/lib/students/actions";
import { STATUS_LABELS, STATUS_ACTIONS } from "@/lib/students/display";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function StudentStatusMenu({
  id,
  current,
}: {
  id: string;
  current: EnrollmentStatus;
}) {
  const [isPending, startTransition] = useTransition();

  function onChange(status: string) {
    if (status === current) return;
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", status);
    startTransition(() => changeStudentStatusAction(fd));
  }

  return (
    <div className="flex items-center gap-2">
      {isPending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      <Select defaultValue={current} onValueChange={onChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_ACTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
