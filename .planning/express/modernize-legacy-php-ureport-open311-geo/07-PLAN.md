---
phase: wave-3-backend
plan: 07
type: execute
wave: 3
depends_on: [2]
files_modified:
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
  - src/app.module.ts
autonomous: true

features:
  implements: ["F10"]
  depends_on: ["F6", "F3", "F4", "F14", "F15"]
  enables: ["F0", "F1", "F7"]

must_haves:
  truths:
    - "Staff can create, read, update, delete categories with all 14 schema fields"
    - "lastModified is updated on every category write operation"
    - "customFields is validated as valid JSON if provided; invalid JSON returns 400"
    - "displayPermissionLevel and postingPermissionLevel are enforced as staff|public|anonymous"
    - "autoCloseSubstatus_id must reference a substatus with status='closed'"
    - "Category delete is blocked with 409 when tickets reference the category"
    - "Staff can create, read, update, delete categoryGroups (name + ordering)"
    - "CategoryGroup delete is blocked (FK constraint) if categories reference it"
    - "Staff can create, read, update, delete departments (name + defaultPerson_id)"
    - "Department delete is blocked with 409 when categories or people reference it"
    - "POST /departments/:deptId/categories adds department_categories M:M row"
    - "DELETE /departments/:deptId/categories/:categoryId removes the M:M row"
    - "POST /departments/:deptId/actions adds department_actions M:M row"
    - "DELETE /departments/:deptId/actions/:actionId removes the M:M row"
    - "POST /categories/:categoryId/actions/:actionId/response upserts category_action_responses"
    - "GET /categories/:categoryId/actions/:actionId/response returns the override or 404"
    - "DELETE /categories/:categoryId/actions/:actionId/response removes the override"
    - "All write endpoints require staff role; GET endpoints are visible per displayPermissionLevel"
    - "CategoriesModule and DepartmentsModule imported into AppModule"
  artifacts:
    - path: "src/modules/categories/categories.module.ts"
      provides: "CategoriesModule — exports CategoriesService for Open311 and TicketsModule"
      exports: ["CategoriesModule", "CategoriesService"]
    - path: "src/modules/categories/categories.service.ts"
      provides: "CategoriesService — CRUD + permission filtering + customFields validation + lastModified update"
      exports: ["CategoriesService"]
    - path: "src/modules/categories/categories.repository.ts"
      provides: "CategoriesRepository — Prisma queries for categories, categoryGroups, category_action_responses"
      exports: ["CategoriesRepository"]
    - path: "src/modules/departments/departments.module.ts"
      provides: "DepartmentsModule — exports DepartmentsService"
      exports: ["DepartmentsModule", "DepartmentsService"]
    - path: "src/modules/departments/departments.service.ts"
      provides: "DepartmentsService — CRUD + M:M association management"
      exports: ["DepartmentsService"]
    - path: "src/modules/departments/departments.repository.ts"
      provides: "DepartmentsRepository — Prisma queries for departments, department_categories, department_actions"
      exports: ["DepartmentsRepository"]
  key_links:
    - from: "src/modules/categories/categories.controller.ts"
      to: "src/modules/categories/categories.service.ts"
      via: "NestJS DI injection"
      pattern: "categoriesService\\."
    - from: "src/modules/categories/categories.service.ts"
      to: "prisma/schema.prisma"
      via: "CategoriesRepository Prisma queries"
      pattern: "prisma\\.categories\\.(findMany|findUnique|create|update|delete)"
    - from: "src/modules/departments/departments.service.ts"
      to: "prisma/schema.prisma"
      via: "DepartmentsRepository Prisma queries"
      pattern: "prisma\\.departments\\.(findMany|findUnique|create|update|delete)"
    - from: "src/modules/categories/categories.service.ts"
      to: "src/modules/categories/categories.service.ts"
      via: "lastModified update on every write"
      pattern: "lastModified.*new Date\\(\\)"
    - from: "src/app.module.ts"
      to: "src/modules/categories/categories.module.ts"
      via: "AppModule imports"
      pattern: "CategoriesModule"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "prisma/schema.prisma"
      exports: ["categories", "categoryGroups", "departments", "department_categories", "department_actions", "category_action_responses"]
      verify: "grep -n 'model categories' prisma/schema.prisma && grep -n 'model departments' prisma/schema.prisma && grep -n 'model department_categories' prisma/schema.prisma && grep -n 'model category_action_responses' prisma/schema.prisma && echo CONTRACT_OK"
    - from_plan: "03"
      artifact: "src/common/interceptors/serialization.interceptor.ts"
      exports: ["SerializationInterceptor"]
      verify: "grep -n 'export.*SerializationInterceptor' src/common/interceptors/serialization.interceptor.ts && echo CONTRACT_OK"
    - from_plan: "04"
      artifact: "src/modules/auth/session.service.ts"
      exports: ["SessionService"]
      verify: "grep -n 'export class SessionService' src/modules/auth/session.service.ts && echo CONTRACT_OK"
    - from_plan: "05"
      artifact: "src/modules/admin/admin.service.ts"
      exports: ["AdminService"]
      verify: "grep -n 'export class AdminService' src/modules/admin/admin.service.ts && echo CONTRACT_OK"
  provides:
    - artifact: "src/modules/categories/categories.module.ts"
      exports: ["CategoriesModule", "CategoriesService"]
      shape: |
        @Module({ controllers: [CategoriesController], providers: [CategoriesService, CategoriesRepository], exports: [CategoriesService] })
        export class CategoriesModule {}
      verify: "grep -n 'export class CategoriesModule' src/modules/categories/categories.module.ts && grep -n 'CategoriesService' src/modules/categories/categories.module.ts && echo CONTRACT_OK"
    - artifact: "src/modules/categories/categories.service.ts"
      exports: ["CategoriesService"]
      shape: |
        @Injectable()
        export class CategoriesService {
          findAll(role?: string): Promise<categories[]>
          findOne(id: number, role?: string): Promise<categories>
          create(dto: CreateCategoryDto): Promise<categories>
          update(id: number, dto: UpdateCategoryDto): Promise<categories>
          remove(id: number): Promise<categories>
          findAllGroups(): Promise<categoryGroups[]>
          createGroup(dto: CreateCategoryGroupDto): Promise<categoryGroups>
          updateGroup(id: number, dto: UpdateCategoryGroupDto): Promise<categoryGroups>
          removeGroup(id: number): Promise<categoryGroups>
          getActionResponse(categoryId: number, actionId: number): Promise<category_action_responses | null>
          upsertActionResponse(categoryId: number, actionId: number, dto: UpsertActionResponseDto): Promise<category_action_responses>
          deleteActionResponse(categoryId: number, actionId: number): Promise<void>
        }
      verify: "grep -n 'export class CategoriesService' src/modules/categories/categories.service.ts && echo CONTRACT_OK"
    - artifact: "src/modules/departments/departments.module.ts"
      exports: ["DepartmentsModule", "DepartmentsService"]
      shape: |
        @Module({ controllers: [DepartmentsController], providers: [DepartmentsService, DepartmentsRepository], exports: [DepartmentsService] })
        export class DepartmentsModule {}
      verify: "grep -n 'export class DepartmentsModule' src/modules/departments/departments.module.ts && grep -n 'DepartmentsService' src/modules/departments/departments.module.ts && echo CONTRACT_OK"
    - artifact: "src/modules/departments/departments.service.ts"
      exports: ["DepartmentsService"]
      shape: |
        @Injectable()
        export class DepartmentsService {
          findAll(): Promise<departments[]>
          findOne(id: number): Promise<departments>
          create(dto: CreateDepartmentDto): Promise<departments>
          update(id: number, dto: UpdateDepartmentDto): Promise<departments>
          remove(id: number): Promise<departments>
          addCategory(deptId: number, categoryId: number): Promise<void>
          removeCategory(deptId: number, categoryId: number): Promise<void>
          listCategories(deptId: number): Promise<department_categories[]>
          addAction(deptId: number, actionId: number): Promise<void>
          removeAction(deptId: number, actionId: number): Promise<void>
          listActions(deptId: number): Promise<department_actions[]>
        }
      verify: "grep -n 'export class DepartmentsService' src/modules/departments/departments.service.ts && echo CONTRACT_OK"
---

<objective>
Implement CategoriesModule and DepartmentsModule — the full staff CRUD for the service taxonomy that gates all ticket routing, permission enforcement, and notification configuration across the system.

Purpose: Categories control which tickets are visible (displayPermissionLevel), who can post (postingPermissionLevel), how many days for resolution (slaDays), per-category notification reply addresses (notificationReplyEmail), and auto-close behavior. Departments own categories and have M:M associations with categories and actions that determine routing. These modules are prerequisites for Wave 4 (TicketsModule and Open311Module) which must resolve category visibility per request.

Output:
- `src/modules/categories/` — CategoriesController (categories + category-groups + action-response sub-routes), CategoriesService (visibility filtering, customFields validation, lastModified update), CategoriesRepository (Prisma), DTOs for all operations
- `src/modules/departments/` — DepartmentsController (departments + department_categories + department_actions sub-routes), DepartmentsService (delete guards, M:M management), DepartmentsRepository (Prisma), DTOs
- Both modules imported into AppModule; CategoriesService and DepartmentsService exported for Wave 4 consumption
</objective>

<feature_dependencies>
Implements: F10: Category & Department Administration — categories CRUD with customFields schema, SLA days, notificationReplyEmail, autoClose; categoryGroups CRUD; departments CRUD; department_categories and department_actions junction tables; category_action_responses upsert; featured categories
Depends on: F6: schema (categories, departments, categoryGroups, department_categories, department_actions, category_action_responses DDL in prisma/schema.prisma); F3: SerializationInterceptor (all responses format-negotiated); F4: SessionService (staff auth check); F14: GelfLoggerService; F15: AdminService
Enables: F0: Open311Module reads category visibility (displayPermissionLevel) and customFields; F1: TicketsModule routes to departments; F7: NotificationsModule reads category_action_responses and notificationReplyEmail
</feature_dependencies>

<execution_context>
@.planning/express/modernize-legacy-php-ureport-open311-geo/WAVE-SCHEDULE.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@project_specs/TechArch-uReport.md
@project_specs/FRD-uReport.md
@.planning/express/modernize-legacy-php-ureport-open311-geo/05-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: CategoriesModule — categories, categoryGroups, category_action_responses CRUD</name>
  <files>
    src/modules/categories/categories.module.ts
    src/modules/categories/categories.controller.ts
    src/modules/categories/categories.service.ts
    src/modules/categories/categories.repository.ts
    src/modules/categories/dto/create-category.dto.ts
    src/modules/categories/dto/update-category.dto.ts
    src/modules/categories/dto/create-category-group.dto.ts
    src/modules/categories/dto/update-category-group.dto.ts
    src/modules/categories/dto/upsert-action-response.dto.ts
  </files>
  <action>
Create the full CategoriesModule with all category, categoryGroup, and category_action_responses CRUD.

## Directory structure

```
src/modules/categories/
├── categories.module.ts
├── categories.controller.ts
├── categories.service.ts
├── categories.repository.ts
└── dto/
    ├── create-category.dto.ts
    ├── update-category.dto.ts
    ├── create-category-group.dto.ts
    ├── update-category-group.dto.ts
    └── upsert-action-response.dto.ts
```

---

### src/modules/categories/dto/create-category.dto.ts

All 14 fields from TechArch §3.2 `categories` DDL and FRD §F10.1:

```typescript
import {
  IsString, MaxLength, IsInt, IsOptional, IsBoolean, IsIn, IsEmail,
  IsJSON,
} from 'class-validator';
import { Type } from 'class-transformer';

const PERMISSION_LEVELS = ['staff', 'public', 'anonymous'] as const;

export class CreateCategoryDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @IsInt()
  @Type(() => Number)
  department_id: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  defaultPerson_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryGroup_id?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsIn(PERMISSION_LEVELS)
  displayPermissionLevel: 'staff' | 'public' | 'anonymous' = 'staff';

  @IsIn(PERMISSION_LEVELS)
  postingPermissionLevel: 'staff' | 'public' | 'anonymous' = 'staff';

  @IsOptional()
  @IsString()
  @IsJSON()
  customFields?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  slaDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  @IsEmail()
  notificationReplyEmail?: string;

  @IsOptional()
  @IsBoolean()
  autoCloseIsActive?: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  autoCloseSubstatus_id?: number;
}
```

### src/modules/categories/dto/update-category.dto.ts

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from './create-category.dto';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
```

### src/modules/categories/dto/create-category-group.dto.ts

Per FRD §F10.2: name max 50, ordering optional non-negative integer.

```typescript
import { IsString, MaxLength, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoryGroupDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  ordering?: number;
}
```

### src/modules/categories/dto/update-category-group.dto.ts

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryGroupDto } from './create-category-group.dto';

export class UpdateCategoryGroupDto extends PartialType(CreateCategoryGroupDto) {}
```

### src/modules/categories/dto/upsert-action-response.dto.ts

Per FRD §F10.6 — `category_action_responses` fields:

```typescript
import { IsOptional, IsString, MaxLength, IsEmail } from 'class-validator';

export class UpsertActionResponseDto {
  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  @IsEmail()
  replyEmail?: string;
}
```

---

### src/modules/categories/categories.repository.ts

Thin Prisma wrapper — business logic stays in the service:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Categories ----

  findAll(where?: Prisma.categoriesWhereInput) {
    return this.prisma.categories.findMany({
      where,
      include: { categoryGroups: true, departments: true },
      orderBy: { id: 'asc' },
    });
  }

  findOne(id: number) {
    return this.prisma.categories.findUnique({
      where: { id },
      include: { categoryGroups: true, departments: true },
    });
  }

  create(data: Prisma.categoriesCreateInput) {
    return this.prisma.categories.create({ data });
  }

  update(id: number, data: Prisma.categoriesUpdateInput) {
    return this.prisma.categories.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.prisma.categories.delete({ where: { id } });
  }

  countTickets(categoryId: number) {
    return this.prisma.tickets.count({ where: { category_id: categoryId } });
  }

  // ---- CategoryGroups ----

  findAllGroups() {
    return this.prisma.categoryGroups.findMany({ orderBy: { ordering: 'asc' } });
  }

  findOneGroup(id: number) {
    return this.prisma.categoryGroups.findUnique({ where: { id } });
  }

  createGroup(data: Prisma.categoryGroupsCreateInput) {
    return this.prisma.categoryGroups.create({ data });
  }

  updateGroup(id: number, data: Prisma.categoryGroupsUpdateInput) {
    return this.prisma.categoryGroups.update({ where: { id }, data });
  }

  deleteGroup(id: number) {
    return this.prisma.categoryGroups.delete({ where: { id } });
  }

  // ---- Category Action Responses ----

  findActionResponse(categoryId: number, actionId: number) {
    return this.prisma.category_action_responses.findFirst({
      where: { category_id: categoryId, action_id: actionId },
    });
  }

  upsertActionResponse(categoryId: number, actionId: number, template?: string | null, replyEmail?: string | null) {
    // Use upsert on the composite key (category_id, action_id)
    // The schema has no @unique composite, so we check-then-create-or-update in the service
    return this.prisma.category_action_responses.upsert({
      where: {
        // Prisma requires a unique constraint for upsert — use findFirst + create/update pattern in service
        // This repository method signature is used by the service which calls findFirst then create/update
        id: 0, // placeholder — service uses findActionResponse + createOrUpdateActionResponse
      } as any,
      create: { category_id: categoryId, action_id: actionId, template: template ?? null, replyEmail: replyEmail ?? null },
      update: { template: template ?? null, replyEmail: replyEmail ?? null },
    });
  }

  createActionResponse(categoryId: number, actionId: number, template?: string | null, replyEmail?: string | null) {
    return this.prisma.category_action_responses.create({
      data: { category_id: categoryId, action_id: actionId, template: template ?? null, replyEmail: replyEmail ?? null },
    });
  }

  updateActionResponse(id: number, template?: string | null, replyEmail?: string | null) {
    return this.prisma.category_action_responses.update({
      where: { id },
      data: { template: template ?? null, replyEmail: replyEmail ?? null },
    });
  }

  deleteActionResponse(categoryId: number, actionId: number) {
    return this.prisma.category_action_responses.deleteMany({
      where: { category_id: categoryId, action_id: actionId },
    });
  }
}
```

---

### src/modules/categories/categories.service.ts

Business logic per FRD §F10.1–F10.7 and TechArch §2.1 CategoriesModule:

```typescript
import {
  Injectable, NotFoundException, BadRequestException,
  ConflictException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateCategoryGroupDto } from './dto/create-category-group.dto';
import { UpdateCategoryGroupDto } from './dto/update-category-group.dto';
import { UpsertActionResponseDto } from './dto/upsert-action-response.dto';

/** Map role string to permissionLevel filter (FRD §F02.5) */
function permissionFilter(role: string | null | undefined): string[] {
  if (role === 'staff') return ['staff', 'public', 'anonymous'];
  if (role) return ['public', 'anonymous']; // authenticated citizen
  return ['anonymous']; // anonymous
}

@Injectable()
export class CategoriesService {
  constructor(
    private readonly repo: CategoriesRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ---- Category CRUD ----

  /** List categories filtered by caller's display permission level (FRD §F02.5) */
  async findAll(role?: string | null) {
    const levels = permissionFilter(role);
    return this.repo.findAll({ displayPermissionLevel: { in: levels } });
  }

  /** Get a single category; 404 if not visible to caller's role (FRD §F10.1) */
  async findOne(id: number, role?: string | null) {
    const category = await this.repo.findOne(id);
    if (!category) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Category not found' });
    const levels = permissionFilter(role);
    if (!levels.includes(category.displayPermissionLevel)) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Category not found' });
    }
    return category;
  }

  /** Create a category; staff only (enforced at controller). Updates lastModified to NOW(). */
  async create(dto: CreateCategoryDto) {
    // Validate department exists
    const dept = await this.prisma.departments.findUnique({ where: { id: dto.department_id } });
    if (!dept) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Department not found' });

    // Validate customFields is valid JSON if provided (dto validator catches this too; belt+suspenders)
    if (dto.customFields !== undefined && dto.customFields !== null) {
      try { JSON.parse(dto.customFields); } catch {
        throw new BadRequestException({ error: 'INVALID_INPUT', message: 'customFields must be valid JSON' });
      }
    }

    // Validate autoCloseSubstatus_id references a closed substatus
    if (dto.autoCloseSubstatus_id !== undefined) {
      const sub = await this.prisma.substatus.findUnique({ where: { id: dto.autoCloseSubstatus_id } });
      if (!sub || sub.status !== 'closed') {
        throw new BadRequestException({
          error: 'INVALID_INPUT',
          message: 'autoCloseSubstatus_id must reference a sub-status with status=closed',
        });
      }
    }

    return this.repo.create({
      name: dto.name,
      description: dto.description ?? null,
      department_id: dto.department_id,
      defaultPerson_id: dto.defaultPerson_id ?? null,
      categoryGroup_id: dto.categoryGroup_id ?? null,
      active: dto.active ?? null,
      featured: dto.featured ?? null,
      displayPermissionLevel: dto.displayPermissionLevel,
      postingPermissionLevel: dto.postingPermissionLevel,
      customFields: dto.customFields ?? null,
      lastModified: new Date(),
      slaDays: dto.slaDays ?? null,
      notificationReplyEmail: dto.notificationReplyEmail ?? null,
      autoCloseIsActive: dto.autoCloseIsActive ?? null,
      autoCloseSubstatus_id: dto.autoCloseSubstatus_id ?? null,
    } as any);
  }

  /** Update a category; sets lastModified = NOW() (FRD §F10.1) */
  async update(id: number, dto: UpdateCategoryDto) {
    // Confirm category exists (throws 404 if not)
    await this.repo.findOne(id).then(c => {
      if (!c) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Category not found' });
    });

    if (dto.department_id !== undefined) {
      const dept = await this.prisma.departments.findUnique({ where: { id: dto.department_id } });
      if (!dept) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Department not found' });
    }

    if (dto.customFields !== undefined && dto.customFields !== null) {
      try { JSON.parse(dto.customFields); } catch {
        throw new BadRequestException({ error: 'INVALID_INPUT', message: 'customFields must be valid JSON' });
      }
    }

    if (dto.autoCloseSubstatus_id !== undefined) {
      const sub = await this.prisma.substatus.findUnique({ where: { id: dto.autoCloseSubstatus_id } });
      if (!sub || sub.status !== 'closed') {
        throw new BadRequestException({
          error: 'INVALID_INPUT',
          message: 'autoCloseSubstatus_id must reference a sub-status with status=closed',
        });
      }
    }

    return this.repo.update(id, {
      ...dto,
      lastModified: new Date(), // always update lastModified on write
    } as any);
  }

  /** Delete a category; blocked with 409 if tickets reference it (FRD §F10.1) */
  async remove(id: number) {
    const category = await this.repo.findOne(id);
    if (!category) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Category not found' });

    const ticketCount = await this.repo.countTickets(id);
    if (ticketCount > 0) {
      throw new ConflictException({ error: 'CONFLICT', message: 'Cannot delete category with existing tickets' });
    }

    return this.repo.delete(id);
  }

  // ---- CategoryGroup CRUD ----

  findAllGroups() {
    return this.repo.findAllGroups();
  }

  async findOneGroup(id: number) {
    const group = await this.repo.findOneGroup(id);
    if (!group) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Category group not found' });
    return group;
  }

  async createGroup(dto: CreateCategoryGroupDto) {
    return this.repo.createGroup({ name: dto.name, ordering: dto.ordering ?? null } as any);
  }

  async updateGroup(id: number, dto: UpdateCategoryGroupDto) {
    await this.findOneGroup(id);
    return this.repo.updateGroup(id, dto as any);
  }

  async removeGroup(id: number) {
    await this.findOneGroup(id);
    // FK constraint on categories.categoryGroup_id will throw Prisma P2003 on violation
    try {
      return await this.repo.deleteGroup(id);
    } catch (err: any) {
      if (err?.code === 'P2003' || err?.code === 'P2014') {
        throw new ConflictException({
          error: 'CONFLICT',
          message: 'Cannot delete category group — referenced by categories',
        });
      }
      throw err;
    }
  }

  // ---- Category Action Responses ----

  async getActionResponse(categoryId: number, actionId: number) {
    const car = await this.repo.findActionResponse(categoryId, actionId);
    if (!car) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Action response not found' });
    return car;
  }

  async upsertActionResponse(categoryId: number, actionId: number, dto: UpsertActionResponseDto) {
    // Verify category and action exist
    const category = await this.repo.findOne(categoryId);
    if (!category) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Category not found' });
    const action = await this.prisma.actions.findUnique({ where: { id: actionId } });
    if (!action) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Action not found' });

    const existing = await this.repo.findActionResponse(categoryId, actionId);
    if (existing) {
      return this.repo.updateActionResponse(existing.id, dto.template ?? null, dto.replyEmail ?? null);
    }
    return this.repo.createActionResponse(categoryId, actionId, dto.template ?? null, dto.replyEmail ?? null);
  }

  async deleteActionResponse(categoryId: number, actionId: number) {
    const existing = await this.repo.findActionResponse(categoryId, actionId);
    if (!existing) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Action response not found' });
    await this.repo.deleteActionResponse(categoryId, actionId);
  }
}
```

---

### src/modules/categories/categories.controller.ts

Route prefixes: `/categories`, `/category-groups` per TechArch §2.1.
Category action responses sub-route: `/categories/:categoryId/actions/:actionId/response`.

All write routes require staff role. GET list/detail routes enforce permission level visibility via the service layer (not the controller).

```typescript
import {
  Controller, Get, Post, Put, Delete, Patch,
  Param, Body, ParseIntPipe, ForbiddenException, NotFoundException,
  HttpCode, Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateCategoryGroupDto } from './dto/create-category-group.dto';
import { UpdateCategoryGroupDto } from './dto/update-category-group.dto';
import { UpsertActionResponseDto } from './dto/upsert-action-response.dto';

function getUserRole(req: Request): string | null | undefined {
  return (req as any).user?.role;
}

function requireStaff(req: Request): void {
  const role = getUserRole(req);
  if (role !== 'staff') throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Staff access required' });
}

@Controller()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ---- Categories ----

  /** GET /categories — list visible categories per caller's role (FRD §F10.1, §F02.5) */
  @Get('categories')
  findAll(@Req() req: Request) {
    return this.categoriesService.findAll(getUserRole(req));
  }

  /** GET /categories/:id */
  @Get('categories/:id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.categoriesService.findOne(id, getUserRole(req));
  }

  /** POST /categories — staff only */
  @Post('categories')
  create(@Body() dto: CreateCategoryDto, @Req() req: Request) {
    requireStaff(req);
    return this.categoriesService.create(dto);
  }

  /** PUT /categories/:id — staff only */
  @Put('categories/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.categoriesService.update(id, dto);
  }

  /** DELETE /categories/:id — staff only */
  @Delete('categories/:id')
  @HttpCode(200)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.categoriesService.remove(id);
  }

  // ---- CategoryGroups ----

  /** GET /category-groups */
  @Get('category-groups')
  findAllGroups() {
    return this.categoriesService.findAllGroups();
  }

  /** GET /category-groups/:id */
  @Get('category-groups/:id')
  findOneGroup(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOneGroup(id);
  }

  /** POST /category-groups — staff only */
  @Post('category-groups')
  createGroup(@Body() dto: CreateCategoryGroupDto, @Req() req: Request) {
    requireStaff(req);
    return this.categoriesService.createGroup(dto);
  }

  /** PUT /category-groups/:id — staff only */
  @Put('category-groups/:id')
  updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryGroupDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.categoriesService.updateGroup(id, dto);
  }

  /** DELETE /category-groups/:id — staff only */
  @Delete('category-groups/:id')
  @HttpCode(200)
  removeGroup(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.categoriesService.removeGroup(id);
  }

  // ---- Category Action Responses ----

  /** GET /categories/:categoryId/actions/:actionId/response (FRD §F10.6) */
  @Get('categories/:categoryId/actions/:actionId/response')
  getActionResponse(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('actionId', ParseIntPipe) actionId: number,
  ) {
    return this.categoriesService.getActionResponse(categoryId, actionId);
  }

  /** POST /categories/:categoryId/actions/:actionId/response — upsert, staff only */
  @Post('categories/:categoryId/actions/:actionId/response')
  upsertActionResponse(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('actionId', ParseIntPipe) actionId: number,
    @Body() dto: UpsertActionResponseDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.categoriesService.upsertActionResponse(categoryId, actionId, dto);
  }

  /** DELETE /categories/:categoryId/actions/:actionId/response — staff only */
  @Delete('categories/:categoryId/actions/:actionId/response')
  @HttpCode(204)
  async deleteActionResponse(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('actionId', ParseIntPipe) actionId: number,
    @Req() req: Request,
  ) {
    requireStaff(req);
    await this.categoriesService.deleteActionResponse(categoryId, actionId);
  }
}
```

---

### src/modules/categories/categories.module.ts

```typescript
import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoriesRepository } from './categories.repository';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoriesRepository],
  exports: [CategoriesService],  // exported for Open311Module + TicketsModule consumption (Wave 4)
})
export class CategoriesModule {}
```
  </action>
  <verify>
```bash
npx tsc --noEmit 2>&1 | grep -E 'categories|category' | head -20 && echo "TSC_CATEGORIES_OK"
grep -n 'export class CategoriesService' src/modules/categories/categories.service.ts && echo CONTRACT_OK
grep -n 'export class CategoriesModule' src/modules/categories/categories.module.ts && echo CONTRACT_OK
grep -n 'CategoriesService' src/modules/categories/categories.module.ts | grep 'exports' && echo EXPORTS_OK
grep -n 'lastModified.*new Date' src/modules/categories/categories.service.ts && echo LAST_MODIFIED_OK
grep -n 'customFields.*valid JSON\|customFields must be' src/modules/categories/categories.service.ts && echo CUSTOM_FIELDS_VALIDATED_OK
grep -n 'status.*closed.*autoClose\|autoClose.*status.*closed' src/modules/categories/categories.service.ts && echo AUTO_CLOSE_VALIDATED_OK
grep -n 'Cannot delete category with existing tickets' src/modules/categories/categories.service.ts && echo DELETE_GUARD_OK
grep -n 'category-groups\|categoryGroups' src/modules/categories/categories.controller.ts && echo GROUPS_ROUTES_OK
grep -n 'actions.*response\|action-response' src/modules/categories/categories.controller.ts && echo ACTION_RESPONSE_ROUTES_OK
```
  </verify>
  <done>
- `src/modules/categories/categories.module.ts` exports `CategoriesService`
- `CategoriesService.findAll(role)` applies `displayPermissionLevel` filter per role (FRD §F02.5): anonymous→['anonymous'], public→['public','anonymous'], staff→no filter
- `CategoriesService.create()` validates `department_id` exists, `customFields` is valid JSON, `autoCloseSubstatus_id` references a `status='closed'` substatus
- `CategoriesService.update()` sets `lastModified = new Date()` on every write
- `CategoriesService.remove()` throws 409 when `tickets` table has rows with `category_id = id`
- `CategoriesService.removeGroup()` throws 409 on Prisma P2003/P2014 FK violation
- `upsertActionResponse()` uses findFirst-then-create-or-update pattern (no unique composite key in schema)
- Controller routes: `GET/POST/PUT/DELETE /categories`, `GET/POST/PUT/DELETE /category-groups`, `GET/POST/DELETE /categories/:categoryId/actions/:actionId/response`
- All mutation routes call `requireStaff()` before delegating to service
- `npx tsc --noEmit` shows zero errors for categories module files
  </done>
</task>

<task type="auto">
  <name>Task 2: DepartmentsModule — departments CRUD + M:M association management + wire both modules into AppModule</name>
  <files>
    src/modules/departments/departments.module.ts
    src/modules/departments/departments.controller.ts
    src/modules/departments/departments.service.ts
    src/modules/departments/departments.repository.ts
    src/modules/departments/dto/create-department.dto.ts
    src/modules/departments/dto/update-department.dto.ts
    src/app.module.ts
  </files>
  <action>
Create DepartmentsModule with departments CRUD and department_categories / department_actions M:M sub-routes. Then update AppModule to import both CategoriesModule and DepartmentsModule.

## Directory structure

```
src/modules/departments/
├── departments.module.ts
├── departments.controller.ts
├── departments.service.ts
├── departments.repository.ts
└── dto/
    ├── create-department.dto.ts
    └── update-department.dto.ts
```

---

### src/modules/departments/dto/create-department.dto.ts

Per FRD §F10.3 / TechArch §3.2 `departments` DDL:

```typescript
import { IsString, MaxLength, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDepartmentDto {
  @IsString()
  @MaxLength(128)
  name: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  defaultPerson_id?: number;
}
```

### src/modules/departments/dto/update-department.dto.ts

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateDepartmentDto } from './create-department.dto';

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}
```

---

### src/modules/departments/departments.repository.ts

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

@Injectable()
export class DepartmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Departments ----

  findAll() {
    return this.prisma.departments.findMany({ orderBy: { id: 'asc' } });
  }

  findOne(id: number) {
    return this.prisma.departments.findUnique({ where: { id } });
  }

  create(data: Prisma.departmentsCreateInput) {
    return this.prisma.departments.create({ data });
  }

  update(id: number, data: Prisma.departmentsUpdateInput) {
    return this.prisma.departments.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.prisma.departments.delete({ where: { id } });
  }

  countCategoriesByDept(deptId: number) {
    return this.prisma.categories.count({ where: { department_id: deptId } });
  }

  countPeopleByDept(deptId: number) {
    return this.prisma.people.count({ where: { department_id: deptId } });
  }

  // ---- Department-Categories M:M ----

  listCategories(deptId: number) {
    return this.prisma.department_categories.findMany({
      where: { department_id: deptId },
      include: { categories: true },
    });
  }

  addCategory(deptId: number, categoryId: number) {
    return this.prisma.department_categories.create({
      data: { department_id: deptId, category_id: categoryId },
    });
  }

  removeCategory(deptId: number, categoryId: number) {
    return this.prisma.department_categories.delete({
      where: { department_id_category_id: { department_id: deptId, category_id: categoryId } },
    });
  }

  // ---- Department-Actions M:M ----

  listActions(deptId: number) {
    return this.prisma.department_actions.findMany({
      where: { department_id: deptId },
      include: { actions: true },
    });
  }

  addAction(deptId: number, actionId: number) {
    return this.prisma.department_actions.create({
      data: { department_id: deptId, action_id: actionId },
    });
  }

  removeAction(deptId: number, actionId: number) {
    return this.prisma.department_actions.delete({
      where: { department_id_action_id: { department_id: deptId, action_id: actionId } },
    });
  }
}
```

---

### src/modules/departments/departments.service.ts

Business logic per FRD §F10.3–F10.5. Delete constraint: blocked if categories or people reference the department.

```typescript
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DepartmentsRepository } from './departments.repository';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly repo: DepartmentsRepository,
    private readonly prisma: PrismaService,
  ) {}

  findAll() {
    return this.repo.findAll();
  }

  async findOne(id: number) {
    const dept = await this.repo.findOne(id);
    if (!dept) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Department not found' });
    return dept;
  }

  async create(dto: CreateDepartmentDto) {
    if (dto.defaultPerson_id !== undefined) {
      const person = await this.prisma.people.findUnique({ where: { id: dto.defaultPerson_id } });
      if (!person) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Default person not found' });
    }
    return this.repo.create({ name: dto.name, defaultPerson_id: dto.defaultPerson_id ?? null } as any);
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    await this.findOne(id);
    if (dto.defaultPerson_id !== undefined) {
      const person = await this.prisma.people.findUnique({ where: { id: dto.defaultPerson_id } });
      if (!person) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Default person not found' });
    }
    return this.repo.update(id, dto as any);
  }

  /** Delete — blocked if categories or people reference the department (FRD §F10.3) */
  async remove(id: number) {
    await this.findOne(id);

    const catCount = await this.repo.countCategoriesByDept(id);
    if (catCount > 0) {
      throw new ConflictException({ error: 'CONFLICT', message: 'Cannot delete department — referenced by categories' });
    }
    const peopleCount = await this.repo.countPeopleByDept(id);
    if (peopleCount > 0) {
      throw new ConflictException({ error: 'CONFLICT', message: 'Cannot delete department — referenced by people' });
    }

    return this.repo.delete(id);
  }

  // ---- Department-Categories associations (FRD §F10.4) ----

  listCategories(deptId: number) {
    return this.repo.listCategories(deptId);
  }

  async addCategory(deptId: number, categoryId: number) {
    await this.findOne(deptId);
    const category = await this.prisma.categories.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Category not found' });
    try {
      await this.repo.addCategory(deptId, categoryId);
    } catch (err: any) {
      // P2002 = unique constraint violation (already associated)
      if (err?.code === 'P2002') {
        throw new ConflictException({ error: 'CONFLICT', message: 'Association already exists' });
      }
      throw err;
    }
  }

  async removeCategory(deptId: number, categoryId: number) {
    await this.findOne(deptId);
    try {
      await this.repo.removeCategory(deptId, categoryId);
    } catch (err: any) {
      if (err?.code === 'P2025') {
        throw new NotFoundException({ error: 'NOT_FOUND', message: 'Association not found' });
      }
      throw err;
    }
  }

  // ---- Department-Actions associations (FRD §F10.5) ----

  listActions(deptId: number) {
    return this.repo.listActions(deptId);
  }

  async addAction(deptId: number, actionId: number) {
    await this.findOne(deptId);
    const action = await this.prisma.actions.findUnique({ where: { id: actionId } });
    if (!action) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Action not found' });
    try {
      await this.repo.addAction(deptId, actionId);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException({ error: 'CONFLICT', message: 'Association already exists' });
      }
      throw err;
    }
  }

  async removeAction(deptId: number, actionId: number) {
    await this.findOne(deptId);
    try {
      await this.repo.removeAction(deptId, actionId);
    } catch (err: any) {
      if (err?.code === 'P2025') {
        throw new NotFoundException({ error: 'NOT_FOUND', message: 'Association not found' });
      }
      throw err;
    }
  }
}
```

---

### src/modules/departments/departments.controller.ts

Route prefix: `/departments` per TechArch §2.1.
M:M sub-routes:
- `GET/POST/DELETE /departments/:deptId/categories` (FRD §F10.4)
- `GET/POST/DELETE /departments/:deptId/actions` (FRD §F10.5)

All write routes require staff.

```typescript
import {
  Controller, Get, Post, Put, Delete,
  Param, Body, ParseIntPipe, ForbiddenException, HttpCode, Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class AssociateCategoryDto {
  @IsInt()
  @Type(() => Number)
  category_id: number;
}

class AssociateActionDto {
  @IsInt()
  @Type(() => Number)
  action_id: number;
}

function requireStaff(req: Request): void {
  const role = (req as any).user?.role;
  if (role !== 'staff') throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Staff access required' });
}

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  // ---- Department CRUD ----

  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateDepartmentDto, @Req() req: Request) {
    requireStaff(req);
    return this.departmentsService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.departmentsService.remove(id);
  }

  // ---- Department–Category associations (FRD §F10.4) ----

  @Get(':deptId/categories')
  listCategories(@Param('deptId', ParseIntPipe) deptId: number) {
    return this.departmentsService.listCategories(deptId);
  }

  @Post(':deptId/categories')
  @HttpCode(201)
  addCategory(
    @Param('deptId', ParseIntPipe) deptId: number,
    @Body() body: AssociateCategoryDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.departmentsService.addCategory(deptId, body.category_id);
  }

  @Delete(':deptId/categories/:categoryId')
  @HttpCode(204)
  async removeCategory(
    @Param('deptId', ParseIntPipe) deptId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Req() req: Request,
  ) {
    requireStaff(req);
    await this.departmentsService.removeCategory(deptId, categoryId);
  }

  // ---- Department–Action associations (FRD §F10.5) ----

  @Get(':deptId/actions')
  listActions(@Param('deptId', ParseIntPipe) deptId: number) {
    return this.departmentsService.listActions(deptId);
  }

  @Post(':deptId/actions')
  @HttpCode(201)
  addAction(
    @Param('deptId', ParseIntPipe) deptId: number,
    @Body() body: AssociateActionDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.departmentsService.addAction(deptId, body.action_id);
  }

  @Delete(':deptId/actions/:actionId')
  @HttpCode(204)
  async removeAction(
    @Param('deptId', ParseIntPipe) deptId: number,
    @Param('actionId', ParseIntPipe) actionId: number,
    @Req() req: Request,
  ) {
    requireStaff(req);
    await this.departmentsService.removeAction(deptId, actionId);
  }
}
```

---

### src/modules/departments/departments.module.ts

```typescript
import { Module } from '@nestjs/common';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { DepartmentsRepository } from './departments.repository';

@Module({
  controllers: [DepartmentsController],
  providers: [DepartmentsService, DepartmentsRepository],
  exports: [DepartmentsService],  // exported for TicketsModule + Open311Module (Wave 4)
})
export class DepartmentsModule {}
```

---

### src/app.module.ts (update)

Add `CategoriesModule` and `DepartmentsModule` to the root module imports.
Preserve existing imports from Plans 03 (SerializationInterceptor), 04 (AuthModule + GelfLoggerModule), 05 (AdminModule):

```typescript
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { GelfLoggerModule } from './common/logger/gelf-logger.module';
import { GelfRequestMiddleware } from './common/middleware/gelf-request.middleware';
import { GelfExceptionFilter } from './common/filters/gelf-exception.filter';
import { FormatMiddleware } from './common/middleware/format.middleware';
import { SerializationInterceptor } from './common/interceptors/serialization.interceptor';
import { JsonSerializer } from './common/serializers/json.serializer';
import { XmlSerializer } from './common/serializers/xml.serializer';
import { CsvSerializer } from './common/serializers/csv.serializer';
import { TxtSerializer } from './common/serializers/txt.serializer';
import { HtmlRenderer } from './common/serializers/html.renderer';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { DepartmentsModule } from './modules/departments/departments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GelfLoggerModule,
    AuthModule,
    AdminModule,
    CategoriesModule,
    DepartmentsModule,
    // Wave 4+ modules imported here as built
  ],
  providers: [
    JsonSerializer,
    XmlSerializer,
    CsvSerializer,
    TxtSerializer,
    HtmlRenderer,
    {
      provide: APP_INTERCEPTOR,
      useClass: SerializationInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GelfExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(GelfRequestMiddleware).forRoutes('*');
    consumer.apply(FormatMiddleware).forRoutes('*');
  }
}
```
  </action>
  <verify>
```bash
npx tsc --noEmit 2>&1 | head -30 && echo "TSC_OK"
grep -n 'export class DepartmentsService' src/modules/departments/departments.service.ts && echo CONTRACT_OK
grep -n 'export class DepartmentsModule' src/modules/departments/departments.module.ts && echo CONTRACT_OK
grep -n 'DepartmentsService' src/modules/departments/departments.module.ts | grep 'exports' && echo EXPORTS_OK
grep -n 'Cannot delete department' src/modules/departments/departments.service.ts && echo DELETE_GUARD_OK
grep -n 'addCategory\|removeCategory\|listCategories' src/modules/departments/departments.controller.ts && echo DEPT_CAT_ROUTES_OK
grep -n 'addAction\|removeAction\|listActions' src/modules/departments/departments.controller.ts && echo DEPT_ACTION_ROUTES_OK
grep -n 'CategoriesModule' src/app.module.ts && echo CAT_WIRED_OK
grep -n 'DepartmentsModule' src/app.module.ts && echo DEPT_WIRED_OK
grep -n 'export class CategoriesModule' src/modules/categories/categories.module.ts && grep -n 'CategoriesService' src/modules/categories/categories.module.ts && echo CONTRACT_OK
grep -n 'export class DepartmentsModule' src/modules/departments/departments.module.ts && grep -n 'DepartmentsService' src/modules/departments/departments.module.ts && echo CONTRACT_OK
```
  </verify>
  <done>
- `src/modules/departments/departments.module.ts` exports `DepartmentsService`
- `DepartmentsService.remove()` throws 409 when `categories.department_id` or `people.department_id` references the department
- `DepartmentsService.addCategory()` inserts into `department_categories` junction table; handles P2002 (already exists) as 409
- `DepartmentsService.removeCategory()` deletes from `department_categories`; handles P2025 (not found) as 404
- `DepartmentsService.addAction()` inserts into `department_actions` junction table
- `DepartmentsService.removeAction()` deletes from `department_actions`
- Controller exposes: `GET/POST/PUT/DELETE /departments`, `GET/POST/DELETE /departments/:deptId/categories`, `GET/POST/DELETE /departments/:deptId/actions`
- All mutation routes call `requireStaff()` before delegating; GET routes are open
- `src/app.module.ts` imports `CategoriesModule` AND `DepartmentsModule` alongside all Wave 2 modules
- `npx tsc --noEmit` exits 0 with zero TypeScript errors across entire project
  </done>
</task>

</tasks>

<verification>
After both tasks complete:

```bash
# Full TypeScript compilation — zero errors required
npx tsc --noEmit 2>&1 | head -30 && echo "TSC_OK"

# Integration contract checks (required by Wave 4 plans)
grep -n 'export class CategoriesModule' src/modules/categories/categories.module.ts && grep -n 'CategoriesService' src/modules/categories/categories.module.ts && echo CONTRACT_OK
grep -n 'export class DepartmentsModule' src/modules/departments/departments.module.ts && grep -n 'DepartmentsService' src/modules/departments/departments.module.ts && echo CONTRACT_OK

# CategoriesService provides findAll(role) for permission filtering
grep -n 'findAll' src/modules/categories/categories.service.ts && echo FIND_ALL_OK

# Permission level filtering applied
grep -n 'displayPermissionLevel\|permissionFilter' src/modules/categories/categories.service.ts && echo PERMISSION_FILTER_OK

# lastModified update on write
grep -n 'lastModified.*new Date' src/modules/categories/categories.service.ts && echo LAST_MODIFIED_OK

# customFields validation
grep -n 'customFields must be valid JSON' src/modules/categories/categories.service.ts && echo CUSTOM_FIELDS_OK

# autoCloseSubstatus_id validation
grep -n "status.*closed\|autoClose" src/modules/categories/categories.service.ts && echo AUTO_CLOSE_OK

# Category delete guard
grep -n 'Cannot delete category with existing tickets' src/modules/categories/categories.service.ts && echo CAT_DELETE_GUARD_OK

# Department delete guard
grep -n 'Cannot delete department' src/modules/departments/departments.service.ts && echo DEPT_DELETE_GUARD_OK

# M:M sub-routes present
grep -n 'deptId.*categories\|categories.*deptId' src/modules/departments/departments.controller.ts && echo DEPT_CAT_OK
grep -n 'deptId.*actions\|actions.*deptId' src/modules/departments/departments.controller.ts && echo DEPT_ACT_OK

# Action-response routes present
grep -n 'actions.*response\|actionId.*response' src/modules/categories/categories.controller.ts && echo CAR_ROUTES_OK

# AppModule imports both new modules
grep -n 'CategoriesModule\|DepartmentsModule' src/app.module.ts && echo APP_MODULE_OK
```

Expected: all checks pass, zero TypeScript errors.
</verification>

<success_criteria>
- `npx tsc --noEmit` exits 0 with zero TypeScript errors under strict mode
- `CategoriesService.findAll(role)` applies `displayPermissionLevel` filter: anonymous→`['anonymous']`, public citizen→`['public','anonymous']`, staff→no filter (FRD §F02.5)
- `CategoriesService.create()` and `update()` validate: `department_id` exists (404), `customFields` is valid JSON (400), `autoCloseSubstatus_id` references a `status='closed'` substatus (400)
- `CategoriesService.update()` sets `lastModified = new Date()` on every write (FRD §F10.1)
- `CategoriesService.remove()` throws 409 when any ticket has `category_id = id`
- `CategoriesService.removeGroup()` throws 409 on Prisma P2003/P2014 FK violation
- `CategoriesService.upsertActionResponse()` uses find-then-create-or-update pattern; verifies category and action both exist
- `DepartmentsService.remove()` throws 409 when categories or people reference the department (FRD §F10.3)
- `DepartmentsService.addCategory()` and `addAction()` handle P2002 duplicate as 409; `removeCategory()` and `removeAction()` handle P2025 not-found as 404
- All controller mutation routes enforce `requireStaff()`; GET routes are open to caller's role
- Routes: `GET/POST/PUT/DELETE /categories`, `GET/POST/PUT/DELETE /category-groups`, `GET/POST/DELETE /categories/:categoryId/actions/:actionId/response`, `GET/POST/PUT/DELETE /departments`, `GET/POST/DELETE /departments/:deptId/categories`, `GET/POST/DELETE /departments/:deptId/actions`
- `CategoriesModule` exports `CategoriesService` (consumed by Wave 4 Open311Module and TicketsModule)
- `DepartmentsModule` exports `DepartmentsService` (consumed by Wave 4 TicketsModule)
- `AppModule` imports `CategoriesModule` and `DepartmentsModule` alongside all Wave 2 modules
</success_criteria>

<output>
No SUMMARY.md required for express-mode plans.
The deliverables are the TypeScript source files listed in files_modified.
Wave 4 plans (TicketsModule and Open311Module) consume CategoriesService to:
  - Filter visible categories by displayPermissionLevel per role
  - Validate postingPermissionLevel before ticket create
  - Read customFields for Open311 ServiceDefinition attributes
  - Read slaDays to compute expected_datetime in Open311 responses
  - Read notificationReplyEmail for notification reply-to resolution
Wave 5 NotificationsModule consumes CategoriesService to read category_action_responses + notificationReplyEmail.
</output>
