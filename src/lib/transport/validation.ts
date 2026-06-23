import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());

export const routeSchema = z.object({
  name: z.string().trim().min(1, "Route name is required").max(120),
  description: optionalString,
  vehicleNumber: optionalString,
  driverName: optionalString,
  driverPhone: optionalString,
  capacity: z.preprocess(emptyToUndefined, z.coerce.number().int("Whole number").min(0).max(500).default(0)),
  fare: z.preprocess(emptyToUndefined, z.coerce.number().min(0).max(1_000_000).default(0)),
});

export const assignSchema = z.object({
  studentId: z.string().min(1, "Select a student"),
  stop: optionalString,
});

export type RouteInput = z.infer<typeof routeSchema>;

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
