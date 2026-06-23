---
phase: wave-3-backend
plan: "08"
subsystem: people
tags: [people, clients, api-key, nestjs, prisma, crud, staff, rbac]
dependency_graph:
  requires: [prisma-schema, auth-module, admin-module]
  provides: [PeopleModule, PeopleService, ClientsService]
  affects: [app.module, prisma-schema-clients]
tech_stack:
  added: []
  patterns: [nestjs-module, class-validator-dtos, prisma-service, fk-constraint-guards, inline-staff-guard]
key_files:
  created:
    - prisma/schema.prisma (clients.active field added; reportedByPerson relation added)
    - src/modules/people/people.module.ts
    - src/modules/people/people.service.ts
    - src/modules/people/people.controller.ts
    - src/modules/people/clients.service.ts
    - src/modules/people/clients.controller.ts
    - src/modules/people/dto/create-person.dto.ts
    - src/modules/people/dto/update-person.dto.ts
    - src/modules/people/dto/create-email.dto.ts
    - src/modules/people/dto/update-email.dto.ts
    - src/modules/people/dto/create-phone.dto.ts
    - src/modules/people/dto/update-phone.dto.ts
    - src/modules/people/dto/create-address.dto.ts
    - src/modules/people/dto/update-address.dto.ts
    - src/modules/people/dto/create-client.dto.ts
    - src/modules/people/dto/update-client.dto.ts
    - src/modules/people/dto/person-search.dto.ts
  modified:
    - src/app.module.ts (PeopleModule imported)
decisions:
  - "Added active Boolean @default(true) to clients model — DDL conflict resolved per FRD/PRD specification (TechArch DDL omission treated as spec drafting gap)"
  - "Added missing reportedByPerson relation to tickets/people models (schema had the FK column but no Prisma relation)"
  - "Used inline requireStaff() guard pattern consistent with Wave 3 — CASL guard integration deferred to plan 06"
  - "UsersController declared in people.controller.ts to share requireStaff helper and PeopleService injection"
metrics:
  duration: ~15min
  completed: 2026-06-23
  tasks_completed: 2
  files_created: 17
  files_modified: 2
---

# Phase wave-3-backend Plan 08: PeopleModule Summary

## One-liner

Full NestJS PeopleModule with person/contact-sub-resource CRUD, staff user list, person search, and API client management including `findByApiKey(active=true)` integration point for Open311 wave.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Update Prisma schema (clients.active) + PeopleService + PeopleController | `0dfce13` | prisma/schema.prisma, people.service.ts, people.controller.ts, 9 DTOs |
| 2 | ClientsService + ClientsController + wire PeopleModule into AppModule | `c4f2153` | clients.service.ts, clients.controller.ts, people.module.ts, app.module.ts |

## What Was Built

### PeopleService (F11.1–F11.6)
- `findAll()` / `findOne(id)` — list and retrieve people with emails/phones/addresses included
- `create(dto)` — validates unique username (409 ConflictException) and department_id existence
- `update(id, dto)` — same validations, excludes self from username uniqueness check
- `remove(id)` — blocked (409) when person referenced by tickets (enteredBy/reportedBy/assignedTo), clients, or bookmarks
- `search(q, role?, department_id?)` — insensitive search over firstname/lastname/username/email; min 2 chars required (400)
- `findStaffUsers()` — returns people WHERE role='staff' with emails, ordered by lastname/firstname
- Full email/phone/address sub-resource CRUD (add/update/remove) with duplicate-email check on same person

### ClientsService (F11.7)
- `findAll()` / `findOne(id)` — CRUD with contactPerson included
- `findByApiKey(apiKey)` — **critical Open311 integration**: queries `WHERE api_key = ? AND active = TRUE`; returns null for inactive/missing clients
- `create(dto)` — unique api_key check (409), contactPerson_id existence check (404)
- `update(id, dto)` — api_key uniqueness on update, contactPerson validation
- `remove(id)` — blocked (409) when tickets.client_id references this client; error message recommends `active = false`

### Controllers
- `PeopleController` at `/people` — GET/POST/PUT/DELETE plus sub-resource routes for emails, phones, addresses
- `UsersController` at `/users` — GET returns staff-only people records
- `ClientsController` at `/clients` — GET/POST/PUT/DELETE; all staff-only

### Prisma Schema Changes
- `clients.active Boolean @default(true)` — DDL conflict resolved (FRD supersedes TechArch DDL omission)
- `clients.@@index([api_key])` — index added for api_key lookups
- `clients.contactPerson` relation named `"ClientContactPerson"` for disambiguation
- `tickets.reportedByPerson` / `people.ticketsReportedBy` — missing relation pair added (pre-existing schema bug auto-fixed per Rule 1)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added missing `reportedByPerson` relation to tickets/people models**
- **Found during:** Task 1 (prisma generate validation)
- **Issue:** `tickets.reportedByPerson_id` column existed in schema but no Prisma relation was defined (neither in `tickets` model nor back-relation in `people` model). This would cause `prisma generate` to produce incomplete types and the `PeopleService.remove()` OR clause over `reportedByPerson_id` would not be type-safe.
- **Fix:** Added `reportedByPerson people? @relation("TicketReportedBy", ...)` to `tickets` and `ticketsReportedBy tickets[] @relation("TicketReportedBy")` to `people`
- **Files modified:** `prisma/schema.prisma`
- **Commit:** `0dfce13`

**2. [Rule 1 - Bug] Fixed duplicate AuthModule import in app.module.ts**
- **Found during:** Task 2 TypeScript compilation
- **Issue:** The existing `app.module.ts` (modified by plan 06) already imported `AuthModule` on line 19; the plan's merge instruction added it again on line 21 causing TS2300 duplicate identifier error.
- **Fix:** Removed the duplicate import while preserving all existing wiring from plan 06 (AuthMiddleware, CaslGuard, AuthGuard, PiiMaskInterceptor)
- **Files modified:** `src/app.module.ts`
- **Commit:** `c4f2153`

**3. [Rule 1 - Bug] Fixed TS strictPropertyInitialization errors in DTOs**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** Required (non-optional) DTO properties (`email` in CreateEmailDto, `address` in CreateAddressDto, `q` in PersonSearchDto) lacked definite assignment assertions, causing strict mode errors.
- **Fix:** Added `!` assertion (`email!: string`, `address!: string`, `q!: string`)
- **Files modified:** `src/modules/people/dto/create-email.dto.ts`, `src/modules/people/dto/create-address.dto.ts`, `src/modules/people/dto/person-search.dto.ts`
- **Commit:** `0dfce13`

## Wave 4 Integration Points

- **Open311Module**: import `PeopleModule`, inject `ClientsService`, call `clientsService.findByApiKey(api_key)` on `POST /open311/v2/requests` — returns `null` for missing/inactive clients (caller issues 403)
- **TicketsModule**: import `PeopleModule`, inject `PeopleService`, call `peopleService.findOne(id)` for reporter/assignee validation
- **NotificationsModule**: import `PeopleModule`, inject `PeopleService`, load `peopleEmails` with `usedForNotifications = true`

## Self-Check

- [x] `prisma/schema.prisma` clients.active field: FOUND
- [x] `src/modules/people/people.service.ts`: FOUND
- [x] `src/modules/people/clients.service.ts`: FOUND
- [x] `src/modules/people/people.module.ts`: FOUND
- [x] `src/modules/people/clients.controller.ts`: FOUND
- [x] `src/modules/people/people.controller.ts`: FOUND
- [x] `PeopleModule` in `src/app.module.ts`: FOUND
- [x] Commit `0dfce13` (Task 1): FOUND
- [x] Commit `c4f2153` (Task 2): FOUND
- [x] `npx tsc --noEmit` exits 0: CONFIRMED

## Self-Check: PASSED
