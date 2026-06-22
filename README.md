# Scholaris — School Management System

An enterprise-grade School Management System (SMS) for schools, colleges and
educational institutions. Built as a single full-stack **Next.js** application
with **PostgreSQL** + **Prisma**, role-based access control for 8 user types,
JWT sessions with rotating refresh tokens, and a premium light/dark design system.

> **Status.** Foundation complete (auth, RBAC, multi-tenant data model, design
> system, role-aware dashboards) **plus the first real module — Students**
> (full CRUD: list with search/filter/pagination, profile detail, create/edit
> forms, soft-delete, status transitions, enrollment). The remaining modules
> (attendance, exams, fees, library, …) build on this foundation; each is
> reachable in the sidebar and currently shows a "module in progress" page.

## Students module

A complete vertical slice and the template for every future module:

- **List** (`/dashboard/students`) — searchable, filterable (status, class),
  paginated table with row actions, permission-gated "Add student".
- **Profile** (`/dashboard/students/[id]`) — personal details, enrollment
  history, linked guardians, inline status transitions.
- **Create / Edit** (`/dashboard/students/new`, `…/[id]/edit`) — validated
  (zod) forms; admission numbers auto-generate; class/section assignment creates
  the enrollment for the active academic year.
- **Delete** — soft-delete (archives the record, disables the account, preserves
  history). Every mutation is permission-checked, audit-logged and revalidated.

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

## License

Private project — all rights reserved.
# SMSoftware
