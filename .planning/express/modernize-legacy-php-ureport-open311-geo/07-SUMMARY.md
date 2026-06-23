---
phase: wave-3-backend
plan: "07"
subsystem: categories-departments
tags: [nestjs, prisma, categories, departments, rbac, open311]
dependency_graph:
  requires: [prisma/schema.prisma, SerializationInterceptor, SessionService, AdminService]
  provides: [CategoriesModule, CategoriesService, DepartmentsModule, DepartmentsService]
  affects: [AppModule, Wave4-TicketsModule, Wave4-Open311Module, Wave5-NotificationsModule]
tech_stack:
  added: []
  patterns: [NestJS module/controller/service/repository, PartialType DTOs, Prisma thin-wrapper repository, role-based permission filtering]
key_files:
  created:
    - src/modules/categories/categories.module.ts
    - src/modules/categories/categories.controller.ts
    - src/modules/categories/categories.service.ts
    - src/modules/categories/categories.repository.ts
    - src/modules/categories/dto/create-category.dto.ts
    - src/modules/categories/dto/update-category.dto.ts
    - src/modules/categories/dto/create-category-group.dto.ts
    - src/modules/categories/dto/update-category-group.dto.ts
    - src/modules/categories/dto/upsert-action-response.dto.ts
    - src/modules/departments/departments.module.ts
    - src/modules/departments/departments.controller.ts
    - src/modules/departments/departments.service.ts
    - src/modules/departments/departments.repository.ts
    - src/modules/departments/dto/create-department.dto.ts
    - src/modules/departments/dto/update-department.dto.ts
  modified:
    - src/app.module.ts
decisions:
  - "Use find-then-create-or-update pattern for category_action_responses upsert (no unique composite key in schema)"
  - "Use correct Prisma relation names: category.department (not categories.departments), categoryGroup (not categoryGroups), department_categories.category (not categories)"
  - "displayPermissionLevel filter: staff→all 3 levels, authenticated citizen→public+anonymous, anonymous→anonymous only"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-23"
  tasks_completed: 2
  files_created: 15
  files_modified: 1
---

# Phase wave-3-backend Plan 07: CategoriesModule and DepartmentsModule Summary

**One-liner:** Full staff CRUD for service taxonomy — CategoriesModule (14-field categories + categoryGroups + category_action_responses with role-based visibility filtering) and DepartmentsModule (departments + department_categories/department_actions M:M junction management) wired into AppModule.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CategoriesModule — categories, categoryGroups, category_action_responses CRUD | 52a30a4 | 9 files created |
| 2 | DepartmentsModule — departments CRUD + M:M + AppModule wiring | c4f2153 (pre-existing) + app.module.ts | 6 files created, 1 modified |

## What Was Built

### CategoriesModule (Task 1)

**Routes:**
- `GET/POST/PUT/DELETE /categories` — full CRUD with displayPermissionLevel filtering on reads
- `GET/POST/PUT/DELETE /category-groups` — categoryGroup CRUD (name + ordering)
- `GET/POST/DELETE /categories/:categoryId/actions/:actionId/response` — category_action_responses upsert

**Business Logic:**
- `permissionFilter(role)`: staff→['staff','public','anonymous'], authenticated→['public','anonymous'], anonymous→['anonymous']
- `create()`/`update()`: validates department_id exists (404), customFields is valid JSON (400), autoCloseSubstatus_id references status='closed' substatus (400)
- `update()`: always sets `lastModified = new Date()`
- `remove()`: 409 ConflictException when tickets.category_id references the category
- `removeGroup()`: 409 ConflictException on Prisma P2003/P2014 FK violation
- `upsertActionResponse()`: find-then-create-or-update pattern (no composite unique constraint in schema)

### DepartmentsModule (Task 2)

**Routes:**
- `GET/POST/PUT/DELETE /departments` — full CRUD
- `GET/POST/DELETE /departments/:deptId/categories` — M:M junction management (FRD §F10.4)
- `GET/POST/DELETE /departments/:deptId/actions` — M:M junction management (FRD §F10.5)

**Business Logic:**
- `remove()`: 409 when categories.department_id or people.department_id references the department
- `addCategory()`/`addAction()`: handles P2002 duplicate as 409
- `removeCategory()`/`removeAction()`: handles P2025 not-found as 404

### AppModule Update

Added `CategoriesModule` and `DepartmentsModule` to imports alongside Wave 2 modules.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect Prisma relation names in CategoriesRepository**
- **Found during:** Task 1 implementation
- **Issue:** Plan specified `include: { categoryGroups: true, departments: true }` but the Prisma schema defines relation fields as `categoryGroup` (singular) and `department` (singular) on the `categories` model
- **Fix:** Changed includes to `{ categoryGroup: true, department: true }`
- **Files modified:** `src/modules/categories/categories.repository.ts`
- **Commit:** 52a30a4

**2. [Rule 1 - Bug] Added `!` definite assignment assertions to DTO required fields**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** TypeScript strict mode requires property initializers; `name` and `department_id` in DTOs had no initializer
- **Fix:** Added `!` non-null assertion to required DTO properties (`name!`, `department_id!`)
- **Files modified:** `src/modules/categories/dto/create-category.dto.ts`, `src/modules/categories/dto/create-category-group.dto.ts`
- **Commit:** 52a30a4

**3. [Rule 1 - Bug] Fixed incorrect Prisma relation names in DepartmentsRepository**
- **Found during:** Task 2 implementation
- **Issue:** Plan specified `include: { categories: true }` and `include: { actions: true }` but the Prisma schema defines relation fields as `category` (singular) and `action` (singular) on the junction table models
- **Fix:** Changed includes to `{ category: true }` and `{ action: true }`
- **Files modified:** `src/modules/departments/departments.repository.ts`
- **Commit:** c4f2153

**4. [Rule 1 - Bug] Removed duplicate AuthModule import from AppModule**
- **Found during:** Task 2 AppModule update
- **Issue:** The existing app.module.ts (updated by previous plans) already had `AuthModule` imported; our edit introduced a duplicate import causing TS2300 error
- **Fix:** Removed the duplicate import, preserved the existing file structure
- **Files modified:** `src/app.module.ts`
- **Commit:** (no-op — file already correct in HEAD)

**5. [Rule 1 - Note] Removed unnecessary `upsertActionResponse` stub from plan's repository**
- **Found during:** Task 1 review
- **Issue:** Plan's repository had a broken `upsertActionResponse` method using `id: 0` as placeholder which would never work; the service correctly uses findFirst+create-or-update
- **Fix:** Removed the broken upsert stub, kept only `createActionResponse` and `updateActionResponse` which the service calls correctly
- **Files modified:** `src/modules/categories/categories.repository.ts`
- **Commit:** 52a30a4

## Self-Check: PASSED

All created files exist and all contracts are satisfied:
- `CategoriesModule` exports `CategoriesService` ✓
- `DepartmentsModule` exports `DepartmentsService` ✓
- `AppModule` imports both modules ✓
- `npx tsc --noEmit` exits 0 with zero errors ✓
- All business logic guards (409 delete conflicts, 400 validation, 404 not-found) implemented ✓
- Role-based permission filtering on category GET endpoints ✓
