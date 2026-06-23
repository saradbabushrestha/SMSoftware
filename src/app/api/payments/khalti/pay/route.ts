import type { NextRequest } from "next/server";
import { handleInitiation } from "@/lib/payments/handle";

export function GET(req: NextRequest) {
  return handleInitiation(req, "KHALTI");
}
