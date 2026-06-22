import Link from "next/link";
import {
  GraduationCap,
  Users,
  School,
  Wallet,
  ArrowRight,
  Contact,
  Building2,
} from "lucide-react";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";
import { ROLE_LABELS } from "@/lib/rbac/permissions";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Panel, SampleTag } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TrendAreaChart, BarSeriesChart, DonutChart } from "@/components/dashboard/charts";
import { initials } from "@/lib/utils";

const ENROLLMENT = [
  { label: "Jan", value: 980 },
  { label: "Feb", value: 1010 },
  { label: "Mar", value: 1045 },
  { label: "Apr", value: 1090 },
  { label: "May", value: 1120 },
  { label: "Jun", value: 1184 },
];

const PERFORMANCE = [
  { label: "Grade 6", pass: 92, distinction: 31 },
  { label: "Grade 7", pass: 88, distinction: 28 },
  { label: "Grade 8", pass: 90, distinction: 34 },
  { label: "Grade 9", pass: 85, distinction: 26 },
  { label: "Grade 10", pass: 94, distinction: 41 },
];

const FEES = [
  { name: "Collected", value: 72, color: "var(--chart-2)" },
  { name: "Pending", value: 21, color: "var(--chart-3)" },
  { name: "Overdue", value: 7, color: "var(--chart-1)" },
];

export async function AdminDashboard({ user }: { user: SessionUser }) {
  const isSuper = user.role === "SUPER_ADMIN";
  const scope = isSuper ? {} : { schoolId: user.schoolId ?? "__none__" };

  const [students, teachers, classes, guardians, schools, recent] = await Promise.all([
    db.student.count({ where: { ...scope, deletedAt: null } }),
    db.teacher.count({ where: { ...scope, deletedAt: null } }),
    db.schoolClass.count({ where: { ...scope, deletedAt: null } }),
    db.guardian.count({ where: { ...scope, deletedAt: null } }),
    isSuper ? db.school.count({ where: { deletedAt: null } }) : Promise.resolve(0),
    db.student.findMany({
      where: { ...scope, deletedAt: null },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.firstName}`}
        description={`${ROLE_LABELS[user.role]} overview${isSuper ? " · all schools" : ""}`}
        actions={
          <Button asChild>
            <Link href="/dashboard/students">
              <GraduationCap /> Students
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Students" value={students.toLocaleString()} icon={GraduationCap} delta={4.6} hint="vs last term" />
        <StatCard label="Teachers & Staff" value={teachers.toLocaleString()} icon={Users} delta={1.2} hint="vs last term" accent="info" />
        <StatCard label="Classes" value={classes.toLocaleString()} icon={School} accent="warning" hint="active sections" />
        {isSuper ? (
          <StatCard label="Schools" value={schools.toLocaleString()} icon={Building2} accent="success" hint="on platform" />
        ) : (
          <StatCard label="Guardians" value={guardians.toLocaleString()} icon={Contact} accent="success" hint="linked" />
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title="Enrollment growth"
          description="Active students over time"
          className="lg:col-span-2"
          action={<SampleTag />}
        >
          <TrendAreaChart data={ENROLLMENT} />
        </Panel>
        <Panel title="Fee collection" description="This academic year" action={<SampleTag />}>
          <DonutChart data={FEES} />
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title="Academic performance"
          description="Pass & distinction rate by grade"
          className="lg:col-span-2"
          action={<SampleTag />}
        >
          <BarSeriesChart
            data={PERFORMANCE}
            series={[
              { key: "pass", name: "Pass %", color: "var(--chart-1)" },
              { key: "distinction", name: "Distinction %", color: "var(--chart-2)" },
            ]}
          />
        </Panel>

        <Panel
          title="Recent admissions"
          description="Latest students"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/students">
                View all <ArrowRight />
              </Link>
            </Button>
          }
        >
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No students yet.</p>
          ) : (
            <ul className="divide-y">
              {recent.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <Avatar className="size-8">
                    <AvatarFallback>{initials(s.user.firstName, s.user.lastName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {s.user.firstName} {s.user.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{s.admissionNumber}</p>
                  </div>
                  <Badge variant={s.status === "ACTIVE" ? "success" : "secondary"}>
                    {s.status.toLowerCase()}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4">
        <StatCard label="Estimated revenue (term)" value="₨ 4.82M" icon={Wallet} delta={6.1} hint="illustrative · finance module pending" accent="success" />
      </div>
    </>
  );
}
