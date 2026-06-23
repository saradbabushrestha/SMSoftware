import { z } from "zod";
import { AnnouncementAudience } from "@prisma/client";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const announcementSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  body: z.string().trim().min(1, "Message is required").max(5000),
  audience: z.nativeEnum(AnnouncementAudience).default("ALL"),
  pinned: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()).default(false),
  expiresAt: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
});

export type AnnouncementInput = z.infer<typeof announcementSchema>;

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
