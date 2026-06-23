---
phase: wave-5-integration
plan: 15
subsystem: geo
tags: [geo-clustering, postgis, knn, tickets, locations]
dependency_graph:
  requires:
    - plan: "01"
      artifact: "prisma/schema.prisma"
      exports: ["geoclusters", "ticket_geodata", "tickets"]
    - plan: "09"
      artifact: "src/modules/tickets/tickets.module.ts"
      exports: ["TicketsModule", "TicketsService"]
  provides:
    - artifact: "src/modules/geo/geo.module.ts"
      exports: ["GeoModule", "GeoClusterService"]
    - artifact: "src/modules/geo/geo.service.ts"
      exports: ["GeoClusterService"]
  affects:
    - "src/modules/tickets/tickets.service.ts"
    - "src/app.module.ts"
tech_stack:
  added: []
  patterns:
    - "PostGIS KNN <-> operator for nearest-neighbor spatial queries"
    - "Fire-and-forget async pattern for non-critical operations"
    - "NestJS @Optional() injection for loose coupling"
    - "ON CONFLICT DO UPDATE upsert pattern"
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
  - "GeoClusterService injected via @Optional() in TicketsService — allows TicketsModule to function even if GeoModule is not yet loaded"
  - "All 7 KNN queries run in parallel via Promise.all() for performance"
  - "Fire-and-forget pattern for geo assignment — geo failure never fails ticket write (FRD §F09.4)"
  - "TicketsModule imports GeoModule (not just AppModule) to make GeoClusterService available for injection"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-23"
  tasks: 2
  files: 9
---

# Phase wave-5-integration Plan 15: GeoModule — PostGIS KNN Geo-Clustering Summary

**One-liner:** GeoModule with PostGIS KNN nearest-neighbor clustering at 7 zoom levels, fire-and-forget hooks in TicketsService, GET /locations map endpoint, and idempotent bulk recluster script.

## Files Created

| File | Purpose |
|------|---------|
| `src/modules/geo/dto/get-locations.dto.ts` | Validated DTO: zoom_level (0-6), status, category_id |
| `src/modules/geo/geo.repository.ts` | PostGIS $queryRaw KNN queries, upsertGeodata, getClusterSummaries |
| `src/modules/geo/geo.service.ts` | GeoClusterService: assignClusters, deleteGeodata, getLocations, reClusterAll |
| `src/modules/geo/locations.controller.ts` | GET /locations with role-based category visibility |
| `src/modules/geo/geo.module.ts` | NestJS module wiring, exports GeoClusterService |
| `scripts/recluster.ts` | Standalone NestJS context script: truncate + batch upsert (500/batch) |

## Files Modified

| File | Change |
|------|--------|
| `src/modules/tickets/tickets.service.ts` | Added GeoClusterService @Optional injection, fireAndForgetAssign/Delete helpers, hooks in create() and update() |
| `src/modules/tickets/tickets.module.ts` | Added GeoModule import |
| `src/app.module.ts` | Added GeoModule import |

## GeoModule Components Implemented

### GeoRepository (geo.repository.ts)
- **`findNearestCluster(level, lon, lat)`**: PostGIS KNN query using `ORDER BY center <-> ST_SetSRID(ST_MakePoint(lon, lat), 4326) LIMIT 1` (lon before lat — PostGIS convention per TechArch §7.5)
- **`upsertGeodata(ticketId, clusterIds[7])`**: `INSERT ... ON CONFLICT (ticket_id) DO UPDATE SET` for all 7 cluster_id columns atomically
- **`deleteGeodata(ticketId)`**: Removes ticket_geodata row when lat/lon cleared
- **`truncateGeodata()`**: Full truncate for recluster script
- **`findTicketsWithLocation(skip, take)`**: Batched ticket loader for recluster
- **`getClusterSummaries(zoomLevel, permissionLevels, status?, categoryId?)`**: Joins geoclusters → ticket_geodata → tickets → categories with CASE-based cluster column selection, uses ST_Y/ST_X for coordinate extraction

### GeoClusterService (geo.service.ts)
- **`assignClusters(ticketId, lat, lon)`**: Runs 7 KNN queries in parallel (Promise.all), upserts ticket_geodata
- **`deleteGeodata(ticketId)`**: Delegates to repo for lat/lon-cleared case (FRD §F09.4)
- **`getLocations(role, dto)`**: Role-based permission levels, throws 400 INVALID_INPUT for zoom_level outside 0-6 (FRD §F09.5)
- **`reClusterAll(batchSize=500)`**: Truncate → count → batch loop with progress logging

### LocationsController (locations.controller.ts)
- `GET /locations` — anonymous accessible, role derived from `req.user`
- Accepts: `zoom_level` (0-6, default 3), `status` ('open'/'closed'), `category_id`
- Returns: `[{id, level, lat, lon, count}]`
- 400 on invalid zoom_level

## Integration Points with TicketsService

### create() hook (FRD §F09.4)
```typescript
// After ticket persisted and 'open' history appended:
this.fireAndForgetAssign(ticket.id, dto.latitude, dto.longitude);
```

### update() hook (FRD §F09.4)
```typescript
const latChanged = dto.latitude !== undefined && dto.latitude !== existing.latitude;
const lonChanged = dto.longitude !== undefined && dto.longitude !== existing.longitude;
const latCleared = dto.latitude === null;
const lonCleared = dto.longitude === null;

if (latCleared && lonCleared) {
  this.fireAndForgetDelete(ticket.id);         // clear geodata
} else if (latChanged || lonChanged) {
  this.fireAndForgetAssign(ticket.id, newLat, newLon);  // re-cluster
}
```

Both helpers catch errors and log — geo failure NEVER propagates to the ticket HTTP response (FRD §F09.4).

## Recluster Script

**Location:** `scripts/recluster.ts`

**Usage:**
```bash
npx ts-node scripts/recluster.ts
# or after adding to package.json: npm run recluster
```

**Behavior:**
1. Bootstraps NestJS application context (AppModule)
2. Calls `GeoClusterService.reClusterAll(500)`
3. Logs progress every 500 tickets
4. Exits with code 1 on failure
5. Idempotent — truncates ticket_geodata before processing

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `7bd6b07` | feat(wave-5-integration-15): implement GeoModule with PostGIS KNN clustering |
| Task 2 | `6d0d130` | feat(wave-5-integration-15): wire GeoClusterService into TicketsService + recluster script |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Resolved pre-existing TicketsService incomplete injection**
- **Found during:** Task 2
- **Issue:** Prior plan (wave-5-integration-12) had added `SolrService` import and `indexTicketAsync()` method referencing `this.solrService` and `this.logger`, but both properties were missing from the constructor, causing 3 TypeScript errors
- **Fix:** Added `@Optional() private readonly solrService?: SolrService` to constructor; added `private readonly logger = new Logger(TicketsService.name)` class field
- **Files modified:** `src/modules/tickets/tickets.service.ts`
- **Note:** The file was later overridden by a concurrent committed state (from plan 12's final commit), which had already resolved these issues. The final committed version had no errors.

**2. [Rule 1 - Bug] Removed duplicate `fireAndForgetDelete` method**
- **Found during:** Task 2 (intermediate editing state)
- **Issue:** My edit to add geo helpers was applied to an intermediate file state that already had the helpers from the prior plan's version, causing a duplicate function implementation TS error
- **Fix:** Removed the duplicate during the same editing session
- **Files modified:** `src/modules/tickets/tickets.service.ts`

## Self-Check

### Files Exist
- [x] `src/modules/geo/dto/get-locations.dto.ts` — FOUND
- [x] `src/modules/geo/geo.module.ts` — FOUND
- [x] `src/modules/geo/geo.service.ts` — FOUND
- [x] `src/modules/geo/geo.repository.ts` — FOUND
- [x] `src/modules/geo/locations.controller.ts` — FOUND
- [x] `scripts/recluster.ts` — FOUND

### Commits Exist
- [x] `7bd6b07` — FOUND
- [x] `6d0d130` — FOUND

### TypeScript: Zero errors ✓

## Self-Check: PASSED
