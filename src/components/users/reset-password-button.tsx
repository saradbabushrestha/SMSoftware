"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { resetPasswordAction } from "@/lib/users/actions";
import { DEMO_PASSWORD } from "@/lib/auth/demo-accounts";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ResetPasswordButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <KeyRound /> Reset password
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset {name}&apos;s password?</AlertDialogTitle>
            <AlertDialogDescription>
              Their password is reset to the temporary password{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{DEMO_PASSWORD}</code>{" "}
              and all active sessions are signed out. They should change it after signing in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={resetPasswordAction} onSubmit={() => setOpen(false)}>
              <input type="hidden" name="id" value={id} />
              <Button type="submit">
                <KeyRound /> Reset password
              </Button>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
