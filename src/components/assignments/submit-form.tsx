"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Send, Check } from "lucide-react";
import { submitAssignmentAction, type SubmitState } from "@/lib/assignments/actions";
import { gradePercent } from "@/lib/assignments/display";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function SubmitButton({ hasExisting }: { hasExisting: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Send />}
      {hasExisting ? "Update submission" : "Submit"}
    </Button>
  );
}

export function SubmitForm({
  assignmentId,
  content,
  graded,
  grade,
  feedback,
  maxPoints,
}: {
  assignmentId: string;
  content: string | null;
  graded: boolean;
  grade: number | null;
  feedback: string | null;
  maxPoints: number;
}) {
  const [state, formAction] = useActionState<SubmitState, FormData>(submitAssignmentAction, {});

  if (graded) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="success">Graded</Badge>
          {grade !== null ? (
            <span className="text-sm font-medium">
              {grade}/{maxPoints} · {gradePercent(grade, maxPoints)}%
            </span>
          ) : null}
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Your submission</p>
          <p className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm">{content}</p>
        </div>
        {feedback ? (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Teacher feedback</p>
            <p className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm">{feedback}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <div className="space-y-1.5">
        <Label htmlFor="content">Your submission</Label>
        <Textarea id="content" name="content" defaultValue={content ?? ""} rows={6} placeholder="Type your answer here…" required />
        {state.fieldErrors?.content ? <p className="text-xs text-destructive">{state.fieldErrors.content}</p> : null}
        {state.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
      </div>
      <div className="flex items-center justify-end gap-3">
        {state.ok ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-success">
            <Check className="size-4" /> Submitted
          </span>
        ) : null}
        <SubmitButton hasExisting={content !== null} />
      </div>
    </form>
  );
}
