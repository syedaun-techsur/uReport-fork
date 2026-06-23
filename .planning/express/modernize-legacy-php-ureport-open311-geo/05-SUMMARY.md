---
phase: wave-2-backend
plan: "05"
subsystem: admin-reference-data
tags: [nestjs, prisma, crud, admin, reference-data, fk-guards]
dependency_graph:
  requires: [prisma/schema.prisma, PrismaModule]
  provides: [AdminModule, AdminService]
  affects: [src/app.module.ts]
tech_stack:
  added: ["@nestjs/mapped-types"]
  patterns: [NestJS Module/Controller/Service, DTO validation with class-validator, FK-delete constraint guards, system-action protection]
key_files:
  created:
    - src/modules/admin/admin.module.ts
    - src/modules/admin/admin.service.ts
    - src/modules/admin/substatus/substatus.controller.ts
    - src/modules/admin/substatus/substatus.service.ts
    - src/modules/admin/substatus/dto/create-substatus.dto.ts
    - src/modules/admin/substatus/dto/update-substatus.dto.ts
    - src/modules/admin/actions/actions.controller.ts
    - src/modules/admin/actions/actions.service.ts
    - src/modules/admin/actions/dto/create-action.dto.ts
    - src/modules/admin/actions/dto/update-action.dto.ts
    - src/modules/admin/issue-types/issue-types.controller.ts
    - src/modules/admin/issue-types/issue-types.service.ts
    - src/modules/admin/issue-types/dto/create-issue-type.dto.ts
    - src/modules/admin/contact-methods/contact-methods.controller.ts
    - src/modules/admin/contact-methods/contact-methods.service.ts
    - src/modules/admin/contact-methods/dto/create-contact-method.dto.ts
  modified:
    - src/app.module.ts
decisions:
  - "DTO required fields use `!` definite-assignment assertion to satisfy strictPropertyInitialization without class constructors"
  - "ContactMethodsController GET endpoints are anonymous; all mutation routes (POST/PUT/DELETE) require staff role"
  - "Actions type is always forced to 'department' on create; system actions are seed-only and protected from deletion and name change"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-23"
  tasks_completed: 2
  files_created: 16
  files_modified: 1
---

# Phase wave-2-backend Plan 05: AdminModule Summary

**One-liner:** AdminModule with 4 reference-data CRUD controllers (substatus, actions, issueTypes, contactMethods), FK-delete guards, and system-action protection using NestJS/Prisma.

## What Was Built

### AdminService (shared protection logic)
- `isSystemAction(action)` — identifies system-type actions
- `checkSubstatusDeleteConstraint(id)` — throws 409 if referenced by `tickets.substatus_id` or `categories.autoCloseSubstatus_id`
- `checkActionDeleteConstraint(id)` — throws 409 if referenced by `ticketHistory.action_id`, `department_actions`, or `category_action_responses`
- `checkIssueTypeDeleteConstraint(id)` — throws 409 if referenced by `tickets.issueType_id`
- `checkContactMethodDeleteConstraint(id)` — throws 409 if referenced by `tickets.contactMethod_id`, `tickets.responseMethod_id`, or `clients.contactMethod_id`

### SubstatusController (`/substatus`)
- All endpoints staff-only
- At-most-one default per `status` value enforced on create/update
- Delete blocked by FK constraint guard

### ActionsController (`/actions`)
- All endpoints staff-only
- `POST /actions` always creates with `type = 'department'` (system actions are seed-only)
- `PUT /actions/:id` on system action: allows template/replyEmail updates, blocks name changes (403)
- `DELETE /actions/:id` on system action: returns 403; on department action: checks FK references

### IssueTypesController (`/issue-types`)
- All endpoints staff-only
- Delete blocked when `tickets.issueType_id` references the record

### ContactMethodsController (`/contact-methods`)
- `GET /contact-methods` and `GET /contact-methods/:id` — anonymous access (used in public ticket-creation forms)
- `POST`, `PUT`, `DELETE` — staff-only
- Delete blocked when referenced by `tickets.contactMethod_id`, `tickets.responseMethod_id`, or `clients.contactMethod_id`

## Task Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | AdminService + SubstatusController + ActionsController | 64dbdde |
| 2 | IssueTypesController + ContactMethodsController + wire AdminModule into AppModule | 4a3b1f4 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed strictPropertyInitialization on DTO required fields**
- **Found during:** Task 1
- **Issue:** TypeScript strict mode (`strictPropertyInitialization`) reported errors on `name` and `description` properties in `CreateSubstatusDto` and `CreateActionDto` — these are required at runtime via class-validator but have no constructor initializer.
- **Fix:** Added `!` definite-assignment assertions (`name!: string`) to satisfy TypeScript without adding unnecessary constructors.
- **Files modified:** `src/modules/admin/substatus/dto/create-substatus.dto.ts`, `src/modules/admin/actions/dto/create-action.dto.ts`, `src/modules/admin/issue-types/dto/create-issue-type.dto.ts`, `src/modules/admin/contact-methods/dto/create-contact-method.dto.ts`

**2. [Rule 3 - Blocking] Installed @nestjs/mapped-types**
- **Found during:** Task 1
- **Issue:** `UpdateSubstatusDto` uses `PartialType` from `@nestjs/mapped-types`, which was not yet installed.
- **Fix:** `npm install @nestjs/mapped-types`

### Pre-existing Out-of-Scope Issues

`src/modules/auth/session.service.ts` has TypeScript errors related to `Session` type augmentation — these predate Plan 05 and are not caused by these changes. Logged as deferred.

## Self-Check: PASSED

- [x] `src/modules/admin/admin.module.ts` exists with all 4 controllers registered
- [x] `src/modules/admin/admin.service.ts` exports `AdminService` with all 5 guard methods
- [x] All 4 controllers exist at expected paths
- [x] `src/app.module.ts` imports `AdminModule`
- [x] Commits 64dbdde and 4a3b1f4 exist in git log
- [x] `npx tsc --noEmit` exits 0 for all admin-module files (pre-existing auth errors unrelated)
