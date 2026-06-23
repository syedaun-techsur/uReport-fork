---
phase: wave-1-database
plan: 02
subsystem: database/migration
tags: [mysql, postgresql, etl, migration, prisma, postgis, typescript]

dependency_graph:
  requires: []
  provides:
    - scripts/migrate-mysql-to-postgres.ts (migrateAll)
    - scripts/verify-migration.ts (verifyAll)
    - scripts/seed-reference-data.sql
  affects:
    - All wave 2+ features (require migrated data)

tech_stack:
  added:
    - mysql2@^3.x (MySQL source connection)
    - pg@^8.x (PostgreSQL client for syntax testing)
  patterns:
    - OVERRIDING SYSTEM VALUE for GENERATED ALWAYS AS IDENTITY columns
    - ST_GeomFromText for PostGIS POINT migration
    - Deferred circular FK strategy (departments → people two-pass insert)
    - Batch size 500 rows with progress logging

key_files:
  created:
    - scripts/migrate-mysql-to-postgres.ts
    - scripts/verify-migration.ts
    - scripts/seed-reference-data.sql
  modified:
    - package.json (added mysql2, pg)
    - package-lock.json

decisions:
  - Used $queryRawUnsafe for PG COUNT queries in verify script (table names from hardcoded const — safe)
  - Used $executeRawUnsafe for ST_GeomFromText to pass WKT string as a parameter
  - Seed SQL uses ON CONFLICT DO NOTHING without specifying ids (IDENTITY sequences auto-assign)

metrics:
  duration: ~20 minutes
  completed: 2026-06-23
  tasks_completed: 2
  files_created: 3
  files_modified: 2
---

# Phase wave-1-database Plan 02: MySQL→PostgreSQL Migration Scripts Summary

**One-liner:** MySQL→PostgreSQL ETL with IDENTITY inserts, PostGIS POINT migration, TIMESTAMPTZ handling, and idempotent reference seed for all 21 tables.

## What Was Built

Three standalone ts-node scripts completing Wave 1b (F6):

### 1. `scripts/migrate-mysql-to-postgres.ts`
MySQL→PostgreSQL ETL script that:
- Reads all 21 tables from MySQL source in FK-safe dependency order
- Uses `OVERRIDING SYSTEM VALUE` for all `GENERATED ALWAYS AS IDENTITY` tables
- Converts `TINYINT(1)` → `BOOLEAN` via `!!val` coercion
- Handles MySQL `DATETIME` → PG `TIMESTAMP` (no-tz) and MySQL `TIMESTAMP` → PG `TIMESTAMPTZ`
- Migrates `geoclusters.center` POINT via `ST_GeomFromText('POINT(lon lat)', 4326)`
- Sets `SET time_zone = '+00:00'` on MySQL session before reads (prevents TZ drift)
- Resolves circular FK (departments ↔ people) with two-pass insert (departments first with null FK, patch after people inserted)
- Batch size 500 rows with per-batch console progress
- `process.exit(1)` with table context on any error
- Resets all IDENTITY sequences via `setval + pg_get_serial_sequence` after all inserts
- Exports `migrateAll(mysqlConn, prisma): Promise<void>`

### 2. `scripts/verify-migration.ts`
Row-count verification script that:
- Queries `COUNT(*)` on all 21 tables in both MySQL and PostgreSQL
- Prints aligned table report: Table | MySQL | PostgreSQL | Status
- Reports `MISMATCH: table MySQL=N PG=M` for any mismatch (shows all, not just first)
- Exits 0 with `ALL TABLES MATCH` on success, exits 1 with mismatch list otherwise
- Exports `verifyAll(mysqlConn, prisma): Promise<void>`

### 3. `scripts/seed-reference-data.sql`
Idempotent SQL seed for fresh development/CI databases:
- `CREATE EXTENSION IF NOT EXISTS postgis` (idempotent)
- 1 version row
- 4 contactMethods rows: Email, Phone, Web Form, Other
- 3 substatus rows: Resolved, Duplicate, Bogus (all status='closed')
- 10 system actions: open, assignment, closed, changeCategory, changeLocation, response, duplicate, update, comment, upload_media
- 3 categoryGroups: Streets, Sanitation, Other
- 6 issueTypes: Comment, Complaint, Question, Report, Request, Violation
- All 27 INSERTs use `ON CONFLICT DO NOTHING` — safe to re-run

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `dc16108` | feat(wave-1-database-02): add MySQL→PostgreSQL ETL migration script |
| Task 2 | `9ebfd8c` | feat(wave-1-database-02): add row-count verification script and reference-data seed SQL |

## Type-Check Results

Both scripts pass `npx tsc --noEmit --strict` with exit code 0.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced Prisma.sql/Prisma.raw with $queryRawUnsafe in verify script**
- **Found during:** Task 2 type-check
- **Issue:** `Prisma.sql` and `Prisma.raw` are not available from `@prisma/client` without a generated Prisma schema; TypeScript reported error TS2347 and TS2339
- **Fix:** Changed `getPgCount` to use `prisma.$queryRawUnsafe` with template string; table names come from the hardcoded `TABLES` const so this is safe
- **Files modified:** `scripts/verify-migration.ts`
- **Commit:** `9ebfd8c` (included in same commit)

## Self-Check: PASSED

- ✅ `scripts/migrate-mysql-to-postgres.ts` — exists and type-checks
- ✅ `scripts/verify-migration.ts` — exists and type-checks
- ✅ `scripts/seed-reference-data.sql` — exists with 27 seed rows
- ✅ Task 1 commit `dc16108` — verified in git log
- ✅ Task 2 commit `9ebfd8c` — verified in git log
- ✅ All 21 table names referenced in migration script
- ✅ All 21 table names referenced in verification script
- ✅ `export async function migrateAll` present
- ✅ `export async function verifyAll` present
- ✅ `OVERRIDING SYSTEM VALUE` inserts for all IDENTITY tables
- ✅ `setval + pg_get_serial_sequence` sequence reset for all id tables
- ✅ `!!mysqlVal` boolean coercion for all TINYINT(1) columns
- ✅ `ST_GeomFromText(..., 4326)` for geoclusters.center
- ✅ `SET time_zone = '+00:00'` before MySQL reads
- ✅ Batch size 500 with progress logging
- ✅ `process.exit(1)` on error with table context
- ✅ 10 actions, 4 contactMethods, 3 substatus, 3 categoryGroups, 6 issueTypes in seed
- ✅ All seed INSERTs use `ON CONFLICT DO NOTHING`
- ✅ No explicit id values in seed (IDENTITY auto-assigns)

## Wave 1 Status

Wave 1 (F6 — MySQL-to-PostgreSQL Schema Migration) is now **complete**:
- **Plan 01:** NestJS scaffold + PostgreSQL DDL + Prisma schema (all 21 tables)
- **Plan 02:** ETL migration script + row-count verification + reference data seed ✅

All downstream waves (2–6) can proceed with the PostgreSQL database populated.
