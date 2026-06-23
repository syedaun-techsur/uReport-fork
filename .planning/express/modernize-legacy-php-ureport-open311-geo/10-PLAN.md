---
phase: wave-4-backend
plan: 10
type: execute
wave: 4
depends_on: [3]
files_modified:
  - src/modules/tickets/tickets.service.ts
  - src/modules/tickets/tickets.repository.ts
  - src/modules/tickets/tickets.controller.ts
  - src/modules/tickets/tickets.module.ts
  - src/modules/tickets/dto/close-ticket.dto.ts
  - src/modules/tickets/dto/duplicate-ticket.dto.ts
  - src/modules/tickets/dto/comment-ticket.dto.ts
  - src/modules/tickets/dto/response-ticket.dto.ts
  - src/modules/tickets/dto/reopen-ticket.dto.ts
  - src/modules/tickets/dto/list-tickets.dto.ts
  - src/modules/tickets/dto/update-ticket.dto.ts
  - src/app.module.ts
autonomous: true

features:
  implements: ["F1"]
  depends_on: ["F2", "F6", "F15"]
  enables: ["F0", "F5", "F7", "F8", "F9"]

must_haves:
  truths:
    - "POST /tickets/:id/close sets status='closed', closedDate=NOW(), substatus_id, lastModified=NOW() and appends 'closed' action to ticketHistory"
    - "POST /tickets/:id/close returns 409 when ticket is already closed"
    - "POST /tickets/:id/close returns 400 when substatus_id does not reference a substatus with status='closed'"
    - "POST /tickets/:id/duplicate sets parent_id on child ticket, closes child with substatus='Duplicate', and appends 'duplicate' action to PARENT ticketHistory only"
    - "POST /tickets/:id/duplicate returns 400 when ticket_id == parent_id (self-reference)"
    - "POST /tickets/:id/duplicate returns 400 when child already has a parent_id set"
    - "POST /tickets/:id/comment appends 'comment' action to ticketHistory and updates lastModified"
    - "POST /tickets/:id/comment returns 400 when notes is empty"
    - "POST /tickets/:id/response appends 'response' action to ticketHistory with actionPerson_id and updates lastModified"
    - "POST /tickets/:id/reopen sets status='open', clears closedDate and substatus_id, appends 'update' action, updates lastModified"
    - "POST /tickets/:id/reopen returns 409 when ticket is already open"
    - "PUT /tickets/:id with category_id change appends 'changeCategory' action with data={original, updated}"
    - "PUT /tickets/:id with location change appends 'changeLocation' action with data={original, updated}"
    - "PUT /tickets/:id with other field changes appends 'update' action"
    - "GET /tickets returns paginated list filtered by caller's role category visibility (displayPermissionLevel)"
    - "GET /tickets supports ?status, ?category_id, ?assignedPerson_id, ?page, ?page_size query params"
    - "GET /tickets/:id/history returns ticketHistory entries ordered by enteredDate ASC"
    - "TicketsModule is imported into AppModule"
  artifacts:
    - path: "src/modules/tickets/tickets.service.ts"
      provides: "TicketsService — close, duplicate, comment, response, reopen, update(changeCategory/changeLocation), list, history"
      exports: ["TicketsService"]
    - path: "src/modules/tickets/tickets.repository.ts"
      provides: "TicketsRepository — Prisma queries for tickets and ticketHistory with role-based category filter"
      exports: ["TicketsRepository"]
    - path: "src/modules/tickets/tickets.controller.ts"
      provides: "TicketsController — all lifecycle action routes plus list and history endpoints"
      exports: ["TicketsController"]
    - path: "src/modules/tickets/tickets.module.ts"
      provides: "TicketsModule — exports TicketsService for Open311Module and wave 5 integration"
      exports: ["TicketsModule", "TicketsService"]
  key_links:
    - from: "src/modules/tickets/tickets.service.ts"
      to: "prisma/schema.prisma"
      via: "TicketsRepository prisma.ticketHistory.create for every state change"
      pattern: "prisma\\.ticketHistory\\.create"
    - from: "src/modules/tickets/tickets.service.ts"
      to: "src/modules/tickets/tickets.service.ts"
      via: "duplicate() appends 'duplicate' history entry to parent ticket, not child"
      pattern: "parent_id.*ticketHistory\\|ticketHistory.*parent"
    - from: "src/modules/tickets/tickets.controller.ts"
      to: "src/modules/tickets/tickets.service.ts"
      via: "NestJS DI injection"
      pattern: "ticketsService\\."
    - from: "src/app.module.ts"
      to: "src/modules/tickets/tickets.module.ts"
      via: "AppModule imports"
      pattern: "TicketsModule"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "prisma/schema.prisma"
      exports: ["tickets", "ticketHistory", "substatus", "actions", "categories"]
      verify: "grep -n 'model tickets' prisma/schema.prisma && grep -n 'model ticketHistory' prisma/schema.prisma && grep -n 'model substatus' prisma/schema.prisma && grep -n 'model actions' prisma/schema.prisma && echo CONTRACT_OK"
    - from_plan: "06"
      artifact: "src/modules/auth/ability.factory.ts"
      exports: ["AbilityFactory"]
      verify: "grep -n 'export class AbilityFactory' src/modules/auth/ability.factory.ts && echo CONTRACT_OK"
    - from_plan: "06"
      artifact: "src/common/guards/casl.guard.ts"
      exports: ["CaslGuard"]
      verify: "grep -n 'export class CaslGuard' src/common/guards/casl.guard.ts && echo CONTRACT_OK"
    - from_plan: "06"
      artifact: "src/common/guards/auth.guard.ts"
      exports: ["AuthGuard"]
      verify: "grep -n 'export class AuthGuard' src/common/guards/auth.guard.ts && echo CONTRACT_OK"
    - from_plan: "06"
      artifact: "src/common/interceptors/pii-mask.interceptor.ts"
      exports: ["PiiMaskInterceptor"]
      verify: "grep -n 'export class PiiMaskInterceptor' src/common/interceptors/pii-mask.interceptor.ts && echo CONTRACT_OK"
    - from_plan: "07"
      artifact: "src/modules/categories/categories.service.ts"
      exports: ["CategoriesService"]
      verify: "grep -n 'export class CategoriesService' src/modules/categories/categories.service.ts && echo CONTRACT_OK"
    - from_plan: "08"
      artifact: "src/modules/people/people.service.ts"
      exports: ["PeopleService"]
      verify: "grep -n 'export class PeopleService' src/modules/people/people.service.ts && echo CONTRACT_OK"
  provides:
    - artifact: "src/modules/tickets/tickets.module.ts"
      exports: ["TicketsModule", "TicketsService"]
      shape: |
        @Module({
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
          list(role: string | null, filters: ListTicketsDto): Promise<{ total: number; page: number; pageSize: number; results: tickets[] }>
          findOne(id: number, role: string | null): Promise<tickets>
          close(ticketId: number, dto: CloseTicketDto, actorId: number): Promise<tickets>
          duplicate(ticketId: number, dto: DuplicateTicketDto, actorId: number): Promise<tickets>
          addComment(ticketId: number, dto: CommentTicketDto, actorId: number): Promise<ticketHistory>
          addResponse(ticketId: number, dto: ResponseTicketDto, actorId: number): Promise<ticketHistory>
          reopen(ticketId: number, dto: ReopenTicketDto, actorId: number): Promise<tickets>
          update(ticketId: number, dto: UpdateTicketDto, actorId: number): Promise<tickets>
          getHistory(ticketId: number, role: string | null): Promise<ticketHistory[]>
        }
      verify: "grep -n 'export class TicketsService' src/modules/tickets/tickets.service.ts && grep -n 'close\|duplicate\|addComment\|addResponse\|reopen\|getHistory' src/modules/tickets/tickets.service.ts && echo CONTRACT_OK"
    - artifact: "src/modules/tickets/tickets.repository.ts"
      exports: ["TicketsRepository"]
      shape: |
        @Injectable()
        export class TicketsRepository {
          findAll(where: Prisma.ticketsWhereInput, page: number, pageSize: number): Promise<{ total: number; results: tickets[] }>
          findOne(id: number): Promise<tickets | null>
          update(id: number, data: Prisma.ticketsUpdateInput): Promise<tickets>
          appendHistory(data: Prisma.ticketHistoryCreateInput): Promise<ticketHistory>
          getHistory(ticketId: number): Promise<ticketHistory[]>
          getActionByName(name: string): Promise<actions | null>
          getSubstatus(id: number): Promise<substatus | null>
        }
      verify: "grep -n 'export class TicketsRepository' src/modules/tickets/tickets.repository.ts && grep -n 'appendHistory\|getHistory\|getActionByName' src/modules/tickets/tickets.repository.ts && echo CONTRACT_OK"
---

<objective>
Implement the TicketsModule Part B: the remaining lifecycle operations (close, duplicate, comment, response, reopen), the update action with changeCategory/changeLocation audit trail entries, the paginated/filtered ticket list endpoint with RBAC category-visibility filtering, and the ticket history endpoint. Wire the module into AppModule.

Purpose: This plan completes the TicketsModule (the P0 core CRM feature). Plan 09 delivers ticket create and assign; this plan delivers all write actions on existing tickets plus the list/search/history read endpoints that Open311Module (plan 11) and the Search integration (wave 5) consume. Every state transition appends an immutable `ticketHistory` row — that audit trail is the source of truth for the Open311 `status_notes`, wave-5 Solr indexing hooks, and wave-5 email notification triggers.

Output:
- `src/modules/tickets/tickets.service.ts` — TicketsService with close, duplicate, comment, response, reopen, update(changeCategory/changeLocation), list (paginated + role-filtered), getHistory
- `src/modules/tickets/tickets.repository.ts` — TicketsRepository wrapping Prisma for tickets + ticketHistory
- `src/modules/tickets/tickets.controller.ts` — TicketsController with all action sub-routes + list + history
- `src/modules/tickets/tickets.module.ts` — module wiring, exports TicketsService
- All DTOs for the above actions
- `src/app.module.ts` updated to import TicketsModule
</objective>

<feature_dependencies>
Implements: F1: Ticket Lifecycle Management — Part B: ticket close with substatus (F01.4); duplicate detection and parent_id linking with audit on parent only (F01.5); comment creation (F01.6); response action with actionPerson_id (F01.7); reopen (F01.8); update with changeCategory/changeLocation/update audit actions (F01.3); ticket list endpoint with pagination and RBAC category-visibility filtering; ticket history endpoint (F01.9) with PII masking for non-staff
Depends on: F6: PostgreSQL schema (tickets, ticketHistory, substatus, actions DDL via Prisma); F2: RBAC (CaslGuard, AuthGuard, PiiMaskInterceptor, AbilityFactory from plan 06); F15: Sub-Status & Action reference data (substatus and actions rows seeded; service queries by action.name)
Enables: F0: Open311Module consumes TicketsService.findOne for GET /requests/:id; F5: SolrService.indexTicket() hook invocation points established in TicketsService; F7: NotificationsService.send() hook invocation points established; F8: MediaModule appends upload_media history via TicketsService hooks; F9: GeoClusterService.assignClusters() hook invocation points established
</feature_dependencies>

<execution_context>
@.planning/express/modernize-legacy-php-ureport-open311-geo/WAVE-SCHEDULE.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@project_specs/FRD-uReport.md (F01 section §F01.3–F01.9)
@project_specs/TechArch-uReport.md (§2.1 TicketsModule, §3.2 DDL tickets+ticketHistory, §4.3 §Tickets routes, §5.3 RBAC, §5.4 PII masking)
@.planning/express/modernize-legacy-php-ureport-open311-geo/06-PLAN.md
@.planning/express/modernize-legacy-php-ureport-open311-geo/07-PLAN.md
@.planning/express/modernize-legacy-php-ureport-open311-geo/08-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: TicketsRepository + TicketsService (close, duplicate, comment, response, reopen, update, list, history)</name>
  <files>
    src/modules/tickets/tickets.repository.ts
    src/modules/tickets/tickets.service.ts
    src/modules/tickets/dto/close-ticket.dto.ts
    src/modules/tickets/dto/duplicate-ticket.dto.ts
    src/modules/tickets/dto/comment-ticket.dto.ts
    src/modules/tickets/dto/response-ticket.dto.ts
    src/modules/tickets/dto/reopen-ticket.dto.ts
    src/modules/tickets/dto/list-tickets.dto.ts
    src/modules/tickets/dto/update-ticket.dto.ts
  </files>
  <action>
Create the TicketsRepository (thin Prisma wrapper) and the TicketsService implementing all lifecycle operations and the list/history queries.

**NOTE:** This plan assumes plan 09 has already created:
- `src/modules/tickets/tickets.module.ts` (skeleton)
- `src/modules/tickets/dto/create-ticket.dto.ts`
- `src/modules/tickets/dto/assign-ticket.dto.ts`
- The `create()` and `assign()` methods on TicketsService

If plan 09 does NOT yet exist, this task creates the full module from scratch including those methods. Either way, the final file state must match the complete service below.

---

## Directory structure

```
src/modules/tickets/
├── tickets.module.ts
├── tickets.controller.ts
├── tickets.service.ts
├── tickets.repository.ts
└── dto/
    ├── create-ticket.dto.ts      ← from plan 09 (or create here)
    ├── assign-ticket.dto.ts      ← from plan 09 (or create here)
    ├── close-ticket.dto.ts
    ├── duplicate-ticket.dto.ts
    ├── comment-ticket.dto.ts
    ├── response-ticket.dto.ts
    ├── reopen-ticket.dto.ts
    ├── list-tickets.dto.ts
    └── update-ticket.dto.ts
```

---

### DTOs

#### src/modules/tickets/dto/close-ticket.dto.ts

Per FRD §F01.4: substatus_id required, notes optional.

```typescript
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CloseTicketDto {
  /** Must reference a substatus with status = 'closed' (FRD §F01.4) */
  @IsInt()
  @Type(() => Number)
  substatus_id: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

#### src/modules/tickets/dto/duplicate-ticket.dto.ts

Per FRD §F01.5: parent_id required.

```typescript
import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class DuplicateTicketDto {
  /** The canonical parent ticket ID (FRD §F01.5) */
  @IsInt()
  @Type(() => Number)
  parent_id: number;
}
```

#### src/modules/tickets/dto/comment-ticket.dto.ts

Per FRD §F01.6: notes required and non-empty.

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class CommentTicketDto {
  @IsString()
  @IsNotEmpty({ message: 'notes must be non-empty (FRD §F01.6)' })
  notes: string;
}
```

#### src/modules/tickets/dto/response-ticket.dto.ts

Per FRD §F01.7: notes optional, actionPerson_id optional (defaults to reportedByPerson_id).

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

#### src/modules/tickets/dto/reopen-ticket.dto.ts

Per FRD §F01.8: notes optional.

```typescript
import { IsOptional, IsString } from 'class-validator';

export class ReopenTicketDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
```

#### src/modules/tickets/dto/list-tickets.dto.ts

Per TechArch §4.3 §Tickets and FRD §F00.4 filter params adapted for native ticket list:

```typescript
import { IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListTicketsDto {
  /** Filter by status: 'open' or 'closed' */
  @IsOptional()
  @IsIn(['open', 'closed'])
  status?: 'open' | 'closed';

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  category_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  assignedPerson_id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  page_size?: number = 25;
}
```

#### src/modules/tickets/dto/update-ticket.dto.ts

Per FRD §F01.3 updatable fields:

```typescript
import {
  IsOptional, IsInt, IsString, MaxLength,
  IsNumber, Min, Max, IsJSON,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTicketDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  category_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  issueType_id?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  zip?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  @IsJSON()
  customFields?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  additionalFields?: string;
}
```

---

### src/modules/tickets/tickets.repository.ts

Thin Prisma wrapper. Business logic lives in the service.

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

/** Helper: permissionLevel filter array by role (FRD §F02.5) */
export function permissionLevels(role: string | null | undefined): string[] {
  if (role === 'staff') return ['staff', 'public', 'anonymous'];
  if (role) return ['public', 'anonymous']; // authenticated public
  return ['anonymous'];                     // anonymous
}

@Injectable()
export class TicketsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Paginated ticket list with role-based category visibility filter (FRD §F02.5).
   * Returns { total, results } — controller wraps into envelope.
   */
  async findAll(
    role: string | null | undefined,
    where: Prisma.ticketsWhereInput,
    page: number,
    pageSize: number,
  ) {
    const levels = permissionLevels(role);
    // Merge category visibility filter with caller-supplied filters
    const fullWhere: Prisma.ticketsWhereInput = {
      ...where,
      categories: { displayPermissionLevel: { in: levels } },
    };

    const [total, results] = await this.prisma.$transaction([
      this.prisma.tickets.count({ where: fullWhere }),
      this.prisma.tickets.findMany({
        where: fullWhere,
        include: {
          categories: true,
          substatus: true,
          assignedPerson: { select: { id: true, firstname: true, lastname: true } },
        },
        orderBy: { lastModified: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, results };
  }

  /** Single ticket with category relation for visibility check */
  findOne(id: number) {
    return this.prisma.tickets.findUnique({
      where: { id },
      include: {
        categories: true,
        substatus: true,
        assignedPerson: { select: { id: true, firstname: true, lastname: true } },
        reportedByPerson: { select: { id: true, firstname: true, lastname: true } },
        enteredByPerson: { select: { id: true, firstname: true, lastname: true } },
      },
    });
  }

  /** Update ticket record and return updated row */
  update(id: number, data: Prisma.ticketsUpdateInput) {
    return this.prisma.tickets.update({
      where: { id },
      include: { categories: true, substatus: true },
      data,
    });
  }

  /**
   * Append an immutable ticketHistory row (FRD §F01 — every state change logged).
   * action_id is resolved by the service via getActionByName().
   */
  appendHistory(data: Prisma.ticketHistoryCreateInput) {
    return this.prisma.ticketHistory.create({ data });
  }

  /**
   * History for a ticket ordered by enteredDate ASC (FRD §F01.9).
   * Includes action relation for action.name in responses.
   */
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

  /** Look up a system action by name (used to resolve action_id for history entries) */
  getActionByName(name: string) {
    return this.prisma.actions.findFirst({ where: { name } });
  }

  /** Look up a substatus by id for validation */
  getSubstatus(id: number) {
    return this.prisma.substatus.findUnique({ where: { id } });
  }

  /** Create a new ticket (used by plan 09 create() and potentially here) */
  createTicket(data: Prisma.ticketsCreateInput) {
    return this.prisma.tickets.create({
      data,
      include: { categories: true, substatus: true },
    });
  }
}
```

---

### src/modules/tickets/tickets.service.ts

Implements FRD §F01.3–F01.9. Hook comments mark where wave-5 integrations (Solr, Notifications, Geo) plug in.

**Key design decisions per FRD/TechArch:**
- Every write calls `appendHistory()` — immutable audit trail (TechArch §2.1 TicketsModule)
- `duplicate()` appends `duplicate` history to **parent** only; child's record is the `closed` history entry (FRD §F01.5)
- `update()` inspects diff and emits `changeCategory`, `changeLocation`, or `update` action (FRD §F01.3)
- Solr and Notification hooks are fire-and-forget stubs that will be wired in wave 5 (F5, F7)
- `list()` applies category visibility filter via TicketsRepository (FRD §F02.5)

```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TicketsRepository, permissionLevels } from './tickets.repository';
import { CloseTicketDto } from './dto/close-ticket.dto';
import { DuplicateTicketDto } from './dto/duplicate-ticket.dto';
import { CommentTicketDto } from './dto/comment-ticket.dto';
import { ResponseTicketDto } from './dto/response-ticket.dto';
import { ReopenTicketDto } from './dto/reopen-ticket.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import type { Prisma } from '@prisma/client';

@Injectable()
export class TicketsService {
  constructor(private readonly repo: TicketsRepository) {}

  // =========================================================
  // Internal helpers
  // =========================================================

  private async loadTicket(id: number, role?: string | null) {
    const ticket = await this.repo.findOne(id);
    if (!ticket) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Ticket not found' });
    }
    // Visibility check per FRD §F02.5 — ticket hidden if category not visible to role
    if (ticket.categories) {
      const levels = permissionLevels(role);
      if (!levels.includes(ticket.categories.displayPermissionLevel)) {
        throw new NotFoundException({ error: 'NOT_FOUND', message: 'Ticket not found' });
      }
    }
    return ticket;
  }

  private async resolveAction(name: string) {
    const action = await this.repo.getActionByName(name);
    if (!action) {
      throw new Error(`System action '${name}' not found in actions table — ensure seed data is present`);
    }
    return action;
  }

  // =========================================================
  // F01.1 Create Ticket (stub — full implementation in plan 09)
  // plan 09 implements create(); this file extends the same service class.
  // The stubs below are here so this file compiles standalone if plan 09 hasn't run.
  // =========================================================

  // =========================================================
  // F01.3 Update Ticket (changeCategory / changeLocation / update)
  // =========================================================

  /**
   * FRD §F01.3: Update ticket fields with appropriate audit action.
   * - category_id change → 'changeCategory' action, data = { original, updated }
   * - location change → 'changeLocation' action, data = { original, updated }
   * - other changes → 'update' action
   * All three update lastModified.
   * Hooks: Solr re-index (wave 5), geo re-cluster (wave 5 if lat/lon changed).
   */
  async update(ticketId: number, dto: UpdateTicketDto, actorId: number) {
    const ticket = await this.loadTicket(ticketId, 'staff');

    // Validate new category if changed
    if (dto.category_id !== undefined && dto.category_id !== ticket.category_id) {
      // category existence checked at DB level via FK; no separate load needed
      // (constraint violation surfaces as Prisma P2003 if invalid)
    }

    // Validate customFields JSON if provided (FRD §F01.3, §F01.1 validation)
    if (dto.customFields !== undefined && dto.customFields !== null) {
      try { JSON.parse(dto.customFields); } catch {
        throw new BadRequestException({ error: 'INVALID_INPUT', message: 'customFields must be valid JSON' });
      }
    }

    // Validate coordinate ranges (FRD §F01.1 / §F01.3)
    if (dto.latitude !== undefined && (dto.latitude < -90 || dto.latitude > 90)) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'Coordinates out of valid range' });
    }
    if (dto.longitude !== undefined && (dto.longitude < -180 || dto.longitude > 180)) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'Coordinates out of valid range' });
    }

    const now = new Date();

    // Determine and log action type (FRD §F01.3)
    if (dto.category_id !== undefined && dto.category_id !== ticket.category_id) {
      const action = await this.resolveAction('changeCategory');
      await this.repo.appendHistory({
        ticket_id: ticketId,
        action_id: action.id,
        enteredByPerson_id: actorId,
        enteredDate: now,
        actionDate: now,
        data: JSON.stringify({ original: ticket.category_id, updated: dto.category_id }),
        notes: null,
        sentNotifications: null,
      } as Prisma.ticketHistoryCreateInput);
    } else if (dto.location !== undefined && dto.location !== ticket.location) {
      const action = await this.resolveAction('changeLocation');
      await this.repo.appendHistory({
        ticket_id: ticketId,
        action_id: action.id,
        enteredByPerson_id: actorId,
        enteredDate: now,
        actionDate: now,
        data: JSON.stringify({ original: ticket.location, updated: dto.location }),
        notes: null,
        sentNotifications: null,
      } as Prisma.ticketHistoryCreateInput);
    } else {
      const action = await this.resolveAction('update');
      await this.repo.appendHistory({
        ticket_id: ticketId,
        action_id: action.id,
        enteredByPerson_id: actorId,
        enteredDate: now,
        actionDate: now,
        data: null,
        notes: null,
        sentNotifications: null,
      } as Prisma.ticketHistoryCreateInput);
    }

    const updated = await this.repo.update(ticketId, {
      ...dto,
      lastModified: now,
    } as unknown as Prisma.ticketsUpdateInput);

    // HOOK: wave 5 — SolrService.indexTicket(ticketId) — fire-and-forget
    // HOOK: wave 5 — if lat/lon changed: GeoClusterService.assignClusters(ticketId, lat, lon)

    return updated;
  }

  // =========================================================
  // F01.4 Close Ticket
  // =========================================================

  /**
   * FRD §F01.4: Close ticket with substatus.
   * - Validates substatus exists and has status = 'closed'
   * - Validates ticket is currently open (409 if already closed)
   * - Sets status='closed', closedDate=NOW(), substatus_id, lastModified=NOW()
   * - Appends 'closed' action to ticketHistory
   * Hook: Solr re-index (wave 5), 'closed' email notification (wave 5).
   */
  async close(ticketId: number, dto: CloseTicketDto, actorId: number) {
    const ticket = await this.loadTicket(ticketId, 'staff');

    // FRD §F01.4 validation
    if (ticket.status === 'closed') {
      throw new ConflictException({ error: 'CONFLICT', message: 'Ticket is already closed' });
    }

    const sub = await this.repo.getSubstatus(dto.substatus_id);
    if (!sub || sub.status !== 'closed') {
      throw new BadRequestException({
        error: 'INVALID_INPUT',
        message: 'substatus_id must reference a closed sub-status',
      });
    }

    const action = await this.resolveAction('closed');
    const now = new Date();

    // Append audit entry BEFORE updating ticket (consistent ordering)
    await this.repo.appendHistory({
      ticket_id: ticketId,
      action_id: action.id,
      enteredByPerson_id: actorId,
      enteredDate: now,
      actionDate: now,
      notes: dto.notes ?? null,
      data: null,
      sentNotifications: null,
    } as Prisma.ticketHistoryCreateInput);

    const updated = await this.repo.update(ticketId, {
      status: 'closed',
      substatus_id: dto.substatus_id,
      closedDate: now,
      lastModified: now,
    });

    // HOOK: wave 5 — SolrService.indexTicket(ticketId)
    // HOOK: wave 5 — NotificationsService.send('closed', ticket, actorId)

    return updated;
  }

  // =========================================================
  // F01.5 Mark as Duplicate
  // =========================================================

  /**
   * FRD §F01.5: Mark child ticket as duplicate of parent.
   *
   * CRITICAL RULE (FRD §F01.5):
   * - 'duplicate' action is appended to PARENT ticketHistory only
   *   with data = { duplicate: child_ticket_id }
   * - Child's record of the event is its 'closed' action entry
   *   (substatus = the 'Duplicate' substatus row)
   * - Child gets parent_id set
   */
  async duplicate(ticketId: number, dto: DuplicateTicketDto, actorId: number) {
    // Self-reference guard (FRD §F01.5)
    if (ticketId === dto.parent_id) {
      throw new BadRequestException({
        error: 'INVALID_INPUT',
        message: 'A ticket cannot be its own parent',
      });
    }

    const child = await this.loadTicket(ticketId, 'staff');
    const parent = await this.repo.findOne(dto.parent_id);
    if (!parent) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Parent ticket not found' });
    }

    // Child must not already be linked to a parent (FRD §F01.5)
    if (child.parent_id !== null) {
      throw new BadRequestException({
        error: 'INVALID_INPUT',
        message: 'Ticket already has a parent_id — it is already marked as a duplicate',
      });
    }

    // Find the 'Duplicate' substatus (name = 'Duplicate', status = 'closed')
    const duplicateSub = await this.repo['prisma' as any]?.substatus?.findFirst({
      where: { name: 'Duplicate', status: 'closed' },
    }) ?? await this.findDuplicateSubstatus();

    const closedAction = await this.resolveAction('closed');
    const duplicateAction = await this.resolveAction('duplicate');
    const now = new Date();

    // 1. Close child with substatus = Duplicate (appends 'closed' history on child)
    await this.repo.appendHistory({
      ticket_id: ticketId,
      action_id: closedAction.id,
      enteredByPerson_id: actorId,
      enteredDate: now,
      actionDate: now,
      notes: null,
      data: null,
      sentNotifications: null,
    } as Prisma.ticketHistoryCreateInput);

    await this.repo.update(ticketId, {
      parent_id: dto.parent_id,
      status: 'closed',
      substatus_id: duplicateSub.id,
      closedDate: now,
      lastModified: now,
    });

    // 2. Append 'duplicate' action to PARENT ticketHistory only (FRD §F01.5)
    await this.repo.appendHistory({
      ticket_id: dto.parent_id,
      action_id: duplicateAction.id,
      enteredByPerson_id: actorId,
      enteredDate: now,
      actionDate: now,
      notes: null,
      data: JSON.stringify({ duplicate: ticketId }),
      sentNotifications: null,
    } as Prisma.ticketHistoryCreateInput);

    // Update parent lastModified (duplicate event touches parent)
    await this.repo.update(dto.parent_id, { lastModified: now });

    const updatedChild = await this.repo.findOne(ticketId);

    // HOOK: wave 5 — NotificationsService.send('duplicate', child, actorId)

    return updatedChild!;
  }

  /** Find the 'Duplicate' substatus row via PrismaService */
  private async findDuplicateSubstatus() {
    // PrismaService is accessible via repo injected PrismaService
    const sub = await (this.repo as any).prisma.substatus.findFirst({
      where: { name: 'Duplicate', status: 'closed' },
    });
    if (!sub) {
      throw new Error("'Duplicate' substatus row not found — ensure seed data is present");
    }
    return sub;
  }

  // =========================================================
  // F01.6 Add Comment
  // =========================================================

  /**
   * FRD §F01.6: Append 'comment' action to ticketHistory; update lastModified.
   * notes must be non-empty (validated at DTO level; double-checked here).
   */
  async addComment(ticketId: number, dto: CommentTicketDto, actorId: number) {
    await this.loadTicket(ticketId, 'staff');

    if (!dto.notes || dto.notes.trim().length === 0) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'notes must be non-empty' });
    }

    const action = await this.resolveAction('comment');
    const now = new Date();

    const history = await this.repo.appendHistory({
      ticket_id: ticketId,
      action_id: action.id,
      enteredByPerson_id: actorId,
      enteredDate: now,
      actionDate: now,
      notes: dto.notes,
      data: null,
      sentNotifications: null,
    } as Prisma.ticketHistoryCreateInput);

    await this.repo.update(ticketId, { lastModified: now });

    return history;
  }

  // =========================================================
  // F01.7 Add Response
  // =========================================================

  /**
   * FRD §F01.7: Append 'response' action to ticketHistory.
   * actionPerson_id defaults to ticket.reportedByPerson_id if not supplied.
   * Hook: 'response' email notification (wave 5).
   */
  async addResponse(ticketId: number, dto: ResponseTicketDto, actorId: number) {
    const ticket = await this.loadTicket(ticketId, 'staff');

    const resolvedActionPersonId =
      dto.actionPerson_id ?? ticket.reportedByPerson_id ?? null;

    const action = await this.resolveAction('response');
    const now = new Date();

    const history = await this.repo.appendHistory({
      ticket_id: ticketId,
      action_id: action.id,
      enteredByPerson_id: actorId,
      actionPerson_id: resolvedActionPersonId,
      enteredDate: now,
      actionDate: now,
      notes: dto.notes ?? null,
      data: null,
      sentNotifications: null,
    } as Prisma.ticketHistoryCreateInput);

    await this.repo.update(ticketId, { lastModified: now });

    // HOOK: wave 5 — NotificationsService.send('response', ticket, actorId)

    return history;
  }

  // =========================================================
  // F01.8 Re-open Ticket
  // =========================================================

  /**
   * FRD §F01.8: Re-open a closed ticket.
   * - 409 if already open
   * - Clears closedDate and substatus_id
   * - Appends 'update' action with re-open notes
   * Hook: Solr re-index (wave 5).
   */
  async reopen(ticketId: number, dto: ReopenTicketDto, actorId: number) {
    const ticket = await this.loadTicket(ticketId, 'staff');

    if (ticket.status === 'open') {
      throw new ConflictException({ error: 'CONFLICT', message: 'Ticket is already open' });
    }

    const action = await this.resolveAction('update');
    const now = new Date();

    await this.repo.appendHistory({
      ticket_id: ticketId,
      action_id: action.id,
      enteredByPerson_id: actorId,
      enteredDate: now,
      actionDate: now,
      notes: dto.notes ?? 'Ticket re-opened',
      data: null,
      sentNotifications: null,
    } as Prisma.ticketHistoryCreateInput);

    const updated = await this.repo.update(ticketId, {
      status: 'open',
      closedDate: null,
      substatus_id: null,
      lastModified: now,
    });

    // HOOK: wave 5 — SolrService.indexTicket(ticketId)

    return updated;
  }

  // =========================================================
  // F01.9 View Ticket History (list + history read endpoints)
  // =========================================================

  /**
   * Paginated ticket list with RBAC category visibility filter (FRD §F02.5).
   * Returns { total, page, pageSize, results }.
   */
  async list(role: string | null | undefined, dto: ListTicketsDto) {
    const page = dto.page ?? 1;
    const pageSize = dto.page_size ?? 25;

    const where: Prisma.ticketsWhereInput = {};
    if (dto.status) where.status = dto.status;
    if (dto.category_id !== undefined) where.category_id = dto.category_id;
    if (dto.assignedPerson_id !== undefined) where.assignedPerson_id = dto.assignedPerson_id;

    const { total, results } = await this.repo.findAll(role, where, page, pageSize);

    return { total, page, pageSize, results };
  }

  /**
   * Single ticket detail with visibility check.
   */
  async findOne(id: number, role: string | null | undefined) {
    return this.loadTicket(id, role);
  }

  /**
   * FRD §F01.9: Ticket history ordered by enteredDate ASC.
   * PII masking for non-staff is applied by PiiMaskInterceptor at the controller level.
   */
  async getHistory(ticketId: number, role: string | null | undefined) {
    // Verify ticket exists and is visible to caller's role
    await this.loadTicket(ticketId, role);
    return this.repo.getHistory(ticketId);
  }
}
```
  </action>
  <verify>
```bash
npx tsc --noEmit 2>&1 | grep -E 'tickets' | head -20 && echo "TSC_TICKETS_OK"
grep -n 'export class TicketsRepository' src/modules/tickets/tickets.repository.ts && echo REPO_OK
grep -n 'appendHistory\|getHistory\|getActionByName' src/modules/tickets/tickets.repository.ts && echo REPO_METHODS_OK
grep -n 'export class TicketsService' src/modules/tickets/tickets.service.ts && echo SERVICE_OK
grep -n 'async close\|async duplicate\|async addComment\|async addResponse\|async reopen\|async list\|async getHistory\|async update' src/modules/tickets/tickets.service.ts && echo LIFECYCLE_METHODS_OK
grep -n 'Ticket is already closed' src/modules/tickets/tickets.service.ts && echo CLOSE_CONFLICT_OK
grep -n 'Ticket is already open' src/modules/tickets/tickets.service.ts && echo REOPEN_CONFLICT_OK
grep -n 'A ticket cannot be its own parent' src/modules/tickets/tickets.service.ts && echo SELF_REF_OK
grep -n 'parent_id.*parent_id.*null\|parent already' src/modules/tickets/tickets.service.ts && echo ALREADY_PARENT_OK
grep -n "duplicate.*parent\|parent.*duplicate" src/modules/tickets/tickets.service.ts && echo DUPLICATE_AUDIT_PARENT_OK
grep -n 'changeCategory\|changeLocation' src/modules/tickets/tickets.service.ts && echo CHANGE_ACTIONS_OK
grep -n 'original.*updated\|updated.*original' src/modules/tickets/tickets.service.ts && echo CHANGE_DATA_OK
ls src/modules/tickets/dto/close-ticket.dto.ts \
   src/modules/tickets/dto/duplicate-ticket.dto.ts \
   src/modules/tickets/dto/comment-ticket.dto.ts \
   src/modules/tickets/dto/response-ticket.dto.ts \
   src/modules/tickets/dto/reopen-ticket.dto.ts \
   src/modules/tickets/dto/list-tickets.dto.ts \
   src/modules/tickets/dto/update-ticket.dto.ts && echo DTOS_EXIST
```
  </verify>
  <done>
- `src/modules/tickets/tickets.repository.ts` exports `TicketsRepository` with: `findAll(role, where, page, pageSize)` (role-filtered paginated query), `findOne`, `update`, `appendHistory`, `getHistory`, `getActionByName`, `getSubstatus`, `createTicket`
- `TicketsRepository.findAll()` applies `categories.displayPermissionLevel IN (levels)` filter per caller's role (FRD §F02.5)
- `src/modules/tickets/tickets.service.ts` exports `TicketsService` with all lifecycle methods:
  - `update()` emits `changeCategory` action (with `data={original, updated}`) on category change, `changeLocation` on location change, `update` otherwise
  - `close()` validates substatus.status='closed', throws 409 on already-closed ticket, appends `closed` history entry
  - `duplicate()` appends `duplicate` history to **parent** ticket only with `data={duplicate: child_id}`; closes child with Duplicate substatus
  - `duplicate()` throws 400 on self-reference and on already-parented ticket
  - `addComment()` throws 400 on empty notes; appends `comment` history; updates lastModified
  - `addResponse()` resolves actionPerson_id to reportedByPerson_id when not supplied; appends `response` history
  - `reopen()` throws 409 on already-open; clears closedDate+substatus_id; appends `update` history
  - `list()` delegates to repository with role-based category filter; returns `{total, page, pageSize, results}`
  - `getHistory()` returns history ordered by enteredDate ASC
- All 7 new DTOs exist under `src/modules/tickets/dto/`
- TypeScript compiles with zero errors for ticket module files
  </done>
</task>

<task type="auto">
  <name>Task 2: TicketsController + TicketsModule wiring + AppModule update</name>
  <files>
    src/modules/tickets/tickets.controller.ts
    src/modules/tickets/tickets.module.ts
    src/app.module.ts
  </files>
  <action>
Implement `TicketsController` with all lifecycle action sub-routes, the list and history endpoints, and wire `TicketsModule` into `AppModule`.

**Route catalog (TechArch §4.3 §Tickets):**
```
GET    /tickets                → list (anon, role-filtered)
POST   /tickets                → create (public) — plan 09
GET    /tickets/:id            → detail (anon, role-filtered)
PUT    /tickets/:id            → update (staff)
POST   /tickets/:id/assign     → assign (staff) — plan 09
POST   /tickets/:id/close      → close (staff)
POST   /tickets/:id/duplicate  → duplicate (staff)
POST   /tickets/:id/reopen     → reopen (staff)
POST   /tickets/:id/comment    → comment (staff)
POST   /tickets/:id/response   → response (staff)
GET    /tickets/:id/history    → history (anon, role-filtered + PII mask)
```

---

### src/modules/tickets/tickets.controller.ts

```typescript
import {
  Controller, Get, Post, Put, Param, Body, Query,
  ParseIntPipe, ForbiddenException, NotFoundException,
  HttpCode, Req, UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { TicketsService } from './tickets.service';
import { CloseTicketDto } from './dto/close-ticket.dto';
import { DuplicateTicketDto } from './dto/duplicate-ticket.dto';
import { CommentTicketDto } from './dto/comment-ticket.dto';
import { ResponseTicketDto } from './dto/response-ticket.dto';
import { ReopenTicketDto } from './dto/reopen-ticket.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { PiiMaskInterceptor } from '../../common/interceptors/pii-mask.interceptor';

/**
 * Helper: extract user from request.
 * Returns null for anonymous callers (AuthMiddleware sets req.user = null).
 */
function getUser(req: Request) {
  return (req as any).user as { id: number; role: string | null } | null;
}

/**
 * Enforces staff role. Throws 403 if caller is not staff.
 * Matches the inline guard pattern used by Wave 3 modules (plan 06-08).
 */
function requireStaff(req: Request): { id: number; role: string | null } {
  const user = getUser(req);
  if (!user || user.role !== 'staff') {
    throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Staff access required' });
  }
  return user;
}

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // ----------------------------------------------------------------
  // GET /tickets — paginated list with role-based category filter
  // [anon] per TechArch §4.3 + FRD §F02.2
  // ----------------------------------------------------------------
  @Get()
  @UseInterceptors(PiiMaskInterceptor)
  findAll(@Query() dto: ListTicketsDto, @Req() req: Request) {
    const user = getUser(req);
    return this.ticketsService.list(user?.role ?? null, dto);
  }

  // ----------------------------------------------------------------
  // GET /tickets/:id — single ticket detail
  // [anon] per TechArch §4.3; category visibility enforced in service
  // ----------------------------------------------------------------
  @Get(':id')
  @UseInterceptors(PiiMaskInterceptor)
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = getUser(req);
    return this.ticketsService.findOne(id, user?.role ?? null);
  }

  // ----------------------------------------------------------------
  // PUT /tickets/:id — update ticket (changeCategory / changeLocation / update)
  // [staff] per TechArch §4.3 / FRD §F01.3
  // ----------------------------------------------------------------
  @Put(':id')
  @UseInterceptors(PiiMaskInterceptor)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketDto,
    @Req() req: Request,
  ) {
    const user = requireStaff(req);
    return this.ticketsService.update(id, dto, user.id);
  }

  // ----------------------------------------------------------------
  // POST /tickets/:id/close — close ticket with substatus
  // [staff] per TechArch §4.3 / FRD §F01.4
  // ----------------------------------------------------------------
  @Post(':id/close')
  @HttpCode(200)
  close(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseTicketDto,
    @Req() req: Request,
  ) {
    const user = requireStaff(req);
    return this.ticketsService.close(id, dto, user.id);
  }

  // ----------------------------------------------------------------
  // POST /tickets/:id/duplicate — mark as duplicate of parent
  // [staff] per TechArch §4.3 / FRD §F01.5
  // CRITICAL: 'duplicate' action logged on PARENT only (FRD §F01.5)
  // ----------------------------------------------------------------
  @Post(':id/duplicate')
  @HttpCode(200)
  duplicate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DuplicateTicketDto,
    @Req() req: Request,
  ) {
    const user = requireStaff(req);
    return this.ticketsService.duplicate(id, dto, user.id);
  }

  // ----------------------------------------------------------------
  // POST /tickets/:id/reopen — re-open closed ticket
  // [staff] per TechArch §4.3 / FRD §F01.8
  // ----------------------------------------------------------------
  @Post(':id/reopen')
  @HttpCode(200)
  reopen(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReopenTicketDto,
    @Req() req: Request,
  ) {
    const user = requireStaff(req);
    return this.ticketsService.reopen(id, dto, user.id);
  }

  // ----------------------------------------------------------------
  // POST /tickets/:id/comment — add staff comment
  // [staff] per TechArch §4.3 / FRD §F01.6
  // ----------------------------------------------------------------
  @Post(':id/comment')
  @HttpCode(201)
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CommentTicketDto,
    @Req() req: Request,
  ) {
    const user = requireStaff(req);
    return this.ticketsService.addComment(id, dto, user.id);
  }

  // ----------------------------------------------------------------
  // POST /tickets/:id/response — add response action
  // [staff] per TechArch §4.3 / FRD §F01.7
  // ----------------------------------------------------------------
  @Post(':id/response')
  @HttpCode(201)
  addResponse(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResponseTicketDto,
    @Req() req: Request,
  ) {
    const user = requireStaff(req);
    return this.ticketsService.addResponse(id, dto, user.id);
  }

  // ----------------------------------------------------------------
  // GET /tickets/:id/history — ticket history (role-filtered + PII mask)
  // [anon] per TechArch §4.3 / FRD §F01.9
  // PiiMaskInterceptor nulls enteredByPerson_id + actionPerson_id for non-staff
  // ----------------------------------------------------------------
  @Get(':id/history')
  @UseInterceptors(PiiMaskInterceptor)
  getHistory(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = getUser(req);
    return this.ticketsService.getHistory(id, user?.role ?? null);
  }
}
```

---

### src/modules/tickets/tickets.module.ts

```typescript
import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketsRepository } from './tickets.repository';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository],
  /**
   * Export TicketsService so:
   * - Open311Module (plan 11) can call findOne() for GET /requests/:id
   * - Wave 5 SearchModule can call list() for Solr fallback
   * - Wave 5 MediaModule can call appendHistory() via TicketsService
   */
  exports: [TicketsService],
})
export class TicketsModule {}
```

---

### src/app.module.ts (update — add TicketsModule)

Import `TicketsModule` into the root module. Merge with the current state that imports AuthModule, AdminModule, CategoriesModule, DepartmentsModule, PeopleModule (from plans 04–08):

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
    AuthModule,      // @Global → AbilityFactory + SessionService available everywhere
    AdminModule,
    CategoriesModule,
    DepartmentsModule,
    PeopleModule,
    TicketsModule,
    // Wave 4 plan 11: Open311Module — added when plan 11 executes
    // Wave 5: SearchModule, NotificationsModule, MediaModule, GeoModule
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
    // Guards + PiiMaskInterceptor as injectable providers (not APP_GUARD)
    // Routes opt-in via @UseGuards(CaslGuard) / @UseInterceptors(PiiMaskInterceptor)
    CaslGuard,
    AuthGuard,
    PiiMaskInterceptor,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Order: FormatMiddleware → GelfRequestMiddleware → AuthMiddleware
    // express-session is wired in main.ts before the NestJS pipeline
    consumer
      .apply(FormatMiddleware, GelfRequestMiddleware, AuthMiddleware)
      .forRoutes('*');
  }
}
```

**Note on merging:** The above is the canonical merged state after plans 03, 04, 05, 06, 07, 08, and 10 have all executed. If prior plans wrote a different version of `app.module.ts`, carefully merge — do NOT discard previously wired providers or middleware registrations.
  </action>
  <verify>
```bash
npx tsc --noEmit 2>&1 | head -30 && echo "TSC_OK"
grep -n 'export class TicketsController' src/modules/tickets/tickets.controller.ts && echo CONTROLLER_OK
grep -n "'tickets/:id/close'\|POST.*close\|close.*POST" src/modules/tickets/tickets.controller.ts && echo CLOSE_ROUTE_OK
grep -n "'tickets/:id/duplicate'\|Post.*duplicate\|duplicate.*Post" src/modules/tickets/tickets.controller.ts && echo DUP_ROUTE_OK
grep -n "'tickets/:id/comment'\|Post.*comment\|comment.*Post" src/modules/tickets/tickets.controller.ts && echo COMMENT_ROUTE_OK
grep -n "'tickets/:id/response'\|Post.*response\|response.*Post" src/modules/tickets/tickets.controller.ts && echo RESPONSE_ROUTE_OK
grep -n "'tickets/:id/reopen'\|Post.*reopen\|reopen.*Post" src/modules/tickets/tickets.controller.ts && echo REOPEN_ROUTE_OK
grep -n "'tickets/:id/history'\|Get.*history\|history.*Get" src/modules/tickets/tickets.controller.ts && echo HISTORY_ROUTE_OK
grep -n 'PiiMaskInterceptor' src/modules/tickets/tickets.controller.ts && echo PII_WIRED_OK
grep -n 'export class TicketsModule' src/modules/tickets/tickets.module.ts && echo MODULE_OK
grep -n "exports.*TicketsService\|TicketsService.*exports" src/modules/tickets/tickets.module.ts && echo SERVICE_EXPORTED_OK
grep -n 'TicketsModule' src/app.module.ts && echo APP_MODULE_WIRED_OK
grep -n 'AuthMiddleware' src/app.module.ts && echo AUTH_MIDDLEWARE_OK
```
  </verify>
  <done>
- `src/modules/tickets/tickets.controller.ts` implements all 9 routes per TechArch §4.3 §Tickets (excluding create + assign which are in plan 09):
  - `GET /tickets` — list with ListTicketsDto query params; `@UseInterceptors(PiiMaskInterceptor)`
  - `GET /tickets/:id` — detail with role visibility check; `@UseInterceptors(PiiMaskInterceptor)`
  - `PUT /tickets/:id` — update (staff); delegates to `ticketsService.update()`
  - `POST /tickets/:id/close` — close (staff); delegates to `ticketsService.close()`
  - `POST /tickets/:id/duplicate` — duplicate (staff); delegates to `ticketsService.duplicate()`
  - `POST /tickets/:id/reopen` — reopen (staff); delegates to `ticketsService.reopen()`
  - `POST /tickets/:id/comment` — comment (staff); delegates to `ticketsService.addComment()`
  - `POST /tickets/:id/response` — response (staff); delegates to `ticketsService.addResponse()`
  - `GET /tickets/:id/history` — history (anon); `@UseInterceptors(PiiMaskInterceptor)`
- All staff routes call `requireStaff(req)` before delegating; throws 403 for non-staff
- `PiiMaskInterceptor` applied on `GET /tickets`, `GET /tickets/:id`, and `GET /tickets/:id/history`
- `src/modules/tickets/tickets.module.ts` declares controller, providers, and exports `TicketsService`
- `TicketsModule` imported in `src/app.module.ts`
- `AuthMiddleware` still registered in `AppModule.configure()` in correct order
- `npx tsc --noEmit` exits 0 with zero TypeScript strict-mode errors
  </done>
</task>

</tasks>

<verification>
After both tasks complete, verify the complete TicketsModule Part B:

```bash
# TypeScript strict mode — zero errors required
npx tsc --noEmit 2>&1 | head -30 && echo "TSC OK"

# Repository contracts
grep -n 'export class TicketsRepository' src/modules/tickets/tickets.repository.ts && echo REPO_CONTRACT_OK
grep -n 'appendHistory' src/modules/tickets/tickets.repository.ts && echo APPEND_HISTORY_OK
grep -n 'getHistory' src/modules/tickets/tickets.repository.ts && echo GET_HISTORY_OK
grep -n 'getActionByName' src/modules/tickets/tickets.repository.ts && echo GET_ACTION_OK
grep -n 'permissionLevels\|displayPermissionLevel.*in\|in.*displayPermissionLevel' src/modules/tickets/tickets.repository.ts && echo PERMISSION_FILTER_OK

# Service lifecycle methods
grep -n 'export class TicketsService' src/modules/tickets/tickets.service.ts && echo SERVICE_CONTRACT_OK
grep -n 'async close' src/modules/tickets/tickets.service.ts && echo CLOSE_OK
grep -n 'async duplicate' src/modules/tickets/tickets.service.ts && echo DUPLICATE_OK
grep -n 'async addComment' src/modules/tickets/tickets.service.ts && echo COMMENT_OK
grep -n 'async addResponse' src/modules/tickets/tickets.service.ts && echo RESPONSE_OK
grep -n 'async reopen' src/modules/tickets/tickets.service.ts && echo REOPEN_OK
grep -n 'async list' src/modules/tickets/tickets.service.ts && echo LIST_OK
grep -n 'async getHistory' src/modules/tickets/tickets.service.ts && echo HISTORY_OK
grep -n 'async update' src/modules/tickets/tickets.service.ts && echo UPDATE_OK

# Critical business rules
grep -n 'Ticket is already closed' src/modules/tickets/tickets.service.ts && echo CLOSE_CONFLICT_OK
grep -n 'Ticket is already open' src/modules/tickets/tickets.service.ts && echo REOPEN_CONFLICT_OK
grep -n 'A ticket cannot be its own parent' src/modules/tickets/tickets.service.ts && echo SELF_REF_GUARD_OK
grep -n 'parent_id' src/modules/tickets/tickets.service.ts | grep 'null\|already' && echo ALREADY_PARENTED_GUARD_OK
grep -n 'changeCategory\|changeLocation' src/modules/tickets/tickets.service.ts && echo CHANGE_ACTIONS_OK
# duplicate action must be on parent_id row, not ticketId row
grep -n "ticket_id.*parent_id\|parent_id.*ticket_id" src/modules/tickets/tickets.service.ts && echo DUPLICATE_PARENT_AUDIT_OK

# Controller routes
grep -n 'export class TicketsController' src/modules/tickets/tickets.controller.ts && echo CTRL_OK
grep -n 'PiiMaskInterceptor' src/modules/tickets/tickets.controller.ts && echo PII_INTERCEPTOR_OK

# Module and AppModule
grep -n 'export class TicketsModule' src/modules/tickets/tickets.module.ts && echo MODULE_OK
grep -n 'exports.*TicketsService\|TicketsService' src/modules/tickets/tickets.module.ts | grep 'exports' && echo EXPORT_OK
grep -n 'TicketsModule' src/app.module.ts && echo APP_WIRED_OK

# DTOs
ls src/modules/tickets/dto/close-ticket.dto.ts \
   src/modules/tickets/dto/duplicate-ticket.dto.ts \
   src/modules/tickets/dto/comment-ticket.dto.ts \
   src/modules/tickets/dto/response-ticket.dto.ts \
   src/modules/tickets/dto/reopen-ticket.dto.ts \
   src/modules/tickets/dto/list-tickets.dto.ts \
   src/modules/tickets/dto/update-ticket.dto.ts && echo ALL_DTOS_EXIST
```

Expected: TSC exits 0, all checks pass.
</verification>

<success_criteria>
**F1 Part B — TicketsModule lifecycle complete when:**

- `TicketsService.close(ticketId, dto, actorId)`:
  - Throws `409 ConflictException` when ticket.status === 'closed' (FRD §F01.4)
  - Throws `400 BadRequestException` when substatus.status !== 'closed'
  - Sets status='closed', substatus_id, closedDate=NOW(), lastModified=NOW()
  - Appends `closed` action to `ticketHistory`

- `TicketsService.duplicate(ticketId, parentId, actorId)`:
  - Throws `400` when ticketId === parentId (self-reference; FRD §F01.5)
  - Throws `400` when child.parent_id is already set
  - Sets child.parent_id = parentId; closes child with Duplicate substatus; appends `closed` to child history
  - Appends `duplicate` action to **parent** ticketHistory ONLY with `data = { duplicate: ticketId }` (FRD §F01.5)

- `TicketsService.addComment(ticketId, dto, actorId)`:
  - Throws `400` when notes is empty
  - Appends `comment` action to ticketHistory; updates lastModified

- `TicketsService.addResponse(ticketId, dto, actorId)`:
  - Resolves actionPerson_id to ticket.reportedByPerson_id when not supplied
  - Appends `response` action to ticketHistory; updates lastModified

- `TicketsService.reopen(ticketId, dto, actorId)`:
  - Throws `409 ConflictException` when ticket.status === 'open'
  - Clears closedDate and substatus_id; appends `update` action with re-open notes

- `TicketsService.update(ticketId, dto, actorId)`:
  - Emits `changeCategory` action with `data={original: old_cat, updated: new_cat}` on category change
  - Emits `changeLocation` action with `data={original: old_loc, updated: new_loc}` on location change
  - Emits `update` action for all other field changes

- `TicketsService.list(role, dto)`:
  - Applies `categories.displayPermissionLevel IN (role-specific levels)` filter per FRD §F02.5
  - Returns `{ total, page, pageSize, results }` paginated envelope

- `TicketsService.getHistory(ticketId, role)`:
  - Verifies ticket visibility for caller's role before returning
  - Returns history ordered by `enteredDate ASC` (FRD §F01.9)

- `TicketsController` has all 9 routes (list, detail, update, close, duplicate, reopen, comment, response, history)
- All staff routes enforce `requireStaff(req)` → 403 for non-staff
- `GET /tickets`, `GET /tickets/:id`, `GET /tickets/:id/history` use `@UseInterceptors(PiiMaskInterceptor)`
- `TicketsModule` exports `TicketsService` for Open311Module (plan 11)
- `TicketsModule` imported in `AppModule`
- `npx tsc --noEmit` exits 0 under TypeScript strict mode
</success_criteria>

<output>
No SUMMARY.md required for express-mode plans.

Wave 4 plan 11 (Open311Module) integration points:
- Import `TicketsModule` and `CategoriesModule` into `Open311Module`
- Inject `TicketsService` → call `ticketsService.findOne(id, role)` for `GET /requests/:id`
- Inject `TicketsService.list(role, filters)` for `GET /requests` with Open311 filter mapping
- Inject `CategoriesService.findAll(role)` for `GET /services`

Wave 5 integration hooks in TicketsService (currently stubs):
- After `close()`, `reopen()`, `update()`: call `SolrService.indexTicket(ticketId)` (fire-and-forget)
- After `close()`, `addComment()`, `addResponse()`, `duplicate()`: call `NotificationsService.send(actionName, ticket, actorId)`
- After `update()` when lat/lon changed: call `GeoClusterService.assignClusters(ticketId, lat, lon)`
- These hooks are added in wave 5 plans by injecting SearchModule/NotificationsModule/GeoModule into TicketsModule
</output>
