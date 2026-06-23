"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { UserStatus } from "@prisma/client";
import { changeUserStatusAction } from "@/lib/users/actions";
import { USER_STATUS_LABELS, USER_STATUS_ACTIONS } from "@/lib/users/status";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function UserStatusMenu({ id, current }: { id: string; current: UserStatus }) {
  const [isPending, startTransition] = useTransition();
  const options = USER_STATUS_ACTIONS.includes(current) ? USER_STATUS_ACTIONS : [current, ...USER_STATUS_ACTIONS];

  function onChange(status: string) {
    if (status === current) return;
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", status);
    startTransition(() => changeUserStatusAction(fd));
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
