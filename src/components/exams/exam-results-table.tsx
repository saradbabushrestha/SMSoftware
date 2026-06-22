import { gpaLabel } from "@/lib/exams/grading";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/widgets";

interface Cell {
  subjectId: string;
  marks: number | null;
  letter?: string;
  gpa?: number;
  pass?: boolean;
  percent?: number;
}

interface StudentRow {
  studentId: string;
  name: string;
  cells: Cell[];
  gpa: number;
  gradedCount: number;
}

export function ExamResultsTable({
  subjects,
  students,
}: {
  subjects: { id: string; name: string; code: string }[];
  students: StudentRow[];
}) {
  if (students.length === 0) {
    return <EmptyState title="No students enrolled" />;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student</TableHead>
          {subjects.map((s) => (
            <TableHead key={s.id} className="text-center">
              {s.code}
            </TableHead>
          ))}
          <TableHead className="text-right">GPA</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((st) => (
          <TableRow key={st.studentId}>
            <TableCell className="font-medium">{st.name}</TableCell>
            {st.cells.map((c) => (
              <TableCell key={c.subjectId} className="text-center">
                {c.marks !== null ? (
                  <Badge variant={c.pass ? "success" : "destructive"}>{c.letter}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            ))}
            <TableCell className="text-right">
              {st.gradedCount > 0 ? (
                <span className="font-semibold">{gpaLabel(st.gpa)}</span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
