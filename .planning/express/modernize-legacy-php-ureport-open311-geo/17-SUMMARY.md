---
phase: wave-6-integration
plan: 17
subsystem: reports
tags: [reporting, metrics, aggregations, staff-only, sql, F13]
dependency_graph:
  requires: [prisma-schema (tickets/categories/departments/substatus), SerializationInterceptor, CaslGuard pattern]
  provides: [ReportsModule, ReportsService, MetricsController, ReportsController]
  affects: [AppModule]
tech_stack:
  added: []
  patterns: [live-SQL-aggregation, inline-staff-guard, $queryRawUnsafe, dynamic-WHERE-builder]
key_files:
  created:
    - src/modules/reports/dto/metrics-query.dto.ts
    - src/modules/reports/dto/reports-query.dto.ts
    - src/modules/reports/reports.service.ts
    - src/modules/reports/metrics.controller.ts
    - src/modules/reports/reports.controller.ts
    - src/modules/reports/reports.module.ts
  modified:
    - src/app.module.ts
decisions:
  - "Live SQL via $queryRawUnsafe — no caching layer, staleness ~0ms per FRD §F13.1"
  - "Inline requireStaff() helper mirrors pattern from wave 4/5 controllers (no decorator needed)"
  - "Single FILTER-aggregate query for openCount/closedCount/totalCount (efficient, one DB round-trip)"
  - "Dynamic parameterized WHERE builder in getReports() avoids SQL injection while supporting optional filters"
metrics:
  duration: ~6 minutes
  completed: 2026-06-23T17:56:43Z
  tasks_completed: 2
  files_created: 6
  files_modified: 1
---

# Phase wave-6-integration Plan 17: ReportsModule (F13) Summary

**One-liner:** Live SQL aggregation metrics dashboard and paginated exportable ticket report, staff-only, all 5 output formats, completing the full F0–F15 feature set.

## What Was Built

### ReportsService (`src/modules/reports/reports.service.ts`)

Two methods, both executing live Prisma `$queryRawUnsafe` queries — no caching:

**`getMetrics(dto: MetricsQueryDto): Promise<MetricsDto>`**
- Single combined FILTER aggregate query for `openCount`, `closedCount`, `totalCount`
- Separate `AVG(EXTRACT(EPOCH FROM ("closedDate" - "enteredDate")) / 86400)` query for `avgResolutionDays` (exact FRD §F13.1 SQL)
- `byCategory[]` — GROUP BY category_id JOIN categories for name, ordered by count DESC
- `byDepartment[]` — JOIN categories → departments, GROUP BY department_id, ordered by count DESC
- All 4 queries honour optional `start_date`/`end_date` ISO 8601 filters via parameterized `WHERE "enteredDate" >= $1`
- Performance: ≤200ms via existing `idx_tickets_status`, `idx_tickets_enteredDate`, `idx_tickets_category_id` indexes

**`getReports(dto: ReportsQueryDto): Promise<ReportsResponseDto>`**
- Dynamic WHERE builder with `$N` parameterization for: `start_date`, `end_date`, `status`, `category_id`, `department_id`
- Separate COUNT query for total, then paginated data query with `LIMIT/OFFSET`
- Output fields: `id, status, category_name, department_name, location, city, zip, enteredDate, closedDate, substatus_name, description`
- Default `page_size=100`, max `1000` per FRD §F13.2

### MetricsController (`src/modules/reports/metrics.controller.ts`)

- `@Controller('metrics')` / `@Get()` → `GET /metrics`
- `requireStaff(req)` → HTTP 403 `{error: 'FORBIDDEN', message: 'Staff access required'}` for non-staff (FRD §F13.3)
- Accepts `MetricsQueryDto` query params (`start_date`, `end_date`)
- Returns `MetricsDto` serialized by global `SerializationInterceptor` (JSON/XML/CSV/TXT/HTML)

### ReportsController (`src/modules/reports/reports.controller.ts`)

- `@Controller('reports')` / `@Get()` → `GET /reports`
- `requireStaff(req)` → HTTP 403 for non-staff (FRD §F13.3)
- Accepts `ReportsQueryDto` with all FRD §F13.2 filters + pagination
- Returns `{total, page, page_size, results[]}` in all 5 formats

### ReportsModule (`src/modules/reports/reports.module.ts`)

```typescript
@Module({
  imports: [PrismaModule],
  controllers: [MetricsController, ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
```

### AppModule (`src/app.module.ts`)

Added `ReportsModule` import — completes the full F0–F15 feature set:
- Wave 6 plan 16: BookmarksModule (F12)
- **Wave 6 plan 17: ReportsModule (F13) ← this plan**

## Integration Contracts Fulfilled

| Contract | Source Plan | Status |
|----------|-------------|--------|
| `prisma/schema.prisma` — tickets, categories, departments, substatus models | plan 01 | ✅ Verified |
| `SerializationInterceptor` — global APP_INTERCEPTOR | plan 03 | ✅ Used via global registration |
| `CaslGuard` pattern — inline requireStaff() | plan 06 | ✅ Mirrors established pattern |
| `ReportsModule` exported | plan 17 (this) | ✅ Provides |
| `ReportsService.getMetrics()` + `getReports()` | plan 17 (this) | ✅ Provides |

## Key Implementation Decisions

1. **Live SQL via `$queryRawUnsafe`** — FRD §F13.1 explicitly requires live aggregations with ~0ms staleness. No Redis/in-memory caching added. `$queryRawUnsafe` used (vs `$queryRaw` tagged template) for clean dynamic parameterization.

2. **Single FILTER aggregate query** — `openCount`, `closedCount`, and `totalCount` computed in one SQL query using PostgreSQL `COUNT(*) FILTER (WHERE status = '...')` reducing round-trips.

3. **Inline `requireStaff()` helper** — consistent with the established pattern in wave 4 (`TicketsController`) and wave 5 (`GeoModule/LocationsController`, `SearchController`). No NestJS Guard decorator needed; keeps RBAC logic explicit and co-located.

4. **Dynamic `$N` parameterization in `getReports()`** — `paramIdx` counter builds `$1, $2, ...` placeholders sequentially as optional filters are added. `LIMIT $N OFFSET $N` appended last using `paramIdx++`. Prevents SQL injection while supporting flexible optional filtering.

5. **BookmarksModule already present** — `src/app.module.ts` already imported `BookmarksModule` from plan 16. `ReportsModule` added after it, completing the wave 6 integration.

## Deviations from Plan

None — plan executed exactly as written. The AppModule already had `BookmarksModule` imported (plan 16 executed previously), which the plan correctly anticipated.

## Self-Check

### Files exist:
- ✅ `src/modules/reports/dto/metrics-query.dto.ts`
- ✅ `src/modules/reports/dto/reports-query.dto.ts`
- ✅ `src/modules/reports/reports.service.ts`
- ✅ `src/modules/reports/metrics.controller.ts`
- ✅ `src/modules/reports/reports.controller.ts`
- ✅ `src/modules/reports/reports.module.ts`
- ✅ `src/app.module.ts` (modified — ReportsModule added)

### Commits:
- ✅ `c3b2ff7` — feat(wave-6-integration-17): implement ReportsService + DTOs with live SQL aggregations
- ✅ `7af23a9` — feat(wave-6-integration-17): add MetricsController, ReportsController, ReportsModule + AppModule wiring

### TypeScript: 0 errors (`npx tsc --noEmit` clean)

## Self-Check: PASSED
