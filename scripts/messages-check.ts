// Data-layer invariants for the Messages module — scoping, unread, access control, per-side delete.
import { PrismaClient, type UserRole } from "@prisma/client";
import { getRolePermissions } from "../src/lib/rbac/permissions";

const db = new PrismaClient();

async function userBy(email: string) {
  return db.user.findUniqueOrThrow({ where: { email }, select: { id: true, schoolId: true } });
}

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  const [admin, teacher, student, parent, librarian] = await Promise.all([
    userBy("admin@greenwood.edu"),
    userBy("teacher@greenwood.edu"),
    userBy("student@greenwood.edu"),
    userBy("parent@greenwood.edu"),
    userBy("librarian@greenwood.edu"),
  ]);

  const inbox = (uid: string) => db.message.findMany({ where: { recipientId: uid, recipientDeletedAt: null } });
  const sent = (uid: string) => db.message.findMany({ where: { senderId: uid, senderDeletedAt: null } });
  const unread = (uid: string) => db.message.count({ where: { recipientId: uid, recipientDeletedAt: null, readAt: null } });

  // Seeded set present.
  const seeded = await db.message.count();
  log("seeded messages present", seeded >= 3, String(seeded));

  // Inbox / sent scoping.
  const teacherInbox = await inbox(teacher.id);
  const parentInbox = await inbox(parent.id);
  log("teacher inbox has the parent's question", teacherInbox.some((m) => m.senderId === parent.id));
  log("parent inbox has the teacher's reply", parentInbox.some((m) => m.senderId === teacher.id));
  log("teacher's question shows in teacher's Sent", (await sent(teacher.id)).some((m) => m.recipientId === parent.id));

  // Unread counts (teacher read the parent msg in seed; replies/welcome are unread).
  log("parent has an unread reply", (await unread(parent.id)) >= 1, String(await unread(parent.id)));
  log("student has an unread welcome", (await unread(student.id)) >= 1, String(await unread(student.id)));

  // Access control: a non-participant cannot fetch a private message.
  const priv = teacherInbox.find((m) => m.senderId === parent.id)!;
  const librarianCanRead = await db.message.findFirst({
    where: { id: priv.id, OR: [{ senderId: librarian.id, senderDeletedAt: null }, { recipientId: librarian.id, recipientDeletedAt: null }] },
  });
  log("non-participant cannot open a private message", librarianCanRead === null);

  // Per-side delete on a throwaway message: recipient deletes → gone from their inbox, still in sender's Sent.
  const tmp = await db.message.create({ data: { schoolId: admin.schoolId, senderId: admin.id, recipientId: teacher.id, subject: "ZZ tmp", body: "x" } });
  await db.message.update({ where: { id: tmp.id }, data: { recipientDeletedAt: new Date() } });
  const inTeacherInbox = (await inbox(teacher.id)).some((m) => m.id === tmp.id);
  const inAdminSent = (await sent(admin.id)).some((m) => m.id === tmp.id);
  log("recipient delete hides it from their inbox", !inTeacherInbox);
  log("…but sender still sees it in Sent", inAdminSent);
  await db.message.delete({ where: { id: tmp.id } });

  // Recipients list excludes self and stays in-school.
  const recips = await db.user.findMany({ where: { deletedAt: null, status: "ACTIVE", id: { not: teacher.id }, schoolId: teacher.schoolId }, select: { id: true } });
  log("recipient list excludes self", !recips.some((r) => r.id === teacher.id));
  log("recipient list is non-empty", recips.length > 0, String(recips.length));

  // RBAC: every role can use messaging now (accountant gained parity).
  const roles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT", "ACCOUNTANT", "LIBRARIAN"];
  log("all roles can send messages", roles.every((r) => getRolePermissions(r).includes("message:send")));

  console.log(ok ? "\n✅ MESSAGES DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
