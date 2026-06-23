"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { createEvaluationAction, type EvaluationFormState } from "@/lib/evaluations/actions";
import { DIMENSIONS, RATING_LABELS, overallScore, ratingVariant, type DimensionScores } from "@/lib/evaluations/display";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function RatingRow({
  label,
  hint,
  name,
  value,
  onChange,
  error,
}: {
  label: string;
  hint: string;
  name: string;
  value: number;
  onChange: (v: number) => void;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <input type="hidden" name={name} value={value || ""} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label>{label}</Label>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-label={`${label}: ${n} (${RATING_LABELS[n]})`}
              aria-pressed={value === n}
              className={cn(
                "grid size-9 place-items-center rounded-md border text-sm font-medium transition-colors",
                value === n ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Save />}
      Save evaluation
    </Button>
  );
}

export function EvaluationForm({ teacherId }: { teacherId: string }) {
  const [state, formAction] = useActionState<EvaluationFormState, FormData>(createEvaluationAction, {});
  const err = (n: string) => state.fieldErrors?.[n];

  const [scores, setScores] = useState<DimensionScores>({ teaching: 0, classroom: 0, collaboration: 0, punctuality: 0 });
  const set = (key: keyof DimensionScores) => (v: number) => setScores((s) => ({ ...s, [key]: v }));
  const allRated = Object.values(scores).every((v) => v > 0);
  const overall = allRated ? overallScore(scores) : 0;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="teacherId" value={teacherId} />

      {state.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="period">Evaluation period</Label>
            <Input id="period" name="period" placeholder="e.g. 2024 — Term 1" required />
            {err("period") ? <p className="text-xs text-destructive">{err("period")}</p> : null}
          </div>

          <div className="space-y-4 border-t pt-4">
            {DIMENSIONS.map((d) => (
              <RatingRow
                key={d.key}
                label={d.label}
                hint={d.hint}
                name={d.key}
                value={scores[d.key]}
                onChange={set(d.key)}
                error={err(d.key)}
              />
            ))}
          </div>

          <div className="flex items-center justify-between rounded-md border bg-muted/40 px-4 py-3">
            <span className="text-sm font-medium text-muted-foreground">Overall</span>
            {overall > 0 ? (
              <Badge variant={ratingVariant(overall)}>{overall.toFixed(1)} / 5</Badge>
            ) : (
              <span className="text-sm text-muted-foreground">Rate all four areas</span>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="comment">Comments (optional)</Label>
            <Textarea id="comment" name="comment" rows={4} placeholder="Strengths, areas to improve, goals for next term…" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={`/dashboard/teachers/${teacherId}`}>Cancel</Link>
        </Button>
        <SubmitButton />
      </div>
    </form>
  );
}
