import { z } from "zod";

export const messageSchema = z.object({
  recipientId: z.string().min(1, "Choose a recipient"),
  subject: z.string().trim().min(1, "Subject is required").max(160),
  body: z.string().trim().min(1, "Message is required").max(5000),
});

export type MessageInput = z.infer<typeof messageSchema>;

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
