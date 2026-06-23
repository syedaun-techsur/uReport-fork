---
phase: wave-2-backend
plan: "05"
subsystem: admin-module
tags: [nestjs, admin, reference-data, crud, substatus, actions, issue-types, contact-methods]
dependency_graph:
  requires: [prisma/schema.prisma, PrismaModule, "@nestjs/mapped-types"]
  provides: [AdminModule, AdminService, SubstatusController, ActionsController, IssueTypesController, ContactMethodsController]
  affects: [AppModule]
tech_stack:
  added: ["@nestjs/mapped-types@^1.0.0"]
  patterns: [NestJS module pattern, PartialType DTOs, FK-delete guards, staff-role inline guard]
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
    - package.json
    - package-lock.json
decisions:
  - "Installed @nestjs/mapped-types to enable PartialType for UpdateSubstatusDto"
  - "DTO required properties use ! (definite assignment) for TypeScript strict mode compatibility"
  - "Staff role check implemented as inline requireStaff() helper per controller (Auth guard integration deferred to future wave)"
  - "tickets.contactMethod_id and responseMethod_id queried directly as raw fields (no Prisma @relation defined in schema) — Prisma allows filtering on raw FK fields without explicit relation declarations"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-06-23"
  tasks_completed: 2
  files_created: 16
  files_modified: 3
---

# Phase wave-2-backend Plan 05: AdminModule — Reference Data CRUD Summary

**One-liner:** NestJS AdminModule with 4 CRUD controllers (substatus, actions, issue-types, contact-methods), FK-delete guards, and system-action protection via shared AdminService.

## What Was Built

The AdminModule owns the four reference-data tables that drive ticket lifecycle, email notification routing, and form inputs across the uReport system. This plan delivered:

### AdminService (shared protection logic)
- `isSystemAction(action)` — guards against system-action deletion/rename
- `checkSubstatusDeleteConstraint(id)` — checks `tickets.substatus_id`, `categories.autoCloseSubstatus_id`
- `checkActionDeleteConstraint(id)` — checks `ticketHistory.action_id`, `department_actions.action_id`, `category_action_responses.action_id`
- `checkIssueTypeDeleteConstraint(id)` — checks `tickets.issueType_id`
- `checkContactMethodDeleteConstraint(id)` — checks `tickets.contactMethod_id`, `tickets.responseMethod_id`, `clients.contactMethod_id`

### SubstatusController (`/substatus`)
- Full CRUD: GET (list), GET `:id`, POST, PUT `:id`, DELETE `:id`
- All routes: staff only
- POST/PUT: validates at-most-one default per status (`open`/`closed`)
- DELETE: FK-delete guard via AdminService

### ActionsController (`/actions`)
- Full CRUD: GET (list), GET `:id`, POST, PUT `:id`, DELETE `:id`
- All routes: staff only
- POST: forces `type = 'department'` — system actions are seed-only
- PUT: system actions cannot have `name` changed (403); `template`/`replyEmail` can be updated
- DELETE: system actions cannot be deleted (403); non-system actions checked for FK references

### IssueTypesController (`/issue-types`)
- Full CRUD; all routes staff only
- DELETE: FK-delete guard checks `tickets.issueType_id`

### ContactMethodsController (`/contact-methods`)
- GET (list) and GET `:id`: **anonymous access** (used by public ticket-creation forms)
- POST, PUT, DELETE: staff only
- DELETE: FK-delete guard checks 3 FK paths (contactMethod, responseMethod, client)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `bb19a8b` | AdminService + SubstatusController + ActionsController |
| Task 2 | `1035b1b` | IssueTypesController + ContactMethodsController + wire AdminModule |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing `@nestjs/mapped-types` dependency**
- **Found during:** Task 1 — TypeScript compilation of `update-substatus.dto.ts`
- **Issue:** `@nestjs/mapped-types` was not in `package.json` but required by `PartialType` import in `UpdateSubstatusDto`
- **Fix:** `npm install @nestjs/mapped-types`
- **Files modified:** `package.json`, `package-lock.json`
- **Commit:** bb19a8b (included in Task 1 commit)

**2. [Rule 1 - Bug] TypeScript strict mode required `!` on DTO required properties**
- **Found during:** Task 1 — TypeScript compilation errors TS2564
- **Issue:** `name` and `description` in DTOs declared without initializers in strict TypeScript
- **Fix:** Added `!` (definite assignment assertion) to `CreateSubstatusDto.name`, `CreateSubstatusDto.description`, `CreateActionDto.name`, `CreateActionDto.description`; similarly for `CreateIssueTypeDto.name` and `CreateContactMethodDto.name`
- **Files modified:** All DTO files
- **Commit:** bb19a8b

## Self-Check

### Created files exist:
- ✅ `src/modules/admin/admin.module.ts`
- ✅ `src/modules/admin/admin.service.ts`
- ✅ `src/modules/admin/substatus/substatus.controller.ts`
- ✅ `src/modules/admin/actions/actions.controller.ts`
- ✅ `src/modules/admin/issue-types/issue-types.controller.ts`
- ✅ `src/modules/admin/contact-methods/contact-methods.controller.ts`

### Commits exist:
- ✅ `bb19a8b` — Task 1
- ✅ `1035b1b` — Task 2

### TypeScript: PASSED (zero errors)

## Self-Check: PASSED
