---
phase: wave-3-backend
plan: "06"
subsystem: rbac
tags: [casl, rbac, authorization, pii-masking, middleware, guards]
dependency_graph:
  requires: [plan-04, plan-01]
  provides: [AbilityFactory, CaslGuard, AuthGuard, CheckAbilities, AuthMiddleware, PiiMaskInterceptor]
  affects: [app.module.ts, auth.module.ts]
tech_stack:
  added: ["@casl/ability (already installed at ^6.0.0)"]
  patterns: [CASL MongoAbility, NestJS guards, NestJS middleware, NestJS interceptors, global module]
key_files:
  created:
    - src/modules/auth/ability.factory.ts
    - src/common/guards/casl.guard.ts
    - src/common/guards/auth.guard.ts
    - src/common/decorators/check-abilities.decorator.ts
    - src/common/middleware/auth.middleware.ts
    - src/common/interceptors/pii-mask.interceptor.ts
  modified:
    - src/app.module.ts
    - src/modules/auth/auth.module.ts
    - src/@types/express/index.d.ts
decisions:
  - "Express.Request.user augmentation placed in @types/express/index.d.ts (not in middleware) to avoid duplicate global declaration issues with strict TS"
  - "AuthModule made @Global() so AbilityFactory injectable in any feature module without explicit import"
  - "CaslGuard/AuthGuard/PiiMaskInterceptor registered as AppModule providers (not APP_GUARD/APP_INTERCEPTOR) to preserve opt-in route semantics"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-23"
  tasks_completed: 2
  files_changed: 9
---

# Phase wave-3-backend Plan 06: RBAC Layer Summary

**One-liner:** CASL three-tier RBAC (anonymous/public/staff) with AbilityFactory, CaslGuard, AuthGuard, global AuthMiddleware session hydration, and PiiMaskInterceptor for Ticket/TicketHistory PII stripping per FRD §F02.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | AbilityFactory, CaslGuard, AuthGuard, CheckAbilities decorator | 7524ed5 | ability.factory.ts, casl.guard.ts, auth.guard.ts, check-abilities.decorator.ts |
| 2 | AuthMiddleware, PiiMaskInterceptor, wire into AppModule | d8ff510 | auth.middleware.ts, pii-mask.interceptor.ts, app.module.ts, auth.module.ts |

## What Was Built

### AbilityFactory (`src/modules/auth/ability.factory.ts`)
Three-tier role hierarchy per FRD §F02.6:
- **Anonymous** (user=null): read Category where displayPermissionLevel='anonymous', read/create Ticket per category permission, read Token/ContactMethod/Department
- **Public** (user.role=null): extends anonymous with 'public' level Category/Ticket rules, manage own Bookmark (person_id match), read/update own Person
- **Staff** (user.role='staff'): `can('manage', 'all')` — full access

### CaslGuard (`src/common/guards/casl.guard.ts`)
CanActivate guard that reads `@CheckAbilities()` metadata. No-op when decorator absent (preserves backward compatibility). Throws `ForbiddenException` when any required ability check fails. Injects `AbilityFactory` and `Reflector`.

### AuthGuard (`src/common/guards/auth.guard.ts`)
Simple guard throwing `401 UnauthorizedException` when `req.user` is null. Used on routes requiring any authenticated user (public or staff).

### CheckAbilities decorator (`src/common/decorators/check-abilities.decorator.ts`)
`@CheckAbilities(...RequiredAbility[])` using `SetMetadata(CHECK_ABILITIES, requirements)`. AND semantics: all listed abilities must pass.

### AuthMiddleware (`src/common/middleware/auth.middleware.ts`)
Global middleware (runs after express-session, before guards):
1. Reads `session.userId` via `SessionService.getUser()`
2. Anonymous → `req.user = null`
3. Authenticated → Prisma `people.findUnique({ where: { id: session.userId } })`
4. Stale session (person deleted) → destroy session, `req.user = null`
5. Valid person → `req.user = person`

### PiiMaskInterceptor (`src/common/interceptors/pii-mask.interceptor.ts`)
Strips PII from responses for non-staff callers per FRD §F02.8:
- **Staff**: no-op
- **Ticket objects** (has `category_id` + `enteredDate`/`status`): nulls `reportedByPerson_id` (except own-ticket), `enteredByPerson_id`, `assignedPerson_id`
- **TicketHistory objects** (has `action_id` + `ticket_id`): nulls `enteredByPerson_id`, `actionPerson_id`
- Recursive: processes nested arrays/objects

### AppModule + AuthModule wiring
- `AuthModule` → `@Global()`, exports `SessionService` + `AbilityFactory`
- `AppModule.configure()`: `FormatMiddleware → GelfRequestMiddleware → AuthMiddleware` on all routes
- `AppModule.providers`: `CaslGuard`, `AuthGuard`, `PiiMaskInterceptor` as regular providers

## Deviations from Plan

### Auto-fixed: Express.Request.user augmentation placement
- **Found during:** Task 2
- **Issue:** Plan specified putting the `declare global { namespace Express { interface Request { user }}}` augmentation inside `auth.middleware.ts`. This risks a duplicate global declaration error with TypeScript strict mode when multiple files are compiled together.
- **Fix:** Placed the augmentation in the existing `src/@types/express/index.d.ts` ambient declaration file (the correct TypeScript pattern), which already held the express-session augmentation.
- **Files modified:** `src/@types/express/index.d.ts`
- **Commit:** d8ff510

## Verification Results

All checks from plan verification suite passed:
- `npx tsc --noEmit` → 0 new errors (3 pre-existing errors in people/categories DTOs from earlier waves)
- All contract grep checks: ✅
- All PII field checks: ✅
- CASL package: ✅ (was already installed at ^6.0.0)
- Middleware order in AppModule: ✅ `FormatMiddleware, GelfRequestMiddleware, AuthMiddleware`
- `@Global()` on AuthModule: ✅
- AbilityFactory in AuthModule exports: ✅

## Self-Check

### Files exist
- `src/modules/auth/ability.factory.ts` ✅
- `src/common/guards/casl.guard.ts` ✅
- `src/common/guards/auth.guard.ts` ✅
- `src/common/decorators/check-abilities.decorator.ts` ✅
- `src/common/middleware/auth.middleware.ts` ✅
- `src/common/interceptors/pii-mask.interceptor.ts` ✅
- `src/modules/auth/auth.module.ts` (modified) ✅
- `src/app.module.ts` (modified) ✅
- `src/@types/express/index.d.ts` (modified) ✅

### Commits exist
- 7524ed5: Task 1 ✅
- d8ff510: Task 2 ✅

## Self-Check: PASSED
