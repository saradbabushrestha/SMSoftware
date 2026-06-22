import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getClass } from "@/lib/classes/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { ClassForm } from "@/components/classes/class-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit class" };

export default async function EditClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission("class:manage");
  const klass = await getClass(user, id);
  if (!klass) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href={`/dashboard/classes/${id}`}>
          <ArrowLeft /> Back to class
        </Link>
      </Button>
      <PageHeader title={`Edit ${klass.name}`} description={`Code ${klass.code}`} />
      <ClassForm
        mode="edit"
        classId={klass.id}
        schools={[]}
        isSuperAdmin={false}
        defaults={{
          name: klass.name,
          code: klass.code,
          stream: klass.stream ?? undefined,
          capacity: String(klass.capacity),
        }}
      />
    </div>
  );
}
