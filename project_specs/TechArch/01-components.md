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
