import "server-only";
import { db } from "@/lib/db";

interface AuditInput {
  action: string;
  userId?: string | null;
  schoolId?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

/** Best-effort audit log write; never throws into the request path. */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: input.action,
        userId: input.userId ?? null,
        schoolId: input.schoolId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata as object | undefined,
        ip: input.ip ?? undefined,
        userAgent: input.userAgent ?? undefined,
      },
    });
  } catch {
    // Swallow — auditing must not break the primary action.
  }
}
