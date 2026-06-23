---
phase: wave-1-database
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/migrate-mysql-to-postgres.ts
  - scripts/verify-migration.ts
  - scripts/seed-reference-data.sql
autonomous: true

features:
  implements: ["F6"]
  depends_on: []
  enables: ["F0", "F1", "F2", "F4", "F5", "F9", "F10", "F11", "F12", "F13", "F15"]

must_haves:
  truths:
    - "All 21 MySQL tables have data migrated to PostgreSQL with row counts that match"
    - "TINYINT(1) booleans are migrated as true/false PostgreSQL booleans"
    - "MySQL DATETIME columns (enteredDate, actionDate) land in TIMESTAMP columns without timezone offset drift"
    - "MySQL TIMESTAMP columns (lastModified, closedDate, uploaded, enteredDate on ticketHistory) land in TIMESTAMPTZ columns"
    - "geoclusters.center POINT values are migrated to PostGIS geometry(Point,4326) via ST_GeomFromText"
    - "IDENTITY sequences on all 21 tables are reset to max(id)+1 after migration"
    - "Reference tables (contactMethods, substatus, actions, issueTypes, categoryGroups) contain correct seed rows if not migrating from live data"
    - "verify-migration.ts exits 0 when row counts match and exits non-zero with per-table diffs on mismatch"
  artifacts:
    - path: "scripts/migrate-mysql-to-postgres.ts"
      provides: "MySQL→PostgreSQL ETL script"
      exports: ["migrateAll", "migrateTable"]
    - path: "scripts/verify-migration.ts"
      provides: "Row-count verification script"
      exports: ["verifyAll"]
    - path: "scripts/seed-reference-data.sql"
      provides: "Idempotent seed for 5 reference tables"
      contains: "INSERT INTO"
  key_links:
    - from: "scripts/migrate-mysql-to-postgres.ts"
      to: "PostgreSQL (target)"
      via: "pg / @prisma/client writes"
      pattern: "prisma\\.(contactMethods|substatus|actions|issueTypes|categoryGroups|departments|people|tickets|ticketHistory|geoclusters|ticket_geodata|media|bookmarks|categories|clients|peopleEmails|peoplePhones|peopleAddresses|department_actions|department_categories|category_action_responses)\\.create"
    - from: "scripts/verify-migration.ts"
      to: "both databases"
      via: "COUNT(*) on MySQL + PostgreSQL"
      pattern: "SELECT COUNT"

integration_contracts:
  requires: []
  provides:
    - artifact: "scripts/migrate-mysql-to-postgres.ts"
      exports: ["migrateAll"]
      shape: |
        async function migrateAll(mysqlConn: mysql.Connection, prisma: PrismaClient): Promise<void>
        // Migrates all 21 tables in FK-safe order; handles type conversions
      verify: "grep -n 'export.*migrateAll\\|export async function migrateAll' scripts/migrate-mysql-to-postgres.ts && echo CONTRACT_OK"
    - artifact: "scripts/verify-migration.ts"
      exports: ["verifyAll"]
      shape: |
        async function verifyAll(mysqlConn: mysql.Connection, prisma: PrismaClient): Promise<void>
        // Throws if any table row count differs; prints table-by-table report
      verify: "grep -n 'export.*verifyAll\\|export async function verifyAll' scripts/verify-migration.ts && echo CONTRACT_OK"
    - artifact: "scripts/seed-reference-data.sql"
      exports: ["seed SQL"]
      shape: |
        Idempotent INSERT ... ON CONFLICT DO NOTHING for:
        contactMethods (4 rows), substatus (3 rows), actions (10 rows),
        issueTypes (6 rows), categoryGroups (3 rows), version (1 row)
      verify: "grep -c 'INSERT INTO' scripts/seed-reference-data.sql | awk '{if($1>=5) print \"CONTRACT_OK\"; else exit 1}'"
---

<objective>
Author the MySQL→PostgreSQL data-migration ETL script, the row-count verification script,
and the idempotent reference-data seed SQL for the 5 lookup tables. These scripts complete
F6 (Wave 1b) and are the last prerequisite before any Wave 2+ module can run against real data.

Purpose: Move all live MySQL rows to PostgreSQL with type-safe conversions (TINYINT→BOOLEAN,
MySQL DATETIME→TIMESTAMP no-tz, MySQL TIMESTAMP→TIMESTAMPTZ, POINT→ST_GeomFromText), reset
all IDENTITY sequences, and verify row-count parity across all 21 tables.

Output: Three runnable scripts in scripts/; they are independent of the NestJS app and
can be invoked directly with ts-node against environment variables MYSQL_URL + DATABASE_URL.
</objective>

<feature_dependencies>
Implements: F6: MySQL-to-PostgreSQL Schema Migration (Part B — migration script + row-count verification + reference seed)
Depends on: None (Plan 01 must have created the PostgreSQL schema + Prisma client before running these scripts, but those artifacts are filesystem-level prerequisites, not plan-level graph dependencies)
Enables: F0, F1, F2, F4, F5, F9, F10, F11, F12, F13, F15 (all wave 2+ features require migrated data)
</feature_dependencies>

<execution_context>
Scripts are standalone ts-node scripts. They do NOT import from the NestJS app modules.
They use two direct database connections:
  - MySQL source: `mysql2/promise` connection from env var MYSQL_URL
  - PostgreSQL target: `@prisma/client` PrismaClient from env var DATABASE_URL

Run order for a full migration:
  1. Ensure Wave 1a Plan 01 DDL is applied: `npx prisma db push` or `psql < ddl.sql`
  2. `npx ts-node scripts/migrate-mysql-to-postgres.ts`   # ETL all 21 tables
  3. `npx ts-node scripts/verify-migration.ts`            # assert row counts match
  4. `psql $DATABASE_URL < scripts/seed-reference-data.sql` # idempotent seed (only if migrating empty DB)
</execution_context>

<context>
@.planning/express/modernize-legacy-php-ureport-open311-geo/WAVE-SCHEDULE.md
@project_specs/TechArch-uReport.md
@crm/scripts/mysql.sql
</context>

<tasks>

<task type="auto">
  <name>Task 1: MySQL→PostgreSQL ETL migration script</name>
  <files>scripts/migrate-mysql-to-postgres.ts</files>
  <action>
Create `scripts/migrate-mysql-to-postgres.ts` as a standalone ts-node script.

## Purpose

Read every row from the MySQL source database (all 21 tables) and insert them into the
PostgreSQL target database using PrismaClient, in FK-safe dependency order, with all
MySQL-specific type conversions applied.

## Environment variables

```
MYSQL_HOST      MySQL hostname (default: 127.0.0.1)
MYSQL_PORT      MySQL port (default: 3306)
MYSQL_USER      MySQL user
MYSQL_PASSWORD  MySQL password
MYSQL_DATABASE  MySQL database name
DATABASE_URL    PostgreSQL connection string (Prisma format)
```

## FK-safe table order (must insert in this exact sequence)

```
1.  version
2.  contactMethods
3.  substatus
4.  actions
5.  categoryGroups
6.  issueTypes
7.  departments          (self-ref FK to people deferred; insert with defaultPerson_id = null first)
8.  people               (FK to departments)
9.  departments UPDATE   (patch defaultPerson_id after people are inserted)
10. peopleEmails
11. peoplePhones
12. peopleAddresses
13. clients
14. categories
15. category_action_responses
16. department_actions
17. department_categories
18. tickets
19. ticketHistory
20. media
21. bookmarks
22. geoclusters
23. ticket_geodata
```

Note: `departments.defaultPerson_id` references `people.id` and `people.department_id`
references `departments.id` — circular. Strategy: insert departments first with
`defaultPerson_id = null`, insert all people, then UPDATE departments to set
`defaultPerson_id`. This mirrors the `DEFERRABLE INITIALLY DEFERRED` FK in the DDL.

## Type conversion rules (from TechArch DDL Design Notes §3.3)

| MySQL type | PostgreSQL type | Conversion |
|-----------|----------------|------------|
| `TINYINT(1)` / `bool` | `BOOLEAN` | `!!mysqlVal` — MySQL returns 0/1; coerce to true/false |
| `DATETIME` (enteredDate on tickets, actionDate on ticketHistory) | `TIMESTAMP` (no-tz) | Pass through as-is; mysql2 returns a JS Date; Prisma accepts Date for TIMESTAMP |
| `TIMESTAMP` (lastModified, closedDate, uploaded, enteredDate on ticketHistory) | `TIMESTAMPTZ` | mysql2 returns Date in server local time; the migration must force UTC interpretation. Set MySQL session: `SET time_zone = '+00:00'` before reading. |
| `POINT` (geoclusters.center) | `geometry(Point,4326)` | Use `$queryRaw` to call `ST_GeomFromText('POINT(${lon} ${lat})', 4326)`. Extract lon/lat from MySQL binary POINT via `ST_X(center)` and `ST_Y(center)`. |
| `FLOAT(17,14)` (tickets.latitude/longitude) | `DOUBLE PRECISION` | Direct pass-through via mysql2 — already a JS number |
| `AUTO_INCREMENT` id | `GENERATED ALWAYS AS IDENTITY` | Insert with explicit id via `prisma.$executeRaw` using `OVERRIDING SYSTEM VALUE` syntax, then reset sequences after all inserts |

## IDENTITY sequence reset

After all table inserts, reset sequences so next insert gets max(id)+1:

```sql
SELECT setval(
  pg_get_serial_sequence('"tableName"', 'id'),
  COALESCE(MAX(id), 0) + 1,
  false
)
FROM "tableName";
```

Do this for every table that has an `id` IDENTITY column:
version (no id), contactMethods, substatus, actions, categoryGroups, issueTypes,
departments, people, peopleEmails, peoplePhones, peopleAddresses, clients,
categories, category_action_responses, tickets, ticketHistory, media, bookmarks, geoclusters.

## Prisma + IDENTITY insert workaround

Prisma does NOT support `OVERRIDING SYSTEM VALUE` natively. For tables with
`GENERATED ALWAYS AS IDENTITY`, use `$executeRaw` with a raw INSERT:

```typescript
await prisma.$executeRaw`
  INSERT INTO "contactMethods" OVERRIDING SYSTEM VALUE
  VALUES (${row.id}, ${row.name})
`;
```

Do this for ALL tables with `id GENERATED ALWAYS AS IDENTITY PRIMARY KEY`.

## geoclusters spatial migration

MySQL stores `center` as a binary POINT. Use mysql2 to read it:

```sql
SELECT id, level, ST_X(center) AS lon, ST_Y(center) AS lat FROM geoclusters
```

Then write to PostgreSQL:

```typescript
await prisma.$executeRaw`
  INSERT INTO "geoclusters" OVERRIDING SYSTEM VALUE
  VALUES (${row.id}, ${row.level},
    ST_GeomFromText('POINT(' || ${row.lon} || ' ' || ${row.lat} || ')', 4326))
`;
```

## Batch size

Process rows in batches of 500 per table to avoid OOM on large datasets. Log progress
per batch: `console.log(\`[${table}] inserted ${offset + batch.length} / ${total}\`)`.

## Error handling

Wrap each table migration in a try/catch. On error: log the table name + row id that
failed + the error message, then `process.exit(1)`. Do not silently continue.

## Exported function signature

```typescript
export async function migrateAll(
  mysqlConn: mysql.Connection,
  prisma: PrismaClient
): Promise<void>
```

The script's `main()` entrypoint creates connections, calls `migrateAll`, closes connections.

## Dependencies (add to package.json if not present)

```json
"mysql2": "^3.x",
"@prisma/client": "^5.x"
```
  </action>
  <verify>
```bash
# Type-check the script (does not require live DBs)
npx tsc --noEmit --strict scripts/migrate-mysql-to-postgres.ts 2>&1 | head -30 && echo "TYPE_CHECK_OK"

# Verify exported function exists
grep -n 'export async function migrateAll' scripts/migrate-mysql-to-postgres.ts && echo "EXPORT_OK"

# Verify all 21 table names are referenced
for t in version contactMethods substatus actions categoryGroups issueTypes departments people peopleEmails peoplePhones peopleAddresses clients categories category_action_responses department_actions department_categories tickets issueTypes ticketHistory media bookmarks geoclusters ticket_geodata; do
  grep -q "$t" scripts/migrate-mysql-to-postgres.ts || echo "MISSING TABLE: $t"
done && echo "TABLE_COVERAGE_OK"

# Verify IDENTITY sequence reset is present
grep -n 'setval\|pg_get_serial_sequence' scripts/migrate-mysql-to-postgres.ts && echo "SEQUENCE_RESET_OK"

# Verify TINYINT→BOOLEAN conversion logic exists
grep -n '!!' scripts/migrate-mysql-to-postgres.ts && echo "BOOL_CONVERT_OK"

# Verify ST_GeomFromText is used for spatial migration
grep -n 'ST_GeomFromText' scripts/migrate-mysql-to-postgres.ts && echo "SPATIAL_CONVERT_OK"
```
  </verify>
  <done>
- `scripts/migrate-mysql-to-postgres.ts` exists and type-checks with `tsc --noEmit --strict`
- All 21 MySQL table names appear in the script
- Script exports `async function migrateAll(mysqlConn, prisma): Promise<void>`
- `OVERRIDING SYSTEM VALUE` inserts used for all IDENTITY tables
- `setval` + `pg_get_serial_sequence` sequence reset present for all id tables
- `!!mysqlVal` boolean coercion used for all TINYINT(1) columns
- `ST_GeomFromText(..., 4326)` used for geoclusters.center migration
- MySQL session `SET time_zone = '+00:00'` set before any reads
- Batch size of 500 rows, progress logging per batch
- Error causes `process.exit(1)` with table + row context
  </done>
</task>

<task type="auto">
  <name>Task 2: Row-count verification script + idempotent reference-data seed SQL</name>
  <files>
    scripts/verify-migration.ts
    scripts/seed-reference-data.sql
  </files>
  <action>
## Part A: scripts/verify-migration.ts

Create a standalone ts-node verification script that connects to both MySQL and PostgreSQL,
runs `SELECT COUNT(*) FROM table` on each of the 21 tables in both databases, and asserts
the counts match.

### Behavior

- For each table, fetch `mysqlCount` and `pgCount`.
- Print a row-aligned table report:
  ```
  Table                        MySQL     PostgreSQL  Status
  -------------------------------------------------------
  version                          1              1  OK
  contactMethods                   4              4  OK
  substatus                        3              3  OK
  actions                         10             10  OK
  ...
  tickets                       8472           8472  OK
  -------------------------------------------------------
  TOTAL MISMATCH: 0
  ```
- If any table count differs: print `MISMATCH: tableName MySQL=${m} PG=${p}` and call
  `process.exit(1)` after the full report (show all mismatches, not just the first).
- If all counts match: print `ALL TABLES MATCH` and exit 0.

### Table list (all 21)

```typescript
const TABLES = [
  'version', 'contactMethods', 'substatus', 'actions', 'categoryGroups',
  'issueTypes', 'departments', 'people', 'peopleEmails', 'peoplePhones',
  'peopleAddresses', 'clients', 'categories', 'category_action_responses',
  'department_actions', 'department_categories', 'tickets', 'ticketHistory',
  'media', 'bookmarks', 'geoclusters', 'ticket_geodata',
] as const;
```

Note: `department_actions` and `department_categories` are join tables with composite PKs
(no `id` column). COUNT(*) still works fine on them.

### PostgreSQL table quoting

MySQL table names are unquoted. PostgreSQL table names are camelCase and need double-quotes:

```typescript
// MySQL: SELECT COUNT(*) FROM contactMethods
// PG:    SELECT COUNT(*) FROM "contactMethods"
const pgCount = await prisma.$queryRaw<[{count: bigint}]>`
  SELECT COUNT(*) AS count FROM "${Prisma.raw(table)}"
`;
```

### Exported function signature

```typescript
export async function verifyAll(
  mysqlConn: mysql.Connection,
  prisma: PrismaClient
): Promise<void>  // throws if mismatches found
```

### Environment variables

Same as migration script (MYSQL_* + DATABASE_URL).

---

## Part B: scripts/seed-reference-data.sql

Create an idempotent SQL seed file for the 5 reference tables. This is used when
standing up a fresh PostgreSQL instance without migrating from a live MySQL source
(development / CI environments).

The seed must be idempotent: safe to run multiple times with `ON CONFLICT DO NOTHING`.

### EXACT seed data (verbatim from TechArch DDL §3.2 — do NOT alter values)

```sql
-- Ensure PostGIS is available (idempotent)
CREATE EXTENSION IF NOT EXISTS postgis;

-- version
INSERT INTO "version" (version) VALUES ('2.1')
  ON CONFLICT DO NOTHING;

-- contactMethods
INSERT INTO "contactMethods" (name) VALUES ('Email')     ON CONFLICT DO NOTHING;
INSERT INTO "contactMethods" (name) VALUES ('Phone')     ON CONFLICT DO NOTHING;
INSERT INTO "contactMethods" (name) VALUES ('Web Form')  ON CONFLICT DO NOTHING;
INSERT INTO "contactMethods" (name) VALUES ('Other')     ON CONFLICT DO NOTHING;

-- substatus
INSERT INTO "substatus" (status, name, description) VALUES
  ('closed', 'Resolved',  'This ticket has been taken care of')
  ON CONFLICT DO NOTHING;
INSERT INTO "substatus" (status, name, description) VALUES
  ('closed', 'Duplicate', 'This ticket is a duplicate of another ticket')
  ON CONFLICT DO NOTHING;
INSERT INTO "substatus" (status, name, description) VALUES
  ('closed', 'Bogus', 'This ticket is not actually a problem or has already been taken care of')
  ON CONFLICT DO NOTHING;

-- actions (10 system actions — verbatim from TechArch)
INSERT INTO "actions" (name, type, description) VALUES
  ('open',           'system', 'Opened by {actionPerson}')                                              ON CONFLICT DO NOTHING;
INSERT INTO "actions" (name, type, description) VALUES
  ('assignment',     'system', '{enteredByPerson} assigned this case to {actionPerson}')                ON CONFLICT DO NOTHING;
INSERT INTO "actions" (name, type, description) VALUES
  ('closed',         'system', 'Closed by {actionPerson}')                                              ON CONFLICT DO NOTHING;
INSERT INTO "actions" (name, type, description) VALUES
  ('changeCategory', 'system', 'Changed category from {original:category_id} to {updated:category_id}') ON CONFLICT DO NOTHING;
INSERT INTO "actions" (name, type, description) VALUES
  ('changeLocation', 'system', 'Changed location from {original:location} to {updated:location}')       ON CONFLICT DO NOTHING;
INSERT INTO "actions" (name, type, description) VALUES
  ('response',       'system', '{actionPerson} contacted {reportedByPerson_id}')                        ON CONFLICT DO NOTHING;
INSERT INTO "actions" (name, type, description) VALUES
  ('duplicate',      'system', '{duplicate:ticket_id} marked as a duplicate of this case.')             ON CONFLICT DO NOTHING;
INSERT INTO "actions" (name, type, description) VALUES
  ('update',         'system', '{enteredByPerson} updated this case.')                                  ON CONFLICT DO NOTHING;
INSERT INTO "actions" (name, type, description) VALUES
  ('comment',        'system', '{enteredByPerson} commented on this case.')                             ON CONFLICT DO NOTHING;
INSERT INTO "actions" (name, type, description) VALUES
  ('upload_media',   'system', '{enteredByPerson} uploaded an attachment.')                             ON CONFLICT DO NOTHING;

-- categoryGroups
INSERT INTO "categoryGroups" (name) VALUES ('Streets')    ON CONFLICT DO NOTHING;
INSERT INTO "categoryGroups" (name) VALUES ('Sanitation') ON CONFLICT DO NOTHING;
INSERT INTO "categoryGroups" (name) VALUES ('Other')      ON CONFLICT DO NOTHING;

-- issueTypes
INSERT INTO "issueTypes" (name) VALUES ('Comment')   ON CONFLICT DO NOTHING;
INSERT INTO "issueTypes" (name) VALUES ('Complaint')  ON CONFLICT DO NOTHING;
INSERT INTO "issueTypes" (name) VALUES ('Question')   ON CONFLICT DO NOTHING;
INSERT INTO "issueTypes" (name) VALUES ('Report')     ON CONFLICT DO NOTHING;
INSERT INTO "issueTypes" (name) VALUES ('Request')    ON CONFLICT DO NOTHING;
INSERT INTO "issueTypes" (name) VALUES ('Violation')  ON CONFLICT DO NOTHING;
```

**Important:** `contactMethods`, `substatus`, `actions`, `categoryGroups`, `issueTypes`
use `GENERATED ALWAYS AS IDENTITY` — the seed inserts do NOT specify an explicit `id`.
PostgreSQL will assign `id` values automatically via the sequence. `ON CONFLICT DO NOTHING`
applies to the UNIQUE constraint on `name` (or the PK if name already unique via a
constraint). If there is no UNIQUE constraint on `name`, use a CTE check or simply
accept that re-running will insert duplicates. Preferred: add a comment that this seed
file is intended for fresh DBs only (no migration from MySQL) and document that the
application's `AdminService` protects system actions from deletion.
  </action>
  <verify>
```bash
# Type-check verify script
npx tsc --noEmit --strict scripts/verify-migration.ts 2>&1 | head -30 && echo "TYPE_CHECK_OK"

# Verify exported function exists
grep -n 'export async function verifyAll' scripts/verify-migration.ts && echo "EXPORT_OK"

# Verify all 21 tables referenced in verify script
for t in version contactMethods substatus actions categoryGroups issueTypes departments people peopleEmails peoplePhones peopleAddresses clients categories category_action_responses department_actions department_categories tickets ticketHistory media bookmarks geoclusters ticket_geodata; do
  grep -q "$t" scripts/verify-migration.ts || echo "MISSING: $t"
done && echo "ALL_TABLES_PRESENT"

# Verify seed SQL file exists and has content for all 5 reference tables
grep -c 'INSERT INTO' scripts/seed-reference-data.sql
grep -q '"contactMethods"' scripts/seed-reference-data.sql && echo "contactMethods_OK"
grep -q '"substatus"' scripts/seed-reference-data.sql && echo "substatus_OK"
grep -q '"actions"' scripts/seed-reference-data.sql && echo "actions_OK"
grep -q '"categoryGroups"' scripts/seed-reference-data.sql && echo "categoryGroups_OK"
grep -q '"issueTypes"' scripts/seed-reference-data.sql && echo "issueTypes_OK"

# Verify ON CONFLICT DO NOTHING is present (idempotency)
grep -c 'ON CONFLICT DO NOTHING' scripts/seed-reference-data.sql

# Verify action count in seed (10 system actions)
grep -c "INSERT INTO \"actions\"" scripts/seed-reference-data.sql

# Verify process.exit(1) on mismatch
grep -n 'process.exit(1)' scripts/verify-migration.ts && echo "EXIT_ON_MISMATCH_OK"

# Dry-run seed SQL for syntax (requires psql)
if command -v psql &>/dev/null; then
  psql "$DATABASE_URL" --dry-run < scripts/seed-reference-data.sql 2>&1 | head -5 && echo "SQL_SYNTAX_OK"
fi
```
  </verify>
  <done>
- `scripts/verify-migration.ts` exists and type-checks with `tsc --noEmit --strict`
- All 21 table names are queried in verify-migration.ts
- Script exports `async function verifyAll(mysqlConn, prisma): Promise<void>`
- Script prints a table-aligned report with MySQL count, PG count, and OK/MISMATCH per table
- Script exits non-zero after full report if ANY table count differs
- Script exits 0 and prints "ALL TABLES MATCH" if all counts equal
- `scripts/seed-reference-data.sql` exists
- Seed contains exactly 4 contactMethods rows, 3 substatus rows, 10 actions rows, 3 categoryGroups rows, 6 issueTypes rows — matching TechArch DDL verbatim
- All seed INSERTs use `ON CONFLICT DO NOTHING` for idempotency
- Seed does not specify explicit `id` values (GENERATED ALWAYS AS IDENTITY sequences auto-assign)
  </done>
</task>

</tasks>

<verification>
End-to-end verification (requires both MySQL source and PostgreSQL target to be reachable):

```bash
# 1. Type-check both scripts
npx tsc --noEmit scripts/migrate-mysql-to-postgres.ts scripts/verify-migration.ts

# 2. Run migration against test databases
MYSQL_HOST=localhost MYSQL_USER=root MYSQL_PASSWORD=secret MYSQL_DATABASE=ureport_mysql \
DATABASE_URL=postgresql://postgres:secret@localhost:5432/ureport \
npx ts-node scripts/migrate-mysql-to-postgres.ts

# 3. Verify row counts
MYSQL_HOST=localhost MYSQL_USER=root MYSQL_PASSWORD=secret MYSQL_DATABASE=ureport_mysql \
DATABASE_URL=postgresql://postgres:secret@localhost:5432/ureport \
npx ts-node scripts/verify-migration.ts
# Expected: exits 0, prints "ALL TABLES MATCH"

# 4. Apply reference seed to a fresh DB
psql postgresql://postgres:secret@localhost:5432/ureport_fresh < scripts/seed-reference-data.sql
# Expected: no errors
psql postgresql://postgres:secret@localhost:5432/ureport_fresh -c "SELECT count(*) FROM actions;"
# Expected: 10

# 5. Run seed a second time — must be idempotent
psql postgresql://postgres:secret@localhost:5432/ureport_fresh < scripts/seed-reference-data.sql
psql postgresql://postgres:secret@localhost:5432/ureport_fresh -c "SELECT count(*) FROM actions;"
# Expected: still 10 (no duplicates)
```
</verification>

<success_criteria>
- `scripts/migrate-mysql-to-postgres.ts` type-checks and handles all 21 tables with correct type conversions
- `scripts/verify-migration.ts` type-checks, queries all 21 tables in both DBs, exits 1 on any mismatch
- `scripts/seed-reference-data.sql` contains the exact 27 seed rows from TechArch DDL verbatim, is idempotent
- Wave 1 (F6) is fully complete: DDL (Plan 01) + migration + verification + seed (Plan 02)
- All downstream waves (2–6) can proceed with the PostgreSQL database populated
</success_criteria>

<output>
Wave 1b is self-contained. No SUMMARY.md is required for express mode.
The three script files are the deliverables; they are consumed by operators running
the migration, not by the NestJS application at runtime.
</output>
