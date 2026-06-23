import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac/authorize";
import { getReport } from "@/lib/reports/registry";
import { buildReport } from "@/lib/reports/data";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Reports are a staff tool; parents/students don't get bulk exports.
  if (!can(user, "report:view") || user.role === "PARENT" || user.role === "STUDENT") {
    return new Response("Forbidden", { status: 403 });
  }

  const report = getReport(key);
  if (!report) return new Response("Not found", { status: 404 });
  if (!can(user, report.permission)) return new Response("Forbidden", { status: 403 });

  const file = await buildReport(user, key);
  if (!file) return new Response("Not found", { status: 404 });

  await audit({ action: "report.export", userId: user.id, schoolId: user.schoolId, entityType: "Report", entityId: key });

  return new Response(file.csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${file.filename}"`,
      "cache-control": "no-store",
    },
  });
}
