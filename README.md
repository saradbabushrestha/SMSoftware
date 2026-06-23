# Scholaris — School Management System

An enterprise-grade School Management System (SMS) for schools, colleges and
educational institutions. Built as a single full-stack **Next.js** application
with **PostgreSQL** + **Prisma**, role-based access control for 8 user types,
JWT sessions with rotating refresh tokens, and a premium light/dark design system.

> **Status — feature complete.** Foundation (auth, RBAC, multi-tenant data model,
> design system, role-aware dashboards) **plus twenty-four real modules —
> Students, Teachers, Classes & Sections, Guardians, Subjects, Attendance,
> Exams & Grades, Fees & Payments, Library, Users, Audit Logs, Events,
> Assignments, Transport, Hostel, Timetable, Schools, Analytics, Reports,
> Payroll, Accounting, Settings, Announcements, and Messages**. Every sidebar
> destination is a real module; the generic "module in progress" page only ever
> appears for ad-hoc `/dashboard/<slug>` routes that don't yet have a dedicated
> folder.

## Built modules

Each module is a full vertical slice (data layer → server actions → UI) and a
template for the next. Every mutation is permission-checked, audit-logged and
revalidated; lists are tenant-scoped, searchable, filterable and paginated.

**Students** (`/dashboard/students`)
- List with search + status/class filters; profile with enrollment history and
  linked guardians; create/edit forms (auto admission numbers, class/section
  enrollment for the active year); soft-delete; status transitions.

**Teachers** (`/dashboard/teachers`)
- List with search + status/subject filters; profile with subjects taught and
  classes led; create/edit forms (auto employee IDs, subject assignment,
  super-admin school picker); soft-delete; activate/suspend.

**Classes & Sections** (`/dashboard/classes`)
- List with search and section/student/capacity counts; class profile with an
  inline **sections manager** (add/edit/delete sections in a modal, assign a
  class teacher); create/edit class forms (unique code per school); soft-delete
  cascades to sections while preserving enrollment history.

**Guardians** (`/dashboard/guardians`)
- List with search + status filter and children counts; guardian profile with a
  **students linker** (link/edit/unlink children, set relationship, enforce a
  single primary guardian per student); create/edit forms; soft-delete.

**Subjects** (`/dashboard/subjects`)
- List with search + class filter and teacher counts; subject profile with its
  class and teaching staff; create/edit forms (class link or school-wide,
  credits, teacher assignment); unique code per school; soft-delete.

**Attendance** (`/dashboard/attendance`)
- Daily marking: pick a section + date, mark each student Present/Absent/Late/
  Leave (bulk "mark all present"), one record per student per day (upsert).
- Role-aware: admins & teachers mark; principals view the roster read-only;
  **students and parents see only their own / their children's** attendance with
  a percentage and recent history.

**Exams & Grades** (`/dashboard/exams`, `/dashboard/grades`)
- Exam CRUD (type, class, max marks, date) + a **schedule list** everyone can see.
- Per-subject **grade entry** with a live letter-grade/GPA preview (4.0 scale),
  and a **publish** toggle that gates student/parent visibility.
- Grades view is role-aware: staff browse per-exam result matrices; **students
  and parents see only their own / their children's** published results + GPA.

**Fees & Payments** (`/dashboard/fees`, `/dashboard/payments`)
- Invoices (category, amount, due date) with billed/collected/outstanding/overdue
  stats; status auto-derives (Pending → Partial → Paid) from recorded payments.
- **Real Nepal gateway integration** behind a single **`PaymentGatewayInterface`**
  (`pay` / `initiate` / `inquiry` / `isSuccess` / `requestedAmount`) with
  interchangeable classes — **eSewa (ePay v2)**, **Khalti (KPG-2)** and **Fonepay**
  — resolved by a `getGateway()` factory. **Parents pay online** via the genuine
  redirect→verify flow: initiate creates a `PaymentTransaction`, the browser is
  handed to the gateway (eSewa/Fonepay via a signed self-submitting form, Khalti via
  its hosted checkout), and the **server verifies** on callback (eSewa status API /
  Khalti `lookup` / Fonepay `verificationMerchant`) before recording the `Payment`.
  HMAC signing (SHA-256 for eSewa, SHA-512 for Fonepay), **idempotent completion**
  (a replayed callback can't double-charge), and sandbox-by-default credentials
  overridable to production via env. Accountants/admins still record manual payments
  (cash/bank) directly. No international gateways. Students & parents see only their
  own; a ledger lists all.
- Every payment has a **printable receipt** (`/api/payments/<id>/receipt`) —
  a standalone, access-controlled, print/save-as-PDF document linked from the
  invoice. Abandoned checkouts are swept by a scheduled job
  ([`scripts/expire-transactions.ts`](scripts/expire-transactions.ts)) that marks
  PENDING transactions older than N minutes as FAILED.

**Library** (`/dashboard/library`)
- Book catalog with search + category filter and availability (available/total);
  **issue** a copy to a student/teacher and **return** it, with live copy-count
  updates and **overdue fines** (₨/day). Librarians & admins manage; **students
  browse and see their own borrowed books** with due dates and fines.

**Users** (`/dashboard/users`)
- Account & role administration: list/filter all accounts, **create staff/admin
  users** (temp password), edit, **reset password** (revokes sessions),
  suspend/activate, and deactivate. Role changes are super-admin-only; you can't
  lock yourself out; student/teacher/guardian accounts are managed in their own
  modules. Super/school admins manage; principals view.

**Audit Logs** (`/dashboard/audit`)
- Read-only security & activity trail written by **every module** (logins,
  creates/updates/deletes, payments, grade publishes, …). Search + date-range
  filters, colour-coded actions, and a detail view with actor, IP, user agent
  and metadata. Super/school admins and principals can view (school-scoped).

**Events** (`/dashboard/events`)
- School events (sports, competitions, workshops, meetings, …) with type & when
  filters and upcoming/past status. Admins/principals manage; **everyone can
  self-register** (capacity + registration-open enforced), cancel their spot, and
  managers see the attendee list.

**Assignments** (`/dashboard/assignments`)
- Teachers create assignments for a class section (subject, due date, points) and
  **grade text submissions** with feedback; **students submit/resubmit** until
  graded and see their grade + feedback. Role-aware lists (teacher roster +
  submission counts vs student status: pending/submitted/graded/missing).

**Transport** (`/dashboard/transport`)
- Bus routes with vehicle/driver details, capacity and monthly fare (₨); a route
  profile **assigns students** (one route per student, capacity enforced) with
  pickup stops, and removes them. Admin-only operations module.

**Hostel** (`/dashboard/hostel`)
- Hostel rooms (block, number, boys/girls/mixed, beds, warden) with rooms/beds/
  occupied stats; a room profile **assigns students** (one room per student,
  capacity enforced) with bed numbers, and removes them. Admin-only.

**Timetable** (`/dashboard/timetable`)
- Weekly class schedule grid (Sun–Fri) per section. Admins add/edit/delete
  periods (subject, teacher, time, room) with **conflict detection** — a section
  or a teacher can't be double-booked at overlapping times. Staff pick a section;
  **students & parents see their own / their child's** timetable read-only.

**Schools** (`/dashboard/schools`)
- Super-admin **multi-tenancy**: list/search all schools with per-school stats
  (students, teachers, guardians, classes, accounts), create/edit, activate/
  deactivate and archive. Super admins manage the whole platform; a school admin
  can view only their own school (no create).

**Analytics** (`/dashboard/analytics`)
- Live BI over the platform's real data: headline KPIs (students, teachers,
  avg attendance %, fee-collection %), enrollment-by-class, attendance and gender
  donuts, collected-vs-outstanding, and **at-risk student detection** (attendance
  below 80%). Visible to admins, principals and accountants.

**Reports** (`/dashboard/reports`)
- One-click **CSV exports** (students, teachers, attendance summary, invoices,
  payments, exam results) served by a Node route handler with attachment headers.
  Each report card and download is gated by the relevant data permission (e.g.
  a teacher can export students but not payments); bulk exports are staff-only.
- **Approval workflow** (`/dashboard/reports/submissions`) — staff submit reports
  (title, category, period, summary) that **principals approve or reject** with a
  note (`report:approve`). Status is `Pending → Approved/Rejected`; the reports
  page surfaces a live "pending" count for approvers.

**Payroll** (`/dashboard/payroll`)
- Staff payslips: pick a teacher + month, enter basic salary, allowances,
  deductions and tax with a **live net-pay preview**; one payslip per teacher per
  month (DB-enforced). Draft payslips can be edited; **mark-paid** stamps the
  payout and locks the record. List shows payslip count, total payout and paid-out
  totals. Accountants & super admins only.

**Accounting** (`/dashboard/accounting`)
- A simple **income/expense ledger** with a running **profit & loss** summary
  (income, expenses, net) that respects the active type + date-range filter.
  Add/edit/soft-delete entries with type-aware category suggestions. School-scoped
  and recorder-attributed. Accountants & super admins only.

**Settings** (`/dashboard/settings`)
- Each school admin edits **their own school's** configuration (name, contact,
  address, branding) via the same validated form used by the Schools module.
  Super admins (who span all schools) are routed to the Schools module to pick a
  tenant first.

**Announcements** (`/dashboard/announcements`)
- A school **notice board** with **audience targeting** (Everyone / Staff /
  Students / Parents), pinning and optional expiry. Admins & principals post and
  manage; **everyone sees only the notices addressed to them** — enforced both in
  the list *and* on the single-record fetch, so a student can't open a staff-only
  notice by URL. Pinned notices sort to the top.

**Messages** (`/dashboard/messages`)
- Private **1-to-1 internal messaging** with an **Inbox / Sent** toggle, compose,
  reply (`Re:` prefill) and read receipts (a message is marked read when its
  recipient opens it). A **live unread badge** on the sidebar Messages item (the
  count is fetched in the dashboard layout). **Per-side soft delete** — removing a
  message from your box leaves the other participant's copy intact. Only the two
  participants can open a message; recipients are limited to active users in the
  same school. Available to every role.

**Teacher evaluations** (on each teacher's profile)
- Confidential **performance reviews** scored across four dimensions (teaching,
  classroom management, collaboration, punctuality) on a 1–5 scale, with an
  auto-computed overall and optional comments. Gated on `teacher:evaluate`, so the
  evaluations panel and pages are visible **only to admins & principals** — other
  roles with `teacher:view` (e.g. librarians) see the profile but not the reviews.

**Subscriptions** (on each school in the Schools module)
- **Super-admin** tenancy/billing: each school carries a subscription (plan tier
  — Trial / Starter / Pro / Enterprise — status, monthly price, renewal date and a
  **seat limit** with live usage vs. active accounts). The schools list shows a
  Plan column and the school detail page a subscription panel; both are gated on
  `subscription:manage`, so non-super roles never see billing data.

## Tech stack

| Layer       | Choice                                                            |
| ----------- | ----------------------------------------------------------------- |
| Framework   | Next.js 16 (App Router, Server Actions) · React 19 · TypeScript   |
| Styling     | Tailwind CSS v4 · shadcn-style component library · `tw-animate-css` |
| Data        | PostgreSQL 16 · Prisma 6 ORM                                       |
| Auth        | JWT (jose) in httpOnly cookies · rotating refresh tokens · bcrypt |
| Charts      | Recharts · theme-aware                                             |
| State / UI  | Zustand · next-themes (dark mode) · Radix primitives · lucide-react |
| Infra (dev) | Docker Compose (Postgres on `5437`, Redis on `6381`)              |

## Roles & access

Eight roles, each with a tailored dashboard and a permission set enforced both at
the route level (server) and in the navigation: **Super Admin, School Admin,
Principal, Teacher, Student, Parent/Guardian, Accountant, Librarian**. The
permission matrix lives in [`src/lib/rbac/permissions.ts`](src/lib/rbac/permissions.ts).

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres + Redis (Docker)
npm run db:up

# 3. Apply the schema and generate the client
npm run db:migrate      # or: npm run db:push for a quick sync

# 4. Seed demo data (8 role accounts + sample school)
npm run db:seed

# 5. Run the app
npm run dev             # http://localhost:3000
```

### Demo accounts

All demo accounts share the password **`Password123!`**:

| Role         | Email                       |
| ------------ | --------------------------- |
| Super Admin  | `superadmin@scholaris.app`  |
| School Admin | `admin@greenwood.edu`       |
| Principal    | `principal@greenwood.edu`   |
| Teacher      | `teacher@greenwood.edu`     |
| Student      | `student@greenwood.edu`     |
| Parent       | `parent@greenwood.edu`      |
| Accountant   | `accountant@greenwood.edu`  |
| Librarian    | `librarian@greenwood.edu`   |

The login screen lists these and lets you click any to auto-fill.

## Scripts

| Command              | Description                                  |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Start the dev server                         |
| `npm run build`      | Production build (type-checks the whole app) |
| `npm run db:up` / `db:down` | Start / stop the Docker database      |
| `npm run db:migrate` | Create & apply a Prisma migration            |
| `npm run db:seed`    | Seed demo data                               |
| `npm run db:studio`  | Open Prisma Studio                           |
| `npm run db:reset`   | Reset the database and re-run migrations     |

## Architecture

```
src/
├─ app/
│  ├─ (auth)/login/        # split-screen login (Server Action auth)
│  ├─ (dashboard)/         # authenticated area (layout guards every route)
│  │  └─ dashboard/        # role-routed landing + module pages
│  ├─ api/auth/refresh/    # refresh-token rotation route (Node runtime)
│  └─ layout.tsx           # theme provider, fonts
├─ components/
│  ├─ ui/                  # shadcn-style primitives (button, card, …)
│  └─ dashboard/           # shell, sidebar, topbar, charts, role views
├─ lib/
│  ├─ auth/                # password, jwt, session, server actions
│  ├─ rbac/                # permission matrix, navigation, authorize helpers
│  ├─ db.ts                # Prisma client singleton
│  └─ audit.ts             # audit-log writer
├─ proxy.ts                # edge route gate + silent refresh (Next 16 "proxy")
prisma/
├─ schema.prisma           # multi-tenant schema (soft deletes, indexes)
└─ seed.ts                 # demo data
```

### Auth flow

1. Login (Server Action) verifies the password (bcrypt), issues a short-lived
   **access JWT** + an opaque **refresh token** (stored hashed in the DB), both
   as `httpOnly` cookies.
2. `proxy.ts` verifies the access token on every request (edge). If it has
   expired but a refresh cookie exists, it redirects through
   `/api/auth/refresh`, which rotates the refresh token and mints a new access
   token — a transparent silent refresh.
3. Server components/actions read the session via `getCurrentUser()` and enforce
   permissions with `requireUser()` / `requirePermission()`.

### Security & resilience

- **Security headers** ([`next.config.ts`](next.config.ts)) on every response:
  a strict **Content-Security-Policy** (`default-src 'self'`; `frame-ancestors
  'none'`; `object-src 'none'`), **HSTS**, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, a locked-down `Permissions-Policy`, and
  `Referrer-Policy`. The framework banner (`X-Powered-By`) is removed. The CSP is
  automatically relaxed in dev (Turbopack HMR needs `'unsafe-eval'` + websockets)
  and tightened in production.
- **Error boundaries** — a styled root [`error.tsx`](src/app/error.tsx) and a
  dashboard-scoped one (keeps the shell), a dependency-free
  [`global-error.tsx`](src/app/global-error.tsx) for root-layout failures, and
  custom **404** pages (full-screen + in-shell).
- **Loading states** — a skeleton ([`(dashboard)/loading.tsx`](<src/app/(dashboard)/loading.tsx>))
  streams while server components fetch data.
- **Login brute-force protection** — repeated failed logins are throttled per
  email **and** per IP over a rolling 15-minute window (counted from the audit
  log, no extra infra); offenders get a clear "try again later" message.
- **Not indexed** — `robots: { index: false }` keeps this internal app out of
  search engines.

### Global search
- The top-bar search is a **permission-aware, school-scoped** global search across
  students, teachers, classes and invoices (debounced, grouped results). People &
  finance results are limited to staff — students/parents don't get a school-wide
  search.

## License

Private project — all rights reserved.
# SMSoftware
