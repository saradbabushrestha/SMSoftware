export interface DimensionScores {
  teaching: number;
  classroom: number;
  collaboration: number;
  punctuality: number;
}

export const DIMENSIONS: { key: keyof DimensionScores; label: string; hint: string }[] = [
  { key: "teaching", label: "Teaching quality", hint: "Subject mastery and clarity of instruction" },
  { key: "classroom", label: "Classroom management", hint: "Discipline, engagement and time use" },
  { key: "collaboration", label: "Collaboration", hint: "Teamwork with staff and responsiveness" },
  { key: "punctuality", label: "Punctuality", hint: "Attendance and meeting deadlines" },
];

export const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline";

/** Mean of the four dimension scores, rounded to one decimal. */
export function overallScore(s: DimensionScores): number {
  const mean = (s.teaching + s.classroom + s.collaboration + s.punctuality) / 4;
  return Math.round(mean * 10) / 10;
}

export function ratingVariant(score: number): BadgeVariant {
  if (score >= 4) return "success";
  if (score >= 3) return "info";
  if (score >= 2) return "warning";
  return "destructive";
}

export function fmtDate(d: Date): string {
  return d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
