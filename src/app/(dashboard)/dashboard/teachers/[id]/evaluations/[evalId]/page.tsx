import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { db } from "@/lib/db";
import { getEvaluation } from "@/lib/evaluations/queries";
import { deleteEvaluationAction } from "@/lib/evaluations/actions";
import { DIMENSIONS, RATING_LABELS, overallScore, ratingVariant, fmtDate } from "@/lib/evaluations/display";
import { fullName } from "@/lib/teachers/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { RatingStars } from "@/components/evaluations/rating-stars";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Evaluation" };

export default async function EvaluationDetailPage({ params }: { params: Promise<{ id: string; evalId: string }> }) {
  const { id, evalId } = await params;
  const user = await requirePermission("teacher:evaluate");
  const ev = await getEvaluation(user, evalId);
  if (!ev || ev.teacherId !== id) notFound();

  const evaluator = ev.evaluatorId
    ? await db.user.findUnique({ where: { id: ev.evaluatorId }, select: { firstName: true, lastName: true } })
    : null;
  const overall = overallScore(ev);

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href={`/dashboard/teachers/${id}`}>
          <ArrowLeft /> Back to profile
        </Link>
      </Button>

      <PageHeader
        title={`Evaluation · ${ev.period}`}
        description={
          <>
            {fullName(ev.teacher.user.firstName, ev.teacher.user.lastName)} · {fmtDate(ev.createdAt)}
            {evaluator ? <> · by {evaluator.firstName} {evaluator.lastName}</> : null}
          </>
        }
        actions={
          <form action={deleteEvaluationAction}>
            <input type="hidden" name="id" value={ev.id} />
            <Button type="submit" variant="outline" className="text-destructive">
              <Trash2 /> Delete
            </Button>
          </form>
        }
      />

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">Overall rating</p>
              <div className="mt-1 flex items-center gap-2">
                <RatingStars score={overall} />
                <Badge variant={ratingVariant(overall)}>{overall.toFixed(1)} / 5</Badge>
              </div>
            </div>
          </div>

          <dl className="divide-y border-t">
            {DIMENSIONS.map((d) => {
              const v = ev[d.key];
              return (
                <div key={d.key} className="flex items-center justify-between py-2.5">
                  <dt className="text-sm">
                    <span className="font-medium">{d.label}</span>
                  </dt>
                  <dd className="flex items-center gap-2">
                    <RatingStars score={v} />
                    <span className="w-20 text-right text-sm text-muted-foreground">{RATING_LABELS[v]}</span>
                  </dd>
                </div>
              );
            })}
          </dl>

          {ev.comment ? (
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground">Comments</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{ev.comment}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
