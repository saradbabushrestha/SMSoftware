"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { BookPlus, Loader2 } from "lucide-react";
import { issueBookAction, type IssueState } from "@/lib/library/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <BookPlus />}
      Issue book
    </Button>
  );
}

function IssueForm({
  bookId,
  members,
  defaultDue,
  onSuccess,
}: {
  bookId: string;
  members: { id: string; label: string }[];
  defaultDue: string;
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState<IssueState, FormData>(issueBookAction, {});
  useEffect(() => {
    if (state.ok) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="bookId" value={bookId} />
      {state.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="space-y-1.5">
        <Label>Member</Label>
        <Select name="memberId">
          <SelectTrigger>
            <SelectValue placeholder="Select a student or teacher" />
          </SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.memberId ? <p className="text-xs text-destructive">{state.fieldErrors.memberId}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dueDate">Due date</Label>
        <Input id="dueDate" name="dueDate" type="date" defaultValue={defaultDue} required />
        {state.fieldErrors?.dueDate ? <p className="text-xs text-destructive">{state.fieldErrors.dueDate}</p> : null}
      </div>

      <DialogFooter>
        <SubmitButton />
      </DialogFooter>
    </form>
  );
}

export function IssueDialog({
  bookId,
  members,
  available,
}: {
  bookId: string;
  members: { id: string; label: string }[];
  available: number;
}) {
  const [open, setOpen] = useState(false);
  // Lazy init (avoids calling Date.now() during render).
  const [defaultDue] = useState(() => new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10));

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={available <= 0}>
        <BookPlus /> Issue book
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue book</DialogTitle>
          </DialogHeader>
          {open ? (
            <IssueForm bookId={bookId} members={members} defaultDue={defaultDue} onSuccess={() => setOpen(false)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
