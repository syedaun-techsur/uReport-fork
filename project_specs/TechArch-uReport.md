# TechArch — uReport Re-Platform
**Project:** uReport  
**Acronym:** uReport  
**Version:** 1.0  
**Date:** 2026-06-23  
**Status:** Active  
**Based on:** PRD-uReport.md v1.0, FRD-uReport.md v1.0  

---

## 1. Architectural Overview

### 1.1 Pattern

uReport adopts a **Modular Monolith** architecture built on NestJS. The application is structured as a single deployable Node.js process whose internals are divided into discrete NestJS modules — each owning its own controllers, services, and repository logic. This pattern maps 1:1 to the legacy PHP Controller/Service/Repository domain model, preserving cognitive familiarity for contributors while eliminating the operational complexity of a microservices split.

**Key architectural decisions:**

| Decision | Rationale |
|----------|-----------|
| Modular monolith (not microservices) | Single process deployment matches existing Apache/mod_php model; service boundaries are enforced by NestJS DI module scope, not network calls |
| NestJS as framework | Decorator-based DI mirrors PHP controller dispatch; built-in interceptor/guard/pipe pipeline replaces bespoke PHP middleware |
| Prisma ORM | Strong TypeScript types, migration tooling (`prisma migrate`), PostgreSQL DDL generation; replaces ActiveRecord + PdoRepository |
| Global `SerializationInterceptor` | Replaces ~187 PHP `.inc` partial templates; single interceptor handles all 5 formats (HTML/JSON/XML/CSV/TXT) across every endpoint |
| CASL for RBAC | Attribute-based access control maps Laminas ACL resource/privilege model cleanly to TypeScript type-safe guards |
| `express-session` + Redis | Server-side sessions preserve the PHP `$_SESSION` cookie semantics; Redis enables multi-replica session sharing |
| Apache Solr retained | Reusing the existing Solr core preserves ranking/field-mapping parity; switching search engines risks divergence |
| PostGIS for spatial | `geometry(Point, 4326)` replaces MySQL `POINT SRID 0`; GiST indexes enable KNN geo-cluster assignment |

---

### 1.2 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL CLIENTS                            │
│  Mobile Apps   City Portal   Third-Party APIs   Browser (Staff/Pub) │
└──────────────┬──────────────────────────────────┬───────────────────┘
               │ Open311 GeoReport v2              │ Web UI / REST API
               │ JSON / XML                        │ HTML / JSON / XML / CSV / TXT
               ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LOAD BALANCER / INGRESS (k8s)                    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
               ┌─────────────▼──────────────┐
               │    NestJS Application       │
               │    Node.js LTS / TypeScript │
               │                             │
               │  ┌────────────────────────┐ │
               │  │  NestJS Request Pipeline│ │
               │  │  ─────────────────────  │ │
               │  │  FormatMiddleware       │ │   ← resolves Accept/suffix → format
               │  │  AuthMiddleware         │ │   ← loads session → req.user
               │  │  CaslGuard              │ │   ← RBAC allow/deny
               │  │  ValidationPipe         │ │   ← class-validator DTOs
               │  │  SerializationInterceptor│ │   ← HTML/JSON/XML/CSV/TXT output
               │  └────────────────────────┘ │
               │                             │
               │  ┌──────────────────────────────────────────────┐  │
               │  │              NestJS Modules                   │  │
               │  │                                               │  │
               │  │  Open311Module    TicketsModule               │  │
               │  │  AuthModule       PeopleModule                │  │
               │  │  CategoriesModule DepartmentsModule           │  │
               │  │  SearchModule     MediaModule                 │  │
               │  │  NotificationsModule  BookmarksModule         │  │
               │  │  GeoModule        ReportsModule               │  │
               │  │  AdminModule      LoggerModule                │  │
               │  └──────────────────────────────────────────────┘  │
               │                             │
               └──────────┬──────────────────┘
                          │
          ┌───────────────┼────────────────────────────┐
          │               │                            │
          ▼               ▼                            ▼
┌──────────────┐  ┌───────────────┐         ┌─────────────────┐
│  PostgreSQL  │  │  Apache Solr  │         │     Redis        │
│  + PostGIS   │  │  (uReport     │         │  (Session Store) │
│              │  │   core)       │         │                  │
│  Prisma ORM  │  │  solr-client  │         │  connect-redis   │
│  (schema.    │  │  npm          │         │  ioredis         │
│   prisma)    │  └───────────────┘         └─────────────────┘
└──────────────┘
          │
          │  side-effects
          ▼
┌──────────────────────────────────────────────────────┐
│              External Services                        │
│                                                       │
│  OIDC IdP           SMTP Server        Graylog        │
│  (openid-client)    (Nodemailer)       (GELF/UDP)     │
│                                        gelf-pro       │
└──────────────────────────────────────────────────────┘
```

---

### 1.3 Deployment Topology

```
┌────────────────────────────────────────────────────────┐
│                  Kubernetes Cluster                     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Deployment: uReport (2+ replicas)              │   │
│  │  Image: node:lts-alpine                         │   │
│  │  Port: 3000                                     │   │
│  │  Resources: 512Mi–1Gi RAM, 0.5–1 CPU            │   │
│  │  EnvFrom: ConfigMap + Secret                    │   │
│  │  VolumeMount: /var/uReport/media (PVC)          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌────────────────┐  ┌───────────┐  ┌──────────────┐   │
│  │ PostgreSQL     │  │ Redis     │  │ Apache Solr  │   │
│  │ StatefulSet    │  │ Deployment│  │ StatefulSet  │   │
│  │ + PVC          │  │           │  │ + PVC        │   │
│  └────────────────┘  └───────────┘  └──────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Ingress (nginx / traefik)                      │   │
│  │  TLS termination                                │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘

External (outside cluster):
  OIDC IdP (city SSO)
  SMTP relay
  Graylog instance
```

**Environment variables summary:**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection URL |
| `SESSION_SECRET` | Cookie signing secret |
| `SESSION_TTL_SECONDS` | Session TTL (default: 3600) |
| `OIDC_ISSUER` | OIDC discovery base URL |
| `OIDC_CLIENT_ID` | OIDC client ID |
| `OIDC_CLIENT_SECRET` | OIDC client secret |
| `OIDC_REDIRECT_URI` | OIDC callback URL |
| `OIDC_END_SESSION_ENDPOINT` | Optional IdP end-session URL |
| `SOLR_HOST` | Solr hostname (default: localhost) |
| `SOLR_PORT` | Solr port (default: 8983) |
| `SOLR_CORE` | Solr core name (default: uReport) |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (default: 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_SECURE` | TLS flag (default: false) |
| `SMTP_FROM` | From address |
| `GRAYLOG_HOST` | Graylog hostname |
| `GRAYLOG_PORT` | GELF input port (default: 12201) |
| `GRAYLOG_TRANSPORT` | `udp` or `tcp` (default: udp) |
| `GRAYLOG_FACILITY` | Facility label (default: uReport) |
| `MEDIA_STORAGE_PATH` | File storage root (default: /var/uReport/media) |
| `MEDIA_MAX_BYTES` | Max upload size (default: 10485760) |
| `DIGEST_CRON` | Cron schedule for digest notifications |
| `PORT` | HTTP listen port (default: 3000) |

---

### 1.4 NestJS Module Map

```
src/
├── app.module.ts                  ← root module: imports all feature modules
│
├── common/
│   ├── interceptors/
│   │   └── serialization.interceptor.ts   ← global SerializationInterceptor
│   ├── guards/
│   │   ├── casl.guard.ts                  ← RBAC guard
│   │   └── auth.guard.ts                  ← session auth check
│   ├── middleware/
│   │   └── format.middleware.ts           ← resolves Accept/suffix to format
│   ├── decorators/
│   │   └── check-abilities.decorator.ts
│   ├── serializers/
│   │   ├── json.serializer.ts
│   │   ├── xml.serializer.ts
│   │   ├── csv.serializer.ts
│   │   └── txt.serializer.ts
│   └── logger/
│       └── gelf-logger.service.ts         ← NestJS LoggerService → GELF
│
├── modules/
│   ├── open311/          ← Open311 GeoReport v2 (versioned API)
│   ├── tickets/          ← Ticket lifecycle
│   ├── auth/             ← OIDC + session management
│   ├── people/           ← People + contact details
│   ├── categories/       ← Categories + category groups
│   ├── departments/      ← Departments + associations
│   ├── search/           ← Solr search
│   ├── media/            ← Attachment upload/serve
│   ├── notifications/    ← Nodemailer email sends
│   ├── bookmarks/        ← Saved searches
│   ├── geo/              ← Geo-cluster assignment + map endpoint
│   ├── reports/          ← Metrics + CSV exports
│   └── admin/            ← Sub-status, actions, issue types, contact methods
│
└── prisma/
    └── prisma.service.ts ← PrismaClient wrapper (global singleton)
```
---

## 2. Component Architecture

### 2.1 NestJS Module Responsibilities

Each NestJS module owns a **controller** (HTTP routing), a **service** (business logic), and a **repository** layer (Prisma queries). Modules expose only their service to other modules via NestJS DI exports.

---

#### `Open311Module`

**Path:** `src/modules/open311/`  
**Route prefix:** `/open311/v2`  
**Auth:** `api_key` header/body (not OIDC session) for POST; anonymous for GET  

| Component | Responsibility |
|-----------|---------------|
| `Open311Controller` | Routes `GET /services`, `GET /services/:id`, `POST /requests`, `GET /requests`, `GET /requests/:id`, `GET /tokens/:token`; applies `.json`/`.xml` suffix routing |
| `Open311Service` | GeoReport v2 business logic: `api_key` validation, category visibility filtering, ServiceRequest mapping, token generation/lookup |
| `Open311Serializer` | Enforces byte-compatible GeoReport v2 envelope shapes (`<services>`, `<service_requests>`, array-of-one for single results) |

**Key design:** URL suffix routing (`.json`, `.xml`) is handled by the `FormatMiddleware` before the controller runs; the controller sees a clean path. The `Open311Module` imports `TicketsModule`, `CategoriesModule`, `PeopleModule`, and `NotificationsModule`.

---

#### `TicketsModule`

**Path:** `src/modules/tickets/`  
**Route prefix:** `/tickets`  
**Auth:** Anonymous (read), Public (create), Staff (write)  

| Component | Responsibility |
|-----------|---------------|
| `TicketsController` | CRUD + lifecycle actions: list, create, get, update, assign, close, duplicate, reopen, comment, response, history |
| `TicketsService` | Business logic: status transitions, `lastModified` updates, `ticketHistory` append, Solr index trigger, geo-cluster trigger, notification trigger |
| `TicketsRepository` | Prisma queries for `tickets` and `ticketHistory`; applies role-based category visibility filter |

**Key design:** Every write operation on a ticket calls `SolrService.indexTicket()` (fire-and-forget with GELF error on failure) and `NotificationsService.send()` (synchronous, GELF error on SMTP failure but does not throw).

---

#### `AuthModule`

**Path:** `src/modules/auth/`  
**Route prefix:** `/auth`  

| Component | Responsibility |
|-----------|---------------|
| `AuthController` | `GET /auth/login` (initiate), `GET /auth/callback` (exchange), `GET /auth/logout`, `GET /account`, `PUT /account` |
| `AuthService` | OIDC flow: `openid-client` `Issuer.discover()`, `generators.state()`, `generators.nonce()`, `client.callback()`, claims extraction, people upsert |
| `SessionService` | `express-session` adapter: read/write `session.userId`, `session.role`, `session.state`, `session.nonce`, `session.returnTo` |
| `AbilityFactory` | CASL `defineAbility` factory: creates `Ability` instances for anonymous/public/staff roles |

**Key design:** `express-session` with `connect-redis` backend. Session cookie is `HttpOnly`, `Secure`, `SameSite=Lax`. The `AuthMiddleware` (global NestJS middleware) reads `session.userId`, loads the `people` record, and attaches `req.user` (or `null` for anonymous) before any guard runs.

---

#### `CategoriesModule`

**Path:** `src/modules/categories/`  
**Route prefix:** `/categories`, `/category-groups`  

| Component | Responsibility |
|-----------|---------------|
| `CategoriesController` | CRUD for categories and category groups; category action response management |
| `CategoriesService` | Visibility filtering by `displayPermissionLevel`; `customFields` JSON validation; `lastModified` update on save |
| `CategoriesRepository` | Prisma queries for `categories`, `categoryGroups`, `category_action_responses` |

---

#### `DepartmentsModule`

**Path:** `src/modules/departments/`  
**Route prefix:** `/departments`  

| Component | Responsibility |
|-----------|---------------|
| `DepartmentsController` | CRUD departments; manage `department_categories` and `department_actions` associations |
| `DepartmentsService` | Business logic for department routing: resolve assignable people by category department |
| `DepartmentsRepository` | Prisma queries for `departments`, `department_actions`, `department_categories` |

---

#### `PeopleModule`

**Path:** `src/modules/people/`  
**Route prefix:** `/people`, `/users`, `/clients`  

| Component | Responsibility |
|-----------|---------------|
| `PeopleController` | Staff CRUD for people records + sub-resources (emails, phones, addresses); `GET /people/search`; `GET /users` (staff list) |
| `ClientsController` | CRUD for `clients` (api_key management) |
| `PeopleService` | Person lookup/upsert by `username` (OIDC sub); search by name/email; PII field masking for non-staff |
| `PeopleRepository` | Prisma queries for `people`, `peopleEmails`, `peoplePhones`, `peopleAddresses`, `clients` |

---

#### `SearchModule`

**Path:** `src/modules/search/`  
**Route prefix:** `/search`  

| Component | Responsibility |
|-----------|---------------|
| `SearchController` | `GET /search` with full query parameter set; delegates to `SolrService` |
| `SolrService` | Node Solr client wrapper: eDisMax query construction, facet config, role-visibility filter injection, result mapping; `indexTicket()` / `reindexAll()` |

**Key design:** `SolrService` is exported from `SearchModule` and injected into `TicketsService` for incremental indexing. Solr unavailability during write is swallowed with a GELF `warn`; during search it returns HTTP 503.

---

#### `MediaModule`

**Path:** `src/modules/media/`  
**Route prefix:** `/tickets/:id/media`  

| Component | Responsibility |
|-----------|---------------|
| `MediaController` | List, upload (`multipart/form-data`), stream, thumbnail stream, delete |
| `MediaService` | Multer configuration; UUID-based `internalFilename` generation; thumbnail generation for image MIME types; `ticketHistory` audit log on upload |
| `MediaRepository` | Prisma queries for `media` table |

**Key design:** Files stored at `{MEDIA_STORAGE_PATH}/{ticket_id}/{internalFilename}`. Thumbnails at `{MEDIA_STORAGE_PATH}/{ticket_id}/thumbnails/{internalFilename}`. Streaming uses `fs.createReadStream()` piped to the response.

---

#### `NotificationsModule`

**Path:** `src/modules/notifications/`  

| Component | Responsibility |
|-----------|---------------|
| `NotificationsService` | Orchestrates email sends: template resolution (`category_action_responses` → `actions.template`), reply-to resolution, recipient resolution from `peopleEmails.usedForNotifications`, variable substitution, Nodemailer dispatch, `sentNotifications` logging |
| `MailerService` | Nodemailer transport wrapper; configured from `SMTP_*` env vars |
| `DigestScheduler` | `@Cron(DIGEST_CRON)` job: batch digest email send |

---

#### `BookmarksModule`

**Path:** `src/modules/bookmarks/`  
**Route prefix:** `/bookmarks`  

| Component | Responsibility |
|-----------|---------------|
| `BookmarksController` | `GET /bookmarks`, `POST /bookmarks`, `DELETE /bookmarks/:id` |
| `BookmarksService` | Scopes bookmarks to `req.user.id`; validates `person_id` ownership on delete |
| `BookmarksRepository` | Prisma queries for `bookmarks` |

---

#### `GeoModule`

**Path:** `src/modules/geo/`  
**Route prefix:** `/locations`  

| Component | Responsibility |
|-----------|---------------|
| `LocationsController` | `GET /locations` — returns cluster data for map rendering |
| `GeoClusterService` | Cluster assignment: for a given lat/lon, finds nearest cluster at each level using PostGIS `ST_DWithin` / KNN `<->` operator via `$queryRaw`; `assignClusters(ticketId, lat, lon)`; `reClusterAll()` script |
| `GeoRepository` | Prisma + raw SQL queries for `geoclusters`, `ticket_geodata` |

**Key design:** `GeoClusterService.assignClusters()` is called by `TicketsService` after ticket create/update when lat/lon is provided.

---

#### `ReportsModule`

**Path:** `src/modules/reports/`  
**Route prefix:** `/metrics`, `/reports`  

| Component | Responsibility |
|-----------|---------------|
| `MetricsController` | `GET /metrics` — open/closed counts, avg resolution time, by-category/department breakdowns |
| `ReportsController` | `GET /reports` — exportable report with date-range, category, department filters; all 5 formats via `SerializationInterceptor` |
| `ReportsService` | Prisma aggregate queries; result mapped to report DTOs |

---

#### `AdminModule`

**Path:** `src/modules/admin/`  
**Route prefix:** `/substatus`, `/actions`, `/issue-types`, `/contact-methods`  

| Component | Responsibility |
|-----------|---------------|
| `SubstatusController` | CRUD for `substatus` table |
| `ActionsController` | CRUD for `actions` (department type only; system actions have restricted edit) |
| `IssueTypesController` | CRUD for `issueTypes` |
| `ContactMethodsController` | CRUD for `contactMethods` |
| `AdminService` | Shared validation: prevent deletion of system actions and seeded reference data |

---

### 2.2 Cross-Cutting Components

#### `SerializationInterceptor` (global)

```
Request arrives
     │
     ▼
FormatMiddleware resolves format
  → attaches req.negotiatedFormat: 'json' | 'xml' | 'csv' | 'txt' | 'html'
     │
     ▼
Controller returns plain TS object / array
     │
     ▼
SerializationInterceptor.intercept()
  → reads req.negotiatedFormat
  → delegates to:
       JsonSerializer  → sets Content-Type: application/json
       XmlSerializer   → sets Content-Type: application/xml
       CsvSerializer   → sets Content-Type: text/csv
       TxtSerializer   → sets Content-Type: text/plain
       HtmlRenderer    → sets Content-Type: text/html
  → writes serialized string to response
```

Format resolution priority:
1. URL suffix (`.json`, `.xml`, `.csv`, `.txt`)
2. `?format=` query parameter
3. `Accept` header
4. Default: JSON for `/open311/v2/` routes; HTML for all others

#### `CaslGuard` (applied per-route)

```typescript
// Applied via: @UseGuards(CaslGuard) @CheckAbilities({action, subject})
@Injectable()
class CaslGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest().user;   // null = anonymous
    const ability = AbilityFactory.createForUser(user);
    const required = this.reflector.get(CHECK_ABILITIES, ctx.getHandler());
    if (!ability.can(required.action, required.subject)) throw new ForbiddenException();
    return true;
  }
}
```

#### `GelfLoggerService` (global logger)

Implements NestJS `LoggerService`. Wraps `gelf-pro` to send GELF 1.1 messages over UDP/TCP to Graylog. Falls back to `console.error` if Graylog is unreachable. Structured fields: `_request_id`, `_user_id`, `_ticket_id`, `facility`.
---

## 3. Data Model

### 3.1 Entity-Relationship Diagram

```
version                 (standalone lookup)

contactMethods ─────────────────────────────────────────────┐
issueTypes  ─────────────────────────────────────────────┐  │
substatus   ─────────────────────────────────────────┐   │  │
actions     ─────────────────────────────────────┐   │   │  │
categoryGroups ──────────────────────────────┐   │   │   │  │
                                             │   │   │   │  │
departments ◄─── categories ────────────────►│   │   │   │  │
    │               │  └── category_action_responses ──► actions
    │               │  └── categoryGroups
    │               │
    │           department_categories (dept ↔ category M:M)
    │           department_actions    (dept ↔ action M:M)
    │
people ◄──── peopleEmails
people ◄──── peoplePhones
people ◄──── peopleAddresses
people ◄──── clients ────────────────────────────────► contactMethods
    │
    ├──── tickets.enteredByPerson_id
    ├──── tickets.reportedByPerson_id
    ├──── tickets.assignedPerson_id
    └──── media.person_id

tickets ────► categories
tickets ────► clients
tickets ────► substatus
tickets ────► issueTypes (issueType_id)
tickets ────► contactMethods (contactMethod_id, responseMethod_id)
tickets ────► tickets (parent_id, self-ref for duplicates)

ticketHistory ──► tickets
ticketHistory ──► people (enteredByPerson_id, actionPerson_id)
ticketHistory ──► actions

media ──────► tickets
media ──────► people

bookmarks ──► people

ticket_geodata ─► tickets
ticket_geodata ─► geoclusters (cluster_id_0 … cluster_id_6)
```

---

### 3.2 PostgreSQL DDL

Full DDL for all 21 tables (source of truth: `project_specs/FRD/Y0-schema.md`).

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- Reference / Lookup Tables
-- ============================================================

CREATE TABLE "version" (
    version VARCHAR(8) NOT NULL PRIMARY KEY
);
INSERT INTO "version" (version) VALUES ('2.1');

CREATE TABLE "contactMethods" (
    id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(128) NOT NULL
);
INSERT INTO "contactMethods" (name) VALUES ('Email'),('Phone'),('Web Form'),('Other');

CREATE TABLE "substatus" (
    id          INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(25)  NOT NULL,
    description VARCHAR(128) NOT NULL,
    status      TEXT         NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'closed')),
    "isDefault" BOOLEAN      NOT NULL DEFAULT FALSE
);
INSERT INTO "substatus" (status, name, description) VALUES
    ('closed', 'Resolved',  'This ticket has been taken care of'),
    ('closed', 'Duplicate', 'This ticket is a duplicate of another ticket'),
    ('closed', 'Bogus',     'This ticket is not actually a problem or has already been taken care of');

CREATE TABLE "actions" (
    id           INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name         VARCHAR(25)  NOT NULL,
    description  VARCHAR(128) NOT NULL,
    type         TEXT         NOT NULL DEFAULT 'department'
                 CHECK (type IN ('system', 'department')),
    template     TEXT,
    "replyEmail" VARCHAR(128)
);
INSERT INTO "actions" (name, type, description) VALUES
    ('open',           'system', 'Opened by {actionPerson}'),
    ('assignment',     'system', '{enteredByPerson} assigned this case to {actionPerson}'),
    ('closed',         'system', 'Closed by {actionPerson}'),
    ('changeCategory', 'system', 'Changed category from {original:category_id} to {updated:category_id}'),
    ('changeLocation', 'system', 'Changed location from {original:location} to {updated:location}'),
    ('response',       'system', '{actionPerson} contacted {reportedByPerson_id}'),
    ('duplicate',      'system', '{duplicate:ticket_id} marked as a duplicate of this case.'),
    ('update',         'system', '{enteredByPerson} updated this case.'),
    ('comment',        'system', '{enteredByPerson} commented on this case.'),
    ('upload_media',   'system', '{enteredByPerson} uploaded an attachment.');

CREATE TABLE "categoryGroups" (
    id       INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name     VARCHAR(50) NOT NULL,
    ordering SMALLINT
);
INSERT INTO "categoryGroups" (name) VALUES ('Streets'),('Sanitation'),('Other');

CREATE TABLE "issueTypes" (
    id   INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(128) NOT NULL
);
INSERT INTO "issueTypes" (name) VALUES
    ('Comment'),('Complaint'),('Question'),('Report'),('Request'),('Violation');

-- ============================================================
-- Core Person / Department Tables
-- ============================================================

CREATE TABLE "departments" (
    id                 INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name               VARCHAR(128) NOT NULL,
    "defaultPerson_id" INTEGER
    -- FK to people added below after people is created (circular ref)
);

CREATE TABLE "people" (
    id            INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    firstname     VARCHAR(128),
    middlename    VARCHAR(128),
    lastname      VARCHAR(128),
    organization  VARCHAR(128),
    address       VARCHAR(128),
    city          VARCHAR(128),
    state         VARCHAR(128),
    zip           VARCHAR(20),
    department_id INTEGER,
    username      VARCHAR(40)  UNIQUE,
    role          VARCHAR(30),
    CONSTRAINT FK_people_department_id
        FOREIGN KEY (department_id) REFERENCES "departments"(id)
);

-- Resolve circular FK
ALTER TABLE "departments"
    ADD CONSTRAINT FK_departments_defaultPerson_id
        FOREIGN KEY ("defaultPerson_id") REFERENCES "people"(id)
        DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX idx_people_username      ON "people"(username);
CREATE INDEX idx_people_department_id ON "people"(department_id);

CREATE TABLE "peopleEmails" (
    id                     INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id              INTEGER      NOT NULL,
    email                  VARCHAR(255) NOT NULL,
    label                  TEXT         NOT NULL DEFAULT 'Other'
                           CHECK (label IN ('Home', 'Work', 'Other')),
    "usedForNotifications" BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT FK_peopleEmails_person_id
        FOREIGN KEY (person_id) REFERENCES "people"(id)
);
CREATE INDEX idx_peopleEmails_person_id ON "peopleEmails"(person_id);
CREATE INDEX idx_peopleEmails_email     ON "peopleEmails"(email);

CREATE TABLE "peoplePhones" (
    id        INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id INTEGER     NOT NULL,
    number    VARCHAR(20),
    label     TEXT        NOT NULL DEFAULT 'Other'
              CHECK (label IN ('Main', 'Mobile', 'Work', 'Home', 'Fax', 'Pager', 'Other')),
    CONSTRAINT FK_peoplePhones_person_id
        FOREIGN KEY (person_id) REFERENCES "people"(id)
);
CREATE INDEX idx_peoplePhones_person_id ON "peoplePhones"(person_id);

CREATE TABLE "peopleAddresses" (
    id        INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id INTEGER      NOT NULL,
    address   VARCHAR(128) NOT NULL,
    city      VARCHAR(128),
    state     VARCHAR(128),
    zip       VARCHAR(20),
    label     TEXT         NOT NULL DEFAULT 'Home'
              CHECK (label IN ('Home', 'Business', 'Rental')),
    CONSTRAINT FK_peopleAddresses_person_id
        FOREIGN KEY (person_id) REFERENCES "people"(id)
);
CREATE INDEX idx_peopleAddresses_person_id ON "peopleAddresses"(person_id);

CREATE TABLE "clients" (
    id                 INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name               VARCHAR(128) NOT NULL,
    url                VARCHAR(255),
    api_key            VARCHAR(50)  NOT NULL UNIQUE,
    "contactPerson_id" INTEGER      NOT NULL,
    "contactMethod_id" INTEGER,
    CONSTRAINT FK_clients_contactPerson_id
        FOREIGN KEY ("contactPerson_id") REFERENCES "people"(id),
    CONSTRAINT FK_clients_contactMethod_id
        FOREIGN KEY ("contactMethod_id") REFERENCES "contactMethods"(id)
);
CREATE INDEX idx_clients_api_key ON "clients"(api_key);

-- ============================================================
-- Category Tables
-- ============================================================

CREATE TABLE "categories" (
    id                        INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                      VARCHAR(50)  NOT NULL,
    description               VARCHAR(512),
    department_id             INTEGER      NOT NULL,
    "defaultPerson_id"        INTEGER,
    "categoryGroup_id"        INTEGER,
    active                    BOOLEAN,
    featured                  BOOLEAN,
    "displayPermissionLevel"  TEXT         NOT NULL DEFAULT 'staff'
                              CHECK ("displayPermissionLevel" IN ('staff', 'public', 'anonymous')),
    "postingPermissionLevel"  TEXT         NOT NULL DEFAULT 'staff'
                              CHECK ("postingPermissionLevel" IN ('staff', 'public', 'anonymous')),
    "customFields"            TEXT,
    "lastModified"            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "slaDays"                 INTEGER,
    "notificationReplyEmail"  VARCHAR(128),
    "autoCloseIsActive"       BOOLEAN,
    "autoCloseSubstatus_id"   INTEGER,
    CONSTRAINT FK_categories_department_id
        FOREIGN KEY (department_id)     REFERENCES "departments"(id),
    CONSTRAINT FK_categories_defaultPerson_id
        FOREIGN KEY ("defaultPerson_id") REFERENCES "people"(id),
    CONSTRAINT FK_categories_categoryGroup_id
        FOREIGN KEY ("categoryGroup_id") REFERENCES "categoryGroups"(id)
);
CREATE INDEX idx_categories_department_id          ON "categories"(department_id);
CREATE INDEX idx_categories_categoryGroup_id       ON "categories"("categoryGroup_id");
CREATE INDEX idx_categories_displayPermissionLevel ON "categories"("displayPermissionLevel");
CREATE INDEX idx_categories_active                 ON "categories"(active);

CREATE TABLE "category_action_responses" (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id  INTEGER NOT NULL,
    action_id    INTEGER NOT NULL,
    template     TEXT,
    "replyEmail" VARCHAR(128),
    CONSTRAINT FK_category_action_responses_category_id
        FOREIGN KEY (category_id) REFERENCES "categories"(id),
    CONSTRAINT FK_category_action_responses_action_id
        FOREIGN KEY (action_id)   REFERENCES "actions"(id)
);
CREATE INDEX idx_car_category_id ON "category_action_responses"(category_id);
CREATE INDEX idx_car_action_id   ON "category_action_responses"(action_id);

CREATE TABLE "department_actions" (
    department_id INTEGER NOT NULL,
    action_id     INTEGER NOT NULL,
    PRIMARY KEY (department_id, action_id),
    CONSTRAINT FK_department_actions_department_id
        FOREIGN KEY (department_id) REFERENCES "departments"(id),
    CONSTRAINT FK_department_actions_action_id
        FOREIGN KEY (action_id)     REFERENCES "actions"(id)
);

CREATE TABLE "department_categories" (
    department_id INTEGER NOT NULL,
    category_id   INTEGER NOT NULL,
    PRIMARY KEY (department_id, category_id),
    CONSTRAINT FK_department_categories_department_id
        FOREIGN KEY (department_id) REFERENCES "departments"(id),
    CONSTRAINT FK_department_categories_category_id
        FOREIGN KEY (category_id)   REFERENCES "categories"(id)
);

-- ============================================================
-- Core Ticket Table
-- ============================================================

CREATE TABLE "tickets" (
    id                    INTEGER          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_id             INTEGER,
    category_id           INTEGER,
    "issueType_id"        INTEGER,
    client_id             INTEGER,
    "enteredByPerson_id"  INTEGER,
    "reportedByPerson_id" INTEGER,
    "assignedPerson_id"   INTEGER,
    "contactMethod_id"    INTEGER,
    "responseMethod_id"   INTEGER,
    "enteredDate"         TIMESTAMP        NOT NULL DEFAULT NOW(),
    "lastModified"        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    "addressId"           INTEGER,
    latitude              DOUBLE PRECISION,
    longitude             DOUBLE PRECISION,
    location              VARCHAR(128),
    city                  VARCHAR(128),
    state                 VARCHAR(128),
    zip                   VARCHAR(40),
    status                VARCHAR(20)      NOT NULL DEFAULT 'open',
    "closedDate"          TIMESTAMPTZ,
    substatus_id          INTEGER,
    "additionalFields"    VARCHAR(255),
    "customFields"        TEXT,
    description           TEXT,
    CONSTRAINT FK_tickets_parent_id
        FOREIGN KEY (parent_id)              REFERENCES "tickets"(id),
    CONSTRAINT FK_tickets_category_id
        FOREIGN KEY (category_id)            REFERENCES "categories"(id),
    CONSTRAINT FK_tickets_client_id
        FOREIGN KEY (client_id)              REFERENCES "clients"(id),
    CONSTRAINT FK_tickets_enteredByPerson_id
        FOREIGN KEY ("enteredByPerson_id")   REFERENCES "people"(id),
    CONSTRAINT FK_tickets_assignedPerson_id
        FOREIGN KEY ("assignedPerson_id")    REFERENCES "people"(id),
    CONSTRAINT FK_tickets_substatus_id
        FOREIGN KEY (substatus_id)           REFERENCES "substatus"(id)
);
CREATE INDEX idx_tickets_category_id          ON "tickets"(category_id);
CREATE INDEX idx_tickets_status               ON "tickets"(status);
CREATE INDEX idx_tickets_enteredDate          ON "tickets"("enteredDate");
CREATE INDEX idx_tickets_lastModified         ON "tickets"("lastModified");
CREATE INDEX idx_tickets_assignedPerson_id    ON "tickets"("assignedPerson_id");
CREATE INDEX idx_tickets_reportedByPerson_id  ON "tickets"("reportedByPerson_id");
CREATE INDEX idx_tickets_enteredByPerson_id   ON "tickets"("enteredByPerson_id");
CREATE INDEX idx_tickets_substatus_id         ON "tickets"(substatus_id);
CREATE INDEX idx_tickets_parent_id            ON "tickets"(parent_id);

-- ============================================================
-- Ticket History & Media
-- ============================================================

CREATE TABLE "ticketHistory" (
    id                    INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id             INTEGER     NOT NULL,
    "enteredByPerson_id"  INTEGER,
    "actionPerson_id"     INTEGER,
    action_id             INTEGER     NOT NULL,
    "enteredDate"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "actionDate"          TIMESTAMP   NOT NULL DEFAULT NOW(),
    notes                 TEXT,
    data                  TEXT,
    "sentNotifications"   TEXT,
    CONSTRAINT FK_ticketHistory_ticket_id
        FOREIGN KEY (ticket_id)             REFERENCES "tickets"(id),
    CONSTRAINT FK_ticketHistory_enteredByPerson_id
        FOREIGN KEY ("enteredByPerson_id")  REFERENCES "people"(id),
    CONSTRAINT FK_ticketHistory_actionPerson_id
        FOREIGN KEY ("actionPerson_id")     REFERENCES "people"(id),
    CONSTRAINT FK_ticketHistory_action_id
        FOREIGN KEY (action_id)             REFERENCES "actions"(id)
);
CREATE INDEX idx_ticketHistory_ticket_id  ON "ticketHistory"(ticket_id);
CREATE INDEX idx_ticketHistory_action_id  ON "ticketHistory"(action_id);
CREATE INDEX idx_ticketHistory_enteredDate ON "ticketHistory"("enteredDate");

CREATE TABLE "media" (
    id                 INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id          INTEGER      NOT NULL,
    filename           VARCHAR(128) NOT NULL,
    "internalFilename" VARCHAR(50)  NOT NULL,
    mime_type          VARCHAR(128),
    uploaded           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    person_id          INTEGER,
    CONSTRAINT FK_media_ticket_id
        FOREIGN KEY (ticket_id) REFERENCES "tickets"(id),
    CONSTRAINT FK_media_person_id
        FOREIGN KEY (person_id) REFERENCES "people"(id)
);
CREATE INDEX idx_media_ticket_id ON "media"(ticket_id);

-- ============================================================
-- Bookmarks
-- ============================================================

CREATE TABLE "bookmarks" (
    id           INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id    INTEGER       NOT NULL,
    type         VARCHAR(128)  NOT NULL DEFAULT 'search',
    name         VARCHAR(128),
    "requestUri" VARCHAR(1024) NOT NULL,
    CONSTRAINT FK_bookmarks_person_id
        FOREIGN KEY (person_id) REFERENCES "people"(id)
);
CREATE INDEX idx_bookmarks_person_id ON "bookmarks"(person_id);

-- ============================================================
-- Geo-Clustering (PostGIS)
-- ============================================================

CREATE TABLE "geoclusters" (
    id     INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    level  SMALLINT NOT NULL,
    center geometry(Point, 4326) NOT NULL
);
CREATE INDEX idx_geoclusters_center ON "geoclusters" USING GIST(center);
CREATE INDEX idx_geoclusters_level  ON "geoclusters"(level);

CREATE TABLE "ticket_geodata" (
    ticket_id    INTEGER NOT NULL PRIMARY KEY,
    cluster_id_0 INTEGER,
    cluster_id_1 INTEGER,
    cluster_id_2 INTEGER,
    cluster_id_3 INTEGER,
    cluster_id_4 INTEGER,
    cluster_id_5 INTEGER,
    cluster_id_6 INTEGER,
    FOREIGN KEY (ticket_id)    REFERENCES "tickets"    (id),
    FOREIGN KEY (cluster_id_0) REFERENCES "geoclusters"(id),
    FOREIGN KEY (cluster_id_1) REFERENCES "geoclusters"(id),
    FOREIGN KEY (cluster_id_2) REFERENCES "geoclusters"(id),
    FOREIGN KEY (cluster_id_3) REFERENCES "geoclusters"(id),
    FOREIGN KEY (cluster_id_4) REFERENCES "geoclusters"(id),
    FOREIGN KEY (cluster_id_5) REFERENCES "geoclusters"(id),
    FOREIGN KEY (cluster_id_6) REFERENCES "geoclusters"(id)
);
```

---

### 3.3 DDL Design Notes

| Topic | Decision |
|-------|----------|
| Auto-increment | `GENERATED ALWAYS AS IDENTITY` (SQL standard; preferred over `SERIAL` in PostgreSQL 10+) |
| ENUM columns | Translated to `TEXT + CHECK` constraints for future extensibility without DDL migrations |
| Booleans | `BOOLEAN` replaces MySQL `TINYINT(1)` |
| Timestamps | `TIMESTAMP` (no-tz) for `enteredDate`/`actionDate` (legacy MySQL DATETIME semantics); `TIMESTAMPTZ` for `lastModified`, `closedDate`, `uploaded` (timezone-aware) |
| Spatial | `geoclusters.center` is `geometry(Point, 4326)` with GiST index; ticket lat/lon remain `DOUBLE PRECISION` scalars |
| Circular FK | `departments.defaultPerson_id → people.id` is `DEFERRABLE INITIALLY DEFERRED` to allow seed insertion order |
| Unsigned ints | No unsigned integer in PostgreSQL; `INTEGER` used; application enforces positive values |
| camelCase names | Stored as double-quoted identifiers in PostgreSQL to match legacy PHP field names exactly |

---

### 3.4 Prisma Schema Conventions

The `schema.prisma` file maps to the DDL above. Key conventions:
- Model names match table names (e.g., `model tickets`, `model ticketHistory`)
- Field names use the exact PostgreSQL column names (camelCase preserved via `@map`)
- Relations: Prisma `@relation` annotations for all FK constraints
- `@@map("tableName")` on each model for quoted identifier tables
- PostGIS `geometry` fields use `Unsupported("geometry(Point, 4326)")` type in Prisma schema; spatial queries use `$queryRaw`
---

## 4. API Design

### 4.1 Global API Conventions

- **Base URL:** `/` (configurable; no `/api/v1` prefix except for Open311 which uses `/open311/v2/`)
- **Format negotiation:** URL suffix > `?format=` > `Accept` header > default (JSON for Open311, HTML elsewhere)
- **Authentication:** Session cookie (`HttpOnly`, `Secure`, `SameSite=Lax`); Open311 POST uses `api_key` body param
- **Authorization:** CASL guard per route — `[anon]`, `[public]`, `[staff]`, `[api_key]`
- **Validation:** `class-validator` DTOs with `ValidationPipe` (global); HTTP 400 on failure
- **Pagination:** `page` (1-based) + `page_size` params; wrapped in `{total, page, pageSize, results}` envelope (non-Open311)
- **Error envelope:**
  ```json
  { "statusCode": 404, "error": "Not Found", "message": "Service request not found" }
  ```
- **Timestamps:** ISO 8601 UTC strings in all JSON/XML responses

---

### 4.2 TypeScript Interfaces

#### Core Domain Types

```typescript
// ---- Enums ----

type PermissionLevel = 'anonymous' | 'public' | 'staff';
type TicketStatus   = 'open' | 'closed';
type ActionType     = 'system' | 'department';
type SubstatusStatus = 'open' | 'closed';

// ---- People ----

interface Person {
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
}

interface PersonEmail {
  id: number;
  person_id: number;
  email: string;
  label: 'Home' | 'Work' | 'Other';
  usedForNotifications: boolean;
}

interface PersonPhone {
  id: number;
  person_id: number;
  number: string | null;
  label: 'Main' | 'Mobile' | 'Work' | 'Home' | 'Fax' | 'Pager' | 'Other';
}

interface PersonAddress {
  id: number;
  person_id: number;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  label: 'Home' | 'Business' | 'Rental';
}

// ---- Categories ----

interface Category {
  id: number;
  name: string;
  description: string | null;
  department_id: number;
  defaultPerson_id: number | null;
  categoryGroup_id: number | null;
  active: boolean | null;
  featured: boolean | null;
  displayPermissionLevel: PermissionLevel;
  postingPermissionLevel: PermissionLevel;
  customFields: string | null;      // JSON string
  lastModified: string;             // ISO 8601
  slaDays: number | null;
  notificationReplyEmail: string | null;
  autoCloseIsActive: boolean | null;
  autoCloseSubstatus_id: number | null;
}

interface CategoryGroup {
  id: number;
  name: string;
  ordering: number | null;
}

// ---- Departments ----

interface Department {
  id: number;
  name: string;
  defaultPerson_id: number | null;
}

// ---- Tickets ----

interface Ticket {
  id: number;
  parent_id: number | null;
  category_id: number | null;
  issueType_id: number | null;
  client_id: number | null;
  enteredByPerson_id: number | null;
  reportedByPerson_id: number | null;
  assignedPerson_id: number | null;
  contactMethod_id: number | null;
  responseMethod_id: number | null;
  enteredDate: string;              // ISO 8601
  lastModified: string;             // ISO 8601
  addressId: number | null;
  latitude: number | null;
  longitude: number | null;
  location: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: TicketStatus;
  closedDate: string | null;        // ISO 8601
  substatus_id: number | null;
  additionalFields: string | null;
  customFields: string | null;      // JSON string
  description: string | null;
}

interface TicketHistoryEntry {
  id: number;
  ticket_id: number;
  enteredByPerson_id: number | null;
  actionPerson_id: number | null;
  action_id: number;
  enteredDate: string;              // ISO 8601
  actionDate: string;               // ISO 8601
  notes: string | null;
  data: string | null;              // JSON string
  sentNotifications: string | null; // comma-separated emails
}

// ---- Media ----

interface MediaAttachment {
  id: number;
  ticket_id: number;
  filename: string;
  internalFilename: string;
  mime_type: string | null;
  uploaded: string;                 // ISO 8601
  person_id: number | null;
}

// ---- Reference Data ----

interface Substatus {
  id: number;
  name: string;
  description: string;
  status: SubstatusStatus;
  isDefault: boolean;
}

interface Action {
  id: number;
  name: string;
  description: string;
  type: ActionType;
  template: string | null;
  replyEmail: string | null;
}

interface IssueType {
  id: number;
  name: string;
}

interface ContactMethod {
  id: number;
  name: string;
}

interface Client {
  id: number;
  name: string;
  url: string | null;
  api_key: string;
  contactPerson_id: number;
  contactMethod_id: number | null;
}

interface Bookmark {
  id: number;
  person_id: number;
  type: string;
  name: string | null;
  requestUri: string;
}

// ---- Open311 GeoReport v2 ----

interface Open311Service {
  service_code: number;
  service_name: string;
  description: string;
  metadata: boolean;
  type: 'realtime';
  keywords: string;
  group: string;
}

interface Open311ServiceAttribute {
  variable: boolean;
  code: string;
  datatype: 'string' | 'number' | 'datetime' | 'singlevaluelist' | 'multivaluelist';
  required: boolean;
  datatype_description: string;
  order: number;
  description: string;
  values?: Array<{ key: string; name: string }>;
}

interface Open311ServiceDefinition extends Open311Service {
  attributes: Open311ServiceAttribute[];
}

interface Open311ServiceRequest {
  service_request_id: number;
  status: TicketStatus;
  status_notes: string;
  service_name: string;
  service_code: number;
  description: string;
  agency_responsible: string;
  service_notice: string;
  requested_datetime: string;       // ISO 8601
  updated_datetime: string;         // ISO 8601
  expected_datetime: string | null; // ISO 8601
  address: string;
  address_id: string;
  zipcode: string;
  lat: number | null;
  long: number | null;
  media_url: string | null;
}

interface Open311SubmitResponse {
  service_request_id: number;
  token: string;
  service_notice: string;
  account_id: string;
}

interface Open311TokenResponse {
  token: string;
  service_request_id: number;
}

// ---- Session ----

interface SessionData {
  userId?: number;
  role?: string | null;
  state?: string;      // ephemeral: OIDC state
  nonce?: string;      // ephemeral: OIDC nonce
  returnTo?: string;   // ephemeral: post-login redirect
}

// ---- Search ----

interface SearchResult {
  total: number;
  page: number;
  rows: number;
  results: SolrTicketDocument[];
  facets: {
    categories: Array<{ id: number; name: string; count: number }>;
    statuses:   Array<{ value: string; count: number }>;
    departments: Array<{ id: number; name: string; count: number }>;
  };
}

interface SolrTicketDocument {
  id: number;
  status: string;
  description: string | null;
  category_id: number;
  category_name: string;
  department_id: number;
  department_name: string;
  assignedPerson_id: number | null;
  enteredDate: string;
  lastModified: string;
  location: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  substatus_id: number | null;
  substatus_name: string | null;
  issueType_id: number | null;
  customFields: string | null;
}
```

---

### 4.3 REST Endpoint Catalog

#### §Open311 — GeoReport v2

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/open311/v2/services[.json\|.xml]` | `[anon]` | List visible service categories |
| GET | `/open311/v2/services/:id[.json\|.xml]` | `[anon]` | Service definition with attributes |
| POST | `/open311/v2/requests[.json\|.xml]` | `[api_key]` | Submit new service request |
| GET | `/open311/v2/requests[.json\|.xml]` | `[anon]` | Query service requests |
| GET | `/open311/v2/requests/:id[.json\|.xml]` | `[anon]` | Single service request |
| GET | `/open311/v2/tokens/:token[.json\|.xml]` | `[anon]` | Look up request ID by token |

#### §Auth — OIDC

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth/login` | `[anon]` | Initiate OIDC auth code flow (302 redirect) |
| GET | `/auth/callback` | `[anon]` | OIDC callback — exchange code, provision user |
| GET | `/auth/logout` | `[public]` | Destroy session, redirect |
| GET | `/account` | `[public]` | View own people record |
| PUT | `/account` | `[public]` | Update own people record |

#### §Tickets — Lifecycle

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tickets` | `[anon]` | List tickets (role-filtered) |
| POST | `/tickets` | `[public]` | Create ticket |
| GET | `/tickets/:id` | `[anon]` | View ticket detail |
| PUT | `/tickets/:id` | `[staff]` | Update ticket fields |
| POST | `/tickets/:id/assign` | `[staff]` | Assign ticket to person |
| POST | `/tickets/:id/close` | `[staff]` | Close ticket with substatus |
| POST | `/tickets/:id/duplicate` | `[staff]` | Mark as duplicate of parent |
| POST | `/tickets/:id/reopen` | `[staff]` | Re-open closed ticket |
| POST | `/tickets/:id/comment` | `[staff]` | Add staff comment |
| POST | `/tickets/:id/response` | `[staff]` | Add response action |
| GET | `/tickets/:id/history` | `[anon]` | View ticket history (role-filtered) |

#### §Media — Attachments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tickets/:id/media` | `[anon]` | List attachments |
| POST | `/tickets/:id/media` | `[public]` | Upload attachment (multipart/form-data) |
| GET | `/tickets/:id/media/:mediaId` | `[anon]` | Stream attachment |
| GET | `/tickets/:id/media/:mediaId/thumbnail` | `[anon]` | Stream thumbnail |
| DELETE | `/tickets/:id/media/:mediaId` | `[staff]` | Delete attachment |

#### §Search — Solr

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search` | `[anon]` | Full-text search with facets |

#### §Categories

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/categories` | `[anon]` | List categories (role-filtered) |
| POST | `/categories` | `[staff]` | Create category |
| GET | `/categories/:id` | `[anon]` | View category |
| PUT | `/categories/:id` | `[staff]` | Update category |
| DELETE | `/categories/:id` | `[staff]` | Delete category |
| GET | `/category-groups` | `[anon]` | List category groups |
| POST | `/category-groups` | `[staff]` | Create group |
| PUT | `/category-groups/:id` | `[staff]` | Update group |
| DELETE | `/category-groups/:id` | `[staff]` | Delete group |
| GET | `/categories/:id/actions/:actionId/response` | `[staff]` | Get action response template |
| POST | `/categories/:id/actions/:actionId/response` | `[staff]` | Upsert action response |
| DELETE | `/categories/:id/actions/:actionId/response` | `[staff]` | Delete action response |

#### §Departments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/departments` | `[anon]` | List departments |
| POST | `/departments` | `[staff]` | Create department |
| GET | `/departments/:id` | `[anon]` | View department |
| PUT | `/departments/:id` | `[staff]` | Update department |
| DELETE | `/departments/:id` | `[staff]` | Delete department |
| GET | `/departments/:id/categories` | `[staff]` | List department-category links |
| POST | `/departments/:id/categories` | `[staff]` | Add category link |
| DELETE | `/departments/:id/categories/:catId` | `[staff]` | Remove category link |
| GET | `/departments/:id/actions` | `[staff]` | List department-action links |
| POST | `/departments/:id/actions` | `[staff]` | Add action link |
| DELETE | `/departments/:id/actions/:actionId` | `[staff]` | Remove action link |

#### §People & Clients

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/people` | `[staff]` | List people |
| POST | `/people` | `[staff]` | Create person |
| GET | `/people/:id` | `[staff]` | View person |
| PUT | `/people/:id` | `[staff]` | Update person |
| DELETE | `/people/:id` | `[staff]` | Delete person |
| GET | `/people/search` | `[staff]` | Search by name/email |
| GET | `/users` | `[staff]` | List staff accounts |
| POST | `/people/:id/emails` | `[staff]` | Add email |
| PUT | `/people/:id/emails/:emailId` | `[staff]` | Update email |
| DELETE | `/people/:id/emails/:emailId` | `[staff]` | Delete email |
| POST | `/people/:id/phones` | `[staff]` | Add phone |
| PUT | `/people/:id/phones/:phoneId` | `[staff]` | Update phone |
| DELETE | `/people/:id/phones/:phoneId` | `[staff]` | Delete phone |
| POST | `/people/:id/addresses` | `[staff]` | Add address |
| PUT | `/people/:id/addresses/:addrId` | `[staff]` | Update address |
| DELETE | `/people/:id/addresses/:addrId` | `[staff]` | Delete address |
| GET | `/clients` | `[staff]` | List API clients |
| POST | `/clients` | `[staff]` | Create client |
| GET | `/clients/:id` | `[staff]` | View client |
| PUT | `/clients/:id` | `[staff]` | Update client |
| DELETE | `/clients/:id` | `[staff]` | Delete client |

#### §Bookmarks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/bookmarks` | `[public]` | List own bookmarks |
| POST | `/bookmarks` | `[public]` | Create bookmark |
| DELETE | `/bookmarks/:id` | `[public]` | Delete own bookmark |

#### §Locations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/locations` | `[anon]` | Cluster data for map rendering |

#### §Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/metrics` | `[staff]` | Dashboard aggregate metrics |
| GET | `/reports` | `[staff]` | Exportable report (all 5 formats) |

#### §Reference Data

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/substatus` | `[staff]` | List sub-statuses |
| POST | `/substatus` | `[staff]` | Create sub-status |
| PUT | `/substatus/:id` | `[staff]` | Update sub-status |
| DELETE | `/substatus/:id` | `[staff]` | Delete sub-status |
| GET | `/actions` | `[staff]` | List actions |
| POST | `/actions` | `[staff]` | Create department action |
| PUT | `/actions/:id` | `[staff]` | Update action |
| DELETE | `/actions/:id` | `[staff]` | Delete department action |
| GET | `/issue-types` | `[staff]` | List issue types |
| POST | `/issue-types` | `[staff]` | Create issue type |
| PUT | `/issue-types/:id` | `[staff]` | Update issue type |
| DELETE | `/issue-types/:id` | `[staff]` | Delete issue type |
| GET | `/contact-methods` | `[anon]` | List contact methods |
| POST | `/contact-methods` | `[staff]` | Create contact method |
| PUT | `/contact-methods/:id` | `[staff]` | Update contact method |
| DELETE | `/contact-methods/:id` | `[staff]` | Delete contact method |
---

## 5. Security Architecture

### 5.1 Authentication

uReport uses **OpenID Connect Authorization Code Flow** via `openid-client` for all citizen and staff authentication. There is no username/password authentication; all logins go through the city OIDC IdP.

```
Browser                    NestJS                         OIDC IdP
   │                          │                               │
   │  GET /auth/login          │                               │
   │─────────────────────────►│                               │
   │                          │  generate state + nonce       │
   │                          │  store in session             │
   │                          │  build authorization URL      │
   │  302 → IdP /authorize    │                               │
   │◄─────────────────────────│                               │
   │                          │                               │
   │────────────────────────────────────────────────────────►│
   │  (user authenticates at IdP)                            │
   │◄────────────────────────────────────────────────────────│
   │  302 → /auth/callback?code=...&state=...                │
   │                          │                               │
   │  GET /auth/callback      │                               │
   │─────────────────────────►│                               │
   │                          │  validate state matches session
   │                          │  POST /token (code exchange) ►│
   │                          │◄─────────────────────────────│
   │                          │  validate id_token nonce      │
   │                          │  extract claims (sub/email/name)
   │                          │  upsert people record         │
   │                          │  store userId+role in session │
   │  302 → / (or returnTo)   │                               │
   │◄─────────────────────────│                               │
```

**Open311 API authentication:** `api_key` parameter validated against `clients.api_key`. No OIDC session required. Only applies to `POST /open311/v2/requests`.

---

### 5.2 Session Management

| Property | Value |
|----------|-------|
| Store | Redis (`connect-redis` + `ioredis`) |
| Cookie name | `connect.sid` (default NestJS/express-session) |
| Cookie flags | `HttpOnly: true`, `Secure: true`, `SameSite: lax` |
| Signing | Signed with `SESSION_SECRET` (HMAC) |
| TTL | `SESSION_TTL_SECONDS` env var (default: 3600 s) |
| Multi-replica | Fully supported via Redis shared store |

Session structure:
```typescript
{
  userId: number;       // people.id — set after OIDC callback
  role: string | null;  // people.role — 'staff' or null
  state?: string;       // OIDC state (cleared after callback)
  nonce?: string;       // OIDC nonce (cleared after callback)
  returnTo?: string;    // post-login redirect (cleared after use)
}
```

---

### 5.3 Authorization Model (RBAC)

Role hierarchy: `anonymous < public < staff`

#### CASL Ability Rules

```typescript
// anonymous
can('read', 'Category', { displayPermissionLevel: { $in: ['anonymous'] } })
can('read', 'Ticket',   { category: { displayPermissionLevel: { $in: ['anonymous'] } } })
can('create', 'Ticket', { category: { postingPermissionLevel: 'anonymous' } })
can('read', 'Token')

// public (extends anonymous)
can('read', 'Category', { displayPermissionLevel: { $in: ['anonymous', 'public'] } })
can('read', 'Ticket',   { category: { displayPermissionLevel: { $in: ['anonymous', 'public'] } } })
can('create', 'Ticket', { category: { postingPermissionLevel: { $in: ['anonymous', 'public'] } } })
can('manage', 'Bookmark', { person_id: currentUser.id })
can('read',   'Person',   { id: currentUser.id })
can('update', 'Person',   { id: currentUser.id })

// staff
can('manage', 'all')
```

#### Route-Level Permission Matrix

| Resource | Anonymous | Public | Staff |
|----------|-----------|--------|-------|
| Open311 GET services/requests | ✓ (filtered) | ✓ (filtered) | ✓ |
| Open311 POST requests | ✓ (api_key) | ✓ (api_key) | ✓ (api_key) |
| GET /tickets | ✓ (filtered) | ✓ (filtered) | ✓ |
| POST /tickets | ✗ | ✓ | ✓ |
| PUT/POST /tickets/:id/* | ✗ | ✗ | ✓ |
| GET /categories | ✓ (filtered) | ✓ (filtered) | ✓ |
| POST/PUT/DELETE /categories | ✗ | ✗ | ✓ |
| GET /departments | ✓ | ✓ | ✓ |
| POST/PUT/DELETE /departments | ✗ | ✗ | ✓ |
| GET/POST /tickets/:id/media | ✓/✗ | ✓/✓ | ✓ |
| GET /search | ✓ (filtered) | ✓ (filtered) | ✓ |
| GET/POST/DELETE /bookmarks | ✗ | ✓ (own) | ✓ (own) |
| /people, /clients | ✗ | ✗ | ✓ |
| /metrics, /reports | ✗ | ✗ | ✓ |
| /substatus, /actions, /issue-types | ✗ | ✗ | ✓ |
| GET /contact-methods | ✓ | ✓ | ✓ |

---

### 5.4 PII Field Masking

For non-staff callers, the `SerializationInterceptor` (or service-layer DTOs) must omit these fields:

| Field | Anonymous | Public |
|-------|-----------|--------|
| `tickets.reportedByPerson_id` | masked | masked (except own tickets) |
| `tickets.enteredByPerson_id` | masked | masked |
| `tickets.assignedPerson_id` | masked | masked |
| `ticketHistory.enteredByPerson_id` | masked | masked |
| `ticketHistory.actionPerson_id` | masked | masked |
| `people.*` contact details | ✗ | own record only |

Masking is implemented as transform DTOs on the service layer output — controllers return full objects; the serializer applies role-specific field omissions.

---

### 5.5 Input Validation

- All request bodies validated via `class-validator` DTOs applied through NestJS `ValidationPipe` (global)
- `whitelist: true` — strip unknown properties
- `forbidNonWhitelisted: false` — do not error on extra fields (Open311 compatibility: `jurisdiction_id`, `device_id` must be accepted and ignored)
- Coordinate ranges enforced: latitude `[-90, 90]`, longitude `[-180, 180]`
- Email format: RFC 5322 via `@IsEmail()` decorator
- JSON fields (`customFields`): validated as parseable JSON string before persistence
- SQL injection: not possible via Prisma parameterized queries; raw `$queryRaw` uses tagged template literals (Prisma auto-escapes)

---

### 5.6 Data Protection

| Concern | Mitigation |
|---------|-----------|
| Secrets in environment | All credentials (`DATABASE_URL`, `SESSION_SECRET`, `OIDC_CLIENT_SECRET`, `SMTP_PASS`) in Kubernetes Secrets, not ConfigMaps |
| api_key exposure | Never returned in list responses after creation; show only on create |
| TLS | Terminated at Ingress; internal cluster traffic may be plain HTTP |
| Session fixation | Session is regenerated after OIDC callback (new session ID issued) |
| CSRF | `SameSite=Lax` on session cookie; OIDC `state` param guards auth flow |
| Open redirect | `returnTo` URL validated against allowlist of same-origin paths only |
| File upload | MIME type validated; `internalFilename` is UUID (never derived from user input); storage path is outside web root |
| GELF log sanitization | PII (email, names) not logged in GELF `short_message`; only IDs logged |

---

### 5.7 CASL Guard Implementation Sketch

```typescript
// src/common/guards/casl.guard.ts
@Injectable()
export class CaslGuard implements CanActivate {
  constructor(
    private readonly abilityFactory: AbilityFactory,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredAbility[]>(
      CHECK_ABILITIES,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;  // no ability check on this route

    const { user } = context.switchToHttp().getRequest();
    const ability = this.abilityFactory.createForUser(user ?? null);

    for (const rule of required) {
      if (!ability.can(rule.action, rule.subject)) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }
    return true;
  }
}

// Usage on controller:
@Get(':id')
@UseGuards(CaslGuard)
@CheckAbilities({ action: 'read', subject: 'Ticket' })
async getTicket(@Param('id') id: number) { ... }
```
---

## 6. Technology Stack

### 6.1 Core Runtime & Framework

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Runtime | Node.js LTS | 20.x (LTS) | JavaScript runtime |
| Language | TypeScript | 5.x (strict) | Type-safe application code |
| Framework | NestJS | 10.x | Modular HTTP framework (DI, guards, interceptors, pipes) |
| HTTP adapter | Express.js | 4.x | Underlying HTTP server (NestJS default adapter) |
| Config | `@nestjs/config` | — | Environment variable management |
| Validation | `class-validator` + `class-transformer` | — | DTO validation via `ValidationPipe` |
| Scheduling | `@nestjs/schedule` | — | Digest notification cron jobs |

### 6.2 Database & ORM

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Database | PostgreSQL | ≥ 14 | Primary relational data store |
| Spatial extension | PostGIS | ≥ 3.0 | `geometry(Point, 4326)` for geo-clusters |
| ORM | Prisma | 5.x | Type-safe queries, migrations, schema management |
| Raw spatial SQL | `prisma.$queryRaw` | — | PostGIS KNN (`<->`) and `ST_DWithin` queries |

**Prisma setup:**
```
prisma/
├── schema.prisma   ← models mirroring all 21 tables
└── migrations/     ← prisma migrate history
```

`DATABASE_URL` env var format: `postgresql://user:pass@host:5432/ureport`

### 6.3 Session & Cache

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Session middleware | `express-session` | 1.x | Cookie-based server-side sessions |
| Session store | `connect-redis` | 7.x | Redis-backed session persistence |
| Redis client | `ioredis` | 5.x | Redis connection for session store |

### 6.4 Authentication & Authorization

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| OIDC client | `openid-client` | 5.x | Authorization code flow, token exchange, discovery |
| RBAC | `@casl/ability` | 6.x | Attribute-based access control rules |
| NestJS CASL | `@casl/nestjs` (or custom) | — | `CaslGuard` integration |

### 6.5 Search

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Search engine | Apache Solr | (existing) | Full-text indexing with eDisMax |
| Node client | `solr-client` npm | latest | Query construction and indexing |

**Solr core:** `uReport` (pre-existing; field schema preserved from legacy Solarium integration)

### 6.6 Email Notifications

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Email | `nodemailer` | 6.x | SMTP transport for ticket event emails |
| Templates | Handlebars (inline string substitution) | — | `{variable}` placeholder syntax for email bodies |

### 6.7 Media & File Handling

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Upload | `multer` (via `@nestjs/platform-express`) | — | `multipart/form-data` file upload |
| Thumbnail | `sharp` | — | Image thumbnail generation for image/* MIME types |
| Storage | Local filesystem | — | `{MEDIA_STORAGE_PATH}/{ticket_id}/{internalFilename}` |

### 6.8 Logging & Observability

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| GELF logging | `gelf-pro` | latest | GELF 1.1 UDP/TCP transport to Graylog |
| NestJS logger | Custom `GelfLoggerService` | — | Implements `LoggerService`; wraps `gelf-pro` |
| Request logging | NestJS `LoggingInterceptor` | — | HTTP method/path/status/duration per request |

### 6.9 Content Negotiation & Serialization

| Layer | Technology | Purpose |
|-------|------------|---------|
| HTML templates | Handlebars (`hbs` or `@nestjs/platform-express`) | Server-side HTML rendering |
| XML serialization | `xml-js` or custom builder | Byte-compatible XML output |
| CSV serialization | `csv-stringify` | Legacy-compatible CSV with UTF-8 BOM |
| TXT serialization | Custom string builder | Tab-delimited plaintext feed |
| Format middleware | Custom NestJS middleware | Resolves suffix / Accept → `req.negotiatedFormat` |

### 6.10 Developer Tooling

| Tool | Purpose |
|------|---------|
| `jest` + `@nestjs/testing` | Unit and integration tests (≥80% coverage target) |
| `supertest` | HTTP integration tests for Open311 API |
| `eslint` + `@typescript-eslint` | Linting (`strict` rules) |
| `prettier` | Code formatting |
| `ts-jest` | TypeScript Jest transformer |
| `prisma migrate` | Database schema migration |
| Docker + `docker-compose.yml` | Local development environment (PG + Redis + Solr) |

### 6.11 package.json Key Dependencies

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/schedule": "^4.0.0",
    "@prisma/client": "^5.0.0",
    "@casl/ability": "^6.0.0",
    "openid-client": "^5.0.0",
    "express-session": "^1.17.0",
    "connect-redis": "^7.0.0",
    "ioredis": "^5.0.0",
    "nodemailer": "^6.0.0",
    "solr-client": "latest",
    "gelf-pro": "latest",
    "multer": "^1.4.0",
    "sharp": "^0.33.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0",
    "hbs": "^4.2.0",
    "csv-stringify": "^6.0.0"
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "@nestjs/testing": "^10.0.0",
    "supertest": "^6.0.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "prettier": "^3.0.0"
  }
}
```
---

## 7. Integration Points

### 7.1 Apache Solr

**Role:** Full-text ticket search (F05)  
**Client:** `solr-client` npm package  
**NestJS module:** `SearchModule` → `SolrService`

**Configuration:**

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `SOLR_HOST` | `localhost` | Solr server hostname |
| `SOLR_PORT` | `8983` | Solr server port |
| `SOLR_CORE` | `uReport` | Solr core name |
| `SOLR_PATH` | `/solr` | Solr base path |

**Index schema (field names must match legacy Solarium exactly):**

| Solr Field | Source | Type | Stored | Indexed |
|-----------|--------|------|--------|---------|
| `id` | `tickets.id` | integer | yes | yes |
| `status` | `tickets.status` | string | yes | yes |
| `description` | `tickets.description` | text_general | yes | yes |
| `category_id` | `tickets.category_id` | integer | yes | yes |
| `category_name` | `categories.name` | string | yes | yes |
| `department_id` | `categories.department_id` | integer | yes | yes |
| `department_name` | `departments.name` | string | yes | yes |
| `assignedPerson_id` | `tickets.assignedPerson_id` | integer | yes | yes |
| `enteredDate` | `tickets.enteredDate` | tdate | yes | yes |
| `lastModified` | `tickets.lastModified` | tdate | yes | yes |
| `location` | `tickets.location` | string | yes | yes |
| `city` | `tickets.city` | string | yes | yes |
| `latitude` | `tickets.latitude` | double | yes | yes |
| `longitude` | `tickets.longitude` | double | yes | yes |
| `substatus_id` | `tickets.substatus_id` | integer | yes | yes |
| `substatus_name` | `substatus.name` | string | yes | yes |
| `issueType_id` | `tickets.issueType_id` | integer | yes | yes |
| `customFields` | `tickets.customFields` | text_general | yes | yes |

**eDisMax query construction:**
```
qf=description^2 location^1.5 city^1 customFields^1
mm=75%
pf=description^4
```

**Failure handling:**
- Ticket write: fire-and-forget; indexing failure logged via GELF `warn`; write operation not rolled back
- Search request: Solr unreachable → HTTP 503 `SEARCH_UNAVAILABLE`

---

### 7.2 OIDC Identity Provider

**Role:** User authentication (F04)  
**Client:** `openid-client` npm package  
**NestJS module:** `AuthModule` → `AuthService`

**Configuration:**

| Env Variable | Required | Description |
|-------------|---------|-------------|
| `OIDC_ISSUER` | Yes | OIDC discovery base URL |
| `OIDC_CLIENT_ID` | Yes | Registered client ID |
| `OIDC_CLIENT_SECRET` | Yes | Client secret |
| `OIDC_REDIRECT_URI` | Yes | Callback URL (must match IdP) |
| `OIDC_END_SESSION_ENDPOINT` | No | IdP end-session URL for logout |

**Contract:**
- Authorization code flow with `openid email profile` scopes
- `id_token` claims required: `sub`, `email`, `given_name`, `family_name`
- `sub` claim → `people.username` (stable identifier)
- On first login: create `people` record; upsert `peopleEmails` from `email` claim
- On subsequent login: update `firstname`/`lastname` if changed

**Failure handling:**
- IdP unreachable during login initiation → HTTP 502 user-facing error page
- IdP error in callback → GELF log + HTTP 502 `IDP_ERROR`

---

### 7.3 SMTP Email Server

**Role:** Ticket event notifications (F07)  
**Client:** `nodemailer` npm package  
**NestJS module:** `NotificationsModule` → `MailerService`

**Configuration:**

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `SMTP_HOST` | — | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password |
| `SMTP_SECURE` | `false` | `true` for port 465 TLS |
| `SMTP_FROM` | `noreply@city.gov` | From address |

**Trigger matrix:**

| Ticket Action | action.name | Recipients |
|--------------|-------------|-----------|
| Ticket opened | `open` | `reportedByPerson` (if email set) |
| Ticket assigned | `assignment` | Assigned person + reporter |
| Ticket closed | `closed` | Reporter + assigned person |
| Response added | `response` | Reporter |
| Comment added | `comment` | Assigned person |
| Marked duplicate | `duplicate` | Reporter of child ticket |

**Template resolution (priority order):**
1. `category_action_responses.template` (category + action override)
2. `actions.template` (default)
3. No template → no email sent

**Reply-to resolution (priority order):**
1. `categories.notificationReplyEmail`
2. `category_action_responses.replyEmail`
3. `actions.replyEmail`
4. No Reply-To header

**Failure handling:** SMTP failure logged via GELF `error`; ticket action is NOT rolled back; manual resend available via response action.

---

### 7.4 Graylog / GELF

**Role:** Structured application logging (F14)  
**Client:** `gelf-pro` npm package  
**NestJS service:** `GelfLoggerService` (implements `LoggerService`)

**Configuration:**

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `GRAYLOG_HOST` | `localhost` | Graylog server hostname |
| `GRAYLOG_PORT` | `12201` | GELF input port |
| `GRAYLOG_TRANSPORT` | `udp` | `udp` or `tcp` |
| `GRAYLOG_FACILITY` | `uReport` | Facility label in GELF messages |

**Log level mapping:**

| NestJS level | GELF syslog level | Value |
|-------------|-------------------|-------|
| `error` | ALERT / ERROR | 3 |
| `warn` | WARNING | 4 |
| `log` | NOTICE / INFO | 5 |
| `debug` | DEBUG | 7 |
| `verbose` | DEBUG | 7 |

**Structured fields per message:**

| Field | Description |
|-------|-------------|
| `short_message` | One-line summary |
| `full_message` | Full stack trace (errors only) |
| `facility` | `GRAYLOG_FACILITY` env value |
| `_request_id` | UUID per HTTP request |
| `_user_id` | `people.id` of authenticated user (if any) |
| `_ticket_id` | Ticket ID for ticket-scoped operations |

**Failure handling:** If Graylog is unreachable, fall back to `console.error` (stderr). Application never fails due to logging unavailability.

---

### 7.5 PostgreSQL + PostGIS

**Role:** Primary data store (all features)  
**Client:** Prisma ORM; `$queryRaw` for spatial  
**Configuration:** `DATABASE_URL` env var  

**Requirements:**
- PostgreSQL ≥ 14
- PostGIS extension ≥ 3.0 (for `geometry(Point, 4326)` and `<->` KNN operator)
- All FK, CHECK, and UNIQUE constraints enforced at database level
- Prisma migrations run before application startup (`prisma migrate deploy`)

**Spatial query pattern (geo-cluster assignment):**
```sql
-- Find nearest cluster at each zoom level for a ticket lat/lon
SELECT id
FROM "geoclusters"
WHERE level = $1
ORDER BY center <-> ST_SetSRID(ST_MakePoint($2, $3), 4326)
LIMIT 1;
```

---

### 7.6 Redis (Session Store)

**Role:** Server-side session persistence (F04)  
**Client:** `connect-redis` + `ioredis`  

**Configuration:**

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `SESSION_SECRET` | — | Cookie signing secret (required) |
| `SESSION_TTL_SECONDS` | `3600` | Session expiry |

**Note:** Redis is required in production for multi-replica support. In-memory store only acceptable for local development.

---

### 7.7 Local Filesystem (Media Storage)

**Role:** File attachment storage (F08)  

**Configuration:**

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `MEDIA_STORAGE_PATH` | `/var/uReport/media` | Absolute path for file storage |
| `MEDIA_MAX_BYTES` | `10485760` | Maximum upload file size (10 MB) |

**Storage layout:**
```
{MEDIA_STORAGE_PATH}/
└── {ticket_id}/
    ├── {internalFilename}             ← original uploaded file
    └── thumbnails/
        └── {internalFilename}         ← thumbnail (images only)
```

**Contract requirements:**
- `internalFilename` is always a UUID — never derived from user-supplied filename
- Storage path must be writable by the Node.js process
- In Kubernetes: path must be a mounted `PersistentVolumeClaim`
- Files are served by streaming `fs.createReadStream()` through NestJS response, not served by a static file server

---

### 7.8 Integration Failure Summary

| Integration | Write failure behavior | Read failure behavior |
|-------------|----------------------|---------------------|
| PostgreSQL | Throw — transaction rolled back | Throw — HTTP 500 |
| Apache Solr | GELF warn + continue (fire-and-forget) | HTTP 503 `SEARCH_UNAVAILABLE` |
| OIDC IdP | HTTP 502 error page | N/A (login only) |
| SMTP | GELF error + continue (ticket action succeeds) | N/A (send only) |
| Graylog | Fallback to console.error | N/A (log only) |
| Redis | Fatal on startup (session required in production) | HTTP 500 (session unavailable) |
| Filesystem | Throw + HTTP 500 | HTTP 500 (stream error) |
