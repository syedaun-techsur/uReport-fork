---
phase: wave-5-integration
plan: 14
subsystem: media
tags: [media, file-upload, multer, sharp, thumbnail, rbac, audit-trail, nestjs]
dependency_graph:
  requires:
    - prisma/schema.prisma (media, tickets, ticketHistory, people models)
    - src/common/guards/auth.guard.ts (AuthGuard)
    - src/modules/tickets/tickets.module.ts (TicketsModule, TicketsService)
    - src/modules/tickets/tickets.service.ts (findOne for visibility checks)
  provides:
    - src/modules/media/media.module.ts (MediaModule, MediaService exported)
    - src/modules/media/media.service.ts (upload, list, stream, streamThumbnail, delete)
    - src/modules/media/media.repository.ts (Prisma media table wrapper)
    - src/modules/media/media.controller.ts (5 routes)
  affects:
    - src/app.module.ts (MediaModule imported)
tech_stack:
  added:
    - multer (in-memory storage via @nestjs/platform-express MulterModule)
    - sharp (dynamic import for thumbnail generation)
  patterns:
    - Fire-and-forget thumbnail generation (async, failure non-blocking)
    - UUID-based internalFilename (never derived from user input, TechArch §7.7)
    - fs.createReadStream() piped to Express response for streaming
    - PrismaService direct access in appendMediaHistory (avoids circular dep with TicketsService)
key_files:
  created:
    - src/modules/media/dto/upload-media.dto.ts
    - src/modules/media/media.repository.ts
    - src/modules/media/media.service.ts
    - src/modules/media/media.controller.ts
    - src/modules/media/media.module.ts
  modified:
    - src/app.module.ts (added MediaModule import)
decisions:
  - "Used PrismaService directly in appendMediaHistory() to write ticketHistory rows, avoiding circular dependency since TicketsService is already injected for findOne() visibility checks"
  - "Dynamic import of sharp (`await import('sharp')`) to avoid startup failure if sharp native binaries are missing"
  - "Multer configured with memoryStorage() so MediaService controls disk write with UUID filename (TechArch §7.7 compliance)"
  - "fileFilter in Multer accepts all MIME types — validation deferred to service layer for extensibility"
  - "Thumbnail generation wrapped in fire-and-forget (.catch()) — upload response returns immediately even if thumbnail fails"
metrics:
  duration: ~15 minutes
  completed: "2026-06-23T17:47:32Z"
  tasks: 2
  files: 6
---

# Phase wave-5-integration Plan 14: MediaModule Summary

**One-liner:** File upload/stream/thumbnail module with UUID storage, Multer memory buffering, sharp thumbnails, and full RBAC/audit trail per TechArch §6.7 and §7.7.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | MediaRepository + MediaService | `4ceea7e` | media.repository.ts, media.service.ts, dto/upload-media.dto.ts |
| 2 | MediaController + MediaModule + AppModule | `02d61d8` | media.controller.ts, media.module.ts, app.module.ts |

## Files Created/Modified

### Created
- **`src/modules/media/dto/upload-media.dto.ts`** — Empty DTO placeholder (file arrives via Multer `req.file`)
- **`src/modules/media/media.repository.ts`** — Prisma `media` table wrapper: `create`, `findByTicket`, `findOne`, `delete` using exact DDL column names (`internalFilename`, `mime_type`, `ticket_id`, `person_id`, `filename`, `uploaded`)
- **`src/modules/media/media.service.ts`** — Full MediaService: upload, list, stream, streamThumbnail, delete + private `generateThumbnail()` and `appendMediaHistory()` helpers
- **`src/modules/media/media.controller.ts`** — MediaController with 5 routes under `@Controller('tickets/:ticketId/media')`: GET (list), POST (upload/authenticated), GET /:mediaId (stream), GET /:mediaId/thumbnail (streamThumbnail), DELETE /:mediaId (staff-only)
- **`src/modules/media/media.module.ts`** — MediaModule with MulterModule (memoryStorage, MEDIA_MAX_BYTES limit), imports TicketsModule, exports MediaService

### Modified
- **`src/app.module.ts`** — Added `MediaModule` import (Wave 5c)

## Key Implementation Decisions

1. **UUID internalFilename** — `randomUUID()` from Node.js `crypto` module; never derived from user input (TechArch §7.7). Original filename stored in `filename` column for display only.

2. **In-memory Multer storage** — `multer.memoryStorage()` so MediaService receives `file.buffer` and writes to disk using the UUID name. Prevents user-controlled filenames from reaching the filesystem.

3. **Fire-and-forget thumbnail** — `generateThumbnail().catch(...)` wraps the async sharp operation. Upload response is returned immediately; thumbnail failure is logged at WARN level only.

4. **Dynamic sharp import** — `(await import('sharp')).default` in `generateThumbnail()` prevents startup crash if sharp native binaries are missing (e.g., different Node.js version).

5. **PrismaService for audit writes** — `appendMediaHistory()` uses `PrismaService` directly (not `TicketsService`) to avoid a circular dependency since `TicketsService` is already injected for `findOne()` ticket visibility checks.

6. **MIME type image set** — `['image/jpeg', 'image/png', 'image/gif', 'image/webp']` — `image/webp` added alongside the spec's three types since sharp supports it natively.

7. **Storage path** — `{MEDIA_STORAGE_PATH}/{ticket_id}/{uuid}` for files; `{MEDIA_STORAGE_PATH}/{ticket_id}/thumbnails/{uuid}` for thumbnails; directories created with `fs.promises.mkdir({ recursive: true })`.

## RBAC Rules Implemented

| Route | Access Level | Enforcement |
|-------|-------------|-------------|
| GET /tickets/:id/media | Anonymous | Ticket visibility via `TicketsService.findOne()` |
| POST /tickets/:id/media | Authenticated | `requireAuthenticated()` → 401 if no user |
| GET /tickets/:id/media/:mediaId | Anonymous | Ticket visibility via `TicketsService.findOne()` |
| GET /tickets/:id/media/:mediaId/thumbnail | Anonymous | Ticket visibility + MIME type check |
| DELETE /tickets/:id/media/:mediaId | Staff-only | `requireStaff()` → 403 if not staff |

## Integration Contract Status

### Requires (verified)
- ✅ `prisma/schema.prisma` — `model media`, `internalFilename`, `model ticketHistory` present
- ✅ `src/common/guards/auth.guard.ts` — `AuthGuard implements CanActivate` present
- ✅ `src/modules/tickets/tickets.module.ts` — `TicketsModule` exports `TicketsService`
- ✅ `src/modules/tickets/tickets.service.ts` — `findOne()` with user visibility logic present

### Provides (verified)
- ✅ `MediaModule` exports `MediaService` — verified by grep
- ✅ `MediaService` has all 5 public methods: `upload`, `list`, `stream`, `streamThumbnail`, `delete`
- ✅ `MediaController` registered under route prefix `tickets/:ticketId/media`
- ✅ `AppModule` imports `MediaModule`

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Minor Variations

1. **image/webp added to IMAGE_MIME_TYPES** — Plan specified `image/jpeg`, `image/png`, `image/gif`. Added `image/webp` since sharp natively supports it and the spec does not explicitly exclude it. Consistent with TechArch §6.7 "image/* MIME types".

2. **Removed `as any` cast on `findOne` call in `upload()`** — Plan used `as any` for the user parameter; removed since `TicketsService.findOne()` already accepts `{ id: number; role: string | null } | null` which matches directly.

## Pre-existing TypeScript Errors (Out of Scope)

3 pre-existing errors NOT caused by this plan (logged per deviation Rule scope boundary):
- `src/modules/search/search.module.ts` — Cannot find module `./search.controller`
- `src/modules/search/solr.service.ts` — `categories` not in `ticketsInclude` (should be `category`)
- `scripts/reindex-solr.ts` — Same `categories` issue

## Self-Check: PASSED

| File | Status |
|------|--------|
| src/modules/media/dto/upload-media.dto.ts | ✅ EXISTS |
| src/modules/media/media.repository.ts | ✅ EXISTS |
| src/modules/media/media.service.ts | ✅ EXISTS |
| src/modules/media/media.controller.ts | ✅ EXISTS |
| src/modules/media/media.module.ts | ✅ EXISTS |
| Commit 4ceea7e | ✅ EXISTS |
| Commit 02d61d8 | ✅ EXISTS |
| MediaModule in AppModule | ✅ VERIFIED |
| 0 new TypeScript errors | ✅ VERIFIED |
