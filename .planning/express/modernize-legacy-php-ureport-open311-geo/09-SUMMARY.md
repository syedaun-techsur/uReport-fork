---
phase: wave-4-backend
plan: "09"
subsystem: tickets
tags: [tickets, lifecycle, history, rbac, pii-masking, nestjs]
dependency_graph:
  requires: [prisma-schema, rbac-guards, categories-module, people-module]
  provides: [TicketsModule, TicketsService, TicketsController, TicketsRepository]
  affects: [AppModule, Open311Module-wave-4b]
tech_stack:
  added: [TicketsModule, TicketsService, TicketsRepository, TicketsController]
  patterns: [role-based-category-filter, ticketHistory-append, lifecycle-state-machine, pii-masking]
key_files:
  created:
    - src/modules/tickets/tickets.module.ts
    - src/modules/tickets/tickets.controller.ts
    - src/modules/tickets/tickets.service.ts
    - src/modules/tickets/tickets.repository.ts
    - src/modules/tickets/dto/create-ticket.dto.ts
    - src/modules/tickets/dto/update-ticket.dto.ts
    - src/modules/tickets/dto/assign-ticket.dto.ts
    - src/modules/tickets/dto/close-ticket.dto.ts
    - src/modules/tickets/dto/duplicate-ticket.dto.ts
    - src/modules/tickets/dto/comment-ticket.dto.ts
    - src/modules/tickets/dto/response-ticket.dto.ts
    - src/modules/tickets/dto/reopen-ticket.dto.ts
  modified:
    - src/app.module.ts
    - src/common/middleware/format.middleware.ts
decisions:
  - "Use 'staff' role for category lookup in create() to load any category regardless of displayPermissionLevel — needed to check postingPermissionLevel against caller"
  - "Dual method signatures on update/close/duplicate/reopen (actorId: number | UserObject) for plan 09+10 compatibility"
  - "Repository exports permissionLevels() helper for use in service and plan 10 Open311Service"
  - "addComment/addResponse methods with comment/respond aliases for backwards compatibility"
metrics:
  duration: ~25min
  completed: "2026-06-23"
  tasks_completed: 2
  files_created: 13
  files_modified: 2
---

# Phase wave-4-backend Plan 09: TicketsModule Summary

**One-liner:** Full ticket lifecycle CRUD with immutable ticketHistory, role-based category visibility, and PII masking — the P0 core of uReport.

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | TicketsRepository + DTOs + TicketsService | da8198c | ✅ |
| 2 | TicketsController + TicketsModule + AppModule wire | 910d870 | ✅ |

## What Was Built

### TicketsRepository (`tickets.repository.ts`)
- Role-based category visibility filter (`permissionLevels()` exported helper)
- `findAll()` / `findOne()` with Prisma includes for joined relations
- `findAllPaginated()` for paginated list queries (plan 10 compatible)
- `appendHistory()` — immutable ticketHistory record creation
- `getHistory()` — history ordered by `enteredDate ASC`
- `findActionByName()` / `getActionByName()` aliases
- `findSubstatus()` / `getSubstatus()` aliases
- `findDuplicateSubstatus()` — looks up 'Duplicate' substatus for F01.5

### DTOs (8 lifecycle DTOs)
- `CreateTicketDto`: category_id required, all geo/contact/meta fields optional
- `UpdateTicketDto`: PartialType(CreateTicketDto) — all optional
- `AssignTicketDto`: assignedPerson_id required
- `CloseTicketDto`: substatus_id required, notes optional
- `DuplicateTicketDto`: parent_id required
- `CommentTicketDto`: notes required
- `ResponseTicketDto`: notes and actionPerson_id optional
- `ReopenTicketDto`: notes optional

### TicketsService (`tickets.service.ts`)
Full state machine per FRD §F01.1–F01.9:

| Method | FRD | Auth | History Action | Key Validation |
|--------|-----|------|----------------|----------------|
| `findAll()` | F01.1 | anon | — | Category visibility filter |
| `findOne()` | F01.1 | anon | — | 404 if not visible |
| `list()` | F01.9 | anon | — | Paginated + filtered |
| `create()` | F01.1 | public | 'open' | postingPermissionLevel check |
| `update()` | F01.3 | staff | changeCategory/changeLocation/update | customFields JSON valid |
| `assign()` | F01.2 | staff | assignment | assignee.department === ticket.category.department |
| `close()` | F01.4 | staff | closed | substatus.status === 'closed'; 409 if already closed |
| `duplicate()` | F01.5 | staff | duplicate (on parent) | no self-ref; closes child; 'duplicate' action on parent only |
| `comment()` | F01.6 | staff | comment | notes non-empty |
| `respond()` | F01.7 | staff | response | actionPerson defaults to reportedByPerson_id |
| `reopen()` | F01.8 | staff | update | clears closedDate + substatus_id; 409 if already open |
| `getHistory()` | F01.9 | anon | — | Existence + visibility check |

### TicketsController (`tickets.controller.ts`)
All 11 routes per TechArch §4.3 §Tickets endpoint catalog:
```
GET    /tickets                → findAll [anon]
POST   /tickets                → create  [public — authenticated]
GET    /tickets/:id            → findOne [anon]
PUT    /tickets/:id            → update  [staff]
POST   /tickets/:id/assign     → assign  [staff]
POST   /tickets/:id/close      → close   [staff]
POST   /tickets/:id/duplicate  → duplicate [staff]
POST   /tickets/:id/reopen     → reopen  [staff]
POST   /tickets/:id/comment    → comment [staff]
POST   /tickets/:id/response   → respond [staff]
GET    /tickets/:id/history    → getHistory [anon]
```
- `@UseInterceptors(PiiMaskInterceptor)` on controller class (FRD §F02.8)
- Anonymous routes get `getUser(req)` → null → category-filtered results
- Write routes require `requireAuthenticated(req)` — service enforces staff internally

### TicketsModule
- Imports: `CategoriesModule`, `PeopleModule`
- Providers: `TicketsService`, `TicketsRepository`
- Exports: `TicketsService` for Wave 4b Open311Module consumption

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `format.middleware.ts` `path` variable reference**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** Working-tree `format.middleware.ts` had `const path = req.path` removed but line 67 still referenced `path` variable — TypeScript error TS2304
- **Fix:** Changed `path.startsWith('/open311/v2')` to `originalPath.startsWith('/open311/v2')` (consistent with refactored variable name)
- **Files modified:** `src/common/middleware/format.middleware.ts`
- **Commit:** da8198c

**2. [Rule 1 - Design correction] Category lookup uses 'staff' role in `create()`**
- **Found during:** Task 1 implementation review
- **Issue:** Plan specified `categoriesService.findOne(category_id, null)` which would only find anonymous-level categories, blocking staff/public categories from being submitted
- **Fix:** Use `'staff'` role to load any category for permission checking (postingPermissionLevel is the relevant field, not displayPermissionLevel)
- **Files modified:** `src/modules/tickets/tickets.service.ts`
- **Commit:** da8198c

**3. [Rule 2 - Missing critical] `buildUpdateInput` type safety**
- **Found during:** Task 1 TypeScript check
- **Issue:** `PartialType(CreateTicketDto)` doesn't expose all parent fields to TypeScript strict-mode checker for properties like `addressId`, `contactMethod_id`, `responseMethod_id`, `reportedByPerson_id`
- **Fix:** Cast `dto` to `any` inside `buildUpdateInput` to bypass TS type limitation while preserving runtime correctness
- **Files modified:** `src/modules/tickets/tickets.service.ts`
- **Commit:** da8198c

## Integration Contracts Provided

```typescript
// TicketsModule exports
@Module({
  imports: [CategoriesModule, PeopleModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository],
  exports: [TicketsService],
})
export class TicketsModule {}

// TicketsService public interface
export class TicketsService {
  findAll(user: { id: number; role: string | null } | null): Promise<tickets[]>
  findOne(id: number, roleOrUser: ...): Promise<tickets>
  list(role: string | null | undefined, dto: ListTicketsDto): Promise<{total, page, pageSize, results}>
  create(dto: CreateTicketDto, user: ...): Promise<tickets>
  update(ticketId, dto, actorId): Promise<tickets>
  assign(id, dto, user): Promise<tickets>
  close(ticketId, dto, actorId): Promise<tickets>
  duplicate(ticketId, dto, actorId): Promise<tickets | null>
  addComment(ticketId, dto, actorId): Promise<ticketHistory>
  comment(id, dto, user): Promise<ticketHistory>
  addResponse(ticketId, dto, actorId): Promise<ticketHistory>
  respond(id, dto, user): Promise<ticketHistory>
  reopen(ticketId, dto, actorId): Promise<tickets>
  getHistory(ticketId, roleOrUser): Promise<ticketHistory[]>
}
```

## Wave 4b Integration Points (Open311Module — plan 10)

- `Open311Module` must import `TicketsModule` and inject `TicketsService`
- `POST /open311/v2/requests` → calls `ticketsService.create()` after api_key validation
- `GET /open311/v2/requests` → calls `ticketsService.list()` then maps to ServiceRequest shape
- `GET /open311/v2/requests/:id` → calls `ticketsService.findOne()` then maps to ServiceRequest shape
- Token lookup: `ticketHistory.data` where action='open' — plan 10 must handle token generation

## Self-Check

- ✅ `src/modules/tickets/tickets.module.ts` exists
- ✅ `src/modules/tickets/tickets.controller.ts` exists
- ✅ `src/modules/tickets/tickets.service.ts` exists
- ✅ `src/modules/tickets/tickets.repository.ts` exists
- ✅ All 8 DTOs exist under `src/modules/tickets/dto/`
- ✅ Commits `da8198c` and `910d870` exist in git log
- ✅ `npx tsc --noEmit` exits 0 with zero errors
