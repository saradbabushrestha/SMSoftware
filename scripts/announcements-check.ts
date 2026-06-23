// Data-layer invariants for the Announcements module — focus on role/audience visibility.
import { PrismaClient, type AnnouncementAudience, type UserRole, Prisma } from "@prisma/client";
import { getRolePermissions } from "../src/lib/rbac/permissions";
import { audienceForRole } from "../src/lib/announcements/display";

const db = new PrismaClient();

/** Mirror of queries.ts visibilityWhere for a non-manager viewer. */
function viewerWhere(schoolId: string, role: UserRole, now: Date): Prisma.AnnouncementWhereInput {
  return {
    deletedAt: null,
    schoolId,
    audience: { in: ["ALL", audienceForRole(role)] as AnnouncementAudience[] },
    OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
  };
}

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  const school = await db.school.findUniqueOrThrow({ where: { code: "GHS" } });
  const now = new Date();

  // Seeded set present.
  const all = await db.announcement.findMany({ where: { schoolId: school.id, deletedAt: null } });
  log("seeded announcements present", all.length >= 4, String(all.length));
  log("has a pinned notice", all.some((a) => a.pinned));
  log("covers multiple audiences", new Set(all.map((a) => a.audience)).size >= 3);

  // Manager sees everything; each viewer sees only ALL + their bucket.
  const managerCount = all.length;
  const studentCount = await db.announcement.count({ where: viewerWhere(school.id, "STUDENT", now) });
  const parentCount = await db.announcement.count({ where: viewerWhere(school.id, "PARENT", now) });
  const teacherCount = await db.announcement.count({ where: viewerWhere(school.id, "TEACHER", now) });

  const allAud = all.filter((a) => a.audience === "ALL").length;
  log("student sees ALL + STUDENTS only", studentCount === allAud + all.filter((a) => a.audience === "STUDENTS").length, String(studentCount));
  log("parent sees ALL + PARENTS only", parentCount === allAud + all.filter((a) => a.audience === "PARENTS").length, String(parentCount));
  log("teacher sees ALL + STAFF only", teacherCount === allAud + all.filter((a) => a.audience === "STAFF").length, String(teacherCount));
  log("non-managers never see the full set", studentCount < managerCount && parentCount < managerCount);

  // Pinned sorts first for a viewer.
  const studentRows = await db.announcement.findMany({ where: viewerWhere(school.id, "STUDENT", now), orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }] });
  log("pinned notice sorts to the top", studentRows[0]?.pinned === true);

  // Expiry: an expired student notice is hidden from students but visible to a manager.
  const expired = await db.announcement.create({
    data: { schoolId: school.id, title: "ZZ Expired", body: "old", audience: "STUDENTS", expiresAt: new Date(now.getTime() - 86_400_000) },
  });
  const studentSeesExpired = await db.announcement.count({ where: { ...viewerWhere(school.id, "STUDENT", now), id: expired.id } });
  const managerSeesExpired = await db.announcement.count({ where: { schoolId: school.id, deletedAt: null, id: expired.id } });
  log("expired notice hidden from students", studentSeesExpired === 0);
  log("expired notice still visible to managers", managerSeesExpired === 1);

  // Soft delete drops it from both views.
  await db.announcement.update({ where: { id: expired.id }, data: { deletedAt: new Date() } });
  const afterDelete = await db.announcement.count({ where: { schoolId: school.id, deletedAt: null, id: expired.id } });
  log("soft delete removes it from the board", afterDelete === 0);
  await db.announcement.delete({ where: { id: expired.id } });

  // RBAC: everyone views, only super/school-admin/principal manage.
  const roles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT", "ACCOUNTANT", "LIBRARIAN"];
  log("all roles can view announcements", roles.every((r) => getRolePermissions(r).includes("announcement:view")));
  const managers = roles.filter((r) => getRolePermissions(r).includes("announcement:manage"));
  log("only super/school-admin/principal manage", managers.sort().join(",") === "PRINCIPAL,SCHOOL_ADMIN,SUPER_ADMIN");

  console.log(ok ? "\n✅ ANNOUNCEMENTS DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
