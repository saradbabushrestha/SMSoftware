"use client";

import { useTheme } from "next-themes";
import { MoonStar, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {/* Both icons render; CSS shows the relevant one per theme (no hydration flash). */}
      <Sun className="size-4 hidden dark:block" />
      <MoonStar className="size-4 block dark:hidden" />
    </Button>
  );
}
