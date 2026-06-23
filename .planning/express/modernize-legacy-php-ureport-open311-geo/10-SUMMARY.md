---
phase: wave-4-backend
plan: 10
subsystem: tickets
tags: [tickets, lifecycle, rbac, audit-trail, nestjs]
dependency_graph:
  requires: [01-prisma-schema, 06-rbac, 07-categories, 08-people]
  provides: [TicketsModule, TicketsService, TicketsRepository, TicketsController]
  affects: [open311-module, wave5-solr, wave5-notifications, wave5-geo]
tech_stack:
  added: []
  patterns: [repository-pattern, unchecked-prisma-input, role-based-visibility, pii-mask-interceptor]
key_files:
  created:
    - src/modules/tickets/tickets.repository.ts
    - src/modules/tickets/tickets.service.ts
    - src/modules/tickets/tickets.controller.ts
    - src/modules/tickets/tickets.module.ts
    - src/modules/tickets/dto/close-ticket.dto.ts
    - src/modules/tickets/dto/duplicate-ticket.dto.ts
    - src/modules/tickets/dto/comment-ticket.dto.ts
    - src/modules/tickets/dto/response-ticket.dto.ts
    - src/modules/tickets/dto/reopen-ticket.dto.ts
    - src/modules/tickets/dto/list-tickets.dto.ts
    - src/modules/tickets/dto/update-ticket.dto.ts
  modified:
    - src/app.module.ts
decisions:
  - Used Prisma.ticketHistoryUncheckedCreateInput for plain FK scalar fields (ticket_id, action_id)
  - Made TicketsRepository.prisma public (readonly) so service can access substatus for duplicate workflow
  - Repository relation name is 'category' (not 'categories') matching Prisma schema
  - ticketHistory relation name is 'action' (not 'actions') matching Prisma schema
metrics:
  duration: ~12 minutes
  completed: 2026-06-23
  tasks: 2
  files: 12
---

# Phase wave-4-backend Plan 10: TicketsModule Part B Summary

**One-liner:** Complete TicketsModule with lifecycle ops (close/duplicate/comment/response/reopen/update), RBAC-filtered paginated list, immutable ticketHistory audit trail, and PII masking via interceptors.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | TicketsRepository + TicketsService + DTOs | 92bb85f | tickets.repository.ts, tickets.service.ts, 7 DTOs |
| 2 | TicketsController + TicketsModule + AppModule | 23b4804 | tickets.controller.ts, tickets.module.ts, app.module.ts |

## What Was Built

### TicketsRepository (src/modules/tickets/tickets.repository.ts)
- `permissionLevels(role)` — exported helper, maps role to displayPermissionLevel array
- `findAll(role, where, page, pageSize)` — paginated with `category.displayPermissionLevel IN (levels)` filter
- `findOne(id)` — single ticket with relations
- `update(id, data)` — UncheckedUpdateInput for plain FK scalars
- `appendHistory(data)` — UncheckedCreateInput for plain ticket_id/action_id
- `getHistory(ticketId)` — ordered by enteredDate ASC with action/person relations
- `getActionByName(name)` — resolve action_id for history entries
- `getSubstatus(id)` — validate substatus for close operations

### TicketsService (src/modules/tickets/tickets.service.ts)
- `update()` — emits changeCategory (with data={original,updated}), changeLocation, or update action
- `close()` — 409 on already-closed; 400 on invalid substatus; appends 'closed' history
- `duplicate()` — 400 on self-reference; 400 on already-parented; appends 'duplicate' to PARENT only
- `addComment()` — 400 on empty notes; appends 'comment' history; updates lastModified
- `addResponse()` — resolves actionPerson_id to reportedByPerson_id; appends 'response' history
- `reopen()` — 409 on already-open; clears closedDate+substatus_id; appends 'update' history
- `list(role, dto)` — delegates to repo with role-filtered category visibility; returns paginated envelope
- `findOne(id, role)` — loads with role visibility check
- `getHistory(ticketId, role)` — returns history ordered by enteredDate ASC

### TicketsController (src/modules/tickets/tickets.controller.ts)
9 routes per TechArch §4.3:
- `GET /tickets` — list with role-filtered PiiMaskInterceptor
- `GET /tickets/:id` — detail with PiiMaskInterceptor
- `PUT /tickets/:id` — update (staff-only, requireStaff guard)
- `POST /tickets/:id/close` — close (staff-only)
- `POST /tickets/:id/duplicate` — duplicate (staff-only, PARENT audit per FRD §F01.5)
- `POST /tickets/:id/reopen` — reopen (staff-only)
- `POST /tickets/:id/comment` — comment (staff-only)
- `POST /tickets/:id/response` — response (staff-only)
- `GET /tickets/:id/history` — history with PiiMaskInterceptor

### Module Wiring
- `TicketsModule` exports `TicketsService` for Open311Module (plan 11) and wave 5
- `AppModule` imports `TicketsModule`
- `AuthMiddleware` preserved in middleware chain

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Prisma relation name mismatch**
- **Found during:** Task 1
- **Issue:** Plan spec used `categories` (plural) in include/where but Prisma schema defines it as `category` (singular)
- **Fix:** Used `category` for tickets→categories relation, `action` for ticketHistory→actions relation
- **Files modified:** tickets.repository.ts

**2. [Rule 1 - Bug] ticketHistoryCreateInput type mismatch**
- **Found during:** Task 1
- **Issue:** Plan used `Prisma.ticketHistoryCreateInput` which requires nested relation syntax, not plain FK integers
- **Fix:** Used `Prisma.ticketHistoryUncheckedCreateInput` which accepts plain `ticket_id`, `action_id` scalars
- **Files modified:** tickets.repository.ts, tickets.service.ts

**3. [Rule 1 - Bug] ticketsUpdateInput type mismatch**
- **Found during:** Task 1
- **Issue:** `ticketsUpdateInput` does not have `substatus_id` or `parent_id` as plain scalars (uses nested relations)
- **Fix:** Changed `update()` method signature to `Prisma.ticketsUncheckedUpdateInput`
- **Files modified:** tickets.repository.ts

**4. [Rule 3 - Blocking] Concurrent execution interference**
- **Found during:** Task 2
- **Issue:** A parallel plan 09 execution was overwriting tickets.repository.ts and tickets.service.ts with plan 09 content
- **Fix:** Used `git checkout HEAD --` to restore from commits; staged and committed Task 2 files atomically
- **Files modified:** All tickets module files

**5. [Rule 1 - Bug] duplicate() service used private prisma access**
- **Found during:** Task 1
- **Issue:** Plan spec used `this.repo['prisma' as any]?.substatus?.findFirst()` — unsafe any-cast
- **Fix:** Made `TicketsRepository.prisma` a `readonly` public property so service can call it directly; extracted `findDuplicateSubstatus()` private helper
- **Files modified:** tickets.repository.ts, tickets.service.ts

## Self-Check

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/modules/tickets/tickets.repository.ts | FOUND |
| src/modules/tickets/tickets.service.ts | FOUND |
| src/modules/tickets/tickets.controller.ts | FOUND |
| src/modules/tickets/tickets.module.ts | FOUND |
| src/modules/tickets/dto/close-ticket.dto.ts | FOUND |
| src/modules/tickets/dto/duplicate-ticket.dto.ts | FOUND |
| src/modules/tickets/dto/comment-ticket.dto.ts | FOUND |
| src/modules/tickets/dto/response-ticket.dto.ts | FOUND |
| src/modules/tickets/dto/reopen-ticket.dto.ts | FOUND |
| src/modules/tickets/dto/list-tickets.dto.ts | FOUND |
| src/modules/tickets/dto/update-ticket.dto.ts | FOUND |
| Commit 92bb85f (Task 1) | FOUND |
| Commit 23b4804 (Task 2) | FOUND |
| TypeScript noEmit | PASSED (0 errors) |
