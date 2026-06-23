# PRD — uReport Re-Platform
**Project:** uReport  
**Acronym:** uReport  
**Version:** 1.0  
**Date:** 2026-06-23  
**Status:** Active  

---

## 1. Executive Summary

uReport is a municipal constituent-request CRM built on the Open311 GeoReport v2 standard, enabling citizens and city staff to create, track, and resolve service tickets across departments. This project re-platforms the existing PHP/MySQL implementation to a modern Node.js/TypeScript/NestJS/PostgreSQL stack while preserving complete feature parity, byte-compatible public API responses, and identical content-negotiation behavior — ensuring zero disruption to external API consumers.

---

## 2. Problem Statement

The existing uReport application is built on a bespoke PHP MVC framework with MySQL/MariaDB. While functionally complete, the stack presents escalating maintenance, reliability, and developer-experience challenges:

- **Framework obsolescence:** The custom PHP framework (Controller, View, Template, Block, ActiveRecord, PdoRepository) is non-standard, undocumented, and increasingly difficult to onboard new engineers to.
- **PHP/MySQL operational cost:** Maintaining two separate runtimes and a MySQL cluster alongside modern containerized infrastructure adds operational overhead.
- **Type safety gaps:** PHP without strict typing allows entire categories of runtime errors that TypeScript strict mode eliminates at compile time.
- **ORM limitations:** The bespoke ActiveRecord + PdoRepository pattern lacks migration tooling, schema introspection, and modern query-builder ergonomics.
- **Content negotiation complexity:** ~187 PHP `.inc` partial templates implement HTML/JSON/XML/CSV/TXT output per-endpoint, with no unified serialization layer — divergence between formats is common.
- **Testing surface:** The absence of dependency injection and the reliance on superglobals (`$_SESSION`, `$_GET`, `header()`, `exit()`) make unit testing impractical.
- **PostgreSQL ecosystem:** The city's infrastructure roadmap standardizes on PostgreSQL; MySQL is a non-preferred dependency.

The re-platform must resolve all of these pain points without changing any externally visible behavior.

---

## 3. Product Vision

> **uReport on a modern stack:** The same trusted municipal CRM — same API, same formats, same rules — running on a maintainable, type-safe, testable Node.js foundation that the city can operate and extend for the next decade.

**Strategic Goals:**

- Achieve 100% feature and behavior parity with the PHP application before any new features are considered.
- Deliver a byte-compatible Open311 GeoReport v2 REST API so external integrators require zero changes.
- Replace all bespoke PHP infrastructure with well-supported, community-standard Node.js equivalents.
- Migrate the MySQL database to PostgreSQL with full schema translation, data fidelity verification, and PostGIS spatial support.
- Establish a modular NestJS architecture that maps 1:1 to the existing controller/service/repository domain model, making the codebase approachable for future contributors.
- Eliminate global state (`$_SESSION`, `header()`, `exit()`) in favor of NestJS request-scoped DI and HTTP adapters.

---

## 4. Technical Architecture

| Layer | Legacy (PHP) | Target (Node.js) |
|---|---|---|
| Runtime | PHP 8.x | Node.js LTS + TypeScript (strict) |
| Framework | Custom MVC (Controller/View/Template) | NestJS (modular, decorator-based) |
| ORM | ActiveRecord + PdoRepository | Prisma |
| Database | MySQL / MariaDB | PostgreSQL + PostGIS |
| Spatial | MySQL `POINT` SRID 0 | PostGIS `geometry(Point, 4326)` |
| Search | Apache Solr via Solarium (PHP) | Apache Solr via Node Solr client |
| Auth | facile-it OIDC client | openid-client (OIDC) |
| Access Control | Laminas ACL | CASL guards (NestJS) |
| Email | PHPMailer | Nodemailer |
| Logging | Graylog/GELF via PHP client | GELF Node client |
| Content Negotiation | ~187 `.inc` partial templates | NestJS serialization interceptor |
| Deployment | Apache + mod_php | Node.js process (Docker/k8s) |

---

## 5. Feature Requirements

---

### F0: Open311 GeoReport v2 REST API
**Description:** The Open311 GeoReport v2 API is the primary public interface of uReport. All routes, request parameters, HTTP status codes, and response bodies must be byte-compatible with the existing PHP implementation. External API consumers (mobile apps, city portals, third-party integrators) must require zero changes after the re-platform.

**Capabilities:**
- `GET /open311/v2/services` — list all service categories with metadata
- `GET /open311/v2/services/:id` — single service definition including custom attributes
- `POST /open311/v2/requests` — submit a new service request (ticket) with `api_key` authentication
- `GET /open311/v2/requests` — query service requests with filter params (`status`, `service_code`, `start_date`, `end_date`, `lat/long/radius`, `page`, `page_size`)
- `GET /open311/v2/requests/:id` — retrieve a single request by ID
- `GET /open311/v2/tokens/:token` — look up request ID by submission token
- Response format negotiated via `Accept` header or `.json` / `.xml` suffix on the URL path
- All response envelopes, field names, date formats, and status codes match GeoReport v2 specification exactly
- `api_key` validation against `clients` table with `contactPerson_id` resolution

**Priority:** P0 (Critical — MVP / public contract)

---

### F1: Ticket Lifecycle Management
**Description:** Tickets are the core entity of uReport. The full lifecycle — creation, assignment, status updates, closure, duplication, and category changes — must be preserved with identical business rules, audit trail entries, and notification triggers.

**Capabilities:**
- Create ticket: capture `category_id`, `issueType_id`, location fields (lat/lon, address, city, state, zip), `description`, `customFields`, `contactMethod_id`, `reportedByPerson_id`
- Assign ticket: assign to a `person_id` within the ticket's department; log `assignment` action to `ticketHistory`
- Update ticket: change category (logs `changeCategory`), change location (logs `changeLocation`), update description or custom fields (logs `update`)
- Close ticket: set `status = 'closed'`, set `closedDate`, set `substatus_id` (Resolved / Duplicate / Bogus)
- Duplicate ticket: link via `parent_id`, log `duplicate` action on parent
- Comment: staff-only free-text note logged to `ticketHistory` with `comment` action
- Response: contact-the-reporter action logged as `response`
- Sub-status management: `Resolved`, `Duplicate`, `Bogus` sub-statuses with configurable descriptions
- Ticket `lastModified` timestamp updated on every state change
- SLA day tracking per category: `slaDays` field on `categories`; elapsed-days display on ticket detail

**Priority:** P0 (Critical — core CRM functionality)

---

### F2: Role-Based Access Control (RBAC)
**Description:** uReport enforces three permission levels — `anonymous`, `public`, and `staff` — on every route, category display, and data field. The CASL-based NestJS guard layer must reproduce the Laminas ACL rule set exactly, with no privilege creep or regression.

**Capabilities:**
- **Anonymous:** can view tickets and categories whose `displayPermissionLevel = 'anonymous'`; can submit tickets to categories whose `postingPermissionLevel = 'anonymous'`; cannot see reporter PII
- **Public (authenticated citizen):** can view tickets/categories at `public` or `anonymous` level; can submit to `public` or `anonymous` categories; can see own ticket history; can manage own bookmarks
- **Staff (authenticated city employee):** full read/write on all tickets, categories, departments, and people; can assign, close, duplicate, and comment; can manage categories, actions, departments, persons
- Category-level display and posting permission levels enforce which tickets are visible in lists and the Open311 API
- Person roles stored in `people.role`; department membership via `people.department_id`
- CASL `ability` rules defined per role; NestJS `@UseGuards(CaslGuard)` applied at controller/route level
- All permission checks must match the original Laminas ACL behavior, verified by integration tests

**Priority:** P0 (Critical — security requirement)

---

### F3: Content Negotiation & Multi-Format Serialization
**Description:** Every endpoint in uReport supports multiple response formats. The legacy system used ~187 PHP `.inc` partial templates to render HTML, JSON, XML, CSV, and TXT. The new system replaces this with a NestJS interceptor layer that serializes controller return values into the requested format, with no duplication of controller logic.

**Capabilities:**
- Format selection via `Accept` request header, URL suffix (`.json`, `.xml`, `.csv`, `.txt`), or `format` query parameter
- Supported formats on all endpoints: `text/html`, `application/json`, `application/xml`, `text/csv`, `text/plain`
- HTML responses rendered via server-side template engine (e.g., Handlebars or Nunjucks), preserving existing UI structure
- JSON responses match exact field names, nesting, and null-vs-absent semantics of the legacy API
- XML responses match tag names, attribute usage, and CDATA wrapping of the legacy API
- CSV responses match column order, quoting, and row structure of the legacy exports
- TXT responses match plaintext formatting of the legacy feeds
- A single `SerializationInterceptor` inspects the negotiated format and delegates to format-specific serializers
- Format negotiation logic is centralized and applied globally via NestJS app-level interceptor registration

**Priority:** P0 (Critical — public API contract)

---

### F4: OIDC Authentication
**Description:** uReport uses OpenID Connect for citizen and staff login. The new implementation uses `openid-client` to replace `facile-it/oidc-client`, preserving the exact login flow, session behavior, callback handling, and user-provisioning logic.

**Capabilities:**
- OIDC authorization code flow: redirect to IdP, handle callback, exchange code for tokens
- `CallbackController` equivalent: receive `code`, validate state/nonce, exchange tokens, resolve or create `people` record
- User provisioning: on first login, create or update `people` record from OIDC claims (sub, email, given_name, family_name)
- Session management: store authenticated user in NestJS session (compatible with existing session cookie behavior)
- Logout: clear session, optionally redirect to IdP end-session endpoint
- `LoginController` equivalent: initiate authorization request, store state/nonce
- Configuration via environment variables: `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI`
- `AccountController` equivalent: display/edit own profile

**Priority:** P0 (Critical — authentication)

---

### F5: Full-Text Search via Apache Solr
**Description:** uReport uses Apache Solr for full-text ticket search, with field-specific indexing, faceting, and result ranking. The existing Solarium (PHP) integration is replaced by a Node Solr client while preserving all query behavior, field mappings, and index schema.

**Capabilities:**
- `SolrController` equivalent: search endpoint accepting query string, filters, pagination
- Query construction: field boosts, phrase matching, wildcard support matching current Solr query patterns
- Facets: category, status, department, assignee, date range — same facet fields as legacy
- Result ranking: preserve existing relevance scoring and sort options (date, relevance, status)
- Solr index schema preserved: same field names, types, and stored/indexed flags
- Re-index script: index all existing tickets into Solr on migration
- Incremental indexing: index ticket on create/update/close
- `SolrController` search page renders results in all five formats (HTML/JSON/XML/CSV/TXT) via the serialization interceptor
- Bookmark integration: saved searches reference Solr query URLs

**Priority:** P1 (High — primary search mechanism)

---

### F6: MySQL-to-PostgreSQL Schema Migration
**Description:** The existing MySQL schema (285 lines, 21 tables) must be fully translated to PostgreSQL-idiomatic DDL, with all data migrated, verified, and semantically equivalent. MySQL-specific constructs must be replaced with their PostgreSQL equivalents.

**Capabilities:**
- Translate MySQL DDL to PostgreSQL DDL:
  - `AUTO_INCREMENT` → `SERIAL` or `GENERATED ALWAYS AS IDENTITY`
  - Backtick identifiers → double-quoted or unquoted
  - `TINYINT(1)` → `BOOLEAN`
  - `ENUM` types → PostgreSQL `ENUM` or `CHECK` constraints
  - `FLOAT(17, 14)` → `DOUBLE PRECISION`
  - `POINT` + `SRID 0` → PostGIS `geometry(Point)` or `geometry(Point, 4326)`
  - `TIMESTAMP` default behavior parity
- Prisma schema (`schema.prisma`) generated from the PostgreSQL DDL
- Data migration script: reads from MySQL source, writes to PostgreSQL target
- Row-count verification: assert each table's row count matches after migration
- Referential integrity: all foreign keys preserved in PostgreSQL schema
- Spatial data: lat/lon floats and geo-cluster `POINT` columns migrated to PostGIS geometry
- Seed data preserved: `contactMethods`, `substatus`, `actions`, `issueTypes`, `categoryGroups` default rows

**Priority:** P0 (Critical — data foundation)

---

### F7: Email Notifications
**Description:** uReport sends automated email notifications on ticket lifecycle events. PHPMailer is replaced by Nodemailer while preserving all email templates, trigger conditions, and reply-email routing.

**Capabilities:**
- Trigger notifications on: ticket open, assignment, close, response, comment, duplicate
- Notification recipients determined by `people.usedForNotifications` email flag and action configuration
- `category_action_responses` table: per-category email template overrides per action
- `actions.template` and `actions.replyEmail`: default templates and reply addresses
- `categories.notificationReplyEmail`: category-level reply-to override
- Nodemailer transport configuration via environment variables (SMTP host, port, credentials)
- Email body templating: preserve existing template variable syntax (`{actionPerson}`, `{reportedByPerson_id}`, `{original:category_id}`, etc.)
- Digest notifications: `digestNotifications.php` cron equivalent — batch email for subscribed users
- All email sends logged to `ticketHistory.sentNotifications`

**Priority:** P1 (High — staff and citizen communication)

---

### F8: Media & Attachment Management
**Description:** Staff and citizens can upload file attachments to tickets. The media management system must preserve upload handling, storage paths, MIME type validation, and the audit trail entry on upload.

**Capabilities:**
- File upload endpoint: `POST /tickets/:id/media` (multipart/form-data)
- `MediaController` equivalent: upload, view, and delete attachments
- Store: `filename` (original), `internalFilename` (UUID-based storage name), `mime_type`, `uploaded` timestamp, `person_id`
- Image handling: generate thumbnails for image MIME types (`Image.php` equivalent)
- Serve media files: stream attachment bytes with correct `Content-Type` header
- Audit trail: log `upload_media` action to `ticketHistory` on successful upload
- Permission check: anonymous users cannot upload; authenticated users follow category posting permissions
- Storage backend: local filesystem (configurable path via environment variable)

**Priority:** P1 (High — core ticket feature)

---

### F9: Geo-Clustering of Ticket Locations
**Description:** uReport maintains a pre-computed geo-cluster index (levels 0–6) linking tickets to spatial clusters for map visualization. The clustering logic must be re-implemented using PostGIS, preserving the cluster hierarchy and `ticket_geodata` join table.

**Capabilities:**
- `geoclusters` table: cluster records with `level` (0–6) and `center` point geometry
- `ticket_geodata` table: per-ticket cluster membership at each of 7 zoom levels (`cluster_id_0` through `cluster_id_6`)
- PostGIS `geometry(Point)` replaces MySQL `POINT SRID 0` for cluster centers
- Spatial index on cluster center geometry
- Cluster assignment script: assign tickets to nearest cluster at each level (port of `GeoCluster.php` logic)
- `LocationsController` equivalent: map endpoint returning cluster data in JSON/XML for front-end map rendering
- Re-cluster script: run after data migration to rebuild all cluster assignments
- Incremental cluster update: assign ticket to clusters on ticket create/update when lat/lon is provided

**Priority:** P1 (High — map visualization feature)

---

### F10: Category & Department Administration
**Description:** Staff can manage the full taxonomy of service categories, category groups, departments, and the routing rules that connect them. All admin CRUD interfaces must be reproduced with identical field sets and validation.

**Capabilities:**
- **Categories:** create/edit/delete service categories with `name`, `description`, `department_id`, `defaultPerson_id`, `categoryGroup_id`, `active`, `featured`, `displayPermissionLevel`, `postingPermissionLevel`, `customFields`, `slaDays`, `notificationReplyEmail`, `autoCloseIsActive`, `autoCloseSubstatus_id`
- **Category Groups:** create/edit/delete groups with `name` and `ordering`
- **Departments:** create/edit/delete with `name` and `defaultPerson_id`
- **Department–Category associations:** `department_categories` many-to-many join management
- **Department–Action associations:** `department_actions` join management — controls which action types appear for a department's tickets
- **Category Action Responses:** per-category email template overrides per action (`category_action_responses`)
- **Custom fields:** JSON-defined custom field schemas stored in `categories.customFields`; rendered as dynamic form fields on ticket creation
- All admin pages staff-only (RBAC P0 dependency)

**Priority:** P1 (High — configuration and routing)

---

### F11: People & API Client Management
**Description:** Staff manage person records (citizens and staff), their contact details, and API client credentials. All person-management and client-management interfaces must be reproduced.

**Capabilities:**
- **People CRUD:** `firstname`, `middlename`, `lastname`, `organization`, `address`, `city`, `state`, `zip`, `department_id`, `username`, `role`
- **People Emails:** `peopleEmails` — multiple email addresses per person with label and `usedForNotifications` flag
- **People Phones:** `peoplePhones` — multiple phone numbers per person with label
- **People Addresses:** `peopleAddresses` — multiple addresses per person with label
- **Clients (API keys):** create/edit/delete/deactivate API client records with `name`, `url`, `api_key`, `contactPerson_id`, `contactMethod_id`, `active`; setting `active = false` revokes API access immediately without deleting the record
- **Users view:** `UsersController` equivalent — list staff accounts, their department and role
- Person search: look up people by name, email, or username for ticket reporter/assignee selection
- Role assignment: set `people.role` to control staff-level access

**Priority:** P1 (High — user and API management)

---

### F12: Bookmarked Searches
**Description:** Authenticated users can save named search queries as bookmarks. Bookmarks are stored per user and can be recalled to re-run the same Solr query.

**Capabilities:**
- Create bookmark: save the current search URI under a user-defined name
- List bookmarks: display all bookmarks for the authenticated user
- Delete bookmark: remove a saved bookmark
- Bookmark type: default `'search'` (extensible per schema)
- `BookmarksController` equivalent: CRUD endpoints for bookmarks
- Bookmarks scoped to `person_id`; staff and public users can both create bookmarks

**Priority:** P2 (Medium — user productivity)

---

### F13: Reporting & Metrics
**Description:** uReport provides summary metrics and reports for staff to track ticket volume, resolution rates, and category distribution. The existing reports module must be reproduced.

**Capabilities:**
- `MetricsController` equivalent: dashboard metrics endpoint
- `ReportsController` equivalent: exportable reports (CSV/JSON) with date-range, category, department filters
- Metrics: open ticket count, closed ticket count, average resolution time, tickets by category, tickets by department
- Reports output in HTML, JSON, CSV, TXT via serialization interceptor (F3 dependency)
- Staff-only access

**Priority:** P2 (Medium — operational visibility)

---

### F14: Structured Logging via GELF/Graylog
**Description:** All application events are logged in GELF format to a Graylog instance for centralized observability. The PHP GELF client is replaced by a Node GELF client with the same log level and field conventions.

**Capabilities:**
- GELF UDP/TCP transport configured via environment variables (`GRAYLOG_HOST`, `GRAYLOG_PORT`)
- Log levels: DEBUG, INFO, WARNING, ERROR mapped to NestJS logger levels
- Structured fields: `short_message`, `full_message`, `facility`, `_request_id`, `_user_id`, `_ticket_id` where applicable
- NestJS `LoggerService` implementation wrapping the GELF client
- Request-level logging: HTTP method, path, status code, duration logged on each request
- Error logging: unhandled exceptions logged with stack trace

**Priority:** P2 (Medium — operations and observability)

---

### F15: Sub-Status & Action Reference Data
**Description:** Sub-statuses and actions are configurable reference data that drive ticket workflow and email notifications. The seed data and admin interfaces for these tables must be preserved.

**Capabilities:**
- **Sub-statuses:** seed rows (Resolved/closed, Duplicate/closed, Bogus/closed); staff can create additional sub-statuses with `name`, `description`, `status` (open/closed), and `isDefault` flag
- **Actions:** seed system actions (open, assignment, closed, changeCategory, changeLocation, response, duplicate, update, comment, upload_media); staff can add department-type actions with custom templates
- `SubstatusController` equivalent: CRUD for sub-statuses
- `ActionsController` equivalent: CRUD for actions and response templates
- `ResponseTemplatesController` equivalent: manage `category_action_responses`
- `IssueTypesController` equivalent: CRUD for issue types (Comment, Complaint, Question, Report, Request, Violation)
- `ContactMethodsController` equivalent: CRUD for contact methods (Email, Phone, Web Form, Other)

**Priority:** P2 (Medium — workflow configuration)

---

## 6. Non-Functional Requirements

| # | Requirement | Target |
|---|---|---|
| NFR-1 | API Compatibility | Open311 GeoReport v2 responses byte-identical to PHP implementation |
| NFR-2 | Content Negotiation Parity | HTML/JSON/XML/CSV/TXT output identical per endpoint |
| NFR-3 | Data Fidelity | Row counts, ordering, null handling, and boolean semantics match post-migration |
| NFR-4 | TypeScript Strictness | `strict: true` in `tsconfig.json`; zero `any` in production code |
| NFR-5 | Test Coverage | ≥80% unit test coverage on services; integration tests for all Open311 routes |
| NFR-6 | Performance | p95 response time ≤ 200ms for read endpoints under normal load |
| NFR-7 | Security | No PII leakage across permission levels; all inputs validated via class-validator/Zod |
| NFR-8 | Observability | All requests and errors logged to Graylog via GELF |
| NFR-9 | Database | PostgreSQL only; no MySQL dependencies in production code |
| NFR-10 | Search Engine | Apache Solr retained; no replacement with Elasticsearch or pg_trgm |
| NFR-11 | OIDC Compliance | Login flow and session behavior identical to original |
| NFR-12 | Spatial Accuracy | Geo-cluster assignments and coordinate precision match pre-migration values |

---

## 7. Success Metrics

- **API Parity:** 100% of Open311 GeoReport v2 test cases pass against the new implementation with byte-identical response bodies
- **Format Parity:** All five content formats (HTML/JSON/XML/CSV/TXT) produce identical output to the legacy system on a representative fixture dataset
- **Data Migration:** Zero row-count discrepancies across all 21 tables after MySQL → PostgreSQL migration
- **Permission Parity:** 100% of RBAC test cases (anonymous / public / staff) produce the same allow/deny outcome as the legacy Laminas ACL rules
- **Search Parity:** Solr queries return the same result sets (same IDs, same order) as the legacy Solarium integration on the migrated dataset
- **Zero External Breakage:** No external API consumer reports a breaking change post-migration
- **Test Coverage:** ≥80% line coverage on all NestJS service classes measured by Jest
- **Deployment:** Application runs in Docker container and passes health check endpoint within 30 seconds of startup

---

## 8. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Open311 response format divergence | Medium | Critical | Byte-diff integration tests comparing new vs. legacy responses on identical fixtures |
| MySQL → PostgreSQL semantic drift (nulls, booleans, timestamps) | High | High | Automated row-count + field-value verification script; strict Prisma type mapping |
| OIDC flow regression (session, callback, state/nonce) | Medium | High | Replay legacy OIDC flow in integration tests; test with actual IdP in staging |
| Solr query behavior divergence | Medium | High | Capture legacy Solr queries and expected result sets; replay against new client |
| Geo-cluster coordinate precision loss | Low | Medium | Validate centroid coordinates to 6 decimal places post-migration |
| Content negotiation format regression | Medium | High | Fixture-based snapshot tests for each format × endpoint combination |
| Permission rule gap (CASL vs Laminas ACL) | Medium | Critical | Map every Laminas ACL rule to a CASL rule with a corresponding test case |
| Data migration downtime | Low | High | Run migration in parallel (read from MySQL, write to PG) with cut-over window |
| Email notification regression | Low | Medium | Capture all notification triggers and templates; verify in staging with mail trap |
| Scope creep (new features before parity) | Medium | Medium | Hard project constraint: no new features until all parity acceptance tests pass |

---

## 9. Feature Index

| ID | Feature | Priority | Status | Dependencies |
|---|---|---|---|---|
| F0 | Open311 GeoReport v2 REST API | P0 | Planned | F2, F3, F6 |
| F1 | Ticket Lifecycle Management | P0 | Planned | F2, F6, F7 |
| F2 | Role-Based Access Control (RBAC) | P0 | Planned | F4, F6 |
| F3 | Content Negotiation & Multi-Format Serialization | P0 | Planned | — |
| F4 | OIDC Authentication | P0 | Planned | F6 |
| F5 | Full-Text Search via Apache Solr | P1 | Planned | F1, F6 |
| F6 | MySQL-to-PostgreSQL Schema Migration | P0 | Planned | — |
| F7 | Email Notifications | P1 | Planned | F1, F15 |
| F8 | Media & Attachment Management | P1 | Planned | F1, F2 |
| F9 | Geo-Clustering of Ticket Locations | P1 | Planned | F1, F6 |
| F10 | Category & Department Administration | P1 | Planned | F2, F6 |
| F11 | People & API Client Management | P1 | Planned | F2, F6 |
| F12 | Bookmarked Searches | P2 | Planned | F4, F5 |
| F13 | Reporting & Metrics | P2 | Planned | F1, F2, F3 |
| F14 | Structured Logging via GELF/Graylog | P2 | Planned | — |
| F15 | Sub-Status & Action Reference Data | P2 | Planned | F6 |

---

## 10. Out of Scope

The following items are explicitly excluded from this re-platform engagement:

- New features beyond the existing PHP application — full parity must be achieved first
- Mobile-native applications — web and API only
- Replacing Apache Solr with Elasticsearch, Typesense, or PostgreSQL full-text search
- Changing any Open311 GeoReport v2 API contract — routes, parameters, status codes, and response bodies are non-negotiable
- Targeting any database engine other than PostgreSQL
- UI redesign — HTML output must match the existing interface structure

---

## 11. Related Documents

- `project_specs/FRD-uReport.md` — Functional Requirements Document (downstream)
- `project_specs/TechArch-uReport.md` — Technical Architecture Document (downstream)
- `project_specs/UserStories-uReport.md` — User Stories (downstream)
- `.planning/PROJECT.md` — Project brief and constraints
- `crm/scripts/mysql.sql` — Legacy MySQL schema (source of truth for F6)

---

*PRD generated: 2026-06-23 | Model: claude-sonnet-4-6*
