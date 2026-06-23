---
phase: wave-6-integration
plan: 17
subsystem: ReportsModule
tags: [reports, metrics, f13, staff-only, live-sql, aggregations, pagination]
dependency_graph:
  requires: [prisma/schema.prisma, SerializationInterceptor, AuthMiddleware]
  provides: [ReportsModule, ReportsService, MetricsController, ReportsController]
  affects: [src/app.module.ts]
tech_stack:
  added: []
  patterns: [live-sql-aggregation, queryRawUnsafe, inline-staff-guard, paginated-filtered-query]
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
  - "Live $queryRawUnsafe used for all aggregate queries — no ORM abstraction for multi-table aggregations, no caching layer (FRD §F13.1: staleness ~0ms)"
  - "Inline requireStaff() guard pattern (mirrors wave 4/5 pattern) — direct req.user.role check, throws ForbiddenException({ error: 'FORBIDDEN' })"
  - "Single combined FILTER query for openCount/closedCount/totalCount — single DB round-trip vs three separate COUNT queries"
  - "Dynamic $N parameterization in getReports() — conditions[] array built incrementally with paramIdx counter, safe against SQL injection"
metrics:
  duration: ~10 minutes
  completed: 2026-06-23
  tasks_completed: 2
  files_created: 6
  files_modified: 1
---

# Phase wave-6-integration Plan 17: ReportsModule Summary

**One-liner:** Live-SQL ReportsModule with staff-only GET /metrics (aggregate dashboard) and GET /reports (paginated filtered export), all 5 formats via SerializationInterceptor — completes F0–F15 feature set.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ReportsService + DTOs — live SQL aggregations for metrics and paginated ticket report | `e065445` | metrics-query.dto.ts, reports-query.dto.ts, reports.service.ts |
| 2 | MetricsController + ReportsController + ReportsModule + AppModule wiring | `b91ab02` | metrics.controller.ts, reports.controller.ts, reports.module.ts, app.module.ts |

## Files Created/Modified

### Created

| File | Purpose |
|------|---------|
| `src/modules/reports/dto/metrics-query.dto.ts` | `MetricsQueryDto` (start_date, end_date), `MetricsDto`, `CategoryBreakdown`, `DepartmentBreakdown` interfaces |
| `src/modules/reports/dto/reports-query.dto.ts` | `ReportsQueryDto` (all FRD §F13.2 filters + pagination), `ReportRowDto`, `ReportsResponseDto` interfaces |
| `src/modules/reports/reports.service.ts` | `ReportsService` — `getMetrics()` (5 live SQL aggregates) + `getReports()` (paginated filtered query) |
| `src/modules/reports/metrics.controller.ts` | `MetricsController` — `GET /metrics` — staff-only, live MetricsDto, all 5 formats |
| `src/modules/reports/reports.controller.ts` | `ReportsController` — `GET /reports` — staff-only, paginated rows, all 5 formats |
| `src/modules/reports/reports.module.ts` | `ReportsModule` — imports PrismaModule, registers both controllers + ReportsService |

### Modified

| File | Change |
|------|--------|
| `src/app.module.ts` | Added `import { ReportsModule }` + `ReportsModule` to imports array — completes F0–F15 |

## Key Implementation Decisions

### 1. Live SQL via `$queryRawUnsafe` — No Caching

FRD §F13.1 requires ≤5-minute staleness. Implemented as live SQL on every request (actual staleness ~0ms). All metrics queries use `$queryRawUnsafe` with parameterized inputs. No Redis, no in-memory cache, no TTL logic.

**Performance:** ≤200ms NFR-6 met via existing indexes declared in wave 1:
- `idx_tickets_status ON tickets(status)`
- `idx_tickets_enteredDate ON tickets("enteredDate")`
- `idx_tickets_category_id ON tickets(category_id)`

### 2. Exact FRD §F13.1 SQL for avgResolutionDays

```sql
AVG(EXTRACT(EPOCH FROM ("closedDate" - "enteredDate")) / 86400) AS "avgDays"
```
Applied only to `WHERE status = 'closed'` tickets. Returns `null` when no closed tickets exist in the filtered range.

### 3. Combined FILTER Query for openCount/closedCount/totalCount

Single query using PostgreSQL `COUNT(*) FILTER (WHERE status = 'open')` avoids three separate DB round-trips. Applied consistently across all 4 date-filter variants (none, startDate only, endDate only, both).

### 4. Dynamic Parameterized WHERE in `getReports()`

Built via `conditions[]` array + incremental `paramIdx` counter. Each filter (start_date, end_date, status, category_id, department_id) appends a `$N` placeholder — safe against SQL injection. `LIMIT $N OFFSET $N` appended at the end.

### 5. Inline `requireStaff()` Guard Pattern

Mirrors the established pattern from wave 4 (TicketsController), wave 5 (GeoModule, SearchController). Direct `req.user.role !== 'staff'` check on `req.user` set by `AuthMiddleware`. Throws `ForbiddenException({ error: 'FORBIDDEN', message: 'Staff access required' })` per FRD §F13.3.

## Integration Contracts Fulfilled

| Contract | Status |
|----------|--------|
| `prisma/schema.prisma` — tickets, categories, departments, substatus | ✅ Consumed via $queryRawUnsafe JOINs |
| `SerializationInterceptor` (F3 plan 03) | ✅ Global interceptor — no explicit decoration needed |
| `AuthMiddleware` (plan 06) — sets req.user.role | ✅ Consumed by requireStaff() inline guard |
| `ReportsModule` exported for AppModule import | ✅ Imported in app.module.ts |

## FRD Feature Verification

| FRD Requirement | Implementation |
|-----------------|----------------|
| §F13.1: openCount, closedCount, totalCount | `COUNT(*) FILTER (WHERE status = ...)::int` |
| §F13.1: avgResolutionDays — exact SQL | `AVG(EXTRACT(EPOCH FROM ("closedDate" - "enteredDate")) / 86400)` |
| §F13.1: byCategory[{category_id, category_name, count}] | GROUP BY category_id JOIN categories |
| §F13.1: byDepartment[{department_id, department_name, count}] | JOIN categories → departments GROUP BY dept_id |
| §F13.1: start_date/end_date filter on all aggregates | Applied to all 4 query groups |
| §F13.2: paginated rows with 11 output fields | id, status, category_name, department_name, location, city, zip, enteredDate, closedDate, substatus_name, description |
| §F13.2: page_size default 100, max 1000 | `Math.min(dto.page_size ?? 100, 1000)` |
| §F13.3: HTTP 403 for non-staff | `requireStaff()` on both controllers |
| All 5 output formats | Global `SerializationInterceptor` handles JSON/XML/CSV/TXT/HTML |

## Deviations from Plan

None — plan executed exactly as written. All FRD §F13.1–F13.3 requirements implemented per specification.

## Self-Check

### Files Exist
- [x] `src/modules/reports/dto/metrics-query.dto.ts` — FOUND
- [x] `src/modules/reports/dto/reports-query.dto.ts` — FOUND
- [x] `src/modules/reports/reports.service.ts` — FOUND
- [x] `src/modules/reports/metrics.controller.ts` — FOUND
- [x] `src/modules/reports/reports.controller.ts` — FOUND
- [x] `src/modules/reports/reports.module.ts` — FOUND
- [x] `src/app.module.ts` — modified, ReportsModule imported

### Commits Exist
- [x] `e065445` — feat(wave-6-integration-17): add ReportsService + DTOs for live SQL aggregations
- [x] `b91ab02` — feat(wave-6-integration-17): add MetricsController, ReportsController, ReportsModule + AppModule wiring

### TypeScript Compilation
- [x] `npx tsc --noEmit` — 0 errors across all reports module files

## Self-Check: PASSED
