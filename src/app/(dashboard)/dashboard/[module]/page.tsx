import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Hammer, ArrowLeft, Check } from "lucide-react";
import { requireUser } from "@/lib/rbac/authorize";
import { getNavItemByHref, userHas } from "@/lib/rbac/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const MODULE_BLURB: Record<string, string> = {
  students: "Admissions, profiles, promotion, transfer and alumni.",
  teachers: "Staff profiles, subjects, payroll and performance.",
  guardians: "Parent/guardian records linked to their children.",
  classes: "Classes, sections, streams and seating capacity.",
  subjects: "Curriculum, subjects and teacher assignment.",
  timetable: "Drag-and-drop scheduling with conflict detection.",
  attendance: "Daily marking with QR / RFID / biometric support.",
  exams: "Exam types, scheduling, seating plans and hall tickets.",
  grades: "GPA, percentage, letter grades and rank calculation.",
  assignments: "Create, submit, auto-grade and track submissions.",
  fees: "Fee structures, invoices, discounts and scholarships.",
  payments: "Stripe, PayPal and Nepal gateways (eSewa, Khalti, Fonepay).",
  payroll: "Salaries, bonuses, deductions, tax and payslips.",
  accounting: "Income, expense, ledgers and financial statements.",
  library: "Catalog, barcode borrowing, returns and fines.",
  transport: "Vehicles, drivers, routes and GPS-ready tracking.",
  hostel: "Rooms, beds, occupancy and visitor logs.",
  events: "Events, registration, attendance and certificates.",
  analytics: "Predictive analytics and at-risk student detection.",
  reports: "Attendance, fee, academic and performance reports.",
  users: "User accounts, roles and access management.",
  schools: "Multi-school tenancy and subscription plans.",
  audit: "Login activity, data changes and security events.",
  settings: "Academic, branding and platform configuration.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ module: string }>;
}): Promise<Metadata> {
  const { module } = await params;
  const item = getNavItemByHref(`/dashboard/${module}`);
  return { title: item?.label ?? "Module" };
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const item = getNavItemByHref(`/dashboard/${module}`);
  if (!item) notFound();

  const user = await requireUser();
  if (!userHas(user, item.permission)) redirect("/dashboard?denied=1");

  const Icon = item.icon;

  return (
    <>
      <PageHeader title={item.label} description={MODULE_BLURB[module]} />

      <Card>
        <CardContent className="flex flex-col items-center gap-5 px-6 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="size-7" />
          </span>
          <div className="max-w-md space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs font-medium text-warning">
              <Hammer className="size-3.5" /> Module in progress
            </div>
            <h2 className="text-xl font-semibold tracking-tight">
              The {item.label} module is on the roadmap
            </h2>
            <p className="text-sm text-muted-foreground">
              The platform foundation — authentication, role-based access, the data model and this
              navigation — is in place. {item.label} will be built on top of it next.
            </p>
          </div>

          <ul className="mx-auto grid max-w-md gap-2 text-left text-sm">
            {["Secure, role-scoped access already enforced", "Multi-school aware data model", "Consistent design system & analytics"].map(
              (line) => (
                <li key={line} className="flex items-center gap-2 text-muted-foreground">
                  <Check className="size-4 text-success" /> {line}
                </li>
              ),
            )}
          </ul>

          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft /> Back to dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
