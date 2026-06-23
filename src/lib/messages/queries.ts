import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";
import type { Box } from "@/lib/messages/display";

const PAGE_SIZE = 12;

const participant = { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true } } as const;

function boxWhere(user: SessionUser, box: Box): Prisma.MessageWhereInput {
  return box === "sent"
    ? { senderId: user.id, senderDeletedAt: null }
    : { recipientId: user.id, recipientDeletedAt: null };
}

export async function listMessages(user: SessionUser, params: { box: Box; page?: number }) {
  const page = Math.max(1, params.page ?? 1);
  const where = boxWhere(user, params.box);

  const [rows, total] = await Promise.all([
    db.message.findMany({
      where,
      include: { sender: participant, recipient: participant },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.message.count({ where }),
  ]);
  return { rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Unread messages in the user's inbox. */
export async function getUnreadCount(user: SessionUser): Promise<number> {
  return db.message.count({ where: { recipientId: user.id, recipientDeletedAt: null, readAt: null } });
}

/** A single message — only if the user is a participant who hasn't deleted their side. */
export async function getMessage(user: SessionUser, id: string) {
  return db.message.findFirst({
    where: {
      id,
      OR: [
        { senderId: user.id, senderDeletedAt: null },
        { recipientId: user.id, recipientDeletedAt: null },
      ],
    },
    include: { sender: participant, recipient: participant },
  });
}

/** Active users the sender may message — same school (everyone for super admin), minus self. */
export async function getRecipients(user: SessionUser) {
  const where: Prisma.UserWhereInput = { deletedAt: null, status: "ACTIVE", id: { not: user.id } };
  if (user.role !== "SUPER_ADMIN") where.schoolId = user.schoolId ?? "__none__";
  const users = await db.user.findMany({
    where,
    select: { id: true, firstName: true, lastName: true, role: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  return users;
}
