import { Wallet, CircleDollarSign, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
import type { SessionUser } from "@/lib/auth/types";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Panel, SampleTag } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendAreaChart, BarSeriesChart } from "@/components/dashboard/charts";

const REVENUE = [
  { label: "Jan", value: 3.2 },
  { label: "Feb", value: 3.6 },
  { label: "Mar", value: 4.1 },
  { label: "Apr", value: 3.9 },
  { label: "May", value: 4.5 },
  { label: "Jun", value: 4.8 },
];

const CATEGORIES = [
  { label: "Tuition", collected: 320, pending: 40 },
  { label: "Transport", collected: 90, pending: 18 },
  { label: "Hostel", collected: 60, pending: 22 },
  { label: "Exam", collected: 45, pending: 8 },
  { label: "Library", collected: 18, pending: 3 },
];

const PAYMENTS = [
  { name: "Aarav Sharma", amount: "₨ 24,000", method: "eSewa", status: "success" as const },
  { name: "Sita Karki", amount: "₨ 18,500", method: "Khalti", status: "success" as const },
  { name: "Bina Thapa", amount: "₨ 30,000", method: "Bank", status: "pending" as const },
  { name: "Ram Gurung", amount: "₨ 12,000", method: "Cash", status: "success" as const },
];

export function AccountantDashboard({ user }: { user: SessionUser }) {
  return (
    <>
      <PageHeader
        title={`Hello, ${user.firstName}`}
        description="Finance overview · demo data shown for preview"
        actions={
          <Button>
            <CircleDollarSign /> New invoice
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue (term)" value="₨ 4.82M" icon={Wallet} delta={6.1} accent="success" />
        <StatCard label="Collected today" value="₨ 184K" icon={CircleDollarSign} delta={3.4} accent="info" />
        <StatCard label="Outstanding" value="₨ 612K" icon={TrendingUp} delta={-2.1} accent="warning" />
        <StatCard label="Defaulters" value={37} icon={AlertTriangle} accent="destructive" hint="over 30 days" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Revenue trend" description="Millions (₨) collected per month" className="lg:col-span-2" action={<SampleTag />}>
          <TrendAreaChart data={REVENUE} color="var(--chart-2)" />
        </Panel>
        <Panel title="Fee categories" description="Collected vs pending (₨ '000)" action={<SampleTag />}>
          <BarSeriesChart
            data={CATEGORIES}
            series={[
              { key: "collected", name: "Collected", color: "var(--chart-2)" },
              { key: "pending", name: "Pending", color: "var(--chart-3)" },
            ]}
            height={220}
          />
        </Panel>
      </div>

      <div className="mt-4">
        <Panel
          title="Recent payments"
          action={
            <Button asChild variant="ghost" size="sm">
              <span className="inline-flex items-center gap-1">
                View ledger <ArrowRight />
              </span>
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 font-medium">Student / Guardian</th>
                  <th className="pb-2 font-medium">Method</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                  <th className="pb-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {PAYMENTS.map((p, i) => (
                  <tr key={i}>
                    <td className="py-2.5 font-medium">{p.name}</td>
                    <td className="py-2.5 text-muted-foreground">{p.method}</td>
                    <td className="py-2.5 text-right font-medium">{p.amount}</td>
                    <td className="py-2.5 text-right">
                      <Badge variant={p.status === "success" ? "success" : "warning"}>{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
