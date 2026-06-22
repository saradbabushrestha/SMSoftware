import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { BookForm } from "@/components/library/book-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Add book" };

export default async function NewBookPage() {
  const user = await requirePermission("library:manage");
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const schools = isSuperAdmin
    ? await db.school.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [];

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/library">
          <ArrowLeft /> Back to library
        </Link>
      </Button>
      <PageHeader title="Add book" description="Add a title to the catalog." />
      <BookForm mode="create" schools={schools} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
