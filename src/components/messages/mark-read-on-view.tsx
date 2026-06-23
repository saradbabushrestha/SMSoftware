"use client";

import { useEffect, useRef } from "react";
import { markMessageReadAction } from "@/lib/messages/actions";

/**
 * Fire-and-forget: when the recipient opens an unread message, mark it read.
 * Rendered only for unread inbox messages, so it runs at most once per view.
 */
export function MarkReadOnView({ id }: { id: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const fd = new FormData();
    fd.set("id", id);
    void markMessageReadAction(fd);
  }, [id]);
  return null;
}
