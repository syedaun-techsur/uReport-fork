---
phase: wave-3-backend
plan: 08
type: execute
wave: 3
depends_on: [2]
files_modified:
  - prisma/schema.prisma
  - src/modules/people/people.module.ts
  - src/modules/people/people.controller.ts
  - src/modules/people/people.service.ts
  - src/modules/people/clients.controller.ts
  - src/modules/people/clients.service.ts
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
  - src/app.module.ts
autonomous: true

features:
  implements: ["F11"]
  depends_on: ["F6", "F4", "F2"]
  enables: ["F0", "F1", "F7"]

must_haves:
  truths:
    - "GET /people lists all people records (staff only)"
    - "POST /people creates a person; duplicate username returns 409"
    - "PUT /people/:id updates person fields; role and username are updatable by staff"
    - "DELETE /people/:id is blocked (409) when person is referenced by tickets, clients, or bookmarks"
    - "GET /people/search?q= returns matching people by firstname/lastname/email/username (staff only; q must be ≥ 2 chars)"
    - "GET /users returns staff members (role='staff') with department and emails (staff only)"
    - "POST /people/:id/emails adds email with label and usedForNotifications flag"
    - "PUT /people/:id/emails/:emailId updates email or notification flag; duplicate email on same person returns 409"
    - "DELETE /people/:id/emails/:emailId removes email record"
    - "POST/PUT/DELETE /people/:id/phones and /people/:id/addresses follow the same pattern"
    - "GET /clients lists all API clients (staff only)"
    - "POST /clients creates a client; api_key must be unique (409 on duplicate); active defaults to true"
    - "PUT /clients/:id allows revoking access by setting active=false; api_key is updatable"
    - "DELETE /clients/:id is blocked (409) when client is referenced by tickets.client_id; use active=false instead"
    - "api_key lookup in the Open311 module will only succeed for clients WHERE active = TRUE"
    - "PeopleModule is wired into AppModule"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "Updated clients model with active BOOLEAN column (DDL conflict resolution — see note below)"
      contains: "active"
    - path: "src/modules/people/people.module.ts"
      provides: "PeopleModule exporting PeopleService and ClientsService"
      exports: ["PeopleModule", "PeopleService", "ClientsService"]
    - path: "src/modules/people/people.service.ts"
      provides: "PeopleService: CRUD, email/phone/address sub-resources, search, users list, PII masking"
      exports: ["PeopleService"]
    - path: "src/modules/people/clients.service.ts"
      provides: "ClientsService: CRUD, api_key uniqueness check, active-flag revocation, delete constraint"
      exports: ["ClientsService"]
    - path: "src/modules/people/people.controller.ts"
      provides: "PeopleController at /people and /users routes"
      exports: ["PeopleController"]
    - path: "src/modules/people/clients.controller.ts"
      provides: "ClientsController at /clients routes"
      exports: ["ClientsController"]
  key_links:
    - from: "src/modules/people/clients.service.ts"
      to: "prisma/schema.prisma"
      via: "PrismaService clients.findFirst({ where: { api_key, active: true } })"
      pattern: "active.*true"
    - from: "src/modules/people/people.service.ts"
      to: "prisma/schema.prisma"
      via: "PrismaService people upsert with peopleEmails/peoplePhones/peopleAddresses include"
      pattern: "prisma\\.people\\.(findUnique|findMany|create|update|delete)"
    - from: "src/app.module.ts"
      to: "src/modules/people/people.module.ts"
      via: "imports array"
      pattern: "PeopleModule"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "prisma/schema.prisma"
      exports: ["people", "peopleEmails", "peoplePhones", "peopleAddresses", "clients"]
      verify: "grep -n 'model people' prisma/schema.prisma && grep -n 'model peopleEmails' prisma/schema.prisma && grep -n 'model clients' prisma/schema.prisma && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "package.json"
      exports: ["@nestjs/common", "@nestjs/core", "@prisma/client", "class-validator"]
      verify: "grep -q '\"@nestjs/core\"' package.json && grep -q '\"@prisma/client\"' package.json && grep -q 'class-validator' package.json && echo CONTRACT_OK"
    - from_plan: "04"
      artifact: "src/modules/auth/session.service.ts"
      exports: ["SessionService"]
      verify: "grep -n 'export class SessionService' src/modules/auth/session.service.ts && echo CONTRACT_OK"
  provides:
    - artifact: "src/modules/people/people.module.ts"
      exports: ["PeopleModule", "PeopleService", "ClientsService"]
      shape: |
        @Module({
          controllers: [PeopleController, ClientsController],
          providers: [PeopleService, ClientsService],
          exports: [PeopleService, ClientsService],
        })
        export class PeopleModule {}
      verify: "grep -n 'export class PeopleModule' src/modules/people/people.module.ts && grep -n 'exports.*PeopleService' src/modules/people/people.module.ts && echo CONTRACT_OK"
    - artifact: "src/modules/people/people.service.ts"
      exports: ["PeopleService"]
      shape: |
        @Injectable()
        export class PeopleService {
          findAll(): Promise<people[]>
          findOne(id: number): Promise<people>
          create(dto: CreatePersonDto): Promise<people>
          update(id: number, dto: UpdatePersonDto): Promise<people>
          remove(id: number): Promise<void>
          search(q: string, role?: string, departmentId?: number): Promise<people[]>
          findStaffUsers(): Promise<people[]>
          addEmail(personId: number, dto: CreateEmailDto): Promise<peopleEmails>
          updateEmail(personId: number, emailId: number, dto: UpdateEmailDto): Promise<peopleEmails>
          removeEmail(personId: number, emailId: number): Promise<void>
          addPhone(personId: number, dto: CreatePhoneDto): Promise<peoplePhones>
          updatePhone(personId: number, phoneId: number, dto: UpdatePhoneDto): Promise<peoplePhones>
          removePhone(personId: number, phoneId: number): Promise<void>
          addAddress(personId: number, dto: CreateAddressDto): Promise<peopleAddresses>
          updateAddress(personId: number, addrId: number, dto: UpdateAddressDto): Promise<peopleAddresses>
          removeAddress(personId: number, addrId: number): Promise<void>
        }
      verify: "grep -n 'export class PeopleService' src/modules/people/people.service.ts && echo CONTRACT_OK"
    - artifact: "src/modules/people/clients.service.ts"
      exports: ["ClientsService"]
      shape: |
        @Injectable()
        export class ClientsService {
          findAll(): Promise<clients[]>
          findOne(id: number): Promise<clients>
          findByApiKey(apiKey: string): Promise<clients | null>  // active=true only — used by Open311Module
          create(dto: CreateClientDto): Promise<clients>
          update(id: number, dto: UpdateClientDto): Promise<clients>
          remove(id: number): Promise<void>
        }
      verify: "grep -n 'export class ClientsService' src/modules/people/clients.service.ts && grep -n 'findByApiKey' src/modules/people/clients.service.ts && echo CONTRACT_OK"
---

<objective>
Implement the `PeopleModule` — the NestJS module owning person CRUD, contact sub-resources (emails, phones, addresses), person search, staff users list, and API client management (F11).

Purpose: Person records are the identity layer consumed by every other module: ticket reporters/assignees (F1), OIDC user provisioning (F4), API client contactPerson references (F0), and email notification recipients (F7). The `ClientsService.findByApiKey()` export is the critical integration point for the Open311 `POST /requests` endpoint's api_key validation.

**⚠️ DDL CONFLICT FLAGGED:**  
The PostgreSQL DDL in TechArch §3.2 for the `clients` table does **not** include an `active` column, but FRD F11.7 and PRD F11 explicitly describe `active` (boolean, default true) as the revocation mechanism. The Open311 `POST /requests` validation requires `WHERE clients.active = TRUE`. This plan resolves the conflict by **adding the `active` column** to the Prisma schema and the clients model — per the FRD/PRD specification, which supersedes the DDL omission. The DDL omission is treated as a spec drafting gap.

Output:
- `prisma/schema.prisma` — `clients` model updated with `active Boolean @default(true)` column
- `src/modules/people/` — complete NestJS module with PeopleController, ClientsController, PeopleService, ClientsService, and all DTOs
- `PeopleModule` wired into `AppModule`
</objective>

<feature_dependencies>
Implements: F11: People & API Client Management — people CRUD, peopleEmails/peoplePhones/peopleAddresses sub-tables, role management (NULL=public, 'staff'=staff), API clients CRUD with api_key generation, active flag, revocation mechanic
Depends on: F6: MySQL-to-PostgreSQL Schema Migration (people, peopleEmails, peoplePhones, peopleAddresses, clients Prisma models must exist); F4: OIDC Authentication (SessionService available); F2: RBAC (role enforcement pattern established)
Enables: F0: Open311 GeoReport v2 (ClientsService.findByApiKey used for api_key validation on POST /requests); F1: Ticket Lifecycle (PeopleService used for reporter/assignee lookups); F7: Email Notifications (peopleEmails.usedForNotifications drives recipient resolution)
</feature_dependencies>

<execution_context>
@.planning/express/modernize-legacy-php-ureport-open311-geo/WAVE-SCHEDULE.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@project_specs/FRD-uReport.md (F11 section)
@project_specs/TechArch-uReport.md (§2.1 PeopleModule, §3.2 DDL clients table, §4.3 §People & Clients)
@prisma/schema.prisma
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update Prisma schema (clients.active) + PeopleService + PeopleController</name>
  <files>
    prisma/schema.prisma
    src/modules/people/people.module.ts
    src/modules/people/people.service.ts
    src/modules/people/people.controller.ts
    src/modules/people/dto/create-person.dto.ts
    src/modules/people/dto/update-person.dto.ts
    src/modules/people/dto/create-email.dto.ts
    src/modules/people/dto/update-email.dto.ts
    src/modules/people/dto/create-phone.dto.ts
    src/modules/people/dto/update-phone.dto.ts
    src/modules/people/dto/create-address.dto.ts
    src/modules/people/dto/update-address.dto.ts
    src/modules/people/dto/person-search.dto.ts
  </files>
  <action>
**Step 0: Update prisma/schema.prisma — add `active` to `clients` model**

Open `prisma/schema.prisma` and locate the `model clients` block. Add the `active` field:

```prisma
model clients {
  id                 Int            @id @default(autoincrement())
  name               String         @db.VarChar(128)
  url                String?        @db.VarChar(255)
  api_key            String         @unique @db.VarChar(50)
  contactPerson_id   Int
  contactMethod_id   Int?
  active             Boolean        @default(true)   // ← ADD THIS LINE (FRD F11.7 revocation mechanic)

  contactPerson      people         @relation("ClientContactPerson", fields: [contactPerson_id], references: [id])
  contactMethod      contactMethods? @relation(fields: [contactMethod_id], references: [id])
  tickets            tickets[]

  @@map("clients")
  @@index([api_key], map: "idx_clients_api_key")
}
```

After editing `prisma/schema.prisma`, run `npx prisma generate` to regenerate the Prisma client.

---

**Directory structure:**

```
src/modules/people/
├── people.module.ts
├── people.service.ts
├── people.controller.ts
└── dto/
    ├── create-person.dto.ts
    ├── update-person.dto.ts
    ├── create-email.dto.ts
    ├── update-email.dto.ts
    ├── create-phone.dto.ts
    ├── update-phone.dto.ts
    ├── create-address.dto.ts
    ├── update-address.dto.ts
    └── person-search.dto.ts
```

---

### src/modules/people/dto/create-person.dto.ts

From FRD F11.1 field list:

```typescript
import { IsString, IsOptional, MaxLength, IsIn, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePersonDto {
  @IsOptional() @IsString() @MaxLength(128) firstname?: string;
  @IsOptional() @IsString() @MaxLength(128) middlename?: string;
  @IsOptional() @IsString() @MaxLength(128) lastname?: string;
  @IsOptional() @IsString() @MaxLength(128) organization?: string;
  @IsOptional() @IsString() @MaxLength(128) address?: string;
  @IsOptional() @IsString() @MaxLength(128) city?: string;
  @IsOptional() @IsString() @MaxLength(128) state?: string;
  @IsOptional() @IsString() @MaxLength(20) zip?: string;
  @IsOptional() @IsInt() @Type(() => Number) department_id?: number;
  @IsOptional() @IsString() @MaxLength(40) username?: string;
  // role: null = citizen (public), 'staff' = staff — FRD F11.1 + F02.1
  @IsOptional() @IsIn([null, 'staff']) role?: string | null;
}
```

### src/modules/people/dto/update-person.dto.ts

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreatePersonDto } from './create-person.dto';

export class UpdatePersonDto extends PartialType(CreatePersonDto) {}
```

### src/modules/people/dto/create-email.dto.ts

From FRD F11.2 + DDL peopleEmails:

```typescript
import { IsEmail, IsIn, IsBoolean, IsOptional } from 'class-validator';

export class CreateEmailDto {
  @IsEmail({}, { message: 'email must match RFC 5322 format' })
  email: string;

  @IsIn(['Home', 'Work', 'Other'])
  label: string = 'Other';

  @IsBoolean()
  @IsOptional()
  usedForNotifications?: boolean = false;
}
```

### src/modules/people/dto/update-email.dto.ts

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateEmailDto } from './create-email.dto';

export class UpdateEmailDto extends PartialType(CreateEmailDto) {}
```

### src/modules/people/dto/create-phone.dto.ts

From FRD F11.3 + DDL peoplePhones:

```typescript
import { IsString, IsIn, IsOptional, MaxLength } from 'class-validator';

export class CreatePhoneDto {
  @IsOptional() @IsString() @MaxLength(20) number?: string;
  @IsIn(['Main', 'Mobile', 'Work', 'Home', 'Fax', 'Pager', 'Other'])
  label: string = 'Other';
}
```

### src/modules/people/dto/update-phone.dto.ts

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreatePhoneDto } from './create-phone.dto';

export class UpdatePhoneDto extends PartialType(CreatePhoneDto) {}
```

### src/modules/people/dto/create-address.dto.ts

From FRD F11.4 + DDL peopleAddresses:

```typescript
import { IsString, IsIn, IsOptional, MaxLength } from 'class-validator';

export class CreateAddressDto {
  @IsString() @MaxLength(128) address: string;
  @IsOptional() @IsString() @MaxLength(128) city?: string;
  @IsOptional() @IsString() @MaxLength(128) state?: string;
  @IsOptional() @IsString() @MaxLength(20) zip?: string;
  @IsIn(['Home', 'Business', 'Rental'])
  label: string = 'Home';
}
```

### src/modules/people/dto/update-address.dto.ts

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateAddressDto } from './create-address.dto';

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
```

### src/modules/people/dto/person-search.dto.ts

From FRD F11.5:

```typescript
import { IsString, IsOptional, MinLength, IsIn, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class PersonSearchDto {
  @IsString() @MinLength(2) q: string;
  @IsOptional() @IsIn([null, 'staff']) role?: string | null;
  @IsOptional() @IsInt() @Type(() => Number) department_id?: number;
}
```

---

### src/modules/people/people.service.ts

Full business logic per FRD F11.1–F11.6:

```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { CreateEmailDto } from './dto/create-email.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { CreatePhoneDto } from './dto/create-phone.dto';
import { UpdatePhoneDto } from './dto/update-phone.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- People CRUD (FRD F11.1) ----

  async findAll() {
    return this.prisma.people.findMany({
      include: { peopleEmails: true, peoplePhones: true, peopleAddresses: true },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.people.findUnique({
      where: { id },
      include: { peopleEmails: true, peoplePhones: true, peopleAddresses: true },
    });
    if (!record) throw new NotFoundException('Person not found');
    return record;
  }

  async create(dto: CreatePersonDto) {
    // Unique username constraint (FRD F11.1)
    if (dto.username) {
      const existing = await this.prisma.people.findUnique({ where: { username: dto.username } });
      if (existing) throw new ConflictException('Username already in use');
    }
    // Validate department_id if provided (FRD F11.1)
    if (dto.department_id) {
      const dept = await this.prisma.departments.findUnique({ where: { id: dto.department_id } });
      if (!dept) throw new NotFoundException('Department not found');
    }
    return this.prisma.people.create({ data: dto });
  }

  async update(id: number, dto: UpdatePersonDto) {
    await this.findOne(id);
    if (dto.username) {
      const existing = await this.prisma.people.findFirst({
        where: { username: dto.username, NOT: { id } },
      });
      if (existing) throw new ConflictException('Username already in use');
    }
    if (dto.department_id) {
      const dept = await this.prisma.departments.findUnique({ where: { id: dto.department_id } });
      if (!dept) throw new NotFoundException('Department not found');
    }
    return this.prisma.people.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    // FK delete constraint: tickets (FRD F11.1)
    const ticketRef = await this.prisma.tickets.findFirst({
      where: {
        OR: [
          { enteredByPerson_id: id },
          { reportedByPerson_id: id },
          { assignedPerson_id: id },
        ],
      },
      select: { id: true },
    });
    if (ticketRef) {
      throw new ConflictException('Person cannot be deleted — referenced by tickets');
    }
    // FK delete constraint: clients
    const clientRef = await this.prisma.clients.findFirst({
      where: { contactPerson_id: id },
      select: { id: true },
    });
    if (clientRef) {
      throw new ConflictException('Person cannot be deleted — referenced by clients');
    }
    // FK delete constraint: bookmarks
    const bookmarkRef = await this.prisma.bookmarks.findFirst({
      where: { person_id: id },
      select: { id: true },
    });
    if (bookmarkRef) {
      throw new ConflictException('Person cannot be deleted — referenced by bookmarks');
    }
    return this.prisma.people.delete({ where: { id } });
  }

  // ---- Person Search (FRD F11.5) ----

  async search(q: string, role?: string | null, department_id?: number) {
    if (!q || q.length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters');
    }
    const where: Record<string, unknown> = {
      OR: [
        { firstname: { contains: q, mode: 'insensitive' } },
        { lastname: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
        {
          peopleEmails: {
            some: { email: { contains: q, mode: 'insensitive' } },
          },
        },
      ],
    };
    if (role !== undefined) where['role'] = role;
    if (department_id !== undefined) where['department_id'] = department_id;

    return this.prisma.people.findMany({
      where,
      select: {
        id: true, firstname: true, lastname: true,
        organization: true, username: true, role: true,
      },
      take: 50,
    });
  }

  // ---- Staff Users List (FRD F11.6) ----

  async findStaffUsers() {
    return this.prisma.people.findMany({
      where: { role: 'staff' },
      include: {
        peopleEmails: true,
        // department relation — requires departments model in schema
      },
      orderBy: [{ lastname: 'asc' }, { firstname: 'asc' }],
    });
  }

  // ---- People Emails (FRD F11.2) ----

  async addEmail(personId: number, dto: CreateEmailDto) {
    await this.findOne(personId);
    // Duplicate email for same person → 409
    const existing = await this.prisma.peopleEmails.findFirst({
      where: { person_id: personId, email: dto.email },
    });
    if (existing) throw new ConflictException('Email address already exists for this person');
    return this.prisma.peopleEmails.create({
      data: {
        person_id: personId,
        email: dto.email,
        label: dto.label ?? 'Other',
        usedForNotifications: dto.usedForNotifications ?? false,
      },
    });
  }

  async updateEmail(personId: number, emailId: number, dto: UpdateEmailDto) {
    const record = await this.prisma.peopleEmails.findFirst({
      where: { id: emailId, person_id: personId },
    });
    if (!record) throw new NotFoundException('Email record not found');
    if (dto.email && dto.email !== record.email) {
      const existing = await this.prisma.peopleEmails.findFirst({
        where: { person_id: personId, email: dto.email, NOT: { id: emailId } },
      });
      if (existing) throw new ConflictException('Email address already exists for this person');
    }
    return this.prisma.peopleEmails.update({ where: { id: emailId }, data: dto });
  }

  async removeEmail(personId: number, emailId: number) {
    const record = await this.prisma.peopleEmails.findFirst({
      where: { id: emailId, person_id: personId },
    });
    if (!record) throw new NotFoundException('Email record not found');
    return this.prisma.peopleEmails.delete({ where: { id: emailId } });
  }

  // ---- People Phones (FRD F11.3) ----

  async addPhone(personId: number, dto: CreatePhoneDto) {
    await this.findOne(personId);
    return this.prisma.peoplePhones.create({
      data: {
        person_id: personId,
        number: dto.number ?? null,
        label: dto.label ?? 'Other',
      },
    });
  }

  async updatePhone(personId: number, phoneId: number, dto: UpdatePhoneDto) {
    const record = await this.prisma.peoplePhones.findFirst({
      where: { id: phoneId, person_id: personId },
    });
    if (!record) throw new NotFoundException('Phone record not found');
    return this.prisma.peoplePhones.update({ where: { id: phoneId }, data: dto });
  }

  async removePhone(personId: number, phoneId: number) {
    const record = await this.prisma.peoplePhones.findFirst({
      where: { id: phoneId, person_id: personId },
    });
    if (!record) throw new NotFoundException('Phone record not found');
    return this.prisma.peoplePhones.delete({ where: { id: phoneId } });
  }

  // ---- People Addresses (FRD F11.4) ----

  async addAddress(personId: number, dto: CreateAddressDto) {
    await this.findOne(personId);
    return this.prisma.peopleAddresses.create({
      data: {
        person_id: personId,
        address: dto.address,
        city: dto.city ?? null,
        state: dto.state ?? null,
        zip: dto.zip ?? null,
        label: dto.label ?? 'Home',
      },
    });
  }

  async updateAddress(personId: number, addrId: number, dto: UpdateAddressDto) {
    const record = await this.prisma.peopleAddresses.findFirst({
      where: { id: addrId, person_id: personId },
    });
    if (!record) throw new NotFoundException('Address record not found');
    return this.prisma.peopleAddresses.update({ where: { id: addrId }, data: dto });
  }

  async removeAddress(personId: number, addrId: number) {
    const record = await this.prisma.peopleAddresses.findFirst({
      where: { id: addrId, person_id: personId },
    });
    if (!record) throw new NotFoundException('Address record not found');
    return this.prisma.peopleAddresses.delete({ where: { id: addrId } });
  }
}
```

---

### src/modules/people/people.controller.ts

Routes per TechArch §4.3 §People & Clients. All routes staff-only per FRD F11 + TechArch route matrix.
Uses inline `requireStaff` guard (same pattern as AdminModule in plan 05, replaced by CaslGuard when Wave 3 plan 06 is fully wired):

```typescript
import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  ParseIntPipe, ForbiddenException, Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { PeopleService } from './people.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { CreateEmailDto } from './dto/create-email.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { CreatePhoneDto } from './dto/create-phone.dto';
import { UpdatePhoneDto } from './dto/update-phone.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { PersonSearchDto } from './dto/person-search.dto';

function requireStaff(req: Request): void {
  const user = (req as any).user;
  if (!user || user.role !== 'staff') {
    throw new ForbiddenException('Staff access required');
  }
}

@Controller('people')
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  // ---- People CRUD ----

  @Get()
  findAll(@Req() req: Request) {
    requireStaff(req);
    return this.peopleService.findAll();
  }

  @Get('search')
  search(@Query() dto: PersonSearchDto, @Req() req: Request) {
    requireStaff(req);
    return this.peopleService.search(dto.q, dto.role, dto.department_id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.peopleService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePersonDto, @Req() req: Request) {
    requireStaff(req);
    return this.peopleService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePersonDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.peopleService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.peopleService.remove(id);
  }

  // ---- Emails sub-resource ----

  @Post(':id/emails')
  addEmail(
    @Param('id', ParseIntPipe) personId: number,
    @Body() dto: CreateEmailDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.peopleService.addEmail(personId, dto);
  }

  @Put(':id/emails/:emailId')
  updateEmail(
    @Param('id', ParseIntPipe) personId: number,
    @Param('emailId', ParseIntPipe) emailId: number,
    @Body() dto: UpdateEmailDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.peopleService.updateEmail(personId, emailId, dto);
  }

  @Delete(':id/emails/:emailId')
  removeEmail(
    @Param('id', ParseIntPipe) personId: number,
    @Param('emailId', ParseIntPipe) emailId: number,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.peopleService.removeEmail(personId, emailId);
  }

  // ---- Phones sub-resource ----

  @Post(':id/phones')
  addPhone(
    @Param('id', ParseIntPipe) personId: number,
    @Body() dto: CreatePhoneDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.peopleService.addPhone(personId, dto);
  }

  @Put(':id/phones/:phoneId')
  updatePhone(
    @Param('id', ParseIntPipe) personId: number,
    @Param('phoneId', ParseIntPipe) phoneId: number,
    @Body() dto: UpdatePhoneDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.peopleService.updatePhone(personId, phoneId, dto);
  }

  @Delete(':id/phones/:phoneId')
  removePhone(
    @Param('id', ParseIntPipe) personId: number,
    @Param('phoneId', ParseIntPipe) phoneId: number,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.peopleService.removePhone(personId, phoneId);
  }

  // ---- Addresses sub-resource ----

  @Post(':id/addresses')
  addAddress(
    @Param('id', ParseIntPipe) personId: number,
    @Body() dto: CreateAddressDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.peopleService.addAddress(personId, dto);
  }

  @Put(':id/addresses/:addrId')
  updateAddress(
    @Param('id', ParseIntPipe) personId: number,
    @Param('addrId', ParseIntPipe) addrId: number,
    @Body() dto: UpdateAddressDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.peopleService.updateAddress(personId, addrId, dto);
  }

  @Delete(':id/addresses/:addrId')
  removeAddress(
    @Param('id', ParseIntPipe) personId: number,
    @Param('addrId', ParseIntPipe) addrId: number,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.peopleService.removeAddress(personId, addrId);
  }
}
```

Also create the `/users` endpoint as a **separate controller route** under `/users` path. Add this to the same module by adding a second `@Controller('users')` export:

```typescript
// Add at end of people.controller.ts (or as a second controller in the same file)
import { Controller as UsersController_Decorator } from '@nestjs/common';

@UsersController_Decorator('users')
export class UsersController {
  constructor(private readonly peopleService: PeopleService) {}

  @Get()
  findStaff(@Req() req: Request) {
    requireStaff(req);
    return this.peopleService.findStaffUsers();
  }
}
```

Note: Declare `UsersController` in the same file as `PeopleController` to share `requireStaff` and the service. Register it separately in `PeopleModule.controllers`.

---

### src/modules/people/people.module.ts (skeleton — completed in Task 2)

Create a minimal module now; Task 2 adds `ClientsController` and `ClientsService`:

```typescript
import { Module } from '@nestjs/common';
import { PeopleController, UsersController } from './people.controller';
import { PeopleService } from './people.service';

@Module({
  controllers: [PeopleController, UsersController],
  providers: [PeopleService],
  exports: [PeopleService],
})
export class PeopleModule {}
```
  </action>
  <verify>
```bash
npx prisma generate 2>&1 | tail -5 && echo "PRISMA_GEN_OK"
npx tsc --noEmit 2>&1 | grep -E 'people|clients|PeopleModule' | head -20 && echo "TSC_PEOPLE_OK"
grep -n 'active' prisma/schema.prisma | grep -i 'clients\|Boolean' && echo "ACTIVE_FIELD_OK"
grep -n 'export class PeopleService' src/modules/people/people.service.ts && echo CONTRACT_OK
grep -n 'findByApiKey\|findStaffUsers\|search' src/modules/people/people.service.ts && echo METHODS_OK
grep -n 'export class PeopleController' src/modules/people/people.controller.ts && echo CONTROLLER_OK
grep -n 'export class UsersController' src/modules/people/people.controller.ts && echo USERS_CTRL_OK
```
  </verify>
  <done>
- `prisma/schema.prisma` `clients` model has `active Boolean @default(true)` column
- `npx prisma generate` exits 0 (Prisma client regenerated with `active` field)
- `src/modules/people/people.service.ts` exists with `PeopleService` exporting: `findAll`, `findOne`, `create`, `update`, `remove`, `search`, `findStaffUsers`, `addEmail`, `updateEmail`, `removeEmail`, `addPhone`, `updatePhone`, `removePhone`, `addAddress`, `updateAddress`, `removeAddress`
- `src/modules/people/people.controller.ts` exists with `PeopleController` (at `/people`) and `UsersController` (at `/users`)
- All nine DTO files exist under `src/modules/people/dto/`
- `create()` throws `ConflictException` on duplicate `username` (409)
- `remove()` checks FK references to tickets, clients, and bookmarks before deleting (throws 409 on any hit)
- `search()` throws `BadRequestException` when `q.length < 2`
- `TypeScript compiles` with zero errors in the people module files
  </done>
</task>

<task type="auto">
  <name>Task 2: ClientsService + ClientsController + wire PeopleModule into AppModule</name>
  <files>
    src/modules/people/clients.service.ts
    src/modules/people/clients.controller.ts
    src/modules/people/dto/create-client.dto.ts
    src/modules/people/dto/update-client.dto.ts
    src/modules/people/people.module.ts
    src/app.module.ts
  </files>
  <action>
Build `ClientsService` (with the critical `findByApiKey` export consumed by the Open311 module), `ClientsController`, finalize `PeopleModule`, and wire into `AppModule`.

---

### src/modules/people/dto/create-client.dto.ts

From FRD F11.7 field list + DDL clients table + `active` column (conflict-resolved):

```typescript
import {
  IsString, MaxLength, IsUrl, IsOptional, IsInt, IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClientDto {
  @IsString()
  @MaxLength(128)
  name: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  url?: string;

  // api_key: 50-char unique token (FRD F11.7); generated by caller or provided
  @IsString()
  @MaxLength(50)
  api_key: string;

  // contactPerson_id: required FK to people (FRD F11.7)
  @IsInt()
  @Type(() => Number)
  contactPerson_id: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  contactMethod_id?: number;

  // active: defaults true; set false to revoke access (FRD F11.7)
  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}
```

### src/modules/people/dto/update-client.dto.ts

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateClientDto } from './create-client.dto';

export class UpdateClientDto extends PartialType(CreateClientDto) {}
```

---

### src/modules/people/clients.service.ts

Key business rules from FRD F11.7:
- `api_key` must be unique across all clients; duplicate → 409 `CONFLICT`
- `contactPerson_id` must reference an existing person; not found → 404
- `findByApiKey(apiKey)` filters `WHERE active = TRUE` — critical for Open311 api_key validation
- Delete blocked when `tickets.client_id` references this client → 409 (use `active=false` instead)

```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.clients.findMany({
      include: { contactPerson: true },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.clients.findUnique({
      where: { id },
      include: { contactPerson: true },
    });
    if (!record) throw new NotFoundException('Client not found');
    return record;
  }

  /**
   * FRD F11.7 + F00.3: api_key lookup for Open311 POST /requests.
   * Only active clients can authenticate — inactive clients are "revoked".
   * Returns null (not 403) so the calling service can issue the correct error.
   */
  async findByApiKey(apiKey: string) {
    return this.prisma.clients.findFirst({
      where: { api_key: apiKey, active: true },
    });
  }

  async create(dto: CreateClientDto) {
    // api_key uniqueness (FRD F11.7)
    const existingKey = await this.prisma.clients.findUnique({ where: { api_key: dto.api_key } });
    if (existingKey) throw new ConflictException('API key already in use');

    // contactPerson must exist (FRD F11.7)
    const person = await this.prisma.people.findUnique({ where: { id: dto.contactPerson_id } });
    if (!person) throw new NotFoundException('Contact person not found');

    return this.prisma.clients.create({
      data: {
        name: dto.name,
        url: dto.url ?? null,
        api_key: dto.api_key,
        contactPerson_id: dto.contactPerson_id,
        contactMethod_id: dto.contactMethod_id ?? null,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateClientDto) {
    await this.findOne(id);
    // api_key uniqueness on update
    if (dto.api_key) {
      const existing = await this.prisma.clients.findFirst({
        where: { api_key: dto.api_key, NOT: { id } },
      });
      if (existing) throw new ConflictException('API key already in use');
    }
    // contactPerson validation on update
    if (dto.contactPerson_id !== undefined) {
      const person = await this.prisma.people.findUnique({ where: { id: dto.contactPerson_id } });
      if (!person) throw new NotFoundException('Contact person not found');
    }
    return this.prisma.clients.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    // FK delete constraint: tickets.client_id (FRD F11.7)
    const ticketRef = await this.prisma.tickets.findFirst({
      where: { client_id: id },
      select: { id: true },
    });
    if (ticketRef) {
      throw new ConflictException(
        "Client cannot be deleted — referenced by tickets. Set active = false to revoke access.",
      );
    }
    return this.prisma.clients.delete({ where: { id } });
  }
}
```

---

### src/modules/people/clients.controller.ts

Route prefix: `/clients`. All endpoints staff-only per TechArch §4.3 §People & Clients.

```typescript
import {
  Controller, Get, Post, Put, Delete,
  Param, Body, ParseIntPipe, ForbiddenException, Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

function requireStaff(req: Request): void {
  const user = (req as any).user;
  if (!user || user.role !== 'staff') {
    throw new ForbiddenException('Staff access required');
  }
}

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll(@Req() req: Request) {
    requireStaff(req);
    return this.clientsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.clientsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateClientDto, @Req() req: Request) {
    requireStaff(req);
    return this.clientsService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.clientsService.update(id, dto);
  }

  /**
   * DELETE /clients/:id — blocked when referenced by tickets.
   * Per FRD F11.7: "Use active = false to revoke access without deletion."
   * 409 CONFLICT returned when FK reference exists.
   */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.clientsService.remove(id);
  }
}
```

---

### src/modules/people/people.module.ts (finalized)

Update the skeleton from Task 1 to include `ClientsController` and `ClientsService`. Export both services for consumption by Wave 4 modules (Open311Module will inject `ClientsService.findByApiKey`):

```typescript
import { Module } from '@nestjs/common';
import { PeopleController, UsersController } from './people.controller';
import { PeopleService } from './people.service';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  controllers: [PeopleController, UsersController, ClientsController],
  providers: [PeopleService, ClientsService],
  exports: [PeopleService, ClientsService],
})
export class PeopleModule {}
```

---

### src/app.module.ts (updated)

Import `PeopleModule` into the root module. Merge with the existing `app.module.ts` that already imports `AdminModule`, `GelfLoggerModule`, `AuthModule`:

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
import { PeopleModule } from './modules/people/people.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GelfLoggerModule,
    AuthModule,
    AdminModule,
    PeopleModule,
    // Wave 3 plan 06: AbilityModule (CaslGuard + AbilityFactory) — added when plan 06 executes
    // Wave 3 plan 07: CategoriesModule + DepartmentsModule — added when plan 07 executes
    // Feature modules added here in subsequent waves
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
    consumer.apply(FormatMiddleware, GelfRequestMiddleware).forRoutes('*');
  }
}
```

**Note:** If prior waves have already written a different version of `app.module.ts`, merge carefully — do NOT discard previously wired providers. The above is the canonical merged state after plans 03, 04, 05, and 08 have all executed.
  </action>
  <verify>
```bash
npx tsc --noEmit 2>&1 | head -30 && echo "TSC_OK"
grep -n 'export class ClientsService' src/modules/people/clients.service.ts && echo CONTRACT_OK
grep -n 'findByApiKey' src/modules/people/clients.service.ts && echo FINDBYAPIKEY_OK
grep -n "active: true" src/modules/people/clients.service.ts && echo ACTIVE_FILTER_OK
grep -n 'ClientsController' src/modules/people/people.module.ts && echo CLIENTS_WIRED_OK
grep -n 'exports.*ClientsService\|ClientsService.*exports' src/modules/people/people.module.ts && echo CLIENTS_EXPORTED_OK
grep -n 'PeopleModule' src/app.module.ts && echo APP_MODULE_OK
grep -n "Client cannot be deleted" src/modules/people/clients.service.ts && echo DELETE_GUARD_OK
```
  </verify>
  <done>
- `src/modules/people/clients.service.ts` exists with `ClientsService` exporting `findAll`, `findOne`, `findByApiKey`, `create`, `update`, `remove`
- `ClientsService.findByApiKey(apiKey)` queries `WHERE api_key = apiKey AND active = true` (FRD F11.7 revocation mechanic + Open311 api_key validation)
- `ClientsService.create()` throws `ConflictException` on duplicate `api_key` (409) and `NotFoundException` when `contactPerson_id` not found (404)
- `ClientsService.remove()` throws `ConflictException` when `tickets.client_id` references this client (409); error message references `active = false` alternative
- `src/modules/people/clients.controller.ts` handles GET/POST/PUT/DELETE on `/clients`; all require staff
- `src/modules/people/people.module.ts` exports both `PeopleService` and `ClientsService` (consumed by Open311Module in Wave 4)
- `src/app.module.ts` imports `PeopleModule`
- `npx tsc --noEmit` exits 0 with zero errors across the entire project
  </done>
</task>

</tasks>

<verification>
After both tasks complete:

```bash
# Full TypeScript compilation — zero errors required
npx tsc --noEmit 2>&1 | head -30 && echo "TSC_OK"

# Prisma schema has active column on clients
grep -n 'active' prisma/schema.prisma | grep -i 'Boolean\|clients' && echo "CLIENTS_ACTIVE_OK"

# PeopleModule is wired into AppModule
grep -n 'PeopleModule' src/app.module.ts && echo "APP_MODULE_WIRED"

# All service contracts
grep -n 'export class PeopleService' src/modules/people/people.service.ts && echo "PEOPLE_SVC_OK"
grep -n 'export class ClientsService' src/modules/people/clients.service.ts && echo "CLIENTS_SVC_OK"
grep -n 'findByApiKey' src/modules/people/clients.service.ts && echo "FINDBYAPIKEY_OK"

# Both services exported from PeopleModule
grep -n 'exports.*PeopleService.*ClientsService\|ClientsService\|PeopleService' src/modules/people/people.module.ts | head -5 && echo "EXPORTS_OK"

# Delete constraints
grep -n 'ConflictException' src/modules/people/people.service.ts | head -5 && echo "PEOPLE_DELETE_GUARDS_OK"
grep -n 'ConflictException' src/modules/people/clients.service.ts && echo "CLIENT_DELETE_GUARD_OK"

# active=true filter on api_key lookup
grep -n 'active.*true\|active: true' src/modules/people/clients.service.ts && echo "ACTIVE_FILTER_OK"

# All controllers exist
ls src/modules/people/people.controller.ts \
   src/modules/people/clients.controller.ts && echo "ALL_CONTROLLERS_EXIST"

# All DTOs exist
ls src/modules/people/dto/create-person.dto.ts \
   src/modules/people/dto/create-email.dto.ts \
   src/modules/people/dto/create-phone.dto.ts \
   src/modules/people/dto/create-address.dto.ts \
   src/modules/people/dto/create-client.dto.ts && echo "ALL_DTOS_EXIST"
```

Expected: all checks pass, zero TypeScript errors.
</verification>

<success_criteria>
- `prisma/schema.prisma` clients model includes `active Boolean @default(true)` (DDL conflict resolved per FRD/PRD specification; TechArch DDL omission flagged and corrected)
- `PeopleService` provides full CRUD for `people`, plus sub-resource CRUD for `peopleEmails`, `peoplePhones`, `peopleAddresses`; search by name/email/username (min 2 chars); staff users list
- `PeopleService.create()` / `update()` enforces unique `username` with 409 `ConflictException`
- `PeopleService.remove()` enforces FK constraint against tickets (enteredBy/reportedBy/assignedPerson), clients, and bookmarks before deleting
- `ClientsService.findByApiKey(apiKey)` returns active clients only (`WHERE active = TRUE`) — this is the exact interface consumed by Wave 4 Open311Module for api_key validation
- `ClientsService.create()` enforces unique `api_key` (409) and validates `contactPerson_id` exists (404)
- `ClientsService.remove()` enforces FK constraint against `tickets.client_id` (409); error message recommends `active = false` as the revocation alternative
- `PeopleController` routes: GET/POST/PUT/DELETE on `/people`, `GET /people/search`, sub-resource routes for emails/phones/addresses; all staff-only
- `UsersController` route: `GET /users` returns staff-only people records; staff-only
- `ClientsController` routes: GET/POST/PUT/DELETE on `/clients`; all staff-only
- `PeopleModule` exports both `PeopleService` and `ClientsService` for use by Wave 4 modules
- `PeopleModule` is imported in `AppModule`
- `npx prisma generate` exits 0 with the updated schema
- `npx tsc --noEmit` exits 0 with zero TypeScript strict-mode errors
</success_criteria>

<output>
No SUMMARY.md required for express-mode plans.
The deliverables are the files listed in files_modified under `src/modules/people/` and the updated `prisma/schema.prisma`.

Wave 4 integration points:
- `Open311Module` must import `PeopleModule` and inject `ClientsService` → call `clientsService.findByApiKey(api_key)` to validate the key on `POST /open311/v2/requests`; the method returns `null` for missing or inactive clients (caller issues 403)
- `TicketsModule` must import `PeopleModule` and inject `PeopleService` → call `peopleService.findOne(id)` for reporter/assignee validation
- `NotificationsModule` must import `PeopleModule` and inject `PeopleService` → load `peopleEmails` with `usedForNotifications = true` for each recipient person
</output>
