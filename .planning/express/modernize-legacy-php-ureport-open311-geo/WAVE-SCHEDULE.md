# Wave Schedule — Modernize Legacy PHP uReport (Open311 GeoReport v2)

**Project:** uReport Re-Platform — PHP/MySQL → Node.js/TypeScript/NestJS/PostgreSQL  
**Generated:** 2026-06-23  
**Total Features:** 16 (F0–F15)  
**Total Waves:** 6  

---

## Dependency Analysis

| Feature | PRD Deps | Resolved Deps |
|---------|----------|---------------|
| F6: Schema Migration | — | (none — foundation) |
| F3: Content Negotiation | — | (none — cross-cutting interceptor) |
| F14: GELF Logging | — | (none — cross-cutting service) |
| F4: OIDC Authentication | F6 | F6 |
| F2: RBAC | F4, F6 | F4, F6 |
| F15: Sub-Status & Actions Reference | F6 | F6 |
| F1: Ticket Lifecycle | F2, F6, F7 | F2, F6, F7 |
| F0: Open311 API | F2, F3, F6 | F2, F3, F6 |
| F10: Category & Dept Admin | F2, F6 | F2, F6 |
| F11: People & Client Mgmt | F2, F6 | F2, F6 |
| F7: Email Notifications | F1, F15 | F1, F15 |
| F5: Full-Text Search (Solr) | F1, F6 | F1, F6 |
| F8: Media & Attachments | F1, F2 | F1, F2 |
| F9: Geo-Clustering | F1, F6 | F1, F6 |
| F12: Bookmarked Searches | F4, F5 | F4, F5 |
| F13: Reporting & Metrics | F1, F2, F3 | F1, F2, F3 |

---

## Wave Schedule

```yaml
wave: 1
domain: database
depends_on: []
features: [F6]
objective: >
  Translate all 21 MySQL tables to PostgreSQL DDL with PostGIS spatial support,
  generate Prisma schema (21 models, FK relations, geometry types), author the
  data-migration script (MySQL → PostgreSQL with TINYINT→BOOLEAN, POINT→ST_GeomFromText,
  UTC handling, IDENTITY sequence reset), write the row-count verification script,
  and seed the 5 reference tables (substatus, actions, issueTypes, contactMethods,
  categoryGroups). This wave is the foundation for every other feature.
estimated_plans: 2

---

wave: 2
domain: backend
depends_on: [1]
features: [F3, F4, F14, F15]
objective: >
  Stand up the four cross-cutting / foundational backend components that all
  subsequent modules depend on: (F3) the global SerializationInterceptor with
  all five format serializers (JSON/XML/CSV/TXT/HTML via Handlebars/Nunjucks);
  (F4) the AuthModule with OIDC authorization-code flow via openid-client, Redis
  session management, and people-record upsert; (F14) the GelfLoggerService wrapping
  gelf-pro as the NestJS LoggerService with request middleware and exception filter;
  (F15) the AdminModule seeding and staff CRUD for substatus, actions, issueTypes,
  and contactMethods reference tables with system-action protection rules.
estimated_plans: 3

---

wave: 3
domain: backend
depends_on: [1, 2]
features: [F2, F10, F11]
objective: >
  Implement the RBAC layer and core administration modules that gate all ticket
  and content access: (F2) AbilityFactory + CaslGuard with the three-tier role
  hierarchy (anonymous/public/staff), category-permission WHERE filtering, and
  PII-masking interceptor — reproducing every Laminas ACL rule; (F10) CategoriesModule
  and DepartmentsModule with full staff CRUD for categories, category groups,
  departments, department_categories M:M, department_actions M:M, and
  category_action_responses upsert; (F11) PeopleModule with staff CRUD for people,
  peopleEmails, peoplePhones, peopleAddresses, and clients (api_key lifecycle) plus
  person-search and the /users staff list endpoint.
estimated_plans: 3

---

wave: 4
domain: backend
depends_on: [1, 2, 3]
features: [F1, F0]
objective: >
  Implement the two highest-value P0 backend features that depend on RBAC and
  the full schema: (F1) TicketsModule with the complete ticket lifecycle —
  create, assign, update, close, duplicate, comment, response, re-open, and
  view history — including ticketHistory audit trail, Solr indexing hooks, geo-cluster
  hooks, email-notification hooks, PII masking, and all-five-format history output;
  (F0) Open311Module delivering byte-compatible GeoReport v2 responses across all
  six endpoints (GET/POST /requests, GET /services, GET /tokens/:token) with api_key
  validation, content-negotiated serialization, and role-visibility filtering.
  These two features together constitute the complete public API contract.
estimated_plans: 3

---

wave: 5
domain: integration
depends_on: [1, 2, 3, 4]
features: [F5, F7, F8, F9]
objective: >
  Wire all four P1 integration modules that hook into the completed ticket core:
  (F5) SearchModule — SolrService with eDisMax query construction, faceting,
  role-visibility filter injection, incremental indexing on ticket mutations, and
  the bulk re-index script; (F7) NotificationsModule — Nodemailer triggers on
  open/assign/close/response/comment/duplicate with category_action_responses
  template resolution, variable substitution, digest cron, and GELF failure
  suppression; (F8) MediaModule — upload, UUID storage, thumbnail generation, stream
  serving, audit trail, and staff-only delete; (F9) GeoModule — PostGIS KNN cluster
  assignment at 7 zoom levels, incremental upsert on lat/lon change, re-cluster
  script, and the /locations map endpoint.
estimated_plans: 4

---

wave: 6
domain: integration
depends_on: [1, 2, 3, 4, 5]
features: [F12, F13]
objective: >
  Deliver the two P2 feature modules that sit at the top of the dependency stack:
  (F12) BookmarksModule — authenticated CRUD for saved search URIs scoped to
  person_id (POST /bookmarks, GET /bookmarks ordered id DESC, DELETE /bookmarks/:id
  returning 204/404); (F13) ReportsModule — staff-only GET /metrics (openCount,
  closedCount, avgResolutionDays, byCategory, byDepartment with optional date range)
  and GET /reports (filterable, paginated, all 5 formats via SerializationInterceptor).
estimated_plans: 2

---
```

---

## WAVE SCHEDULE

| Wave | Domain | Plans | Features | Objective |
|------|--------|-------|----------|-----------|
| 1 | database | 2 | F6 | PostgreSQL DDL translation (21 tables), Prisma schema, data-migration script, row-count verification, reference-data seed |
| 2 | backend | 3 | F3, F4, F14, F15 | Cross-cutting foundations: SerializationInterceptor (5 formats), OIDC AuthModule + Redis sessions, GelfLoggerService, AdminModule reference-data CRUD |
| 3 | backend | 3 | F2, F10, F11 | RBAC layer (AbilityFactory + CaslGuard, 3-tier roles, PII masking) + CategoriesModule/DepartmentsModule admin CRUD + PeopleModule/ClientsModule admin CRUD |
| 4 | backend | 3 | F1, F0 | TicketsModule (full lifecycle + audit trail) + Open311Module (byte-compatible GeoReport v2 all 6 endpoints) |
| 5 | integration | 4 | F5, F7, F8, F9 | SearchModule (Solr/eDisMax) + NotificationsModule (Nodemailer triggers + digest) + MediaModule (upload/thumbnails/serve) + GeoModule (PostGIS KNN clustering) |
| 6 | integration | 2 | F12, F13 | BookmarksModule (saved search CRUD) + ReportsModule (metrics + filterable reports, all 5 formats) |

**Total features:** 16 | **Covered:** 16 (F0–F15) | **Uncovered:** 0

---

## Feature Coverage Verification

| ID | Feature | Priority | Wave | Domain |
|----|---------|----------|------|--------|
| F0 | Open311 GeoReport v2 REST API | P0 | 4 | backend |
| F1 | Ticket Lifecycle Management | P0 | 4 | backend |
| F2 | Role-Based Access Control (RBAC) | P0 | 3 | backend |
| F3 | Content Negotiation & Multi-Format Serialization | P0 | 2 | backend |
| F4 | OIDC Authentication | P0 | 2 | backend |
| F5 | Full-Text Search via Apache Solr | P1 | 5 | integration |
| F6 | MySQL-to-PostgreSQL Schema Migration | P0 | 1 | database |
| F7 | Email Notifications | P1 | 5 | integration |
| F8 | Media & Attachment Management | P1 | 5 | integration |
| F9 | Geo-Clustering of Ticket Locations | P1 | 5 | integration |
| F10 | Category & Department Administration | P1 | 3 | backend |
| F11 | People & API Client Management | P1 | 3 | backend |
| F12 | Bookmarked Searches | P2 | 6 | integration |
| F13 | Reporting & Metrics | P2 | 6 | integration |
| F14 | Structured Logging via GELF/Graylog | P2 | 2 | backend |
| F15 | Sub-Status & Action Reference Data | P2 | 2 | backend |

---

## Plan Count Summary

| Wave | Features | Estimated Plans | Rationale |
|------|---------|-----------------|-----------|
| 1 | F6 | 2 | Prisma schema + seed (plan 1); migration script + verification script (plan 2) |
| 2 | F3, F4, F14, F15 | 3 | SerializationInterceptor + FormatMiddleware (plan 1); AuthModule OIDC + sessions (plan 2); GelfLoggerService + AdminModule ref-data CRUD (plan 3) |
| 3 | F2, F10, F11 | 3 | AbilityFactory + CaslGuard RBAC (plan 1); CategoriesModule + DepartmentsModule CRUD (plan 2); PeopleModule + ClientsModule CRUD (plan 3) |
| 4 | F1, F0 | 3 | TicketsModule core CRUD + lifecycle (plan 1); TicketsModule history + actions + hooks (plan 2); Open311Module all 6 endpoints (plan 3) |
| 5 | F5, F7, F8, F9 | 4 | SearchModule Solr (plan 1); NotificationsModule email (plan 2); MediaModule upload/serve (plan 3); GeoModule PostGIS clustering (plan 4) |
| 6 | F12, F13 | 2 | BookmarksModule (plan 1); ReportsModule metrics + reports (plan 2) |
| **Total** | **16** | **17** | |

---

*Wave schedule generated: 2026-06-23*
