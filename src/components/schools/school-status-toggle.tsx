"use client";

import { useTransition } from "react";
import { Power, PowerOff, Loader2 } from "lucide-react";
import { toggleSchoolActiveAction } from "@/lib/schools/actions";
import { Button } from "@/components/ui/button";

export function SchoolStatusToggle({ id, active }: { id: string; active: boolean }) {
  const [isPending, startTransition] = useTransition();
  function toggle() {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("active", String(!active));
    startTransition(() => toggleSchoolActiveAction(fd));
  }
  return (
    <Button variant="outline" onClick={toggle} disabled={isPending}>
      {isPending ? <Loader2 className="animate-spin" /> : active ? <PowerOff /> : <Power />}
      {active ? "Deactivate" : "Activate"}
    </Button>
  );
}
