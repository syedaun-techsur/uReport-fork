# uReport

## What This Is

uReport is an Open311 / GeoReport v2 constituent-request CRM for municipalities. Citizens and staff create and track service "tickets" routed through categories, departments, and assignees, with role-based permissions, full-text search, and machine-readable feeds (JSON, XML, CSV, TXT). The project re-platforms the existing PHP/MySQL implementation to Node.js/TypeScript/NestJS/PostgreSQL while preserving full feature, behavior, and public-API parity.

## Core Value

Every existing public contract — the Open311 GeoReport v2 REST API routes, content-negotiated response formats, permission rules, and data semantics — must be byte-compatible with the original after the re-platform, so external API consumers are completely unaffected.

## Requirements

### Validated

- ✓ Open311 / GeoReport v2 REST API — existing
- ✓ Ticket lifecycle (create, update, close, duplicate, assign) — existing
- ✓ Role-based access control (staff, public, anonymous) — existing
- ✓ Category / department / person routing — existing
- ✓ Content negotiation (HTML, JSON, XML, CSV, TXT) per endpoint — existing
- ✓ Full-text search via Apache Solr — existing
- ✓ OIDC authentication (facile-it / openid-client) — existing
- ✓ Email notifications via PHPMailer — existing
- ✓ GELF/Graylog structured logging — existing
- ✓ Media/attachment upload per ticket — existing
- ✓ Ticket history / audit trail — existing
- ✓ Geo-clustering of ticket locations — existing
- ✓ Bookmarked searches per user — existing
- ✓ Sub-status management (Resolved, Duplicate, Bogus) — existing
- ✓ Custom fields per category — existing
- ✓ SLA day tracking per category — existing
- ✓ API client management (api_key, contactPerson) — existing

### Active

- [ ] Re-platform to Node.js (LTS) + TypeScript (strict) on NestJS
- [ ] Migrate database from MySQL/MariaDB to PostgreSQL with full schema translation
- [ ] Implement Prisma (or TypeORM) ORM layer replacing ActiveRecord + PdoRepository
- [ ] Implement multi-format serialization interceptor (JSON/XML/CSV/TXT) + server-side HTML templates
- [ ] Replace Solarium with Node Solr client, preserving all search behavior
- [ ] Replace facile-it OIDC with openid-client, preserving login flow
- [ ] Replace Laminas ACL with CASL guards, preserving all permission rules
- [ ] Replace PHPMailer with Nodemailer, preserving all email templates/triggers
- [ ] Retain GELF logging via Node GELF client
- [ ] Write data-migration script (MySQL → PostgreSQL) with row-count verification
- [ ] Achieve byte-compatible Open311 GeoReport v2 API responses
- [ ] Achieve content-negotiation parity (HTML/JSON/XML/CSV/TXT) on all endpoints
- [ ] Preserve geo-clustering logic with PostGIS or equivalent

### Out of Scope

- New features beyond the existing PHP application — full parity first
- Mobile-native apps — web application only
- Database engine other than PostgreSQL — target is PG only
- Changing the Open311 API contract — non-negotiable public interface

## Context

**Existing codebase:** PHP + MySQL application under `crm/`. Custom bespoke MVC framework: `Controller`, `View`, `Template`, `Url`, `Block`, `ActiveRecord`, `PdoRepository`, `Database` under `crm/src/Application`. Paired `Model` / `ModelTable` (ActiveRecord + Table-Data-Gateway) classes. Content-negotiated "Blocks" rendering data as HTML, JSON, XML, CSV, TXT via ~187 `.inc` PHP partial templates. Superglobals/globals (`$_SESSION`, `$_GET`, `header()`/`exit()`, `BASE_URL`) throughout.

**Database schema:** `crm/scripts/mysql.sql` — 285 lines. Tables: `departments`, `people`, `peopleEmails`, `peoplePhones`, `peopleAddresses`, `contactMethods`, `clients`, `substatus`, `actions`, `categoryGroups`, `categories`, `category_action_responses`, `department_actions`, `department_categories`, `tickets`, `issueTypes`, `ticketHistory`, `media`, `bookmarks`, `geoclusters`, `ticket_geodata`. MySQL-specific: `AUTO_INCREMENT`, backtick identifiers, `TINYINT(1)`, `ENUM`, spatial `POINT` type, `SRID 0` for geo-clustering.

**Current integrations:**
- Apache Solr via Solarium (PHP) — full-text ticket search
- OIDC via facile-it/oidc-client
- ACL via Laminas ACL
- Email via PHPMailer
- Logging via Graylog/GELF

**Target stack:**
- Runtime: Node.js LTS + TypeScript (strict)
- Framework: NestJS (modular controllers, services, DI)
- ORM: Prisma (preferred) or TypeORM
- Database: PostgreSQL
- Search: Node Solr client (preserving Solr)
- Auth: openid-client (OIDC)
- Permissions: CASL guards
- Email: Nodemailer
- Logging: GELF Node client

## Constraints

- **API Compatibility**: Open311 GeoReport v2 routes, params, status codes, and response bodies must be byte-compatible — external consumers must not need changes
- **Content Negotiation**: All endpoints must support HTML/JSON/XML/CSV/TXT output identical to the original
- **Data Semantics**: After MySQL→PostgreSQL migration, results, ordering, null handling, and boolean semantics must match exactly
- **Tech Stack**: Node.js LTS + TypeScript strict + NestJS + PostgreSQL — no deviation
- **Search Engine**: Apache Solr retained (not replaced with Elasticsearch or pg_trgm)
- **OIDC Flow**: Same login flow and session behavior as the original

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| NestJS as framework | Modular DI architecture maps cleanly to the existing Controller/Service/Repository pattern; decorator-based routing mirrors PHP controller dispatch | — Pending |
| Prisma as ORM | Strong TypeScript types, migration tooling, PostgreSQL DDL generation from schema; avoids raw-SQL ActiveRecord pitfalls | — Pending |
| CASL for ACL | Attribute-based access control library; maps Laminas ACL resource/privilege model to TypeScript guards | — Pending |
| Keep Solr (not replace) | Solr query behavior, ranking, and field mappings must match; re-indexing into a new engine risks divergence | — Pending |
| Serialization interceptor layer | NestJS interceptors for JSON/XML/CSV/TXT output replaces the Block/Template content-negotiation pattern without duplicating controller logic | — Pending |
| PostgreSQL with PostGIS for geo | `POINT` spatial type and geo-cluster logic translates naturally to PostGIS; preserves spatial indexing semantics | — Pending |

---
*Last updated: 2026-06-23 after initialization*
