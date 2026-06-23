# Requirements Traceability Matrix — uReport Re-Platform

**Project:** uReport — Open311 GeoReport v2 Municipal CRM  
**Acronym:** uReport  
**Version:** 1.0  
**Date:** 2026-06-23  
**Status:** Active  
**Based on:** PRD-uReport.md v1.0 · FRD-uReport.md v1.0 · TechArch-uReport.md v1.0 · UserStories-uReport.md v1.0

---

## 1. Overview

This Requirements Traceability Matrix (RTM) provides bidirectional traceability between all uReport re-platform specification documents. It ensures that every Product Requirement (PRD feature) is grounded in detailed Functional Requirements (FRD sub-requirements), implemented through a defined Technical Architecture component (TechArch spec), realized via User Stories, and validated by test cases. The matrix is the authoritative cross-reference artefact for the uReport re-platform from PHP/MySQL to Node.js/TypeScript/NestJS/PostgreSQL.

The traceability hierarchy flows from business intent to implementation: PRD features define **what** must be delivered and **why**; FRD sub-requirements define the precise **inputs, outputs, validations, and error states**; TechArch specifications define **how** each requirement is realized in the NestJS modular monolith; and User Stories express the requirement from the **user's perspective**, with acceptance criteria that become executable test cases.

Bidirectional traceability is maintained throughout: each PRD feature maps to one or more FRD sub-requirements and TechArch module components, and each User Story maps back to a PRD feature and forward to a set of test cases. This ensures no requirement is left unimplemented and no implementation exists without a documented requirement. The RTM also captures the dependency chain — F6 (Schema Migration) is a prerequisite for every database-backed feature, and F3 (Content Negotiation) is consumed by every output endpoint — so change impact analysis is immediately accessible.

The document covers all 16 PRD features (F0–F15), 16 FRD feature chunks (F00–F15) with their sub-requirements, 13 TechArch NestJS modules, and 80 User Stories (32 P0 / 30 P1 / 18 P2).

---

## 2. Requirements Summary

### 2.1 PRD Feature Inventory

- **F0 — Open311 GeoReport v2 REST API** (P0): Six public REST endpoints (`GET /services`, `GET /services/:id`, `POST /requests`, `GET /requests`, `GET /requests/:id`, `GET /tokens/:token`) that must be byte-compatible with the legacy PHP implementation
- **F1 — Ticket Lifecycle Management** (P0): Full CRUD + lifecycle operations (create, assign, update, close, duplicate, comment, respond, re-open, view history) with immutable `ticketHistory` audit trail
- **F2 — Role-Based Access Control (RBAC)** (P0): Three-tier role hierarchy (`anonymous < public < staff`) enforced via CASL guards, category-level permission filtering, and PII masking
- **F3 — Content Negotiation & Multi-Format Serialization** (P0): Global `SerializationInterceptor` supporting HTML/JSON/XML/CSV/TXT across all endpoints, replacing ~187 PHP partial templates
- **F4 — OIDC Authentication** (P0): OpenID Connect authorization code flow via `openid-client`, preserving login flow, session behavior, callback handling, and user provisioning
- **F5 — Full-Text Search via Apache Solr** (P1): eDisMax query construction, faceting, incremental indexing, and bulk re-index via Node Solr client replacing Solarium
- **F6 — MySQL-to-PostgreSQL Schema Migration** (P0): Full DDL translation (21 tables), data migration script with row-count verification, Prisma schema generation, and PostGIS spatial support
- **F7 — Email Notifications** (P1): Nodemailer replacing PHPMailer; triggers on open/assign/close/response/comment/duplicate; template resolution chain via `category_action_responses`; digest cron
- **F8 — Media & Attachment Management** (P1): File upload, UUID-based storage, thumbnail generation for images, stream serving, and `ticketHistory` audit trail on upload/delete
- **F9 — Geo-Clustering of Ticket Locations** (P1): PostGIS `geometry(Point, 4326)` replacing MySQL `POINT SRID 0`; KNN cluster assignment at 7 zoom levels (0–6); bulk re-cluster script
- **F10 — Category & Department Administration** (P1): Staff CRUD for categories, category groups, departments, `department_categories`, `department_actions`, and `category_action_responses`
- **F11 — People & API Client Management** (P1): Staff CRUD for people, `peopleEmails`, `peoplePhones`, `peopleAddresses`, and `clients` (api_key lifecycle); person search
- **F12 — Bookmarked Searches** (P2): Authenticated-user CRUD for saved search URIs scoped to `person_id`
- **F13 — Reporting & Metrics** (P2): Staff-only `GET /metrics` (aggregate counts, avg resolution time) and `GET /reports` (filterable export in all 5 formats)
- **F14 — Structured Logging via GELF/Graylog** (P2): `GelfLoggerService` wrapping `gelf-pro`; request/response logging, exception logging, structured context fields (`_request_id`, `_user_id`, `_ticket_id`)
- **F15 — Sub-Status & Action Reference Data** (P2): Seeded and staff-manageable `substatus`, `actions`, `issueTypes`, and `contactMethods` reference tables; system action protection rules

### 2.2 FRD Sub-Requirement Inventory

The FRD specifies 9 sub-requirements for F00, 9 for F01, 8 for F02, 8 for F03, 5 for F04, 3 for F05, and additional sub-requirements for F06–F15, covering inputs, outputs, validations, error states, and process steps for every functional behavior.

### 2.3 TechArch Module Inventory

Thirteen NestJS modules implement the features: `Open311Module`, `TicketsModule`, `AuthModule`, `CategoriesModule`, `DepartmentsModule`, `PeopleModule`, `SearchModule`, `MediaModule`, `NotificationsModule`, `BookmarksModule`, `GeoModule`, `ReportsModule`, `AdminModule`. Three cross-cutting components apply globally: `SerializationInterceptor`, `CaslGuard`, and `GelfLoggerService`.

### 2.4 User Story Inventory

| Priority | Count | Feature Scope |
|----------|-------|---------------|
| P0 — Critical | 32 | F0, F1, F2, F3, F4, F6 |
| P1 — High | 30 | F5, F7, F8, F9, F10, F11 |
| P2 — Medium | 18 | F12, F13, F14, F15 |
| **Total** | **80** | F0–F15 |

### 2.5 Non-Functional Requirements

| ID | NFR | Target |
|----|-----|--------|
| NFR-1 | API Compatibility | Open311 GeoReport v2 responses byte-identical to PHP |
| NFR-2 | Content Negotiation Parity | HTML/JSON/XML/CSV/TXT identical per endpoint |
| NFR-3 | Data Fidelity | Row counts, ordering, null handling, boolean semantics match post-migration |
| NFR-4 | TypeScript Strictness | `strict: true`; zero `any` in production code |
| NFR-5 | Test Coverage | ≥ 80% unit coverage on services; integration tests for all Open311 routes |
| NFR-6 | Performance | p95 ≤ 200ms for read endpoints under normal load |
| NFR-7 | Security | No PII leakage across permission levels; all inputs validated |
| NFR-8 | Observability | All requests and errors logged to Graylog via GELF |
| NFR-9 | Database | PostgreSQL only; no MySQL dependencies in production code |
| NFR-10 | Search Engine | Apache Solr retained; no replacement |
| NFR-11 | OIDC Compliance | Login flow and session behavior identical to original |
| NFR-12 | Spatial Accuracy | Geo-cluster assignments and coordinate precision match pre-migration values |

---

## 3. Traceability Matrix

### 3.1 Full Bidirectional Traceability: PRD → FRD → TechArch → User Stories

| PRD Feature | FRD Sub-Requirements | TechArch Module / Component | User Stories |
|-------------|---------------------|-----------------------------|--------------|
| **F0: Open311 GeoReport v2 REST API** (P0) | F00.1 GET /services · F00.2 GET /services/:id · F00.3 POST /requests · F00.4 GET /requests · F00.5 GET /requests/:id · F00.6 GET /tokens/:token | `Open311Module` (`Open311Controller`, `Open311Service`, `Open311Serializer`) | US-0.1, US-0.2, US-0.3, US-0.4, US-0.5, US-0.6 |
| **F1: Ticket Lifecycle Management** (P0) | F01.1 Create · F01.2 Assign · F01.3 Update · F01.4 Close · F01.5 Duplicate · F01.6 Comment · F01.7 Response · F01.8 Re-open · F01.9 View History | `TicketsModule` (`TicketsController`, `TicketsService`, `TicketsRepository`) | US-1.1, US-1.2, US-1.3, US-1.4, US-1.5, US-1.6, US-1.7, US-1.8, US-1.9, US-1.10 |
| **F2: Role-Based Access Control (RBAC)** (P0) | F02.1 Role Hierarchy · F02.2 Anonymous Rules · F02.3 Public Rules · F02.4 Staff Rules · F02.5 Category Permission Filtering · F02.6 CASL Ability Definitions · F02.7 NestJS Guard Integration · F02.8 PII Masking | `AuthModule` (`AbilityFactory`) + `CaslGuard` (global) | US-2.1, US-2.2, US-2.3, US-2.4, US-2.5 |
| **F3: Content Negotiation & Multi-Format Serialization** (P0) | F03.1 Format Resolution Priority · F03.2 SerializationInterceptor · F03.3 JSON Requirements · F03.4 XML Requirements · F03.5 CSV Requirements · F03.6 TXT Requirements · F03.7 HTML Requirements · F03.8 Error Response Formats | `SerializationInterceptor` (global) + `FormatMiddleware` + format serializers (`JsonSerializer`, `XmlSerializer`, `CsvSerializer`, `TxtSerializer`, `HtmlRenderer`) | US-3.1, US-3.2, US-3.3, US-3.4, US-3.5, US-3.6 |
| **F4: OIDC Authentication** (P0) | F04.1 Login Initiation · F04.2 OIDC Callback · F04.3 Session Management · F04.4 Logout · F04.5 Profile View & Edit | `AuthModule` (`AuthController`, `AuthService`, `SessionService`) | US-4.1, US-4.2, US-4.3, US-4.4, US-4.5 |
| **F5: Full-Text Search via Apache Solr** (P1) | F05.1 Solr Index Schema · F05.2 Search Endpoint · F05.3 Query Construction · F05.4 Facets · F05.5 Incremental Indexing · F05.6 Re-index Script · F05.7 Bookmark Integration | `SearchModule` (`SearchController`, `SolrService`) | US-5.1, US-5.2, US-5.3, US-5.4, US-5.5 |
| **F6: MySQL-to-PostgreSQL Schema Migration** (P0) | F06.1 DDL Translation · F06.2 Prisma Schema · F06.3 Data Migration Script · F06.4 Row-Count Verification · F06.5 Spatial Migration · F06.6 Seed Data · F06.7 FK Integrity | `prisma/schema.prisma` + `scripts/migrate.ts` + `scripts/verify.ts` + `prisma/seed.ts` | US-6.1, US-6.2, US-6.3, US-6.4, US-6.5 |
| **F7: Email Notifications** (P1) | F07.1 Trigger Matrix · F07.2 Template Resolution · F07.3 Recipient Resolution · F07.4 Variable Substitution · F07.5 SMTP Configuration · F07.6 Digest Notifications · F07.7 Notification Logging | `NotificationsModule` (`NotificationsService`, `MailerService`, `DigestScheduler`) | US-7.1, US-7.2, US-7.3, US-7.4, US-7.5, US-7.6 |
| **F8: Media & Attachment Management** (P1) | F08.1 Upload Endpoint · F08.2 File Storage · F08.3 Thumbnail Generation · F08.4 Serve Attachment · F08.5 Audit Trail · F08.6 Delete Attachment · F08.7 Permission Check | `MediaModule` (`MediaController`, `MediaService`, `MediaRepository`) | US-8.1, US-8.2, US-8.3, US-8.4 |
| **F9: Geo-Clustering of Ticket Locations** (P1) | F09.1 geoclusters Table · F09.2 ticket_geodata Table · F09.3 KNN Cluster Assignment · F09.4 Incremental Update · F09.5 Re-cluster Script · F09.6 Map Endpoint | `GeoModule` (`LocationsController`, `GeoClusterService`, `GeoRepository`) | US-9.1, US-9.2, US-9.3, US-9.4 |
| **F10: Category & Department Administration** (P1) | F10.1 Category CRUD · F10.2 Category Group CRUD · F10.3 Department CRUD · F10.4 Department–Category Associations · F10.5 Department–Action Associations · F10.6 Category Action Responses · F10.7 Custom Fields | `CategoriesModule` (`CategoriesController`, `CategoriesService`, `CategoriesRepository`) + `DepartmentsModule` (`DepartmentsController`, `DepartmentsService`, `DepartmentsRepository`) | US-10.1, US-10.2, US-10.3, US-10.4, US-10.5, US-10.6 |
| **F11: People & API Client Management** (P1) | F11.1 People CRUD · F11.2 peopleEmails CRUD · F11.3 peoplePhones CRUD · F11.4 peopleAddresses CRUD · F11.5 Clients CRUD · F11.6 Person Search · F11.7 Users List · F11.8 Role Assignment | `PeopleModule` (`PeopleController`, `ClientsController`, `PeopleService`, `PeopleRepository`) | US-11.1, US-11.2, US-11.3, US-11.4, US-11.5, US-11.6 |
| **F12: Bookmarked Searches** (P2) | F12.1 Create Bookmark · F12.2 List Bookmarks · F12.3 Delete Bookmark · F12.4 Scope to person_id | `BookmarksModule` (`BookmarksController`, `BookmarksService`, `BookmarksRepository`) | US-12.1, US-12.2, US-12.3, US-12.4 |
| **F13: Reporting & Metrics** (P2) | F13.1 Metrics Endpoint · F13.2 Reports Endpoint · F13.3 Aggregate Queries · F13.4 Multi-Format Export | `ReportsModule` (`MetricsController`, `ReportsController`, `ReportsService`) | US-13.1, US-13.2 |
| **F14: Structured Logging via GELF/Graylog** (P2) | F14.1 GELF Transport Configuration · F14.2 Request Logging · F14.3 Exception Logging · F14.4 Structured Fields · F14.5 Log Level Mapping | `GelfLoggerService` (global) + `GelfRequestMiddleware` | US-14.1, US-14.2, US-14.3 |
| **F15: Sub-Status & Action Reference Data** (P2) | F15.1 Sub-status CRUD · F15.2 Sub-status Seed Data · F15.3 Actions CRUD · F15.4 Actions Seed Data · F15.5 System Action Protection · F15.6 IssueTypes CRUD · F15.7 ContactMethods CRUD | `AdminModule` (`SubstatusController`, `ActionsController`, `IssueTypesController`, `ContactMethodsController`, `AdminService`) | US-15.1, US-15.2, US-15.3, US-15.4 |

---

### 3.2 FRD Sub-Requirement to User Story Detail

| FRD Sub-Requirement | Description | User Story | Acceptance Criteria (Key) |
|---------------------|-------------|------------|--------------------------|
| F00.1 | GET /open311/v2/services | US-0.1 | All active anon-visible categories returned; byte-compatible response |
| F00.2 | GET /open311/v2/services/:id | US-0.2 | ServiceDefinition with `attributes` array; 404 if not visible |
| F00.3 | POST /open311/v2/requests | US-0.3 | api_key validation; token returned; notifications triggered |
| F00.4 | GET /open311/v2/requests | US-0.4 | Filter params; role-visibility filter; page_size clamped to 500 |
| F00.5 | GET /open311/v2/requests/:id | US-0.5 | Single-element array envelope; 404 if not visible |
| F00.6 | GET /open311/v2/tokens/:token | US-0.6 | Token-to-ID lookup; always allowed; 404 if not found |
| F01.1 | Create Ticket | US-1.1 | `status = 'open'`; `ticketHistory` `open` entry; geo-cluster if lat/lon |
| F01.2 | Assign Ticket | US-1.3 | Staff-only; assignee must be in department; `assignment` history entry |
| F01.3 | Update Ticket | US-1.4 | `changeCategory`/`changeLocation`/`update` actions; Solr re-index |
| F01.4 | Close Ticket | US-1.5 | `substatus_id` with `status = 'closed'`; 409 if already closed |
| F01.5 | Mark as Duplicate | US-1.6 | `duplicate` action on parent; child closed with Duplicate substatus |
| F01.6 | Add Comment | US-1.7 | Staff-only; `comment` action; not visible to non-staff |
| F01.7 | Add Response | US-1.8 | Staff-only; `response` action; notification triggered |
| F01.8 | Re-open Ticket | US-1.9 | Staff-only; clears `closedDate` and `substatus_id`; 409 if open |
| F01.9 | View Ticket History | US-1.10 | Ordered by `enteredDate ASC`; PII masked for non-staff; all 5 formats |
| F02.1 | Role Hierarchy | US-2.3 | `anonymous < public < staff`; `role = null` = public |
| F02.2 | Anonymous Access Rules | US-2.1 | Read/submit to `anonymous`-permission categories; no PII; no admin |
| F02.3 | Public Access Rules | US-2.2 | Read/submit to `public`+`anonymous` categories; own tickets only |
| F02.4 | Staff Access Rules | US-2.3 | `can('manage', 'all')` — full read/write |
| F02.5 | Category Permission Filtering | US-2.4 | WHERE clause applied per role on all list/detail reads |
| F02.6 | CASL Ability Definitions | US-2.3 | `AbilityFactory.createForUser(user)` per role |
| F02.7 | NestJS Guard Integration | US-2.1 | `@UseGuards(CaslGuard)` + `@CheckAbilities()` per route |
| F02.8 | PII Masking | US-2.5 | `reportedByPerson_id`, `enteredByPerson_id`, `actionPerson_id` omitted for non-staff |
| F03.1 | Format Resolution Priority | US-3.4 | URL suffix > `?format=` > Accept header > default |
| F03.2 | SerializationInterceptor | US-3.4 | Global interceptor; no per-controller format logic |
| F03.3 | JSON Format Requirements | US-3.1 | camelCase field names; `null` not omitted; ISO 8601 dates |
| F03.4 | XML Format Requirements | US-3.2 | `<?xml ...?>` declaration; CDATA for description/notes/template |
| F03.5 | CSV Format Requirements | US-3.3 | Header row; double-quoted strings; UTF-8 BOM; Content-Disposition |
| F03.6 | TXT Format Requirements | US-3.6 | Tab-separated; no header; one record per line |
| F03.7 | HTML Format Requirements | US-3.5 | Handlebars/Nunjucks templates; full layout for browser; partial for AJAX |
| F03.8 | Error Response Formats | US-3.4 | Errors format-negotiated (JSON/XML/HTML/CSV/TXT) |
| F04.1 | Login Initiation | US-4.1 | Random state+nonce; OIDC authorization redirect (302) |
| F04.2 | OIDC Callback | US-4.2 | State/nonce validation; people upsert; session population |
| F04.3 | Session Management | US-4.3 | HttpOnly+Secure+SameSite=Lax cookie; Redis store; TTL configurable |
| F04.4 | Logout | US-4.4 | Session destroy; cookie cleared; optional IdP end-session redirect |
| F04.5 | Profile View & Edit | US-4.5 | Own `people` record; cannot change `role`/`username` |
| F05.1 | Solr Index Schema | US-5.4 | 18 indexed fields matching legacy schema field names |
| F05.2 | Search Endpoint | US-5.1, US-5.2 | `GET /search`; eDisMax; role-visibility filter injected |
| F05.3 | Query Construction | US-5.1 | `description^2 location^1.5 city^1 customFields^1`; mm=75% |
| F05.4 | Facets | US-5.3 | categories, statuses, departments matching legacy facet config |
| F05.5 | Incremental Indexing | US-5.4 | Index on create/update/close; failure logged, not propagated |
| F05.6 | Re-index Script | US-5.5 | Batch 500; deleteByQuery before insert; commit at end |
| F06.1 | DDL Translation | US-6.1 | All 21 tables; IDENTITY, BOOLEAN, DOUBLE PRECISION, PostGIS |
| F06.2 | Prisma Schema | US-6.5 | `schema.prisma` with all 21 models; `prisma validate` passes |
| F06.3 | Data Migration Script | US-6.2 | Dependency-ordered; TINYINT→BOOLEAN; POINT→ST_GeomFromText |
| F06.4 | Row-Count Verification | US-6.3 | COUNT(*) compared per table; non-zero exit on mismatch |
| F06.5 | Spatial Migration | US-6.1, US-6.2 | POINT binary → `geometry(Point, 4326)`; GiST index created |
| F06.6 | Seed Data | US-6.4 | 5 reference tables seeded; included in `prisma/seed.ts` |
| F07.1 | Trigger Matrix | US-7.1–7.4 | Triggers on open/assign/close/response/comment/duplicate |
| F07.2 | Template Resolution | US-7.5 | `category_action_responses` → `actions.template` fallback chain |
| F07.3 | Recipient Resolution | US-7.1–7.4 | `usedForNotifications = true` emails; per qualifying address |
| F07.4 | Variable Substitution | US-7.5 | `{actionPerson}`, `{reportedByPerson_id}`, `{original:category_id}` etc. |
| F07.5 | SMTP Configuration | US-7.5 | `SMTP_HOST/PORT/USER/PASS/SECURE/FROM` env vars |
| F07.6 | Digest Notifications | US-7.6 | `@Cron(DIGEST_CRON)` job; logged to `sentNotifications` |
| F08.1 | Upload Endpoint | US-8.1 | `POST /tickets/:id/media`; multipart; MIME validation; size limit |
| F08.2 | File Storage | US-8.1 | `{MEDIA_STORAGE_PATH}/{ticket_id}/{uuid}.{ext}` |
| F08.3 | Thumbnail Generation | US-8.2 | image/jpeg, image/png, image/gif; `{path}/thumbnails/` |
| F08.4 | Serve Attachment | US-8.3 | Stream bytes; Content-Type set; Content-Disposition inline |
| F08.5 | Audit Trail | US-8.1 | `upload_media` action in `ticketHistory`; `lastModified` updated |
| F08.6 | Delete Attachment | US-8.4 | Staff-only; file + thumbnail removed from disk; DB record deleted |
| F09.1 | geoclusters Table | US-9.1 | `level` 0–6; `center geometry(Point, 4326)`; GiST index |
| F09.2 | ticket_geodata Table | US-9.2 | `cluster_id_0` through `cluster_id_6` FK columns |
| F09.3 | KNN Cluster Assignment | US-9.2 | PostGIS `<->` KNN per level; `assignClusters(ticketId, lat, lon)` |
| F09.4 | Incremental Update | US-9.3 | Re-runs on lat/lon change; upsert; clears row if lat/lon nulled |
| F09.5 | Re-cluster Script | US-9.4 | `scripts/recluster.ts`; truncate before rebuild; batch 500 |
| F09.6 | Map Endpoint | US-9.1 | `GET /locations`; zoom_level 0–6; role-filtered clusters |
| F10.1 | Category CRUD | US-10.1, US-10.2 | Full field set with customFields JSON; permission levels; slaDays |
| F10.2 | Category Group CRUD | US-10.3 | name + ordering; blocked delete if categories reference |
| F10.3 | Department CRUD | US-10.4 | name + defaultPerson_id; blocked delete if categories/people reference |
| F10.4 | Department–Category Associations | US-10.5 | `department_categories` M:M; PK constraint on duplicate |
| F10.5 | Department–Action Associations | US-10.5 | `department_actions` M:M |
| F10.6 | Category Action Responses | US-10.6 | Upsert `category_action_responses`; overrides email template |
| F11.1 | People CRUD | US-11.1 | username unique; role `null` or `'staff'`; blocked delete if referenced |
| F11.2 | peopleEmails CRUD | US-11.2 | RFC 5322 email; label in (Home, Work, Other); usedForNotifications flag |
| F11.3 | peoplePhones CRUD | US-11.3 | label in (Main, Mobile, Work, Home, Fax, Pager, Other) |
| F11.4 | peopleAddresses CRUD | US-11.3 | label in (Home, Business, Rental) |
| F11.5 | Clients CRUD | US-11.6 | api_key unique max 50 chars; active=false revokes immediately |
| F11.6 | Person Search | US-11.4 | Search across firstname, lastname, email, username; min 2 chars |
| F11.7 | Users List | US-11.5 | `GET /users` — staff only; all 5 formats |
| F12.1 | Create Bookmark | US-12.1 | name + requestUri (must start with `/`); scoped to currentUser |
| F12.2 | List Bookmarks | US-12.2 | `person_id = currentUser.id` only; ordered by id DESC |
| F12.3 | Delete Bookmark | US-12.3 | HTTP 204; 404 if not owned (no 403 to avoid info leakage) |
| F13.1 | Metrics Endpoint | US-13.1 | openCount, closedCount, avgResolutionDays, byCategory, byDepartment |
| F13.2 | Reports Endpoint | US-13.2 | Filtered report; page+page_size; all 5 formats |
| F14.1 | GELF Transport | US-14.1 | UDP/TCP via `GRAYLOG_HOST/PORT/TRANSPORT/FACILITY` env vars |
| F14.2 | Request Logging | US-14.1 | method, path, statusCode, durationMs, `_request_id` per request |
| F14.3 | Exception Logging | US-14.2 | ERROR level; short_message + full_message (stack trace) |
| F14.4 | Structured Fields | US-14.3 | `_request_id`, `_user_id`, `_ticket_id` per log entry |
| F14.5 | Log Level Mapping | US-14.2 | verbose/debug→7, log→6, warn→4, error→3 |
| F15.1 | Sub-status CRUD | US-15.1 | name max 25; description max 128; status open/closed; isDefault |
| F15.2 | Sub-status Seed Data | US-15.1 | Resolved/closed, Duplicate/closed, Bogus/closed (3 rows) |
| F15.3 | Actions CRUD | US-15.2 | name max 25; type system/department; system actions protected |
| F15.4 | Actions Seed Data | US-15.2 | 10 system actions seeded |
| F15.5 | System Action Protection | US-15.2 | system type cannot be deleted; name cannot be changed |
| F15.6 | IssueTypes CRUD | US-15.3 | 6 seed rows; name max 128; blocked delete if referenced |
| F15.7 | ContactMethods CRUD | US-15.4 | 4 seed rows; name max 128; blocked delete if referenced |

---

## 4. Requirements Detail by Feature

### F0: Open311 GeoReport v2 REST API
**PRD Priority:** P0 | **FRD Chunk:** F00 | **TechArch Module:** `Open311Module`

**FRD Requirements:**
- **F00.1** — `GET /open311/v2/services[.json|.xml]`: Returns all active categories visible at caller's role level; each as `{service_code, service_name, description, metadata, type, keywords, group}` per GeoReport v2 spec
- **F00.2** — `GET /open311/v2/services/:id[.json|.xml]`: ServiceDefinition with `attributes` array from parsed `customFields` JSON; 404 if not found or not visible
- **F00.3** — `POST /open311/v2/requests[.json|.xml]`: `api_key` validated against `clients`; ticket created; token generated and stored in `ticketHistory`; notifications, geo-clustering, and Solr indexing triggered
- **F00.4** — `GET /open311/v2/requests[.json|.xml]`: Filter by `status`, `service_code`, `start_date`, `end_date`, `lat`/`long`/`radius`, `page`, `page_size` (default 100, max 500)
- **F00.5** — `GET /open311/v2/requests/:id[.json|.xml]`: Returns single-element array per GeoReport v2 spec; 404 if not visible
- **F00.6** — `GET /open311/v2/tokens/:token[.json|.xml]`: Looks up `service_request_id` from `ticketHistory.data`; always anonymous-accessible

**TechArch Components:**
- `Open311Controller` — routes all 6 endpoints under `/open311/v2`; handles `.json`/`.xml` suffix via `FormatMiddleware`
- `Open311Service` — `api_key` validation, category visibility filtering, ServiceRequest mapping, token generation/lookup
- `Open311Serializer` — enforces byte-compatible GeoReport v2 envelope shapes

**Dependencies:** F2 (RBAC category visibility), F3 (format negotiation), F6 (database), F7 (email), F5 (Solr), F9 (geo)

---

### F1: Ticket Lifecycle Management
**PRD Priority:** P0 | **FRD Chunk:** F01 | **TechArch Module:** `TicketsModule`

**FRD Requirements:**
- **F01.1** — Create: `category_id` required; `postingPermissionLevel` checked; `enteredDate = NOW()`, `status = 'open'`; `open` action in `ticketHistory`
- **F01.2** — Assign: Staff-only; `assignedPerson_id` must be in ticket's department; `assignment` action logged; notification triggered
- **F01.3** — Update: Category change → `changeCategory` action; location change → `changeLocation` action; other → `update` action; Solr re-index
- **F01.4** — Close: `substatus_id` with `status = 'closed'` required; `closedDate = NOW()`; `closed` action; 409 if already closed
- **F01.5** — Duplicate: `parent_id` set on child; child closed with Duplicate substatus; `duplicate` action on parent only
- **F01.6** — Comment: Staff-only; `notes` required; `comment` action appended; not visible to non-staff
- **F01.7** — Response: Staff-only; `response` action; `actionPerson_id` defaults to `reportedByPerson_id`; notification triggered
- **F01.8** — Re-open: Staff-only; clears `closedDate` and `substatus_id`; `update` action; Solr re-index; 409 if already open
- **F01.9** — View History: All `ticketHistory` rows ordered `enteredDate ASC`; PII masked for non-staff; available in all 5 formats

**Tables:** `tickets`, `ticketHistory`, `categories`, `people`, `substatus`, `actions`

---

### F2: Role-Based Access Control (RBAC)
**PRD Priority:** P0 | **FRD Chunk:** F02 | **TechArch Components:** `AbilityFactory`, `CaslGuard`

**FRD Requirements:**
- **F02.1** — Role Hierarchy: `anonymous` (no session) < `public` (`role = null`) < `staff` (`role = 'staff'`); new OIDC users get null role by default
- **F02.2** — Anonymous Rules: Read/submit to `displayPermissionLevel = 'anonymous'` categories; token lookup always allowed; no PII; no admin
- **F02.3** — Public Rules: Read/submit to `public`+`anonymous` categories; own ticket history; own bookmarks; own people record
- **F02.4** — Staff Rules: `can('manage', 'all')` — full read/write across all subjects
- **F02.5** — Category Permission Filtering: WHERE clause on `displayPermissionLevel` / `postingPermissionLevel` per role on every list/detail read
- **F02.6** — CASL Ability Definitions: `AbilityFactory.createForUser(user)` produces typed `Ability` instance per role
- **F02.7** — Guard Integration: `@UseGuards(CaslGuard)` + `@CheckAbilities({action, subject})` on every controller method
- **F02.8** — PII Masking: `reportedByPerson_id`, `enteredByPerson_id`, `assignedPerson_id`, `ticketHistory.*Person_id` omitted/nulled for non-staff

---

### F3: Content Negotiation & Multi-Format Serialization
**PRD Priority:** P0 | **FRD Chunk:** F03 | **TechArch Component:** `SerializationInterceptor` (global)

**FRD Requirements:**
- **F03.1** — Priority: URL suffix (`.json`/`.xml`/`.csv`/`.txt`) > `?format=` > `Accept` header > default (JSON for `/open311/v2/`; HTML elsewhere)
- **F03.2** — SerializationInterceptor: Global NestJS interceptor; delegates to format-specific serializers; sets `Content-Type`
- **F03.3** — JSON: camelCase field names matching legacy; `null` not omitted; booleans as `true`/`false`; ISO 8601 dates; empty arrays as `[]`
- **F03.4** — XML: `<?xml version="1.0" encoding="UTF-8"?>`; legacy root/tag names; CDATA for description/notes/template
- **F03.5** — CSV: Header row; double-quoted strings; UTF-8 BOM (`\xEF\xBB\xBF`); `Content-Disposition: attachment`; booleans as `1`/`0`
- **F03.6** — TXT: Tab-separated fields; one record per line; no header; matches legacy field order
- **F03.7** — HTML: Handlebars or Nunjucks server-side templates; full layout for browser; partial for AJAX
- **F03.8** — Error Formats: Error responses also format-negotiated per resolved content type

---

### F4: OIDC Authentication
**PRD Priority:** P0 | **FRD Chunk:** F04 | **TechArch Module:** `AuthModule`

**FRD Requirements:**
- **F04.1** — Login: Cryptographic random `state` + `nonce`; stored in session; 302 redirect to IdP authorization URL; config via `OIDC_ISSUER/CLIENT_ID/SECRET/REDIRECT_URI`
- **F04.2** — Callback: `state` and `nonce` validated; code exchanged via `openid-client`; `people` record upserted from claims (`sub`, `email`, `given_name`, `family_name`); session set
- **F04.3** — Sessions: Redis store (`connect-redis`); HttpOnly + Secure + SameSite=Lax cookie; `SESSION_TTL_SECONDS` (default 3600); `AuthMiddleware` sets `req.user`
- **F04.4** — Logout: Server-side session destroyed; cookie cleared; optional IdP end-session redirect if `OIDC_END_SESSION_ENDPOINT` set
- **F04.5** — Profile: `GET/PUT /account` — own `people` record; `role` and `username` read-only; all 5 formats via serialization interceptor

---

### F5: Full-Text Search via Apache Solr
**PRD Priority:** P1 | **FRD Chunk:** F05 | **TechArch Module:** `SearchModule`

**FRD Requirements:**
- **F05.1** — Index Schema: 18 fields per ticket document; field names match legacy Solr schema exactly
- **F05.2** — Search Endpoint: `GET /search`; role-visibility filter injected as Solr filter query; eDisMax; paginated
- **F05.3** — Query Construction: `qf=description^2 location^1.5 city^1 customFields^1`; `mm=75%`; `pf=description^4`
- **F05.4** — Facets: categories, statuses, departments matching legacy Solr facet configuration
- **F05.5** — Incremental Indexing: `SolrService.indexTicket()` called by `TicketsService` on create/update/close; failure swallowed with GELF warn
- **F05.6** — Re-index Script: `deleteByQuery *:*`; batch 500 from PostgreSQL; final commit; progress logged

---

### F6: MySQL-to-PostgreSQL Schema Migration
**PRD Priority:** P0 | **FRD Chunk:** F06 | **TechArch:** `prisma/schema.prisma` + scripts

**FRD Requirements:**
- **F06.1** — DDL Translation: `AUTO_INCREMENT` → `GENERATED ALWAYS AS IDENTITY`; `TINYINT(1)` → `BOOLEAN`; `FLOAT(17,14)` → `DOUBLE PRECISION`; `POINT SRID 0` → `geometry(Point, 4326)`; `ENUM` → `TEXT + CHECK`; `TIMESTAMP` → `TIMESTAMPTZ`
- **F06.2** — Prisma Schema: 21 models; `@id @default(autoincrement())`; `@relation` for all FKs; `Unsupported("geometry(Point, 4326)")` for PostGIS; passes `prisma validate`
- **F06.3** — Data Migration: Dependency-ordered table processing; `TINYINT(1)` → boolean; POINT binary → `ST_GeomFromText`; UTC datetime handling; FK checks disabled during migration; IDENTITY sequences reset
- **F06.4** — Row-Count Verification: `SELECT COUNT(*)` compared per table; `[PASS]`/`[FAIL]` logged; non-zero exit on any mismatch
- **F06.5** — Seed Data: 5 reference tables seeded with default rows; included in `prisma/seed.ts` for fresh deployments

---

### F7: Email Notifications
**PRD Priority:** P1 | **FRD Chunk:** F07 | **TechArch Module:** `NotificationsModule`

**FRD Requirements:**
- **F07.1** — Triggers: open, assignment, closed, response, comment, duplicate lifecycle events
- **F07.2** — Template Resolution: `category_action_responses.template` → `actions.template` → no email if no template
- **F07.3** — Reply-to Resolution: `categories.notificationReplyEmail` → `category_action_responses.replyEmail` → `actions.replyEmail`
- **F07.4** — Recipient Resolution: `peopleEmails` where `usedForNotifications = true`; per qualifying email address
- **F07.5** — Variable Substitution: `{actionPerson}`, `{enteredByPerson}`, `{reportedByPerson_id}`, `{original:category_id}`, etc.; null → empty string
- **F07.6** — Digest: `@Cron(DIGEST_CRON)` scheduled task; batch email to subscribed users
- **F07.7** — Logging: All sends logged to `ticketHistory.sentNotifications`; SMTP failure logged to GELF and suppressed

---

### F8: Media & Attachment Management
**PRD Priority:** P1 | **FRD Chunk:** F08 | **TechArch Module:** `MediaModule`

**FRD Requirements:**
- **F08.1** — Upload: `POST /tickets/:id/media`; multipart/form-data; MIME allowlist; `MEDIA_MAX_BYTES` limit (default 10 MB); 401 for anonymous
- **F08.2** — Storage: `{MEDIA_STORAGE_PATH}/{ticket_id}/{uuid}.{ext}`; `internalFilename` is UUID-derived (never from user input)
- **F08.3** — Thumbnails: jpeg/png/gif → thumbnail at `{path}/thumbnails/`; configurable dimensions via `THUMBNAIL_WIDTH/HEIGHT`
- **F08.4** — Serve: `GET /tickets/:id/media/:mediaId` streams with correct `Content-Type`; `Content-Disposition: inline`
- **F08.5** — Audit: `upload_media` action in `ticketHistory`; `tickets.lastModified` updated on upload and delete
- **F08.6** — Delete: Staff-only; file + thumbnail deleted from disk; `media` record removed; `update` action logged

---

### F9: Geo-Clustering of Ticket Locations
**PRD Priority:** P1 | **FRD Chunk:** F09 | **TechArch Module:** `GeoModule`

**FRD Requirements:**
- **F09.1** — geoclusters: `level` SMALLINT (0–6); `center geometry(Point, 4326)`; GiST spatial index
- **F09.2** — ticket_geodata: `cluster_id_0` through `cluster_id_6` FK to `geoclusters`; one row per geolocated ticket
- **F09.3** — KNN Assignment: PostGIS `<->` KNN operator against `geoclusters` per level; `assignClusters(ticketId, lat, lon)` called by `TicketsService`
- **F09.4** — Incremental Update: Re-runs on lat/lon change; upsert (`ON CONFLICT DO UPDATE`); row deleted if lat/lon nulled
- **F09.5** — Re-cluster Script: `scripts/recluster.ts`; truncates `ticket_geodata`; batch 500; progress logged; idempotent

---

### F10: Category & Department Administration
**PRD Priority:** P1 | **FRD Chunks:** F10 | **TechArch Modules:** `CategoriesModule`, `DepartmentsModule`

**FRD Requirements:**
- **F10.1–F10.7** — Full staff CRUD for categories (with customFields JSON, slaDays, permission levels, autoClose), category groups, departments, `department_categories` M:M, `department_actions` M:M, `category_action_responses` upsert; all staff-only; category with tickets cannot be deleted

---

### F11: People & API Client Management
**PRD Priority:** P1 | **FRD Chunk:** F11 | **TechArch Module:** `PeopleModule`

**FRD Requirements:**
- **F11.1–F11.8** — Staff CRUD for `people`, `peopleEmails` (RFC 5322; usedForNotifications), `peoplePhones`, `peopleAddresses`; `clients` (api_key unique max 50 chars; active=false revokes immediately); person search (min 2 chars; role/department filters); `GET /users` (staff list; all 5 formats)

---

### F12: Bookmarked Searches
**PRD Priority:** P2 | **FRD Chunk:** F12 | **TechArch Module:** `BookmarksModule`

**FRD Requirements:**
- **F12.1–F12.4** — `POST /bookmarks` (requestUri required, must start with `/`); `GET /bookmarks` (own only, id DESC); `DELETE /bookmarks/:id` (HTTP 204; 404 if not owned); client-side recall via stored `requestUri`

---

### F13: Reporting & Metrics
**PRD Priority:** P2 | **FRD Chunk:** F13 | **TechArch Module:** `ReportsModule`

**FRD Requirements:**
- **F13.1–F13.4** — `GET /metrics` (openCount, closedCount, avgResolutionDays, byCategory, byDepartment; optional date range); `GET /reports` (filterable; page+page_size; all 5 formats); staff-only

---

### F14: Structured Logging via GELF/Graylog
**PRD Priority:** P2 | **FRD Chunk:** F14 | **TechArch Component:** `GelfLoggerService` (global)

**FRD Requirements:**
- **F14.1–F14.5** — UDP/TCP GELF via `gelf-pro`; `GelfLoggerService` wraps NestJS `LoggerService`; request middleware logs method/path/statusCode/durationMs/`_request_id`; global exception filter logs ERROR + stack trace; `_ticket_id` and `_user_id` as structured fields; GELF level mapping per NestJS log level

---

### F15: Sub-Status & Action Reference Data
**PRD Priority:** P2 | **FRD Chunk:** F15 | **TechArch Module:** `AdminModule`

**FRD Requirements:**
- **F15.1–F15.7** — Seeded `substatus` (3 rows), `actions` (10 system rows), `issueTypes` (6 rows), `contactMethods` (4 rows); system actions protected from deletion/name-change; referenced records blocked from deletion; staff-only CRUD; `isDefault` unique per status value

---

## 5. Test Case Coverage Matrix

### 5.1 Coverage Summary by Feature

| Feature | Priority | User Stories | Test Cases | Unit Tests | Integration Tests | E2E Tests | Coverage |
|---------|----------|-------------|------------|------------|-------------------|-----------|----------|
| F0: Open311 API | P0 | 6 (US-0.1–0.6) | 18 | TEST-F0-01 to -06 | TEST-F0-07 to -15 | TEST-F0-16 to -18 | 100% |
| F1: Ticket Lifecycle | P0 | 10 (US-1.1–1.10) | 28 | TEST-F1-01 to -09 | TEST-F1-10 to -22 | TEST-F1-23 to -28 | 100% |
| F2: RBAC | P0 | 5 (US-2.1–2.5) | 20 | TEST-F2-01 to -08 | TEST-F2-09 to -18 | TEST-F2-19 to -20 | 100% |
| F3: Content Negotiation | P0 | 6 (US-3.1–3.6) | 18 | TEST-F3-01 to -08 | TEST-F3-09 to -16 | TEST-F3-17 to -18 | 100% |
| F4: OIDC Auth | P0 | 5 (US-4.1–4.5) | 14 | TEST-F4-01 to -05 | TEST-F4-06 to -12 | TEST-F4-13 to -14 | 100% |
| F5: Solr Search | P1 | 5 (US-5.1–5.5) | 12 | TEST-F5-01 to -04 | TEST-F5-05 to -10 | TEST-F5-11 to -12 | 100% |
| F6: Schema Migration | P0 | 5 (US-6.1–6.5) | 10 | TEST-F6-01 to -03 | TEST-F6-04 to -08 | TEST-F6-09 to -10 | 100% |
| F7: Email | P1 | 6 (US-7.1–7.6) | 10 | TEST-F7-01 to -04 | TEST-F7-05 to -09 | TEST-F7-10 | 100% |
| F8: Media | P1 | 4 (US-8.1–8.4) | 10 | TEST-F8-01 to -04 | TEST-F8-05 to -08 | TEST-F8-09 to -10 | 100% |
| F9: Geo-Clustering | P1 | 4 (US-9.1–9.4) | 8 | TEST-F9-01 to -03 | TEST-F9-04 to -07 | TEST-F9-08 | 100% |
| F10: Category/Dept Admin | P1 | 6 (US-10.1–10.6) | 12 | TEST-F10-01 to -04 | TEST-F10-05 to -10 | TEST-F10-11 to -12 | 100% |
| F11: People/Clients | P1 | 6 (US-11.1–11.6) | 12 | TEST-F11-01 to -04 | TEST-F11-05 to -10 | TEST-F11-11 to -12 | 100% |
| F12: Bookmarks | P2 | 4 (US-12.1–12.4) | 6 | TEST-F12-01 to -02 | TEST-F12-03 to -05 | TEST-F12-06 | 100% |
| F13: Reporting | P2 | 2 (US-13.1–13.2) | 6 | TEST-F13-01 to -02 | TEST-F13-03 to -05 | TEST-F13-06 | 100% |
| F14: GELF Logging | P2 | 3 (US-14.1–14.3) | 6 | TEST-F14-01 to -02 | TEST-F14-03 to -05 | TEST-F14-06 | 100% |
| F15: Sub-status/Actions | P2 | 4 (US-15.1–15.4) | 8 | TEST-F15-01 to -03 | TEST-F15-04 to -07 | TEST-F15-08 | 100% |
| **TOTAL** | | **80** | **198** | **74** | **82** | **42** | **100%** |

### 5.2 Test Case Definitions

| Test ID | Test Name | Type | Feature | Story | Pass Criteria |
|---------|-----------|------|---------|-------|---------------|
| TEST-F0-01 | GET /services returns byte-compatible JSON | Integration | F0 | US-0.1 | Response body character-for-character identical to PHP fixture |
| TEST-F0-02 | GET /services returns byte-compatible XML | Integration | F0 | US-0.1 | XML body identical to PHP fixture; includes `<?xml ...?>` declaration |
| TEST-F0-03 | GET /services/:id returns ServiceDefinition with attributes | Integration | F0 | US-0.2 | `attributes` array present; all 7 attribute fields present |
| TEST-F0-04 | GET /services/:id returns 404 for invisible category | Integration | F0 | US-0.2 | HTTP 404 returned for staff-only category via anonymous call |
| TEST-F0-05 | POST /requests with valid api_key creates ticket | Integration | F0 | US-0.3 | HTTP 200; `service_request_id` returned; ticket in DB |
| TEST-F0-06 | POST /requests with invalid api_key returns 403 | Integration | F0 | US-0.3 | HTTP 403; no ticket created |
| TEST-F0-07 | POST /requests without location returns 400 | Integration | F0 | US-0.3 | HTTP 400; error code `MISSING_PARAMETER` |
| TEST-F0-08 | GET /requests filters by status and date range | Integration | F0 | US-0.4 | Only tickets matching filters returned |
| TEST-F0-09 | GET /requests page_size clamped at 500 | Unit | F0 | US-0.4 | page_size=9999 silently returns max 500 results |
| TEST-F0-10 | GET /requests/:id returns single-element array | Integration | F0 | US-0.5 | Response is `[{...}]` array with one element |
| TEST-F0-11 | GET /tokens/:token returns service_request_id | Integration | F0 | US-0.6 | `{token, service_request_id}` returned correctly |
| TEST-F0-12 | GET /tokens/:token returns 404 for missing token | Integration | F0 | US-0.6 | HTTP 404; error code `NOT_FOUND` |
| TEST-F0-13 | Open311 response fields match GeoReport v2 spec | E2E | F0 | US-0.1–0.5 | All required GeoReport v2 fields present in responses |
| TEST-F0-14 | jurisdiction_id accepted and silently ignored | Unit | F0 | US-0.1 | No error returned when jurisdiction_id provided |
| TEST-F0-15 | Byte-diff test: JSON vs PHP fixture | E2E | F0 | US-0.1–0.5 | Zero character differences against PHP output on same fixture |
| TEST-F0-16 | Byte-diff test: XML vs PHP fixture | E2E | F0 | US-0.1–0.5 | Zero character differences against PHP XML output |
| TEST-F0-17 | api_key validated against active clients only | Integration | F0 | US-0.3 | Inactive client (active=false) returns HTTP 403 |
| TEST-F0-18 | Lat/long out of range returns 400 | Unit | F0 | US-0.3 | lat=999 returns HTTP 400 with INVALID_INPUT |
| TEST-F1-01 | Create ticket sets status=open and enteredDate | Unit | F1 | US-1.1 | `status = 'open'`; `enteredDate` within 1 second of NOW() |
| TEST-F1-02 | Create ticket appends open action to ticketHistory | Unit | F1 | US-1.1 | One `ticketHistory` row with `action.name = 'open'` |
| TEST-F1-03 | Create ticket with invalid customFields returns 400 | Unit | F1 | US-1.1 | HTTP 400; `INVALID_INPUT` error code |
| TEST-F1-04 | Assign ticket updates assignedPerson_id and lastModified | Unit | F1 | US-1.3 | DB fields updated; `assignment` history row present |
| TEST-F1-05 | Assign ticket rejects non-department person | Unit | F1 | US-1.3 | HTTP 400; `Assignee must belong to the ticket's department` |
| TEST-F1-06 | Close ticket sets status=closed and closedDate | Unit | F1 | US-1.5 | `status = 'closed'`; `closedDate` set; `substatus_id` set |
| TEST-F1-07 | Close already-closed ticket returns 409 | Unit | F1 | US-1.5 | HTTP 409; `CONFLICT` |
| TEST-F1-08 | Duplicate action logged on parent only | Unit | F1 | US-1.6 | Parent has `duplicate` action; child has `closed` action |
| TEST-F1-09 | Re-open clears closedDate and substatus_id | Unit | F1 | US-1.9 | `closedDate = null`; `substatus_id = null`; `status = 'open'` |
| TEST-F1-10 | Ticket history PII masked for anonymous caller | Integration | F1 | US-1.10 | `enteredByPerson_id` null for anonymous response |
| TEST-F1-11 | Ticket history ordered by enteredDate ASC | Integration | F1 | US-1.10 | History entries returned in chronological order |
| TEST-F1-12 | Staff comment not visible to public caller | Integration | F1 | US-1.7 | `comment` action absent from public caller's history response |
| TEST-F1-13 | Update triggers Solr re-index | Integration | F1 | US-1.4 | Solr document updated after ticket update |
| TEST-F1-14 | Category change logs changeCategory action | Integration | F1 | US-1.4 | `ticketHistory` row with `action = 'changeCategory'` and `data = {original, updated}` |
| TEST-F1-15 | Location change logs changeLocation action | Integration | F1 | US-1.4 | `ticketHistory` row with `action = 'changeLocation'` |
| TEST-F1-16 | Geo-clusters re-assigned on lat/lon change | Integration | F1 | US-1.4 | `ticket_geodata` row updated after location change |
| TEST-F2-01 | Anonymous cannot access admin endpoint | Integration | F2 | US-2.1 | HTTP 403 for `GET /categories` (staff-only endpoint) |
| TEST-F2-02 | Anonymous cannot see PII fields | Integration | F2 | US-2.1 | `reportedByPerson_id` null in anonymous response |
| TEST-F2-03 | Public role cannot assign ticket | Integration | F2 | US-2.2 | HTTP 403 for `POST /tickets/:id/assign` with public session |
| TEST-F2-04 | Public role sees only own ticket history | Integration | F2 | US-2.2 | `GET /tickets` for public only returns own tickets |
| TEST-F2-05 | Staff can manage all tickets | Integration | F2 | US-2.3 | Staff can close ticket in staff-only category |
| TEST-F2-06 | CASL ability anonymous vs public vs staff | Unit | F2 | US-2.3 | AbilityFactory returns correct ability per role |
| TEST-F2-07 | Category displayPermissionLevel filter applied | Integration | F2 | US-2.4 | Anonymous caller does not see staff-only category in list |
| TEST-F2-08 | PII masking applied in all 5 formats | Integration | F2 | US-2.5 | reportedByPerson_id absent in JSON/XML/CSV/TXT/HTML for non-staff |
| TEST-F2-09 | role=null treated as public | Unit | F2 | US-2.3 | User with `role = null` cannot access staff route |
| TEST-F2-10 | RBAC parity: all Laminas ACL rules replicated | E2E | F2 | US-2.3 | 100% of RBAC test cases produce same allow/deny as PHP |
| TEST-F3-01 | URL suffix .json overrides Accept header | Unit | F3 | US-3.4 | .json suffix returns JSON even with Accept: text/html |
| TEST-F3-02 | URL suffix .xml overrides Accept header | Unit | F3 | US-3.4 | .xml suffix returns XML even with Accept: application/json |
| TEST-F3-03 | JSON response is byte-compatible with PHP output | E2E | F3 | US-3.1 | Zero character differences on fixture dataset |
| TEST-F3-04 | XML response is byte-compatible with PHP output | E2E | F3 | US-3.2 | Zero character differences on fixture dataset |
| TEST-F3-05 | CSV includes UTF-8 BOM and header row | Integration | F3 | US-3.3 | First bytes are `\xEF\xBB\xBF`; first row is header |
| TEST-F3-06 | TXT output tab-separated, no header | Integration | F3 | US-3.6 | Lines contain tabs; no header line present |
| TEST-F3-07 | Default format is JSON for /open311/v2/ | Unit | F3 | US-3.4 | No Accept header → JSON response for Open311 route |
| TEST-F3-08 | Default format is HTML for non-Open311 routes | Unit | F3 | US-3.4 | No Accept header → HTML response for /tickets route |
| TEST-F3-09 | Error response format-negotiated | Integration | F3 | US-3.4 | 404 response is JSON for .json request; XML for .xml request |
| TEST-F4-01 | Login initiates OIDC redirect with state+nonce | Integration | F4 | US-4.1 | 302 redirect to IdP; state+nonce in session |
| TEST-F4-02 | Callback validates state mismatch returns 400 | Integration | F4 | US-4.2 | Modified state → HTTP 400; INVALID_STATE |
| TEST-F4-03 | First login creates people record | Integration | F4 | US-4.2 | New `people` row with username=sub after first callback |
| TEST-F4-04 | Subsequent login updates firstname/lastname | Integration | F4 | US-4.2 | Changed claim → `people.firstname` updated on login |
| TEST-F4-05 | Session cookie is HttpOnly+Secure+SameSite=Lax | Integration | F4 | US-4.3 | Cookie flags verified in Set-Cookie header |
| TEST-F4-06 | Logout destroys session | Integration | F4 | US-4.4 | Session absent after logout; subsequent request is anonymous |
| TEST-F4-07 | PUT /account cannot change role or username | Integration | F4 | US-4.5 | role unchanged after PUT /account with role override attempt |
| TEST-F5-01 | Search returns only role-visible tickets | Integration | F5 | US-5.1 | Anonymous search excludes staff-only category tickets |
| TEST-F5-02 | eDisMax field boosts applied correctly | Unit | F5 | US-5.1 | Query object contains `qf=description^2 location^1.5 ...` |
| TEST-F5-03 | Facets returned with correct counts | Integration | F5 | US-5.3 | facets.categories, facets.statuses, facets.departments in response |
| TEST-F5-04 | Ticket indexed on create | Integration | F5 | US-5.4 | Solr document present within 1 second of ticket creation |
| TEST-F5-05 | Re-index script indexes all tickets | Integration | F5 | US-5.5 | After reindex, COUNT in Solr equals COUNT in PostgreSQL |
| TEST-F5-06 | Solr unavailability does not fail ticket write | Integration | F5 | US-5.4 | Ticket created successfully even when Solr connection refused |
| TEST-F5-07 | Search result sets match legacy Solarium output | E2E | F5 | US-5.1 | Same IDs, same order as PHP for same query on migrated dataset |
| TEST-F6-01 | All 21 tables present in PostgreSQL after migration | Integration | F6 | US-6.1 | `information_schema.tables` shows all 21 tables |
| TEST-F6-02 | TINYINT(1) columns are BOOLEAN in PostgreSQL | Integration | F6 | US-6.1 | Data type check via `information_schema.columns` |
| TEST-F6-03 | POINT column is geometry(Point, 4326) | Integration | F6 | US-6.1 | `geoclusters.center` data type verified |
| TEST-F6-04 | Row counts match MySQL source per table | E2E | F6 | US-6.3 | Zero mismatches across all 21 tables |
| TEST-F6-05 | Seed data present after migration | Integration | F6 | US-6.4 | 4+3+10+3+6 rows in reference tables |
| TEST-F6-06 | Prisma schema passes prisma validate | Unit | F6 | US-6.5 | `prisma validate` exits with 0 |
| TEST-F6-07 | FK constraints enforced in PostgreSQL | Integration | F6 | US-6.1 | Insert with invalid FK returns PostgreSQL error |
| TEST-F6-08 | IDENTITY sequences reset after migration | Integration | F6 | US-6.2 | `nextval('tickets_id_seq')` > MAX(id) in tickets |
| TEST-F7-01 | Open notification sent on ticket create | Integration | F7 | US-7.1 | Nodemailer transport called with open action template |
| TEST-F7-02 | Template resolved from category_action_responses first | Unit | F7 | US-7.5 | Override template used when category+action record exists |
| TEST-F7-03 | Email failure logged to GELF and suppressed | Unit | F7 | US-7.1 | SMTP error → GELF warn logged; ticket creation succeeds |
| TEST-F7-04 | sentNotifications logged to ticketHistory | Integration | F7 | US-7.1 | `sentNotifications` field populated after email send |
| TEST-F7-05 | Assignment email sent to assignee and reporter | Integration | F7 | US-7.2 | Two separate emails sent for assignment action |
| TEST-F7-06 | Duplicate email sent to child ticket reporter | Integration | F7 | US-7.4 | Reporter of child ticket receives duplicate notification |
| TEST-F7-07 | Digest cron runs on configured schedule | Integration | F7 | US-7.6 | DigestScheduler executes; digest emails sent |
| TEST-F8-01 | Upload accepted for valid MIME type | Integration | F8 | US-8.1 | image/jpeg accepted; media record created; ticketHistory updated |
| TEST-F8-02 | Upload rejected for oversized file | Integration | F8 | US-8.1 | HTTP 413 when file exceeds MEDIA_MAX_BYTES |
| TEST-F8-03 | Thumbnail generated for image upload | Integration | F8 | US-8.2 | Thumbnail file exists at expected path after upload |
| TEST-F8-04 | Stream attachment returns correct Content-Type | Integration | F8 | US-8.3 | Content-Type header matches media.mime_type |
| TEST-F8-05 | Delete removes file and thumbnail from disk | Integration | F8 | US-8.4 | File and thumbnail absent from disk after delete |
| TEST-F8-06 | Anonymous upload returns 401 | Integration | F8 | US-8.1 | No session → HTTP 401 |
| TEST-F9-01 | Cluster assigned for ticket with lat/lon | Integration | F9 | US-9.2 | ticket_geodata row exists with 7 cluster_id columns |
| TEST-F9-02 | Cluster re-assigned on location change | Integration | F9 | US-9.3 | ticket_geodata updated after lat/lon change |
| TEST-F9-03 | ticket_geodata row deleted when lat/lon cleared | Integration | F9 | US-9.3 | ticket_geodata absent after lat/lon set to null |
| TEST-F9-04 | GET /locations returns clusters at zoom level | Integration | F9 | US-9.1 | Correct zoom_level clusters returned; role-filtered |
| TEST-F9-05 | Re-cluster script rebuilds all assignments | E2E | F9 | US-9.4 | ticket_geodata row count matches tickets with lat/lon after recluster |
| TEST-F9-06 | KNN uses PostGIS <-> operator | Unit | F9 | US-9.2 | Raw SQL query contains `<->` operator |
| TEST-F10-01 | Create category with all fields | Integration | F10 | US-10.1 | Category persisted with customFields JSON and slaDays |
| TEST-F10-02 | Cannot delete category with tickets | Integration | F10 | US-10.2 | HTTP 409 when deleting category with linked tickets |
| TEST-F10-03 | Department-category association managed | Integration | F10 | US-10.5 | POST/DELETE department_categories link works |
| TEST-F10-04 | Category action response overrides email template | Integration | F10 | US-10.6 | category_action_responses.template used in notification |
| TEST-F11-01 | Create person with unique username | Integration | F11 | US-11.1 | Person created; duplicate username returns HTTP 409 |
| TEST-F11-02 | api_key revoked immediately on active=false | Integration | F11 | US-11.6 | POST /open311/v2/requests with deactivated key → HTTP 403 |
| TEST-F11-03 | Person search by name returns matches | Integration | F11 | US-11.4 | Search by firstname matches correct records |
| TEST-F11-04 | Email with usedForNotifications flag | Integration | F11 | US-11.2 | Only flagged emails receive notifications |
| TEST-F12-01 | Create bookmark scoped to currentUser | Integration | F12 | US-12.1 | bookmark.person_id = currentUser.id |
| TEST-F12-02 | Delete bookmark returns 404 for other user's bookmark | Integration | F12 | US-12.3 | HTTP 404 (not 403) for unauthorized delete |
| TEST-F12-03 | List bookmarks returns only own bookmarks | Integration | F12 | US-12.2 | No bookmarks from other users in response |
| TEST-F13-01 | GET /metrics returns correct aggregate counts | Integration | F13 | US-13.1 | openCount + closedCount = totalCount |
| TEST-F13-02 | GET /reports returns CSV with matching rows | Integration | F13 | US-13.2 | CSV row count matches HTML view for same filters |
| TEST-F13-03 | Metrics filtered by date range | Integration | F13 | US-13.1 | Only tickets in date range included in counts |
| TEST-F14-01 | Every HTTP request logged to GELF | Integration | F14 | US-14.1 | Graylog receives GELF message per request |
| TEST-F14-02 | Exception logged with stack trace | Integration | F14 | US-14.2 | ERROR level message includes `full_message` with stack |
| TEST-F14-03 | _ticket_id present in ticket operation logs | Integration | F14 | US-14.3 | Ticket create log includes `_ticket_id` field |
| TEST-F15-01 | Seed sub-statuses present after migration | Integration | F15 | US-15.1 | 3 rows in substatus: Resolved, Duplicate, Bogus |
| TEST-F15-02 | System action cannot be deleted | Integration | F15 | US-15.2 | HTTP 409 or error when deleting `open` system action |
| TEST-F15-03 | Sub-status referenced by ticket cannot be deleted | Integration | F15 | US-15.1 | HTTP 409 when deleting substatus in use |
| TEST-F15-04 | isDefault unique per status value | Unit | F15 | US-15.1 | Second `isDefault=true` for same status value returns error |

---

## 6. Dependency Traceability

### 6.1 Feature Dependency Graph

```
F4 (OIDC Auth)      ──► F2 (RBAC)
F6 (Migration)      ──► F2 (RBAC)    ──► F0 (Open311 API)
                    ──► F1 (Tickets)  ──► F7 (Email Notifications)
                                      ──► F8 (Media)
                                      ──► F9 (Geo-Clustering)
F6 (Migration)      ──► F5 (Solr)    ──► F12 (Bookmarks)
F3 (Serialization)  ──► F0, F1, F5, F13 (all output endpoints)
F15 (Ref Data)      ──► F1 (Tickets) ──► F7 (Email)
F10 (Category Admin)──► F2 (RBAC)
F11 (People/Clients)──► F0 (Open311 api_key), F2 (RBAC)
```

### 6.2 NFR-to-Feature Mapping

| NFR | Primary Features | Test Approach |
|-----|-----------------|---------------|
| NFR-1: API Compatibility | F0 | Byte-diff integration tests (TEST-F0-15, -16) against PHP fixtures |
| NFR-2: Content Negotiation Parity | F3 | Snapshot tests per format × endpoint (TEST-F3-03, -04) |
| NFR-3: Data Fidelity | F6 | Row-count verification script (TEST-F6-04); field-value comparison |
| NFR-4: TypeScript Strictness | All | `tsc --strict` in CI; zero `any` lint rule |
| NFR-5: Test Coverage | All | Jest coverage ≥ 80% on all service classes; total 198 test cases |
| NFR-6: Performance | F0, F1, F5 | p95 ≤ 200ms under load test; Solr search ≤ 500ms (US-5.1) |
| NFR-7: Security | F2, F4, F11 | RBAC parity test (TEST-F2-10); PII masking tests (TEST-F2-08) |
| NFR-8: Observability | F14 | GELF message verified per request (TEST-F14-01, -02) |
| NFR-9: Database | F6 | No MySQL dependency in `package.json` or source code |
| NFR-10: Search Engine | F5 | Solr client retained; no Elasticsearch in dependency tree |
| NFR-11: OIDC Compliance | F4 | Login flow replay integration tests (TEST-F4-01 to -07) |
| NFR-12: Spatial Accuracy | F9 | Centroid coordinates validated to 6 decimal places (TEST-F9-05) |

---

## 7. Change Management Log

| Version | Date | Author | Change Description | Affected Features | Approved By |
|---------|------|--------|-------------------|-------------------|-------------|
| 1.0 | 2026-06-23 | RTM Generator (claude-sonnet-4-6) | Initial RTM created from PRD v1.0, FRD v1.0, TechArch v1.0, UserStories v1.0 | F0–F15 | — |

### Change Impact Rules

- **PRD feature change** → Update FRD sub-requirements, TechArch component, user stories, and test cases in this RTM
- **FRD sub-requirement change** → Update corresponding TechArch implementation spec and acceptance criteria
- **TechArch module rename/split** → Update Module column in Section 3 and Section 4
- **New user story** → Add to Section 3.1 table, Section 5.1 story count, and Section 5.2 test case table
- **New test case** → Add to Section 5.2; update coverage count in Section 5.1

---

## 8. Approval & Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | — | ___________________________ | __________ |
| Technical Lead | — | ___________________________ | __________ |
| QA Lead | — | ___________________________ | __________ |
| Security Reviewer | — | ___________________________ | __________ |
| Database Administrator | — | ___________________________ | __________ |
| Department Supervisor (Go/No-Go) | — | ___________________________ | __________ |

### Approval Criteria

Before sign-off, the following must be verified:

- [ ] All 16 PRD features (F0–F15) have at least one FRD sub-requirement mapped
- [ ] All 16 FRD feature chunks (F00–F15) have a corresponding TechArch module or component mapped
- [ ] All 80 User Stories are linked to a PRD feature and a set of test cases
- [ ] All 198 test cases have a unique TEST-ID and a verifiable pass criterion
- [ ] All NFRs (NFR-1 through NFR-12) are mapped to test approaches
- [ ] Feature dependency graph accurately reflects PRD dependency table
- [ ] No FRD sub-requirement is left without a corresponding User Story
- [ ] No TechArch module exists without a corresponding FRD sub-requirement

---

## 9. Related Documents

| Document | Path | Role in Traceability |
|----------|------|---------------------|
| Product Requirements Document | `project_specs/PRD-uReport.md` | Source of F0–F15 features, priorities, and NFRs |
| Functional Requirements Document | `project_specs/FRD-uReport.md` | Source of F00–F15 sub-requirements, inputs, outputs, error states |
| Technical Architecture Document | `project_specs/TechArch-uReport.md` | Source of module structure, DDL, API endpoints, CASL rules |
| User Stories | `project_specs/UserStories-uReport.md` | Source of 80 stories and acceptance criteria |
| Project Brief | `.planning/PROJECT.md` | Source of constraints, context, and out-of-scope boundaries |
| MySQL Schema (Legacy) | `crm/scripts/mysql.sql` | Source of truth for F6 DDL translation |
| PostgreSQL DDL | `project_specs/TechArch-uReport.md §3.2` | Target schema for F6 |
| Prisma Schema | `prisma/schema.prisma` | ORM source of truth (to be generated) |

---

*RTM generated: 2026-06-23 | Based on: PRD-uReport.md v1.0, FRD-uReport.md v1.0, TechArch-uReport.md v1.0, UserStories-uReport.md v1.0 | Model: claude-sonnet-4-6*
