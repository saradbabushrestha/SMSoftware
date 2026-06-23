"use server";

import { requireUser } from "@/lib/rbac/authorize";
import { globalSearch, type SearchResult } from "@/lib/search/queries";

/** Client-callable global search (used by the topbar). Always scoped to the caller. */
export async function searchAction(query: string): Promise<SearchResult[]> {
  const user = await requireUser();
  return globalSearch(user, query);
}
