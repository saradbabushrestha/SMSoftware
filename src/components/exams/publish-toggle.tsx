"use client";

import { useTransition } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { togglePublishAction } from "@/lib/exams/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function PublishToggle({ examId, published }: { examId: string; published: boolean }) {
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const fd = new FormData();
    fd.set("id", examId);
    fd.set("publish", String(!published));
    startTransition(() => togglePublishAction(fd));
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={published ? "success" : "secondary"}>{published ? "Published" : "Draft"}</Badge>
      <Button variant="outline" size="sm" onClick={toggle} disabled={isPending}>
        {isPending ? <Loader2 className="animate-spin" /> : published ? <EyeOff /> : <Eye />}
        {published ? "Unpublish" : "Publish"}
      </Button>
    </div>
  );
}
