---
phase: wave-4-backend
plan: "09"
subsystem: tickets
tags: [tickets, lifecycle, RBAC, history, PII-masking, NestJS]
dependency_graph:
  requires:
    - from_plan: "01"
      artifact: prisma/schema.prisma
      provides: tickets, ticketHistory, substatus, actions models
    - from_plan: "06"
      artifact: src/modules/auth/ability.factory.ts
      provides: AbilityFactory, CaslGuard, PiiMaskInterceptor
    - from_plan: "07"
      artifact: src/modules/categories/categories.service.ts
      provides: CategoriesService.findOne for posting permission check
    - from_plan: "08"
      artifact: src/modules/people/people.service.ts
      provides: PeopleService.findOne for assignee and reporter validation
  provides:
    - artifact: src/modules/tickets/tickets.module.ts
      exports: [TicketsModule, TicketsService]
    - artifact: src/modules/tickets/tickets.service.ts
      exports: [TicketsService] for Open311Module (Wave 4b plan 10)
  affects:
    - module: Open311Module (plan 10)
      reason: consumes TicketsService.create/findAll/findOne
    - module: SearchModule (Wave 5)
      reason: hooks into ticket mutations for Solr indexing
    - module: NotificationsModule (Wave 5)
      reason: triggers on ticket state changes
tech_stack:
  added: []
  patterns:
    - TicketsRepository: thin Prisma wrapper with categoryVisibilityWhere filter
    - TicketsService: full lifecycle per FRD §F01 with immutable ticketHistory append
    - role-based category visibility: anonymous/public/staff tier filtering
    - PiiMaskInterceptor: controller-level decorator masks PII for non-staff
    - requireStaffUser: inline role guard for write-only endpoints
key_files:
  created:
    - src/modules/tickets/dto/create-ticket.dto.ts
    - src/modules/tickets/dto/update-ticket.dto.ts
    - src/modules/tickets/dto/assign-ticket.dto.ts
    - src/modules/tickets/dto/close-ticket.dto.ts
    - src/modules/tickets/dto/duplicate-ticket.dto.ts
    - src/modules/tickets/dto/comment-ticket.dto.ts
    - src/modules/tickets/dto/response-ticket.dto.ts
    - src/modules/tickets/dto/reopen-ticket.dto.ts
  modified:
    - src/modules/tickets/tickets.repository.ts
    - src/modules/tickets/tickets.service.ts
    - src/modules/tickets/tickets.controller.ts
    - src/modules/tickets/tickets.module.ts
    - src/app.module.ts
decisions:
  - Used Prisma relation names from actual schema (category/issueType/enteredByPerson/assignedPerson)
    not the plan's example names (categories/issueTypes) — adapted to match generated client
  - reportedByPerson_id stored as plain FK field (no named relation in schema),
    used directly in service for respond() actionPerson defaulting
  - appendHistory uses ticketHistoryCreateInput (connect syntax) via as-any cast
    for clean relation-based creates
  - Rewrote pre-existing partial implementations from prior incomplete execution;
    used cp-from-tempfile strategy to handle overlayfs write issues
metrics:
  duration: ~70 minutes (including overlayfs debugging)
  tasks_completed: 2
  files_modified: 13
  completed_date: "2026-06-23T17:40:56Z"
---

# Phase wave-4-backend Plan 09: TicketsModule Summary

**One-liner:** Full ticket lifecycle — create/read/update/assign/close/duplicate/comment/response/reopen/history — with role-based category visibility, immutable ticketHistory audit trail, and PII masking for non-staff callers.

## What Was Built

### Task 1: TicketsRepository + DTOs + TicketsService

**8 DTOs** covering all ticket lifecycle operations:
- `CreateTicketDto`: category_id (required), 14 optional fields (geo, contact, custom)
- `UpdateTicketDto`: PartialType(CreateTicketDto) — all optional
- `AssignTicketDto`, `CloseTicketDto`, `DuplicateTicketDto`, `CommentTicketDto`, `ResponseTicketDto`, `ReopenTicketDto`

**TicketsRepository** (Prisma wrapper):
- `findAll(roleFilter)`: applies `categoryVisibilityWhere()` — anonymous→'anonymous', public→['public','anonymous'], staff→all
- `findOne(id)`: single ticket with full includes
- `create()`, `update()`: with category+substatus includes
- `appendHistory(ticketHistoryCreateInput)`: immutable history append
- `getHistory(ticketId)`: ordered by enteredDate ASC with action/person joins
- `findActionByName()`, `findSubstatus()`, `findSubstatusByName()`: lookup helpers

**TicketsService** (full lifecycle per FRD §F01):
- `findAll(user)`: delegates to repo with role descriptor
- `findOne(id, user)`: visibility check post-load; returns 404 for hidden tickets
- `create(dto, user)`: validates category active + postingPermissionLevel + customFields JSON + reportedByPerson; appends 'open' history entry
- `update(id, dto, user)`: staff only; logs 'changeCategory', 'changeLocation', or 'update' action with JSON data
- `assign(id, dto, user)`: staff only; validates assignee.department_id === ticket.category.department_id
- `close(id, dto, user)`: staff only; validates substatus.status==='closed'; 409 if already closed
- `duplicate(id, dto, user)`: staff only; self-reference guard; closes child with Duplicate substatus; appends 'duplicate' on PARENT only (FRD §F01.5)
- `comment(id, dto, user)`: staff only; validates non-empty notes
- `respond(id, dto, user)`: staff only; actionPerson defaults to reportedByPerson_id
- `reopen(id, dto, user)`: staff only; clears closedDate + substatus; 409 if already open
- `getHistory(id, user)`: visibility check then ordered history

### Task 2: TicketsController + TicketsModule + AppModule

**TicketsController**: 11 routes per TechArch §4.3:
```
GET    /tickets                → findAll  [anon]
POST   /tickets                → create   [authenticated]
GET    /tickets/:id            → findOne  [anon]
PUT    /tickets/:id            → update   [staff]
POST   /tickets/:id/assign     → assign   [staff]
POST   /tickets/:id/close      → close    [staff]
POST   /tickets/:id/duplicate  → duplicate [staff]
POST   /tickets/:id/reopen     → reopen   [staff]
POST   /tickets/:id/comment    → comment  [staff]
POST   /tickets/:id/response   → respond  [staff]
GET    /tickets/:id/history    → getHistory [anon]
```
- `@UseInterceptors(PiiMaskInterceptor)` on controller class — all responses PII-masked for non-staff (FRD §F02.8)

**TicketsModule**:
```typescript
@Module({
  imports: [CategoriesModule, PeopleModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository],
  exports: [TicketsService],
})
export class TicketsModule {}
```

**AppModule**: `TicketsModule` added to imports; AuthMiddleware pipeline preserved.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adapted to actual Prisma relation names**
- **Found during:** Task 1
- **Issue:** Plan code used wrong relation names: `categories` → actual is `category`, `issueTypes` → `issueType`, `contactMethods` → no relation on tickets, `categories.departments` → `category.department`, `categories.categoryGroups` → `category.categoryGroup`, `ticketHistory.actions` → `ticketHistory.action`
- **Fix:** Used Prisma-generated `ticketsInclude` type to determine actual relation names; adapted all repo queries and service calls accordingly
- **Files modified:** `tickets.repository.ts`, `tickets.service.ts`

**2. [Rule 1 - Bug] reportedByPerson has no named relation**
- **Found during:** Task 1
- **Issue:** `tickets` model has `reportedByPerson_id` FK field but no named relation in schema (no `@relation` for it). Plan code tried to use `{ connect: { id: ... } }` syntax.
- **Fix:** Used `reportedByPerson_id: dto.reportedByPerson_id ?? null` as scalar FK directly in create/update inputs

**3. [Rule 1 - Bug] Pre-existing partial implementations**
- **Found during:** Tasks 1 and 2
- **Issue:** Prior incomplete execution had written different versions of tickets.service.ts, tickets.repository.ts, and tickets.controller.ts with mismatched method signatures (e.g., `createTicket()` instead of `create()`, `getActionByName()` instead of `findActionByName()`, paginated findAll instead of simple findAll)
- **Fix:** Completely overwrote all files with correct implementations matching the plan spec

**4. [Rule 3 - Blocking] overlayfs write persistence issue**
- **Found during:** Tasks 1 and 2
- **Issue:** Writing to pre-existing inode files (from overlayfs lower layer) failed silently — `cat >`, Python `open(...).write()`, and `tee` all appeared to succeed but bash reads showed old content
- **Fix:** Used `rm` + `tee` (for new inodes) and `cp -f /tmp/tempfile dest` (reliable copy) to ensure correct file content; this is the write strategy for all tickets module files

## Integration Contracts Fulfilled

- `TicketsModule` imports `CategoriesModule` (for `CategoriesService`) and `PeopleModule` (for `PeopleService`)
- `TicketsModule` exports `TicketsService` for Open311Module consumption (Wave 4b plan 10)
- `AppModule` imports `TicketsModule`
- `npx tsc --noEmit` passes with zero TypeScript errors

## Self-Check: PASSED

Files verified to exist:
- src/modules/tickets/tickets.service.ts ✓
- src/modules/tickets/tickets.repository.ts ✓
- src/modules/tickets/tickets.controller.ts ✓
- src/modules/tickets/tickets.module.ts ✓
- src/modules/tickets/dto/*.dto.ts (9 files) ✓
- src/app.module.ts (TicketsModule imported) ✓

Commits verified:
- a851138: Task 1 commit ✓
- 874c905: Task 2 commit ✓
