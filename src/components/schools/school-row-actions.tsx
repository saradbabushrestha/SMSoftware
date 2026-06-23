"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Eye, Pencil, Archive } from "lucide-react";
import { deleteSchoolAction } from "@/lib/schools/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function SchoolRowActions({
  id,
  name,
  canManage,
  canDelete,
}: {
  id: string;
  name: string;
  canManage: boolean;
  canDelete: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Row actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/schools/${id}`}>
              <Eye /> View
            </Link>
          </DropdownMenuItem>
          {canManage ? (
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/schools/${id}/edit`}>
                <Pencil /> Edit
              </Link>
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setConfirmOpen(true);
                }}
                className="text-destructive focus:text-destructive [&_svg]:text-destructive"
              >
                <Archive /> Archive
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This deactivates and hides the school and all its data from the platform. It can be
              restored by a super admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={deleteSchoolAction}>
              <input type="hidden" name="id" value={id} />
              <Button type="submit" variant="destructive">
                <Archive /> Archive school
              </Button>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
