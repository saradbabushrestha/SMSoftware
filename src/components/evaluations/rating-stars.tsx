import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only star meter for a 0–5 score (supports halves via rounding). */
export function RatingStars({ score, className }: { score: number; className?: string }) {
  const rounded = Math.round(score);
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-4", n <= rounded ? "fill-warning text-warning" : "text-muted-foreground/40")} />
      ))}
    </span>
  );
}
