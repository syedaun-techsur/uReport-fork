---
phase: wave-6-integration
plan: 16
type: execute
wave: 6
depends_on: [5]
files_modified:
  - src/modules/bookmarks/bookmarks.module.ts
  - src/modules/bookmarks/bookmarks.controller.ts
  - src/modules/bookmarks/bookmarks.service.ts
  - src/modules/bookmarks/bookmarks.repository.ts
  - src/modules/bookmarks/dto/create-bookmark.dto.ts
  - src/app.module.ts
autonomous: true

features:
  implements: ["F12"]
  depends_on: ["F4", "F5"]
  enables: []

must_haves:
  truths:
    - "POST /bookmarks with {name, requestUri, type?} creates a bookmark scoped to the authenticated user's person_id; anonymous callers receive HTTP 401"
    - "GET /bookmarks returns only the authenticated caller's bookmarks ordered by id DESC; anonymous callers receive HTTP 401"
    - "DELETE /bookmarks/:id deletes the bookmark if owned by the authenticated caller; returns 204; returns 404 (not 403) if the bookmark belongs to another user or does not exist; anonymous callers receive HTTP 401"
    - "Bookmark type defaults to 'search'; type='digest' is also valid (used by DigestCron in plan 13 to find email digest subscriptions)"
    - "GET /bookmarks response is available in all five formats via global SerializationInterceptor (JSON/XML/CSV/TXT/HTML)"
    - "BookmarksModule is imported into AppModule"
  artifacts:
    - path: "src/modules/bookmarks/bookmarks.module.ts"
      provides: "BookmarksModule — NestJS module wiring controller, service, repository"
      exports: ["BookmarksModule"]
    - path: "src/modules/bookmarks/bookmarks.service.ts"
      provides: "BookmarksService: create(), findAllForUser(), deleteOwned()"
      exports: ["BookmarksService"]
    - path: "src/modules/bookmarks/bookmarks.repository.ts"
      provides: "BookmarksRepository: Prisma bookmarks table wrapper"
      exports: ["BookmarksRepository"]
    - path: "src/modules/bookmarks/bookmarks.controller.ts"
      provides: "BookmarksController: POST /bookmarks, GET /bookmarks, DELETE /bookmarks/:id"
      exports: ["BookmarksController"]
  key_links:
    - from: "src/modules/bookmarks/bookmarks.service.ts"
      to: "prisma/schema.prisma"
      via: "BookmarksRepository — prisma.bookmarks.create / findMany / findUnique / delete"
      pattern: "prisma\\.bookmarks\\.(create|findMany|findUnique|delete)"
    - from: "src/modules/bookmarks/bookmarks.controller.ts"
      to: "src/modules/bookmarks/bookmarks.service.ts"
      via: "BookmarksController injects BookmarksService; all routes delegate to service"
      pattern: "bookmarksService\\.(create|findAllForUser|deleteOwned)"
    - from: "src/app.module.ts"
      to: "src/modules/bookmarks/bookmarks.module.ts"
      via: "AppModule imports BookmarksModule"
      pattern: "BookmarksModule"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "prisma/schema.prisma"
      exports: ["bookmarks", "people"]
      verify: "grep -n 'model bookmarks' prisma/schema.prisma && grep -n 'person_id' prisma/schema.prisma && grep -n 'requestUri' prisma/schema.prisma && echo CONTRACT_OK"
    - from_plan: "04"
      artifact: "src/common/middleware/auth.middleware.ts"
      exports: ["AuthMiddleware"]
      verify: "grep -n 'export.*AuthMiddleware\\|class AuthMiddleware' src/common/middleware/auth.middleware.ts && echo CONTRACT_OK"
    - from_plan: "03"
      artifact: "src/common/interceptors/serialization.interceptor.ts"
      exports: ["SerializationInterceptor"]
      verify: "grep -n 'export.*SerializationInterceptor' src/common/interceptors/serialization.interceptor.ts && echo CONTRACT_OK"
    - from_plan: "13"
      artifact: "prisma/schema.prisma"
      exports: ["bookmarks"]
      verify: "grep -n \"type.*VARCHAR\\|type.*String\" prisma/schema.prisma | grep -i bookmark && echo CONTRACT_OK"
  provides:
    - artifact: "src/modules/bookmarks/bookmarks.module.ts"
      exports: ["BookmarksModule"]
      shape: |
        @Module({
          imports: [PrismaModule],
          controllers: [BookmarksController],
          providers: [BookmarksService, BookmarksRepository],
        })
        export class BookmarksModule {}
      verify: "grep -n 'export class BookmarksModule' src/modules/bookmarks/bookmarks.module.ts && echo CONTRACT_OK"
    - artifact: "src/modules/bookmarks/bookmarks.service.ts"
      exports: ["BookmarksService"]
      shape: |
        @Injectable()
        export class BookmarksService {
          create(personId: number, dto: CreateBookmarkDto): Promise<bookmarks>
          findAllForUser(personId: number): Promise<bookmarks[]>
          deleteOwned(id: number, personId: number): Promise<void>
        }
      verify: "grep -n 'export class BookmarksService' src/modules/bookmarks/bookmarks.service.ts && grep -n 'create\|findAllForUser\|deleteOwned' src/modules/bookmarks/bookmarks.service.ts && echo CONTRACT_OK"
---

<objective>
Implement `BookmarksModule` — the F12 Bookmarked Searches feature that lets authenticated users save named search URIs, list their saved bookmarks, and delete individual bookmarks. This plan delivers the full CRUD surface described in PRD §F12 and user stories US-12.1 through US-12.4.

Purpose: F12 closes out the authenticated resident's recurring-search productivity loop (JTBD-02.3: "Re-run recurring area searches without re-entering the query each time"). Priya Nair saves a Solr search as a bookmark from the results page, sees it on her dashboard, and re-runs it with a single click. The `bookmarks.type='digest'` path is already consumed by `DigestCron` (plan 13) — this plan adds the user-facing CRUD endpoints that create and manage those rows.

Output:
- `src/modules/bookmarks/` — BookmarksController (3 routes), BookmarksService, BookmarksRepository, CreateBookmarkDto
- `src/app.module.ts` — updated to import BookmarksModule
</objective>

<feature_dependencies>
Implements: F12: Bookmarked Searches — POST /bookmarks (create named bookmark with requestUri; type defaults to 'search'; anonymous → 401); GET /bookmarks (list caller's bookmarks, id DESC order; anonymous → 401; all five formats); DELETE /bookmarks/:id (owner-only delete → 204; other user's or non-existent bookmark → 404 to prevent info leakage; anonymous → 401)
Depends on: F4: OIDC AuthModule — req.user.id (person_id) set by AuthMiddleware; authentication required on all three routes; F5: SearchModule — /search endpoint generates the requestUri stored in bookmarks; bookmark re-execution is a client-side redirect to bookmark.requestUri re-executing the live Solr query
Enables: None — F12 is a leaf node in the dependency graph
</feature_dependencies>

<execution_context>
@.planning/express/modernize-legacy-php-ureport-open311-geo/WAVE-SCHEDULE.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/express/modernize-legacy-php-ureport-open311-geo/12-PLAN.md
@.planning/express/modernize-legacy-php-ureport-open311-geo/13-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: BookmarksRepository + BookmarksService + CreateBookmarkDto</name>
  <files>
    src/modules/bookmarks/bookmarks.repository.ts
    src/modules/bookmarks/bookmarks.service.ts
    src/modules/bookmarks/dto/create-bookmark.dto.ts
  </files>
  <action>
Create the data layer and business logic for the BookmarksModule.

## Directory structure

```
src/modules/bookmarks/
├── bookmarks.module.ts       ← Task 2
├── bookmarks.controller.ts   ← Task 2
├── bookmarks.service.ts      ← Task 1
├── bookmarks.repository.ts   ← Task 1
└── dto/
    └── create-bookmark.dto.ts ← Task 1
```

---

### Schema reference (from mysql.sql / wave 1 Prisma schema)

From the original MySQL DDL (crm/scripts/mysql.sql):

```sql
CREATE TABLE bookmarks (
  id         INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
  person_id  INT UNSIGNED NOT NULL,
  type       VARCHAR(128) NOT NULL DEFAULT 'search',
  name       VARCHAR(128),
  requestUri VARCHAR(1024) NOT NULL,
  CONSTRAINT FK_bookmarks_person_id FOREIGN KEY (person_id) REFERENCES people(id)
);
```

Prisma model (wave 1 plan 01 schema):
```prisma
model bookmarks {
  id         Int     @id @default(autoincrement())
  person_id  Int
  type       String  @default("search") @db.VarChar(128)
  name       String? @db.VarChar(128)
  requestUri String  @db.VarChar(1024)
  people     people  @relation(fields: [person_id], references: [id])
}
```

---

### src/modules/bookmarks/dto/create-bookmark.dto.ts

Per PRD §F12 capabilities and JTBD-02.3 hiring criteria (save current search URI under a user-defined name):

```typescript
import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';

export class CreateBookmarkDto {
  /**
   * User-defined display name for the bookmark.
   * Optional — omitting produces a nameless bookmark (name=null in DB).
   * VARCHAR(128) per schema.
   */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  /**
   * The full request URI to bookmark — e.g. "/search?q=pothole+elm+street&status=open".
   * VARCHAR(1024) per schema.
   * Required per PRD §F12: "save the current search URI under a user-defined name".
   */
  @IsString()
  @MaxLength(1024)
  requestUri!: string;

  /**
   * Bookmark type — 'search' (default) or 'digest' (email digest subscription).
   * type='digest' is consumed by DigestCron (plan 13 NotificationsModule).
   * Per mysql.sql: VARCHAR(128) DEFAULT 'search'.
   */
  @IsOptional()
  @IsString()
  @IsIn(['search', 'digest'])
  type?: string;
}
```

---

### src/modules/bookmarks/bookmarks.repository.ts

Thin Prisma wrapper for the `bookmarks` table using exact column names from the schema.

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

@Injectable()
export class BookmarksRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Insert a new bookmark row (PRD §F12: create bookmark).
   * person_id scopes the bookmark to the authenticated user.
   */
  create(data: Prisma.bookmarksCreateInput) {
    return this.prisma.bookmarks.create({ data });
  }

  /**
   * List all bookmarks for a person, ordered by id DESC (STORY-MAP SM-12.2 NaC).
   * Returns only rows scoped to the given person_id — never other users' bookmarks.
   */
  findAllForPerson(personId: number) {
    return this.prisma.bookmarks.findMany({
      where: { person_id: personId },
      orderBy: { id: 'desc' },
    });
  }

  /**
   * Find a single bookmark by id.
   * Used by deleteOwned() to verify ownership before deletion.
   */
  findOne(id: number) {
    return this.prisma.bookmarks.findUnique({ where: { id } });
  }

  /**
   * Delete a bookmark by id.
   * Caller MUST verify ownership before calling this method.
   */
  delete(id: number) {
    return this.prisma.bookmarks.delete({ where: { id } });
  }
}
```

---

### src/modules/bookmarks/bookmarks.service.ts

Business logic per PRD §F12 and STORY-MAP NaC (SM-12.1 through SM-12.3).

**Ownership enforcement rule (SM-12.3 NaC):**
> `DELETE /bookmarks/:id` restricted to owner; other-user bookmark returns HTTP 404 (no info leakage).

The 404-not-403 rule is intentional: returning 403 would confirm the bookmark exists and belongs to another user, which is an information leak. Return 404 in both cases (not found OR belongs to another user).

```typescript
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BookmarksRepository } from './bookmarks.repository';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';

@Injectable()
export class BookmarksService {
  constructor(private readonly repo: BookmarksRepository) {}

  /**
   * Create a bookmark scoped to the authenticated user.
   *
   * PRD §F12: "create bookmark: save the current search URI under a user-defined name"
   * SM-12.1 NaC: "POST /bookmarks with name + requestUri creates user-scoped bookmark;
   *               anonymous gets HTTP 401" — the 401 is enforced in the controller.
   *
   * @param personId - The authenticated user's people.id (from req.user.id)
   * @param dto      - Validated create payload
   */
  create(personId: number, dto: CreateBookmarkDto) {
    return this.repo.create({
      people:     { connect: { id: personId } },
      name:       dto.name ?? null,
      requestUri: dto.requestUri,
      type:       dto.type ?? 'search',
    } as any);
  }

  /**
   * List all bookmarks for the authenticated user, ordered by id DESC.
   *
   * SM-12.2 NaC: "GET /bookmarks returns only caller's bookmarks ordered id DESC"
   * JTBD-02.3: "Saved bookmarks listed on her dashboard after login"
   *
   * @param personId - The authenticated user's people.id
   */
  findAllForUser(personId: number) {
    return this.repo.findAllForPerson(personId);
  }

  /**
   * Delete a bookmark, enforcing ownership.
   *
   * SM-12.3 NaC: "DELETE /bookmarks/:id restricted to owner;
   *               other-user bookmark returns HTTP 404 (no info leakage)"
   *
   * Returns 404 in all of the following cases:
   *   - bookmark does not exist
   *   - bookmark belongs to a different user (no info leakage per NaC)
   *
   * @param id       - The bookmark primary key
   * @param personId - The authenticated user's people.id
   */
  async deleteOwned(id: number, personId: number): Promise<void> {
    const bookmark = await this.repo.findOne(id);

    // Return 404 whether the bookmark is missing OR belongs to another user.
    // PRD §F12 + SM-12.3: "other-user bookmark returns HTTP 404 (no info leakage)"
    if (!bookmark || bookmark.person_id !== personId) {
      throw new NotFoundException({
        error: 'NOT_FOUND',
        message: 'Bookmark not found',
      });
    }

    await this.repo.delete(id);
  }
}
```
  </action>
  <verify>
```bash
grep -n 'export class BookmarksRepository' src/modules/bookmarks/bookmarks.repository.ts && echo REPO_OK
grep -n 'findAllForPerson\|findOne\|create\|delete' src/modules/bookmarks/bookmarks.repository.ts && echo REPO_METHODS_OK
grep -n 'export class BookmarksService' src/modules/bookmarks/bookmarks.service.ts && echo SERVICE_OK
grep -n 'create\|findAllForUser\|deleteOwned' src/modules/bookmarks/bookmarks.service.ts && echo SERVICE_METHODS_OK
grep -n 'NOT_FOUND\|NotFoundException' src/modules/bookmarks/bookmarks.service.ts && echo 404_OWNERSHIP_OK
grep -n "type.*'search'\|'search'.*type\|default.*search" src/modules/bookmarks/bookmarks.service.ts && echo DEFAULT_TYPE_OK
grep -n 'requestUri\|IsString\|MaxLength' src/modules/bookmarks/dto/create-bookmark.dto.ts && echo DTO_OK
grep -n "IsIn.*search.*digest\|IsIn.*digest.*search" src/modules/bookmarks/dto/create-bookmark.dto.ts && echo DTO_TYPE_VALIDATOR_OK
npx tsc --noEmit 2>&1 | grep -E 'bookmarks|Bookmarks' | head -20 && echo TSC_BOOKMARKS_OK
```
  </verify>
  <done>
- `BookmarksRepository` wraps Prisma `bookmarks` table with `create`, `findAllForPerson(personId, orderBy id DESC)`, `findOne(id)`, `delete(id)` using exact column names from schema (`person_id`, `type`, `name`, `requestUri`)
- `BookmarksService.create(personId, dto)` creates a bookmark scoped to `personId` with `type` defaulting to `'search'` if not supplied; `name` is nullable
- `BookmarksService.findAllForUser(personId)` returns only the caller's bookmarks ordered `id DESC` (SM-12.2 NaC)
- `BookmarksService.deleteOwned(id, personId)` throws `NotFoundException` (404) when bookmark is absent OR belongs to a different `person_id` — no info leakage (SM-12.3 NaC: "other-user bookmark returns HTTP 404")
- `CreateBookmarkDto` validates `requestUri` (required, max 1024), `name` (optional, max 128), `type` (optional, must be `'search'` or `'digest'`)
- TypeScript compiles with zero errors for bookmarks service/repository/dto files
  </done>
</task>

<task type="auto">
  <name>Task 2: BookmarksController + BookmarksModule + wire into AppModule</name>
  <files>
    src/modules/bookmarks/bookmarks.controller.ts
    src/modules/bookmarks/bookmarks.module.ts
    src/app.module.ts
  </files>
  <action>
Create the BookmarksController (3 authenticated routes), the NestJS BookmarksModule, and register the module in AppModule.

---

### Authentication enforcement pattern

All three bookmark routes require an authenticated user (public or staff role). Anonymous callers get HTTP 401. The pattern mirrors MediaController's `requireAuthenticated()` helper: inspect `req.user` set by `AuthMiddleware` (from plan 04 wave 2) and throw `UnauthorizedException` if absent.

**IMPORTANT — type guard helper:**
```typescript
/** Require authenticated user (public or staff); throw 401 if anonymous */
function requireAuthenticated(req: Request): { id: number; role: string | null } {
  const user = (req as any).user;
  if (!user || !user.id) {
    throw new UnauthorizedException({
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }
  return user as { id: number; role: string | null };
}
```

---

### src/modules/bookmarks/bookmarks.controller.ts

Route catalog per PRD §F12 and STORY-MAP SM-12.1 through SM-12.4:

```
POST   /bookmarks        → create    [public — authenticated only; anonymous → 401]
GET    /bookmarks        → list      [public — authenticated only; anonymous → 401]
DELETE /bookmarks/:id    → delete    [public — authenticated only; anonymous → 401; other user → 404]
```

**Format negotiation (SM-12.2 NaC: "GET /bookmarks available in all five formats"):**
The global `SerializationInterceptor` (registered in AppModule from plan 03) handles JSON/XML/CSV/TXT/HTML serialization automatically — no per-controller format logic needed.

```typescript
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
  HttpCode,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { BookmarksService } from './bookmarks.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';

/** Require authenticated user; throw 401 if anonymous */
function requireAuthenticated(req: Request): { id: number; role: string | null } {
  const user = (req as any).user;
  if (!user || !user.id) {
    throw new UnauthorizedException({
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }
  return user as { id: number; role: string | null };
}

/**
 * BookmarksController
 *
 * F12: Bookmarked Searches — authenticated CRUD for saved search URIs.
 *
 * All routes require authentication (req.user set by AuthMiddleware from plan 04).
 * Anonymous callers receive HTTP 401 on all routes.
 *
 * JTBD-02.3: "Can save any Solr search as a named bookmark directly from the results
 *             page without leaving the results" (POST /bookmarks)
 * JTBD-02.3: "Saved bookmarks are listed on her dashboard after login" (GET /bookmarks)
 * JTBD-02.3: "Can delete bookmarks she no longer needs" (DELETE /bookmarks/:id)
 */
@Controller('bookmarks')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  /**
   * POST /bookmarks — create a named bookmark.
   *
   * SM-12.1 NaC: "POST /bookmarks with name + requestUri creates user-scoped bookmark;
   *               anonymous gets HTTP 401"
   * JTBD-02.3: "saved bookmark saved from search results page without leaving results"
   *
   * Returns HTTP 201 with the created bookmark row.
   * Auth: [public] — authenticated users only.
   */
  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateBookmarkDto, @Req() req: Request) {
    const user = requireAuthenticated(req);
    return this.bookmarksService.create(user.id, dto);
  }

  /**
   * GET /bookmarks — list the authenticated user's saved bookmarks.
   *
   * SM-12.2 NaC: "GET /bookmarks returns only caller's bookmarks ordered id DESC;
   *               available in all five formats"
   * JTBD-02.3: "Saved bookmarks listed on her dashboard after login"
   *
   * Auth: [public] — authenticated users only.
   * Format: all five via global SerializationInterceptor.
   */
  @Get()
  findAll(@Req() req: Request) {
    const user = requireAuthenticated(req);
    return this.bookmarksService.findAllForUser(user.id);
  }

  /**
   * DELETE /bookmarks/:id — delete a bookmark (owner only).
   *
   * SM-12.3 NaC: "DELETE /bookmarks/:id restricted to owner;
   *               other-user bookmark returns HTTP 404 (no info leakage)"
   * JTBD-02.3: "Can delete bookmarks she no longer needs"
   *
   * Returns HTTP 204 on success.
   * Returns HTTP 404 if bookmark does not exist OR belongs to another user.
   * Auth: [public] — authenticated users only.
   */
  @Delete(':id')
  @HttpCode(204)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<void> {
    const user = requireAuthenticated(req);
    await this.bookmarksService.deleteOwned(id, user.id);
  }
}
```

---

### src/modules/bookmarks/bookmarks.module.ts

```typescript
import { Module } from '@nestjs/common';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
import { BookmarksRepository } from './bookmarks.repository';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * BookmarksModule — F12: Bookmarked Searches
 *
 * Provides authenticated CRUD for saved Solr search URIs (type='search')
 * and email digest subscriptions (type='digest', consumed by DigestCron in
 * NotificationsModule plan 13).
 *
 * All routes require req.user.id (set by AuthMiddleware from AuthModule plan 04).
 * The global SerializationInterceptor (plan 03) handles all five output formats.
 */
@Module({
  imports: [PrismaModule],
  controllers: [BookmarksController],
  providers: [BookmarksService, BookmarksRepository],
})
export class BookmarksModule {}
```

---

### src/app.module.ts (update — add BookmarksModule)

Import `BookmarksModule` into the root module. Add to the accumulated imports from waves 1–5 (PrismaModule, GelfLoggerModule, AuthModule, AdminModule, CategoriesModule, DepartmentsModule, PeopleModule, TicketsModule, Open311Module, SearchModule, NotificationsModule, MediaModule, GeoModule).

**Update steps:**

1. Add import at the top of `src/app.module.ts`:
```typescript
import { BookmarksModule } from './modules/bookmarks/bookmarks.module';
```

2. Add `BookmarksModule` to the `imports` array in `@Module()`:
```typescript
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  PrismaModule,
  GelfLoggerModule,
  AuthModule,
  AdminModule,
  CategoriesModule,
  DepartmentsModule,
  PeopleModule,
  TicketsModule,
  Open311Module,
  SearchModule,
  NotificationsModule,
  MediaModule,
  GeoModule,
  BookmarksModule,   // ← ADD THIS (Wave 6 plan 16)
],
```

Do NOT rewrite the entire AppModule. Only add the import statement and the `BookmarksModule` entry in the imports array. Preserve all existing middleware registrations (`GelfRequestMiddleware`, `FormatMiddleware`, `AuthMiddleware`), global interceptors (`SerializationInterceptor`), exception filters (`GelfExceptionFilter`), and all other module imports from waves 1–5 unchanged.
  </action>
  <verify>
```bash
grep -n 'export class BookmarksController' src/modules/bookmarks/bookmarks.controller.ts && echo CONTROLLER_OK
grep -n "@Post()\|@Get()\|@Delete(':id')" src/modules/bookmarks/bookmarks.controller.ts && echo ROUTES_OK
grep -n 'HttpCode(201)' src/modules/bookmarks/bookmarks.controller.ts && echo POST_201_OK
grep -n 'HttpCode(204)' src/modules/bookmarks/bookmarks.controller.ts && echo DELETE_204_OK
grep -n 'requireAuthenticated\|UNAUTHORIZED' src/modules/bookmarks/bookmarks.controller.ts && echo AUTH_GUARD_OK
grep -n 'ParseIntPipe' src/modules/bookmarks/bookmarks.controller.ts && echo PARSE_INT_OK
grep -n 'export class BookmarksModule' src/modules/bookmarks/bookmarks.module.ts && echo MODULE_OK
grep -n 'PrismaModule' src/modules/bookmarks/bookmarks.module.ts && echo MODULE_IMPORTS_PRISMA_OK
grep -n 'BookmarksModule' src/app.module.ts && echo APP_MODULE_OK
npx tsc --noEmit 2>&1 | grep -E 'bookmarks|Bookmarks' | head -20 && echo TSC_BOOKMARKS_CTRL_OK
```
  </verify>
  <done>
- `BookmarksController` is decorated with `@Controller('bookmarks')` and `@UsePipes(ValidationPipe)` providing three routes:
  - `POST /bookmarks` → HTTP 201, calls `requireAuthenticated()` → 401 for anonymous, delegates to `bookmarksService.create(user.id, dto)` (SM-12.1)
  - `GET /bookmarks` → HTTP 200, calls `requireAuthenticated()` → 401 for anonymous, delegates to `bookmarksService.findAllForUser(user.id)`; global `SerializationInterceptor` produces all five formats (SM-12.2)
  - `DELETE /bookmarks/:id` → HTTP 204, calls `requireAuthenticated()` → 401 for anonymous, `ParseIntPipe` parses `:id`, delegates to `bookmarksService.deleteOwned(id, user.id)` which throws 404 for absent or other-user bookmarks (SM-12.3)
- `BookmarksModule` imports `PrismaModule`, provides `BookmarksController`, `BookmarksService`, `BookmarksRepository`
- `BookmarksModule` is imported in `src/app.module.ts`
- TypeScript compiles with zero errors for bookmarks controller and module files
  </done>
</task>

</tasks>

<verification>
```bash
# All bookmarks files exist
ls src/modules/bookmarks/bookmarks.module.ts \
   src/modules/bookmarks/bookmarks.controller.ts \
   src/modules/bookmarks/bookmarks.service.ts \
   src/modules/bookmarks/bookmarks.repository.ts \
   src/modules/bookmarks/dto/create-bookmark.dto.ts && echo ALL_FILES_EXIST

# Service exports
grep -n 'export class BookmarksService' src/modules/bookmarks/bookmarks.service.ts && echo SERVICE_EXPORTED
grep -n 'export class BookmarksRepository' src/modules/bookmarks/bookmarks.repository.ts && echo REPO_EXPORTED
grep -n 'export class BookmarksController' src/modules/bookmarks/bookmarks.controller.ts && echo CONTROLLER_EXPORTED
grep -n 'export class BookmarksModule' src/modules/bookmarks/bookmarks.module.ts && echo MODULE_EXPORTED

# POST /bookmarks — authenticated, HTTP 201
grep -n 'HttpCode(201)' src/modules/bookmarks/bookmarks.controller.ts && echo POST_201_OK

# DELETE /bookmarks/:id — authenticated, HTTP 204, 404 for other user (no 403 info leakage)
grep -n 'HttpCode(204)' src/modules/bookmarks/bookmarks.controller.ts && echo DELETE_204_OK
grep -n 'NOT_FOUND\|NotFoundException' src/modules/bookmarks/bookmarks.service.ts && echo OWNERSHIP_404_OK
# Confirm 403 is NOT used for ownership enforcement (must be 404 per SM-12.3)
grep -n 'ForbiddenException\|FORBIDDEN' src/modules/bookmarks/bookmarks.service.ts && echo "WARN: ForbiddenException in service — should be NotFoundException for ownership per SM-12.3" || echo NO_FORBIDDEN_IN_SERVICE_OK

# type='digest' accepted (DigestCron in plan 13 depends on this)
grep -n "digest" src/modules/bookmarks/dto/create-bookmark.dto.ts && echo DIGEST_TYPE_ACCEPTED_OK

# id DESC ordering in repository
grep -n "id.*desc\|desc.*id" src/modules/bookmarks/bookmarks.repository.ts && echo ORDER_BY_ID_DESC_OK

# AppModule wired
grep -n 'BookmarksModule' src/app.module.ts && echo APPMODULE_WIRED_OK

# Full TypeScript compilation
npx tsc --noEmit 2>&1 | grep -c 'error TS' && echo "TS_ERROR_COUNT_ABOVE (should be 0)"
```
</verification>

<success_criteria>
- `POST /bookmarks` returns HTTP 201 with created bookmark row for authenticated users; returns HTTP 401 for anonymous callers
- `GET /bookmarks` returns only the caller's own bookmarks ordered `id DESC`; returns HTTP 401 for anonymous; response serialized in all five formats by global `SerializationInterceptor` (JSON/XML/CSV/TXT/HTML)
- `DELETE /bookmarks/:id` returns HTTP 204 on successful deletion; returns HTTP 404 (NOT 403) when the bookmark either does not exist or belongs to a different user (no info leakage per SM-12.3 NaC); returns HTTP 401 for anonymous
- Bookmark `type` field defaults to `'search'`; accepts `'digest'` as a valid alternative (used by `DigestCron` in plan 13 `NotificationsModule`)
- `BookmarksRepository` uses exact Prisma column names from the schema: `person_id`, `type`, `name`, `requestUri`
- `BookmarksModule` imported into `AppModule`
- TypeScript strict-mode compilation passes with zero errors across all bookmarks module files
</success_criteria>

<output>
After completion, create `.planning/express/modernize-legacy-php-ureport-open311-geo/16-SUMMARY.md` with:
- Files created/modified
- Key decisions (404-not-403 ownership rule, type='digest' support, id DESC ordering)
- Integration contracts fulfilled
- Any deviations from spec (flag conflicts, do not silently diverge)
</output>
