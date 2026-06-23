"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { UserPlus, Loader2 } from "lucide-react";
import { assignStudentAction, type AssignState } from "@/lib/transport/actions";
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
      {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
      Assign
    </Button>
  );
}

function AssignForm({
  routeId,
  students,
  onSuccess,
}: {
  routeId: string;
  students: { id: string; label: string }[];
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState<AssignState, FormData>(assignStudentAction, {});
  useEffect(() => {
    if (state.ok) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="routeId" value={routeId} />
      {state.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      ) : null}

      {students.length === 0 ? (
        <p className="text-sm text-muted-foreground">All students are already assigned to a route.</p>
      ) : (
        <div className="space-y-1.5">
          <Label>Student</Label>
          <Select name="studentId">
            <SelectTrigger>
              <SelectValue placeholder="Select an unassigned student" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.fieldErrors?.studentId ? <p className="text-xs text-destructive">{state.fieldErrors.studentId}</p> : null}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="stop">Pickup stop (optional)</Label>
        <Input id="stop" name="stop" placeholder="e.g. Lakeside gate" />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
        {students.length > 0 ? <SubmitButton /> : null}
      </DialogFooter>
    </form>
  );
}

export function AssignDialog({
  routeId,
  students,
  disabled,
}: {
  routeId: string;
  students: { id: string; label: string }[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} disabled={disabled}>
        <UserPlus /> Assign student
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign student to route</DialogTitle>
          </DialogHeader>
          {open ? <AssignForm routeId={routeId} students={students} onSuccess={() => setOpen(false)} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
