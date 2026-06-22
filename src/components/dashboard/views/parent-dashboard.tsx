import { ClipboardCheck, GaugeCircle, Wallet, CalendarDays, Megaphone } from "lucide-react";
import type { SessionUser } from "@/lib/auth/types";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Panel, SampleTag, ProgressBar } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendAreaChart, DonutChart } from "@/components/dashboard/charts";

const PROGRESS = [
  { label: "T1", value: 78 },
  { label: "T2", value: 81 },
  { label: "T3", value: 80 },
  { label: "T4", value: 85 },
  { label: "T5", value: 88 },
];

const FEES = [
  { name: "Paid", value: 80, color: "var(--chart-2)" },
  { name: "Due", value: 20, color: "var(--chart-3)" },
];

const EVENTS = [
  { title: "Parent–teacher meeting", when: "Sat, 10:00 AM" },
  { title: "Annual sports day", when: "Next Fri" },
  { title: "Science fair", when: "In 2 weeks" },
];

export function ParentDashboard({ user }: { user: SessionUser }) {
  return (
    <>
      <PageHeader
        title={`Welcome, ${user.firstName}`}
        description="Your child's progress · demo data shown for preview"
        actions={
          <Badge variant="secondary" className="h-7 px-3">
            Viewing: Aarav Sharma · Grade 10 A
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Attendance" value="92%" icon={ClipboardCheck} delta={1.1} accent="success" />
        <StatCard label="GPA" value="3.6" icon={GaugeCircle} accent="info" hint="of 4.0" />
        <StatCard label="Fee due" value="₨ 18,000" icon={Wallet} accent="warning" hint="due in 6 days" />
        <StatCard label="Upcoming events" value={3} icon={CalendarDays} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Academic progress" description="Average score by term" className="lg:col-span-2" action={<SampleTag />}>
          <TrendAreaChart data={PROGRESS} color="var(--chart-2)" />
        </Panel>
        <Panel
          title="Fee status"
          action={
            <Button size="sm" variant="outline">
              Pay now
            </Button>
          }
        >
          <DonutChart data={FEES} />
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Subject performance" className="lg:col-span-2" action={<SampleTag />}>
          <div className="space-y-4 pt-1">
            {[
              { s: "Mathematics", v: 91, t: "success" as const },
              { s: "Science", v: 84, t: "success" as const },
              { s: "English", v: 78, t: "primary" as const },
              { s: "Social Studies", v: 88, t: "success" as const },
              { s: "Computer", v: 95, t: "success" as const },
            ].map((row) => (
              <div key={row.s} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{row.s}</span>
                  <span className="text-muted-foreground">{row.v}%</span>
                </div>
                <ProgressBar value={row.v} tone={row.t} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Events & announcements" action={<SampleTag />}>
          <ul className="space-y-3">
            {EVENTS.map((e, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Megaphone className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium leading-snug">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.when}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
