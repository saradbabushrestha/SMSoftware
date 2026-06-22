import { Library, BookOpen, AlertTriangle, Users, ArrowRight } from "lucide-react";
import type { SessionUser } from "@/lib/auth/types";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Panel, SampleTag } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendAreaChart, DonutChart } from "@/components/dashboard/charts";

const BORROWING = [
  { label: "Mon", value: 34 },
  { label: "Tue", value: 41 },
  { label: "Wed", value: 38 },
  { label: "Thu", value: 52 },
  { label: "Fri", value: 47 },
];

const CATEGORIES = [
  { name: "Fiction", value: 38, color: "var(--chart-1)" },
  { name: "Science", value: 27, color: "var(--chart-2)" },
  { name: "History", value: 18, color: "var(--chart-3)" },
  { name: "Reference", value: 17, color: "var(--chart-4)" },
];

const OVERDUE = [
  { book: "A Brief History of Time", member: "Aarav Sharma", days: 4 },
  { book: "To Kill a Mockingbird", member: "Sita Karki", days: 2 },
  { book: "Clean Code", member: "Ram Gurung", days: 9 },
];

export function LibrarianDashboard({ user }: { user: SessionUser }) {
  return (
    <>
      <PageHeader
        title={`Hello, ${user.firstName}`}
        description="Library overview · demo data shown for preview"
        actions={
          <Button>
            <BookOpen /> Issue book
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total books" value="8,420" icon={Library} hint="312 titles" />
        <StatCard label="Issued" value={642} icon={BookOpen} accent="info" delta={3.2} />
        <StatCard label="Overdue" value={28} icon={AlertTriangle} accent="destructive" />
        <StatCard label="Active members" value="1,184" icon={Users} accent="success" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Borrowing activity" description="Books issued this week" className="lg:col-span-2" action={<SampleTag />}>
          <TrendAreaChart data={BORROWING} color="var(--chart-4)" />
        </Panel>
        <Panel title="By category" action={<SampleTag />}>
          <DonutChart data={CATEGORIES} />
        </Panel>
      </div>

      <div className="mt-4">
        <Panel
          title="Overdue returns"
          action={
            <Button asChild variant="ghost" size="sm">
              <span className="inline-flex items-center gap-1">
                View all <ArrowRight />
              </span>
            </Button>
          }
        >
          <ul className="divide-y">
            {OVERDUE.map((o, i) => (
              <li key={i} className="flex items-center gap-3 py-3">
                <span className="grid size-9 place-items-center rounded-lg bg-destructive/12 text-destructive">
                  <BookOpen className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{o.book}</p>
                  <p className="truncate text-xs text-muted-foreground">{o.member}</p>
                </div>
                <Badge variant="destructive">{o.days}d overdue</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
