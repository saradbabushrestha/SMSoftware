import type { AttendanceSummary } from "@/lib/attendance/queries";
import {
  ATTENDANCE_OPTIONS,
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_VARIANT,
} from "@/lib/attendance/display";
import { Panel, ProgressBar, EmptyState } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/badge";

export function AttendanceSummaryCard({
  title,
  subtitle,
  summary,
}: {
  title: string;
  subtitle?: string;
  summary: AttendanceSummary;
}) {
  const tone = summary.percentage >= 90 ? "success" : summary.percentage >= 75 ? "warning" : "destructive";

  return (
    <Panel title={title} description={subtitle}>
      {summary.total === 0 ? (
        <EmptyState title="No attendance recorded yet" />
      ) : (
        <div className="space-y-5">
          <div>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-semibold tracking-tight">{summary.percentage}%</span>
              <span className="text-xs text-muted-foreground">{summary.total} days recorded</span>
            </div>
            <ProgressBar value={summary.percentage} tone={tone} className="mt-2" />
          </div>

          <div className="flex flex-wrap gap-2">
            {ATTENDANCE_OPTIONS.map((s) => (
              <Badge key={s} variant={ATTENDANCE_STATUS_VARIANT[s]}>
                {ATTENDANCE_STATUS_LABELS[s]}: {summary[s]}
              </Badge>
            ))}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recent
            </p>
            <ul className="divide-y">
              {summary.recent.map((r, i) => (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-muted-foreground">
                    {r.date.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                  <Badge variant={ATTENDANCE_STATUS_VARIANT[r.status]}>
                    {ATTENDANCE_STATUS_LABELS[r.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Panel>
  );
}
