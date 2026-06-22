import type { ExamType } from "@prisma/client";

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  UNIT_TEST: "Unit test",
  MIDTERM: "Mid-term",
  FINAL: "Final",
  PRACTICAL: "Practical",
};

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline";

export const EXAM_TYPE_VARIANT: Record<ExamType, BadgeVariant> = {
  UNIT_TEST: "secondary",
  MIDTERM: "info",
  FINAL: "default",
  PRACTICAL: "warning",
};

export const EXAM_TYPE_OPTIONS = Object.keys(EXAM_TYPE_LABELS) as ExamType[];

export interface Grade {
  letter: string;
  gpa: number;
  pass: boolean;
}

// Percentage thresholds → letter + grade point (Nepal-style 4.0 scale).
const SCALE = [
  { min: 90, letter: "A+", gpa: 4.0 },
  { min: 80, letter: "A", gpa: 3.6 },
  { min: 70, letter: "B+", gpa: 3.2 },
  { min: 60, letter: "B", gpa: 2.8 },
  { min: 50, letter: "C+", gpa: 2.4 },
  { min: 40, letter: "C", gpa: 2.0 },
  { min: 33, letter: "D", gpa: 1.6 },
  { min: 0, letter: "NG", gpa: 0.0 },
];

export function gradeFromPercent(pct: number): Grade {
  const band = SCALE.find((s) => pct >= s.min) ?? SCALE[SCALE.length - 1];
  return { letter: band.letter, gpa: band.gpa, pass: pct >= 33 };
}

export function gradeFromMarks(marks: number, max: number): Grade & { percent: number } {
  const percent = max > 0 ? (marks / max) * 100 : 0;
  return { ...gradeFromPercent(percent), percent: Math.round(percent * 10) / 10 };
}

export function gpaLabel(gpa: number): string {
  return gpa.toFixed(2);
}

export function gradeVariant(pass: boolean): BadgeVariant {
  return pass ? "success" : "destructive";
}
