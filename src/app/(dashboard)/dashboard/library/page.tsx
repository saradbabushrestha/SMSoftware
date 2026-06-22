import type { Metadata } from "next";
import Link from "next/link";
import { Library, Plus, BookOpen, AlertTriangle, BookCopy } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { listBooks, getLibraryStats, getBookCategories, getMemberLoans } from "@/lib/library/queries";
import { availabilityVariant, loanStatus, fineFor, formatNpr } from "@/lib/library/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Pagination } from "@/components/dashboard/pagination";
import { LibraryFilters } from "@/components/library/library-filters";
import { BookRowActions } from "@/components/library/book-row-actions";
import { Panel } from "@/components/dashboard/widgets";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Library" };

function fmtDate(d: Date) {
  return d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const user = await requirePermission("library:view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const canManage = can(user, "library:manage");

  const [{ rows, total, totalPages, pageSize }, stats, categories, myLoans] = await Promise.all([
    listBooks(user, { q: sp.q, category: sp.category, page }),
    getLibraryStats(user),
    getBookCategories(user),
    user.role === "STUDENT" ? getMemberLoans(user.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        title="Library"
        description="Catalog, borrowing and returns."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/dashboard/library/new">
                <Plus /> Add book
              </Link>
            </Button>
          ) : undefined
        }
      />

      {user.role === "STUDENT" && myLoans.length > 0 ? (
        <div className="mb-4">
          <Panel title="My borrowed books" description="Books currently issued to you">
            <ul className="divide-y">
              {myLoans
                .filter((l) => l.status === "BORROWED")
                .map((l) => {
                  const st = loanStatus(l.status, l.dueDate);
                  const fine = fineFor(l.dueDate, l.returnedAt);
                  return (
                    <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{l.book.title}</p>
                        <p className="truncate text-xs text-muted-foreground">Due {fmtDate(l.dueDate)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {fine > 0 ? <Badge variant="destructive">Fine {formatNpr(fine)}</Badge> : null}
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                    </li>
                  );
                })}
            </ul>
          </Panel>
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Titles" value={stats.titles.toLocaleString()} icon={Library} />
        <StatCard label="Total copies" value={stats.totalCopies.toLocaleString()} icon={BookCopy} accent="info" />
        <StatCard label="Issued" value={stats.issued.toLocaleString()} icon={BookOpen} accent="warning" />
        <StatCard label="Overdue" value={stats.overdue.toLocaleString()} icon={AlertTriangle} accent="destructive" />
      </div>

      <Card className="p-4">
        <LibraryFilters categories={categories} initialQ={sp.q} initialCategory={sp.category} />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Available</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  No books found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <Link href={`/dashboard/library/${b.id}`} className="font-medium hover:underline">
                      {b.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.author}</TableCell>
                  <TableCell className="text-sm">
                    {b.category ? <Badge variant="secondary">{b.category}</Badge> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={availabilityVariant(b.availableCopies)}>
                      {b.availableCopies}/{b.totalCopies}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <BookRowActions id={b.id} title={b.title} canManage={canManage} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
      </Card>
    </>
  );
}
