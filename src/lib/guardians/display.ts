import type { GuardianRelation } from "@prisma/client";

export const RELATION_LABELS: Record<GuardianRelation, string> = {
  FATHER: "Father",
  MOTHER: "Mother",
  GRANDPARENT: "Grandparent",
  SIBLING: "Sibling",
  UNCLE: "Uncle",
  AUNT: "Aunt",
  LEGAL_GUARDIAN: "Legal guardian",
  OTHER: "Other",
};

export const RELATION_OPTIONS = Object.keys(RELATION_LABELS) as GuardianRelation[];

export function fullName(first: string, last: string) {
  return `${first} ${last}`.trim();
}
