import type { FeeCategory, InvoiceStatus, PaymentMethod } from "@prisma/client";

export const FEE_CATEGORY_LABELS: Record<FeeCategory, string> = {
  TUITION: "Tuition",
  EXAMINATION: "Examination",
  TRANSPORT: "Transport",
  HOSTEL: "Hostel",
  LIBRARY: "Library",
  OTHER: "Other",
};

export const FEE_CATEGORY_OPTIONS = Object.keys(FEE_CATEGORY_LABELS) as FeeCategory[];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  PENDING: "Pending",
  PARTIAL: "Partial",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline";

export const INVOICE_STATUS_VARIANT: Record<InvoiceStatus | "OVERDUE", BadgeVariant> = {
  PENDING: "warning",
  PARTIAL: "info",
  PAID: "success",
  CANCELLED: "secondary",
  OVERDUE: "destructive",
};

// Nepal gateways first, then manual methods. No Stripe/PayPal.
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  ESEWA: "eSewa",
  KHALTI: "Khalti",
  FONEPAY: "Fonepay",
  CASH: "Cash",
  BANK: "Bank transfer",
};

export const PAYMENT_METHOD_OPTIONS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];
/** Online (gateway) methods, shown to parents paying online. */
export const ONLINE_METHODS: PaymentMethod[] = ["ESEWA", "KHALTI", "FONEPAY"];

export function formatNpr(amount: number): string {
  return `₨ ${Math.round(amount).toLocaleString("en-US")}`;
}

/** Display status incl. derived OVERDUE for unpaid invoices past their due date. */
export function displayStatus(
  status: InvoiceStatus,
  dueDate: Date | null,
): { label: string; variant: BadgeVariant } {
  if ((status === "PENDING" || status === "PARTIAL") && dueDate && dueDate.getTime() < Date.now()) {
    return { label: "Overdue", variant: INVOICE_STATUS_VARIANT.OVERDUE };
  }
  return { label: INVOICE_STATUS_LABELS[status], variant: INVOICE_STATUS_VARIANT[status] };
}
