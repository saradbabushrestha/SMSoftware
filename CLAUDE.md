@AGENTS.md

# Scholaris — School Management System

Single full-stack **Next.js 16** app (App Router, Server Actions) · React 19 · TypeScript ·
Tailwind v4 · **Prisma 6** + PostgreSQL. No separate backend service.

## Conventions

- **DB:** local Docker Postgres on host port **5437** (see `docker-compose.yml`),
  database `school_management`. `npm run db:up` to start. Prisma client is a
  singleton in [src/lib/db.ts](src/lib/db.ts). Every tenant table has
  `createdAt`/`updatedAt` and a soft-delete `deletedAt`; foreign keys are indexed.
- **Multi-tenant:** most rows carry `schoolId`. `SUPER_ADMIN` has `schoolId = null`
  and spans all schools; scope queries with `user.schoolId` for everyone else.
- **Auth:** access JWT (jose, HS256) + rotating opaque refresh token, both
  `httpOnly` cookies. Edge gate is [src/proxy.ts](src/proxy.ts) (Next 16 renamed
  `middleware` → `proxy`). Refresh route: [src/app/api/auth/refresh/route.ts](src/app/api/auth/refresh/route.ts).
- **RBAC:** the permission matrix in [src/lib/rbac/permissions.ts](src/lib/rbac/permissions.ts)
  is the single source of truth. Enforce in server code with `requireUser()` /
  `requirePermission()` ([src/lib/rbac/authorize.ts](src/lib/rbac/authorize.ts)).
  Add new sidebar entries (permission-gated) in [src/lib/rbac/navigation.ts](src/lib/rbac/navigation.ts).
- **Session type:** import `SessionUser` from [src/lib/auth/types.ts](src/lib/auth/types.ts)
  (client-safe) — NOT from `session.ts`, which is `server-only`.
- **Styling:** semantic tokens defined in [src/app/globals.css](src/app/globals.css).
  Use canonical utilities (`text-warning`, `bg-success/12`) — they are mapped via
  `@theme`. Dark mode is class-based (`next-themes`). Charts use `var(--chart-N)`.
- **New modules:** anything under `/dashboard/<slug>` without a dedicated page is
  caught by [src/app/(dashboard)/dashboard/[module]/page.tsx](<src/app/(dashboard)/dashboard/[module]/page.tsx>),
  which shows a permission-gated "in progress" placeholder. Build real modules as
  dedicated route folders.

## Verify

- `npm run build` type-checks the whole app.
- `node --env-file=.env --import tsx scripts/smoke.ts` runs auth + RBAC sanity checks.
