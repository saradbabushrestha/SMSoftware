import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { signAccessToken, verifyAccessToken } from "../src/lib/auth/jwt";
import { getRolePermissions, ALL_PERMISSIONS } from "../src/lib/rbac/permissions";
import { DEMO_PASSWORD } from "../src/lib/auth/demo-accounts";

const db = new PrismaClient();

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  // 1) Demo admin exists.
  const admin = await db.user.findUnique({ where: { email: "admin@greenwood.edu" } });
  log("demo school admin exists", !!admin, admin?.email);
  if (!admin) throw new Error("seed missing");

  // 2) Password verifies (and a wrong one fails).
  log("correct password verifies", await bcrypt.compare(DEMO_PASSWORD, admin.passwordHash));
  log("wrong password rejected", !(await bcrypt.compare("nope", admin.passwordHash)));

  // 3) JWT round-trips with the right claims.
  const token = await signAccessToken({
    sub: admin.id,
    role: admin.role,
    schoolId: admin.schoolId,
    email: admin.email,
  });
  const claims = await verifyAccessToken(token);
  log("access token verifies", !!claims && claims.sub === admin.id, claims?.role);

  // 4) Tampered token rejected.
  log("tampered token rejected", (await verifyAccessToken(token + "x")) === null);

  // 5) RBAC matrix sane.
  const adminPerms = getRolePermissions("SCHOOL_ADMIN");
  const studentPerms = getRolePermissions("STUDENT");
  log("school admin can manage students", adminPerms.includes("student:create"));
  log("student cannot manage students", !studentPerms.includes("student:create"));
  log("super admin has all perms", getRolePermissions("SUPER_ADMIN").length === ALL_PERMISSIONS.length, String(getRolePermissions("SUPER_ADMIN").length));

  // 6) Counts reflect the seed.
  const [students, teachers] = await Promise.all([db.student.count(), db.teacher.count()]);
  log("students seeded", students >= 16, String(students));
  log("teachers seeded", teachers >= 6, String(teachers));

  console.log(ok ? "\n✅ ALL SMOKE CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
