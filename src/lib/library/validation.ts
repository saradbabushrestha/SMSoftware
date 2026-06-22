import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());

export const bookSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  author: z.string().trim().min(1, "Author is required").max(150),
  isbn: optionalString,
  category: optionalString,
  totalCopies: z.preprocess(emptyToUndefined, z.coerce.number().int("Whole number").min(1).max(100000).default(1)),
});

export const issueSchema = z.object({
  memberId: z.string().min(1, "Select a member"),
  dueDate: z.coerce.date(),
});

export type BookInput = z.infer<typeof bookSchema>;
export type IssueInput = z.infer<typeof issueSchema>;

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
