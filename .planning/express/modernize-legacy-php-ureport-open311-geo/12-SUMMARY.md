---
phase: wave-5-integration
plan: 12
subsystem: search
tags: [solr, search, edismax, facets, fire-and-forget, rbac, serialization]
dependency_graph:
  requires:
    - prisma/schema.prisma (tickets, categories, departments, substatus models)
    - src/modules/tickets/tickets.service.ts (TicketsService)
    - src/common/interceptors/pii-mask.interceptor.ts (PiiMaskInterceptor)
    - src/common/interceptors/serialization.interceptor.ts (SerializationInterceptor)
  provides:
    - src/modules/search/search.module.ts (SearchModule, SolrService exported)
    - src/modules/search/solr.service.ts (SolrService)
    - src/modules/search/search.service.ts (SearchService)
    - src/modules/search/search.controller.ts (GET /search)
    - scripts/reindex-solr.ts (standalone re-index script)
  affects:
    - src/modules/tickets/tickets.service.ts (fire-and-forget Solr hooks added)
    - src/modules/tickets/tickets.module.ts (SearchModule import added)
    - src/app.module.ts (SearchModule imported)
tech_stack:
  added:
    - solr-client npm package (already in package.json)
  patterns:
    - eDisMax query handler with field boosts
    - Fire-and-forget async with .catch() for Solr indexing
    - Optional NestJS injection (@Optional) for backward compatibility
    - Role-based category visibility filter injection as Solr fq
key_files:
  created:
    - src/modules/search/solr.service.ts
    - src/modules/search/search.service.ts
    - src/modules/search/search.controller.ts
    - src/modules/search/search.module.ts
    - src/modules/search/dto/search-query.dto.ts
    - scripts/reindex-solr.ts
  modified:
    - src/modules/tickets/tickets.service.ts
    - src/modules/tickets/tickets.module.ts
    - src/app.module.ts
decisions:
  - "SolrService.indexTicket() uses @Optional injection so TicketsService compiles before SearchModule exists"
  - "Prisma relation names corrected: category/department/issueType (not categories/departments/issueTypes)"
  - "Stub SearchController created in Task 1 to allow TSC to pass before Task 2 replaces it"
  - "SolrService fire-and-forget uses .catch() pattern — Solr failure logs WARN but never throws"
  - "permittedCategoryIds=null means staff (no filter); empty array returns empty result without Solr hit"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-06-23"
  tasks: 2
  files: 9
---

# Phase wave-5-integration Plan 12: SearchModule (F5 Full-Text Solr Search) Summary

**One-liner:** Solr eDisMax full-text search with role-visibility fq filter, facets (categories/statuses/departments), fire-and-forget incremental indexing in TicketsService, and standalone batch reindex script.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | SolrService + SearchService + SearchModule + dto + TicketsService hooks + reindex script | 874c90a |
| 2 | SearchController GET /search + AppModule wiring | 9dce82a |

## Files Created

| File | Purpose |
|------|---------|
| `src/modules/search/solr.service.ts` | SolrService: thin solr-client wrapper with indexTicket, deleteTicket, search (eDisMax), buildDocument, deleteAll, addBatch, commit |
| `src/modules/search/search.service.ts` | SearchService: role-visibility resolution + SolrService.search() delegation |
| `src/modules/search/search.controller.ts` | GET /search with all FRD §F05.2 params, PiiMaskInterceptor, all-five-format via global SerializationInterceptor |
| `src/modules/search/search.module.ts` | SearchModule: imports PrismaModule+ConfigModule, exports SolrService for F12 |
| `src/modules/search/dto/search-query.dto.ts` | SearchQueryDto: q, status, category_id, department_id, assignedPerson_id, start_date, end_date, sort, page, rows |
| `scripts/reindex-solr.ts` | Standalone reindex: deleteByQuery *:*, batch-500 loop, final commit, process.exit(1) on error |

## Files Modified

| File | Change |
|------|--------|
| `src/modules/tickets/tickets.service.ts` | Added Logger, SolrService @Optional injection, indexTicketAsync(), fire-and-forget calls in create/update/close/reopen |
| `src/modules/tickets/tickets.module.ts` | Added SearchModule to imports array |
| `src/app.module.ts` | Added SearchModule import |

## Key Decisions

### 1. Fire-and-forget pattern (FRD §F05.4)
Solr indexing uses `.catch()` attached to the promise — never `await`. This ensures Solr unavailability or slowness never propagates to the ticket HTTP response. Failures log at WARN via NestJS Logger.

### 2. Role-visibility category filter (FRD §F05.3, §F02.5)
- `permittedCategoryIds = null` → staff user, no Solr `fq` injected (sees all tickets)
- `permittedCategoryIds = []` → no accessible categories, returns empty result immediately without hitting Solr
- `permittedCategoryIds = [1,2,3]` → injects `fq=category_id:(1 OR 2 OR 3)`

### 3. Prisma relation name correction (Rule 1 - Bug fix)
The plan spec used `categories/departments/issueTypes` but the actual Prisma schema uses `category/department/issueType` for the ticket relations. Fixed in both `solr.service.ts` and `scripts/reindex-solr.ts`.

### 4. eDisMax parameters (FRD §F05.3)
- `qf=description^2 location^1.5 city^1 customFields^1` — field boosts matching legacy Solarium schema
- `mm=75%` — minimum match for multi-term queries
- `pf=description^4` — phrase boost for single-term wildcard queries
- `pf2=description^4` — additional phrase boost for multi-word queries
- Single-term queries get `*` wildcard suffix for prefix matching

### 5. Facets (FRD §F05.2)
Facets on `category_id`, `status`, `department_id` fields with `facet.mincount=1` and `facet.limit=50`. Category and department names resolved best-effort from result docs.

## Integration Contracts Fulfilled

| Contract | Status |
|----------|--------|
| `SearchModule` exports `SolrService` for F12 BookmarksModule | ✓ |
| `TicketsService` hooks wired fire-and-forget (Solr failure never fails ticket writes) | ✓ |
| `GET /search` returns 503 `SEARCH_UNAVAILABLE` when Solr unreachable | ✓ |
| All five formats via global SerializationInterceptor | ✓ |
| SolrDocument field names match FRD §F05.1 exactly | ✓ |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Prisma relation names**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** Plan spec referenced `categories`, `departments`, `issueTypes` as Prisma ticket relation names, but actual schema uses `category`, `department`, `issueType`
- **Fix:** Updated `SolrService.indexTicket()`, `SolrService.buildDocument()`, and `scripts/reindex-solr.ts` to use correct relation names
- **Files modified:** `src/modules/search/solr.service.ts`, `scripts/reindex-solr.ts`
- **Commit:** 874c90a

**2. [Rule 3 - Blocking] Stub SearchController created in Task 1**
- **Found during:** Task 1 compilation — `search.module.ts` imports `./search.controller` which Task 2 creates
- **Fix:** Created minimal stub `@Controller('search') export class SearchController {}` in Task 1 so the module compiles; replaced with full implementation in Task 2
- **Files modified:** `src/modules/search/search.controller.ts`
- **Commit:** 874c90a (stub), 9dce82a (full impl)

**3. [Rule 3 - Blocking] GeoModule already in TicketsModule**
- **Found during:** Task 1 when writing tickets.module.ts
- **Issue:** A prior plan (Geo plan) had already added `GeoModule` to `TicketsModule.imports`
- **Fix:** Added `SearchModule` alongside existing `GeoModule` (preserving GeoModule import)
- **Files modified:** `src/modules/tickets/tickets.module.ts`
- **Commit:** 874c90a

## Self-Check: PASSED

All created files exist on disk. Both commits (874c90a, 9dce82a) found in git log. TypeScript compiles with zero errors across all modified files.
