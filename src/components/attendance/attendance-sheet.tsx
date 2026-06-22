"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Save, CheckCheck, Check } from "lucide-react";
import type { AttendanceStatus } from "@prisma/client";
import { markAttendanceAction, type MarkAttendanceState } from "@/lib/attendance/actions";
import {
  ATTENDANCE_OPTIONS,
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_VARIANT,
} from "@/lib/attendance/display";
import type { RosterRow } from "@/lib/attendance/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const ACTIVE_CLASSES: Record<AttendanceStatus, string> = {
  PRESENT: "bg-success/15 text-success border-success/30",
  ABSENT: "bg-destructive/12 text-destructive border-destructive/30",
  LATE: "bg-warning/15 text-warning border-warning/30",
  LEAVE: "bg-info/12 text-info border-info/30",
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Save />}
      Save attendance
    </Button>
  );
}

export function AttendanceSheet({
  sectionId,
  date,
  rows,
  canMark,
}: {
  sectionId: string;
  date: string;
  rows: RosterRow[];
  canMark: boolean;
}) {
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(rows.map((r) => [r.studentId, r.status ?? "PRESENT"])),
  );
  const [state, formAction] = useActionState<MarkAttendanceState, FormData>(markAttendanceAction, {});

  const summary = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 } as Record<AttendanceStatus, number>;
    for (const r of rows) c[statuses[r.studentId] ?? "PRESENT"]++;
    return c;
  }, [statuses, rows]);

  function setAll(status: AttendanceStatus) {
    setStatuses(Object.fromEntries(rows.map((r) => [r.studentId, status])));
  }

  if (rows.length === 0) {
    return (
      <div className="grid place-items-center rounded-lg border border-dashed py-12 text-center">
        <p className="text-sm font-medium">No students enrolled</p>
        <p className="mt-1 text-xs text-muted-foreground">
          This section has no active enrollments for the current academic year.
        </p>
      </div>
    );
  }

  if (!canMark) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Roll</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.studentId}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.rollNumber ?? "—"}</TableCell>
              <TableCell className="text-right">
                {r.status ? (
                  <Badge variant={ATTENDANCE_STATUS_VARIANT[r.status]}>
                    {ATTENDANCE_STATUS_LABELS[r.status]}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Not marked</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="date" value={date} />
      {rows.map((r) => (
        <input key={r.studentId} type="hidden" name={`status_${r.studentId}`} value={statuses[r.studentId] ?? "PRESENT"} />
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs">
          {ATTENDANCE_OPTIONS.map((s) => (
            <Badge key={s} variant={ATTENDANCE_STATUS_VARIANT[s]}>
              {ATTENDANCE_STATUS_LABELS[s]}: {summary[s]}
            </Badge>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setAll("PRESENT")}>
          <CheckCheck /> Mark all present
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Roll</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const current = statuses[r.studentId] ?? "PRESENT";
            return (
              <TableRow key={r.studentId}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.rollNumber ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {ATTENDANCE_OPTIONS.map((s) => {
                      const active = current === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatuses((prev) => ({ ...prev, [r.studentId]: s }))}
                          className={cn(
                            "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                            active
                              ? ACTIVE_CLASSES[s]
                              : "border-input text-muted-foreground hover:bg-accent",
                          )}
                        >
                          {ATTENDANCE_STATUS_LABELS[s]}
                        </button>
                      );
                    })}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex items-center justify-end gap-3">
        {state.ok ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-success">
            <Check className="size-4" /> Saved {state.saved} record{state.saved === 1 ? "" : "s"}
          </span>
        ) : null}
        {state.error ? <span className="text-sm text-destructive">{state.error}</span> : null}
        <SaveButton />
      </div>
    </form>
  );
}
