import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getBook } from "@/lib/library/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { BookForm } from "@/components/library/book-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit book" };

export default async function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("library:manage");
  const book = await getBook(user, id);
  if (!book) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href={`/dashboard/library/${id}`}>
          <ArrowLeft /> Back to book
        </Link>
      </Button>
      <PageHeader title={`Edit ${book.title}`} />
      <BookForm
        mode="edit"
        bookId={book.id}
        schools={[]}
        isSuperAdmin={false}
        defaults={{
          title: book.title,
          author: book.author,
          isbn: book.isbn ?? undefined,
          category: book.category ?? undefined,
          totalCopies: String(book.totalCopies),
        }}
      />
    </div>
  );
}
