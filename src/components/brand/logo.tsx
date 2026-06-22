import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWordmark = true,
  size = "default",
}: {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "default";
}) {
  const box = size === "sm" ? "size-7" : "size-9";
  const icon = size === "sm" ? "size-4" : "size-5";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm",
          box,
        )}
      >
        <GraduationCap className={icon} />
      </span>
      {showWordmark ? (
        <span className="text-base font-semibold tracking-tight">Scholaris</span>
      ) : null}
    </span>
  );
}
