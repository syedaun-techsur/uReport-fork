---
phase: wave-5-integration
plan: 15
type: execute
wave: 5
depends_on: [4]
files_modified:
  - src/modules/geo/geo.module.ts
  - src/modules/geo/geo.service.ts
  - src/modules/geo/geo.repository.ts
  - src/modules/geo/locations.controller.ts
  - src/modules/geo/dto/get-locations.dto.ts
  - src/modules/tickets/tickets.service.ts
  - scripts/recluster.ts
  - src/app.module.ts
autonomous: true

features:
  implements: ["F9"]
  depends_on: ["F1", "F6"]
  enables: ["F12", "F13"]

must_haves:
  truths:
    - "GeoClusterService.assignClusters(ticketId, lat, lon) queries geoclusters at each of 7 levels using PostGIS KNN <-> operator and upserts ticket_geodata"
    - "TicketsService.create() calls GeoClusterService.assignClusters() when latitude and longitude are provided"
    - "TicketsService.update() calls GeoClusterService.assignClusters() when latitude or longitude changes; deletes ticket_geodata row if lat/lon cleared to null"
    - "GET /locations returns cluster summary {id, level, lat, lon, count} filtered by role's displayPermissionLevel, zoom_level, status, category_id"
    - "GET /locations returns 400 for zoom_level outside 0–6"
    - "scripts/recluster.ts truncates ticket_geodata, processes all tickets with lat/lon in batches of 500, logs progress — idempotent"
    - "GeoModule is imported into AppModule"
  artifacts:
    - path: "src/modules/geo/geo.module.ts"
      provides: "GeoModule exporting GeoClusterService"
      exports: ["GeoModule", "GeoClusterService"]
    - path: "src/modules/geo/geo.service.ts"
      provides: "GeoClusterService: assignClusters, deleteGeodata, reClusterAll"
      exports: ["GeoClusterService"]
    - path: "src/modules/geo/geo.repository.ts"
      provides: "GeoRepository: $queryRaw KNN queries, upsertGeodata, truncateGeodata"
      exports: ["GeoRepository"]
    - path: "src/modules/geo/locations.controller.ts"
      provides: "LocationsController: GET /locations with zoom_level/status/category_id filters"
      exports: ["LocationsController"]
    - path: "scripts/recluster.ts"
      provides: "Standalone recluster script: truncate + batch upsert ticket_geodata"
      exports: []
  key_links:
    - from: "src/modules/geo/geo.service.ts"
      to: "prisma/schema.prisma"
      via: "GeoRepository $queryRaw KNN query on geoclusters"
      pattern: "\\$queryRaw.*geoclusters\\|geoclusters.*\\$queryRaw"
    - from: "src/modules/tickets/tickets.service.ts"
      to: "src/modules/geo/geo.service.ts"
      via: "GeoClusterService.assignClusters() called after ticket create/update when lat/lon provided"
      pattern: "geoClusterService\\.assignClusters\\|assignClusters"
    - from: "src/modules/geo/locations.controller.ts"
      to: "src/modules/geo/geo.service.ts"
      via: "LocationsController injects GeoClusterService for GET /locations"
      pattern: "geoClusterService\\.getLocations\\|getLocations"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "prisma/schema.prisma"
      exports: ["geoclusters", "ticket_geodata", "tickets"]
      verify: "grep -n 'model geoclusters' prisma/schema.prisma && grep -n 'model ticket_geodata' prisma/schema.prisma && echo CONTRACT_OK"
    - from_plan: "09"
      artifact: "src/modules/tickets/tickets.module.ts"
      exports: ["TicketsModule", "TicketsService"]
      verify: "grep -n 'export class TicketsModule' src/modules/tickets/tickets.module.ts && grep -n 'TicketsService' src/modules/tickets/tickets.module.ts && echo CONTRACT_OK"
    - from_plan: "09"
      artifact: "src/modules/tickets/tickets.service.ts"
      exports: ["TicketsService"]
      verify: "grep -n 'export class TicketsService' src/modules/tickets/tickets.service.ts && echo CONTRACT_OK"
  provides:
    - artifact: "src/modules/geo/geo.module.ts"
      exports: ["GeoModule", "GeoClusterService"]
      shape: |
        @Module({
          controllers: [LocationsController],
          providers: [GeoClusterService, GeoRepository],
          exports: [GeoClusterService],
        })
        export class GeoModule {}
      verify: "grep -n 'export class GeoModule' src/modules/geo/geo.module.ts && grep -n 'GeoClusterService' src/modules/geo/geo.module.ts && echo CONTRACT_OK"
    - artifact: "src/modules/geo/geo.service.ts"
      exports: ["GeoClusterService"]
      shape: |
        @Injectable()
        export class GeoClusterService {
          assignClusters(ticketId: number, lat: number, lon: number): Promise<void>
          deleteGeodata(ticketId: number): Promise<void>
          getLocations(role: string | null, zoomLevel: number, status?: string, categoryId?: number): Promise<ClusterSummary[]>
          reClusterAll(): Promise<void>
        }
      verify: "grep -n 'export class GeoClusterService' src/modules/geo/geo.service.ts && grep -n 'assignClusters' src/modules/geo/geo.service.ts && echo CONTRACT_OK"
---

<objective>
Implement the GeoModule — PostGIS KNN geo-cluster assignment at 7 zoom levels, incremental upsert on ticket create/update, the GET /locations map endpoint, and the `scripts/recluster.ts` bulk-rebuild script. Wire GeoModule into AppModule and hook GeoClusterService into TicketsService.

Purpose: F9 completes the map visualization feature. On every ticket create/update with lat/lon, GeoClusterService finds the nearest geoclusters row at each of 7 levels using the PostGIS `<->` KNN operator and upserts the `ticket_geodata` join table. The GET /locations endpoint returns pre-computed cluster summaries for the front-end map. The recluster script is run once post-migration to populate ticket_geodata from existing ticket coordinates.

Output:
- `src/modules/geo/` — GeoModule, GeoClusterService (assignClusters, deleteGeodata, getLocations), GeoRepository ($queryRaw KNN + upsert), LocationsController (GET /locations)
- `src/modules/geo/dto/get-locations.dto.ts` — validated filter params
- `src/modules/tickets/tickets.service.ts` — wired to call assignClusters/deleteGeodata on ticket create/update
- `scripts/recluster.ts` — standalone recluster script (truncate + batch upsert, idempotent)
- `src/app.module.ts` — imports GeoModule
</objective>

<feature_dependencies>
Implements: F9: Geo-Clustering of Ticket Locations — geoclusters table with POINT geometry (already in schema from wave 1); ticket_geodata table with cluster_id_0 through cluster_id_6 (already in schema); PostGIS KNN nearest-neighbor <-> operator for cluster assignment at 7 zoom levels (FRD §F09.2); upsert on ticket create/update with lat/lon (FRD §F09.4); clear on lat/lon null (FRD §F09.4); GET /locations GeoJSON-style cluster endpoint with role filter (FRD §F09.5); bulk re-cluster script (FRD §F09.3)
Depends on: F6: PostgreSQL schema (geoclusters, ticket_geodata DDL from wave 1 plan 01); F1: TicketsService provides ticket create/update hooks (wave 4 plans 09-10)
Enables: F12: BookmarksModule (wave 6); F13: ReportsModule (wave 6)
</feature_dependencies>

<execution_context>
@.planning/express/modernize-legacy-php-ureport-open311-geo/WAVE-SCHEDULE.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@project_specs/FRD-uReport.md (F09 section §F09.1–F09.6)
@project_specs/TechArch-uReport.md (§2.1 GeoModule, §3.2 DDL geoclusters+ticket_geodata, §7.5 spatial query pattern)
</context>

<tasks>

<task type="auto">
  <name>Task 1: GeoRepository + GeoClusterService + LocationsController + GeoModule</name>
  <files>
    src/modules/geo/geo.repository.ts
    src/modules/geo/geo.service.ts
    src/modules/geo/locations.controller.ts
    src/modules/geo/dto/get-locations.dto.ts
    src/modules/geo/geo.module.ts
  </files>
  <action>
Create the full GeoModule: GeoRepository (PostGIS KNN $queryRaw), GeoClusterService (cluster assignment + map query), LocationsController (GET /locations), and the NestJS module.

## Directory structure

```
src/modules/geo/
├── geo.module.ts
├── geo.service.ts
├── geo.repository.ts
├── locations.controller.ts
└── dto/
    └── get-locations.dto.ts
```

---

### src/modules/geo/dto/get-locations.dto.ts

Per FRD §F09.5 filter params:

```typescript
import { IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class GetLocationsDto {
  /**
   * Zoom level 0–6 (FRD §F09.5). Default 3.
   * 0 = coarsest (fewest, largest clusters), 6 = finest.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  @Type(() => Number)
  zoom_level?: number = 3;

  /** Filter by ticket status: 'open' or 'closed' (FRD §F09.5) */
  @IsOptional()
  @IsIn(['open', 'closed'])
  status?: 'open' | 'closed';

  /** Filter by category_id (FRD §F09.5) */
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  category_id?: number;
}
```

---

### src/modules/geo/geo.repository.ts

Thin wrapper providing PostGIS $queryRaw operations per TechArch §7.5 and FRD §F09.2.

**Critical KNN query (from TechArch §7.5):**
```sql
SELECT id
FROM "geoclusters"
WHERE level = $1
ORDER BY center <-> ST_SetSRID(ST_MakePoint($2, $3), 4326)
LIMIT 1;
```
Note: `ST_MakePoint(longitude, latitude)` — PostGIS uses (lon, lat) order.

**Upsert query (FRD §F09.2 step 3):**
```sql
INSERT INTO ticket_geodata (ticket_id, cluster_id_0, ..., cluster_id_6)
VALUES ($1, $2, ..., $8)
ON CONFLICT (ticket_id) DO UPDATE SET
  cluster_id_0 = EXCLUDED.cluster_id_0, ...
```

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ClusterSummary {
  id: number;
  level: number;
  lat: number;
  lon: number;
  count: number;
}

@Injectable()
export class GeoRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find nearest geoclusters.id at the given level for (lon, lat).
   * Uses PostGIS KNN <-> operator with GiST index (TechArch §7.5).
   * NOTE: ST_MakePoint takes (longitude, latitude) — not (lat, lon).
   * Returns null if no geoclusters rows exist at that level.
   */
  async findNearestCluster(level: number, lon: number, lat: number): Promise<number | null> {
    const results = await this.prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id
      FROM "geoclusters"
      WHERE level = ${level}::smallint
      ORDER BY center <-> ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)
      LIMIT 1
    `;
    return results.length > 0 ? Number(results[0].id) : null;
  }

  /**
   * Upsert ticket_geodata row with cluster assignments at all 7 levels (FRD §F09.2 step 3).
   * Uses ON CONFLICT (ticket_id) DO UPDATE to handle both create and update cases.
   */
  async upsertGeodata(
    ticketId: number,
    clusterIds: [number | null, number | null, number | null, number | null, number | null, number | null, number | null],
  ): Promise<void> {
    const [c0, c1, c2, c3, c4, c5, c6] = clusterIds;
    await this.prisma.$executeRaw`
      INSERT INTO "ticket_geodata" (ticket_id, cluster_id_0, cluster_id_1, cluster_id_2, cluster_id_3, cluster_id_4, cluster_id_5, cluster_id_6)
      VALUES (${ticketId}, ${c0}, ${c1}, ${c2}, ${c3}, ${c4}, ${c5}, ${c6})
      ON CONFLICT (ticket_id) DO UPDATE SET
        cluster_id_0 = EXCLUDED.cluster_id_0,
        cluster_id_1 = EXCLUDED.cluster_id_1,
        cluster_id_2 = EXCLUDED.cluster_id_2,
        cluster_id_3 = EXCLUDED.cluster_id_3,
        cluster_id_4 = EXCLUDED.cluster_id_4,
        cluster_id_5 = EXCLUDED.cluster_id_5,
        cluster_id_6 = EXCLUDED.cluster_id_6
    `;
  }

  /**
   * Delete ticket_geodata row for a ticket (called when lat/lon cleared to null — FRD §F09.4).
   */
  async deleteGeodata(ticketId: number): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM "ticket_geodata" WHERE ticket_id = ${ticketId}
    `;
  }

  /**
   * Truncate ticket_geodata (used by recluster script — FRD §F09.3 step 1).
   */
  async truncateGeodata(): Promise<void> {
    await this.prisma.$executeRaw`TRUNCATE TABLE "ticket_geodata"`;
  }

  /**
   * Load all tickets with non-null lat/lon in batches (FRD §F09.3 step 2).
   */
  async findTicketsWithLocation(skip: number, take: number): Promise<Array<{ id: number; latitude: number; longitude: number }>> {
    return this.prisma.$queryRaw<Array<{ id: number; latitude: number; longitude: number }>>`
      SELECT id, latitude, longitude
      FROM tickets
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY id ASC
      LIMIT ${take} OFFSET ${skip}
    `;
  }

  /**
   * Count tickets with lat/lon (for recluster progress logging).
   */
  async countTicketsWithLocation(): Promise<number> {
    const result = await this.prisma.$queryRaw<Array<{ count: string }>>`
      SELECT COUNT(*)::text AS count FROM tickets WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    `;
    return parseInt(result[0].count, 10);
  }

  /**
   * Get cluster summaries for GET /locations (FRD §F09.5).
   *
   * Returns {id, level, lat, lon, count} for each cluster at the given zoom level
   * that has at least one visible ticket matching the filters.
   *
   * Role-based category visibility filter applied via displayPermissionLevel (FRD §F02.5).
   * Uses ST_Y(center) for lat and ST_X(center) for lon — PostGIS geometry accessor functions.
   */
  async getClusterSummaries(
    zoomLevel: number,
    permissionLevels: string[],
    status?: string,
    categoryId?: number,
  ): Promise<ClusterSummary[]> {
    // Build dynamic SQL fragments for optional filters
    const statusClause = status ? `AND t.status = '${status === 'open' ? 'open' : 'closed'}'` : '';
    const categoryClause = categoryId ? `AND t.category_id = ${categoryId}` : '';

    // Using template literal with Prisma.$queryRaw — inject scalar values via ${} (parameterized).
    // The permission level IN list must be constructed carefully; use $queryRawUnsafe only if needed.
    // Since permissionLevels is a controlled array (never user input), format it as a SQL array literal.
    const levelsLiteral = permissionLevels.map(l => `'${l}'`).join(', ');

    const results = await this.prisma.$queryRawUnsafe<Array<{
      id: number;
      level: number;
      lat: number;
      lon: number;
      count: string;
    }>>(
      `SELECT
          gc.id,
          gc.level,
          ST_Y(gc.center) AS lat,
          ST_X(gc.center) AS lon,
          COUNT(tgd.ticket_id)::text AS count
       FROM "geoclusters" gc
       JOIN "ticket_geodata" tgd ON (
           CASE gc.level
             WHEN 0 THEN tgd.cluster_id_0
             WHEN 1 THEN tgd.cluster_id_1
             WHEN 2 THEN tgd.cluster_id_2
             WHEN 3 THEN tgd.cluster_id_3
             WHEN 4 THEN tgd.cluster_id_4
             WHEN 5 THEN tgd.cluster_id_5
             WHEN 6 THEN tgd.cluster_id_6
           END = gc.id
       )
       JOIN "tickets" t ON t.id = tgd.ticket_id
       JOIN "categories" cat ON cat.id = t.category_id
       WHERE gc.level = ${zoomLevel}
         AND cat."displayPermissionLevel" IN (${levelsLiteral})
         ${statusClause}
         ${categoryClause}
       GROUP BY gc.id, gc.level, gc.center
       HAVING COUNT(tgd.ticket_id) > 0
       ORDER BY gc.id ASC`,
    );

    return results.map(r => ({
      id: Number(r.id),
      level: Number(r.level),
      lat: Number(r.lat),
      lon: Number(r.lon),
      count: parseInt(r.count, 10),
    }));
  }
}
```

---

### src/modules/geo/geo.service.ts

GeoClusterService: business logic for cluster assignment and map query.

**Critical design per FRD §F09.2:**
- For each of 7 levels, run `findNearestCluster(level, lon, lat)` → may return null if no clusters seeded at that level
- Upsert all 7 cluster IDs atomically into ticket_geodata

**Fire-and-forget pattern:** TicketsService calls `assignClusters()` without awaiting errors — geo failure must NOT fail the ticket write (FRD §F09.4: "re-cluster failure does not fail the ticket update").

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { GeoRepository, ClusterSummary } from './geo.repository';
import { GetLocationsDto } from './dto/get-locations.dto';

/** Map role to displayPermissionLevel array (mirrors CategoriesService/Open311Service pattern) */
function permissionLevels(role: string | null | undefined): string[] {
  if (role === 'staff') return ['staff', 'public', 'anonymous'];
  if (role) return ['public', 'anonymous'];
  return ['anonymous'];
}

@Injectable()
export class GeoClusterService {
  constructor(private readonly repo: GeoRepository) {}

  /**
   * Assign ticket to nearest geoclusters at each of the 7 zoom levels (FRD §F09.2).
   *
   * Called by TicketsService after ticket create/update when lat/lon is provided.
   * Failure is caught and logged — must NOT propagate to caller (FRD §F09.4).
   *
   * @param ticketId - The ticket's primary key
   * @param lat - Latitude (degrees, -90 to 90)
   * @param lon - Longitude (degrees, -180 to 180)
   */
  async assignClusters(ticketId: number, lat: number, lon: number): Promise<void> {
    // Run nearest-neighbor query for all 7 levels (0–6) in parallel for efficiency
    const clusterIdPromises = Array.from({ length: 7 }, (_, level) =>
      this.repo.findNearestCluster(level, lon, lat),
    );

    const clusterIds = await Promise.all(clusterIdPromises) as [
      number | null, number | null, number | null, number | null,
      number | null, number | null, number | null,
    ];

    // Upsert ticket_geodata row (FRD §F09.2 step 3)
    await this.repo.upsertGeodata(ticketId, clusterIds);
  }

  /**
   * Delete ticket_geodata row when lat/lon is cleared to null (FRD §F09.4).
   */
  async deleteGeodata(ticketId: number): Promise<void> {
    await this.repo.deleteGeodata(ticketId);
  }

  /**
   * GET /locations — return cluster summaries for map rendering (FRD §F09.5).
   *
   * @param role - Caller's role (null = anonymous, 'staff' = staff, etc.)
   * @param dto - Validated query params: zoom_level (0–6), status, category_id
   */
  async getLocations(
    role: string | null | undefined,
    dto: GetLocationsDto,
  ): Promise<ClusterSummary[]> {
    const zoomLevel = dto.zoom_level ?? 3;

    // Validate zoom_level range (FRD §F09.5 error state)
    if (zoomLevel < 0 || zoomLevel > 6) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'zoom_level must be 0–6' });
    }

    const levels = permissionLevels(role);

    return this.repo.getClusterSummaries(zoomLevel, levels, dto.status, dto.category_id);
  }

  /**
   * Bulk re-cluster all tickets with lat/lon (FRD §F09.3).
   * Used by scripts/recluster.ts — NOT exposed via HTTP.
   *
   * Process:
   * 1. Truncate ticket_geodata
   * 2. Load all tickets with lat/lon in batches of 500
   * 3. For each ticket, run assignClusters()
   * 4. Log progress
   */
  async reClusterAll(batchSize = 500): Promise<void> {
    console.log('[recluster] Starting bulk re-cluster...');

    await this.repo.truncateGeodata();
    console.log('[recluster] ticket_geodata truncated.');

    const total = await this.repo.countTicketsWithLocation();
    console.log(`[recluster] Found ${total} tickets with lat/lon.`);

    let processed = 0;
    const startTime = Date.now();

    while (processed < total) {
      const batch = await this.repo.findTicketsWithLocation(processed, batchSize);
      if (batch.length === 0) break;

      await Promise.all(
        batch.map(t => this.assignClusters(t.id, t.latitude, t.longitude)),
      );

      processed += batch.length;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[recluster] Processed ${processed}/${total} tickets (${elapsed}s elapsed)`);
    }

    console.log(`[recluster] Done. ${processed} tickets re-clustered.`);
  }
}
```

---

### src/modules/geo/locations.controller.ts

Per TechArch §2.1 GeoModule, FRD §F09.5:

```typescript
import { Controller, Get, Query, Req, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { GeoClusterService } from './geo.service';
import { GetLocationsDto } from './dto/get-locations.dto';

/** Extract caller's role from req.user (set by AuthMiddleware) */
function getRole(req: Request): string | null {
  return (req as any).user?.role ?? null;
}

@Controller('locations')
export class LocationsController {
  constructor(private readonly geoClusterService: GeoClusterService) {}

  /**
   * GET /locations — cluster data for front-end map rendering (FRD §F09.5).
   *
   * Auth: [anon] — anonymous callers see only anonymous-displayPermissionLevel clusters.
   * Returns: Array of { id, level, lat, lon, count }.
   * Error: 400 if zoom_level outside 0–6.
   */
  @Get()
  getLocations(@Query() dto: GetLocationsDto, @Req() req: Request) {
    return this.geoClusterService.getLocations(getRole(req), dto);
  }
}
```

---

### src/modules/geo/geo.module.ts

```typescript
import { Module } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { GeoClusterService } from './geo.service';
import { GeoRepository } from './geo.repository';

@Module({
  controllers: [LocationsController],
  providers: [GeoClusterService, GeoRepository],
  /**
   * Export GeoClusterService so TicketsModule can inject it for incremental cluster assignment.
   */
  exports: [GeoClusterService],
})
export class GeoModule {}
```
  </action>
  <verify>
```bash
npx tsc --noEmit 2>&1 | grep -E 'geo|Geo|locations|cluster' | head -20 && echo "TSC_GEO_OK"
grep -n 'export class GeoClusterService' src/modules/geo/geo.service.ts && echo GEO_SERVICE_OK
grep -n 'assignClusters\|deleteGeodata\|getLocations\|reClusterAll' src/modules/geo/geo.service.ts && echo GEO_METHODS_OK
grep -n 'export class GeoRepository' src/modules/geo/geo.repository.ts && echo REPO_OK
grep -n 'findNearestCluster\|upsertGeodata\|deleteGeodata\|truncateGeodata' src/modules/geo/geo.repository.ts && echo REPO_METHODS_OK
grep -n 'queryRaw.*geoclusters\|geoclusters.*queryRaw\|ST_MakePoint\|<->' src/modules/geo/geo.repository.ts && echo KNN_QUERY_OK
grep -n 'ON CONFLICT.*ticket_id.*DO UPDATE' src/modules/geo/geo.repository.ts && echo UPSERT_OK
grep -n 'export class LocationsController' src/modules/geo/locations.controller.ts && echo CTRL_OK
grep -n 'export class GeoModule' src/modules/geo/geo.module.ts && grep -n 'GeoClusterService' src/modules/geo/geo.module.ts && echo MODULE_OK
grep -n 'exports.*GeoClusterService\|GeoClusterService.*exports' src/modules/geo/geo.module.ts && echo EXPORT_OK
```
  </verify>
  <done>
- `GeoRepository` has `findNearestCluster(level, lon, lat)` using PostGIS `<->` KNN operator via `$queryRaw` with correct `ST_SetSRID(ST_MakePoint(lon, lat), 4326)` — lon before lat (PostGIS convention)
- `GeoRepository.upsertGeodata()` uses `INSERT ... ON CONFLICT (ticket_id) DO UPDATE SET` pattern (FRD §F09.2 step 3)
- `GeoRepository.getClusterSummaries()` returns `{id, level, lat, lon, count}` using `ST_Y(center)` for lat and `ST_X(center)` for lon
- `GeoClusterService.assignClusters()` queries all 7 levels in parallel and upserts ticket_geodata
- `GeoClusterService.getLocations()` throws 400 `INVALID_INPUT` for zoom_level outside 0–6 (FRD §F09.5)
- `LocationsController` exposes `GET /locations` accepting `zoom_level`, `status`, `category_id` query params
- `GeoModule` exports `GeoClusterService` for injection by TicketsModule
- TypeScript compiles with zero errors for geo module files
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire GeoClusterService into TicketsService + recluster script + AppModule</name>
  <files>
    src/modules/tickets/tickets.service.ts
    scripts/recluster.ts
    src/app.module.ts
  </files>
  <action>
Hook GeoClusterService into TicketsService (incremental cluster assignment on create/update), write the standalone recluster script, and import GeoModule into AppModule.

---

### src/modules/tickets/tickets.service.ts (update)

The existing TicketsService (from plans 09-10) has stub comments:
```
// HOOK: wave 5 — if lat/lon changed: GeoClusterService.assignClusters(ticketId, lat, lon)
```

Update TicketsService to inject `GeoClusterService` (optional — if GeoModule not yet loaded, gracefully no-op) and call it at the correct points.

**Key FRD §F09.4 rules:**
- `create()`: if `latitude` and `longitude` are both non-null → call `assignClusters()` **fire-and-forget** (catch error, log, do not rethrow)
- `update()`: if `latitude` or `longitude` changed → call `assignClusters()` fire-and-forget
- `update()`: if lat/lon cleared to null → call `deleteGeodata()` fire-and-forget

**Integration pattern** — add `GeoClusterService` as optional injection:

```typescript
// In TicketsService constructor, add GeoClusterService as @Optional():
import { Optional } from '@nestjs/common';
import { GeoClusterService } from '../geo/geo.service';

// constructor update:
constructor(
  private readonly repo: TicketsRepository,
  // ... existing injections (CategoriesService, PeopleService) ...
  @Optional() private readonly geoClusterService?: GeoClusterService,
) {}

// Private helper — fire-and-forget geo cluster assignment:
private fireAndForgetAssign(ticketId: number, lat: number | null | undefined, lon: number | null | undefined): void {
  if (!this.geoClusterService || lat == null || lon == null) return;
  this.geoClusterService.assignClusters(ticketId, lat, lon).catch((err: Error) => {
    // Geo failure must NOT fail the ticket operation (FRD §F09.4)
    console.error(`[GeoCluster] assignClusters failed for ticket ${ticketId}:`, err?.message);
  });
}

// Private helper — fire-and-forget geo data deletion when lat/lon cleared:
private fireAndForgetDelete(ticketId: number): void {
  if (!this.geoClusterService) return;
  this.geoClusterService.deleteGeodata(ticketId).catch((err: Error) => {
    console.error(`[GeoCluster] deleteGeodata failed for ticket ${ticketId}:`, err?.message);
  });
}
```

**In `create()` — after ticket created and 'open' history appended:**
```typescript
// FRD §F09.4 — assign geo-clusters if lat/lon provided (fire-and-forget)
this.fireAndForgetAssign(ticket.id, dto.latitude, dto.longitude);
```

**In `update()` — after ticket updated:**
```typescript
// FRD §F09.4 — geo re-cluster on lat/lon change
const latChanged = dto.latitude !== undefined && dto.latitude !== existing.latitude;
const lonChanged = dto.longitude !== undefined && dto.longitude !== existing.longitude;
const latCleared = dto.latitude === null;
const lonCleared = dto.longitude === null;

if (latCleared && lonCleared) {
  // lat/lon explicitly cleared → delete ticket_geodata row
  this.fireAndForgetDelete(ticket.id);
} else if (latChanged || lonChanged) {
  const newLat = dto.latitude ?? existing.latitude;
  const newLon = dto.longitude ?? existing.longitude;
  this.fireAndForgetAssign(ticket.id, newLat, newLon);
}
```

**Update TicketsModule to import GeoModule:**

```typescript
// src/modules/tickets/tickets.module.ts — add GeoModule import:
import { GeoModule } from '../geo/geo.module';

@Module({
  imports: [CategoriesModule, PeopleModule, GeoModule],  // add GeoModule
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository],
  exports: [TicketsService],
})
export class TicketsModule {}
```

Also update `src/modules/tickets/tickets.module.ts` in the same edit pass.

**Implementation note:** The existing TicketsService in plans 09-10 already has the hook comments. This task adds the actual implementation. Do NOT rewrite the entire service — only add the GeoClusterService injection and the three call sites (`create`, `update`, and the helper methods). Preserve all existing business logic.

---

### scripts/recluster.ts

Standalone NestJS application context script per FRD §F09.3. Idempotent (truncates first). Exits with non-zero code on error.

```typescript
/**
 * scripts/recluster.ts
 *
 * Bulk re-cluster script (FRD §F09.3).
 * Truncates ticket_geodata, then reprocesses all tickets with lat/lon in batches of 500.
 *
 * Usage:
 *   npx ts-node scripts/recluster.ts
 *   # or via package.json script: npm run recluster
 *
 * Idempotent: safe to run multiple times (truncates before processing).
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { GeoClusterService } from '../src/modules/geo/geo.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const geoService = app.get(GeoClusterService);
    await geoService.reClusterAll(500);
    console.log('[recluster] Script completed successfully.');
  } catch (err) {
    console.error('[recluster] Script failed:', (err as Error).message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap().catch(err => {
  console.error('[recluster] Unhandled error:', err);
  process.exit(1);
});
```

---

### src/app.module.ts (update)

Add `GeoModule` to the root module imports. Merge with the accumulated imports from waves 1–4 (PrismaModule, GelfLoggerModule, AuthModule, AdminModule, CategoriesModule, DepartmentsModule, PeopleModule, TicketsModule, Open311Module). Add `GeoModule` from `./modules/geo/geo.module`:

```typescript
// In the imports array, add:
import { GeoModule } from './modules/geo/geo.module';

// Add to @Module({ imports: [..., GeoModule] })
```

Do NOT rewrite the entire AppModule — only add the GeoModule import and the corresponding entry in the imports array, preserving all existing module registrations from prior waves.
  </action>
  <verify>
```bash
grep -n 'GeoClusterService\|geoClusterService' src/modules/tickets/tickets.service.ts && echo GEO_HOOK_IN_TICKETS_OK
grep -n 'fireAndForgetAssign\|fireAndForgetDelete' src/modules/tickets/tickets.service.ts && echo FIRE_FORGET_HELPERS_OK
grep -n 'assignClusters.*catch\|catch.*assignClusters\|fireAndForgetAssign' src/modules/tickets/tickets.service.ts && echo FIRE_FORGET_CATCH_OK
grep -n 'GeoModule' src/modules/tickets/tickets.module.ts && echo GEO_MODULE_IN_TICKETS_MODULE_OK
grep -n 'GeoModule' src/app.module.ts && echo GEO_MODULE_IN_APP_OK
ls scripts/recluster.ts && echo RECLUSTER_SCRIPT_OK
grep -n 'reClusterAll\|geoService' scripts/recluster.ts && echo RECLUSTER_CALLS_SERVICE_OK
grep -n 'process.exit(1)' scripts/recluster.ts && echo RECLUSTER_NONZERO_EXIT_OK
npx tsc --noEmit 2>&1 | grep -v '^$' | head -20 && echo "TSC_FINAL_OK"
```
  </verify>
  <done>
- `TicketsService` injects `GeoClusterService` with `@Optional()` from `../geo/geo.service`
- `TicketsService` has `fireAndForgetAssign()` and `fireAndForgetDelete()` private helpers that catch errors and log without rethrowing (FRD §F09.4 — geo failure must not fail ticket operation)
- `TicketsService.create()` calls `fireAndForgetAssign(ticket.id, dto.latitude, dto.longitude)` after ticket is persisted
- `TicketsService.update()` calls `fireAndForgetAssign()` on lat/lon change; calls `fireAndForgetDelete()` if lat/lon cleared to null (FRD §F09.4)
- `TicketsModule` imports `GeoModule` so `GeoClusterService` is available for injection
- `scripts/recluster.ts` bootstraps NestJS application context, calls `GeoClusterService.reClusterAll(500)`, exits with code 1 on failure (idempotent — truncates before processing per FRD §F09.3)
- `src/app.module.ts` imports `GeoModule`
- TypeScript compiles with zero errors
  </done>
</task>

</tasks>

<verification>
```bash
# Geo module structure
ls src/modules/geo/{geo.module.ts,geo.service.ts,geo.repository.ts,locations.controller.ts,dto/get-locations.dto.ts} && echo GEO_MODULE_STRUCTURE_OK

# GeoClusterService exports
grep -n 'export class GeoClusterService' src/modules/geo/geo.service.ts && echo SERVICE_EXPORT_OK

# PostGIS KNN operator present
grep -n '<->' src/modules/geo/geo.repository.ts && echo KNN_OPERATOR_OK

# Upsert pattern present (ON CONFLICT)
grep -n 'ON CONFLICT' src/modules/geo/geo.repository.ts && echo UPSERT_PATTERN_OK

# 7 cluster levels covered
grep -n 'cluster_id_0\|cluster_id_6' src/modules/geo/geo.repository.ts && echo SEVEN_LEVELS_OK

# GeoModule exported
grep -n 'exports.*GeoClusterService' src/modules/geo/geo.module.ts && echo MODULE_EXPORTS_OK

# TicketsService hooked
grep -n 'geoClusterService\|GeoClusterService' src/modules/tickets/tickets.service.ts && echo TICKETS_HOOK_OK

# Recluster script
ls scripts/recluster.ts && grep -n 'reClusterAll' scripts/recluster.ts && echo RECLUSTER_OK

# AppModule imports GeoModule
grep -n 'GeoModule' src/app.module.ts && echo APPMODULE_OK

# Full TypeScript check
npx tsc --noEmit 2>&1 | grep -c 'error TS' && echo "TS_ERROR_COUNT_ABOVE" || echo "TSC_ZERO_ERRORS"
```
</verification>

<success_criteria>
- `GeoModule` (`src/modules/geo/`) is complete with `GeoRepository`, `GeoClusterService`, `LocationsController`, and module wiring
- `GeoRepository.findNearestCluster()` uses PostGIS `<->` KNN operator: `ORDER BY center <-> ST_SetSRID(ST_MakePoint(lon, lat), 4326) LIMIT 1` (FRD §F09.2)
- `GeoRepository.upsertGeodata()` upserts all 7 cluster IDs atomically with `ON CONFLICT (ticket_id) DO UPDATE` (FRD §F09.2 step 3)
- `GET /locations` returns `{id, level, lat, lon, count}` array filtered by caller's role category visibility (FRD §F09.5); returns 400 on invalid zoom_level
- `TicketsService.create()` calls `assignClusters()` fire-and-forget when lat/lon provided (FRD §F09.4)
- `TicketsService.update()` calls `assignClusters()` fire-and-forget on lat/lon change; calls `deleteGeodata()` when lat/lon cleared (FRD §F09.4)
- `scripts/recluster.ts` is idempotent (truncates first), processes in batches of 500, exits non-zero on failure (FRD §F09.3)
- `GeoModule` imported into `AppModule`
- TypeScript strict mode: zero compilation errors
</success_criteria>

<output>
After completion, create `.planning/express/modernize-legacy-php-ureport-open311-geo/15-SUMMARY.md` summarizing:
- Files created/modified
- GeoModule components implemented
- Integration points with TicketsService (create/update hooks)
- recluster script location and usage
- Any deviations from TechArch or FRD (flag conflicts, do not silently diverge)
</output>
