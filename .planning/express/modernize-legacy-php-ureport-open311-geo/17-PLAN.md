---
phase: wave-6-integration
plan: 17
type: execute
wave: 6
depends_on: [5]
files_modified:
  - src/modules/reports/reports.module.ts
  - src/modules/reports/reports.service.ts
  - src/modules/reports/metrics.controller.ts
  - src/modules/reports/reports.controller.ts
  - src/modules/reports/dto/metrics-query.dto.ts
  - src/modules/reports/dto/reports-query.dto.ts
  - src/app.module.ts
autonomous: true

features:
  implements: ["F13"]
  depends_on: ["F1", "F2", "F3"]
  enables: []

must_haves:
  truths:
    - "GET /metrics returns openCount, closedCount, totalCount, avgResolutionDays, byCategory[], byDepartment[] — computed via live SQL aggregations (no cache) so staleness is ~0ms"
    - "GET /metrics accepts optional start_date and end_date (ISO 8601) to filter by enteredDate range"
    - "GET /metrics returns HTTP 403 for non-staff callers"
    - "GET /metrics response is available in all five formats via SerializationInterceptor (JSON/XML/CSV/TXT/HTML)"
    - "GET /metrics responds in ≤200ms due to indexes on tickets.status, tickets.enteredDate, tickets.category_id"
    - "GET /reports returns paginated ticket rows: id, status, category_name, department_name, location, city, zip, enteredDate, closedDate, substatus_name, description"
    - "GET /reports accepts: start_date, end_date, status, category_id, department_id, page (default 1), page_size (default 100, max 1000)"
    - "GET /reports returns HTTP 403 for non-staff callers"
    - "GET /reports response is available in all five formats via SerializationInterceptor (JSON/XML/CSV/TXT/HTML)"
    - "ReportsModule is imported into AppModule"
  artifacts:
    - path: "src/modules/reports/reports.module.ts"
      provides: "ReportsModule — MetricsController + ReportsController + ReportsService"
      exports: ["ReportsModule"]
    - path: "src/modules/reports/reports.service.ts"
      provides: "ReportsService: getMetrics(dto), getReports(dto) — live Prisma aggregate queries"
      exports: ["ReportsService"]
    - path: "src/modules/reports/metrics.controller.ts"
      provides: "MetricsController: GET /metrics — staff-only dashboard aggregates"
      exports: ["MetricsController"]
    - path: "src/modules/reports/reports.controller.ts"
      provides: "ReportsController: GET /reports — paginated filterable ticket report, all 5 formats"
      exports: ["ReportsController"]
  key_links:
    - from: "src/modules/reports/reports.service.ts"
      to: "prisma/schema.prisma"
      via: "PrismaService — $queryRaw aggregate queries on tickets JOIN categories JOIN departments JOIN substatus"
      pattern: "prisma\\.\\$queryRaw\\|prisma\\.tickets\\.findMany"
    - from: "src/modules/reports/metrics.controller.ts"
      to: "src/modules/reports/reports.service.ts"
      via: "MetricsController.getMetrics() calls ReportsService.getMetrics()"
      pattern: "reportsService\\.getMetrics"
    - from: "src/modules/reports/reports.controller.ts"
      to: "src/modules/reports/reports.service.ts"
      via: "ReportsController.getReports() calls ReportsService.getReports()"
      pattern: "reportsService\\.getReports"
    - from: "src/app.module.ts"
      to: "src/modules/reports/reports.module.ts"
      via: "AppModule imports ReportsModule"
      pattern: "ReportsModule"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "prisma/schema.prisma"
      exports: ["tickets", "categories", "departments", "substatus"]
      verify: "grep -n 'model tickets' prisma/schema.prisma && grep -n 'model categories' prisma/schema.prisma && grep -n 'model departments' prisma/schema.prisma && grep -n 'model substatus' prisma/schema.prisma && echo CONTRACT_OK"
    - from_plan: "03"
      artifact: "src/common/interceptors/serialization.interceptor.ts"
      exports: ["SerializationInterceptor"]
      verify: "grep -n 'export.*SerializationInterceptor' src/common/interceptors/serialization.interceptor.ts && echo CONTRACT_OK"
    - from_plan: "06"
      artifact: "src/common/guards/casl.guard.ts"
      exports: ["CaslGuard"]
      verify: "grep -n 'export class CaslGuard' src/common/guards/casl.guard.ts && echo CONTRACT_OK"
  provides:
    - artifact: "src/modules/reports/reports.module.ts"
      exports: ["ReportsModule"]
      shape: |
        @Module({
          imports: [PrismaModule],
          controllers: [MetricsController, ReportsController],
          providers: [ReportsService],
        })
        export class ReportsModule {}
      verify: "grep -n 'export class ReportsModule' src/modules/reports/reports.module.ts && echo CONTRACT_OK"
    - artifact: "src/modules/reports/reports.service.ts"
      exports: ["ReportsService"]
      shape: |
        @Injectable()
        export class ReportsService {
          getMetrics(dto: MetricsQueryDto): Promise<MetricsDto>
          getReports(dto: ReportsQueryDto): Promise<{ total: number; page: number; page_size: number; results: ReportRowDto[] }>
        }
      verify: "grep -n 'export class ReportsService' src/modules/reports/reports.service.ts && grep -n 'getMetrics\|getReports' src/modules/reports/reports.service.ts && echo CONTRACT_OK"

---

<objective>
Implement `ReportsModule` (F13) — the staff-only metrics dashboard and filterable report endpoints for uReport. This is the final wave 6 module and completes the full feature set (F0–F15).

Components:
1. **`ReportsService`** — executes live Prisma `$queryRaw` aggregate queries for dashboard metrics (openCount, closedCount, totalCount, avgResolutionDays, byCategory[], byDepartment[]) and paginated ticket report rows. No caching — live SQL on every request so staleness is ~0ms (FRD §F13.1).
2. **`MetricsController`** — `GET /metrics` — staff-only, accepts `start_date`/`end_date` date filters, all 5 formats via global `SerializationInterceptor`.
3. **`ReportsController`** — `GET /reports` — staff-only, filterable (date range, status, category, department), paginated, all 5 formats via global `SerializationInterceptor`.
4. **`ReportsModule`** — NestJS module wiring; imported into AppModule.

Purpose: F13 is the operational visibility feature for department supervisors (Robert Osei JTBD-04.2). The live-aggregation approach satisfies the ≤5-minute staleness requirement (actual ~0ms) while meeting ≤200ms response time via existing `idx_tickets_status`, `idx_tickets_enteredDate`, and `idx_tickets_category_id` indexes already declared in wave 1.

Output:
- `src/modules/reports/` — complete ReportsModule (6 files)
- `src/app.module.ts` — updated to import ReportsModule
</objective>

<feature_dependencies>
Implements: F13: Reporting & Metrics — MetricsController (GET /metrics: openCount, closedCount, totalCount, avgResolutionDays, byCategory[{category_id,category_name,count}], byDepartment[{department_id,department_name,count}]; live SQL aggregations; start_date/end_date date filter; ≤200ms via existing indexes); ReportsController (GET /reports: paginated ticket rows with id, status, category_name, department_name, location, city, zip, enteredDate, closedDate, substatus_name, description; filters: start_date, end_date, status, category_id, department_id, page, page_size); all 5 output formats via SerializationInterceptor; staff-only RBAC on both endpoints (FRD §F13.3 HTTP 403 for non-staff)
Depends on: F1: tickets table (source of all aggregations); F2: RBAC (staff-only guards); F3: SerializationInterceptor (5 output formats for both endpoints)
Enables: None (F13 is a leaf feature — top of dependency stack)
</feature_dependencies>

<execution_context>
@.planning/express/modernize-legacy-php-ureport-open311-geo/WAVE-SCHEDULE.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@project_specs/PRD-uReport.md (F13 section)
@project_specs/FRD-uReport.md (F13 section §F13.1–F13.3)
@project_specs/TechArch-uReport.md (§ReportsModule, §2.1 route table, §RBAC table)
</context>

<tasks>

<task type="auto">
  <name>Task 1: ReportsService + DTOs — live SQL aggregations for metrics and paginated ticket report</name>
  <files>
    src/modules/reports/dto/metrics-query.dto.ts
    src/modules/reports/dto/reports-query.dto.ts
    src/modules/reports/reports.service.ts
  </files>
  <action>
Create the `ReportsService` with two methods — `getMetrics()` (live aggregate queries per FRD §F13.1) and `getReports()` (paginated filtered ticket query per FRD §F13.2) — plus their input and output DTOs.

## Directory structure

```
src/modules/reports/
├── reports.module.ts         ← Task 2
├── reports.service.ts        ← Task 1
├── metrics.controller.ts     ← Task 2
├── reports.controller.ts     ← Task 2
└── dto/
    ├── metrics-query.dto.ts  ← Task 1
    └── reports-query.dto.ts  ← Task 1
```

---

### src/modules/reports/dto/metrics-query.dto.ts

Per FRD §F13.1 inputs:

```typescript
import { IsOptional, IsString } from 'class-validator';

/**
 * Query params for GET /metrics (FRD §F13.1).
 * Both fields are optional ISO 8601 datetimes for filtering enteredDate range.
 */
export class MetricsQueryDto {
  /**
   * ISO 8601 start date; filter: tickets.enteredDate >= start_date
   * (FRD §F13.1 inputs)
   */
  @IsOptional()
  @IsString()
  start_date?: string;

  /**
   * ISO 8601 end date; filter: tickets.enteredDate <= end_date
   * (FRD §F13.1 inputs)
   */
  @IsOptional()
  @IsString()
  end_date?: string;
}

/** Shape of a single byCategory entry (FRD §F13.1 outputs) */
export interface CategoryBreakdown {
  category_id: number;
  category_name: string;
  count: number;
}

/** Shape of a single byDepartment entry (FRD §F13.1 outputs) */
export interface DepartmentBreakdown {
  department_id: number;
  department_name: string;
  count: number;
}

/** Full metrics response object (FRD §F13.1 outputs) */
export interface MetricsDto {
  openCount: number;
  closedCount: number;
  totalCount: number;
  avgResolutionDays: number | null;
  byCategory: CategoryBreakdown[];
  byDepartment: DepartmentBreakdown[];
}
```

---

### src/modules/reports/dto/reports-query.dto.ts

Per FRD §F13.2 inputs:

```typescript
import { IsOptional, IsString, IsInt, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query params for GET /reports (FRD §F13.2).
 */
export class ReportsQueryDto {
  /** ISO 8601 start date — filter tickets.enteredDate >= start_date */
  @IsOptional()
  @IsString()
  start_date?: string;

  /** ISO 8601 end date — filter tickets.enteredDate <= end_date */
  @IsOptional()
  @IsString()
  end_date?: string;

  /** Filter by ticket status: 'open' or 'closed' */
  @IsOptional()
  @IsIn(['open', 'closed'])
  status?: 'open' | 'closed';

  /** Filter by category_id */
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  category_id?: number;

  /** Filter by department_id (via categories.department_id JOIN) */
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  department_id?: number;

  /** Page number (1-based); default 1 */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  /** Results per page; default 100, max 1000 (FRD §F13.2) */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  page_size?: number = 100;
}

/** Single row in the /reports result set (FRD §F13.2 outputs) */
export interface ReportRowDto {
  id: number;
  status: string;
  category_name: string | null;
  department_name: string | null;
  location: string | null;
  city: string | null;
  zip: string | null;
  enteredDate: string;     // ISO 8601
  closedDate: string | null; // ISO 8601 or null
  substatus_name: string | null;
  description: string | null;
}

/** Paginated response from GET /reports */
export interface ReportsResponseDto {
  total: number;
  page: number;
  page_size: number;
  results: ReportRowDto[];
}
```

---

### src/modules/reports/reports.service.ts

Live SQL aggregations per FRD §F13.1 and paginated query per FRD §F13.2.

**Key design decisions (per FRD §F13.1):**
- No caching layer — all queries run live on every request so staleness = ~0ms
- ≤200ms response time guaranteed by existing indexes on `tickets.status`, `tickets.enteredDate`, `tickets.category_id` (declared in wave 1 plan 01)
- `avgResolutionDays` uses `EXTRACT(EPOCH FROM ("closedDate" - "enteredDate")) / 86400` — exact SQL from FRD §F13.1
- `byCategory` and `byDepartment` computed in single queries with JOIN to `categories`/`departments` for names
- Date range filters applied via `WHERE "enteredDate" >= $1 AND "enteredDate" <= $2` (FRD §F13.1)

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';
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
    let byCatQuery: string;
    let byCatParams: Array<Date | string>;

    const dateFilterJoiner = (whereClause: string) => whereClause ? `AND ${whereClause}` : '';

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

    byCatQuery = `
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
    byCatParams = dateValues;

    const byCatRows = await (this.prisma.$queryRawUnsafe as any)(byCatQuery, ...byCatParams) as Array<{
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
```
  </action>
  <verify>
```bash
grep -n 'export class ReportsService' src/modules/reports/reports.service.ts && echo SERVICE_OK
grep -n 'async getMetrics\|async getReports' src/modules/reports/reports.service.ts && echo METHODS_OK
grep -n 'openCount\|closedCount\|totalCount\|avgResolutionDays' src/modules/reports/reports.service.ts && echo METRICS_FIELDS_OK
grep -n 'EXTRACT.*EPOCH.*closedDate.*enteredDate\|avgResolution' src/modules/reports/reports.service.ts && echo AVG_RESOLUTION_SQL_OK
grep -n 'byCategory\|byDepartment' src/modules/reports/reports.service.ts && echo BREAKDOWNS_OK
grep -n 'start_date\|end_date\|enteredDate' src/modules/reports/reports.service.ts && echo DATE_FILTER_OK
grep -n 'category_name\|department_name\|substatus_name\|closedDate' src/modules/reports/reports.service.ts && echo REPORT_FIELDS_OK
grep -n 'pageSize\|page_size\|OFFSET\|LIMIT' src/modules/reports/reports.service.ts && echo PAGINATION_OK
grep -n 'MetricsQueryDto\|MetricsDto' src/modules/reports/dto/metrics-query.dto.ts && echo METRICS_DTO_OK
grep -n 'ReportsQueryDto\|ReportRowDto\|ReportsResponseDto' src/modules/reports/dto/reports-query.dto.ts && echo REPORTS_DTO_OK
npx tsc --noEmit 2>&1 | grep -E 'reports|Reports|metrics|Metrics' | grep -v 'node_modules' | head -20 && echo TSC_REPORTS_OK
```
  </verify>
  <done>
- `ReportsService` has `getMetrics(dto: MetricsQueryDto): Promise<MetricsDto>` and `getReports(dto: ReportsQueryDto): Promise<ReportsResponseDto>`
- `getMetrics()` computes all 5 aggregate fields via live `$queryRawUnsafe` calls: `openCount`, `closedCount`, `totalCount` (single combined FILTER query), `avgResolutionDays` (exact SQL: `AVG(EXTRACT(EPOCH FROM ("closedDate" - "enteredDate")) / 86400)` from FRD §F13.1), `byCategory` (GROUP BY category_id JOIN categories), `byDepartment` (JOIN categories → departments GROUP BY department_id)
- `getMetrics()` applies optional `start_date`/`end_date` filters to all aggregation queries via `enteredDate >= $1 AND enteredDate <= $2`
- No caching layer — all queries run live (FRD §F13.1 staleness = ~0ms)
- `getReports()` builds dynamic WHERE conditions for all FRD §F13.2 filters (start_date, end_date, status, category_id, department_id) with correct `$N` parameterization
- `getReports()` returns rows with all FRD §F13.2 fields: `id, status, category_name, department_name, location, city, zip, enteredDate, closedDate, substatus_name, description`
- `getReports()` paginates: default page_size=100, max 1000 (FRD §F13.2)
- DTOs exported from `dto/metrics-query.dto.ts` and `dto/reports-query.dto.ts`
- TypeScript compiles without errors for all reports service and DTO files
  </done>
</task>

<task type="auto">
  <name>Task 2: MetricsController + ReportsController + ReportsModule + AppModule wiring</name>
  <files>
    src/modules/reports/metrics.controller.ts
    src/modules/reports/reports.controller.ts
    src/modules/reports/reports.module.ts
    src/app.module.ts
  </files>
  <action>
Create `MetricsController` (GET /metrics — staff-only, all 5 formats), `ReportsController` (GET /reports — staff-only, paginated, all 5 formats), the `ReportsModule` NestJS module, and wire it into `AppModule`.

---

### src/modules/reports/metrics.controller.ts

Route: `GET /metrics[.json|.html|.csv|.txt|.xml]`
Auth: `[staff]` — HTTP 403 for non-staff (FRD §F13.3)
Format: All 5 via global `SerializationInterceptor` (F3 dependency)

**Staff guard implementation:** Inline role check (mirrors pattern from wave 4 TicketsController, GeoModule LocationsController, and Search SearchController). Uses `req.user.role` set by `AuthMiddleware`.

```typescript
import {
  Controller,
  Get,
  Query,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ReportsService } from './reports.service';
import { MetricsQueryDto } from './dto/metrics-query.dto';

/** Require staff role; throw 403 if not staff (FRD §F13.3) */
function requireStaff(req: Request): void {
  const user = (req as any).user;
  if (!user || user.role !== 'staff') {
    throw new ForbiddenException({
      error: 'FORBIDDEN',
      message: 'Staff access required',
    });
  }
}

/**
 * MetricsController
 *
 * GET /metrics — dashboard aggregate metrics (FRD §F13.1).
 *
 * Access: staff-only (FRD §F13.3 — 403 for non-staff).
 * Format: JSON/XML/CSV/TXT/HTML via global SerializationInterceptor.
 *
 * Returns MetricsDto:
 *   { openCount, closedCount, totalCount, avgResolutionDays, byCategory[], byDepartment[] }
 *
 * Staleness: live SQL aggregations — ~0ms (FRD §F13.1 ≤5-minute requirement met).
 * Performance: ≤200ms via existing indexes (idx_tickets_status, idx_tickets_enteredDate,
 *              idx_tickets_category_id — declared in wave 1 plan 01).
 *
 * JRN-04.2 (Robert Osei): Supervisor opens metrics dashboard to assess departmental
 * ticket throughput and resolution health without exporting data (JTBD-04.2).
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /metrics — compute and return live aggregate metrics.
   * Optional filters: start_date (ISO 8601), end_date (ISO 8601).
   */
  @Get()
  getMetrics(@Query() dto: MetricsQueryDto, @Req() req: Request) {
    requireStaff(req);
    return this.reportsService.getMetrics(dto);
  }
}
```

---

### src/modules/reports/reports.controller.ts

Route: `GET /reports[.json|.html|.csv|.txt|.xml]`
Auth: `[staff]` — HTTP 403 for non-staff (FRD §F13.3)
Format: All 5 via global `SerializationInterceptor`

**SM-13.2 NaC:** `GET /reports` with date/status/dept filters; CSV matches HTML view; staff-only; paginated (from STORY-MAP-uReport.md — JRN-03.1 Bulk Review and Export stage, Dana's weekly report use case).

```typescript
import {
  Controller,
  Get,
  Query,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ReportsService } from './reports.service';
import { ReportsQueryDto } from './dto/reports-query.dto';

/** Require staff role; throw 403 if not staff (FRD §F13.3) */
function requireStaff(req: Request): void {
  const user = (req as any).user;
  if (!user || user.role !== 'staff') {
    throw new ForbiddenException({
      error: 'FORBIDDEN',
      message: 'Staff access required',
    });
  }
}

/**
 * ReportsController
 *
 * GET /reports — exportable filtered, paginated ticket report (FRD §F13.2).
 *
 * Access: staff-only (FRD §F13.3 — 403 for non-staff).
 * Format: JSON/XML/CSV/TXT/HTML via global SerializationInterceptor.
 *
 * Filters: start_date, end_date, status, category_id, department_id, page, page_size
 * Output fields: id, status, category_name, department_name, location, city, zip,
 *                enteredDate, closedDate, substatus_name, description
 *
 * US-13.2 NaC: "GET /reports with date/status/dept filters; CSV matches HTML view;
 * staff-only; paginated" (STORY-MAP §SM-13.2 / JRN-03.1 Bulk Review and Export).
 *
 * Dana (JRN-03.1 Stage 6): exports "Closed This Week" filter to CSV for Robert's
 * weekly report — CSV must be column-for-column identical to the HTML table view
 * (F3 parity per JTBD-03.2 success criteria).
 */
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /reports — paginated, filterable ticket report.
   * Returns { total, page, page_size, results[] } serialized in negotiated format.
   */
  @Get()
  getReports(@Query() dto: ReportsQueryDto, @Req() req: Request) {
    requireStaff(req);
    return this.reportsService.getReports(dto);
  }
}
```

---

### src/modules/reports/reports.module.ts

Per TechArch §ReportsModule: `MetricsController`, `ReportsController`, `ReportsService`.

```typescript
import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * ReportsModule (F13)
 *
 * Route prefix: /metrics (MetricsController), /reports (ReportsController)
 * Per TechArch §ReportsModule and FRD §F13.
 *
 * Both endpoints are staff-only (FRD §F13.3).
 * Both endpoints support all 5 output formats via the global SerializationInterceptor (F3).
 * ReportsService executes live Prisma $queryRawUnsafe aggregations — no caching.
 */
@Module({
  imports: [PrismaModule],
  controllers: [MetricsController, ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
```

---

### src/app.module.ts (update — add ReportsModule)

Import `ReportsModule` into the root `AppModule`. This is the final module import, completing the full feature set (F0–F15).

The AppModule accumulates imports from waves 1–5:
- Wave 1: PrismaModule
- Wave 2: GelfLoggerModule, AuthModule, AdminModule
- Wave 3: CategoriesModule, DepartmentsModule, PeopleModule
- Wave 4: TicketsModule, Open311Module
- Wave 5: SearchModule, NotificationsModule, MediaModule, GeoModule
- Wave 6 plan 16 (BookmarksModule — already added by plan 16)
- **Wave 6 plan 17: ReportsModule (this task)**

Add the following to `src/app.module.ts`:

1. Import at the top:
```typescript
import { ReportsModule } from './modules/reports/reports.module';
```

2. Add `ReportsModule` to the `@Module({ imports: [...] })` array.

The final AppModule imports array (after this plan) should be:
```typescript
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  PrismaModule,
  GelfLoggerModule,
  AuthModule,
  AdminModule,
  CategoriesModule,
  DepartmentsModule,
  PeopleModule,
  TicketsModule,
  Open311Module,
  SearchModule,
  NotificationsModule,
  MediaModule,
  GeoModule,
  BookmarksModule,  // from plan 16
  ReportsModule,    // ← ADD THIS (plan 17)
],
```

Preserve all existing middleware registrations (`GelfRequestMiddleware`, `FormatMiddleware`, `AuthMiddleware`), global interceptors (`SerializationInterceptor`), and exception filters (`GelfExceptionFilter`) unchanged.
  </action>
  <verify>
```bash
grep -n 'export class MetricsController' src/modules/reports/metrics.controller.ts && echo METRICS_CTRL_OK
grep -n "Get()" src/modules/reports/metrics.controller.ts && echo METRICS_GET_ROUTE_OK
grep -n 'requireStaff\|FORBIDDEN' src/modules/reports/metrics.controller.ts && echo METRICS_STAFF_GUARD_OK
grep -n 'export class ReportsController' src/modules/reports/reports.controller.ts && echo REPORTS_CTRL_OK
grep -n "Get()" src/modules/reports/reports.controller.ts && echo REPORTS_GET_ROUTE_OK
grep -n 'requireStaff\|FORBIDDEN' src/modules/reports/reports.controller.ts && echo REPORTS_STAFF_GUARD_OK
grep -n 'export class ReportsModule' src/modules/reports/reports.module.ts && echo MODULE_OK
grep -n 'MetricsController\|ReportsController\|ReportsService' src/modules/reports/reports.module.ts && echo MODULE_CONTENTS_OK
grep -n 'ReportsModule' src/app.module.ts && echo APP_MODULE_OK
npx tsc --noEmit 2>&1 | grep -E 'reports|Reports|metrics|Metrics' | grep -v 'node_modules' | head -20 && echo TSC_CTRL_OK
```
  </verify>
  <done>
- `MetricsController` has `@Controller('metrics')` with `GET /metrics` route accepting `MetricsQueryDto` query params (`start_date`, `end_date`)
- `MetricsController` calls `requireStaff(req)` — throws HTTP 403 `FORBIDDEN` for non-staff callers (FRD §F13.3)
- `MetricsController.getMetrics()` returns `MetricsDto` serialized by global `SerializationInterceptor` (all 5 formats: JSON/XML/CSV/TXT/HTML)
- `ReportsController` has `@Controller('reports')` with `GET /reports` route accepting `ReportsQueryDto` query params
- `ReportsController` calls `requireStaff(req)` — throws HTTP 403 `FORBIDDEN` for non-staff callers (FRD §F13.3)
- `ReportsController.getReports()` returns `ReportsResponseDto` (`{total, page, page_size, results[]}`) serialized by global `SerializationInterceptor` (all 5 formats)
- `ReportsModule` imports `PrismaModule` and registers both controllers and `ReportsService`
- `ReportsModule` imported in `src/app.module.ts`
- TypeScript compiles with zero errors for all reports module files
  </done>
</task>

</tasks>

<verification>
```bash
# Directory structure
ls src/modules/reports/reports.module.ts \
   src/modules/reports/reports.service.ts \
   src/modules/reports/metrics.controller.ts \
   src/modules/reports/reports.controller.ts \
   src/modules/reports/dto/metrics-query.dto.ts \
   src/modules/reports/dto/reports-query.dto.ts && echo ALL_FILES_EXIST

# Service exports
grep -n 'export class ReportsService' src/modules/reports/reports.service.ts && echo SERVICE_EXPORTED
grep -n 'getMetrics\|getReports' src/modules/reports/reports.service.ts && echo BOTH_METHODS_PRESENT

# F13.1 — exact FRD SQL in getMetrics
grep -n 'EXTRACT.*EPOCH.*closedDate.*enteredDate' src/modules/reports/reports.service.ts && echo AVG_RESOLUTION_SQL_OK
grep -n 'openCount.*FILTER.*open\|FILTER.*WHERE.*open' src/modules/reports/reports.service.ts && echo OPEN_COUNT_OK
grep -n 'byCategory\|byDepartment' src/modules/reports/reports.service.ts && echo BREAKDOWNS_OK

# F13.2 — report output fields
grep -n 'category_name\|department_name\|substatus_name\|closedDate' src/modules/reports/reports.service.ts && echo REPORT_ROW_FIELDS_OK

# Staff-only enforcement (FRD §F13.3)
grep -n 'requireStaff\|FORBIDDEN' src/modules/reports/metrics.controller.ts && echo METRICS_RBAC_OK
grep -n 'requireStaff\|FORBIDDEN' src/modules/reports/reports.controller.ts && echo REPORTS_RBAC_OK

# AppModule import
grep -n 'ReportsModule' src/app.module.ts && echo APPMODULE_REPORTS_OK

# Full TypeScript clean compile
npx tsc --noEmit 2>&1 | grep -c 'error TS' && echo "TS_ERRORS_COUNT (should be 0)"
```
</verification>

<success_criteria>
- `GET /metrics` returns live SQL aggregations: `openCount`, `closedCount`, `totalCount`, `avgResolutionDays` (using exact FRD §F13.1 SQL: `AVG(EXTRACT(EPOCH FROM ("closedDate" - "enteredDate")) / 86400)`), `byCategory[{category_id, category_name, count}]`, `byDepartment[{department_id, department_name, count}]`
- `GET /metrics` accepts optional `start_date` and `end_date` (ISO 8601) and applies them as `enteredDate >= / <=` filters to ALL aggregate queries
- `GET /metrics` responds with all 5 formats via `SerializationInterceptor` (JSON/XML/CSV/TXT/HTML)
- `GET /metrics` returns HTTP 403 for non-staff callers (FRD §F13.3)
- `GET /metrics` meets ≤200ms NFR-6 via existing indexes `idx_tickets_status`, `idx_tickets_enteredDate`, `idx_tickets_category_id` (no caching needed — live SQL, ~0ms staleness per FRD §F13.1)
- `GET /reports` returns paginated rows: `id`, `status`, `category_name`, `department_name`, `location`, `city`, `zip`, `enteredDate`, `closedDate`, `substatus_name`, `description`
- `GET /reports` accepts all FRD §F13.2 filters: `start_date`, `end_date`, `status`, `category_id`, `department_id`, `page`, `page_size` (default 100, max 1000)
- `GET /reports` returns HTTP 403 for non-staff callers (FRD §F13.3)
- `GET /reports` serialized in all 5 formats via `SerializationInterceptor`
- `ReportsModule` imported in `AppModule` — completes the full F0–F15 feature set
- TypeScript strict-mode compilation passes with zero errors across all reports module files
</success_criteria>

<output>
After completion, create `.planning/express/modernize-legacy-php-ureport-open311-geo/17-SUMMARY.md` with:
- Files created/modified
- Key implementation decisions (live SQL approach, $queryRawUnsafe for aggregate queries, inline staff guard pattern)
- Integration contracts fulfilled (ReportsService provides F13 endpoints; AppModule complete)
- Any deviations from FRD/TechArch (flag conflicts per constraint; none expected)
</output>
