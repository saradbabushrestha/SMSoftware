import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ExternalLink } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { SchoolForm } from "@/components/schools/school-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requirePermission("school:view");

  // Super admins manage tenancy in the Schools module (they have no single school).
  if (!user.schoolId) {
    return (
      <>
        <PageHeader title="Settings" description="Platform configuration." />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-6" />
            </span>
            <div>
              <p className="font-medium">You&apos;re signed in at the platform level</p>
              <p className="mt-1 text-sm text-muted-foreground">Configure individual schools from the Schools module.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/schools">
                <ExternalLink /> Manage schools
              </Link>
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  const school = await db.school.findFirst({ where: { id: user.schoolId, deletedAt: null } });
  if (!school) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="School settings" description="Your institution's profile and configuration." />
      <SchoolForm
        mode="edit"
        schoolId={school.id}
        defaults={{
          name: school.name,
          code: school.code,
          email: school.email ?? undefined,
          phone: school.phone ?? undefined,
          address: school.address ?? undefined,
          city: school.city ?? undefined,
          country: school.country ?? undefined,
          timezone: school.timezone,
        }}
      />
    </div>
  );
}
