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
   * Uses Euclidean distance on center_lat/center_lng (no PostGIS required).
   * NOTE: lon maps to center_lng, lat maps to center_lat.
   * Returns null if no geoclusters rows exist at that level.
   */
  async findNearestCluster(level: number, lon: number, lat: number): Promise<number | null> {
    const results = await this.prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id
      FROM "geoclusters"
      WHERE level = ${level}::smallint
        AND center_lat IS NOT NULL
        AND center_lng IS NOT NULL
      ORDER BY (center_lat - ${lat}) * (center_lat - ${lat}) + (center_lng - ${lon}) * (center_lng - ${lon})
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
   * Uses center_lat / center_lng plain Float columns (no PostGIS required).
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
          gc.center_lat AS lat,
          gc.center_lng AS lon,
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
       GROUP BY gc.id, gc.level, gc.center_lat, gc.center_lng
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
