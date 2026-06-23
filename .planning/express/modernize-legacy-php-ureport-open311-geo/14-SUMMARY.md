---
phase: wave-5-integration
plan: 14
subsystem: media
tags: [media, attachments, multer, sharp, file-upload, thumbnails, rbac, audit-trail]
dependency_graph:
  requires: [prisma/schema.prisma, src/common/guards/auth.guard.ts, src/modules/tickets/tickets.module.ts, src/modules/tickets/tickets.service.ts]
  provides: [src/modules/media/media.module.ts, src/modules/media/media.service.ts]
  affects: [src/app.module.ts]
tech_stack:
  added: [sharp, multer, @nestjs/platform-express MulterModule]
  patterns: [fire-and-forget thumbnail, UUID internalFilename, memory storage + disk write, role-filtered streaming]
key_files:
  created:
    - src/modules/media/media.repository.ts
    - src/modules/media/media.service.ts
    - src/modules/media/media.controller.ts
    - src/modules/media/media.module.ts
    - src/modules/media/dto/upload-media.dto.ts
  modified:
    - src/app.module.ts
decisions:
  - "appendMediaHistory() uses PrismaService directly (not TicketsService.appendHistory) to avoid circular dependency — TicketsService already imported for findOne()"
  - "sharp loaded via dynamic import (await import('sharp')) to prevent top-level failure if native bindings not ready"
  - "internalFilename always randomUUID() — never derived from user input per TechArch §7.7 security requirement"
  - "Multer configured with memoryStorage() so service controls disk write path with UUID name"
  - "Thumbnail failure is fire-and-forget (.catch()) — upload response never blocked by thumbnail generation error"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-23"
  tasks: 2
  files: 6
---

# Phase wave-5-integration Plan 14: MediaModule Summary

**One-liner:** UUID-based file upload with Multer memoryStorage, sharp fire-and-forget thumbnails, role-filtered streaming, and audit trail for F8 media attachment management.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | MediaRepository + MediaService | af3c877 | media.repository.ts, media.service.ts, dto/upload-media.dto.ts |
| 2 | MediaController + MediaModule + AppModule | 97b66ed | media.controller.ts, media.module.ts, app.module.ts |

## Files Created/Modified

### Created
- **`src/modules/media/dto/upload-media.dto.ts`** — Minimal DTO placeholder (file arrives via Multer `@UploadedFile()`)
- **`src/modules/media/media.repository.ts`** — Prisma wrapper: `create`, `findByTicket`, `findOne`, `delete` using exact DDL column names (`internalFilename`, `mime_type`, `ticket_id`, `person_id`)
- **`src/modules/media/media.service.ts`** — Full F8 service: `upload`, `list`, `stream`, `streamThumbnail`, `delete` + private `generateThumbnail` + `appendMediaHistory`
- **`src/modules/media/media.controller.ts`** — 5 routes under `@Controller('tickets/:ticketId/media')` with RBAC inline helpers
- **`src/modules/media/media.module.ts`** — MulterModule with `memoryStorage()`, `MEDIA_MAX_BYTES` limit, exports `MediaService`

### Modified
- **`src/app.module.ts`** — Added `MediaModule` import (Wave 5c)

## Integration Contract Status

### Requires (verified)
- ✅ `prisma/schema.prisma` — `model media` with `internalFilename`, `mime_type`, `ticket_id`, `person_id`
- ✅ `src/common/guards/auth.guard.ts` — `AuthGuard implements CanActivate` (used by auth middleware pipeline)
- ✅ `src/modules/tickets/tickets.module.ts` — `TicketsModule` exports `TicketsService`
- ✅ `src/modules/tickets/tickets.service.ts` — `TicketsService.findOne(id, userOrRole)` for ticket visibility checks

### Provides (verified)
- ✅ `MediaModule` — imports TicketsModule, configures Multer, exports MediaService
- ✅ `MediaService` — exported for Wave 6 ReportsModule and Open311Module media_url construction
- ✅ All 5 routes implemented under `tickets/:ticketId/media` prefix

## Key Implementation Decisions

1. **`appendMediaHistory()` uses `PrismaService` directly** — not `TicketsService.appendHistory()` — to avoid circular dependency. MediaService already imports TicketsService for `findOne()` visibility checks, and a second call path would create a circular module reference.

2. **Sharp via dynamic import** — `await import('sharp')` inside `generateThumbnail()` prevents top-level native binding failure. The dynamic import also makes the fire-and-forget pattern cleaner since the whole call is already async.

3. **`internalFilename = randomUUID()`** — TechArch §7.7 security requirement: user-supplied filenames MUST NOT be used as disk paths. UUID guarantees uniqueness and prevents path traversal.

4. **Multer `memoryStorage()`** — Service controls the disk write location with UUID name. Using `diskStorage` would require Multer to know the UUID before service runs, defeating the security model.

5. **Thumbnail generation is fire-and-forget** — `.catch()` wraps `generateThumbnail()` call in `upload()`. Thumbnail failures are GELF-warn logged but do NOT propagate to the HTTP response per TechArch §6.7.

## RBAC Implementation

| Route | Guard | Error |
|-------|-------|-------|
| GET `/tickets/:id/media` | None (anon) | — |
| POST `/tickets/:id/media` | `requireAuthenticated()` | 401 UNAUTHORIZED |
| GET `/tickets/:id/media/:id` | None (anon) | — |
| GET `/tickets/:id/media/:id/thumbnail` | None (anon) | — |
| DELETE `/tickets/:id/media/:id` | `requireStaff()` | 403 FORBIDDEN |

## Deviations from Plan

### Pre-existing TypeScript Errors (Out of Scope)

The project has 68 pre-existing TypeScript errors from plans 13/15 in unrelated files:
- `src/modules/tickets/tickets.service.ts` — `solrService` and `logger` referenced but not injected (added by plan 15/GeoModule)
- `src/modules/search/solr.service.ts` — `categories` used instead of `category` in Prisma include (plan 15)
- `scripts/reindex-solr.ts` — same `categories` issue

**Media-specific TypeScript errors: ZERO.** All media files compile cleanly. These pre-existing errors are tracked for the relevant plan owners (13/15) and documented in `deferred-items.md`.

No architectural deviations were required. Plan executed exactly as specified for media files.

## Self-Check

```
FOUND: src/modules/media/media.module.ts
FOUND: src/modules/media/media.controller.ts
FOUND: src/modules/media/media.service.ts
FOUND: src/modules/media/media.repository.ts
FOUND: src/modules/media/dto/upload-media.dto.ts
FOUND commit: af3c877 (Task 1)
FOUND commit: 97b66ed (Task 2)
```

## Self-Check: PASSED
