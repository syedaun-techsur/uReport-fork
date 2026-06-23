---
phase: wave-5-integration
plan: 12
subsystem: search
tags: [solr, search, edismax, facets, fire-and-forget, indexing, F5]
dependency_graph:
  requires: [plan-01 (prisma schema), plan-09 (TicketsModule), plan-10 (TicketsService), plan-06 (PiiMaskInterceptor), plan-03 (SerializationInterceptor)]
  provides: [SearchModule, SolrService, SearchService, SearchController, GET /search]
  affects: [TicketsService (fire-and-forget hooks), AppModule (SearchModule import)]
tech_stack:
  added: [solr-client (already installed)]
  patterns: [fire-and-forget indexing, eDisMax query construction, role-visibility fq filter, facet aggregation]
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
  - SolrService uses @Optional() injection pattern so TicketsService compiles even if SearchModule is absent
  - buildDocument uses Prisma relation names category/category.department (not categories/departments) per actual schema
  - indexTicketAsync called in create/update/close/reopen; uses .catch() to prevent Solr failure propagation
  - permittedCategoryIds=null means staff (no filter); empty array returns 0 results immediately without Solr round-trip
  - Logger added to TicketsService for GELF-compatible WARN logging on Solr failure
metrics:
  duration: ~25min
  completed: "2026-06-23"
  tasks_completed: 2
  files_changed: 9
---

# Phase wave-5-integration Plan 12: SearchModule (F5 Solr Full-Text Search) Summary

**One-liner:** Solr eDisMax full-text search with role-visibility fq injection, fire-and-forget incremental indexing, facet aggregation, and HTTP 503 failsafe.

## Files Created

| File | Purpose |
|------|---------|
| `src/modules/search/solr.service.ts` | SolrService: indexTicket(), deleteTicket(), search(), buildDocument(), deleteAll(), addBatch(), commit() |
| `src/modules/search/search.service.ts` | SearchService: orchestrates eDisMax query + role-visibility filter resolution |
| `src/modules/search/search.controller.ts` | SearchController: GET /search with all params, PiiMaskInterceptor, all-five-format output |
| `src/modules/search/search.module.ts` | SearchModule exporting SolrService for TicketsModule injection |
| `src/modules/search/dto/search-query.dto.ts` | SearchQueryDto: q, status, category_id, department_id, assignedPerson_id, start_date, end_date, sort, page, rows |
| `scripts/reindex-solr.ts` | Standalone bulk re-index: deleteByQuery *:*, batch-500, final commit, process.exit(1) on error |

## Files Modified

| File | Change |
|------|--------|
| `src/modules/tickets/tickets.service.ts` | Added Logger, @Optional SolrService param, indexTicketAsync() method, fire-and-forget calls in create/update/close/reopen |
| `src/modules/tickets/tickets.module.ts` | Added SearchModule to imports (SolrService available for optional injection) |
| `src/app.module.ts` | Added SearchModule to root AppModule imports |

## Key Decisions

### 1. SolrService Fire-and-Forget Pattern
`SolrService` is injected with `@Optional()` so `TicketsService` compiles before `SearchModule` exists. `indexTicketAsync()` uses `.catch()` to ensure Solr failure NEVER propagates to the HTTP response (FRD §F05.4).

### 2. Prisma Relation Name Correction
Plan spec used `ticket.categories` / `ticket.categories.departments` but actual Prisma schema uses `ticket.category` / `ticket.category.department`. Auto-fixed (Rule 1) to match schema.

### 3. eDisMax Query Parameters (FRD §F05.3)
- `qf=description^2 location^1.5 city^1 customFields^1`
- `mm=75%` (minimum match)
- `pf=description^4` (phrase boost)
- `pf2=description^4` for multi-word queries
- Single-term queries get wildcard suffix appended (`term*`)

### 4. Role-Visibility Filter
- `permittedCategoryIds=null` → staff, no `fq` injected (sees all tickets)
- `permittedCategoryIds=[]` → returns empty result immediately (no Solr round-trip)
- `permittedCategoryIds=[1,2,3]` → injects `fq=category_id:(1 OR 2 OR 3)`

### 5. HTTP 503 SEARCH_UNAVAILABLE
`SolrService.search()` wraps Solr errors with `throw new ServiceUnavailableException({ error: 'SEARCH_UNAVAILABLE', message: 'Search service unavailable' })`. NestJS propagates this automatically as HTTP 503.

### 6. Hooks Re-Applied After Concurrent Plan Modification
TicketsService had been evolved by plans 13+ (NotificationsService, GeoClusterService). Re-applied Solr hooks (Logger, @Optional SolrService, indexTicketAsync) to the evolved file while preserving all existing functionality.

## Integration Contracts Fulfilled

| Contract | Verified |
|----------|---------|
| `SearchModule` exports `SolrService` for F12 BookmarksModule | ✅ |
| `SolrService.search()` throws HTTP 503 on Solr unreachability | ✅ |
| `SolrService.indexTicket()` fire-and-forget safe (never throws) | ✅ |
| `TicketsService.create/update/close/reopen` each call `indexTicketAsync` | ✅ |
| `scripts/reindex-solr.ts` exits non-zero on error | ✅ |
| TypeScript strict-mode: zero errors | ✅ |

## Deviations from Plan

### Auto-Fixed Issues

**1. [Rule 1 - Bug] Fixed Prisma relation names**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** Plan spec used `ticket.categories` / `ticket.categories.departments` / `ticket.issueTypes` but Prisma schema defines `ticket.category` / `ticket.category.department` / `ticket.issueType`
- **Fix:** Updated `buildDocument()` in `solr.service.ts` and `buildDoc()` in `scripts/reindex-solr.ts` to use correct relation accessor paths
- **Files modified:** `src/modules/search/solr.service.ts`, `scripts/reindex-solr.ts`

**2. [Rule 1 - Bug] Re-applied hooks to evolved TicketsService**
- **Found during:** Task 2 verification — `indexTicketAsync` calls missing after concurrent plan evolution
- **Issue:** TicketsService had been updated by plans 13 (NotificationsModule) and GeoModule, overwriting the hooks applied in Task 1
- **Fix:** Re-applied `Logger`, `@Optional SolrService`, `indexTicketAsync()`, and all four hook call sites to the current file state
- **Files modified:** `src/modules/tickets/tickets.service.ts`

## Self-Check

- [x] `src/modules/search/solr.service.ts` exists with SolrService
- [x] `src/modules/search/search.service.ts` exists with SearchService
- [x] `src/modules/search/search.controller.ts` exists with SearchController
- [x] `src/modules/search/search.module.ts` exists exporting SolrService
- [x] `src/modules/search/dto/search-query.dto.ts` exists
- [x] `scripts/reindex-solr.ts` exists with BATCH_SIZE=500, process.exit(1)
- [x] `TicketsService` has indexTicketAsync() wired in create/update/close/reopen
- [x] `AppModule` imports SearchModule
- [x] TypeScript: 0 errors

## Self-Check: PASSED
