import { ClipboardCheck, GaugeCircle, NotebookPen, ClipboardList, Clock, Megaphone } from "lucide-react";
import type { SessionUser } from "@/lib/auth/types";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Panel, SampleTag, ProgressBar } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/badge";
import { TrendAreaChart } from "@/components/dashboard/charts";

const TIMETABLE = [
  { time: "08:00", subject: "Mathematics", room: "R-204" },
  { time: "09:30", subject: "Science", room: "Lab-1" },
  { time: "11:00", subject: "English", room: "R-110" },
  { time: "13:30", subject: "Computer", room: "Lab-3" },
];

const GPA_TREND = [
  { label: "T1", value: 3.2 },
  { label: "T2", value: 3.4 },
  { label: "T3", value: 3.5 },
  { label: "T4", value: 3.6 },
  { label: "T5", value: 3.7 },
];

const ASSIGNMENTS = [
  { title: "Algebra worksheet", subject: "Mathematics", due: "Tomorrow", tone: "warning" as const },
  { title: "Lab report: Acids & bases", subject: "Science", due: "in 3 days", tone: "primary" as const },
  { title: "Essay: My hometown", subject: "English", due: "in 5 days", tone: "primary" as const },
];

const NOTICES = [
  { title: "Mid-term exams begin next Monday", time: "2h ago" },
  { title: "Science fair registration is open", time: "1d ago" },
  { title: "Library books due this Friday", time: "2d ago" },
];

export function StudentDashboard({ user }: { user: SessionUser }) {
  return (
    <>
      <PageHeader title={`Hi, ${user.firstName}`} description="Your learning at a glance · demo data shown for preview" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Attendance" value="94%" icon={ClipboardCheck} delta={1.4} accent="success" />
        <StatCard label="Current GPA" value="3.7" icon={GaugeCircle} delta={2.8} accent="info" hint="of 4.0" />
        <StatCard label="Upcoming exams" value={3} icon={NotebookPen} accent="warning" hint="this month" />
        <StatCard label="Pending work" value={3} icon={ClipboardList} hint="assignments due" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="GPA trend" description="Across recent terms" className="lg:col-span-2" action={<SampleTag />}>
          <TrendAreaChart data={GPA_TREND} color="var(--chart-4)" />
        </Panel>
        <Panel title="Today's timetable" action={<SampleTag />}>
          <ul className="divide-y">
            {TIMETABLE.map((t, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5">
                <div className="flex w-14 items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Clock className="size-3" />
                  {t.time}
                </div>
                <p className="flex-1 truncate text-sm font-medium">{t.subject}</p>
                <Badge variant="outline">{t.room}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Assignments" description="Upcoming deadlines" className="lg:col-span-2" action={<SampleTag />}>
          <ul className="divide-y">
            {ASSIGNMENTS.map((a, i) => (
              <li key={i} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.subject}</p>
                </div>
                <Badge variant={a.tone === "warning" ? "warning" : "secondary"}>Due {a.due}</Badge>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Term completion</span>
              <span>72%</span>
            </div>
            <ProgressBar value={72} tone="success" />
          </div>
        </Panel>

        <Panel title="Notices" action={<SampleTag />}>
          <ul className="space-y-3">
            {NOTICES.map((n, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Megaphone className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium leading-snug">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
