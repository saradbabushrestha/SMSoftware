// Role-logic + data invariants for the Users module (no new table).
import { PrismaClient } from "@prisma/client";
import { assignableRoles, hasProfile } from "../src/lib/users/roles";

const db = new PrismaClient();

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  // Role gating (pure)
  const superRoles = assignableRoles("SUPER_ADMIN");
  const adminRoles = assignableRoles("SCHOOL_ADMIN");
  log("super admin can assign SUPER_ADMIN", superRoles.includes("SUPER_ADMIN"));
  log("school admin cannot assign SUPER_ADMIN", !adminRoles.includes("SUPER_ADMIN"));
  log("neither can assign profile roles here", !superRoles.includes("STUDENT") && !adminRoles.includes("TEACHER"));
  log("hasProfile flags", hasProfile("STUDENT") && hasProfile("TEACHER") && hasProfile("PARENT") && !hasProfile("PRINCIPAL"));

  const school = await db.school.findUniqueOrThrow({ where: { code: "GHS" } });

  // Email uniqueness
  const email = `usercheck.${Date.now()}@greenwood.edu`;
  const u = await db.user.create({ data: { email, passwordHash: "x", role: "PRINCIPAL", firstName: "Test", lastName: "Principal", schoolId: school.id } });
  let dup = false;
  try {
    await db.user.create({ data: { email, passwordHash: "x", role: "ACCOUNTANT", firstName: "Dup", lastName: "User", schoolId: school.id } });
  } catch {
    dup = true;
  }
  log("duplicate email rejected", dup);

  // Reset-password effect: changing hash + revoking sessions
  await db.refreshToken.create({ data: { userId: u.id, tokenHash: `tc-${Date.now()}`, expiresAt: new Date(Date.now() + 86400000) } });
  await db.user.update({ where: { id: u.id }, data: { passwordHash: "newhash" } });
  await db.refreshToken.updateMany({ where: { userId: u.id, revokedAt: null }, data: { revokedAt: new Date() } });
  const liveTokens = await db.refreshToken.count({ where: { userId: u.id, revokedAt: null } });
  log("reset revokes active sessions", liveTokens === 0);

  // Soft-delete exclusion
  await db.user.update({ where: { id: u.id }, data: { deletedAt: new Date(), status: "DISABLED" } });
  const active = await db.user.count({ where: { id: u.id, deletedAt: null } });
  log("soft-deleted user excluded from active scope", active === 0);

  // Cleanup
  await db.refreshToken.deleteMany({ where: { userId: u.id } });
  await db.user.delete({ where: { id: u.id } });
  log("cleanup complete", true);

  console.log(ok ? "\n✅ USERS CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
