import type { Metadata } from "next";
import { ClipboardCheck, Users, CircleCheck, CircleX } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import {
  getMarkableSections,
  getRoster,
  getDailySummary,
  attendanceSummaryFor,
  getOwnStudentId,
  getGuardianChildren,
} from "@/lib/attendance/queries";
import { parseDateParam, toDateParam } from "@/lib/attendance/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { AttendanceControls } from "@/components/attendance/attendance-controls";
import { AttendanceSheet } from "@/components/attendance/attendance-sheet";
import { AttendanceSummaryCard } from "@/components/attendance/summary-card";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ sectionId?: string; date?: string }>;
}) {
  const user = await requirePermission("attendance:view");
  const sp = await searchParams;

  // ─── Student self-view ───
  if (user.role === "STUDENT") {
    const sid = await getOwnStudentId(user);
    const summary = sid ? await attendanceSummaryFor(sid) : null;
    return (
      <>
        <PageHeader title="My attendance" description="Your attendance record this academic year." />
        <div className="max-w-xl">
          {summary ? (
            <AttendanceSummaryCard title="Attendance" summary={summary} />
          ) : (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">No student profile found.</CardContent></Card>
          )}
        </div>
      </>
    );
  }

  // ─── Parent self-view (per child) ───
  if (user.role === "PARENT") {
    const children = await getGuardianChildren(user);
    const summaries = await Promise.all(children.map((c) => attendanceSummaryFor(c.studentId)));
    return (
      <>
        <PageHeader title="Attendance" description="Your children's attendance." />
        {children.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No children linked to your account.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {children.map((c, i) => (
              <AttendanceSummaryCard key={c.studentId} title={c.name} subtitle={c.admissionNumber} summary={summaries[i]} />
            ))}
          </div>
        )}
      </>
    );
  }

  // ─── Staff roster tool ───
  const date = parseDateParam(sp.date);
  const dateStr = toDateParam(date);
  const canMark = can(user, "attendance:mark");

  const [sections, roster] = await Promise.all([
    getMarkableSections(user),
    sp.sectionId ? getRoster(user, sp.sectionId, date) : Promise.resolve(null),
  ]);
  const summary = sp.sectionId && roster ? await getDailySummary(sp.sectionId, date) : null;

  return (
    <>
      <PageHeader
        title="Attendance"
        description={canMark ? "Mark and review daily attendance." : "Review daily attendance."}
      />

      <Card className="mb-4 p-4">
        <AttendanceControls sections={sections} sectionId={sp.sectionId} date={dateStr} />
      </Card>

      {!sp.sectionId ? (
        <Card>
          <CardContent className="grid place-items-center py-14 text-center">
            <ClipboardCheck className="mb-3 size-8 text-muted-foreground" />
            <p className="text-sm font-medium">Select a class & section</p>
            <p className="mt-1 text-xs text-muted-foreground">Choose a section and date to {canMark ? "mark" : "view"} attendance.</p>
          </CardContent>
        </Card>
      ) : !roster ? (
        <Card>
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            That section was not found.
          </CardContent>
        </Card>
      ) : (
        <>
          {summary ? (
            <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Students" value={roster.rows.length} icon={Users} />
              <StatCard label="Present" value={summary.PRESENT} icon={CircleCheck} accent="success" />
              <StatCard label="Absent" value={summary.ABSENT} icon={CircleX} accent="destructive" />
              <StatCard label="Marked" value={`${summary.marked}/${roster.rows.length}`} icon={ClipboardCheck} accent="info" />
            </div>
          ) : null}

          <Card className="p-4">
            <div className="mb-3">
              <h3 className="font-semibold">{roster.sectionLabel}</h3>
              <p className="text-xs text-muted-foreground">
                {date.toLocaleDateString("en", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}
              </p>
            </div>
            <AttendanceSheet sectionId={sp.sectionId} date={dateStr} rows={roster.rows} canMark={canMark} />
          </Card>
        </>
      )}
    </>
  );
}
