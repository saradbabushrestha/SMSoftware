"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Loader2, GraduationCap, Users, School, Wallet, type LucideIcon } from "lucide-react";
import { searchAction } from "@/lib/search/actions";
import type { SearchResult, SearchKind } from "@/lib/search/queries";

const KIND: Record<SearchKind, { label: string; Icon: LucideIcon }> = {
  student: { label: "Students", Icon: GraduationCap },
  teacher: { label: "Teachers", Icon: Users },
  class: { label: "Classes", Icon: School },
  invoice: { label: "Invoices", Icon: Wallet },
};
const ORDER: SearchKind[] = ["student", "teacher", "class", "invoice"];

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced search; guard against out-of-order responses. All state updates
  // happen inside the (async) timeout callback, never synchronously in the effect.
  useEffect(() => {
    const term = q.trim();
    let cancelled = false;
    const t = setTimeout(async () => {
      if (term.length < 2) {
        if (!cancelled) {
          setResults([]);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      try {
        const r = await searchAction(term);
        if (!cancelled) setResults(r);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, term.length < 2 ? 0 : 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  // Close on outside click / Escape.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const select = () => {
    setOpen(false);
    setQ("");
    setResults([]);
  };

  const grouped = ORDER.map((kind) => ({ kind, items: results.filter((r) => r.kind === kind) })).filter((g) => g.items.length > 0);

  return (
    <div ref={boxRef} className="relative hidden max-w-md flex-1 sm:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search students, classes, invoices…"
        className="h-9 w-full rounded-md border border-input bg-muted/40 pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-background"
        aria-label="Global search"
      />
      {loading ? <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" /> : null}

      {open && q.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-[60vh] overflow-y-auto rounded-md border bg-popover p-1.5 text-popover-foreground shadow-lg">
          {!loading && grouped.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches for &ldquo;{q.trim()}&rdquo;</p>
          ) : (
            grouped.map((group) => {
              const { label, Icon } = KIND[group.kind];
              return (
                <div key={group.kind} className="mb-1 last:mb-0">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                  {group.items.map((r) => (
                    <Link
                      key={`${r.kind}-${r.href}`}
                      href={r.href}
                      onClick={select}
                      className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate font-medium">{r.label}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">{r.sublabel}</span>
                    </Link>
                  ))}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
