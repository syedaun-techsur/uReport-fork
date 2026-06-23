---
phase: wave-2-backend
plan: 05
type: execute
wave: 2
depends_on: [1]
files_modified:
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
  - src/app.module.ts
autonomous: true

features:
  implements: ["F15"]
  depends_on: ["F6"]
  enables: ["F1", "F7"]

must_haves:
  truths:
    - "GET /substatus returns all sub-status records (staff only)"
    - "POST /substatus creates a new sub-status; validates name max 25 chars, status is open|closed"
    - "PUT /substatus/:id updates; system sub-statuses have no special protection"
    - "DELETE /substatus/:id is blocked with 409 when referenced by tickets.substatus_id or categories.autoCloseSubstatus_id"
    - "GET /actions returns all actions"
    - "POST /actions creates only department-type actions (type forced to 'department')"
    - "DELETE /actions/:id on a system action returns 409 FORBIDDEN; changing name of a system action returns 409"
    - "DELETE /actions/:id blocked when referenced by ticketHistory.action_id, department_actions, or category_action_responses"
    - "GET /issue-types returns all issue types; POST creates; DELETE blocked when referenced by tickets.issueType_id"
    - "GET /contact-methods is accessible to anonymous callers; POST/PUT/DELETE require staff"
    - "DELETE /contact-methods/:id blocked when referenced by tickets.contactMethod_id, tickets.responseMethod_id, or clients.contactMethod_id"
    - "All write routes require staff role (except GET /contact-methods)"
    - "AdminModule is wired into AppModule"
  artifacts:
    - path: "src/modules/admin/admin.module.ts"
      provides: "AdminModule NestJS module wiring all four controllers"
      contains: "AdminModule"
    - path: "src/modules/admin/admin.service.ts"
      provides: "Shared protection logic: system-action guard, FK-delete guard"
      contains: "AdminService"
    - path: "src/modules/admin/substatus/substatus.controller.ts"
      provides: "CRUD for /substatus"
    - path: "src/modules/admin/actions/actions.controller.ts"
      provides: "CRUD for /actions with system-action protection"
    - path: "src/modules/admin/issue-types/issue-types.controller.ts"
      provides: "CRUD for /issue-types"
    - path: "src/modules/admin/contact-methods/contact-methods.controller.ts"
      provides: "CRUD for /contact-methods (GET anon, mutations staff)"
  key_links:
    - from: "src/modules/admin/admin.service.ts"
      to: "prisma/schema.prisma"
      via: "PrismaService injection"
      pattern: "PrismaService"
    - from: "src/modules/admin/actions/actions.service.ts"
      to: "src/modules/admin/admin.service.ts"
      via: "system-action guard call"
      pattern: "isSystemAction"
    - from: "src/app.module.ts"
      to: "src/modules/admin/admin.module.ts"
      via: "imports array"
      pattern: "AdminModule"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "prisma/schema.prisma"
      exports: ["substatus", "actions", "issueTypes", "contactMethods"]
      verify: "grep -n 'model substatus' prisma/schema.prisma && grep -n 'model actions' prisma/schema.prisma && grep -n 'model issueTypes' prisma/schema.prisma && grep -n 'model contactMethods' prisma/schema.prisma && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "package.json"
      exports: ["@nestjs/common", "@nestjs/core", "@prisma/client"]
      verify: "grep -q '\"@nestjs/core\"' package.json && grep -q '\"@prisma/client\"' package.json && echo CONTRACT_OK"
  provides:
    - artifact: "src/modules/admin/admin.module.ts"
      exports: ["AdminModule"]
      shape: |
        @Module with SubstatusController, ActionsController, IssueTypesController,
        ContactMethodsController, AdminService, SubstatusService, ActionsService,
        IssueTypesService, ContactMethodsService. Exports AdminService.
      verify: "grep -n 'AdminModule' src/modules/admin/admin.module.ts && echo CONTRACT_OK"
    - artifact: "src/modules/admin/admin.service.ts"
      exports: ["AdminService", "isSystemAction", "checkDeleteConstraint"]
      shape: |
        Injectable AdminService with:
          isSystemAction(action: { type: string }): boolean
          checkSubstatusDeleteConstraint(id: number): Promise<void>  // throws ConflictException
          checkActionDeleteConstraint(id: number): Promise<void>
          checkIssueTypeDeleteConstraint(id: number): Promise<void>
          checkContactMethodDeleteConstraint(id: number): Promise<void>
      verify: "grep -n 'AdminService' src/modules/admin/admin.service.ts && grep -n 'isSystemAction' src/modules/admin/admin.service.ts && echo CONTRACT_OK"
---

<objective>
Implement the AdminModule — the NestJS module owning the four reference-data CRUD controllers for F15:
`SubstatusController`, `ActionsController`, `IssueTypesController`, and `ContactMethodsController`.

Purpose: These reference tables (`substatus`, `actions`, `issueTypes`, `contactMethods`) drive
ticket closure, history, email notification routing, and form input options across the entire
system. They must be manageable by staff with protection rules that prevent deletion of seeded
system data or any record in use by live tickets.

Output:
- `src/modules/admin/` — complete NestJS module with 4 controllers + services + DTOs
- `AdminService` — shared protection logic (system-action guard + FK-delete guards for all 4 tables)
- All four controllers wired to `AdminModule`, imported into `AppModule`
</objective>

<feature_dependencies>
Implements: F15: Sub-Status & Action Reference Data — AdminModule CRUD for substatus, actions, issueTypes, contactMethods; system vs department action type distinction; action template and replyEmail management
Depends on: F6: MySQL-to-PostgreSQL Schema Migration (Prisma schema with substatus, actions, issueTypes, contactMethods models must exist)
Enables: F1: Ticket Lifecycle (substatus_id on tickets.close; action_id on ticketHistory), F7: Email Notifications (actions.template and category_action_responses)
</feature_dependencies>

<execution_context>
@.planning/express/modernize-legacy-php-ureport-open311-geo/WAVE-SCHEDULE.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@project_specs/TechArch-uReport.md
@prisma/schema.prisma
</context>

<tasks>

<task type="auto">
  <name>Task 1: AdminService (shared protection logic) + SubstatusController + ActionsController</name>
  <files>
    src/modules/admin/admin.module.ts
    src/modules/admin/admin.service.ts
    src/modules/admin/substatus/substatus.controller.ts
    src/modules/admin/substatus/substatus.service.ts
    src/modules/admin/substatus/dto/create-substatus.dto.ts
    src/modules/admin/substatus/dto/update-substatus.dto.ts
    src/modules/admin/actions/actions.controller.ts
    src/modules/admin/actions/actions.service.ts
    src/modules/admin/actions/dto/create-action.dto.ts
    src/modules/admin/actions/dto/update-action.dto.ts
  </files>
  <action>
Create the AdminModule skeleton and the two most complex controllers: substatus and actions.

## Directory structure

```
src/modules/admin/
├── admin.module.ts
├── admin.service.ts
├── substatus/
│   ├── substatus.controller.ts
│   ├── substatus.service.ts
│   └── dto/
│       ├── create-substatus.dto.ts
│       └── update-substatus.dto.ts
└── actions/
    ├── actions.controller.ts
    ├── actions.service.ts
    └── dto/
        ├── create-action.dto.ts
        └── update-action.dto.ts
```

---

### src/modules/admin/admin.service.ts

Shared protection logic used by all four sub-services. Inject `PrismaService`.

```typescript
import { Injectable, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  isSystemAction(action: { type: string }): boolean {
    return action.type === 'system';
  }

  async checkSubstatusDeleteConstraint(id: number): Promise<void> {
    const ticketRef = await this.prisma.tickets.findFirst({
      where: { substatus_id: id },
      select: { id: true },
    });
    if (ticketRef) {
      throw new ConflictException(
        'Cannot delete sub-status — referenced by tickets',
      );
    }
    const categoryRef = await this.prisma.categories.findFirst({
      where: { autoCloseSubstatus_id: id },
      select: { id: true },
    });
    if (categoryRef) {
      throw new ConflictException(
        'Cannot delete sub-status — referenced by categories',
      );
    }
  }

  async checkActionDeleteConstraint(id: number): Promise<void> {
    // Verify not system action first (caller must do this before calling)
    const histRef = await this.prisma.ticketHistory.findFirst({
      where: { action_id: id },
      select: { id: true },
    });
    if (histRef) {
      throw new ConflictException(
        'Cannot delete action — referenced by ticket history',
      );
    }
    const deptRef = await this.prisma.department_actions.findFirst({
      where: { action_id: id },
      select: { action_id: true },
    });
    if (deptRef) {
      throw new ConflictException(
        'Cannot delete action — referenced by department actions',
      );
    }
    const carRef = await this.prisma.category_action_responses.findFirst({
      where: { action_id: id },
      select: { id: true },
    });
    if (carRef) {
      throw new ConflictException(
        'Cannot delete action — referenced by category action responses',
      );
    }
  }

  async checkIssueTypeDeleteConstraint(id: number): Promise<void> {
    const ref = await this.prisma.tickets.findFirst({
      where: { issueType_id: id },
      select: { id: true },
    });
    if (ref) {
      throw new ConflictException(
        'Cannot delete issue type — referenced by tickets',
      );
    }
  }

  async checkContactMethodDeleteConstraint(id: number): Promise<void> {
    const contactRef = await this.prisma.tickets.findFirst({
      where: { contactMethod_id: id },
      select: { id: true },
    });
    if (contactRef) {
      throw new ConflictException(
        'Cannot delete contact method — referenced by ticket contactMethod',
      );
    }
    const responseRef = await this.prisma.tickets.findFirst({
      where: { responseMethod_id: id },
      select: { id: true },
    });
    if (responseRef) {
      throw new ConflictException(
        'Cannot delete contact method — referenced by ticket responseMethod',
      );
    }
    const clientRef = await this.prisma.clients.findFirst({
      where: { contactMethod_id: id },
      select: { id: true },
    });
    if (clientRef) {
      throw new ConflictException(
        'Cannot delete contact method — referenced by clients',
      );
    }
  }
}
```

---

### src/modules/admin/substatus/dto/create-substatus.dto.ts

```typescript
import { IsString, MaxLength, IsIn, IsBoolean, IsOptional } from 'class-validator';

export class CreateSubstatusDto {
  @IsString()
  @MaxLength(25)
  name: string;

  @IsString()
  @MaxLength(128)
  description: string;

  @IsIn(['open', 'closed'])
  status: string = 'open';

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean = false;
}
```

### src/modules/admin/substatus/dto/update-substatus.dto.ts

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateSubstatusDto } from './create-substatus.dto';

export class UpdateSubstatusDto extends PartialType(CreateSubstatusDto) {}
```

---

### src/modules/admin/substatus/substatus.service.ts

```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminService } from '../admin.service';
import { CreateSubstatusDto } from './dto/create-substatus.dto';
import { UpdateSubstatusDto } from './dto/update-substatus.dto';

@Injectable()
export class SubstatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
  ) {}

  async findAll() {
    return this.prisma.substatus.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: number) {
    const record = await this.prisma.substatus.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Sub-status not found');
    return record;
  }

  async create(dto: CreateSubstatusDto) {
    // At most one per status may have isDefault = true (per FRD F15.1)
    if (dto.isDefault) {
      const existing = await this.prisma.substatus.findFirst({
        where: { status: dto.status, isDefault: true },
      });
      if (existing) {
        throw new ConflictException(
          `A default sub-status for status '${dto.status}' already exists`,
        );
      }
    }
    return this.prisma.substatus.create({ data: dto });
  }

  async update(id: number, dto: UpdateSubstatusDto) {
    await this.findOne(id);
    if (dto.isDefault && dto.status) {
      const existing = await this.prisma.substatus.findFirst({
        where: { status: dto.status, isDefault: true, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(
          `A default sub-status for status '${dto.status}' already exists`,
        );
      }
    }
    return this.prisma.substatus.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.adminService.checkSubstatusDeleteConstraint(id);
    return this.prisma.substatus.delete({ where: { id } });
  }
}
```

---

### src/modules/admin/substatus/substatus.controller.ts

Route prefix: `/substatus`. All endpoints staff-only (guard wired in Task 2 via AdminModule; for now use a placeholder staff check from `req.user.role`).

```typescript
import {
  Controller, Get, Post, Put, Delete,
  Param, Body, ParseIntPipe, ForbiddenException, Req,
} from '@nestjs/common';
import { SubstatusService } from './substatus.service';
import { CreateSubstatusDto } from './dto/create-substatus.dto';
import { UpdateSubstatusDto } from './dto/update-substatus.dto';
import type { Request } from 'express';

function requireStaff(req: Request): void {
  const user = (req as any).user;
  if (!user || user.role !== 'staff') {
    throw new ForbiddenException('Staff access required');
  }
}

@Controller('substatus')
export class SubstatusController {
  constructor(private readonly substatusService: SubstatusService) {}

  @Get()
  findAll(@Req() req: Request) {
    requireStaff(req);
    return this.substatusService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.substatusService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSubstatusDto, @Req() req: Request) {
    requireStaff(req);
    return this.substatusService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubstatusDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.substatusService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.substatusService.remove(id);
  }
}
```

---

### src/modules/admin/actions/dto/create-action.dto.ts

Per FRD F15.2: staff can only create `department`-type actions. `type` is forced to `'department'` — do not accept `'system'` from input.

```typescript
import { IsString, MaxLength, IsOptional } from 'class-validator';

export class CreateActionDto {
  @IsString()
  @MaxLength(25)
  name: string;

  @IsString()
  @MaxLength(128)
  description: string;

  // type is always forced to 'department' on create — system actions are seed-only
  @IsString()
  @IsOptional()
  template?: string;

  @IsString()
  @MaxLength(128)
  @IsOptional()
  replyEmail?: string;
}
```

### src/modules/admin/actions/dto/update-action.dto.ts

```typescript
import { IsString, MaxLength, IsOptional } from 'class-validator';

export class UpdateActionDto {
  // name cannot be changed on system actions (enforced in service)
  @IsString()
  @MaxLength(25)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(128)
  @IsOptional()
  description?: string;

  // template and replyEmail CAN be updated on system actions (per FRD F15.2)
  @IsString()
  @IsOptional()
  template?: string;

  @IsString()
  @MaxLength(128)
  @IsOptional()
  replyEmail?: string;
}
```

---

### src/modules/admin/actions/actions.service.ts

Key business rules from FRD F15.2:
- System actions cannot be deleted or have their `name` changed.
- `template` and `replyEmail` on system actions CAN be updated.
- New actions via POST are always `type = 'department'`.

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminService } from '../admin.service';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';

@Injectable()
export class ActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
  ) {}

  async findAll() {
    return this.prisma.actions.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: number) {
    const record = await this.prisma.actions.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Action not found');
    return record;
  }

  async create(dto: CreateActionDto) {
    return this.prisma.actions.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: 'department',  // ALWAYS department on create — system actions are seed-only
        template: dto.template ?? null,
        replyEmail: dto.replyEmail ?? null,
      },
    });
  }

  async update(id: number, dto: UpdateActionDto) {
    const record = await this.findOne(id);
    // System actions: name change is forbidden (FRD F15.2)
    if (this.adminService.isSystemAction(record) && dto.name && dto.name !== record.name) {
      throw new ForbiddenException(
        'Cannot change the name of a system action',
      );
    }
    return this.prisma.actions.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.template !== undefined && { template: dto.template }),
        ...(dto.replyEmail !== undefined && { replyEmail: dto.replyEmail }),
      },
    });
  }

  async remove(id: number) {
    const record = await this.findOne(id);
    // System actions cannot be deleted (FRD F15.2)
    if (this.adminService.isSystemAction(record)) {
      throw new ForbiddenException('System actions cannot be deleted');
    }
    await this.adminService.checkActionDeleteConstraint(id);
    return this.prisma.actions.delete({ where: { id } });
  }
}
```

---

### src/modules/admin/actions/actions.controller.ts

Route prefix: `/actions`. All endpoints staff-only.

```typescript
import {
  Controller, Get, Post, Put, Delete,
  Param, Body, ParseIntPipe, ForbiddenException, Req,
} from '@nestjs/common';
import { ActionsService } from './actions.service';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';
import type { Request } from 'express';

function requireStaff(req: Request): void {
  const user = (req as any).user;
  if (!user || user.role !== 'staff') {
    throw new ForbiddenException('Staff access required');
  }
}

@Controller('actions')
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @Get()
  findAll(@Req() req: Request) {
    requireStaff(req);
    return this.actionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.actionsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateActionDto, @Req() req: Request) {
    requireStaff(req);
    return this.actionsService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActionDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.actionsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.actionsService.remove(id);
  }
}
```

---

### src/modules/admin/admin.module.ts (skeleton — completed in Task 2)

Create a minimal module now; Task 2 will add IssueTypes + ContactMethods controllers:

```typescript
import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SubstatusController } from './substatus/substatus.controller';
import { SubstatusService } from './substatus/substatus.service';
import { ActionsController } from './actions/actions.controller';
import { ActionsService } from './actions/actions.service';

@Module({
  controllers: [SubstatusController, ActionsController],
  providers: [AdminService, SubstatusService, ActionsService],
  exports: [AdminService],
})
export class AdminModule {}
```
  </action>
  <verify>
```bash
npx tsc --noEmit 2>&1 | grep -E 'admin|substatus|actions' | head -20 && echo "TSC_ADMIN_OK"
grep -n 'AdminService' src/modules/admin/admin.service.ts && echo CONTRACT_OK
grep -n 'isSystemAction' src/modules/admin/admin.service.ts && echo SYSTEM_GUARD_OK
grep -n "type: 'department'" src/modules/admin/actions/actions.service.ts && echo DEPT_TYPE_OK
```
  </verify>
  <done>
- `src/modules/admin/admin.service.ts` exists with `AdminService` exporting `isSystemAction`, `checkSubstatusDeleteConstraint`, `checkActionDeleteConstraint`, `checkIssueTypeDeleteConstraint`, `checkContactMethodDeleteConstraint`
- `src/modules/admin/substatus/substatus.controller.ts` handles GET/POST/PUT/DELETE on `/substatus`; all routes require staff
- `src/modules/admin/actions/actions.service.ts` forces `type = 'department'` on create; throws `ForbiddenException` on system-action delete or system-action name change
- `src/modules/admin/actions/actions.controller.ts` handles GET/POST/PUT/DELETE on `/actions`; all routes require staff
- `src/modules/admin/admin.module.ts` exists and registers all created controllers + providers
- `npx tsc --noEmit` passes with zero admin-module errors
  </done>
</task>

<task type="auto">
  <name>Task 2: IssueTypesController + ContactMethodsController + wire AdminModule into AppModule</name>
  <files>
    src/modules/admin/issue-types/issue-types.controller.ts
    src/modules/admin/issue-types/issue-types.service.ts
    src/modules/admin/issue-types/dto/create-issue-type.dto.ts
    src/modules/admin/contact-methods/contact-methods.controller.ts
    src/modules/admin/contact-methods/contact-methods.service.ts
    src/modules/admin/contact-methods/dto/create-contact-method.dto.ts
    src/modules/admin/admin.module.ts
    src/app.module.ts
  </files>
  <action>
Build the remaining two controllers, finalize AdminModule, and wire into AppModule.

## Directory additions

```
src/modules/admin/
├── issue-types/
│   ├── issue-types.controller.ts
│   ├── issue-types.service.ts
│   └── dto/
│       └── create-issue-type.dto.ts
└── contact-methods/
    ├── contact-methods.controller.ts
    ├── contact-methods.service.ts
    └── dto/
        └── create-contact-method.dto.ts
```

---

### src/modules/admin/issue-types/dto/create-issue-type.dto.ts

```typescript
import { IsString, MaxLength } from 'class-validator';

export class CreateIssueTypeDto {
  @IsString()
  @MaxLength(128)
  name: string;
}
```

---

### src/modules/admin/issue-types/issue-types.service.ts

Business rule from FRD F15.3: delete blocked when `tickets.issueType_id` references this record.

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminService } from '../admin.service';
import { CreateIssueTypeDto } from './dto/create-issue-type.dto';

@Injectable()
export class IssueTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
  ) {}

  async findAll() {
    return this.prisma.issueTypes.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: number) {
    const record = await this.prisma.issueTypes.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Issue type not found');
    return record;
  }

  async create(dto: CreateIssueTypeDto) {
    return this.prisma.issueTypes.create({ data: dto });
  }

  async update(id: number, dto: CreateIssueTypeDto) {
    await this.findOne(id);
    return this.prisma.issueTypes.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.adminService.checkIssueTypeDeleteConstraint(id);
    return this.prisma.issueTypes.delete({ where: { id } });
  }
}
```

---

### src/modules/admin/issue-types/issue-types.controller.ts

Route prefix: `/issue-types`. All endpoints staff-only per TechArch §4.3 §Reference Data.

```typescript
import {
  Controller, Get, Post, Put, Delete,
  Param, Body, ParseIntPipe, ForbiddenException, Req,
} from '@nestjs/common';
import { IssueTypesService } from './issue-types.service';
import { CreateIssueTypeDto } from './dto/create-issue-type.dto';
import type { Request } from 'express';

function requireStaff(req: Request): void {
  const user = (req as any).user;
  if (!user || user.role !== 'staff') {
    throw new ForbiddenException('Staff access required');
  }
}

@Controller('issue-types')
export class IssueTypesController {
  constructor(private readonly issueTypesService: IssueTypesService) {}

  @Get()
  findAll(@Req() req: Request) {
    requireStaff(req);
    return this.issueTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.issueTypesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateIssueTypeDto, @Req() req: Request) {
    requireStaff(req);
    return this.issueTypesService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateIssueTypeDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.issueTypesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.issueTypesService.remove(id);
  }
}
```

---

### src/modules/admin/contact-methods/dto/create-contact-method.dto.ts

```typescript
import { IsString, MaxLength } from 'class-validator';

export class CreateContactMethodDto {
  @IsString()
  @MaxLength(128)
  name: string;
}
```

---

### src/modules/admin/contact-methods/contact-methods.service.ts

Business rule from FRD F15.4: delete blocked when referenced by `tickets.contactMethod_id`,
`tickets.responseMethod_id`, or `clients.contactMethod_id`.

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminService } from '../admin.service';
import { CreateContactMethodDto } from './dto/create-contact-method.dto';

@Injectable()
export class ContactMethodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
  ) {}

  async findAll() {
    return this.prisma.contactMethods.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: number) {
    const record = await this.prisma.contactMethods.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Contact method not found');
    return record;
  }

  async create(dto: CreateContactMethodDto) {
    return this.prisma.contactMethods.create({ data: dto });
  }

  async update(id: number, dto: CreateContactMethodDto) {
    await this.findOne(id);
    return this.prisma.contactMethods.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.adminService.checkContactMethodDeleteConstraint(id);
    return this.prisma.contactMethods.delete({ where: { id } });
  }
}
```

---

### src/modules/admin/contact-methods/contact-methods.controller.ts

Route prefix: `/contact-methods`.

**Key permission difference from the other three controllers (per TechArch §4.3 §Reference Data):**
- `GET /contact-methods` — anonymous access allowed (`[anon]`)
- All mutations (POST, PUT, DELETE) — staff only

```typescript
import {
  Controller, Get, Post, Put, Delete,
  Param, Body, ParseIntPipe, ForbiddenException, Req,
} from '@nestjs/common';
import { ContactMethodsService } from './contact-methods.service';
import { CreateContactMethodDto } from './dto/create-contact-method.dto';
import type { Request } from 'express';

function requireStaff(req: Request): void {
  const user = (req as any).user;
  if (!user || user.role !== 'staff') {
    throw new ForbiddenException('Staff access required');
  }
}

@Controller('contact-methods')
export class ContactMethodsController {
  constructor(
    private readonly contactMethodsService: ContactMethodsService,
  ) {}

  @Get()
  // Anonymous access allowed — contact methods appear on public ticket-creation forms
  findAll() {
    return this.contactMethodsService.findAll();
  }

  @Get(':id')
  // Anonymous access allowed
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contactMethodsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateContactMethodDto, @Req() req: Request) {
    requireStaff(req);
    return this.contactMethodsService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateContactMethodDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.contactMethodsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.contactMethodsService.remove(id);
  }
}
```

---

### src/modules/admin/admin.module.ts (finalized)

Update the module written in Task 1 to include all four controllers and services:

```typescript
import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SubstatusController } from './substatus/substatus.controller';
import { SubstatusService } from './substatus/substatus.service';
import { ActionsController } from './actions/actions.controller';
import { ActionsService } from './actions/actions.service';
import { IssueTypesController } from './issue-types/issue-types.controller';
import { IssueTypesService } from './issue-types/issue-types.service';
import { ContactMethodsController } from './contact-methods/contact-methods.controller';
import { ContactMethodsService } from './contact-methods/contact-methods.service';

@Module({
  controllers: [
    SubstatusController,
    ActionsController,
    IssueTypesController,
    ContactMethodsController,
  ],
  providers: [
    AdminService,
    SubstatusService,
    ActionsService,
    IssueTypesService,
    ContactMethodsService,
  ],
  exports: [AdminService],
})
export class AdminModule {}
```

---

### src/app.module.ts (updated)

Import `AdminModule` into the root module. Update the existing file created in Plan 01:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AdminModule,
    // Feature modules imported here as they are built in subsequent waves
  ],
})
export class AppModule {}
```
  </action>
  <verify>
```bash
npx tsc --noEmit 2>&1 | head -30 && echo "TSC_OK"
grep -n 'IssueTypesController' src/modules/admin/admin.module.ts && echo ISSUE_TYPES_WIRED_OK
grep -n 'ContactMethodsController' src/modules/admin/admin.module.ts && echo CONTACT_METHODS_WIRED_OK
grep -n 'AdminModule' src/app.module.ts && echo APP_MODULE_OK
grep -n 'checkContactMethodDeleteConstraint' src/modules/admin/admin.service.ts && echo DELETE_GUARD_OK
```
  </verify>
  <done>
- `src/modules/admin/issue-types/issue-types.controller.ts` handles GET/POST/PUT/DELETE on `/issue-types`; all require staff
- `src/modules/admin/contact-methods/contact-methods.controller.ts` handles GET/POST/PUT/DELETE on `/contact-methods`; GET is open to anonymous; mutations require staff
- `src/modules/admin/admin.module.ts` registers all 4 controllers and 5 providers (AdminService + 4 sub-services); exports `AdminService`
- `src/app.module.ts` imports `AdminModule`
- `npx tsc --noEmit` exits 0 with zero errors across the entire project
- `AdminService.checkContactMethodDeleteConstraint` checks all three FK paths: `tickets.contactMethod_id`, `tickets.responseMethod_id`, `clients.contactMethod_id`
  </done>
</task>

</tasks>

<verification>
After both tasks complete:

```bash
# Full TypeScript compilation — zero errors required
npx tsc --noEmit 2>&1 | head -30 && echo "TSC_OK"

# AdminModule is wired
grep -n 'AdminModule' src/app.module.ts && echo "APP_MODULE_WIRED"

# All four controllers exist
ls src/modules/admin/substatus/substatus.controller.ts \
   src/modules/admin/actions/actions.controller.ts \
   src/modules/admin/issue-types/issue-types.controller.ts \
   src/modules/admin/contact-methods/contact-methods.controller.ts && echo "ALL_CONTROLLERS_EXIST"

# System-action protection is in place
grep -n "type: 'department'" src/modules/admin/actions/actions.service.ts && echo "DEPT_TYPE_FORCED"
grep -n 'System actions cannot be deleted' src/modules/admin/actions/actions.service.ts && echo "SYSTEM_DELETE_GUARD"
grep -n 'Cannot change the name of a system action' src/modules/admin/actions/actions.service.ts && echo "SYSTEM_RENAME_GUARD"

# FK-delete constraints for all four tables
grep -n 'checkSubstatusDeleteConstraint' src/modules/admin/admin.service.ts && echo "SUBSTATUS_FK_GUARD"
grep -n 'checkActionDeleteConstraint' src/modules/admin/admin.service.ts && echo "ACTION_FK_GUARD"
grep -n 'checkIssueTypeDeleteConstraint' src/modules/admin/admin.service.ts && echo "ISSUETYPE_FK_GUARD"
grep -n 'checkContactMethodDeleteConstraint' src/modules/admin/admin.service.ts && echo "CONTACTMETHOD_FK_GUARD"

# Contact methods GET is anonymous-accessible (no requireStaff on findAll)
grep -A5 '@Get()' src/modules/admin/contact-methods/contact-methods.controller.ts | grep -v 'requireStaff' && echo "CONTACT_METHODS_ANON_GET"
```
</verification>

<success_criteria>
- AdminModule contains SubstatusController, ActionsController, IssueTypesController, ContactMethodsController with their respective services and DTOs
- `AdminService` provides shared FK-delete constraint checks for all 4 reference tables
- System actions are protected: `DELETE /actions/:id` on a system action returns 403; updating `name` on a system action returns 403; `template` and `replyEmail` can still be updated
- New actions via `POST /actions` always get `type = 'department'` regardless of input
- Delete constraints throw 409 when the target row is referenced by FK in live data (tickets, clients, ticketHistory, department_actions, category_action_responses)
- `GET /contact-methods` is accessible without authentication; all other contact-method mutations require staff
- `AdminModule` is imported in `AppModule`
- `npx tsc --noEmit` exits 0 with zero errors
</success_criteria>

<output>
No SUMMARY.md required for express-mode plans.
The deliverable is the set of TypeScript source files under `src/modules/admin/`.
Wave 3 modules (CategoriesModule, DepartmentsModule, PeopleModule) will import `AdminService`
from `AdminModule` when they need to validate action/substatus references.
</output>
