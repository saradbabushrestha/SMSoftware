"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Pencil, Loader2, Save } from "lucide-react";
import { Weekday } from "@prisma/client";
import { createEntryAction, updateEntryAction, type EntryState } from "@/lib/timetable/actions";
import { WEEK_DAYS, WEEKDAY_LABELS } from "@/lib/timetable/display";
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

export interface EntryDefaults {
  id?: string;
  day?: Weekday;
  startTime?: string;
  endTime?: string;
  subjectId?: string;
  teacherId?: string;
  room?: string;
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Save />}
      {mode === "create" ? "Add period" : "Save"}
    </Button>
  );
}

function EntryForm({
  mode,
  sectionId,
  subjects,
  teachers,
  defaults,
  onDone,
}: {
  mode: "create" | "edit";
  sectionId: string;
  subjects: { id: string; label: string }[];
  teachers: { id: string; label: string }[];
  defaults?: EntryDefaults;
  onDone: () => void;
}) {
  const action = mode === "create" ? createEntryAction : updateEntryAction;
  const [state, formAction] = useActionState<EntryState, FormData>(action, {});
  useEffect(() => {
    if (state.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);
  const err = (n: string) => state.fieldErrors?.[n];

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="sectionId" value={sectionId} />
      {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      {state.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Day</Label>
          <Select name="day" defaultValue={defaults?.day ?? "SUNDAY"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEK_DAYS.map((d) => (
                <SelectItem key={d} value={d}>{WEEKDAY_LABELS[d]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="room">Room (optional)</Label>
          <Input id="room" name="room" defaultValue={defaults?.room} placeholder="e.g. R-204" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="startTime">Start</Label>
          <Input id="startTime" name="startTime" type="time" defaultValue={defaults?.startTime ?? "09:00"} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endTime">End</Label>
          <Input id="endTime" name="endTime" type="time" defaultValue={defaults?.endTime ?? "09:45"} required />
          {err("endTime") ? <p className="text-xs text-destructive">{err("endTime")}</p> : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Subject</Label>
        <Select name="subjectId" defaultValue={defaults?.subjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {err("subjectId") ? <p className="text-xs text-destructive">{err("subjectId")}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label>Teacher (optional)</Label>
        <Select name="teacherId" defaultValue={defaults?.teacherId ?? "none"}>
          <SelectTrigger>
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            {teachers.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
        <SubmitButton mode={mode} />
      </DialogFooter>
    </form>
  );
}

export function EntryDialog({
  mode,
  sectionId,
  subjects,
  teachers,
  defaults,
}: {
  mode: "create" | "edit";
  sectionId: string;
  subjects: { id: string; label: string }[];
  teachers: { id: string; label: string }[];
  defaults?: EntryDefaults;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {mode === "create" ? (
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus /> Add period
        </Button>
      ) : (
        <Button variant="ghost" size="icon" className="size-7" aria-label="Edit period" onClick={() => setOpen(true)}>
          <Pencil className="size-3.5" />
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Add period" : "Edit period"}</DialogTitle>
          </DialogHeader>
          {open ? (
            <EntryForm mode={mode} sectionId={sectionId} subjects={subjects} teachers={teachers} defaults={defaults} onDone={() => setOpen(false)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
