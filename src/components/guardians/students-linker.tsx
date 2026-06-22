"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Plus, Pencil, Trash2, Loader2, Link2 } from "lucide-react";
import type { GuardianRelation } from "@prisma/client";
import { linkStudentAction, unlinkStudentAction, type LinkFormState } from "@/lib/guardians/actions";
import { RELATION_LABELS, RELATION_OPTIONS } from "@/lib/guardians/display";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface StudentLinkView {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  relation: GuardianRelation;
  isPrimary: boolean;
}

type Editing = { mode: "new" } | { mode: "edit"; link: StudentLinkView } | null;

function DialogSubmit({ mode }: { mode: "new" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {mode === "new" ? "Link student" : "Save"}
    </Button>
  );
}

function LinkDialog({
  editing,
  guardianId,
  linkableStudents,
  onDone,
}: {
  editing: Editing;
  guardianId: string;
  linkableStudents: { id: string; label: string }[];
  onDone: () => void;
}) {
  const isEdit = editing?.mode === "edit";
  const [state, formAction] = useActionState<LinkFormState, FormData>(linkStudentAction, {});
  useEffect(() => {
    if (state.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  const link = editing?.mode === "edit" ? editing.link : undefined;
  const err = (n: string) => state.fieldErrors?.[n];
  const noStudents = !isEdit && linkableStudents.length === 0;

  return (
    <Dialog open={editing !== null} onOpenChange={(o) => !o && onDone()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit relationship" : "Link a student"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="guardianId" value={guardianId} />

          {state.error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          {isEdit ? (
            <>
              <input type="hidden" name="studentId" value={link!.studentId} />
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="font-medium">{link!.studentName}</span>
                <span className="ml-2 font-mono text-xs text-muted-foreground">{link!.admissionNumber}</span>
              </div>
            </>
          ) : noStudents ? (
            <p className="text-sm text-muted-foreground">
              All students are already linked to this guardian.
            </p>
          ) : (
            <div className="space-y-1.5">
              <Label>Student</Label>
              <Select name="studentId">
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {linkableStudents.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {err("studentId") ? <p className="text-xs text-destructive">{err("studentId")}</p> : null}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Relationship</Label>
            <Select name="relation" defaultValue={link?.relation ?? "FATHER"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATION_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {RELATION_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isPrimary"
              defaultChecked={link?.isPrimary ?? false}
              className="size-4 accent-[var(--primary)]"
            />
            Primary guardian (main point of contact)
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onDone}>
              Cancel
            </Button>
            {!noStudents ? <DialogSubmit mode={isEdit ? "edit" : "new"} /> : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StudentsLinker({
  guardianId,
  links,
  linkableStudents,
  canManage,
}: {
  guardianId: string;
  links: StudentLinkView[];
  linkableStudents: { id: string; label: string }[];
  canManage: boolean;
}) {
  const [editing, setEditing] = useState<Editing>(null);
  const [unlinking, setUnlinking] = useState<StudentLinkView | null>(null);

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Children</h3>
          <p className="text-xs text-muted-foreground">{links.length} linked student(s)</p>
        </div>
        {canManage ? (
          <Button size="sm" onClick={() => setEditing({ mode: "new" })}>
            <Plus /> Link student
          </Button>
        ) : null}
      </div>

      {links.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-dashed py-10 text-center">
          <p className="text-sm font-medium">No students linked</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {canManage ? "Link a student to connect this guardian." : "No children linked."}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Relationship</TableHead>
              <TableHead>Primary</TableHead>
              {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <Link href={`/dashboard/students/${l.studentId}`} className="font-medium hover:underline">
                    {l.studentName}
                  </Link>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{l.admissionNumber}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{RELATION_LABELS[l.relation]}</Badge>
                </TableCell>
                <TableCell>
                  {l.isPrimary ? <Badge variant="success">Primary</Badge> : <span className="text-muted-foreground">—</span>}
                </TableCell>
                {canManage ? (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label="Edit link" onClick={() => setEditing({ mode: "edit", link: l })}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Unlink"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setUnlinking(l)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {canManage && editing ? (
        <LinkDialog
          editing={editing}
          guardianId={guardianId}
          linkableStudents={linkableStudents}
          onDone={() => setEditing(null)}
        />
      ) : null}

      <AlertDialog open={unlinking !== null} onOpenChange={(o) => !o && setUnlinking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <span className="inline-flex items-center gap-2">
                <Link2 className="size-4" /> Unlink {unlinking?.studentName}?
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the relationship between the guardian and this student. Neither record is
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={unlinkStudentAction} onSubmit={() => setUnlinking(null)}>
              <input type="hidden" name="linkId" value={unlinking?.id ?? ""} />
              <Button type="submit" variant="destructive">
                <Trash2 /> Unlink
              </Button>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
