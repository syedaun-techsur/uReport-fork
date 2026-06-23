---
phase: wave-3-backend
plan: 06
type: execute
wave: 3
depends_on: [2]
files_modified:
  - src/common/guards/casl.guard.ts
  - src/common/guards/auth.guard.ts
  - src/common/decorators/check-abilities.decorator.ts
  - src/common/interceptors/pii-mask.interceptor.ts
  - src/common/middleware/auth.middleware.ts
  - src/modules/auth/ability.factory.ts
  - src/app.module.ts
autonomous: true

features:
  implements: ["F2"]
  depends_on: ["F6", "F4"]
  enables: ["F0", "F1", "F10", "F11", "F5", "F8", "F9", "F12", "F13"]

must_haves:
  truths:
    - "Anonymous request has req.user = null; authenticated request has req.user = {id, role, ...}"
    - "Staff user ability.can('manage', 'all') returns true for any action/subject"
    - "Public user can read Category where displayPermissionLevel is 'anonymous' or 'public'"
    - "Anonymous user can only read Category where displayPermissionLevel is 'anonymous'"
    - "Public user cannot read Category where displayPermissionLevel is 'staff'"
    - "Anonymous user cannot read Category where displayPermissionLevel is 'staff'"
    - "Public user can manage Bookmark only when person_id matches their own id"
    - "CaslGuard throws ForbiddenException when ability.can(action, subject) is false"
    - "CaslGuard allows route through when no @CheckAbilities() decorator is present"
    - "PiiMaskInterceptor nulls out reportedByPerson_id, enteredByPerson_id, assignedPerson_id on Ticket for non-staff"
    - "PiiMaskInterceptor nulls out enteredByPerson_id and actionPerson_id on TicketHistory entries for non-staff"
    - "AuthMiddleware is registered globally and populates req.user from session before guards run"
  artifacts:
    - path: "src/modules/auth/ability.factory.ts"
      provides: "AbilityFactory — createForUser() returning CASL Ability per role"
      exports: ["AbilityFactory", "AppAbility"]
    - path: "src/common/guards/casl.guard.ts"
      provides: "CaslGuard — CanActivate impl reading @CheckAbilities metadata"
      exports: ["CaslGuard"]
    - path: "src/common/guards/auth.guard.ts"
      provides: "AuthGuard — ensures req.user is set; throws 401 if not authenticated"
      exports: ["AuthGuard"]
    - path: "src/common/decorators/check-abilities.decorator.ts"
      provides: "CheckAbilities decorator and RequiredAbility interface"
      exports: ["CheckAbilities", "RequiredAbility", "CHECK_ABILITIES"]
    - path: "src/common/interceptors/pii-mask.interceptor.ts"
      provides: "PiiMaskInterceptor — strips PII fields from Ticket/TicketHistory for non-staff"
      exports: ["PiiMaskInterceptor"]
    - path: "src/common/middleware/auth.middleware.ts"
      provides: "AuthMiddleware — reads session.userId, loads people record, sets req.user"
      exports: ["AuthMiddleware"]
  key_links:
    - from: "src/common/middleware/auth.middleware.ts"
      to: "src/modules/auth/session.service.ts"
      via: "SessionService.getUser(req.session)"
      pattern: "sessionService\\.getUser"
    - from: "src/common/guards/casl.guard.ts"
      to: "src/modules/auth/ability.factory.ts"
      via: "AbilityFactory.createForUser(req.user)"
      pattern: "abilityFactory\\.createForUser"
    - from: "src/app.module.ts"
      to: "src/common/middleware/auth.middleware.ts"
      via: "consumer.apply(AuthMiddleware).forRoutes('*')"
      pattern: "AuthMiddleware"
    - from: "src/common/interceptors/pii-mask.interceptor.ts"
      to: "src/modules/auth/ability.factory.ts"
      via: "req.user.role check for 'staff'"
      pattern: "role.*staff"

integration_contracts:
  requires:
    - from_plan: "04"
      artifact: "src/modules/auth/session.service.ts"
      exports: ["SessionService"]
      verify: "grep -n 'export class SessionService' src/modules/auth/session.service.ts && echo CONTRACT_OK"
    - from_plan: "04"
      artifact: "src/modules/auth/auth.module.ts"
      exports: ["AuthModule", "SessionService"]
      verify: "grep -n 'SessionService' src/modules/auth/auth.module.ts && grep -n 'exports' src/modules/auth/auth.module.ts && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "prisma/schema.prisma"
      exports: ["people", "categories"]
      verify: "grep -n 'model people' prisma/schema.prisma && grep -n 'model categories' prisma/schema.prisma && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "package.json"
      exports: ["@casl/ability"]
      verify: "grep -q '@casl/ability' package.json && echo CONTRACT_OK"
  provides:
    - artifact: "src/modules/auth/ability.factory.ts"
      exports: ["AbilityFactory", "AppAbility"]
      shape: |
        export type AppAbility = MongoAbility<[string, string]>;
        @Injectable()
        export class AbilityFactory {
          createForUser(user: { id: number; role: string | null } | null): AppAbility
        }
      verify: "grep -n 'export class AbilityFactory' src/modules/auth/ability.factory.ts && grep -n 'createForUser' src/modules/auth/ability.factory.ts && echo CONTRACT_OK"
    - artifact: "src/common/guards/casl.guard.ts"
      exports: ["CaslGuard"]
      shape: |
        @Injectable()
        export class CaslGuard implements CanActivate {
          canActivate(context: ExecutionContext): boolean
        }
      verify: "grep -n 'export class CaslGuard' src/common/guards/casl.guard.ts && grep -n 'implements CanActivate' src/common/guards/casl.guard.ts && echo CONTRACT_OK"
    - artifact: "src/common/guards/auth.guard.ts"
      exports: ["AuthGuard"]
      shape: |
        @Injectable()
        export class AuthGuard implements CanActivate {
          canActivate(context: ExecutionContext): boolean  // throws UnauthorizedException if no req.user
        }
      verify: "grep -n 'export class AuthGuard' src/common/guards/auth.guard.ts && grep -n 'implements CanActivate' src/common/guards/auth.guard.ts && echo CONTRACT_OK"
    - artifact: "src/common/decorators/check-abilities.decorator.ts"
      exports: ["CheckAbilities", "RequiredAbility", "CHECK_ABILITIES"]
      shape: |
        export const CHECK_ABILITIES = 'check_abilities';
        export interface RequiredAbility { action: string; subject: string }
        export const CheckAbilities = (...requirements: RequiredAbility[]) => SetMetadata(CHECK_ABILITIES, requirements);
      verify: "grep -n 'CHECK_ABILITIES' src/common/decorators/check-abilities.decorator.ts && grep -n 'CheckAbilities' src/common/decorators/check-abilities.decorator.ts && echo CONTRACT_OK"
    - artifact: "src/common/interceptors/pii-mask.interceptor.ts"
      exports: ["PiiMaskInterceptor"]
      shape: |
        @Injectable()
        export class PiiMaskInterceptor implements NestInterceptor {
          intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>
        }
      verify: "grep -n 'export class PiiMaskInterceptor' src/common/interceptors/pii-mask.interceptor.ts && grep -n 'implements NestInterceptor' src/common/interceptors/pii-mask.interceptor.ts && echo CONTRACT_OK"
    - artifact: "src/common/middleware/auth.middleware.ts"
      exports: ["AuthMiddleware"]
      shape: |
        @Injectable()
        export class AuthMiddleware implements NestMiddleware {
          use(req: Request & { user: Person | null }, res: Response, next: NextFunction): Promise<void>
        }
      verify: "grep -n 'export class AuthMiddleware' src/common/middleware/auth.middleware.ts && grep -n 'implements NestMiddleware' src/common/middleware/auth.middleware.ts && echo CONTRACT_OK"
---

<objective>
Implement the complete RBAC layer for uReport: AbilityFactory (CASL), CaslGuard, AuthGuard, CheckAbilities decorator, AuthMiddleware (req.user population), and PiiMaskInterceptor.

Purpose: This is the security backbone that every Wave 4+ feature depends on. Without it, every controller must do its own ad-hoc permission check (as the Wave 2 AdminModule temporarily does). Wave 3 (F10, F11) and Wave 4 (F0, F1) all require the CaslGuard + AuthMiddleware to be in place. The PiiMaskInterceptor must also ship here so that ticket and history responses correctly omit PII for anonymous/public callers from the moment Wave 4 routes go live.

Output:
- `src/modules/auth/ability.factory.ts` — CASL `AbilityFactory` producing the three-tier ability set per FRD §F02.6 and TechArch §5.3
- `src/common/guards/casl.guard.ts` — `CaslGuard` implementing CanActivate, reading `@CheckAbilities()` metadata
- `src/common/guards/auth.guard.ts` — `AuthGuard` returning 401 when `req.user` is null (for routes that require login)
- `src/common/decorators/check-abilities.decorator.ts` — `@CheckAbilities()` SetMetadata decorator
- `src/common/middleware/auth.middleware.ts` — Global middleware that reads `session.userId`, loads `people` record from Prisma, attaches to `req.user`
- `src/common/interceptors/pii-mask.interceptor.ts` — Interceptor that nulls PII fields on Ticket/TicketHistory objects for non-staff callers
- `src/app.module.ts` updated to register `AuthMiddleware` globally and export `AbilityFactory`
</objective>

<feature_dependencies>
Implements: F2: Role-Based Access Control (RBAC) — AbilityFactory + CaslGuard with three-tier role hierarchy (anonymous/public/staff), category-permission WHERE filter semantics, and PII-masking interceptor — reproducing every Laminas ACL rule
Depends on: F6: MySQL-to-PostgreSQL Schema Migration (people + categories tables must exist), F4: OIDC Authentication (SessionService.getUser() must be available for req.user population)
Enables: F0: Open311 GeoReport v2 REST API (category visibility filtering), F1: Ticket Lifecycle (staff-only write routes), F10: Category & Department Administration (staff-only admin routes), F11: People & API Client Management (staff-only CRUD), F5: Full-Text Search (role-visibility filter injection), F8: Media & Attachments (upload permission check), F9: Geo-Clustering (staff-gated admin), F12: Bookmarks (public/own scope), F13: Reporting (staff-only)
</feature_dependencies>

<execution_context>
@.planning/express/modernize-legacy-php-ureport-open311-geo/WAVE-SCHEDULE.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@project_specs/FRD-uReport.md (F02 section, lines 611–767)
@project_specs/TechArch-uReport.md (§5.3 Authorization Model, §5.4 PII Field Masking, §5.7 CASL Guard Implementation)
@.planning/express/modernize-legacy-php-ureport-open311-geo/04-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: AbilityFactory, CaslGuard, AuthGuard, CheckAbilities decorator</name>
  <files>
    src/modules/auth/ability.factory.ts
    src/common/guards/casl.guard.ts
    src/common/guards/auth.guard.ts
    src/common/decorators/check-abilities.decorator.ts
  </files>
  <action>
Implement the four CASL/RBAC building blocks. Install `@casl/ability` if not already present (add to `package.json` dependencies: `"@casl/ability": "^6.7.1"`).

---

### src/modules/auth/ability.factory.ts

Implements FRD §F02.6 CASL Ability Definitions and TechArch §5.3 CASL Ability Rules exactly.

**Role hierarchy:** `anonymous < public < staff`

**Anonymous ability (FRD §F02.2, §F02.6):**
- `can('read', 'Category', { displayPermissionLevel: { $in: ['anonymous'] } })`
- `can('read', 'Ticket', { 'category.displayPermissionLevel': { $in: ['anonymous'] } })`
- `can('create', 'Ticket', { 'category.postingPermissionLevel': 'anonymous' })`
- `can('read', 'Token')` — always allowed (token lookup, FRD §F02.2)
- `can('read', 'ContactMethod')` — GET /contact-methods is anonymous

**Public ability (extends anonymous, FRD §F02.3, §F02.6):**
All anonymous rules plus:
- `can('read', 'Category', { displayPermissionLevel: { $in: ['anonymous', 'public'] } })`
- `can('read', 'Ticket', { 'category.displayPermissionLevel': { $in: ['anonymous', 'public'] } })`
- `can('create', 'Ticket', { 'category.postingPermissionLevel': { $in: ['anonymous', 'public'] } })`
- `can('manage', 'Bookmark', { person_id: currentUser.id })`
- `can('read', 'Person', { id: currentUser.id })`
- `can('update', 'Person', { id: currentUser.id })`
- `can('read', 'Session')` — own account endpoint

**Staff ability (FRD §F02.4):**
- `can('manage', 'all')` — full access to everything

**IMPORTANT:** CASL ability conditions are used for route-level access decisions only. The actual WHERE clause filtering (e.g., restricting DB query to categories where `displayPermissionLevel = 'anonymous'`) is performed in the service layer by each module — the guard does NOT query the database for category conditions. The CASL conditions on Category and Ticket subjects serve as documentation of the filtering rule and as guard-level subject checks when the subject object is passed in.

```typescript
import { Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
  InferSubjects,
} from '@casl/ability';

// Subject strings mirror the domain entities. Using plain strings (not classes)
// avoids circular import issues and is compatible with how controllers pass subjects.
export type Subjects =
  | 'Category'
  | 'Ticket'
  | 'Token'
  | 'Person'
  | 'Bookmark'
  | 'Department'
  | 'Client'
  | 'Media'
  | 'Action'
  | 'Substatus'
  | 'IssueType'
  | 'ContactMethod'
  | 'Search'
  | 'Report'
  | 'Session'
  | 'all';

export type AppAbility = MongoAbility<[string, Subjects]>;

@Injectable()
export class AbilityFactory {
  createForUser(user: { id: number; role: string | null } | null): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (user?.role === 'staff') {
      // Staff: full access per FRD §F02.4 / TechArch §5.3
      can('manage', 'all');
      return build();
    }

    // Anonymous base rules (FRD §F02.2, §F02.6)
    can('read', 'Category', { displayPermissionLevel: { $in: ['anonymous'] } } as any);
    can('read', 'Ticket', { 'category.displayPermissionLevel': { $in: ['anonymous'] } } as any);
    can('create', 'Ticket', { 'category.postingPermissionLevel': 'anonymous' } as any);
    can('read', 'Token');
    can('read', 'ContactMethod'); // GET /contact-methods is anonymous per TechArch §4.3
    can('read', 'Department');   // GET /departments is anonymous per TechArch §4.3

    if (user !== null) {
      // Public (authenticated citizen, role = null): extends anonymous per FRD §F02.3, §F02.6
      can('read', 'Category', { displayPermissionLevel: { $in: ['anonymous', 'public'] } } as any);
      can('read', 'Ticket', { 'category.displayPermissionLevel': { $in: ['anonymous', 'public'] } } as any);
      can('create', 'Ticket', { 'category.postingPermissionLevel': { $in: ['anonymous', 'public'] } } as any);
      can('manage', 'Bookmark', { person_id: user.id } as any);
      can('read', 'Person', { id: user.id } as any);
      can('update', 'Person', { id: user.id } as any);
      can('read', 'Session'); // own /account endpoint
    }

    return build();
  }
}
```

---

### src/common/decorators/check-abilities.decorator.ts

Per TechArch §5.7 CASL Guard Implementation Sketch:

```typescript
import { SetMetadata } from '@nestjs/common';

export const CHECK_ABILITIES = 'check_abilities';

export interface RequiredAbility {
  action: string;
  subject: string;
}

/**
 * Decorator applied to controller methods (or classes) to declare the CASL ability
 * required to access the route.
 *
 * Usage:
 *   @UseGuards(CaslGuard)
 *   @CheckAbilities({ action: 'read', subject: 'Ticket' })
 *   async getTicket(...) { }
 *
 * Multiple requirements can be passed; ALL must be satisfied (AND semantics).
 */
export const CheckAbilities = (...requirements: RequiredAbility[]) =>
  SetMetadata(CHECK_ABILITIES, requirements);
```

---

### src/common/guards/casl.guard.ts

Implements TechArch §5.7 / FRD §F02.7 NestJS Guard Integration.

Key rules:
- If no `@CheckAbilities()` decorator is present on the handler or class, the guard passes through (routes without explicit CASL requirements are permitted). This prevents breaking routes that haven't had their CASL decorator applied yet.
- `req.user` is `null` for anonymous callers (set by `AuthMiddleware`).
- `AbilityFactory.createForUser(null)` is called for anonymous users.
- If `ability.can(action, subject)` returns false for any required rule → throw `ForbiddenException`.

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AbilityFactory } from '../../modules/auth/ability.factory';
import { CHECK_ABILITIES, RequiredAbility } from '../decorators/check-abilities.decorator';
import type { Request } from 'express';

@Injectable()
export class CaslGuard implements CanActivate {
  constructor(
    private readonly abilityFactory: AbilityFactory,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Read required abilities from handler or class metadata (per TechArch §5.7)
    const required = this.reflector.getAllAndOverride<RequiredAbility[] | undefined>(
      CHECK_ABILITIES,
      [context.getHandler(), context.getClass()],
    );

    // No @CheckAbilities() decorator → pass through (guard is a no-op)
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request & { user: { id: number; role: string | null } | null }>();
    const user = req.user ?? null;
    const ability = this.abilityFactory.createForUser(user);

    for (const rule of required) {
      if (!ability.can(rule.action, rule.subject as any)) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return true;
  }
}
```

---

### src/common/guards/auth.guard.ts

A simple guard that throws `401 UnauthorizedException` when `req.user` is null (not authenticated). Applied on routes that require any authenticated user (public or staff). Distinct from `CaslGuard` which handles specific ability checks.

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user: unknown }>();
    if (!req.user) {
      throw new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    return true;
  }
}
```

---

**Dependencies to install:**

In `package.json` add to `"dependencies"`:
```json
"@casl/ability": "^6.7.1"
```

Run `npm install` after writing these files.
  </action>
  <verify>
```bash
npm install 2>&1 | tail -5 && echo "NPM_OK"
npx tsc --noEmit 2>&1 | grep -E 'error TS' | head -20 && echo "TSC_CLEAN" || echo "TSC_ERRORS_ABOVE"
grep -n 'export class AbilityFactory' src/modules/auth/ability.factory.ts && echo CONTRACT_OK
grep -n 'createForUser' src/modules/auth/ability.factory.ts && echo ABILITY_FACTORY_OK
grep -n "can('manage', 'all')" src/modules/auth/ability.factory.ts && echo STAFF_RULE_OK
grep -n 'anonymous.*public' src/modules/auth/ability.factory.ts && echo PUBLIC_RULES_OK
grep -n 'export class CaslGuard' src/common/guards/casl.guard.ts && echo CASL_GUARD_OK
grep -n 'export class AuthGuard' src/common/guards/auth.guard.ts && echo AUTH_GUARD_OK
grep -n 'CHECK_ABILITIES' src/common/decorators/check-abilities.decorator.ts && echo DECORATOR_OK
grep -n 'CheckAbilities' src/common/decorators/check-abilities.decorator.ts && echo CHECK_ABILITIES_DECORATOR_OK
grep -q '@casl/ability' package.json && echo CASL_PACKAGE_OK
```
  </verify>
  <done>
- `@casl/ability` is in `package.json` dependencies and installed
- `AbilityFactory.createForUser(null)` returns anonymous ability (read Category where displayPermissionLevel='anonymous', read Ticket similarly, create Ticket to 'anonymous' categories, read Token, read ContactMethod, read Department)
- `AbilityFactory.createForUser({ id: N, role: null })` returns public ability (anonymous rules + public-level Category/Ticket/create-Ticket, manage own Bookmark, read/update own Person)
- `AbilityFactory.createForUser({ id: N, role: 'staff' })` returns `can('manage', 'all')`
- `CaslGuard` passes through when no `@CheckAbilities()` is present; throws `ForbiddenException` when ability check fails
- `AuthGuard` throws `401 UnauthorizedException` when `req.user` is null
- `CheckAbilities` decorator uses `SetMetadata(CHECK_ABILITIES, requirements)`
- TypeScript compiles with zero errors under strict mode
  </done>
</task>

<task type="auto">
  <name>Task 2: AuthMiddleware (req.user population), PiiMaskInterceptor, wire into AppModule</name>
  <files>
    src/common/middleware/auth.middleware.ts
    src/common/interceptors/pii-mask.interceptor.ts
    src/app.module.ts
  </files>
  <action>
Implement the two remaining RBAC components and wire everything into AppModule. Also export `AbilityFactory` from `AuthModule` so Wave 4+ modules can inject it.

---

### src/common/middleware/auth.middleware.ts

Implements the `AuthMiddleware` described in TechArch §1.4 module map and §5.3.

**Process:**
1. Read `session.userId` from `req.session` using `SessionService.getUser()`.
2. If no `userId` in session → set `req.user = null` (anonymous).
3. If `userId` present → load `people` record from Prisma by `id`.
4. If `people` record found → set `req.user = people record`.
5. If `people` record NOT found (session stale) → destroy session, set `req.user = null`.
6. Call `next()`.

This middleware runs AFTER `express-session` (wired in `main.ts` in Wave 2) and BEFORE any guard.

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionService } from '../../modules/auth/session.service';

// Augment Express Request with user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // null = anonymous (not authenticated); Person record = authenticated
      user: {
        id: number;
        firstname: string | null;
        middlename: string | null;
        lastname: string | null;
        organization: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        zip: string | null;
        department_id: number | null;
        username: string | null;
        role: string | null;
      } | null;
    }
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const sessionUser = this.sessionService.getUser(req.session);

    if (!sessionUser) {
      req.user = null;
      next();
      return;
    }

    // Load full people record so downstream services/guards have all fields
    const person = await this.prisma.people.findUnique({
      where: { id: sessionUser.userId },
    });

    if (!person) {
      // Session references a deleted user — invalidate session
      await this.sessionService.destroy(req.session);
      req.user = null;
    } else {
      req.user = person;
    }

    next();
  }
}
```

---

### src/common/interceptors/pii-mask.interceptor.ts

Implements FRD §F02.8 PII Masking and TechArch §5.4.

**PII fields masked for non-staff callers (anonymous and public):**

On `Ticket` objects:
- `reportedByPerson_id` → set to `null`
- `enteredByPerson_id` → set to `null`
- `assignedPerson_id` → set to `null`

On `TicketHistory` entries (when the response contains a `history` array or the object has `action_id` indicating it is a history entry):
- `enteredByPerson_id` → set to `null`
- `actionPerson_id` → set to `null`

**Detection heuristic:** A Ticket object has an `enteredDate` and `category_id` field. A TicketHistory object has an `action_id` field. An array is processed recursively.

**Staff check:** `req.user?.role === 'staff'` — if staff, interceptor is a no-op.

**Public own-ticket exception (FRD §F02.3):** A public user viewing their own ticket (`reportedByPerson_id === req.user.id`) may see `reportedByPerson_id` on THAT ticket. The interceptor preserves `reportedByPerson_id` for the ticket owner.

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request } from 'express';

@Injectable()
export class PiiMaskInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user ?? null;

    // Staff see all fields — interceptor is a no-op
    if (user?.role === 'staff') {
      return next.handle();
    }

    const currentUserId = user?.id ?? null;

    return next.handle().pipe(
      map((data: unknown) => this.maskPii(data, currentUserId)),
    );
  }

  private maskPii(data: unknown, currentUserId: number | null): unknown {
    if (data === null || data === undefined) return data;
    if (Array.isArray(data)) {
      return data.map(item => this.maskPii(item, currentUserId));
    }
    if (typeof data === 'object') {
      return this.maskObject(data as Record<string, unknown>, currentUserId);
    }
    return data;
  }

  private maskObject(obj: Record<string, unknown>, currentUserId: number | null): Record<string, unknown> {
    const masked = { ...obj };

    // Detect Ticket: has enteredDate + category_id (or status)
    const isTicket = 'category_id' in masked && ('enteredDate' in masked || 'status' in masked);
    // Detect TicketHistory: has action_id
    const isTicketHistory = 'action_id' in masked && 'ticket_id' in masked;

    if (isTicket) {
      // Public user owns this ticket if reportedByPerson_id matches — preserve that field
      const ownTicket = currentUserId !== null && masked['reportedByPerson_id'] === currentUserId;

      if (!ownTicket) {
        // FRD §F02.8: mask reportedByPerson_id for non-staff on others' tickets
        masked['reportedByPerson_id'] = null;
      }
      // Always mask these on non-staff responses (FRD §F02.8)
      masked['enteredByPerson_id'] = null;
      masked['assignedPerson_id'] = null;
    }

    if (isTicketHistory) {
      // FRD §F02.8: mask history person fields for non-staff
      masked['enteredByPerson_id'] = null;
      masked['actionPerson_id'] = null;
    }

    // Recursively mask nested objects (e.g., included relations)
    for (const [key, value] of Object.entries(masked)) {
      if (key !== 'reportedByPerson_id' && key !== 'enteredByPerson_id' && key !== 'assignedPerson_id' && key !== 'actionPerson_id') {
        if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
          masked[key] = this.maskPii(value, currentUserId);
        }
      }
    }

    return masked;
  }
}
```

---

### src/app.module.ts (update)

Update `AppModule` to:
1. Register `AuthMiddleware` globally (runs after `express-session`, before guards)
2. Add `AbilityFactory` as a provider (exported for injection by Wave 4+ modules)
3. Register `CaslGuard` and `PiiMaskInterceptor` as global providers (not as APP_GUARD/APP_INTERCEPTOR — routes opt-in via `@UseGuards(CaslGuard)` and `@UseInterceptors(PiiMaskInterceptor)`)
4. Import `AuthModule` (for `SessionService` export which `AuthMiddleware` needs)

**Note on AuthModule export:** The `AuthModule` from Wave 2 (Plan 04) exports `SessionService`. We must also export `AbilityFactory` from `AuthModule` so that `CaslGuard` (injected in feature modules) can receive it. Update `AuthModule` to add `AbilityFactory` to providers and exports.

**Update `src/modules/auth/auth.module.ts`** to add `AbilityFactory`:
```typescript
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { AbilityFactory } from './ability.factory';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionService, AbilityFactory],
  exports: [SessionService, AbilityFactory],
})
export class AuthModule {}
```

**Update `src/app.module.ts`** to wire `AuthMiddleware` and register RBAC providers:
```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
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
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GelfLoggerModule,
    AuthModule,
    AdminModule,
    // Wave 3+ feature modules imported here as they are built
  ],
  providers: [
    // Serialization
    JsonSerializer,
    XmlSerializer,
    CsvSerializer,
    TxtSerializer,
    HtmlRenderer,
    {
      provide: APP_INTERCEPTOR,
      useClass: SerializationInterceptor,
    },
    // Exception filter (GELF)
    {
      provide: APP_FILTER,
      useClass: GelfExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Order matters: FormatMiddleware first, then GELF request logging, then AuthMiddleware
    // express-session is wired in main.ts (before NestJS middleware pipeline)
    consumer
      .apply(FormatMiddleware, GelfRequestMiddleware, AuthMiddleware)
      .forRoutes('*');
  }
}
```

**Note on CaslGuard + AuthGuard:** These are NOT registered as `APP_GUARD` (global). They are applied per-route via `@UseGuards(CaslGuard)` or `@UseGuards(AuthGuard)` in Wave 3/4 controllers. This matches the TechArch §5.7 pattern. However, `CaslGuard` requires `AbilityFactory` (from `AuthModule`) and `Reflector` (from `@nestjs/core`) — both are available because `AuthModule` is imported globally and `Reflector` is a NestJS built-in. Feature modules that use `CaslGuard` must import `AuthModule` (or rely on the global `AbilityFactory` via module re-export from `AppModule`).

To make `AbilityFactory` injectable everywhere without module imports, make the `AuthModule` `@Global()`:

Update `src/modules/auth/auth.module.ts`:
```typescript
import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { AbilityFactory } from './ability.factory';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionService, AbilityFactory],
  exports: [SessionService, AbilityFactory],
})
export class AuthModule {}
```

Also make `CaslGuard`, `AuthGuard`, and `PiiMaskInterceptor` available as injectable by adding them to `AppModule.providers` (not as APP_GUARD/APP_INTERCEPTOR but as regular providers so they can be injected):

Add to `AppModule.providers`:
```typescript
import { CaslGuard } from './common/guards/casl.guard';
import { AuthGuard } from './common/guards/auth.guard';
import { PiiMaskInterceptor } from './common/interceptors/pii-mask.interceptor';

// In providers array:
CaslGuard,
AuthGuard,
PiiMaskInterceptor,
```
  </action>
  <verify>
```bash
npx tsc --noEmit 2>&1 | grep -E 'error TS' | head -20 && echo "TSC_CLEAN" || echo "TSC_ERRORS_ABOVE"
grep -n 'export class AuthMiddleware' src/common/middleware/auth.middleware.ts && echo AUTH_MIDDLEWARE_OK
grep -n 'implements NestMiddleware' src/common/middleware/auth.middleware.ts && echo AUTH_MIDDLEWARE_INTERFACE_OK
grep -n 'export class PiiMaskInterceptor' src/common/interceptors/pii-mask.interceptor.ts && echo PII_MASK_OK
grep -n 'implements NestInterceptor' src/common/interceptors/pii-mask.interceptor.ts && echo PII_MASK_INTERFACE_OK
grep -n 'role.*staff' src/common/interceptors/pii-mask.interceptor.ts && echo STAFF_BYPASS_OK
grep -n 'reportedByPerson_id.*null\|null.*reportedByPerson_id' src/common/interceptors/pii-mask.interceptor.ts && echo REPORTER_MASK_OK
grep -n 'enteredByPerson_id.*null\|null.*enteredByPerson_id' src/common/interceptors/pii-mask.interceptor.ts && echo ENTERED_MASK_OK
grep -n 'AuthMiddleware' src/app.module.ts && echo AUTH_MIDDLEWARE_WIRED_OK
grep -n 'AbilityFactory' src/modules/auth/auth.module.ts && echo ABILITY_FACTORY_EXPORTED_OK
grep -n '@Global' src/modules/auth/auth.module.ts && echo AUTH_MODULE_GLOBAL_OK
grep -n 'exports.*AbilityFactory\|AbilityFactory.*exports' src/modules/auth/auth.module.ts && echo ABILITY_EXPORTED_OK
grep -n 'CaslGuard\|AuthGuard\|PiiMaskInterceptor' src/app.module.ts && echo GUARDS_REGISTERED_OK
```
  </verify>
  <done>
- `AuthMiddleware` loads `people` record from Prisma using `session.userId`; sets `req.user = null` for anonymous; sets `req.user = people record` for authenticated users; destroys stale sessions
- `AuthMiddleware` is registered in `AppModule.configure()` in the correct order: `FormatMiddleware` → `GelfRequestMiddleware` → `AuthMiddleware`
- `PiiMaskInterceptor` is a no-op for staff (`req.user?.role === 'staff'`)
- `PiiMaskInterceptor` nulls `reportedByPerson_id`, `enteredByPerson_id`, `assignedPerson_id` on Ticket objects for anonymous/public callers
- `PiiMaskInterceptor` preserves `reportedByPerson_id` on a Ticket when `currentUserId === reportedByPerson_id` (own-ticket exception, FRD §F02.3)
- `PiiMaskInterceptor` nulls `enteredByPerson_id` and `actionPerson_id` on TicketHistory objects for non-staff
- `AuthModule` is `@Global()` and exports both `SessionService` and `AbilityFactory`
- `AbilityFactory`, `CaslGuard`, `AuthGuard`, `PiiMaskInterceptor` are all registered as providers in `AppModule`
- TypeScript compiles with zero errors under strict mode
  </done>
</task>

</tasks>

<verification>
After both tasks complete, run the following to verify the complete RBAC layer:

```bash
# TypeScript strict mode — zero errors required
npx tsc --noEmit 2>&1 | head -30 && echo "TSC OK"

# Core RBAC contracts
grep -n 'export class AbilityFactory' src/modules/auth/ability.factory.ts && echo CONTRACT_OK
grep -n 'createForUser' src/modules/auth/ability.factory.ts && echo CONTRACT_OK
grep -n "can('manage', 'all')" src/modules/auth/ability.factory.ts && echo STAFF_RULE_OK
grep -n 'export class CaslGuard' src/common/guards/casl.guard.ts && echo CONTRACT_OK
grep -n 'export class AuthGuard' src/common/guards/auth.guard.ts && echo CONTRACT_OK
grep -n 'CHECK_ABILITIES' src/common/decorators/check-abilities.decorator.ts && echo CONTRACT_OK
grep -n 'export class AuthMiddleware' src/common/middleware/auth.middleware.ts && echo CONTRACT_OK
grep -n 'export class PiiMaskInterceptor' src/common/interceptors/pii-mask.interceptor.ts && echo CONTRACT_OK

# Global wiring in AppModule
grep -n 'AuthMiddleware' src/app.module.ts && echo AUTH_MIDDLEWARE_WIRED
grep -n 'FormatMiddleware.*GelfRequestMiddleware.*AuthMiddleware\|apply.*FormatMiddleware' src/app.module.ts && echo MIDDLEWARE_ORDER_OK

# AbilityFactory globally available
grep -n '@Global' src/modules/auth/auth.module.ts && echo GLOBAL_AUTH_MODULE
grep -n 'AbilityFactory' src/modules/auth/auth.module.ts && echo ABILITY_FACTORY_IN_MODULE

# PII masking fields
grep -n 'reportedByPerson_id' src/common/interceptors/pii-mask.interceptor.ts && echo REPORTER_PII_FIELD
grep -n 'enteredByPerson_id' src/common/interceptors/pii-mask.interceptor.ts && echo ENTERED_PII_FIELD
grep -n 'assignedPerson_id' src/common/interceptors/pii-mask.interceptor.ts && echo ASSIGNED_PII_FIELD
grep -n 'actionPerson_id' src/common/interceptors/pii-mask.interceptor.ts && echo ACTION_PERSON_PII_FIELD

# CASL package installed
grep -q '@casl/ability' package.json && echo CASL_INSTALLED
```

Expected: TSC exits 0, all checks pass.
</verification>

<success_criteria>
**F2 — RBAC layer complete when:**

- `AbilityFactory.createForUser(null)` (anonymous) produces abilities matching FRD §F02.2:
  - `can('read', 'Category', { displayPermissionLevel: { $in: ['anonymous'] } })`
  - `can('read', 'Ticket', { 'category.displayPermissionLevel': { $in: ['anonymous'] } })`
  - `can('create', 'Ticket', { 'category.postingPermissionLevel': 'anonymous' })`
  - `can('read', 'Token')`
  - `can('read', 'ContactMethod')`
  - `can('read', 'Department')`

- `AbilityFactory.createForUser({ id: 5, role: null })` (public) produces FRD §F02.3 abilities:
  - All anonymous rules plus Category/Ticket/create-Ticket at `['anonymous', 'public']` level
  - `can('manage', 'Bookmark', { person_id: 5 })`
  - `can('read', 'Person', { id: 5 })`, `can('update', 'Person', { id: 5 })`

- `AbilityFactory.createForUser({ id: 1, role: 'staff' })` produces `can('manage', 'all')` only

- `CaslGuard` returns `true` when no `@CheckAbilities()` decorator is present
- `CaslGuard` throws `ForbiddenException` when `ability.can(action, subject)` is false for any required rule
- `AuthGuard` throws `401 UnauthorizedException` when `req.user` is null

- `AuthMiddleware` sets `req.user = null` for anonymous requests (no session)
- `AuthMiddleware` loads `people` record from Prisma and sets `req.user = record` for authenticated requests
- `AuthMiddleware` destroys stale sessions (session references non-existent `people.id`)

- `PiiMaskInterceptor` is a no-op for staff
- `PiiMaskInterceptor` nulls `reportedByPerson_id`, `enteredByPerson_id`, `assignedPerson_id` on Ticket objects for anonymous/public
- `PiiMaskInterceptor` preserves `reportedByPerson_id` on Ticket objects when caller is owner (`person_id === req.user.id`)
- `PiiMaskInterceptor` nulls `enteredByPerson_id` and `actionPerson_id` on TicketHistory objects for non-staff

- `AuthModule` is `@Global()` and exports `SessionService` + `AbilityFactory`
- `AuthMiddleware` is registered globally in `AppModule.configure()` after `FormatMiddleware` and `GelfRequestMiddleware`
- `CaslGuard`, `AuthGuard`, `PiiMaskInterceptor` are registered as providers in `AppModule`
- `npx tsc --noEmit` exits 0 under TypeScript strict mode
</success_criteria>

<output>
No SUMMARY.md required for express-mode plans.
Wave 3 (F10 CategoriesModule/DepartmentsModule and F11 PeopleModule) will use CaslGuard + AuthGuard directly:
  @UseGuards(AuthGuard, CaslGuard)
  @CheckAbilities({ action: 'manage', subject: 'Category' })

Wave 4 (F0 Open311Module, F1 TicketsModule) will use:
  - CaslGuard with @CheckAbilities for route-level protection
  - PiiMaskInterceptor on ticket/history response routes
  - Service-layer category visibility filtering (WHERE displayPermissionLevel IN (...)) based on req.user.role

The category-permission WHERE filter (FRD §F02.5) is NOT implemented here — each service module applies
it in its own Prisma query based on req.user.role. The AbilityFactory's conditions document the rule
but the service layer enforces it at the DB query level for efficiency.
</output>
