import type { Metadata } from "next";
import { BarChart3, ShieldCheck, Users } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "Sign in" };

const HIGHLIGHTS = [
  { icon: Users, title: "Every role, one platform", body: "Admins, teachers, students, parents, accountants and librarians." },
  { icon: ShieldCheck, title: "Secure by design", body: "Role-based access control, audit trails and encrypted sessions." },
  { icon: BarChart3, title: "Insightful analytics", body: "Attendance, performance and revenue trends at a glance." },
];

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(60rem 40rem at 80% -10%, rgba(255,255,255,0.35), transparent), radial-gradient(40rem 30rem at -10% 110%, rgba(255,255,255,0.25), transparent)",
          }}
        />
        <div className="relative">
          <Logo className="[&_span:last-child]:text-primary-foreground" />
        </div>
        <div className="relative max-w-md space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight">
              The modern operating system for your institution.
            </h1>
            <p className="text-primary-foreground/80">
              Manage students, staff, academics and finance — beautifully, securely, and at scale.
            </p>
          </div>
          <ul className="space-y-5">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex gap-3">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-primary-foreground/15">
                  <h.icon className="size-4.5" />
                </span>
                <div>
                  <p className="font-medium">{h.title}</p>
                  <p className="text-sm text-primary-foreground/75">{h.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Scholaris. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-4 lg:justify-end">
          <Logo className="lg:hidden" size="sm" />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-10">
          <div className="w-full max-w-sm space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
              <p className="text-sm text-muted-foreground">
                Sign in to your Scholaris account to continue.
              </p>
            </div>
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
