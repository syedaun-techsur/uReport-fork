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
