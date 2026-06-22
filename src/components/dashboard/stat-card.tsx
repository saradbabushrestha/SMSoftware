import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** e.g. +12.5 (percent). Positive = up (green), negative = down (red). */
  delta?: number;
  deltaSuffix?: string;
  hint?: string;
  accent?: "primary" | "success" | "warning" | "info" | "destructive";
}

const ACCENTS: Record<NonNullable<StatCardProps["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/12 text-info",
  destructive: "bg-destructive/12 text-destructive",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaSuffix = "%",
  hint,
  accent = "primary",
}: StatCardProps) {
  const up = (delta ?? 0) >= 0;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
          </div>
          <span className={cn("grid size-10 place-items-center rounded-lg", ACCENTS[accent])}>
            <Icon className="size-5" />
          </span>
        </div>
        {(delta !== undefined || hint) && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            {delta !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium",
                  up ? "text-success" : "text-destructive",
                )}
              >
                {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                {Math.abs(delta)}
                {deltaSuffix}
              </span>
            )}
            {hint ? <span className="text-muted-foreground">{hint}</span> : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
