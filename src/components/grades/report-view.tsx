import type { StudentReport } from "@/lib/grades/queries";
import { EXAM_TYPE_LABELS, EXAM_TYPE_VARIANT, gpaLabel, gradeVariant } from "@/lib/exams/grading";
import { Panel, EmptyState } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "";
}

export function ReportView({ report }: { report: StudentReport }) {
  if (report.groups.length === 0) {
    return <EmptyState title="No published results yet" description="Results appear here once teachers publish them." />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-muted-foreground">Overall GPA</p>
            <p className="text-3xl font-semibold tracking-tight">{gpaLabel(report.overallGpa)}</p>
          </div>
          <p className="text-xs text-muted-foreground">{report.groups.length} exam(s) · of 4.00</p>
        </CardContent>
      </Card>

      {report.groups.map((g) => (
        <Panel
          key={g.examId}
          title={g.examName}
          description={`${fmtDate(g.examDate)}`}
          action={
            <div className="flex items-center gap-2">
              <Badge variant={EXAM_TYPE_VARIANT[g.examType]}>{EXAM_TYPE_LABELS[g.examType]}</Badge>
              <Badge variant="outline">GPA {gpaLabel(g.gpa)}</Badge>
            </div>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead className="text-center">Marks</TableHead>
                <TableHead className="text-center">%</TableHead>
                <TableHead className="text-right">Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {g.subjects.map((s) => (
                <TableRow key={s.code}>
                  <TableCell className="font-medium">
                    {s.name} <span className="text-xs text-muted-foreground">· {s.code}</span>
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {s.marks}/{s.max}
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{s.grade.percent}%</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={gradeVariant(s.grade.pass)}>{s.grade.letter}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      ))}
    </div>
  );
}
