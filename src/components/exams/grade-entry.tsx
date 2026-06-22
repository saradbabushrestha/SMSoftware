"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Loader2, Save, Check } from "lucide-react";
import { saveGradesAction, type SaveGradesState } from "@/lib/exams/actions";
import { gradeFromMarks, gradeVariant } from "@/lib/exams/grading";
import type { GradeRosterRow } from "@/lib/exams/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Save />}
      Save grades
    </Button>
  );
}

export function GradeEntry({
  examId,
  subjects,
  subjectId,
  rows,
  maxMarks,
}: {
  examId: string;
  subjects: { id: string; name: string; code: string }[];
  subjectId?: string;
  rows: GradeRosterRow[];
  maxMarks: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function pickSubject(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("subjectId", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="sm:w-72">
          <Select value={subjectId} onValueChange={pickSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Select a subject to grade" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} · {s.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">Max marks: {maxMarks}</p>
      </div>

      {!subjectId ? (
        <div className="grid place-items-center rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          Choose a subject to enter marks.
        </div>
      ) : (
        <MarksForm key={subjectId} examId={examId} subjectId={subjectId} rows={rows} maxMarks={maxMarks} />
      )}
    </div>
  );
}

function MarksForm({
  examId,
  subjectId,
  rows,
  maxMarks,
}: {
  examId: string;
  subjectId: string;
  rows: GradeRosterRow[];
  maxMarks: number;
}) {
  const [state, formAction] = useActionState<SaveGradesState, FormData>(saveGradesAction, {});
  const [marks, setMarks] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.studentId, r.marks?.toString() ?? ""])),
  );

  const stats = useMemo(() => {
    let graded = 0;
    let pass = 0;
    for (const r of rows) {
      const v = marks[r.studentId];
      if (v !== "" && v != null && !Number.isNaN(Number(v))) {
        graded++;
        if (gradeFromMarks(Number(v), maxMarks).pass) pass++;
      }
    }
    return { graded, pass };
  }, [marks, rows, maxMarks]);

  if (rows.length === 0) {
    return (
      <div className="grid place-items-center rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
        No students enrolled in this class for the current academic year.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="subjectId" value={subjectId} />

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="info">Graded: {stats.graded}/{rows.length}</Badge>
        <Badge variant="success">Pass: {stats.pass}</Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Roll</TableHead>
            <TableHead className="w-32">Marks</TableHead>
            <TableHead className="text-right">Grade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const v = marks[r.studentId] ?? "";
            const num = Number(v);
            const valid = v !== "" && !Number.isNaN(num);
            const g = valid ? gradeFromMarks(num, maxMarks) : null;
            return (
              <TableRow key={r.studentId}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.rollNumber ?? "—"}</TableCell>
                <TableCell>
                  <input
                    type="number"
                    name={`marks_${r.studentId}`}
                    min={0}
                    max={maxMarks}
                    step="0.5"
                    value={v}
                    onChange={(e) => setMarks((p) => ({ ...p, [r.studentId]: e.target.value }))}
                    placeholder="—"
                    className="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                  />
                </TableCell>
                <TableCell className="text-right">
                  {g ? (
                    <Badge variant={gradeVariant(g.pass)}>
                      {g.letter} · {g.percent}%
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex items-center justify-end gap-3">
        {state.ok ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-success">
            <Check className="size-4" /> Saved {state.saved} result{state.saved === 1 ? "" : "s"}
          </span>
        ) : null}
        {state.error ? <span className="text-sm text-destructive">{state.error}</span> : null}
        <SaveButton />
      </div>
    </form>
  );
}
