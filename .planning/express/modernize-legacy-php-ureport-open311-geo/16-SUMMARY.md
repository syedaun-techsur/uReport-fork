---
phase: wave-6-integration
plan: 16
subsystem: bookmarks
tags: [bookmarks, f12, crud, authentication, prisma, nestjs]
dependency_graph:
  requires: [plan-01-prisma-schema, plan-03-serialization, plan-04-auth-middleware, plan-13-notifications]
  provides: [BookmarksModule, BookmarksController, BookmarksService, BookmarksRepository]
  affects: [src/app.module.ts]
tech_stack:
  added: []
  patterns: [repository-pattern, service-layer, dto-validation, ownership-404-rule]
key_files:
  created:
    - src/modules/bookmarks/bookmarks.module.ts
    - src/modules/bookmarks/bookmarks.controller.ts
    - src/modules/bookmarks/bookmarks.service.ts
    - src/modules/bookmarks/bookmarks.repository.ts
    - src/modules/bookmarks/dto/create-bookmark.dto.ts
  modified:
    - src/app.module.ts
decisions:
  - "404-not-403 for ownership enforcement: returning ForbiddenException would leak info about bookmark existence; NotFoundException used in all cases (SM-12.3 NaC)"
  - "type='digest' supported in CreateBookmarkDto: required by DigestCron in NotificationsModule (plan 13) to create email digest subscriptions"
  - "id DESC ordering in findAllForPerson: SM-12.2 NaC requires newest-first ordering"
  - "requireAuthenticated() helper pattern: mirrors MediaController convention; throws 401 for anonymous callers on all three routes"
metrics:
  duration: "~5 minutes"
  completed: "2026-06-23"
  tasks_completed: 2
  files_created: 5
  files_modified: 1
---

# Phase wave-6-integration Plan 16: BookmarksModule Summary

**One-liner:** Authenticated CRUD for named search bookmarks (F12) using owner-scoped 404 rule, type='digest' support, and id DESC ordering via Prisma repository pattern.

## Files Created/Modified

### Created

| File | Purpose |
|------|---------|
| `src/modules/bookmarks/dto/create-bookmark.dto.ts` | Validates `requestUri` (required, max 1024), `name` (optional, max 128), `type` (optional: 'search'\|'digest') |
| `src/modules/bookmarks/bookmarks.repository.ts` | Prisma wrapper: `create`, `findAllForPerson(personId, id DESC)`, `findOne(id)`, `delete(id)` |
| `src/modules/bookmarks/bookmarks.service.ts` | Business logic: `create()`, `findAllForUser()`, `deleteOwned()` with 404 ownership rule |
| `src/modules/bookmarks/bookmarks.controller.ts` | 3 routes: `POST /bookmarks` (201), `GET /bookmarks` (200), `DELETE /bookmarks/:id` (204) |
| `src/modules/bookmarks/bookmarks.module.ts` | NestJS module: imports PrismaModule, provides controller/service/repository |

### Modified

| File | Change |
|------|--------|
| `src/app.module.ts` | Added `BookmarksModule` import and registration in `@Module({ imports: [...] })` |

## Key Decisions

### 1. 404-not-403 Ownership Enforcement (SM-12.3 NaC)
`BookmarksService.deleteOwned()` throws `NotFoundException` (HTTP 404) in both cases:
- Bookmark does not exist
- Bookmark exists but belongs to a different user

Rationale: Returning `ForbiddenException` (403) would confirm the bookmark exists and belongs to another user — an information leak. The plan spec explicitly requires 404 for both cases ("no info leakage per SM-12.3 NaC"). `ForbiddenException` is **not** used anywhere in the bookmarks service.

### 2. type='digest' Support
`CreateBookmarkDto` accepts `type?: 'search' | 'digest'`. The `'digest'` type is consumed by `DigestCron` in `NotificationsModule` (plan 13) to identify email digest subscription rows. Service defaults `type` to `'search'` when not supplied.

### 3. id DESC Ordering
`BookmarksRepository.findAllForPerson()` uses `orderBy: { id: 'desc' }` per SM-12.2 NaC: "GET /bookmarks returns only caller's bookmarks ordered id DESC".

### 4. requireAuthenticated() Pattern
All three controller routes invoke a `requireAuthenticated(req)` helper (mirrors MediaController convention from wave 5) that throws `UnauthorizedException` (HTTP 401) if `req.user` is absent or has no `id`. Authentication is handled at the controller level — the service layer assumes a valid `personId` is passed.

## Integration Contracts Fulfilled

| Contract | Status |
|----------|--------|
| `prisma/schema.prisma` — `model bookmarks` with `person_id`, `requestUri`, `type` | ✅ Used exact Prisma column names |
| `AuthMiddleware` (plan 04) — `req.user.id` set for authenticated callers | ✅ `requireAuthenticated(req)` reads `req.user.id` |
| `SerializationInterceptor` (plan 03) — global format negotiation | ✅ No per-controller format logic; interceptor handles JSON/XML/CSV/TXT/HTML for GET /bookmarks |
| `bookmarks.type` VARCHAR (plan 13 DigestCron) | ✅ `@IsIn(['search', 'digest'])` accepts both values |
| `BookmarksModule` → `AppModule` | ✅ Imported and registered |

## Commits

| Hash | Task | Description |
|------|------|-------------|
| `ed357d2` | Task 1 | feat(wave-6-integration-16): BookmarksRepository + BookmarksService + CreateBookmarkDto |
| `a6b30af` | Task 2 | feat(wave-6-integration-16): BookmarksController + BookmarksModule + wire into AppModule |

## Deviations from Plan

None — plan executed exactly as written. All code matches the specification verbatim.

## Self-Check

### Files Exist
- [x] `src/modules/bookmarks/bookmarks.module.ts` — FOUND
- [x] `src/modules/bookmarks/bookmarks.controller.ts` — FOUND
- [x] `src/modules/bookmarks/bookmarks.service.ts` — FOUND
- [x] `src/modules/bookmarks/bookmarks.repository.ts` — FOUND
- [x] `src/modules/bookmarks/dto/create-bookmark.dto.ts` — FOUND
- [x] `src/app.module.ts` updated with BookmarksModule — FOUND

### Commits Exist
- [x] `ed357d2` — FOUND
- [x] `a6b30af` — FOUND

### TypeScript Compilation
- [x] Zero `error TS` errors (0 count from `npx tsc --noEmit`)

## Self-Check: PASSED
