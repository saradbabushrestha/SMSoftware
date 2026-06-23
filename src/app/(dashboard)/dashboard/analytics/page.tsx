import type { Metadata } from "next";
import { GraduationCap, Users, ClipboardCheck, Wallet, AlertTriangle } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import {
  headlineStats,
  enrollmentByClass,
  attendanceBreakdown,
  genderDistribution,
  feeCollection,
  atRiskStudents,
} from "@/lib/analytics/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Panel, EmptyState } from "@/components/dashboard/widgets";
import { BarSeriesChart, DonutChart } from "@/components/dashboard/charts";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const user = await requirePermission("analytics:view");

  const [stats, enrollment, attendance, gender, fees, atRisk] = await Promise.all([
    headlineStats(user),
    enrollmentByClass(user),
    attendanceBreakdown(user),
    genderDistribution(user),
    feeCollection(user),
    atRiskStudents(user),
  ]);

  return (
    <>
      <PageHeader title="Analytics" description="Live insights across enrollment, attendance and finance." />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={stats.students.toLocaleString()} icon={GraduationCap} />
        <StatCard label="Teachers" value={stats.teachers.toLocaleString()} icon={Users} accent="info" />
        <StatCard label="Avg attendance" value={`${stats.attendancePct}%`} icon={ClipboardCheck} accent="success" />
        <StatCard label="Fee collection" value={`${stats.collectionRate}%`} icon={Wallet} accent="warning" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Enrollment by class" description="Active students this academic year" className="lg:col-span-2">
          {enrollment.length === 0 ? (
            <EmptyState title="No enrollment data" />
          ) : (
            <BarSeriesChart data={enrollment} series={[{ key: "value", name: "Students", color: "var(--chart-1)" }]} />
          )}
        </Panel>

        <Panel title="Attendance" description="All recorded attendance">
          {attendance.length === 0 ? <EmptyState title="No attendance yet" /> : <DonutChart data={attendance} />}
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Fee collection" description="Collected vs outstanding (₨)">
          {fees.length === 0 ? <EmptyState title="No invoices yet" /> : <DonutChart data={fees} />}
        </Panel>

        <Panel title="Gender distribution" description="Students">
          {gender.length === 0 ? <EmptyState title="No students yet" /> : <DonutChart data={gender} />}
        </Panel>

        <Panel
          title="At-risk students"
          description="Attendance below 80%"
          action={<AlertTriangle className="size-4 text-warning" />}
        >
          {atRisk.length === 0 ? (
            <EmptyState title="No at-risk students" description="Everyone is above the threshold." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Attendance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atRisk.map((r) => (
                  <TableRow key={r.studentId}>
                    <TableCell>
                      <span className="font-medium">{r.name}</span>
                      <span className="ml-1 text-xs text-muted-foreground">· {r.days}d</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={r.percentage < 60 ? "destructive" : "warning"}>{r.percentage}%</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}
