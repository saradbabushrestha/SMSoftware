import {
  CalendarClock,
  ClipboardList,
  GraduationCap,
  ClipboardCheck,
  Clock,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth/types";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Panel, SampleTag } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/badge";
import { DonutChart, BarSeriesChart } from "@/components/dashboard/charts";

const SCHEDULE = [
  { time: "08:00", subject: "Mathematics", klass: "Grade 10 · A", room: "R-204" },
  { time: "09:30", subject: "Mathematics", klass: "Grade 9 · B", room: "R-204" },
  { time: "11:00", subject: "Algebra Lab", klass: "Grade 10 · A", room: "Lab-2" },
  { time: "13:30", subject: "Mathematics", klass: "Grade 8 · C", room: "R-118" },
];

const ASSIGNMENTS = [
  { title: "Quadratic equations worksheet", klass: "Grade 10 · A", pending: 12 },
  { title: "Trigonometry quiz", klass: "Grade 9 · B", pending: 7 },
  { title: "Probability project", klass: "Grade 10 · A", pending: 21 },
];

const ATTENDANCE = [
  { name: "Present", value: 86, color: "var(--chart-2)" },
  { name: "Absent", value: 9, color: "var(--chart-1)" },
  { name: "Late", value: 5, color: "var(--chart-3)" },
];

const PERFORMANCE = [
  { label: "Grade 8 C", avg: 74 },
  { label: "Grade 9 B", avg: 81 },
  { label: "Grade 10 A", avg: 88 },
];

export function TeacherDashboard({ user }: { user: SessionUser }) {
  return (
    <>
      <PageHeader
        title={`Good day, ${user.firstName}`}
        description="Your teaching overview · demo data shown for preview"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's classes" value={4} icon={CalendarClock} hint="2 remaining" />
        <StatCard label="Pending to grade" value={40} icon={ClipboardList} accent="warning" hint="3 assignments" />
        <StatCard label="My students" value={126} icon={GraduationCap} accent="info" />
        <StatCard label="Avg attendance" value="86%" icon={ClipboardCheck} delta={2.1} accent="success" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Today's schedule" description="Your classes for today" className="lg:col-span-2" action={<SampleTag />}>
          <ul className="divide-y">
            {SCHEDULE.map((s, i) => (
              <li key={i} className="flex items-center gap-4 py-3">
                <div className="flex w-16 items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <Clock className="size-3.5" />
                  {s.time}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.subject}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.klass}</p>
                </div>
                <Badge variant="outline">{s.room}</Badge>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Class attendance" description="Today, across your classes" action={<SampleTag />}>
          <DonutChart data={ATTENDANCE} />
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Assignments to grade" className="lg:col-span-2" action={<SampleTag />}>
          <ul className="divide-y">
            {ASSIGNMENTS.map((a, i) => (
              <li key={i} className="flex items-center gap-3 py-3">
                <span className="grid size-9 place-items-center rounded-lg bg-warning/15 text-warning">
                  <ClipboardList className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.klass}</p>
                </div>
                <Badge variant="warning">{a.pending} pending</Badge>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Class performance" description="Average score" action={<SampleTag />}>
          <BarSeriesChart data={PERFORMANCE} series={[{ key: "avg", name: "Avg %", color: "var(--chart-1)" }]} height={200} />
        </Panel>
      </div>
    </>
  );
}
