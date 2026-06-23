---
phase: wave-5-integration
plan: 15
subsystem: geo
tags: [geo, postgis, knn, clustering, locations, map]
dependency_graph:
  requires: [01-schema, 09-tickets-service]
  provides: [geo-module, geo-cluster-service, locations-controller, recluster-script]
  affects: [tickets-service, app-module]
tech_stack:
  added: [PostGIS KNN <-> operator, ST_SetSRID, ST_MakePoint, ST_Y, ST_X]
  patterns: [fire-and-forget async, optional injection, batch processing, upsert ON CONFLICT]
key_files:
  created:
    - src/modules/geo/geo.module.ts
    - src/modules/geo/geo.service.ts
    - src/modules/geo/geo.repository.ts
    - src/modules/geo/locations.controller.ts
    - src/modules/geo/dto/get-locations.dto.ts
    - scripts/recluster.ts
  modified:
    - src/modules/tickets/tickets.service.ts
    - src/modules/tickets/tickets.module.ts
    - src/app.module.ts
decisions:
  - Task 2 artifacts (GeoModule wiring into TicketsService/TicketsModule/AppModule) were already committed by plan 12 which ran after plan 15 Task 1 — no duplicate commit needed
  - Used @Optional() injection for GeoClusterService in TicketsService to allow graceful degradation if GeoModule not loaded
  - $queryRawUnsafe used only for permissionLevels IN clause (controlled server-side, never user input)
metrics:
  duration: ~15min
  completed: 2026-06-23
  tasks: 2
  files: 9
---

# Phase wave-5-integration Plan 15: GeoModule Summary

**One-liner:** PostGIS KNN geo-cluster assignment at 7 zoom levels with incremental upsert on ticket create/update and GET /locations map endpoint.

## What Was Built

### GeoModule (src/modules/geo/)

Complete NestJS module implementing F9: Geo-Clustering of Ticket Locations.

**GeoRepository** (`geo.repository.ts`):
- `findNearestCluster(level, lon, lat)` — PostGIS `<->` KNN operator: `ORDER BY center <-> ST_SetSRID(ST_MakePoint(lon, lat), 4326) LIMIT 1` (TechArch §7.5)
- `upsertGeodata(ticketId, clusterIds[7])` — `INSERT ... ON CONFLICT (ticket_id) DO UPDATE SET cluster_id_0..6` (FRD §F09.2 step 3)
- `deleteGeodata(ticketId)` — removes ticket_geodata row when lat/lon cleared
- `truncateGeodata()` — idempotent truncate for recluster script
- `findTicketsWithLocation(skip, take)` — paginated batch loading for recluster
- `countTicketsWithLocation()` — progress tracking for recluster
- `getClusterSummaries(zoomLevel, permissionLevels, status?, categoryId?)` — `ST_Y(center)` lat, `ST_X(center)` lon with role-based displayPermissionLevel filter

**GeoClusterService** (`geo.service.ts`):
- `assignClusters(ticketId, lat, lon)` — runs all 7 levels in parallel via `Promise.all`, upserts ticket_geodata
- `deleteGeodata(ticketId)` — delegates to GeoRepository
- `getLocations(role, dto)` — validates zoom_level 0-6, maps role to permissionLevels array, returns ClusterSummary[]
- `reClusterAll(batchSize=500)` — truncate + batch upsert, logs progress

**LocationsController** (`locations.controller.ts`):
- `GET /locations` — accepts `zoom_level`, `status`, `category_id` query params via `GetLocationsDto`
- Extracts role from `req.user.role` (set by AuthMiddleware)
- Returns 400 INVALID_INPUT for zoom_level outside 0-6 (FRD §F09.5)

**GetLocationsDto** (`dto/get-locations.dto.ts`):
- `zoom_level: number` — @IsInt, @Min(0), @Max(6), @Type(Number), default 3
- `status: 'open' | 'closed'` — @IsIn(['open', 'closed']), optional
- `category_id: number` — @IsInt, @Type(Number), optional

**GeoModule** (`geo.module.ts`):
- Controllers: [LocationsController]
- Providers: [GeoClusterService, GeoRepository]
- Exports: [GeoClusterService] (for TicketsModule injection)

### TicketsService Integration

GeoClusterService injected with `@Optional()` (graceful degradation if module unavailable):

**`fireAndForgetAssign(ticketId, lat, lon)`**: Calls `geoClusterService.assignClusters()` with catch — geo failure MUST NOT fail ticket operation (FRD §F09.4).

**`fireAndForgetDelete(ticketId)`**: Calls `geoClusterService.deleteGeodata()` with catch.

**`create()`**: calls `fireAndForgetAssign(ticket.id, dto.latitude, dto.longitude)` after ticket persisted.

**`update()`**: calls `fireAndForgetAssign()` when lat/lon provided, `fireAndForgetDelete()` when both null.

### scripts/recluster.ts

Standalone NestJS application context script (FRD §F09.3):
- Bootstraps AppModule via `NestFactory.createApplicationContext()`
- Calls `GeoClusterService.reClusterAll(500)` — truncates ticket_geodata, processes all tickets with lat/lon in batches of 500
- Exits with code 1 on error
- Idempotent (truncates before processing)

Usage: `npx ts-node scripts/recluster.ts`

### AppModule

`GeoModule` imported into root AppModule (`src/app.module.ts`).

## Integration Points

| Caller | Method | Trigger | Behavior |
|--------|--------|---------|----------|
| TicketsService.create() | fireAndForgetAssign() | lat/lon both non-null in CreateTicketDto | Fire-and-forget, errors logged |
| TicketsService.update() | fireAndForgetAssign() | lat or lon changes to non-null value | Fire-and-forget, errors logged |
| TicketsService.update() | fireAndForgetDelete() | lat and lon both set to null | Fire-and-forget, errors logged |
| LocationsController.getLocations() | GeoClusterService.getLocations() | GET /locations request | Returns ClusterSummary[] |
| scripts/recluster.ts | GeoClusterService.reClusterAll() | Manual/scheduled execution | Bulk reprocessing |

## Deviations from Plan

### Execution Order Overlap

**Found during:** Task 2 execution

**Issue:** Plan 12 (SearchModule/Solr) ran concurrently with plan 15 and committed its changes to `src/modules/tickets/tickets.service.ts`, `src/modules/tickets/tickets.module.ts`, and `src/app.module.ts` at commit `874c90a` which already included the GeoClusterService injection, fireAndForget helpers, and GeoModule wiring — the same artifacts targeted by plan 15 Task 2.

**Resolution:** Verified all Task 2 artifacts were correctly present in the committed codebase. No duplicate commit was created. Plan 12 had implemented the geo hook integration as part of its cross-module wiring, which is idiomatic for wave-5 integration work.

**Files modified:** None (all already committed)

**Impact:** Zero functional deviation — all done criteria met exactly as specified.

## Self-Check

### Files Created
- [x] src/modules/geo/dto/get-locations.dto.ts — EXISTS
- [x] src/modules/geo/geo.module.ts — EXISTS
- [x] src/modules/geo/geo.repository.ts — EXISTS
- [x] src/modules/geo/geo.service.ts — EXISTS
- [x] src/modules/geo/locations.controller.ts — EXISTS
- [x] scripts/recluster.ts — EXISTS

### Files Modified
- [x] src/modules/tickets/tickets.service.ts — GeoClusterService injection + fireAndForget helpers
- [x] src/modules/tickets/tickets.module.ts — GeoModule imported
- [x] src/app.module.ts — GeoModule imported

### Commits
- Task 1: `4ceea7e` — feat(wave-5-integration-15): implement GeoModule with PostGIS KNN clustering
- Task 2: `874c90a` — feat(wave-5-integration-12): SolrService + SearchService + SearchModule (included geo wiring)

### TypeScript: ZERO errors

## Self-Check: PASSED
