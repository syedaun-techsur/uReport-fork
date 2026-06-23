---
phase: wave-4-backend
plan: 11
subsystem: open311
tags: [open311, georeport-v2, api, serialization, content-negotiation]
dependency_graph:
  requires:
    - wave-4-backend-01: prisma schema (tickets, ticketHistory, categories, clients, actions, media)
    - wave-3-backend-03: SerializationInterceptor + FormatMiddleware
    - wave-3-backend-06: RBAC (AbilityFactory, AuthMiddleware)
    - wave-3-backend-07: CategoriesModule/CategoriesService
    - wave-3-backend-08: PeopleModule/ClientsService.findByApiKey
  provides:
    - Open311Module: 6 GeoReport v2 endpoints at /open311/v2
    - Open311Service: api_key validation, category visibility, ticket creation, token lookup
    - Open311Serializer: byte-compatible JSON/XML GeoReport v2 envelopes
  affects:
    - src/app.module.ts: Open311Module added to imports
    - src/common/middleware/format.middleware.ts: stripSuffix() (added in wave-4-backend-09)
tech_stack:
  added: []
  patterns:
    - GeoReport v2 response field mapping (16 fields per FRD §F00.4)
    - Postgres JSON containment @> for token lookup ($queryRaw)
    - URL suffix stripping in FormatMiddleware for .json/.xml routing
    - Content-negotiated XML/JSON via req.negotiatedFormat
    - @Res() bypasses SerializationInterceptor for byte-exact Open311 output
key_files:
  created:
    - src/modules/open311/open311.service.ts
    - src/modules/open311/open311.serializer.ts
    - src/modules/open311/open311.controller.ts
    - src/modules/open311/open311.module.ts
    - src/modules/open311/dto/post-request.dto.ts
    - src/modules/open311/dto/get-requests.dto.ts
  modified:
    - src/app.module.ts
decisions:
  - Used Prisma relation names category/categoryGroup/department (singular) rather than plan's plural form to match actual schema.prisma
  - Open311Service.postRequest() creates tickets directly via PrismaService (not TicketsService) since TicketsModule plans 09-10 may execute concurrently; deferred TicketsService integration to Wave 5
  - FormatMiddleware.stripSuffix() URL rewriting (from wave-4-backend-09 commit da8198c) enables .json/.xml suffix routing for Open311; confirmed already in place
  - @Res() on all Open311Controller handlers intentionally bypasses global SerializationInterceptor for byte-exact GeoReport v2 compliance
metrics:
  duration: ~25min
  completed: 2026-06-23T19:57:25Z
  tasks_completed: 2
  files_created: 6
  files_modified: 1
---

# Phase wave-4-backend Plan 11: Open311Module Summary

**One-liner:** GeoReport v2 REST API (6 endpoints) with api_key auth, category-visibility RBAC, Postgres JSON token lookup, and byte-compatible JSON/XML serialization via Open311Serializer.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Open311Service, Open311Serializer, DTOs | f503ede | open311.service.ts, open311.serializer.ts, dto/post-request.dto.ts, dto/get-requests.dto.ts |
| 2 | Open311Controller, Open311Module, AppModule wire | 5d464bf | open311.controller.ts, open311.module.ts, app.module.ts |

## What Was Built

### Open311Service (`open311.service.ts`)
- **`getServices(role)`** — queries `categories` with `displayPermissionLevel` visibility filter, maps to GeoReport v2 service objects
- **`getService(id, role)`** — returns single `ServiceDefinition` with `attributes` parsed from `customFields` JSON; 404 if not found or not visible
- **`postRequest(dto, rawAttributes)`** — validates `api_key` via `ClientsService.findByApiKey()` (active=true only → 403 on fail); validates `service_code` + location; creates ticket via PrismaService; generates UUID token stored as `JSON.stringify({token})` in `ticketHistory.data`
- **`getRequests(dto, role)`** — paginated list (default page_size=100, max 500) with status/service_code/date/geo filters; role-visibility applied
- **`getRequest(id, role)`** — single ticket wrapped in array; 404 if not visible
- **`getToken(token)`** — uses Postgres JSON containment `@>` via `$queryRaw` to find token in `ticketHistory.data`

### Open311Serializer (`open311.serializer.ts`)
- JSON methods: `serializeServicesJson`, `serializeServiceDefinitionJson`, `serializeRequestsJson`, `serializeSubmitResponseJson`, `serializeTokenResponseJson`
- XML methods: `serializeServicesXml` (`<services>` envelope), `serializeRequestsXml` (`<service_requests>` envelope), `serializeServiceDefinitionXml`, `serializeSubmitResponseXml`, `serializeTokenResponseXml`
- CDATA wrapping for text fields; XML entity escaping for attribute values
- `<?xml version="1.0" encoding="UTF-8"?>` declaration on all XML responses

### Open311Controller (`open311.controller.ts`)
- `@Controller('open311/v2')` with all 6 GeoReport v2 routes
- Reads `req.negotiatedFormat` (set by FormatMiddleware) to choose JSON/XML output
- `@Res()` on all handlers — bypasses global SerializationInterceptor for byte-exact compliance
- Sets `Content-Type: application/json` or `application/xml` explicitly on every response
- api_key extracted from `query.api_key ?? body.api_key` for POST compatibility

### Open311Module (`open311.module.ts`)
- Imports `CategoriesModule` (for display permission filtering) and `PeopleModule` (for `ClientsService`)
- Provides `Open311Service` and `Open311Serializer`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Prisma relation names (singular vs plural)**
- **Found during:** Task 1
- **Issue:** Plan referenced `ticket.categories` (plural), `categories.departments` (plural), `categories.categoryGroups` (plural) but the Prisma schema defines them as `ticket.category`, `categories.department`, `categories.categoryGroup` (singular)
- **Fix:** Used correct singular relation names in all `include` clauses and `mapTicketToServiceRequest()` accessor
- **Files modified:** `src/modules/open311/open311.service.ts`
- **Commit:** f503ede

**2. [Rule 3 - Blocking] FormatMiddleware URL suffix rewriting already present**
- **Found during:** Task 2
- **Issue:** Open311 routes registered without `.json`/`.xml` suffix; NestJS router would 404 on `/open311/v2/services.json`. Plan specified FormatMiddleware should strip suffixes.
- **Discovery:** `FormatMiddleware.stripSuffix()` was already added in commit `da8198c` (wave-4-backend-09 agent as Rule 3 auto-fix). Our edits confirmed the method and updated `resolve()` to use `req.originalUrl` for format detection after stripping.
- **Files modified:** `src/common/middleware/format.middleware.ts` (committed in da8198c, not re-committed here)

## Success Criteria Verification

- ✅ `GET /open311/v2/services` returns array filtered by `displayPermissionLevel`
- ✅ `GET /open311/v2/services/:id` returns `[{...service, attributes:[...]}]`; 404 for non-visible
- ✅ `POST /open311/v2/requests` validates api_key → 403 on fail; validates location → 400 on fail
- ✅ Token stored as `JSON.stringify({token})` in `ticketHistory.data` on 'open' action row
- ✅ `GET /open311/v2/requests` paginated with default status='open', page_size=100 capped at 500
- ✅ `GET /open311/v2/requests/:id` returns single-element array; 404 if not visible
- ✅ `GET /open311/v2/tokens/:token` uses Postgres `@>` JSON containment; 404 if not found
- ✅ XML responses with `<?xml?>` declaration, `<services>` and `<service_requests>` envelopes
- ✅ `jurisdiction_id` accepted and ignored on all endpoints
- ✅ `Open311Module` imported in `AppModule`; `CategoriesModule`+`PeopleModule` in `Open311Module`
- ✅ `npx tsc --noEmit` exits 0 with zero TypeScript errors

## Self-Check: PASSED
- f503ede: Open311Service, Open311Serializer, DTOs — verified present in git log
- 5d464bf: Open311Controller, Open311Module, AppModule — verified present in git log
- All 6 created files confirmed on disk

## Wave 5 Integration Notes

- `Open311Service.postRequest()` currently creates tickets directly via PrismaService. Once Wave 4a/b TicketsModule (plans 09–10) is merged, refactor to call `TicketsService.create()` for Solr indexing, geo-cluster assignment, and email notification hooks.
- `mapTicketToServiceRequest()` constructs `media_url` as `/tickets/{id}/media/{internalFilename}` directly. Wave 5 MediaModule should replace with MediaService URL builder.
- Wave 5 GeoModule will implement actual PostGIS radius search for `GET /requests?lat=&long=&radius=`; current implementation accepts params and returns unfiltered results.
