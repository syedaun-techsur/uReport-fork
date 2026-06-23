---
phase: wave-6-integration
plan: 16
subsystem: bookmarks
tags: [bookmarks, f12, authentication, crud, prisma]
dependency_graph:
  requires: [plan-01 (prisma schema bookmarks/people), plan-04 (AuthMiddleware), plan-03 (SerializationInterceptor)]
  provides: [BookmarksModule, BookmarksService, BookmarksRepository, BookmarksController]
  affects: [AppModule (imports BookmarksModule)]
tech_stack:
  added: []
  patterns: [NestJS module pattern, Prisma repository wrapper, requireAuthenticated helper, 404-not-403 ownership rule]
key_files:
  created:
    - src/modules/bookmarks/bookmarks.repository.ts
    - src/modules/bookmarks/bookmarks.service.ts
    - src/modules/bookmarks/bookmarks.controller.ts
    - src/modules/bookmarks/bookmarks.module.ts
    - src/modules/bookmarks/dto/create-bookmark.dto.ts
  modified:
    - src/app.module.ts
decisions:
  - "404-not-403 for ownership enforcement: deleteOwned returns NotFoundException when bookmark belongs to another user to prevent information leakage (SM-12.3 NaC)"
  - "Relation connect uses 'person' (not 'people') to match actual Prisma schema field name in bookmarks model"
  - "type='digest' accepted alongside type='search' to support DigestCron subscription rows (plan 13 NotificationsModule)"
  - "id DESC ordering enforced in repository layer (findAllForPerson) per SM-12.2 NaC"
metrics:
  duration: "~10 minutes"
  completed: "2026-06-23"
  tasks_completed: 2
  files_modified: 6
---

# Phase wave-6-integration Plan 16: BookmarksModule Summary

**One-liner:** Authenticated CRUD bookmarks module (POST/GET/DELETE) with 404-not-403 ownership enforcement and type='digest' support for DigestCron.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | BookmarksRepository + BookmarksService + CreateBookmarkDto | c525d10 |
| 2 | BookmarksController + BookmarksModule + wire into AppModule | d40480a |

## Files Created / Modified

### Created
- **`src/modules/bookmarks/dto/create-bookmark.dto.ts`** — Validates `requestUri` (required, max 1024), `name` (optional, max 128), `type` (optional, `'search'|'digest'`)
- **`src/modules/bookmarks/bookmarks.repository.ts`** — Prisma `bookmarks` table wrapper: `create`, `findAllForPerson` (id DESC), `findOne`, `delete`
- **`src/modules/bookmarks/bookmarks.service.ts`** — Business logic: `create(personId, dto)`, `findAllForUser(personId)`, `deleteOwned(id, personId)` with 404-not-403 ownership rule
- **`src/modules/bookmarks/bookmarks.controller.ts`** — Three authenticated routes: `POST /bookmarks` (201), `GET /bookmarks` (200), `DELETE /bookmarks/:id` (204)
- **`src/modules/bookmarks/bookmarks.module.ts`** — NestJS module wiring PrismaModule, BookmarksController, BookmarksService, BookmarksRepository

### Modified
- **`src/app.module.ts`** — Added `BookmarksModule` import to the Wave 6 section

## Key Decisions

### 1. 404-not-403 Ownership Enforcement
Per SM-12.3 NaC, `deleteOwned()` throws `NotFoundException` (404) when a bookmark belongs to another user — returning 403 would confirm the bookmark exists and belongs to another user, which is an information leak.

### 2. Prisma Relation Field Name (`person` not `people`)
The Prisma schema defines the relation as `person people @relation(...)` (not `people`). The `create()` method uses `{ person: { connect: { id: personId } } }` matching the actual schema field name. The plan spec showed `people:` — this was corrected via auto-fix (Rule 1) to match the real schema.

### 3. type='digest' Support
`CreateBookmarkDto` accepts both `'search'` (default) and `'digest'` via `@IsIn(['search', 'digest'])`. The `'digest'` type is consumed by `DigestCron` in the `NotificationsModule` (plan 13) to identify email subscription rows.

### 4. id DESC Ordering in Repository
`findAllForPerson()` applies `orderBy: { id: 'desc' }` at the Prisma layer, ensuring consistent ordering without relying on insertion order.

## Integration Contracts Fulfilled

| Contract | Source | Status |
|----------|--------|--------|
| `model bookmarks` in Prisma schema | plan-01 | ✅ Used exact column names: `person_id`, `type`, `name`, `requestUri` |
| `AuthMiddleware` sets `req.user.id` | plan-04 | ✅ `requireAuthenticated(req)` reads `req.user` from middleware |
| `SerializationInterceptor` global | plan-03 | ✅ GET /bookmarks formatted in all 5 formats automatically |
| `bookmarks.type` VARCHAR supports 'digest' | plan-13 | ✅ DTO validates and accepts 'digest' type |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected Prisma relation field name in BookmarksService.create()**
- **Found during:** Task 1
- **Issue:** Plan spec showed `people: { connect: { id: personId } }` but the actual Prisma schema defines the relation field as `person` (singular), not `people`
- **Fix:** Changed to `person: { connect: { id: personId } }` to match schema; wrapped with `as any` to satisfy TypeScript as the plan spec prescribes
- **Files modified:** `src/modules/bookmarks/bookmarks.service.ts`
- **Commit:** c525d10

## Self-Check

### Files Exist
- ✅ `src/modules/bookmarks/bookmarks.module.ts`
- ✅ `src/modules/bookmarks/bookmarks.controller.ts`
- ✅ `src/modules/bookmarks/bookmarks.service.ts`
- ✅ `src/modules/bookmarks/bookmarks.repository.ts`
- ✅ `src/modules/bookmarks/dto/create-bookmark.dto.ts`
- ✅ `src/app.module.ts` (updated)

### Commits Exist
- ✅ c525d10: Task 1 (data layer)
- ✅ d40480a: Task 2 (controller + module + AppModule)

### TypeScript Compilation
- ✅ Zero errors (`npx tsc --noEmit` — 0 `error TS` lines)

## Self-Check: PASSED
