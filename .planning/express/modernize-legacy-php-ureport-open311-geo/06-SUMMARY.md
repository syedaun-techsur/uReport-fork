---
phase: wave-3-backend
plan: "06"
subsystem: auth-rbac
tags: [rbac, casl, guards, middleware, interceptor, pii-masking]
dependency_graph:
  requires: ["04 (SessionService, AuthModule)", "01 (prisma schema, @casl/ability)"]
  provides: ["AbilityFactory", "CaslGuard", "AuthGuard", "CheckAbilities", "AuthMiddleware", "PiiMaskInterceptor"]
  affects: ["AppModule", "AuthModule", "all Wave 3/4 feature modules"]
tech_stack:
  added: ["@casl/ability (already in package.json)"]
  patterns: ["CASL MongoAbility", "NestJS CanActivate guards", "NestJS NestMiddleware", "NestJS NestInterceptor", "Global module pattern"]
key_files:
  created:
    - src/modules/auth/ability.factory.ts
    - src/common/guards/casl.guard.ts
    - src/common/guards/auth.guard.ts
    - src/common/decorators/check-abilities.decorator.ts
    - src/common/middleware/auth.middleware.ts
    - src/common/interceptors/pii-mask.interceptor.ts
  modified:
    - src/modules/auth/auth.module.ts
    - src/app.module.ts
decisions:
  - "AuthModule decorated @Global() so AbilityFactory is injectable in all feature modules without repeated imports"
  - "CaslGuard and AuthGuard NOT registered as APP_GUARD — routes opt-in via @UseGuards() per TechArch §5.7"
  - "PiiMaskInterceptor NOT registered as APP_INTERCEPTOR — routes opt-in via @UseInterceptors()"
  - "TSC errors in pre-existing categories/ and people/ DTOs are out-of-scope and deferred"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-23"
  tasks_completed: 2
  files_created: 6
  files_modified: 2
---

# Phase wave-3-backend Plan 06: RBAC Layer Summary

**One-liner:** Three-tier CASL RBAC (anonymous/public/staff) with AbilityFactory, CaslGuard, AuthGuard, AuthMiddleware req.user population, and PiiMaskInterceptor for Ticket/TicketHistory PII masking.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | AbilityFactory, CaslGuard, AuthGuard, CheckAbilities decorator | 494b55e | src/modules/auth/ability.factory.ts, src/common/guards/casl.guard.ts, src/common/guards/auth.guard.ts, src/common/decorators/check-abilities.decorator.ts |
| 2 | AuthMiddleware, PiiMaskInterceptor, wire into AppModule | 5eda435 | src/common/middleware/auth.middleware.ts, src/common/interceptors/pii-mask.interceptor.ts, src/modules/auth/auth.module.ts, src/app.module.ts |

## What Was Built

### AbilityFactory (`src/modules/auth/ability.factory.ts`)
Three-tier role hierarchy per FRD §F02.6:
- **Anonymous** (user = null): read Category (displayPermissionLevel='anonymous'), read/create Ticket at anonymous level, read Token/ContactMethod/Department
- **Public** (role = null, authenticated): extends anonymous + Category/Ticket at 'public' level, manage own Bookmark (person_id=user.id), read/update own Person, read Session
- **Staff** (role = 'staff'): `can('manage', 'all')` — full access

### CaslGuard (`src/common/guards/casl.guard.ts`)
- Pass-through when no `@CheckAbilities()` decorator present (no-op, routes without explicit CASL)
- Uses `Reflector.getAllAndOverride()` for handler+class metadata
- Throws `ForbiddenException` when any required ability check fails

### AuthGuard (`src/common/guards/auth.guard.ts`)
- Throws `401 UnauthorizedException` when `req.user` is null
- Distinct from CaslGuard; applied on routes requiring any authenticated user

### CheckAbilities Decorator (`src/common/decorators/check-abilities.decorator.ts`)
- `SetMetadata(CHECK_ABILITIES, requirements)` pattern per TechArch §5.7
- AND semantics — all requirements must be satisfied

### AuthMiddleware (`src/common/middleware/auth.middleware.ts`)
- Reads `session.userId` via `SessionService.getUser()`
- Loads full `people` record from Prisma; sets `req.user = record` or `null`
- Destroys stale sessions when people record not found
- Augments `Express.Request` with `user` type declaration

### PiiMaskInterceptor (`src/common/interceptors/pii-mask.interceptor.ts`)
- No-op for staff (`req.user?.role === 'staff'`)
- Nulls `reportedByPerson_id`, `enteredByPerson_id`, `assignedPerson_id` on Ticket objects for anonymous/public
- Preserves `reportedByPerson_id` for ticket owner (currentUserId === reportedByPerson_id) per FRD §F02.3
- Nulls `enteredByPerson_id` and `actionPerson_id` on TicketHistory objects for non-staff
- Recursive: processes nested arrays and objects

### AppModule Wiring
- `AuthMiddleware` registered globally: `FormatMiddleware → GelfRequestMiddleware → AuthMiddleware`
- `CaslGuard`, `AuthGuard`, `PiiMaskInterceptor` registered as injectable providers
- `AuthModule` marked `@Global()` with `AbilityFactory` in exports

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files Exist
- [x] src/modules/auth/ability.factory.ts ✓
- [x] src/common/guards/casl.guard.ts ✓
- [x] src/common/guards/auth.guard.ts ✓
- [x] src/common/decorators/check-abilities.decorator.ts ✓
- [x] src/common/middleware/auth.middleware.ts ✓
- [x] src/common/interceptors/pii-mask.interceptor.ts ✓
- [x] src/modules/auth/auth.module.ts (modified) ✓
- [x] src/app.module.ts (modified) ✓

### Commits Exist
- [x] 494b55e — Task 1 ✓
- [x] 5eda435 — Task 2 ✓

### TypeScript
- Zero errors in plan files (pre-existing errors in out-of-scope categories/people DTOs excluded)

## Self-Check: PASSED
