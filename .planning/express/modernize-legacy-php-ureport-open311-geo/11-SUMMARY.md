---
phase: wave-4-backend
plan: 11
subsystem: open311
tags: [open311, georeport-v2, rest-api, content-negotiation, xml, json, rbac]
dependency_graph:
  requires: [wave-3-backend-07-CategoriesModule, wave-3-08-PeopleModule, wave-1-01-PrismaSchema, wave-2-03-SerializationInterceptor]
  provides: [Open311Module, Open311Controller, Open311Service, Open311Serializer, PostRequestDto, GetRequestsDto]
  affects: [src/app.module.ts]
tech_stack:
  added: []
  patterns: [NestJS module, GeoReport v2, content negotiation, Postgres JSON containment, UUID token]
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
  - "Use correct Prisma relation names (category not categories, categoryGroup not categoryGroups) based on schema.prisma inspection"
  - "Open311Service does not inject Open311Serializer — serializer used only in controller for clean separation of concerns"
  - "postRequest() creates tickets directly via PrismaService rather than TicketsService (Wave 4a/b not yet built)"
metrics:
  duration: ~15min
  completed: "2026-06-23"
  tasks_completed: 2
  files_changed: 7
---

# Phase wave-4-backend Plan 11: Open311Module Summary

**One-liner:** Full GeoReport v2 Open311 API — 6 endpoints with api_key auth, RBAC visibility filtering, UUID token mechanics, and byte-compatible JSON/XML serialization.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Open311Service, Open311Serializer, DTOs | a2f3119 | ✅ |
| 2 | Open311Controller + Open311Module + AppModule wire | 2f5e6e3 | ✅ |

## What Was Built

### Open311Service (`src/modules/open311/open311.service.ts`)
- `getServices(role)` — queries `categories` with `displayPermissionLevel` filter, returns Open311ServiceDto array
- `getService(id, role)` — single category lookup with permission check; parses `customFields` JSON → attributes array
- `postRequest(dto, rawAttributes)` — validates api_key via `ClientsService.findByApiKey(active=true)`, creates ticket + ticketHistory with UUID token
- `getRequests(dto, role)` — paginated (default 100, max 500), status/service_code/date/id filters with permission gate
- `getRequest(id, role)` — single ticket → single-element array; 404 if category not visible
- `getToken(token)` — Postgres `$queryRaw` with JSON containment `@>` operator to find token in `ticketHistory.data`

### Open311Serializer (`src/modules/open311/open311.serializer.ts`)
- JSON: `serializeServicesJson`, `serializeServiceDefinitionJson`, `serializeRequestsJson`, `serializeSubmitResponseJson`, `serializeTokenResponseJson`
- XML: `serializeServicesXml` → `<services>`, `serializeRequestsXml` → `<service_requests>`, all with `<?xml version="1.0" encoding="UTF-8"?>` declaration
- CDATA wrapping for text fields; XML entity escaping for attribute values

### Open311Controller (`src/modules/open311/open311.controller.ts`)
- `@Controller('open311/v2')` with 6 routes
- Content negotiation via `req.negotiatedFormat` (set by FormatMiddleware); defaults to JSON
- Sets `Content-Type: application/json` or `application/xml` on every response
- `@Res()` used directly to bypass global SerializationInterceptor (intentional for byte-compatibility)
- api_key extracted from `query.api_key ?? body.api_key`; `jurisdiction_id` accepted and ignored

### DTOs
- `PostRequestDto` — all FRD §F00.3 inputs including `jurisdiction_id` (optional, ignored)
- `GetRequestsDto` — all FRD §F00.4 filter params; pagination defaults page=1, page_size=100

## Integration Points
- `CategoriesModule` → `CategoriesService` (visibility filtering via `displayPermissionLevel`)
- `PeopleModule` → `ClientsService.findByApiKey()` (api_key validation, active=true filter)
- `PrismaService` → direct ticket/ticketHistory creation via Prisma client
- `AppModule` → Open311Module added to imports array

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected Prisma relation names**
- **Found during:** Task 1 implementation
- **Issue:** Plan code used `categories` as the ticket→category relation name and `categoryGroups` as the category→categoryGroup relation name, but Prisma generated client uses `category` and `categoryGroup` respectively (matching the schema `@relation` names)
- **Fix:** Updated all `include` clauses in `getRequests()`, `getRequest()`, and `getServices()` to use correct relation names
- **Files modified:** src/modules/open311/open311.service.ts
- **Commit:** a2f3119

**2. [Rule 1 - Bug] Removed Open311Serializer from Open311Service constructor**
- **Found during:** Task 1 review
- **Issue:** Plan template had Open311Serializer injected into Open311Service with a comment that it was unused; this creates a spurious DI dependency
- **Fix:** Removed the serializer injection from Open311Service — serializer is used only in the controller, keeping concerns separate
- **Files modified:** src/modules/open311/open311.service.ts
- **Commit:** a2f3119

**3. [Rule 1 - Bug] Added definite assignment assertion to required DTO fields**
- **Found during:** TypeScript compilation of post-request.dto.ts
- **Issue:** TypeScript strict mode requires `!` assertion on class properties without initializers
- **Fix:** Added `!` to `api_key` and `service_code` fields in PostRequestDto
- **Files modified:** src/modules/open311/dto/post-request.dto.ts
- **Commit:** a2f3119

## Self-Check

### Files Exist
- src/modules/open311/open311.service.ts ✅
- src/modules/open311/open311.serializer.ts ✅
- src/modules/open311/open311.controller.ts ✅
- src/modules/open311/open311.module.ts ✅
- src/modules/open311/dto/post-request.dto.ts ✅
- src/modules/open311/dto/get-requests.dto.ts ✅

### Commits Exist
- a2f3119 ✅
- 2f5e6e3 ✅

### TypeScript
- Zero errors in open311 module files ✅
- Pre-existing errors in tickets.service.ts (from earlier plans) — not caused by this plan ✅

## Self-Check: PASSED
