"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { UserStatus } from "@prisma/client";
import { changeTeacherStatusAction } from "@/lib/teachers/actions";
import { USER_STATUS_LABELS, TEACHER_STATUS_ACTIONS } from "@/lib/teachers/display";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TeacherStatusMenu({ id, current }: { id: string; current: UserStatus }) {
  const [isPending, startTransition] = useTransition();

  // Statuses that can't be toggled directly (INVITED/DISABLED) still show as current.
  const options = TEACHER_STATUS_ACTIONS.includes(current)
    ? TEACHER_STATUS_ACTIONS
    : [current, ...TEACHER_STATUS_ACTIONS];

  function onChange(status: string) {
    if (status === current) return;
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", status);
    startTransition(() => changeTeacherStatusAction(fd));
  }

  return (
    <div className="flex items-center gap-2">
      {isPending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      <Select defaultValue={current} onValueChange={onChange}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((s) => (
            <SelectItem key={s} value={s}>
              {USER_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
