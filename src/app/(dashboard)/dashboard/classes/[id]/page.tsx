import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, School, Layers, GraduationCap, BookOpen } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { getClass, getClassTeacherOptions } from "@/lib/classes/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Panel, EmptyState } from "@/components/dashboard/widgets";
import { SectionsManager, type SectionView } from "@/components/classes/sections-manager";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Class" };

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission("class:view");
  const klass = await getClass(user, id);
  if (!klass) notFound();

  const canManage = can(user, "class:manage");
  const teacherOptions = canManage ? await getClassTeacherOptions(klass.schoolId) : [];

  const sections: SectionView[] = klass.sections.map((s) => ({
    id: s.id,
    name: s.name,
    capacity: s.capacity,
    enrolled: s._count.enrollments,
    classTeacherId: s.classTeacherId,
    classTeacherName: s.classTeacher
      ? `${s.classTeacher.user.firstName} ${s.classTeacher.user.lastName}`
      : null,
  }));

  const totalEnrolled = sections.reduce((acc, s) => acc + s.enrolled, 0);

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/classes">
          <ArrowLeft /> Back to classes
        </Link>
      </Button>

      <PageHeader
        title={klass.name}
        description={
          <>
            Code <span className="font-mono">{klass.code}</span>
            {klass.stream ? ` · ${klass.stream}` : ""}
          </>
        }
        actions={
          canManage ? (
            <Button asChild variant="outline">
              <Link href={`/dashboard/classes/${klass.id}/edit`}>
                <Pencil /> Edit class
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Sections" value={sections.length} icon={Layers} />
        <StatCard label="Enrolled" value={totalEnrolled} icon={GraduationCap} accent="success" />
        <StatCard label="Capacity" value={klass.capacity} icon={School} accent="info" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionsManager
            classId={klass.id}
            sections={sections}
            teacherOptions={teacherOptions}
            canManage={canManage}
          />
        </Card>

        <Panel
          title="Subjects"
          description="Curriculum for this class"
          action={<BookOpen className="size-4 text-muted-foreground" />}
        >
          {klass.subjects.length === 0 ? (
            <EmptyState title="No subjects yet" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {klass.subjects.map((s) => (
                <Badge key={s.id} variant="secondary">
                  {s.name} <span className="ml-1 opacity-70">· {s.code}</span>
                </Badge>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
