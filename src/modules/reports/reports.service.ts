import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  MetricsQueryDto,
  MetricsDto,
  CategoryBreakdown,
  DepartmentBreakdown,
} from './dto/metrics-query.dto';
import type {
  ReportsQueryDto,
  ReportRowDto,
  ReportsResponseDto,
} from './dto/reports-query.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // F13.1 — Dashboard Metrics (live SQL aggregations)
  // =========================================================================

  /**
   * Compute dashboard metrics via live SQL aggregations (FRD §F13.1).
   *
   * No caching: staleness = ~0ms (FRD §F13.1 requirement: ≤5 min, actual ~0ms).
   * ≤200ms performance: guaranteed by existing indexes from wave 1:
   *   - idx_tickets_status ON tickets(status)
   *   - idx_tickets_enteredDate ON tickets("enteredDate")
   *   - idx_tickets_category_id ON tickets(category_id)
   *
   * All queries honour the optional start_date / end_date date range filter.
   */
  async getMetrics(dto: MetricsQueryDto): Promise<MetricsDto> {
    // Build optional date range WHERE clauses
    const startDate: Date | null = dto.start_date ? new Date(dto.start_date) : null;
    const endDate: Date | null = dto.end_date ? new Date(dto.end_date) : null;

    // ---- openCount: SELECT COUNT(*) FROM tickets WHERE status = 'open' [+ date filter]
    // ---- closedCount: SELECT COUNT(*) FROM tickets WHERE status = 'closed' [+ date filter]
    // ---- totalCount: SELECT COUNT(*) FROM tickets [+ date filter]
    // Run as a single multi-aggregate query for efficiency
    let countQuery: string;
    let countParams: Array<Date | string>;

    if (startDate && endDate) {
      countQuery = `
        SELECT
          COUNT(*) FILTER (WHERE status = 'open')::int   AS "openCount",
          COUNT(*) FILTER (WHERE status = 'closed')::int AS "closedCount",
          COUNT(*)::int                                  AS "totalCount"
        FROM "tickets"
        WHERE "enteredDate" >= $1 AND "enteredDate" <= $2
      `;
      countParams = [startDate, endDate];
    } else if (startDate) {
      countQuery = `
        SELECT
          COUNT(*) FILTER (WHERE status = 'open')::int   AS "openCount",
          COUNT(*) FILTER (WHERE status = 'closed')::int AS "closedCount",
          COUNT(*)::int                                  AS "totalCount"
        FROM "tickets"
        WHERE "enteredDate" >= $1
      `;
      countParams = [startDate];
    } else if (endDate) {
      countQuery = `
        SELECT
          COUNT(*) FILTER (WHERE status = 'open')::int   AS "openCount",
          COUNT(*) FILTER (WHERE status = 'closed')::int AS "closedCount",
          COUNT(*)::int                                  AS "totalCount"
        FROM "tickets"
        WHERE "enteredDate" <= $1
      `;
      countParams = [endDate];
    } else {
      countQuery = `
        SELECT
          COUNT(*) FILTER (WHERE status = 'open')::int   AS "openCount",
          COUNT(*) FILTER (WHERE status = 'closed')::int AS "closedCount",
          COUNT(*)::int                                  AS "totalCount"
        FROM "tickets"
      `;
      countParams = [];
    }

    const countRows = await (this.prisma.$queryRawUnsafe as any)(countQuery, ...countParams) as Array<{
      openCount: number;
      closedCount: number;
      totalCount: number;
    }>;

    const counts = countRows[0] ?? { openCount: 0, closedCount: 0, totalCount: 0 };

    // ---- avgResolutionDays: AVG(EXTRACT(EPOCH FROM (closedDate - enteredDate)) / 86400)
    // Exact SQL from FRD §F13.1 — filtered to closed tickets only
    let avgQuery: string;
    let avgParams: Array<Date | string>;

    if (startDate && endDate) {
      avgQuery = `
        SELECT AVG(EXTRACT(EPOCH FROM ("closedDate" - "enteredDate")) / 86400) AS "avgDays"
        FROM "tickets"
        WHERE status = 'closed'
          AND "enteredDate" >= $1 AND "enteredDate" <= $2
      `;
      avgParams = [startDate, endDate];
    } else if (startDate) {
      avgQuery = `
        SELECT AVG(EXTRACT(EPOCH FROM ("closedDate" - "enteredDate")) / 86400) AS "avgDays"
        FROM "tickets"
        WHERE status = 'closed'
          AND "enteredDate" >= $1
      `;
      avgParams = [startDate];
    } else if (endDate) {
      avgQuery = `
        SELECT AVG(EXTRACT(EPOCH FROM ("closedDate" - "enteredDate")) / 86400) AS "avgDays"
        FROM "tickets"
        WHERE status = 'closed'
          AND "enteredDate" <= $1
      `;
      avgParams = [endDate];
    } else {
      avgQuery = `
        SELECT AVG(EXTRACT(EPOCH FROM ("closedDate" - "enteredDate")) / 86400) AS "avgDays"
        FROM "tickets"
        WHERE status = 'closed'
      `;
      avgParams = [];
    }

    const avgRows = await (this.prisma.$queryRawUnsafe as any)(avgQuery, ...avgParams) as Array<{ avgDays: string | null }>;
    const avgResolutionDays = avgRows[0]?.avgDays != null ? parseFloat(avgRows[0].avgDays) : null;

    // ---- byCategory: SELECT category_id, COUNT(*) GROUP BY category_id + JOIN categories for name
    // FRD §F13.1: byCategory = [{category_id, category_name, count}]
    let dateWhere = '';
    let dateValues: Array<Date | string> = [];
    if (startDate && endDate) {
      dateWhere = `t."enteredDate" >= $1 AND t."enteredDate" <= $2`;
      dateValues = [startDate, endDate];
    } else if (startDate) {
      dateWhere = `t."enteredDate" >= $1`;
      dateValues = [startDate];
    } else if (endDate) {
      dateWhere = `t."enteredDate" <= $1`;
      dateValues = [endDate];
    }

    const dateFilterClause = dateWhere ? `AND ${dateWhere}` : '';

    const byCatQuery = `
      SELECT
        t.category_id,
        c.name AS category_name,
        COUNT(*)::int AS count
      FROM "tickets" t
      LEFT JOIN "categories" c ON c.id = t.category_id
      WHERE t.category_id IS NOT NULL
        ${dateFilterClause}
      GROUP BY t.category_id, c.name
      ORDER BY count DESC
    `;

    const byCatRows = await (this.prisma.$queryRawUnsafe as any)(byCatQuery, ...dateValues) as Array<{
      category_id: number;
      category_name: string | null;
      count: number;
    }>;

    const byCategory: CategoryBreakdown[] = byCatRows.map(r => ({
      category_id: Number(r.category_id),
      category_name: r.category_name ?? '',
      count: Number(r.count),
    }));

    // ---- byDepartment: join categories → departments, GROUP BY department_id
    // FRD §F13.1: byDepartment = [{department_id, department_name, count}]
    const byDeptQuery = `
      SELECT
        d.id   AS department_id,
        d.name AS department_name,
        COUNT(t.id)::int AS count
      FROM "tickets" t
      JOIN "categories" c ON c.id = t.category_id
      JOIN "departments" d ON d.id = c.department_id
      WHERE t.category_id IS NOT NULL
        ${dateFilterClause}
      GROUP BY d.id, d.name
      ORDER BY count DESC
    `;

    const byDeptRows = await (this.prisma.$queryRawUnsafe as any)(byDeptQuery, ...dateValues) as Array<{
      department_id: number;
      department_name: string;
      count: number;
    }>;

    const byDepartment: DepartmentBreakdown[] = byDeptRows.map(r => ({
      department_id: Number(r.department_id),
      department_name: r.department_name,
      count: Number(r.count),
    }));

    return {
      openCount: Number(counts.openCount),
      closedCount: Number(counts.closedCount),
      totalCount: Number(counts.totalCount),
      avgResolutionDays,
      byCategory,
      byDepartment,
    };
  }

  // =========================================================================
  // F13.2 — Exportable Reports (paginated filtered ticket query)
  // =========================================================================

  /**
   * Return a paginated, filtered list of ticket report rows (FRD §F13.2).
   *
   * Filters: start_date, end_date, status, category_id, department_id
   * Output fields per row: id, status, category_name, department_name,
   *   location, city, zip, enteredDate, closedDate, substatus_name, description
   * Pagination: page (1-based), page_size (default 100, max 1000)
   */
  async getReports(dto: ReportsQueryDto): Promise<ReportsResponseDto> {
    const page = dto.page ?? 1;
    const pageSize = Math.min(dto.page_size ?? 100, 1000);
    const offset = (page - 1) * pageSize;

    // Build WHERE conditions dynamically
    const conditions: string[] = [];
    const params: Array<Date | string | number> = [];
    let paramIdx = 1;

    if (dto.start_date) {
      conditions.push(`t."enteredDate" >= $${paramIdx++}`);
      params.push(new Date(dto.start_date));
    }
    if (dto.end_date) {
      conditions.push(`t."enteredDate" <= $${paramIdx++}`);
      params.push(new Date(dto.end_date));
    }
    if (dto.status) {
      conditions.push(`t.status = $${paramIdx++}`);
      params.push(dto.status);
    }
    if (dto.category_id !== undefined) {
      conditions.push(`t.category_id = $${paramIdx++}`);
      params.push(dto.category_id);
    }
    if (dto.department_id !== undefined) {
      conditions.push(`c.department_id = $${paramIdx++}`);
      params.push(dto.department_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const countQuery = `
      SELECT COUNT(t.id)::int AS total
      FROM "tickets" t
      LEFT JOIN "categories" c ON c.id = t.category_id
      ${whereClause}
    `;

    const countRows = await (this.prisma.$queryRawUnsafe as any)(countQuery, ...params) as Array<{ total: number }>;
    const total = Number(countRows[0]?.total ?? 0);

    // Paginated data query — all output fields from FRD §F13.2
    const dataQuery = `
      SELECT
        t.id,
        t.status,
        c.name         AS category_name,
        d.name         AS department_name,
        t.location,
        t.city,
        t.zip,
        t."enteredDate",
        t."closedDate",
        s.name         AS substatus_name,
        t.description
      FROM "tickets" t
      LEFT JOIN "categories"  c ON c.id = t.category_id
      LEFT JOIN "departments" d ON d.id = c.department_id
      LEFT JOIN "substatus"   s ON s.id = t.substatus_id
      ${whereClause}
      ORDER BY t."enteredDate" DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;

    const dataRows = await (this.prisma.$queryRawUnsafe as any)(
      dataQuery,
      ...params,
      pageSize,
      offset,
    ) as Array<{
      id: number;
      status: string;
      category_name: string | null;
      department_name: string | null;
      location: string | null;
      city: string | null;
      zip: string | null;
      enteredDate: Date;
      closedDate: Date | null;
      substatus_name: string | null;
      description: string | null;
    }>;

    const results: ReportRowDto[] = dataRows.map(r => ({
      id: Number(r.id),
      status: r.status,
      category_name: r.category_name ?? null,
      department_name: r.department_name ?? null,
      location: r.location ?? null,
      city: r.city ?? null,
      zip: r.zip ?? null,
      enteredDate: r.enteredDate instanceof Date ? r.enteredDate.toISOString() : String(r.enteredDate),
      closedDate: r.closedDate instanceof Date ? r.closedDate.toISOString() : (r.closedDate ? String(r.closedDate) : null),
      substatus_name: r.substatus_name ?? null,
      description: r.description ?? null,
    }));

    return { total, page, page_size: pageSize, results };
  }
}
