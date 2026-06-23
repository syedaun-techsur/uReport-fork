---
phase: wave-1-database
plan: 02
subsystem: database/migration
tags: [mysql, postgresql, etl, prisma, migration, seed, postgis]
dependency_graph:
  requires: [prisma/schema.prisma, mysql2, @prisma/client]
  provides: [scripts/migrate-mysql-to-postgres.ts, scripts/verify-migration.ts, scripts/seed-reference-data.sql]
  affects: [all wave 2+ features — require migrated data]
tech_stack:
  added: [mysql2@^3.6.0]
  patterns: [OVERRIDING SYSTEM VALUE for IDENTITY inserts, batched migration (500/batch), UTC session timezone, ST_GeomFromText spatial migration]
key_files:
  created:
    - scripts/migrate-mysql-to-postgres.ts
    - scripts/verify-migration.ts
    - scripts/seed-reference-data.sql
    - prisma/schema.prisma
    - src/prisma/prisma.service.ts
  modified:
    - package.json
decisions:
  - Added mysql2@^3.6.0 to package.json dependencies (required for ETL scripts, was missing from plan 01 artifact)
  - Created prisma/schema.prisma as plan 01 prerequisite (blocking; plan 01 was not yet executed)
  - Used resetSequences via $executeRawUnsafe for dynamic table names in sequence reset loop
  - ON CONFLICT DO NOTHING for join tables (department_actions, department_categories, ticket_geodata) instead of OVERRIDING SYSTEM VALUE (no IDENTITY column)
metrics:
  duration: "~20 minutes"
  completed: "2026-06-23"
  tasks_completed: 2
  files_count: 5
---

# Phase wave-1-database Plan 02: MySQL→PostgreSQL ETL Migration Scripts Summary

**One-liner:** ETL migration script (21 tables, batched, UTC-safe, type-converted) + row-count verification + idempotent reference-data seed SQL using mysql2 and Prisma `$executeRaw`.

---

## What Was Built

### Task 1: MySQL→PostgreSQL ETL Migration Script

**File:** `scripts/migrate-mysql-to-postgres.ts`

A standalone `ts-node` script that reads every row from all 21 MySQL tables and inserts them into PostgreSQL in FK-safe order using Prisma `$executeRaw` with `OVERRIDING SYSTEM VALUE`.

**Key design decisions:**
- **FK-safe insert order:** version → contactMethods → substatus → actions → categoryGroups → issueTypes → departments (nulled) → people → departments UPDATE (patch defaultPerson_id) → peopleEmails → peoplePhones → peopleAddresses → clients → categories → category_action_responses → department_actions → department_categories → tickets → ticketHistory → media → bookmarks → geoclusters → ticket_geodata
- **Circular FK resolution:** departments inserted first with `defaultPerson_id = NULL`, then patched after people are migrated
- **Type conversions:**
  - `TINYINT(1)` → `BOOLEAN` via `!!mysqlVal` (applies to isDefault, usedForNotifications, active, featured, autoCloseIsActive)
  - MySQL `DATETIME` (enteredDate/actionDate) → `TIMESTAMP` (no-tz): passed as JS Date from mysql2 directly
  - MySQL `TIMESTAMP` (lastModified, closedDate, uploaded, enteredDate on ticketHistory) → `TIMESTAMPTZ`: forced UTC via `SET time_zone = '+00:00'` before any reads
  - MySQL binary `POINT` (geoclusters.center) → `geometry(Point,4326)` via `ST_GeomFromText('POINT(lon lat)', 4326)` using `ST_X()` / `ST_Y()` extraction
  - `FLOAT(17,14)` (tickets.latitude/longitude) → `DOUBLE PRECISION`: direct pass-through (mysql2 returns JS number)
- **IDENTITY inserts:** All tables with `GENERATED ALWAYS AS IDENTITY` use `OVERRIDING SYSTEM VALUE` raw inserts
- **Batch size:** 500 rows per table with per-batch progress logging: `[tableName] inserted N / total`
- **IDENTITY sequence reset:** After all inserts, `setval(pg_get_serial_sequence(...), COALESCE(MAX(id),0)+1, false)` for all 18 IDENTITY tables
- **Error handling:** Each table wrapped in try/catch; on any error prints table name + error message + meta and calls `process.exit(1)`
- **Exported contract:** `export async function migrateAll(mysqlConn: mysql.Connection, prisma: PrismaClient): Promise<void>`

### Task 2A: Row-Count Verification Script

**File:** `scripts/verify-migration.ts`

A standalone `ts-node` script that connects to both databases, counts rows in all 21 tables, prints a row-aligned report, and exits 1 if any counts differ.

**Report format:**
```
Table                             MySQL   PostgreSQL    Status
-------------------------------------------------------
version                               1            1        OK
contactMethods                        4            4        OK
...
tickets                            8472         8472        OK
-------------------------------------------------------
TOTAL MISMATCH: 0

ALL TABLES MATCH
```

- Shows all table mismatches before exiting (not just the first)
- Uses `Prisma.raw()` for safe table name quoting in `$queryRaw`
- **Exported contract:** `export async function verifyAll(mysqlConn: mysql.Connection, prisma: PrismaClient): Promise<void>`

### Task 2B: Reference-Data Seed SQL

**File:** `scripts/seed-reference-data.sql`

Idempotent seed for 5 reference tables + version (27 INSERT statements total):

| Table | Rows | Content |
|-------|------|---------|
| version | 1 | '2.1' |
| contactMethods | 4 | Email, Phone, Web Form, Other |
| substatus | 3 | Resolved, Duplicate, Bogus (all closed) |
| actions | 10 | All system actions verbatim from TechArch DDL |
| categoryGroups | 3 | Streets, Sanitation, Other |
| issueTypes | 6 | Comment, Complaint, Question, Report, Request, Violation |

- All inserts use `ON CONFLICT DO NOTHING` for idempotency
- No explicit `id` values (GENERATED ALWAYS AS IDENTITY sequences auto-assign)
- Includes `CREATE EXTENSION IF NOT EXISTS postgis`
- Values verbatim from TechArch DDL §3.2 and MySQL source

---

## Deviations from Plan

### Auto-fixed Issues (Rule 3 — Blocking)

**1. [Rule 3 - Blocking] Missing plan 01 prerequisites**
- **Found during:** Pre-task setup
- **Issue:** Plan 02 scripts require `prisma/schema.prisma` (for `@prisma/client` generation), `node_modules/` (npm not installed), and `scripts/` directory — none existed because plan 01 was not yet executed
- **Fix:** Created `prisma/schema.prisma` (verbatim from plan 01 spec), `src/prisma/prisma.service.ts`, ran `npm install`, and ran `prisma generate` to unblock the type-checker
- **Files modified:** `prisma/schema.prisma`, `src/prisma/prisma.service.ts`
- **Commit:** 3c0bae1

**2. [Rule 3 - Blocking] mysql2 missing from package.json**
- **Found during:** Task 1 implementation
- **Issue:** Plan 02 requires `mysql2` (specified in plan task action) but it was absent from `package.json`
- **Fix:** Added `"mysql2": "^3.6.0"` to dependencies
- **Files modified:** `package.json`
- **Commit:** 3c0bae1

### Design Choices (not deviations)

- **`$executeRawUnsafe` for sequence reset:** The `resetSequences` function iterates over an array of table names to reset sequences dynamically. Since Prisma tagged template literals don't support dynamic table names in `pg_get_serial_sequence()`, used `$executeRawUnsafe` (values are from a hardcoded constant array, not user input — no injection risk).
- **Join tables use `ON CONFLICT DO NOTHING`:** `department_actions`, `department_categories`, and `ticket_geodata` have composite PKs (no IDENTITY column), so standard `ON CONFLICT DO NOTHING` is used instead of `OVERRIDING SYSTEM VALUE`.

---

## Contracts Verified

```
✓ grep -n 'export async function migrateAll' scripts/migrate-mysql-to-postgres.ts
✓ grep -n 'export async function verifyAll' scripts/verify-migration.ts
✓ grep -c 'INSERT INTO' scripts/seed-reference-data.sql  → 27
✓ tsc --noEmit --strict scripts/migrate-mysql-to-postgres.ts → TYPE_CHECK_OK
✓ tsc --noEmit --strict scripts/verify-migration.ts → TYPE_CHECK_OK
✓ All 21 table names present in both scripts
✓ setval + pg_get_serial_sequence present
✓ !! boolean coercion present
✓ ST_GeomFromText present for geoclusters
✓ process.exit(1) on mismatch present
✓ ON CONFLICT DO NOTHING in seed (29 occurrences)
✓ 10 system actions in seed
```

---

## Commits

| Hash | Message |
|------|---------|
| 3c0bae1 | feat(wave-1-database-02): add MySQL→PostgreSQL ETL migration script |
| a9fdddd | feat(wave-1-database-02): add row-count verification script and reference-data seed SQL |

---

## Self-Check: PASSED

- `scripts/migrate-mysql-to-postgres.ts` — FOUND ✓
- `scripts/verify-migration.ts` — FOUND ✓
- `scripts/seed-reference-data.sql` — FOUND ✓
- Commit 3c0bae1 — FOUND ✓
- Commit a9fdddd — FOUND ✓
- `migrateAll` export — CONTRACT_OK ✓
- `verifyAll` export — CONTRACT_OK ✓
- Seed >= 5 INSERT INTO statements — CONTRACT_OK ✓

---

## Notes for Wave 2+ Executors

1. **Run order for full migration:**
   ```bash
   # 1. Apply DDL (plan 01 artifact)
   psql $DATABASE_URL < prisma/schema.sql
   # or: npx prisma db push

   # 2. Migrate all 21 tables
   MYSQL_HOST=... MYSQL_USER=... MYSQL_PASSWORD=... MYSQL_DATABASE=... \
   DATABASE_URL=... npx ts-node scripts/migrate-mysql-to-postgres.ts

   # 3. Verify row counts match
   MYSQL_HOST=... MYSQL_USER=... MYSQL_PASSWORD=... MYSQL_DATABASE=... \
   DATABASE_URL=... npx ts-node scripts/verify-migration.ts
   # Expected: exits 0 and prints "ALL TABLES MATCH"

   # 4. For fresh/dev DB only (no MySQL source):
   psql $DATABASE_URL < scripts/seed-reference-data.sql
   ```

2. **These scripts do NOT start or import NestJS** — they are standalone utilities.
3. **mysql2 is now in dependencies** — available for any other scripts that need MySQL access.
4. **Wave 1 (F6) is complete** after plan 01 DDL + plan 02 migration/verification/seed scripts.
