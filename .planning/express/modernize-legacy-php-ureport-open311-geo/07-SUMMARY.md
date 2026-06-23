---
phase: wave-3-backend
plan: "07"
subsystem: categories-departments
tags: [categories, departments, crud, permissions, m2m, nestjs, prisma]
dependency_graph:
  requires: [01-schema, 03-serialization, 04-auth-session, 05-admin]
  provides: [CategoriesModule, CategoriesService, DepartmentsModule, DepartmentsService]
  affects: [app.module.ts, wave-4-tickets, wave-4-open311]
tech_stack:
  added: []
  patterns: [NestJS module, Prisma repository pattern, permission-level filtering, find-then-upsert]
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
  - "Used Prisma relation connect objects (departmentsCreateInput) instead of raw IDs for type safety"
  - "Used find-then-create-or-update for category_action_responses upsert (no unique composite key in schema)"
  - "Corrected relation names from plan (categoryGroups→categoryGroup, departments→department) to match Prisma schema"
  - "DepartmentsRepository uses direct method signature (name, defaultPerson_id) instead of Prisma typed input to avoid relation vs ID type conflict"
metrics:
  duration: "~10 minutes"
  completed: "2026-06-23"
  tasks_completed: 2
  files_created: 15
  files_modified: 1
---

# Phase wave-3-backend Plan 07: CategoriesModule + DepartmentsModule Summary

**One-liner:** Full staff CRUD for categories (14 fields, permission filtering, JSON validation, autoClose guard), categoryGroups, category_action_responses upsert, and departments (M:M junction table management for department_categories + department_actions).

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | CategoriesModule — categories, categoryGroups, category_action_responses CRUD | f2e4eb1 | 9 files created |
| 2 | DepartmentsModule — departments CRUD + M:M associations + AppModule wiring | 3d00e07 | 6 files created, 1 modified |

## What Was Built

### CategoriesModule (`src/modules/categories/`)

- **CategoriesController** — `GET/POST/PUT/DELETE /categories`, `GET/POST/PUT/DELETE /category-groups`, `GET/POST/DELETE /categories/:categoryId/actions/:actionId/response`
- **CategoriesService** — Business logic:
  - `findAll(role)` applies `displayPermissionLevel` filter: anonymous→`['anonymous']`, public citizen→`['public','anonymous']`, staff→all levels (FRD §F02.5)
  - `create()` / `update()` validate: `department_id` exists (404), `customFields` is valid JSON (400), `autoCloseSubstatus_id` references `status='closed'` substatus (400)
  - Every write sets `lastModified = new Date()` (FRD §F10.1)
  - `remove()` throws 409 when any ticket has `category_id = id`
  - `removeGroup()` catches Prisma P2003/P2014 FK violation → 409
  - `upsertActionResponse()` uses find-then-create-or-update (no unique composite key in schema)
- **CategoriesRepository** — Thin Prisma wrapper; uses `categoryGroup` and `department` (singular) relation names matching schema
- **DTOs** — All 14 category fields validated with class-validator; `!` non-null assertions for strict mode compliance

### DepartmentsModule (`src/modules/departments/`)

- **DepartmentsController** — `GET/POST/PUT/DELETE /departments`, `GET/POST/DELETE /departments/:deptId/categories`, `GET/POST/DELETE /departments/:deptId/actions`
- **DepartmentsService** — Business logic:
  - `remove()` throws 409 when categories OR people reference the department
  - `addCategory/addAction()` handles P2002 (duplicate) → 409
  - `removeCategory/removeAction()` handles P2025 (not found) → 404
- **DepartmentsRepository** — Uses Prisma relation connect pattern for `defaultPerson`; uses `category` (singular) and `action` (singular) include relation names
- **DTOs** — name + optional defaultPerson_id

### AppModule Updates

Both `CategoriesModule` and `DepartmentsModule` imported alongside existing Wave 2/3 modules.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected Prisma relation names in repository includes**
- **Found during:** Task 1
- **Issue:** Plan template used `include: { categoryGroups: true, departments: true }` but Prisma schema defines singular relations `categoryGroup` and `department`
- **Fix:** Changed to `include: { categoryGroup: true, department: true }`
- **Files modified:** `src/modules/categories/categories.repository.ts`
- **Commit:** f2e4eb1

**2. [Rule 1 - Bug] Removed broken `upsertActionResponse` method from repository**
- **Found during:** Task 1
- **Issue:** Plan template included a `upsertActionResponse()` in repository that used a placeholder `id: 0` which would cause runtime errors; the service uses find-then-create-or-update pattern instead
- **Fix:** Removed the broken upsert from repository; only `createActionResponse`, `updateActionResponse`, `findActionResponse`, `deleteActionResponse` retained
- **Files modified:** `src/modules/categories/categories.repository.ts`
- **Commit:** f2e4eb1

**3. [Rule 2 - Missing critical] Added `!` definite assignment to DTO required fields**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** Strict TypeScript mode requires definite assignment assertions on class properties without initializers
- **Fix:** Added `!` to `name` in `CreateCategoryDto` and `CreateCategoryGroupDto`, and `department_id` in `CreateCategoryDto`; also added `!` to `name` in `CreateDepartmentDto` and association DTO fields
- **Files modified:** DTOs
- **Commit:** f2e4eb1, 3d00e07

**4. [Rule 1 - Bug] Changed service `create()` to use Prisma relation connect objects**
- **Found during:** Task 1
- **Issue:** Plan used `as any` cast with flat `department_id` field, which bypasses type safety; `categoriesCreateInput` requires relation connect objects not raw IDs
- **Fix:** Changed to `department: { connect: { id: dto.department_id } }` with optional relation objects for `defaultPerson` and `categoryGroup`
- **Files modified:** `src/modules/categories/categories.service.ts`
- **Commit:** f2e4eb1

**5. [Rule 1 - Bug] Changed DepartmentsRepository to use typed method signatures**
- **Found during:** Task 2
- **Issue:** `Prisma.departmentsCreateInput` requires relation connect objects, not raw `defaultPerson_id`; using the Prisma type directly would cause type errors
- **Fix:** Repository methods accept explicit `name` and `defaultPerson_id` parameters and construct Prisma relation objects internally
- **Files modified:** `src/modules/departments/departments.repository.ts`
- **Commit:** 3d00e07

**6. [Rule 1 - Bug] Corrected department_categories and department_actions include relation names**
- **Found during:** Task 2
- **Issue:** Plan used `include: { categories: true }` and `include: { actions: true }` but Prisma schema defines singular relations `category` and `action`
- **Fix:** Changed to `include: { category: true }` and `include: { action: true }`
- **Files modified:** `src/modules/departments/departments.repository.ts`
- **Commit:** 3d00e07

## Self-Check

### Files created:
- [x] `src/modules/categories/categories.module.ts`
- [x] `src/modules/categories/categories.controller.ts`
- [x] `src/modules/categories/categories.service.ts`
- [x] `src/modules/categories/categories.repository.ts`
- [x] `src/modules/categories/dto/create-category.dto.ts`
- [x] `src/modules/categories/dto/update-category.dto.ts`
- [x] `src/modules/categories/dto/create-category-group.dto.ts`
- [x] `src/modules/categories/dto/update-category-group.dto.ts`
- [x] `src/modules/categories/dto/upsert-action-response.dto.ts`
- [x] `src/modules/departments/departments.module.ts`
- [x] `src/modules/departments/departments.controller.ts`
- [x] `src/modules/departments/departments.service.ts`
- [x] `src/modules/departments/departments.repository.ts`
- [x] `src/modules/departments/dto/create-department.dto.ts`
- [x] `src/modules/departments/dto/update-department.dto.ts`

### Commits:
- [x] f2e4eb1 — Task 1 CategoriesModule
- [x] 3d00e07 — Task 2 DepartmentsModule

### TypeScript: zero errors (`npx tsc --noEmit` exits 0)

## Self-Check: PASSED
