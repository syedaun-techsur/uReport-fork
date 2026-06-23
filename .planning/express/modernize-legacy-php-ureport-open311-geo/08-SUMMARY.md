---
phase: wave-3-backend
plan: "08"
subsystem: people-module
tags: [people, clients, api-key, people-crud, contact-subresources, staff-users, open311-integration]
dependency_graph:
  requires: [prisma/schema.prisma, src/modules/auth/session.service.ts, package.json]
  provides: [src/modules/people/people.module.ts, src/modules/people/people.service.ts, src/modules/people/clients.service.ts]
  affects: [src/app.module.ts, prisma/schema.prisma]
tech_stack:
  added: []
  patterns: [NestJS module pattern, staff-only inline guard, Prisma FK constraint checks, active-flag revocation]
key_files:
  created:
    - src/modules/people/people.service.ts
    - src/modules/people/people.controller.ts
    - src/modules/people/clients.service.ts
    - src/modules/people/clients.controller.ts
    - src/modules/people/people.module.ts
    - src/modules/people/dto/create-person.dto.ts
    - src/modules/people/dto/update-person.dto.ts
    - src/modules/people/dto/create-email.dto.ts
    - src/modules/people/dto/update-email.dto.ts
    - src/modules/people/dto/create-phone.dto.ts
    - src/modules/people/dto/update-phone.dto.ts
    - src/modules/people/dto/create-address.dto.ts
    - src/modules/people/dto/update-address.dto.ts
    - src/modules/people/dto/person-search.dto.ts
    - src/modules/people/dto/create-client.dto.ts
    - src/modules/people/dto/update-client.dto.ts
  modified:
    - prisma/schema.prisma
    - src/app.module.ts
decisions:
  - "Added active Boolean @default(true) to clients model — DDL omission in TechArch §3.2 resolved per FRD F11.7 specification"
  - "Used named relation ClientContactPerson on clients model to disambiguate from future multi-relation scenarios"
  - "Added idx_clients_api_key index on clients.api_key for Open311 api_key lookup performance"
  - "UsersController declared in people.controller.ts (same file) to share requireStaff helper and PeopleService"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-23"
  tasks_completed: 2
  files_changed: 18
---

# Phase wave-3 Plan 08: PeopleModule Summary

**One-liner:** Full PeopleModule with person/email/phone/address CRUD, staff users list, search, and ClientsService.findByApiKey(active=true) for Open311 api_key validation.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Update Prisma schema (clients.active) + PeopleService + PeopleController | `10b3d07` | prisma/schema.prisma, people.service.ts, people.controller.ts, 9 DTOs |
| 2 | ClientsService + ClientsController + wire PeopleModule into AppModule | `bcbc370` | clients.service.ts, clients.controller.ts, people.module.ts, app.module.ts |

## What Was Built

### Prisma Schema Update
- Added `active Boolean @default(true)` to `clients` model — resolves DDL conflict between TechArch §3.2 (omission) and FRD F11.7 (explicit revocation mechanic)
- Named relation `ClientContactPerson` added to `clients` model for clarity
- Added `@@index([api_key], map: "idx_clients_api_key")` for Open311 lookup performance

### PeopleService (src/modules/people/people.service.ts)
- `findAll()` — paginated list with emails/phones/addresses included
- `findOne(id)` — single person with contact sub-resources; throws 404
- `create(dto)` — unique username check (409 on duplicate); department_id validation (404)
- `update(id, dto)` — same uniqueness and FK checks; throws 404 if not found
- `remove(id)` — pre-delete FK constraint checks against tickets (enteredBy/reportedBy/assignedTo), clients, and bookmarks — throws 409 on any hit
- `search(q, role?, department_id?)` — full-text search on firstname/lastname/username/email; min 2 chars
- `findStaffUsers()` — returns role='staff' people with emails and department included
- `addEmail/updateEmail/removeEmail` — email sub-resource with 409 on duplicate email for same person
- `addPhone/updatePhone/removePhone` — phone sub-resource
- `addAddress/updateAddress/removeAddress` — address sub-resource

### PeopleController (src/modules/people/people.controller.ts)
- `GET /people` — list all people (staff only)
- `GET /people/search?q=` — search with min 2-char constraint
- `GET /people/:id` — single person
- `POST /people` — create person
- `PUT /people/:id` — update person
- `DELETE /people/:id` — delete with FK guards
- `POST/PUT/DELETE /people/:id/emails/:emailId` — email sub-resource
- `POST/PUT/DELETE /people/:id/phones/:phoneId` — phone sub-resource
- `POST/PUT/DELETE /people/:id/addresses/:addrId` — address sub-resource

### UsersController (same file as PeopleController)
- `GET /users` — returns staff-role people with emails and department (staff only)

### ClientsService (src/modules/people/clients.service.ts)
- `findAll()` — list clients with contactPerson included
- `findOne(id)` — single client; throws 404
- **`findByApiKey(apiKey)`** — queries `WHERE api_key = apiKey AND active = true`; returns null for missing/inactive clients (Open311 integration contract)
- `create(dto)` — api_key uniqueness (409); contactPerson_id validation (404)
- `update(id, dto)` — api_key uniqueness on update; contactPerson_id validation
- `remove(id)` — blocked when `tickets.client_id` references client (409); error message recommends `active = false`

### ClientsController (src/modules/people/clients.controller.ts)
- `GET/POST/PUT/DELETE /clients` and `GET/PUT/DELETE /clients/:id` — all staff-only

### PeopleModule (src/modules/people/people.module.ts)
- Exports both `PeopleService` and `ClientsService` for Wave 4 consumer modules
- Controllers: PeopleController, UsersController, ClientsController
- Wired into AppModule

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TS2564 strict definite assignment on DTO required fields**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** `strict: true` in tsconfig.json requires `!` definite assignment assertion on required class properties with no default value
- **Fix:** Added `!` assertions to `email` (CreateEmailDto), `address` (CreateAddressDto), `q` (PersonSearchDto), `name/api_key/contactPerson_id` (CreateClientDto)
- **Files modified:** create-email.dto.ts, create-address.dto.ts, person-search.dto.ts, create-client.dto.ts
- **Commit:** 10b3d07 (email/address/search), bcbc370 (client DTOs)

**2. [Rule 1 - Bug] Prisma named relation disambiguation**
- **Found during:** Task 1 — `npx prisma generate`
- **Issue:** Adding `ClientContactPerson` relation name to `clients` model required the matching backref on `people.clients` to also use the named relation
- **Fix:** Updated `people.clients` backref to `@relation("ClientContactPerson")` in schema
- **Files modified:** prisma/schema.prisma
- **Commit:** 10b3d07

**3. [Rule 2 - Missing Critical] Added department include to findStaffUsers**
- **Found during:** Task 1 implementation
- **Issue:** Plan's `findStaffUsers()` comment said "department relation" but used a comment placeholder; the `people` model has a `department` relation available
- **Fix:** Added `department: true` to the `include` clause in `findStaffUsers()`
- **Files modified:** people.service.ts
- **Commit:** 10b3d07

## Wave 4 Integration Points

- **Open311Module** must import `PeopleModule` and inject `ClientsService` → call `clientsService.findByApiKey(api_key)` for `POST /open311/v2/requests` api_key validation; method returns `null` for missing or inactive clients (caller issues 403)
- **TicketsModule** must import `PeopleModule` and inject `PeopleService` → call `peopleService.findOne(id)` for reporter/assignee validation
- **NotificationsModule** must import `PeopleModule` and inject `PeopleService` → load `peopleEmails` with `usedForNotifications = true` for each recipient

## Self-Check: PASSED

All files verified present. All commits verified in git history.

| Check | Result |
|-------|--------|
| src/modules/people/people.service.ts | ✅ FOUND |
| src/modules/people/clients.service.ts | ✅ FOUND |
| src/modules/people/people.controller.ts | ✅ FOUND |
| src/modules/people/clients.controller.ts | ✅ FOUND |
| src/modules/people/people.module.ts | ✅ FOUND |
| prisma/schema.prisma | ✅ FOUND |
| commit 10b3d07 | ✅ FOUND |
| commit bcbc370 | ✅ FOUND |
| npx tsc --noEmit | ✅ 0 errors |
| npx prisma generate | ✅ Clean |
