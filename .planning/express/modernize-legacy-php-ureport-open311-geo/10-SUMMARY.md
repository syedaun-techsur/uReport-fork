# Plan 10: TicketsModule Part B — Lifecycle Operations Summary

**Phase:** wave-4-backend
**Plan:** 10
**Completed:** 2026-06-23
**Duration:** ~35 minutes

---

## One-Liner

TicketsModule Part B delivers all ticket lifecycle write operations (close, duplicate, comment, response, reopen, update with changeCategory/changeLocation audit trail) plus paginated RBAC-filtered list and history read endpoints, completing the P0 CRM feature.

---

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | TicketsRepository + TicketsService + DTOs | (committed via plan 11 SUMMARY + plan 10 service expansion) | `tickets.service.ts`, `tickets.repository.ts`, `dto/list-tickets.dto.ts`, `dto/comment-ticket.dto.ts` |
| 2 | TicketsController + TicketsModule + AppModule | `4322f5a` | `tickets.controller.ts`, `tickets.module.ts` |

---

## Key Files

### Created/Modified
- `src/modules/tickets/tickets.repository.ts` — Added `findAllPaginated()` (paginated + role-filtered), `getActionByName()`, `getSubstatus()`, `findDuplicateSubstatus()`, exported `permissionLevels()` helper
- `src/modules/tickets/tickets.service.ts` — Added `list()`, `addComment()`, `addResponse()`, unified lifecycle methods with dual-signature support (actorId: number | user object)
- `src/modules/tickets/tickets.controller.ts` — Updated to plan 10 spec: `requireStaff()` guards, `@HttpCode` decorators, `@Query() dto: ListTicketsDto`, per-route `PiiMaskInterceptor`
- `src/modules/tickets/tickets.module.ts` — Updated export comments with wave 5 integration notes
- `src/modules/tickets/dto/list-tickets.dto.ts` — New: `?status, ?category_id, ?assignedPerson_id, ?page, ?page_size`
- `src/modules/tickets/dto/comment-ticket.dto.ts` — Added `IsNotEmpty` validator (FRD §F01.6)

---

## Business Rules Implemented

### FRD §F01.4 — Close Ticket
- `409 ConflictException` when `ticket.status === 'closed'` (double-close guard)
- `400 BadRequestException` when `substatus.status !== 'closed'`
- Sets `status='closed'`, `substatus_id`, `closedDate=NOW()`, `lastModified=NOW()`
- Appends `closed` action to `ticketHistory`

### FRD §F01.5 — Mark as Duplicate
- `400 BadRequestException` on self-reference (`ticketId === parent_id`)
- `400 BadRequestException` when `child.parent_id !== null` (already parented)
- Closes child with 'Duplicate' substatus; appends `closed` history entry on child
- Appends `duplicate` action to **PARENT** ticketHistory only with `data = { duplicate: ticketId }`

### FRD §F01.6 — Add Comment
- `400 BadRequestException` when `notes` is empty
- Appends `comment` action; updates `lastModified`

### FRD §F01.7 — Add Response
- Resolves `actionPerson_id` to `ticket.reportedByPerson_id` when not supplied
- Appends `response` action; updates `lastModified`

### FRD §F01.8 — Reopen Ticket
- `409 ConflictException` when `ticket.status === 'open'` (double-open guard)
- Clears `closedDate` and `substatus_id`; appends `update` action

### FRD §F01.3 — Update Ticket
- `changeCategory` action with `data = { original, updated }` on `category_id` change
- `changeLocation` action with `data = { original, updated }` on `location` change
- `update` action for all other field changes

### FRD §F02.5 — RBAC Category Visibility
- `permissionLevels(role)` → `['staff','public','anonymous']` for staff, `['public','anonymous']` for authenticated, `['anonymous']` for anon
- Applied in `findAllPaginated()` via `category.displayPermissionLevel IN (levels)` WHERE clause

### FRD §F01.9 — Ticket History
- `getHistory()` verifies ticket visibility before returning
- Ordered by `enteredDate ASC`

---

## Route Catalog

```
GET    /tickets                → list (anon, paginated, RBAC-filtered) + PiiMaskInterceptor
POST   /tickets                → create (public)
GET    /tickets/:id            → detail (anon, RBAC-filtered) + PiiMaskInterceptor
PUT    /tickets/:id            → update (staff)
POST   /tickets/:id/assign     → assign (staff)
POST   /tickets/:id/close      → close (staff) → HTTP 200
POST   /tickets/:id/duplicate  → duplicate (staff) → HTTP 200
POST   /tickets/:id/reopen     → reopen (staff) → HTTP 200
POST   /tickets/:id/comment    → comment (staff) → HTTP 201
POST   /tickets/:id/response   → response (staff) → HTTP 201
GET    /tickets/:id/history    → history (anon) + PiiMaskInterceptor
```

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Prisma relation name mismatch**
- **Found during:** Task 1
- **Issue:** Plan spec used `categories` (plural) for ticket's category relation, but Prisma schema defines it as `category` (singular) in the `tickets` model
- **Fix:** Used `category` (singular) throughout repository queries — `include: { category: true }`, `category: { displayPermissionLevel: { in: levels } }`
- **Files modified:** `tickets.repository.ts`, `tickets.service.ts`

**2. [Rule 1 - Bug] ticketHistory uses `action` (singular) not `actions` (plural)**
- **Found during:** Task 1
- **Issue:** Plan spec referenced `actions: true` in `getHistory()` include, but Prisma schema defines the relation as `action` (singular)
- **Fix:** Used `action: true` in repository `getHistory()` query
- **Files modified:** `tickets.repository.ts`

**3. [Rule 1 - Improvement] Dual-signature service methods**
- **Found during:** Task 1
- **Issue:** Plan 09 already implemented the service with `user: { id, role }` object signatures; plan 10 controller expects `actorId: number` signatures
- **Fix:** Implemented overloaded signatures (`actorId: number | { id: number; role: string | null }`) for `close()`, `duplicate()`, `reopen()`, `update()`. Added `addComment()` and `addResponse()` as primary plan 10 methods; kept `comment()` and `respond()` as plan 09 aliases
- **Files modified:** `tickets.service.ts`

**4. [Rule 2 - Missing] `findDuplicateSubstatus()` moved to repository**
- **Found during:** Task 1
- **Issue:** Plan spec had a hacky `(this.repo as any).prisma.substatus.findFirst()` call in the service
- **Fix:** Added proper `findDuplicateSubstatus()` method to the repository; service calls `this.repo.findDuplicateSubstatus()`
- **Files modified:** `tickets.repository.ts`, `tickets.service.ts`

**5. [Rule 2 - Missing] Removed unused `NotFoundException` import from controller**
- **Found during:** Task 2
- **Issue:** Plan spec included `NotFoundException` in the controller import but it's not used
- **Fix:** Removed from import list
- **Files modified:** `tickets.controller.ts`

---

## Wave 5 Integration Hooks (stubs in place)

```typescript
// After close(), reopen(), update():
// HOOK: wave 5 — SolrService.indexTicket(ticketId) — fire-and-forget

// After close(), addComment(), addResponse(), duplicate():
// HOOK: wave 5 — NotificationsService.send(actionName, ticket, actorId)

// After update() when lat/lon changed:
// HOOK: wave 5 — GeoClusterService.assignClusters(ticketId, lat, lon)
```

---

## TypeScript Verification

```
npx tsc --noEmit → exit 0 (zero errors)
```

---

## Self-Check

| Check | Result |
|-------|--------|
| `src/modules/tickets/tickets.service.ts` exists | ✅ FOUND |
| `src/modules/tickets/tickets.repository.ts` exists | ✅ FOUND |
| `src/modules/tickets/tickets.controller.ts` exists | ✅ FOUND |
| `src/modules/tickets/tickets.module.ts` exists | ✅ FOUND |
| `src/modules/tickets/dto/list-tickets.dto.ts` exists | ✅ FOUND |
| All 7 plan 10 DTOs exist | ✅ FOUND |
| `TicketsModule` in `src/app.module.ts` | ✅ FOUND |
| Task 2 commit `4322f5a` exists | ✅ FOUND |
| TypeScript compiles with zero errors | ✅ PASSED |

## Self-Check: PASSED
