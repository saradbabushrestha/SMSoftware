"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { Plus, Pencil, Trash2, Loader2, UserRound } from "lucide-react";
import {
  createSectionAction,
  updateSectionAction,
  deleteSectionAction,
  type SectionFormState,
} from "@/lib/classes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export interface SectionView {
  id: string;
  name: string;
  capacity: number;
  enrolled: number;
  classTeacherId: string | null;
  classTeacherName: string | null;
}

type Editing = { mode: "new" } | { mode: "edit"; section: SectionView } | null;

function DialogSubmit({ mode }: { mode: "new" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {mode === "new" ? "Add section" : "Save"}
    </Button>
  );
}

function SectionDialog({
  editing,
  classId,
  teacherOptions,
  onDone,
}: {
  editing: Editing;
  classId: string;
  teacherOptions: { id: string; label: string }[];
  onDone: () => void;
}) {
  const isEdit = editing?.mode === "edit";
  const action = isEdit ? updateSectionAction : createSectionAction;
  const [state, formAction] = useActionState<SectionFormState, FormData>(action, {});

  useEffect(() => {
    if (state.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  const section = editing?.mode === "edit" ? editing.section : undefined;
  const err = (n: string) => state.fieldErrors?.[n];

  return (
    <Dialog open={editing !== null} onOpenChange={(o) => !o && onDone()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit section" : "Add section"}</DialogTitle>
        </DialogHeader>
        {/* key resets useActionState-driven fields when switching target */}
        <form action={formAction} className="space-y-4" key={section?.id ?? "new"}>
          {isEdit ? <input type="hidden" name="id" value={section!.id} /> : null}
          <input type="hidden" name="classId" value={classId} />

          {state.error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={section?.name} placeholder="e.g. A" required />
              {err("name") ? <p className="text-xs text-destructive">{err("name")}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min={1}
                max={500}
                defaultValue={section?.capacity ?? 40}
              />
              {err("capacity") ? <p className="text-xs text-destructive">{err("capacity")}</p> : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Class teacher</Label>
            <Select name="classTeacherId" defaultValue={section?.classTeacherId ?? "none"}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {teacherOptions.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onDone}>
              Cancel
            </Button>
            <DialogSubmit mode={isEdit ? "edit" : "new"} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SectionsManager({
  classId,
  sections,
  teacherOptions,
  canManage,
}: {
  classId: string;
  sections: SectionView[];
  teacherOptions: { id: string; label: string }[];
  canManage: boolean;
}) {
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<SectionView | null>(null);

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Sections</h3>
          <p className="text-xs text-muted-foreground">{sections.length} section(s)</p>
        </div>
        {canManage ? (
          <Button size="sm" onClick={() => setEditing({ mode: "new" })}>
            <Plus /> Add section
          </Button>
        ) : null}
      </div>

      {sections.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-dashed py-10 text-center">
          <p className="text-sm font-medium">No sections yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {canManage ? "Add a section to start enrolling students." : "No sections have been created."}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Section</TableHead>
              <TableHead>Class teacher</TableHead>
              <TableHead>Enrolled</TableHead>
              <TableHead>Capacity</TableHead>
              {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sections.map((s) => {
              const full = s.enrolled >= s.capacity;
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-sm">
                    {s.classTeacherName ? (
                      <span className="inline-flex items-center gap-1.5">
                        <UserRound className="size-3.5 text-muted-foreground" />
                        {s.classTeacherName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={full ? "warning" : "secondary"}>{s.enrolled}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.capacity}</TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Edit section" onClick={() => setEditing({ mode: "edit", section: s })}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete section"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleting(s)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Mounted only while open so useActionState resets between each add/edit. */}
      {canManage && editing ? (
        <SectionDialog
          editing={editing}
          classId={classId}
          teacherOptions={teacherOptions}
          onDone={() => setEditing(null)}
        />
      ) : null}

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete section {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && deleting.enrolled > 0
                ? `${deleting.enrolled} student(s) are enrolled here. The section will be archived; their enrollment history is preserved.`
                : "This archives the section. It can be undone by an administrator."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={deleteSectionAction} onSubmit={() => setDeleting(null)}>
              <input type="hidden" name="id" value={deleting?.id ?? ""} />
              <Button type="submit" variant="destructive">
                <Trash2 /> Delete section
              </Button>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
