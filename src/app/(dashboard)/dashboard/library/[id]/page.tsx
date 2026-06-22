import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, BookCopy, User as UserIcon, Hash, Tag, Undo2 } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { getBook, getLibraryMembers } from "@/lib/library/queries";
import { returnBookAction } from "@/lib/library/actions";
import { availabilityVariant, loanStatus, fineFor, formatNpr } from "@/lib/library/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel, EmptyState } from "@/components/dashboard/widgets";
import { IssueDialog } from "@/components/library/issue-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Book" };

function fmtDate(d: Date) {
  return d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("library:view");
  const book = await getBook(user, id);
  if (!book) notFound();

  const canManage = can(user, "library:manage");
  const members = canManage ? await getLibraryMembers(user) : [];

  const meta = [
    { icon: UserIcon, label: "Author", value: book.author },
    { icon: Tag, label: "Category", value: book.category ?? "—" },
    { icon: Hash, label: "ISBN", value: book.isbn ?? "—" },
    { icon: BookCopy, label: "Copies", value: `${book.availableCopies} / ${book.totalCopies} available` },
  ];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/library">
          <ArrowLeft /> Back to library
        </Link>
      </Button>

      <PageHeader
        title={book.title}
        description={
          <Badge variant={availabilityVariant(book.availableCopies)}>
            {book.availableCopies}/{book.totalCopies} available
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            {canManage ? <IssueDialog bookId={book.id} members={members} available={book.availableCopies} /> : null}
            {canManage ? (
              <Button asChild variant="outline">
                <Link href={`/dashboard/library/${book.id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="space-y-4 p-6">
            {meta.map((m) => (
              <div key={m.label} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <m.icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-sm font-medium break-words">{m.value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Panel title="On loan" description="Copies currently issued">
            {book.loans.length === 0 ? (
              <EmptyState title="No copies on loan" description={canManage ? "Issue a copy to a member." : undefined} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fine</TableHead>
                    {canManage ? <TableHead className="text-right">Action</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {book.loans.map((l) => {
                    const st = loanStatus(l.status, l.dueDate);
                    const fine = fineFor(l.dueDate, l.returnedAt);
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">
                          {l.member.firstName} {l.member.lastName}
                          <span className="ml-1 text-xs text-muted-foreground">
                            · {l.member.role === "TEACHER" ? "Teacher" : "Student"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtDate(l.dueDate)}</TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{fine > 0 ? formatNpr(fine) : "—"}</TableCell>
                        {canManage ? (
                          <TableCell className="text-right">
                            <form action={returnBookAction}>
                              <input type="hidden" name="loanId" value={l.id} />
                              <Button type="submit" variant="outline" size="sm">
                                <Undo2 /> Return
                              </Button>
                            </form>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
