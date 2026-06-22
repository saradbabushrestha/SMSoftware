"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { createBookAction, updateBookAction, type BookFormState } from "@/lib/library/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface BookFormDefaults {
  title?: string;
  author?: string;
  isbn?: string;
  category?: string;
  totalCopies?: string;
}

function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor?: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Save />}
      {mode === "create" ? "Add book" : "Save changes"}
    </Button>
  );
}

export function BookForm({
  mode,
  schools,
  isSuperAdmin,
  defaults,
  bookId,
}: {
  mode: "create" | "edit";
  schools: { id: string; name: string }[];
  isSuperAdmin: boolean;
  defaults?: BookFormDefaults;
  bookId?: string;
}) {
  const action = mode === "create" ? createBookAction : updateBookAction;
  const [state, formAction] = useActionState<BookFormState, FormData>(action, {});
  const err = (n: string) => state.fieldErrors?.[n];

  return (
    <form action={formAction} className="space-y-4">
      {bookId ? <input type="hidden" name="id" value={bookId} /> : null}

      {state.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          {mode === "create" && isSuperAdmin ? (
            <div className="sm:col-span-2">
              <Field label="School" error={err("schoolId")}>
                <Select name="schoolId" defaultValue={schools[0]?.id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          ) : null}

          <div className="sm:col-span-2">
            <Field label="Title" htmlFor="title" error={err("title")}>
              <Input id="title" name="title" defaultValue={defaults?.title} required />
            </Field>
          </div>
          <Field label="Author" htmlFor="author" error={err("author")}>
            <Input id="author" name="author" defaultValue={defaults?.author} required />
          </Field>
          <Field label="Category" htmlFor="category" error={err("category")} hint="e.g. Fiction, Science">
            <Input id="category" name="category" defaultValue={defaults?.category} />
          </Field>
          <Field label="ISBN" htmlFor="isbn" error={err("isbn")}>
            <Input id="isbn" name="isbn" defaultValue={defaults?.isbn} />
          </Field>
          <Field label="Total copies" htmlFor="totalCopies" error={err("totalCopies")}>
            <Input id="totalCopies" name="totalCopies" type="number" min={1} defaultValue={defaults?.totalCopies ?? "1"} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={bookId ? `/dashboard/library/${bookId}` : "/dashboard/library"}>Cancel</Link>
        </Button>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
