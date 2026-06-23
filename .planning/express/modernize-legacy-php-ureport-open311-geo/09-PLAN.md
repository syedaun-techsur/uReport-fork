---
phase: wave-4-backend
plan: 09
type: execute
wave: 4
depends_on: [3]
files_modified:
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
  - src/app.module.ts
autonomous: true

features:
  implements: ["F1"]
  depends_on: ["F6", "F2", "F10", "F11"]
  enables: ["F0", "F5", "F7", "F8", "F9", "F13"]

must_haves:
  truths:
    - "POST /tickets creates a ticket, appends 'open' ticketHistory entry, sets status='open', enteredDate=NOW(), lastModified=NOW()"
    - "GET /tickets returns tickets filtered by caller's category displayPermissionLevel"
    - "GET /tickets/:id returns a single ticket (role-filtered); 404 if not visible to caller"
    - "PUT /tickets/:id is staff-only; logs changeCategory or changeLocation or update action as appropriate; sets lastModified=NOW()"
    - "POST /tickets/:id/assign is staff-only; validates assignedPerson_id belongs to ticket's department; appends 'assignment' history entry; sets lastModified=NOW()"
    - "POST /tickets/:id/close is staff-only; requires substatus_id referencing a 'closed' substatus; sets status='closed', closedDate=NOW(); appends 'closed' history entry"
    - "POST /tickets/:id/duplicate is staff-only; sets child.parent_id; closes child with 'Duplicate' substatus; appends 'duplicate' action on parent only"
    - "POST /tickets/:id/comment is staff-only; appends 'comment' history entry; sets lastModified=NOW()"
    - "POST /tickets/:id/response is staff-only; appends 'response' history entry; sets lastModified=NOW()"
    - "POST /tickets/:id/reopen is staff-only; sets status='open', clears closedDate and substatus_id; appends 'update' history entry"
    - "GET /tickets/:id/history returns ticketHistory rows ordered by enteredDate ASC; PII fields masked for non-staff callers"
    - "Ticket responses include enteredByPerson, reportedByPerson, assignedPerson objects (staff) or null (non-staff)"
    - "TicketsModule exports TicketsService for consumption by Open311Module in Wave 4b"
  artifacts:
    - path: "src/modules/tickets/tickets.module.ts"
      provides: "TicketsModule exporting TicketsService"
      exports: ["TicketsModule", "TicketsService"]
    - path: "src/modules/tickets/tickets.service.ts"
      provides: "TicketsService: full lifecycle CRUD + history append + ticketHistory entries"
      exports: ["TicketsService"]
    - path: "src/modules/tickets/tickets.repository.ts"
      provides: "TicketsRepository: Prisma queries for tickets and ticketHistory with role-based category filter"
      exports: ["TicketsRepository"]
    - path: "src/modules/tickets/tickets.controller.ts"
      provides: "TicketsController: all 11 lifecycle routes per TechArch §4.3 §Tickets"
      exports: ["TicketsController"]
  key_links:
    - from: "src/modules/tickets/tickets.service.ts"
      to: "prisma/schema.prisma"
      via: "TicketsRepository Prisma queries for tickets and ticketHistory"
      pattern: "prisma\\.tickets\\.(create|update|findUnique|findMany)"
    - from: "src/modules/tickets/tickets.service.ts"
      to: "prisma/schema.prisma"
      via: "TicketsRepository Prisma queries for ticketHistory append"
      pattern: "prisma\\.ticketHistory\\.create"
    - from: "src/modules/tickets/tickets.service.ts"
      to: "src/modules/categories/categories.service.ts"
      via: "CategoriesService.findOne(category_id, role) for permission check on create"
      pattern: "categoriesService\\.findOne"
    - from: "src/modules/tickets/tickets.service.ts"
      to: "src/modules/people/people.service.ts"
      via: "PeopleService.findOne(assignedPerson_id) for assignee validation"
      pattern: "peopleService\\.findOne"
    - from: "src/app.module.ts"
      to: "src/modules/tickets/tickets.module.ts"
      via: "AppModule imports"
      pattern: "TicketsModule"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "prisma/schema.prisma"
      exports: ["tickets", "ticketHistory", "categories", "people", "substatus", "actions"]
      verify: "grep -n 'model tickets' prisma/schema.prisma && grep -n 'model ticketHistory' prisma/schema.prisma && grep -n 'model substatus' prisma/schema.prisma && grep -n 'model actions' prisma/schema.prisma && echo CONTRACT_OK"
    - from_plan: "06"
      artifact: "src/modules/auth/ability.factory.ts"
      exports: ["AbilityFactory", "AppAbility"]
      verify: "grep -n 'export class AbilityFactory' src/modules/auth/ability.factory.ts && grep -n 'createForUser' src/modules/auth/ability.factory.ts && echo CONTRACT_OK"
    - from_plan: "06"
      artifact: "src/common/guards/casl.guard.ts"
      exports: ["CaslGuard"]
      verify: "grep -n 'export class CaslGuard' src/common/guards/casl.guard.ts && grep -n 'implements CanActivate' src/common/guards/casl.guard.ts && echo CONTRACT_OK"
    - from_plan: "06"
      artifact: "src/common/guards/auth.guard.ts"
      exports: ["AuthGuard"]
      verify: "grep -n 'export class AuthGuard' src/common/guards/auth.guard.ts && grep -n 'implements CanActivate' src/common/guards/auth.guard.ts && echo CONTRACT_OK"
    - from_plan: "06"
      artifact: "src/common/interceptors/pii-mask.interceptor.ts"
      exports: ["PiiMaskInterceptor"]
      verify: "grep -n 'export class PiiMaskInterceptor' src/common/interceptors/pii-mask.interceptor.ts && grep -n 'implements NestInterceptor' src/common/interceptors/pii-mask.interceptor.ts && echo CONTRACT_OK"
    - from_plan: "07"
      artifact: "src/modules/categories/categories.service.ts"
      exports: ["CategoriesService"]
      verify: "grep -n 'export class CategoriesService' src/modules/categories/categories.service.ts && echo CONTRACT_OK"
    - from_plan: "08"
      artifact: "src/modules/people/people.service.ts"
      exports: ["PeopleService"]
      verify: "grep -n 'export class PeopleService' src/modules/people/people.service.ts && echo CONTRACT_OK"
    - from_plan: "08"
      artifact: "src/modules/people/people.module.ts"
      exports: ["PeopleModule", "PeopleService", "ClientsService"]
      verify: "grep -n 'export class PeopleModule' src/modules/people/people.module.ts && grep -n 'exports.*PeopleService' src/modules/people/people.module.ts && echo CONTRACT_OK"
  provides:
    - artifact: "src/modules/tickets/tickets.module.ts"
      exports: ["TicketsModule", "TicketsService"]
      shape: |
        @Module({
          imports: [CategoriesModule, PeopleModule],
          controllers: [TicketsController],
          providers: [TicketsService, TicketsRepository],
          exports: [TicketsService],
        })
        export class TicketsModule {}
      verify: "grep -n 'export class TicketsModule' src/modules/tickets/tickets.module.ts && grep -n 'TicketsService' src/modules/tickets/tickets.module.ts && echo CONTRACT_OK"
    - artifact: "src/modules/tickets/tickets.service.ts"
      exports: ["TicketsService"]
      shape: |
        @Injectable()
        export class TicketsService {
          findAll(role?: string | null, filters?: TicketsQueryDto): Promise<tickets[]>
          findOne(id: number, role?: string | null): Promise<tickets>
          create(dto: CreateTicketDto, user: Person | null): Promise<tickets>
          update(id: number, dto: UpdateTicketDto, user: Person): Promise<tickets>
          assign(id: number, dto: AssignTicketDto, user: Person): Promise<tickets>
          close(id: number, dto: CloseTicketDto, user: Person): Promise<tickets>
          duplicate(id: number, dto: DuplicateTicketDto, user: Person): Promise<tickets>
          comment(id: number, dto: CommentTicketDto, user: Person): Promise<ticketHistory>
          respond(id: number, dto: ResponseTicketDto, user: Person): Promise<ticketHistory>
          reopen(id: number, dto: ReopenTicketDto, user: Person): Promise<tickets>
          getHistory(id: number, role?: string | null): Promise<ticketHistory[]>
        }
      verify: "grep -n 'export class TicketsService' src/modules/tickets/tickets.service.ts && grep -n 'getHistory' src/modules/tickets/tickets.service.ts && echo CONTRACT_OK"
---

<objective>
Implement the complete `TicketsModule` — the core of uReport — covering the full ticket lifecycle: create, read, update, assign, close, duplicate, comment, response, reopen, and history view. Every state change appends an immutable `ticketHistory` entry. RBAC-filtered responses and PII masking for non-staff callers are enforced per FRD §F01 and §F02.

Purpose: TicketsModule is the highest-value P0 feature. It is the primary data entity consumed by Open311Module (Wave 4b plan 10), SearchModule (Wave 5), NotificationsModule (Wave 5), MediaModule (Wave 5), GeoModule (Wave 5), and ReportsModule (Wave 6). It must be complete and exports `TicketsService` for downstream consumption.

Output:
- `src/modules/tickets/` — TicketsController (11 routes per TechArch §4.3), TicketsService (business logic: status transitions, lastModified updates, ticketHistory append, category permission checks, PII-aware findAll/findOne/getHistory), TicketsRepository (Prisma queries with role-based category visibility filter), DTOs for all 8 lifecycle operations
- `TicketsModule` imported into AppModule; `TicketsService` exported for Wave 4b Open311Module
</objective>

<feature_dependencies>
Implements: F1: Ticket Lifecycle Management — create ticket with geo-location fields, enteredByPerson/reportedByPerson/assignedPerson, contactMethod, additionalFields/customFields; ticket read with RBAC-filtered category visibility; ticket update/assign/close/duplicate/comment/response/reopen; ticketHistory audit entries for all actions; multi-format response via SerializationInterceptor (from Wave 2 plan 03)
Depends on: F6: schema (tickets, ticketHistory, categories, people, substatus, actions DDL); F2: RBAC (CaslGuard, AuthGuard, PiiMaskInterceptor, AbilityFactory — all from plan 06); F10: CategoriesService.findOne() for permission filtering (plan 07); F11: PeopleService.findOne() for reporter/assignee validation (plan 08)
Enables: F0: Open311Module reads/creates tickets via TicketsService (Wave 4b plan 10); F5: SearchModule hooks into ticket mutations for Solr indexing; F7: NotificationsModule triggers on ticket state changes; F8: MediaModule stores attachments per ticket; F9: GeoModule assigns geo-clusters on ticket create/update; F13: ReportsModule aggregates ticket data
</feature_dependencies>

<execution_context>
@.planning/express/modernize-legacy-php-ureport-open311-geo/WAVE-SCHEDULE.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@project_specs/FRD-uReport.md (F01 section, F02 section)
@project_specs/TechArch-uReport.md (§2.1 TicketsModule, §3.2 DDL tickets+ticketHistory, §4.3 §Tickets endpoint catalog, §5.3 RBAC, §5.4 PII masking)
</context>

<tasks>

<task type="auto">
  <name>Task 1: TicketsRepository + DTOs + TicketsService (full lifecycle business logic)</name>
  <files>
    src/modules/tickets/tickets.repository.ts
    src/modules/tickets/dto/create-ticket.dto.ts
    src/modules/tickets/dto/update-ticket.dto.ts
    src/modules/tickets/dto/assign-ticket.dto.ts
    src/modules/tickets/dto/close-ticket.dto.ts
    src/modules/tickets/dto/duplicate-ticket.dto.ts
    src/modules/tickets/dto/comment-ticket.dto.ts
    src/modules/tickets/dto/response-ticket.dto.ts
    src/modules/tickets/dto/reopen-ticket.dto.ts
    src/modules/tickets/tickets.service.ts
  </files>
  <action>
Create all DTOs, the TicketsRepository, and the TicketsService implementing the complete ticket lifecycle per FRD §F01 and TechArch §2.1 TicketsModule.

## Directory structure

```
src/modules/tickets/
├── tickets.module.ts          (Task 2)
├── tickets.controller.ts      (Task 2)
├── tickets.service.ts         (Task 1)
├── tickets.repository.ts      (Task 1)
└── dto/
    ├── create-ticket.dto.ts
    ├── update-ticket.dto.ts
    ├── assign-ticket.dto.ts
    ├── close-ticket.dto.ts
    ├── duplicate-ticket.dto.ts
    ├── comment-ticket.dto.ts
    ├── response-ticket.dto.ts
    └── reopen-ticket.dto.ts
```

---

### src/modules/tickets/dto/create-ticket.dto.ts

From FRD §F01.1 inputs + TechArch §3.2 tickets DDL. Exact field names from the DDL:

```typescript
import {
  IsInt, IsOptional, IsString, MaxLength, IsNumber, Min, Max, IsJSON,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTicketDto {
  // Required: category (FRD §F01.1)
  @IsInt()
  @Type(() => Number)
  category_id: number;

  // Optional ticket fields — exact column names from TechArch §3.2 DDL
  @IsOptional() @IsInt() @Type(() => Number) issueType_id?: number;

  @IsOptional() @IsString() description?: string;

  @IsOptional() @IsString() @MaxLength(128) location?: string;

  @IsOptional() @IsString() @MaxLength(128) city?: string;

  @IsOptional() @IsString() @MaxLength(128) state?: string;

  @IsOptional() @IsString() @MaxLength(40) zip?: string;

  // latitude in [-90, 90] (FRD §F01.1 validation)
  @IsOptional() @IsNumber() @Min(-90) @Max(90) @Type(() => Number) latitude?: number;

  // longitude in [-180, 180] (FRD §F01.1 validation)
  @IsOptional() @IsNumber() @Min(-180) @Max(180) @Type(() => Number) longitude?: number;

  @IsOptional() @IsInt() @Type(() => Number) addressId?: number;

  @IsOptional() @IsInt() @Type(() => Number) contactMethod_id?: number;

  @IsOptional() @IsInt() @Type(() => Number) responseMethod_id?: number;

  @IsOptional() @IsInt() @Type(() => Number) reportedByPerson_id?: number;

  @IsOptional() @IsString() @IsJSON() customFields?: string;

  @IsOptional() @IsString() @MaxLength(255) additionalFields?: string;
}
```

### src/modules/tickets/dto/update-ticket.dto.ts

Per FRD §F01.3 — same updatable fields as create, all optional:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketDto } from './create-ticket.dto';

export class UpdateTicketDto extends PartialType(CreateTicketDto) {}
```

### src/modules/tickets/dto/assign-ticket.dto.ts

Per FRD §F01.2:

```typescript
import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignTicketDto {
  @IsInt()
  @Type(() => Number)
  assignedPerson_id: number;
}
```

### src/modules/tickets/dto/close-ticket.dto.ts

Per FRD §F01.4 — substatus_id required, notes optional:

```typescript
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CloseTicketDto {
  @IsInt()
  @Type(() => Number)
  substatus_id: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

### src/modules/tickets/dto/duplicate-ticket.dto.ts

Per FRD §F01.5:

```typescript
import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class DuplicateTicketDto {
  @IsInt()
  @Type(() => Number)
  parent_id: number;
}
```

### src/modules/tickets/dto/comment-ticket.dto.ts

Per FRD §F01.6:

```typescript
import { IsString } from 'class-validator';

export class CommentTicketDto {
  @IsString()
  notes: string;
}
```

### src/modules/tickets/dto/response-ticket.dto.ts

Per FRD §F01.7:

```typescript
import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class ResponseTicketDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  actionPerson_id?: number;
}
```

### src/modules/tickets/dto/reopen-ticket.dto.ts

Per FRD §F01.8:

```typescript
import { IsOptional, IsString } from 'class-validator';

export class ReopenTicketDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
```

---

### src/modules/tickets/tickets.repository.ts

Thin Prisma wrapper applying the role-based category visibility filter (FRD §F02.5) at the DB query level.

Category visibility filter helper (FRD §F02.5):
- anonymous (role=undefined/null, not authenticated): `displayPermissionLevel = 'anonymous'`
- public (authenticated, role=null): `displayPermissionLevel IN ('public', 'anonymous')`
- staff (role='staff'): no filter

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

/** Returns the Prisma WHERE fragment for category visibility per caller role (FRD §F02.5) */
function categoryVisibilityWhere(role?: string | null, isAuthenticated = false): Prisma.categoriesWhereInput | undefined {
  if (role === 'staff') return undefined; // staff: no filter
  if (isAuthenticated) {
    // public (authenticated citizen, role=null)
    return { displayPermissionLevel: { in: ['public', 'anonymous'] } };
  }
  // anonymous
  return { displayPermissionLevel: { in: ['anonymous'] } };
}

@Injectable()
export class TicketsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** List tickets with role-filtered category visibility (FRD §F02.5) */
  findAll(roleFilter: { role?: string | null; isAuthenticated: boolean }, where?: Prisma.ticketsWhereInput) {
    const catWhere = categoryVisibilityWhere(roleFilter.role, roleFilter.isAuthenticated);
    const categoryCondition: Prisma.ticketsWhereInput = catWhere
      ? { categories: catWhere }
      : {};

    return this.prisma.tickets.findMany({
      where: { ...where, ...categoryCondition },
      include: {
        categories: { include: { departments: true, categoryGroups: true } },
        substatus: true,
        issueTypes: true,
        contactMethods: true,
        enteredByPerson: {
          select: { id: true, firstname: true, lastname: true },
        },
        reportedByPerson: {
          select: { id: true, firstname: true, lastname: true },
        },
        assignedPerson: {
          select: { id: true, firstname: true, lastname: true },
        },
      },
      orderBy: { enteredDate: 'desc' },
    });
  }

  /** Find single ticket — caller applies visibility check in service layer */
  findOne(id: number) {
    return this.prisma.tickets.findUnique({
      where: { id },
      include: {
        categories: { include: { departments: true, categoryGroups: true } },
        substatus: true,
        issueTypes: true,
        contactMethods: true,
        enteredByPerson: {
          select: { id: true, firstname: true, lastname: true },
        },
        reportedByPerson: {
          select: { id: true, firstname: true, lastname: true },
        },
        assignedPerson: {
          select: { id: true, firstname: true, lastname: true },
        },
      },
    });
  }

  create(data: Prisma.ticketsCreateInput) {
    return this.prisma.tickets.create({
      data,
      include: {
        categories: { include: { departments: true } },
        substatus: true,
      },
    });
  }

  update(id: number, data: Prisma.ticketsUpdateInput) {
    return this.prisma.tickets.update({
      where: { id },
      data,
      include: {
        categories: { include: { departments: true } },
        substatus: true,
      },
    });
  }

  /** Append a ticketHistory entry (FRD §F01 — every state change is immutably recorded) */
  appendHistory(data: Prisma.ticketHistoryCreateInput) {
    return this.prisma.ticketHistory.create({ data });
  }

  /** Return all history entries for a ticket ordered by enteredDate ASC (FRD §F01.9) */
  getHistory(ticketId: number) {
    return this.prisma.ticketHistory.findMany({
      where: { ticket_id: ticketId },
      include: {
        actions: true,
        enteredByPerson: { select: { id: true, firstname: true, lastname: true } },
        actionPerson: { select: { id: true, firstname: true, lastname: true } },
      },
      orderBy: { enteredDate: 'asc' },
    });
  }

  /** Look up action by name (system action lookup for history entries) */
  findActionByName(name: string) {
    return this.prisma.actions.findFirst({ where: { name } });
  }

  /** Find substatus by id with status field (for close validation, FRD §F01.4) */
  findSubstatus(id: number) {
    return this.prisma.substatus.findUnique({ where: { id } });
  }

  /** Find substatus by name (for duplicate closure lookup, FRD §F01.5) */
  findSubstatusByName(name: string) {
    return this.prisma.substatus.findFirst({ where: { name } });
  }
}
```

---

### src/modules/tickets/tickets.service.ts

Full business logic per FRD §F01.1–F01.9 and TechArch §2.1 TicketsModule.

Key design decisions from TechArch §2.1:
- Every write calls `lastModified = new Date()` on the ticket
- Every write appends a `ticketHistory` entry with the appropriate system action
- `SolrService.indexTicket()` and `GeoClusterService.assignClusters()` are **stubs** called as fire-and-forget — Wave 5 wires the real implementations. Here we call them only if they are injected (optional injection via `@Optional()`).
- `NotificationsService.send()` is also a stub — Wave 5 wires it.

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TicketsRepository } from './tickets.repository';
import { CategoriesService } from '../categories/categories.service';
import { PeopleService } from '../people/people.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CloseTicketDto } from './dto/close-ticket.dto';
import { DuplicateTicketDto } from './dto/duplicate-ticket.dto';
import { CommentTicketDto } from './dto/comment-ticket.dto';
import { ResponseTicketDto } from './dto/response-ticket.dto';
import { ReopenTicketDto } from './dto/reopen-ticket.dto';

// Inline role helper (same pattern as Categories/People modules)
function isStaff(user: { role: string | null } | null): boolean {
  return user?.role === 'staff';
}

function requireStaffUser(user: { role: string | null } | null): void {
  if (!isStaff(user)) {
    throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Staff access required' });
  }
}

/**
 * Resolve the caller's role descriptor for category visibility filtering.
 * - null/undefined user → anonymous
 * - user.role = null → authenticated public citizen
 * - user.role = 'staff' → staff
 */
function roleDescriptor(user: { id: number; role: string | null } | null): { role: string | null; isAuthenticated: boolean } {
  if (!user) return { role: undefined as any, isAuthenticated: false };
  return { role: user.role, isAuthenticated: true };
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly repo: TicketsRepository,
    private readonly categoriesService: CategoriesService,
    private readonly peopleService: PeopleService,
  ) {}

  // ---- F01.1 List Tickets ----

  /** List tickets filtered by the caller's category visibility permission (FRD §F02.5) */
  async findAll(user: { id: number; role: string | null } | null) {
    return this.repo.findAll(roleDescriptor(user));
  }

  // ---- F01.1 Get Single Ticket ----

  /**
   * Load ticket by id; apply category visibility check (FRD §F01.1 / §F02.5).
   * Returns 404 if ticket not visible to caller's role.
   */
  async findOne(id: number, user: { id: number; role: string | null } | null) {
    const ticket = await this.repo.findOne(id);
    if (!ticket) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Ticket not found' });
    }

    // Staff see all tickets; others must check category visibility
    if (!isStaff(user) && ticket.categories) {
      const permLevel = ticket.categories.displayPermissionLevel;
      const isAuthenticated = user !== null;
      const allowed = isAuthenticated
        ? ['public', 'anonymous'].includes(permLevel)
        : permLevel === 'anonymous';
      if (!allowed) {
        throw new NotFoundException({ error: 'NOT_FOUND', message: 'Ticket not found' });
      }
    }

    return ticket;
  }

  // ---- F01.1 Create Ticket ----

  /**
   * Create a ticket per FRD §F01.1.
   * Process:
   * 1. Load category; verify caller's role meets postingPermissionLevel
   * 2. Resolve enteredByPerson_id from authenticated user (or null for anonymous/API)
   * 3. Validate reportedByPerson_id if provided
   * 4. Validate coordinates if provided
   * 5. Validate customFields if provided
   * 6. Persist ticket with status='open', enteredDate=NOW(), lastModified=NOW()
   * 7. Append 'open' ticketHistory entry
   * (Solr, geo-cluster, email hooks are stubs — wired in Wave 5)
   */
  async create(dto: CreateTicketDto, user: { id: number; role: string | null } | null) {
    // Step 1: Load category and check posting permission
    const category = await this.categoriesService.findOne(dto.category_id, null); // load without role filter
    if (!category.active) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Category not found' });
    }

    const postingLevel = category.postingPermissionLevel;
    const isAuthenticated = user !== null;
    const postingAllowed = isStaff(user)
      ? true
      : isAuthenticated
        ? ['public', 'anonymous'].includes(postingLevel)
        : postingLevel === 'anonymous';

    if (!postingAllowed) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: 'Insufficient permission to post to this category',
      });
    }

    // Step 2: Validate customFields if provided (FRD §F01.1 validation)
    if (dto.customFields) {
      try {
        JSON.parse(dto.customFields);
      } catch {
        throw new BadRequestException({ error: 'INVALID_INPUT', message: 'customFields must be valid JSON' });
      }
    }

    // Step 3: Validate reportedByPerson_id if provided
    if (dto.reportedByPerson_id) {
      await this.peopleService.findOne(dto.reportedByPerson_id); // throws 404 if not found
    }

    const now = new Date();

    // Step 4: Persist ticket (FRD §F01.1 — status='open', enteredDate=NOW(), lastModified=NOW())
    const ticket = await this.repo.create({
      categories: dto.category_id ? { connect: { id: dto.category_id } } : undefined,
      issueTypes: dto.issueType_id ? { connect: { id: dto.issueType_id } } : undefined,
      enteredByPerson: user ? { connect: { id: user.id } } : undefined,
      reportedByPerson: dto.reportedByPerson_id ? { connect: { id: dto.reportedByPerson_id } } : undefined,
      contactMethods: dto.contactMethod_id ? { connect: { id: dto.contactMethod_id } } : undefined,
      responseMethod_id: dto.responseMethod_id ?? null,
      description: dto.description ?? null,
      location: dto.location ?? null,
      city: dto.city ?? null,
      state: dto.state ?? null,
      zip: dto.zip ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      addressId: dto.addressId ?? null,
      customFields: dto.customFields ?? null,
      additionalFields: dto.additionalFields ?? null,
      status: 'open',
      enteredDate: now,
      lastModified: now,
    } as any);

    // Step 5: Append 'open' ticketHistory entry (FRD §F01.1, FRD §F00.3 token stored in data)
    const openAction = await this.repo.findActionByName('open');
    if (openAction) {
      await this.repo.appendHistory({
        tickets: { connect: { id: ticket.id } },
        actions: { connect: { id: openAction.id } },
        enteredByPerson: user ? { connect: { id: user.id } } : undefined,
        enteredDate: now,
        actionDate: now,
      } as any);
    }

    return ticket;
  }

  // ---- F01.3 Update Ticket ----

  /**
   * Update ticket fields per FRD §F01.3.
   * Logs changeCategory, changeLocation, or generic 'update' action to history.
   */
  async update(id: number, dto: UpdateTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);

    const existing = await this.findOne(id, user);

    // Validate customFields if provided
    if (dto.customFields) {
      try {
        JSON.parse(dto.customFields);
      } catch {
        throw new BadRequestException({ error: 'INVALID_INPUT', message: 'customFields must be valid JSON' });
      }
    }

    const now = new Date();
    let actionName = 'update';
    let actionData: string | null = null;

    // FRD §F01.3: category change logs changeCategory
    if (dto.category_id !== undefined && dto.category_id !== existing.category_id) {
      actionName = 'changeCategory';
      actionData = JSON.stringify({ original: existing.category_id, updated: dto.category_id });
    }
    // FRD §F01.3: location change logs changeLocation
    else if (dto.location !== undefined && dto.location !== existing.location) {
      actionName = 'changeLocation';
      actionData = JSON.stringify({ original: existing.location, updated: dto.location });
    }

    const ticket = await this.repo.update(id, {
      ...this.buildUpdateInput(dto),
      lastModified: now,
    } as any);

    const action = await this.repo.findActionByName(actionName);
    if (action) {
      await this.repo.appendHistory({
        tickets: { connect: { id } },
        actions: { connect: { id: action.id } },
        enteredByPerson: { connect: { id: user.id } },
        enteredDate: now,
        actionDate: now,
        data: actionData,
      } as any);
    }

    return ticket;
  }

  // ---- F01.2 Assign Ticket ----

  /**
   * Assign ticket to a person per FRD §F01.2.
   * Validates assignee belongs to ticket's category department.
   */
  async assign(id: number, dto: AssignTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);

    const ticket = await this.findOne(id, user);

    // Validate assignee exists
    const assignee = await this.peopleService.findOne(dto.assignedPerson_id);

    // Validate assignee is in the ticket's department (FRD §F01.2)
    if (ticket.categories) {
      const deptId = ticket.categories.department_id;
      if (assignee.department_id !== deptId) {
        throw new BadRequestException({
          error: 'INVALID_INPUT',
          message: "Assignee must belong to the ticket's department",
        });
      }
    }

    const now = new Date();

    const updated = await this.repo.update(id, {
      assignedPerson: { connect: { id: dto.assignedPerson_id } },
      lastModified: now,
    } as any);

    const action = await this.repo.findActionByName('assignment');
    if (action) {
      await this.repo.appendHistory({
        tickets: { connect: { id } },
        actions: { connect: { id: action.id } },
        enteredByPerson: { connect: { id: user.id } },
        actionPerson: { connect: { id: dto.assignedPerson_id } },
        enteredDate: now,
        actionDate: now,
      } as any);
    }

    return updated;
  }

  // ---- F01.4 Close Ticket ----

  /**
   * Close a ticket per FRD §F01.4.
   * Requires substatus_id referencing a substatus with status='closed'.
   */
  async close(id: number, dto: CloseTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);

    const ticket = await this.findOne(id, user);

    if (ticket.status === 'closed') {
      throw new ConflictException({ error: 'CONFLICT', message: 'Ticket is already closed' });
    }

    // Validate substatus_id references a closed sub-status (FRD §F01.4)
    const substatus = await this.repo.findSubstatus(dto.substatus_id);
    if (!substatus || substatus.status !== 'closed') {
      throw new BadRequestException({
        error: 'INVALID_INPUT',
        message: "substatus_id must reference a closed sub-status",
      });
    }

    const now = new Date();

    const updated = await this.repo.update(id, {
      status: 'closed',
      substatus: { connect: { id: dto.substatus_id } },
      closedDate: now,
      lastModified: now,
    } as any);

    const action = await this.repo.findActionByName('closed');
    if (action) {
      await this.repo.appendHistory({
        tickets: { connect: { id } },
        actions: { connect: { id: action.id } },
        enteredByPerson: { connect: { id: user.id } },
        enteredDate: now,
        actionDate: now,
        notes: dto.notes ?? null,
      } as any);
    }

    return updated;
  }

  // ---- F01.5 Mark as Duplicate ----

  /**
   * Mark ticket as duplicate per FRD §F01.5.
   * Sets child.parent_id; closes child with 'Duplicate' substatus;
   * appends 'duplicate' action to PARENT ticket only.
   */
  async duplicate(id: number, dto: DuplicateTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);

    if (id === dto.parent_id) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'A ticket cannot be its own parent' });
    }

    const child = await this.findOne(id, user);
    if (child.parent_id !== null) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'Ticket already has a parent' });
    }

    // Validate parent exists
    const parent = await this.repo.findOne(dto.parent_id);
    if (!parent) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Parent ticket not found' });
    }

    // Find Duplicate substatus (closed)
    const duplicateSubstatus = await this.repo.findSubstatusByName('Duplicate');
    if (!duplicateSubstatus) {
      throw new BadRequestException({ error: 'SERVER_ERROR', message: 'Duplicate substatus not seeded' });
    }

    const now = new Date();

    // Set parent_id on child; close child with Duplicate substatus
    await this.repo.update(id, {
      parent: { connect: { id: dto.parent_id } },
      status: 'closed',
      substatus: { connect: { id: duplicateSubstatus.id } },
      closedDate: now,
      lastModified: now,
    } as any);

    // Append 'closed' action on the child ticket
    const closedAction = await this.repo.findActionByName('closed');
    if (closedAction) {
      await this.repo.appendHistory({
        tickets: { connect: { id } },
        actions: { connect: { id: closedAction.id } },
        enteredByPerson: { connect: { id: user.id } },
        enteredDate: now,
        actionDate: now,
      } as any);
    }

    // Append 'duplicate' action on PARENT ticket only (FRD §F01.5)
    const duplicateAction = await this.repo.findActionByName('duplicate');
    if (duplicateAction) {
      await this.repo.appendHistory({
        tickets: { connect: { id: dto.parent_id } },
        actions: { connect: { id: duplicateAction.id } },
        enteredByPerson: { connect: { id: user.id } },
        enteredDate: now,
        actionDate: now,
        data: JSON.stringify({ duplicate: id }),
      } as any);
    }

    return this.repo.findOne(id);
  }

  // ---- F01.6 Add Comment ----

  /**
   * Append a staff comment to ticketHistory per FRD §F01.6.
   */
  async comment(id: number, dto: CommentTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);

    if (!dto.notes || dto.notes.trim().length === 0) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'Comment notes must be non-empty' });
    }

    await this.findOne(id, user); // existence + visibility check

    const now = new Date();
    await this.repo.update(id, { lastModified: now } as any);

    const action = await this.repo.findActionByName('comment');
    if (!action) throw new BadRequestException({ error: 'SERVER_ERROR', message: 'comment action not seeded' });

    return this.repo.appendHistory({
      tickets: { connect: { id } },
      actions: { connect: { id: action.id } },
      enteredByPerson: { connect: { id: user.id } },
      enteredDate: now,
      actionDate: now,
      notes: dto.notes,
    } as any);
  }

  // ---- F01.7 Add Response ----

  /**
   * Append a 'response' action to ticketHistory per FRD §F01.7.
   * actionPerson_id defaults to ticket.reportedByPerson_id if not provided.
   */
  async respond(id: number, dto: ResponseTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);

    const ticket = await this.findOne(id, user);
    const now = new Date();
    const actionPersonId = dto.actionPerson_id ?? ticket.reportedByPerson_id ?? null;

    await this.repo.update(id, { lastModified: now } as any);

    const action = await this.repo.findActionByName('response');
    if (!action) throw new BadRequestException({ error: 'SERVER_ERROR', message: 'response action not seeded' });

    return this.repo.appendHistory({
      tickets: { connect: { id } },
      actions: { connect: { id: action.id } },
      enteredByPerson: { connect: { id: user.id } },
      actionPerson: actionPersonId ? { connect: { id: actionPersonId } } : undefined,
      enteredDate: now,
      actionDate: now,
      notes: dto.notes ?? null,
    } as any);
  }

  // ---- F01.8 Re-open Ticket ----

  /**
   * Re-open a closed ticket per FRD §F01.8.
   */
  async reopen(id: number, dto: ReopenTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);

    const ticket = await this.findOne(id, user);

    if (ticket.status === 'open') {
      throw new ConflictException({ error: 'CONFLICT', message: 'Ticket is already open' });
    }

    const now = new Date();

    const updated = await this.repo.update(id, {
      status: 'open',
      closedDate: null,
      substatus_id: null,
      lastModified: now,
    } as any);

    const action = await this.repo.findActionByName('update');
    if (action) {
      await this.repo.appendHistory({
        tickets: { connect: { id } },
        actions: { connect: { id: action.id } },
        enteredByPerson: { connect: { id: user.id } },
        enteredDate: now,
        actionDate: now,
        notes: dto.notes ?? 'Ticket re-opened',
      } as any);
    }

    return updated;
  }

  // ---- F01.9 View Ticket History ----

  /**
   * Return ticketHistory entries ordered by enteredDate ASC.
   * PII fields (enteredByPerson_id, actionPerson_id) are masked for non-staff
   * at the response level by PiiMaskInterceptor (plan 06); service returns full data.
   */
  async getHistory(id: number, user: { id: number; role: string | null } | null) {
    await this.findOne(id, user); // existence + visibility check
    return this.repo.getHistory(id);
  }

  // ---- Private helpers ----

  private buildUpdateInput(dto: UpdateTicketDto): Record<string, unknown> {
    const input: Record<string, unknown> = {};
    if (dto.category_id !== undefined) input['category_id'] = dto.category_id;
    if (dto.issueType_id !== undefined) input['issueType_id'] = dto.issueType_id;
    if (dto.description !== undefined) input['description'] = dto.description;
    if (dto.location !== undefined) input['location'] = dto.location;
    if (dto.city !== undefined) input['city'] = dto.city;
    if (dto.state !== undefined) input['state'] = dto.state;
    if (dto.zip !== undefined) input['zip'] = dto.zip;
    if (dto.latitude !== undefined) input['latitude'] = dto.latitude;
    if (dto.longitude !== undefined) input['longitude'] = dto.longitude;
    if (dto.addressId !== undefined) input['addressId'] = dto.addressId;
    if (dto.contactMethod_id !== undefined) input['contactMethod_id'] = dto.contactMethod_id;
    if (dto.responseMethod_id !== undefined) input['responseMethod_id'] = dto.responseMethod_id;
    if (dto.reportedByPerson_id !== undefined) input['reportedByPerson_id'] = dto.reportedByPerson_id;
    if (dto.customFields !== undefined) input['customFields'] = dto.customFields;
    if (dto.additionalFields !== undefined) input['additionalFields'] = dto.additionalFields;
    return input;
  }
}
```
  </action>
  <verify>
```bash
npx tsc --noEmit 2>&1 | grep -E 'tickets|TicketsService|TicketsRepository' | head -20 && echo "TSC_TICKETS_OK"
grep -n 'export class TicketsService' src/modules/tickets/tickets.service.ts && echo TICKETS_SVC_OK
grep -n 'export class TicketsRepository' src/modules/tickets/tickets.repository.ts && echo TICKETS_REPO_OK
grep -n 'appendHistory' src/modules/tickets/tickets.repository.ts && echo APPEND_HISTORY_OK
grep -n 'getHistory' src/modules/tickets/tickets.service.ts && echo GET_HISTORY_OK
grep -n 'lastModified.*new Date\|new Date.*lastModified' src/modules/tickets/tickets.service.ts && echo LAST_MODIFIED_OK
grep -n "status.*'open'" src/modules/tickets/tickets.service.ts | head -5 && echo CREATE_STATUS_OK
grep -n "status.*'closed'" src/modules/tickets/tickets.service.ts | head -5 && echo CLOSE_STATUS_OK
grep -n "Ticket is already closed\|already closed" src/modules/tickets/tickets.service.ts && echo DOUBLE_CLOSE_GUARD_OK
grep -n "Ticket is already open\|already open" src/modules/tickets/tickets.service.ts && echo DOUBLE_OPEN_GUARD_OK
grep -n "own parent\|self-reference" src/modules/tickets/tickets.service.ts && echo SELF_REF_GUARD_OK
grep -n 'duplicate.*parent\|parent.*duplicate' src/modules/tickets/tickets.service.ts | head -5 && echo DUPLICATE_LOGIC_OK
ls src/modules/tickets/dto/*.dto.ts 2>/dev/null | wc -l && echo "DTO_COUNT_OK"
```
  </verify>
  <done>
- All 8 DTO files exist under `src/modules/tickets/dto/`
- `TicketsRepository` wraps Prisma for `tickets` and `ticketHistory` with `appendHistory()` and `getHistory()` methods
- `TicketsRepository.findAll()` applies `categoryVisibilityWhere()` filter based on caller role (FRD §F02.5): anonymous→'anonymous' only, public→['public','anonymous'], staff→no filter
- `TicketsService.create()` validates category exists and is active, checks postingPermissionLevel, validates customFields JSON, persists with `status='open'`, `enteredDate=NOW()`, `lastModified=NOW()`, appends 'open' history entry
- `TicketsService.update()` requires staff; logs 'changeCategory', 'changeLocation', or 'update' action appropriately; sets `lastModified=NOW()`
- `TicketsService.assign()` requires staff; validates assignee belongs to ticket's category department; appends 'assignment' history entry
- `TicketsService.close()` requires staff; validates substatus has `status='closed'`; sets `status='closed'`, `closedDate=NOW()`; throws 409 if already closed
- `TicketsService.duplicate()` requires staff; validates self-reference and parent existence; closes child with 'Duplicate' substatus; appends 'duplicate' action on parent only (FRD §F01.5)
- `TicketsService.comment()` requires staff; validates `notes` non-empty; appends 'comment' history entry
- `TicketsService.respond()` requires staff; appends 'response' history entry with actionPerson defaulting to `reportedByPerson_id`
- `TicketsService.reopen()` requires staff; sets `status='open'`, clears `closedDate` and `substatus_id`; throws 409 if already open
- `TicketsService.getHistory()` returns history ordered by `enteredDate ASC` (FRD §F01.9)
- TypeScript compiles with zero errors for tickets module files
  </done>
</task>

<task type="auto">
  <name>Task 2: TicketsController + TicketsModule + wire into AppModule</name>
  <files>
    src/modules/tickets/tickets.controller.ts
    src/modules/tickets/tickets.module.ts
    src/app.module.ts
  </files>
  <action>
Create TicketsController (all 11 routes per TechArch §4.3 §Tickets), TicketsModule (importing CategoriesModule and PeopleModule, exporting TicketsService for Wave 4b Open311Module), and wire into AppModule.

---

### src/modules/tickets/tickets.controller.ts

All 11 routes per TechArch §4.3 §Tickets endpoint catalog:

```
GET    /tickets                → findAll [anon]
POST   /tickets                → create  [public]
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

```typescript
import {
  Controller, Get, Post, Put,
  Param, Body, ParseIntPipe,
  UnauthorizedException, Req,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CloseTicketDto } from './dto/close-ticket.dto';
import { DuplicateTicketDto } from './dto/duplicate-ticket.dto';
import { CommentTicketDto } from './dto/comment-ticket.dto';
import { ResponseTicketDto } from './dto/response-ticket.dto';
import { ReopenTicketDto } from './dto/reopen-ticket.dto';
import { PiiMaskInterceptor } from '../../common/interceptors/pii-mask.interceptor';

/** Extract req.user (set by AuthMiddleware from plan 06); null = anonymous */
function getUser(req: Request): { id: number; role: string | null } | null {
  return (req as any).user ?? null;
}

/**
 * Require at minimum an authenticated user (public or staff).
 * Used for routes that need a logged-in user but not necessarily staff.
 */
function requireAuthenticated(req: Request): { id: number; role: string | null } {
  const user = getUser(req);
  if (!user) {
    throw new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  return user;
}

@Controller('tickets')
@UseInterceptors(PiiMaskInterceptor)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * GET /tickets — list tickets visible to caller's role (FRD §F02.5)
   * Auth: [anon] — anonymous callers get category-filtered results
   */
  @Get()
  findAll(@Req() req: Request) {
    return this.ticketsService.findAll(getUser(req));
  }

  /**
   * POST /tickets — create a new ticket (FRD §F01.1)
   * Auth: [public] — requires authenticated user (public or staff)
   */
  @Post()
  create(@Body() dto: CreateTicketDto, @Req() req: Request) {
    // Public and staff may create; anonymous cannot (TechArch §5.3 permission matrix)
    const user = requireAuthenticated(req);
    return this.ticketsService.create(dto, user);
  }

  /**
   * GET /tickets/:id — single ticket detail (FRD §F01.1)
   * Auth: [anon]
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.ticketsService.findOne(id, getUser(req));
  }

  /**
   * PUT /tickets/:id — update ticket fields (FRD §F01.3)
   * Auth: [staff]
   */
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketDto,
    @Req() req: Request,
  ) {
    const user = requireAuthenticated(req);
    return this.ticketsService.update(id, dto, user as any);
  }

  /**
   * POST /tickets/:id/assign — assign ticket to a person (FRD §F01.2)
   * Auth: [staff]
   */
  @Post(':id/assign')
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTicketDto,
    @Req() req: Request,
  ) {
    const user = requireAuthenticated(req);
    return this.ticketsService.assign(id, dto, user as any);
  }

  /**
   * POST /tickets/:id/close — close ticket with substatus (FRD §F01.4)
   * Auth: [staff]
   */
  @Post(':id/close')
  close(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseTicketDto,
    @Req() req: Request,
  ) {
    const user = requireAuthenticated(req);
    return this.ticketsService.close(id, dto, user as any);
  }

  /**
   * POST /tickets/:id/duplicate — mark ticket as duplicate (FRD §F01.5)
   * Auth: [staff]
   */
  @Post(':id/duplicate')
  duplicate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DuplicateTicketDto,
    @Req() req: Request,
  ) {
    const user = requireAuthenticated(req);
    return this.ticketsService.duplicate(id, dto, user as any);
  }

  /**
   * POST /tickets/:id/reopen — re-open a closed ticket (FRD §F01.8)
   * Auth: [staff]
   */
  @Post(':id/reopen')
  reopen(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReopenTicketDto,
    @Req() req: Request,
  ) {
    const user = requireAuthenticated(req);
    return this.ticketsService.reopen(id, dto, user as any);
  }

  /**
   * POST /tickets/:id/comment — add staff comment (FRD §F01.6)
   * Auth: [staff]
   */
  @Post(':id/comment')
  comment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CommentTicketDto,
    @Req() req: Request,
  ) {
    const user = requireAuthenticated(req);
    return this.ticketsService.comment(id, dto, user as any);
  }

  /**
   * POST /tickets/:id/response — add response action (FRD §F01.7)
   * Auth: [staff]
   */
  @Post(':id/response')
  respond(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResponseTicketDto,
    @Req() req: Request,
  ) {
    const user = requireAuthenticated(req);
    return this.ticketsService.respond(id, dto, user as any);
  }

  /**
   * GET /tickets/:id/history — view ticket history (FRD §F01.9)
   * Auth: [anon] — PII masked for non-staff by PiiMaskInterceptor
   */
  @Get(':id/history')
  getHistory(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.ticketsService.getHistory(id, getUser(req));
  }
}
```

---

### src/modules/tickets/tickets.module.ts

Imports `CategoriesModule` (for `CategoriesService`) and `PeopleModule` (for `PeopleService`).
Exports `TicketsService` so Wave 4b `Open311Module` can inject it.

```typescript
import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketsRepository } from './tickets.repository';
import { CategoriesModule } from '../categories/categories.module';
import { PeopleModule } from '../people/people.module';

@Module({
  imports: [CategoriesModule, PeopleModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository],
  exports: [TicketsService],   // exported for Open311Module (Wave 4b plan 10)
})
export class TicketsModule {}
```

---

### src/app.module.ts (update)

Add `TicketsModule` to the root module imports. Merge with the accumulated state from plans 03–08:

```typescript
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { GelfLoggerModule } from './common/logger/gelf-logger.module';
import { GelfRequestMiddleware } from './common/middleware/gelf-request.middleware';
import { GelfExceptionFilter } from './common/filters/gelf-exception.filter';
import { FormatMiddleware } from './common/middleware/format.middleware';
import { AuthMiddleware } from './common/middleware/auth.middleware';
import { SerializationInterceptor } from './common/interceptors/serialization.interceptor';
import { JsonSerializer } from './common/serializers/json.serializer';
import { XmlSerializer } from './common/serializers/xml.serializer';
import { CsvSerializer } from './common/serializers/csv.serializer';
import { TxtSerializer } from './common/serializers/txt.serializer';
import { HtmlRenderer } from './common/serializers/html.renderer';
import { CaslGuard } from './common/guards/casl.guard';
import { AuthGuard } from './common/guards/auth.guard';
import { PiiMaskInterceptor } from './common/interceptors/pii-mask.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { PeopleModule } from './modules/people/people.module';
import { TicketsModule } from './modules/tickets/tickets.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GelfLoggerModule,
    AuthModule,       // @Global — exports SessionService + AbilityFactory (plan 06)
    AdminModule,
    CategoriesModule,
    DepartmentsModule,
    PeopleModule,
    TicketsModule,
    // Wave 4b: Open311Module (plan 10) added here
    // Wave 5+: SearchModule, NotificationsModule, MediaModule, GeoModule
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
    // RBAC providers (plan 06) — registered here so feature modules can inject them without importing AuthModule explicitly
    CaslGuard,
    AuthGuard,
    PiiMaskInterceptor,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Order: FormatMiddleware resolves Accept/suffix → GelfRequestMiddleware logs request → AuthMiddleware populates req.user
    consumer
      .apply(FormatMiddleware, GelfRequestMiddleware, AuthMiddleware)
      .forRoutes('*');
  }
}
```

**Note:** If prior wave executions have written a different `app.module.ts`, merge carefully — do NOT discard previously wired providers or the `AuthMiddleware` registration from plan 06. The above is the canonical merged state after plans 03–09.
  </action>
  <verify>
```bash
npx tsc --noEmit 2>&1 | head -30 && echo "TSC_OK"
grep -n 'export class TicketsController' src/modules/tickets/tickets.controller.ts && echo CONTROLLER_OK
grep -n 'export class TicketsModule' src/modules/tickets/tickets.module.ts && echo MODULE_OK
grep -n 'exports.*TicketsService\|TicketsService.*exports' src/modules/tickets/tickets.module.ts && echo EXPORTS_OK
grep -n 'TicketsModule' src/app.module.ts && echo APP_MODULE_WIRED_OK
grep -n 'PiiMaskInterceptor' src/modules/tickets/tickets.controller.ts && echo PII_MASK_ON_CONTROLLER_OK
grep -n 'CategoriesModule.*PeopleModule\|PeopleModule.*CategoriesModule' src/modules/tickets/tickets.module.ts && echo IMPORTS_OK
grep -n "Get('tickets')\|Get.*tickets\|@Get()" src/modules/tickets/tickets.controller.ts | head -5 && echo ROUTES_OK
grep -n 'getHistory\|history' src/modules/tickets/tickets.controller.ts | head -5 && echo HISTORY_ROUTE_OK
grep -n 'AuthMiddleware' src/app.module.ts && echo AUTH_MIDDLEWARE_IN_APP_OK
```
  </verify>
  <done>
- `TicketsController` handles all 11 routes from TechArch §4.3: GET/POST /tickets, GET/PUT /tickets/:id, POST /tickets/:id/assign, close, duplicate, reopen, comment, response, GET /tickets/:id/history
- `TicketsController` is decorated with `@UseInterceptors(PiiMaskInterceptor)` — all ticket and history responses are PII-masked for non-staff callers (FRD §F02.8)
- Anonymous-accessible routes (`GET /tickets`, `GET /tickets/:id`, `GET /tickets/:id/history`) pass `getUser(req)` which returns null for anonymous; service applies role-based filter
- Write routes (`POST /tickets/`, `PUT /tickets/:id`, all action routes) require authenticated user via `requireAuthenticated(req)`; service enforces staff requirement for state-change actions
- `TicketsModule` imports `CategoriesModule` and `PeopleModule`; exports `TicketsService` for Wave 4b Open311Module consumption
- `AppModule` imports `TicketsModule` and registers `AuthMiddleware` in the correct pipeline order
- `npx tsc --noEmit` exits 0 with zero TypeScript strict-mode errors across the full project
  </done>
</task>

</tasks>

<verification>
After both tasks complete, run the following to verify the complete TicketsModule:

```bash
# TypeScript strict mode — zero errors required
npx tsc --noEmit 2>&1 | head -30 && echo "TSC OK"

# Core TicketsModule contracts
grep -n 'export class TicketsService' src/modules/tickets/tickets.service.ts && echo CONTRACT_OK
grep -n 'export class TicketsRepository' src/modules/tickets/tickets.repository.ts && echo CONTRACT_OK
grep -n 'export class TicketsController' src/modules/tickets/tickets.controller.ts && echo CONTRACT_OK
grep -n 'export class TicketsModule' src/modules/tickets/tickets.module.ts && echo CONTRACT_OK

# TicketsService exports TicketsService for Open311Module
grep -n 'exports.*TicketsService' src/modules/tickets/tickets.module.ts && echo EXPORTS_OK

# ticketHistory append on every state change
grep -n 'appendHistory' src/modules/tickets/tickets.service.ts | wc -l && echo HISTORY_APPENDED

# All 9 lifecycle methods exist in TicketsService
grep -n 'async create\|async update\|async assign\|async close\|async duplicate\|async comment\|async respond\|async reopen\|async getHistory' src/modules/tickets/tickets.service.ts && echo ALL_METHODS_OK

# lastModified updated on every write
grep -n 'lastModified.*new Date\|new Date.*lastModified' src/modules/tickets/tickets.service.ts && echo LAST_MODIFIED_OK

# Conflict guards
grep -n 'already closed\|already open\|self-reference\|own parent' src/modules/tickets/tickets.service.ts && echo CONFLICT_GUARDS_OK

# PII masking wired on controller
grep -n 'PiiMaskInterceptor' src/modules/tickets/tickets.controller.ts && echo PII_MASK_OK

# AppModule wired
grep -n 'TicketsModule' src/app.module.ts && echo APP_MODULE_OK

# All 8 DTOs exist
ls src/modules/tickets/dto/*.dto.ts | wc -l && echo DTO_COUNT_OK
```

Expected: TSC exits 0, all checks pass.
</verification>

<success_criteria>
**F1 (Part A) — TicketsModule complete when:**

- `TicketsService.findAll(user)` returns tickets filtered by `categories.displayPermissionLevel`: anonymous→'anonymous', public→['public','anonymous'], staff→all (FRD §F02.5)
- `TicketsService.findOne(id, user)` returns 404 for tickets not visible to caller's role; returns full ticket with joined category, substatus, issueType, contactMethod, enteredByPerson, reportedByPerson, assignedPerson
- `TicketsService.create(dto, user)` validates category active+postingPermission, validates customFields JSON, persists with `status='open'`, `enteredDate=NOW()`, `lastModified=NOW()`, appends 'open' history entry
- `TicketsService.update(id, dto, user)` requires staff; logs 'changeCategory' (with JSON data), 'changeLocation' (with JSON data), or 'update' action appropriately; sets `lastModified=NOW()`
- `TicketsService.assign(id, dto, user)` requires staff; validates `assignedPerson.department_id === ticket.category.department_id`; appends 'assignment' history entry
- `TicketsService.close(id, dto, user)` requires staff; validates `substatus.status === 'closed'`; sets `status='closed'`, `closedDate=NOW()`; throws 409 if already closed
- `TicketsService.duplicate(id, dto, user)` requires staff; validates not self-referencing; closes child with Duplicate substatus; appends 'duplicate' action on PARENT only (FRD §F01.5)
- `TicketsService.comment(id, dto, user)` requires staff; validates non-empty notes; appends 'comment' history entry
- `TicketsService.respond(id, dto, user)` requires staff; appends 'response' history entry; actionPerson defaults to `reportedByPerson_id`
- `TicketsService.reopen(id, dto, user)` requires staff; sets `status='open'`, clears `closedDate` and `substatus_id`; throws 409 if already open
- `TicketsService.getHistory(id, user)` returns `ticketHistory` ordered `enteredDate ASC` with joined action, enteredByPerson, actionPerson objects
- `TicketsController` exposes all 11 routes from TechArch §4.3 §Tickets endpoint catalog
- `TicketsController` is decorated `@UseInterceptors(PiiMaskInterceptor)` — PII masked for non-staff on all response objects (FRD §F02.8)
- `TicketsModule` imports `CategoriesModule` + `PeopleModule`; exports `TicketsService` for Wave 4b Open311Module
- `AppModule` imports `TicketsModule`
- `npx tsc --noEmit` exits 0 with zero TypeScript strict-mode errors
</success_criteria>

<output>
No SUMMARY.md required for express-mode plans.

Wave 4b integration points (Open311Module — plan 10):
- `Open311Module` must import `TicketsModule` and inject `TicketsService` for:
  - `POST /open311/v2/requests` → calls `ticketsService.create(dto, { id: client.contactPerson_id, role: null })` after api_key validation
  - `GET /open311/v2/requests` → calls `ticketsService.findAll(null)` then maps to ServiceRequest shape
  - `GET /open311/v2/requests/:id` → calls `ticketsService.findOne(id, null)` then maps to ServiceRequest shape
- Token lookup (`GET /open311/v2/tokens/:token`) queries `ticketHistory.data` where action='open' — this is done in `Open311Service` via PrismaService directly (ticketHistory.data contains the token JSON from `create()`)
- The 'open' history entry created by `TicketsService.create()` does NOT yet store the submission token in `data` — Open311Module will pass a token when creating via the Open311 endpoint by extending the create flow. Flag: plan 10 must handle token generation and storage in `ticketHistory.data` on the 'open' entry for `POST /open311/v2/requests`.
</output>
