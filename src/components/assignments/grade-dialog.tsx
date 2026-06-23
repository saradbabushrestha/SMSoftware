"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { GraduationCap, Loader2 } from "lucide-react";
import { gradeSubmissionAction, type SubmitState } from "@/lib/assignments/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <GraduationCap />}
      Save grade
    </Button>
  );
}

function GradeForm({
  submissionId,
  studentName,
  content,
  maxPoints,
  grade,
  feedback,
  onDone,
}: {
  submissionId: string;
  studentName: string;
  content: string;
  maxPoints: number;
  grade: number | null;
  feedback: string | null;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<SubmitState, FormData>(gradeSubmissionAction, {});
  useEffect(() => {
    if (state.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="submissionId" value={submissionId} />
      {state.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      ) : null}

      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{studentName}&apos;s submission</p>
        <p className="scrollbar-thin max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm">{content}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="grade">Grade (out of {maxPoints})</Label>
        <Input id="grade" name="grade" type="number" min={0} max={maxPoints} step="0.5" defaultValue={grade ?? ""} required />
        {state.fieldErrors?.grade ? <p className="text-xs text-destructive">{state.fieldErrors.grade}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="feedback">Feedback (optional)</Label>
        <Textarea id="feedback" name="feedback" defaultValue={feedback ?? ""} rows={3} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
        <SaveButton />
      </DialogFooter>
    </form>
  );
}

export function GradeDialog(props: {
  submissionId: string;
  studentName: string;
  content: string;
  maxPoints: number;
  grade: number | null;
  feedback: string | null;
  graded: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={props.graded ? "outline" : "default"} size="sm" onClick={() => setOpen(true)}>
        <GraduationCap /> {props.graded ? "Re-grade" : "Grade"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grade submission</DialogTitle>
          </DialogHeader>
          {open ? <GradeForm {...props} onDone={() => setOpen(false)} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
