import type { EnrollmentStatus, Gender, BloodGroup } from "@prisma/client";

export const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  ACTIVE: "Active",
  PROMOTED: "Promoted",
  TRANSFERRED: "Transferred",
  GRADUATED: "Graduated",
  SUSPENDED: "Suspended",
  WITHDRAWN: "Withdrawn",
  ALUMNI: "Alumni",
};

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline";

export const STATUS_VARIANT: Record<EnrollmentStatus, BadgeVariant> = {
  ACTIVE: "success",
  PROMOTED: "info",
  TRANSFERRED: "warning",
  GRADUATED: "info",
  SUSPENDED: "destructive",
  WITHDRAWN: "secondary",
  ALUMNI: "secondary",
};

/** Statuses an admin can transition a student to from the detail page. */
export const STATUS_ACTIONS: EnrollmentStatus[] = [
  "ACTIVE",
  "PROMOTED",
  "TRANSFERRED",
  "GRADUATED",
  "SUSPENDED",
  "WITHDRAWN",
  "ALUMNI",
];

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  UNDISCLOSED: "Undisclosed",
};

export const BLOOD_GROUP_LABELS: Record<BloodGroup, string> = {
  A_POSITIVE: "A+",
  A_NEGATIVE: "A−",
  B_POSITIVE: "B+",
  B_NEGATIVE: "B−",
  AB_POSITIVE: "AB+",
  AB_NEGATIVE: "AB−",
  O_POSITIVE: "O+",
  O_NEGATIVE: "O−",
  UNKNOWN: "Unknown",
};

export function fullName(first: string, last: string) {
  return `${first} ${last}`.trim();
}
