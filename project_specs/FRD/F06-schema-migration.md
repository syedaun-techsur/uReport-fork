---

## F06: MySQL-to-PostgreSQL Schema Migration

**Description:** The existing MySQL schema (21 tables, 285 lines) must be fully translated to PostgreSQL-idiomatic DDL and all data migrated with full fidelity. MySQL-specific constructs are systematically replaced with PostgreSQL equivalents. A Prisma schema is generated from the PostgreSQL DDL. A migration script reads from the MySQL source and writes to the PostgreSQL target, with row-count verification per table.

**Terminology:**
- **DDL:** Data Definition Language — the `CREATE TABLE` statements
- **Prisma schema:** `prisma/schema.prisma` — the ORM model definition generated from the PostgreSQL DDL
- **IDENTITY:** PostgreSQL `GENERATED ALWAYS AS IDENTITY` — replaces MySQL `AUTO_INCREMENT`
- **PostGIS:** PostgreSQL spatial extension providing `geometry` types — replaces MySQL `POINT`
- **Row-count verification:** After migration, assert `SELECT COUNT(*)` matches between MySQL source and PostgreSQL target for each table

**Sub-features:**
- MySQL → PostgreSQL DDL translation (all 21 tables)
- Type mapping for all MySQL-specific types
- Prisma schema generation
- Data migration script
- Row-count verification
- Seed data preservation

---

### F06.1 MySQL → PostgreSQL Type Mapping

| MySQL Type | PostgreSQL Equivalent | Notes |
|-----------|----------------------|-------|
| `AUTO_INCREMENT` | `GENERATED ALWAYS AS IDENTITY` | or `SERIAL` |
| `INT UNSIGNED` | `INTEGER` | PG has no unsigned; application ensures positive values |
| `TINYINT(1)` | `BOOLEAN` | `0` → `false`, `1` → `true` |
| `TINYINT UNSIGNED` | `SMALLINT` | e.g. `geoclusters.level` |
| `FLOAT(17, 14)` | `DOUBLE PRECISION` | lat/lon precision preserved |
| `POINT` | `geometry(Point, 4326)` | PostGIS; SRID 4326 (WGS84) |
| `ENUM(...)` | `TEXT` with `CHECK` constraint | or PostgreSQL `ENUM` type |
| `TIMESTAMP ... DEFAULT CURRENT_TIMESTAMP` | `TIMESTAMPTZ DEFAULT NOW()` | timezone-aware |
| `DATETIME` | `TIMESTAMP` | stored as UTC |
| `TIMESTAMP NULL` | `TIMESTAMPTZ NULL` | for `closedDate` |
| `` `backtick_names` `` | `"quoted_names"` or unquoted | reserved words must be quoted |
| `BOOL` | `BOOLEAN` | native PG type |
| `TEXT` | `TEXT` | identical |
| `VARCHAR(n)` | `VARCHAR(n)` | identical |

---

### F06.2 ENUM Handling

MySQL ENUMs in the schema are translated to PostgreSQL `TEXT` with `CHECK` constraints (preferred for easier future migrations) or to native PostgreSQL `ENUM` types. The chosen approach is `TEXT` + `CHECK`:

| Table.Column | MySQL ENUM values | PostgreSQL CHECK |
|-------------|-------------------|-----------------|
| `peopleEmails.label` | `'Home','Work','Other'` | `CHECK (label IN ('Home','Work','Other'))` |
| `peoplePhones.label` | `'Main','Mobile','Work','Home','Fax','Pager','Other'` | `CHECK (label IN (...))` |
| `peopleAddresses.label` | `'Home','Business','Rental'` | `CHECK (label IN ('Home','Business','Rental'))` |
| `substatus.status` | `'open','closed'` | `CHECK (status IN ('open','closed'))` |
| `actions.type` | `'system','department'` | `CHECK (type IN ('system','department'))` |
| `categories.displayPermissionLevel` | `'staff','public','anonymous'` | `CHECK (displayPermissionLevel IN ('staff','public','anonymous'))` |
| `categories.postingPermissionLevel` | `'staff','public','anonymous'` | `CHECK (postingPermissionLevel IN ('staff','public','anonymous'))` |

---

### F06.3 Spatial Column Handling

- MySQL `POINT SRID 0` (`geoclusters.center`) → PostGIS `geometry(Point, 4326)`
- MySQL lat/lon `FLOAT(17,14)` columns on `tickets` remain as `DOUBLE PRECISION` scalar columns (not converted to geometry) since they are consumed separately from the geo-cluster geometry.
- PostGIS extension must be enabled: `CREATE EXTENSION IF NOT EXISTS postgis;`
- Spatial index on `geoclusters.center`: `CREATE INDEX idx_geoclusters_center ON geoclusters USING GIST(center);`

---

### F06.4 Data Migration Script

**Script:** `scripts/migrate-mysql-to-pg.ts`

**Process:**
1. Connect to MySQL source (env: `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`).
2. Connect to PostgreSQL target (env: `DATABASE_URL`).
3. Disable FK checks on target (`SET session_replication_role = 'replica'`).
4. For each table in dependency order (leaves first, then referencing tables):
   a. Truncate target table.
   b. Read all rows from MySQL source in batches of 1000.
   c. For each batch, transform data types:
      - `TINYINT(1)` → `Boolean`
      - `POINT` binary → `ST_GeomFromText('POINT(lon lat)', 4326)` WKT
      - `FLOAT(17,14)` → JavaScript `number` (no truncation)
      - `DATETIME` / `TIMESTAMP` → UTC `Date` object
   d. Bulk-insert transformed rows into target table.
5. Re-enable FK checks.
6. Reset all `IDENTITY` sequences to `MAX(id) + 1` per table.
7. Run row-count verification (step F06.5).

**Migration table order:**
1. `contactMethods`, `categoryGroups`, `issueTypes`, `substatus`, `actions`
2. `departments`, `people`
3. `peopleEmails`, `peoplePhones`, `peopleAddresses`
4. `clients`
5. `categories`
6. `category_action_responses`, `department_actions`, `department_categories`
7. `tickets`
8. `ticketHistory`, `media`, `bookmarks`
9. `geoclusters`, `ticket_geodata`

---

### F06.5 Row-Count Verification

After migration completes, for each table:
1. Execute `SELECT COUNT(*) FROM {table}` on MySQL source.
2. Execute `SELECT COUNT(*) FROM {table}` on PostgreSQL target.
3. Assert counts are equal.
4. Log result: `[PASS] {table}: {count} rows` or `[FAIL] {table}: MySQL={n}, PG={m}`.
5. Exit with non-zero code if any table fails verification.

---

### F06.6 Prisma Schema

`prisma/schema.prisma` is generated to match the PostgreSQL DDL. Key Prisma directives:
- `@id @default(autoincrement())` for primary keys
- `@unique` for `people.username`, `clients.api_key`
- `@relation` for all foreign keys
- `@db.Text` for `TEXT` columns
- `@db.DoublePrecision` for `DOUBLE PRECISION`
- `Unsupported("geometry(Point, 4326)")` for PostGIS geometry columns (Prisma does not natively model PostGIS; raw queries used for spatial operations)

---

### F06.7 Seed Data Preservation

The following seed rows from `mysql.sql` must be present in the migrated database:
- `contactMethods`: Email, Phone, Web Form, Other (4 rows)
- `substatus`: Resolved/closed, Duplicate/closed, Bogus/closed (3 rows)
- `actions`: 10 system action rows (open, assignment, closed, changeCategory, changeLocation, response, duplicate, update, comment, upload_media)
- `categoryGroups`: Streets, Sanitation, Other (3 rows)
- `issueTypes`: Comment, Complaint, Question, Report, Request, Violation (6 rows)

Seed data is included in both the migration script and in a standalone `prisma/seed.ts` for fresh deployments.

---

**API Surface (this feature):** No runtime API endpoints. Migration is a CLI script.

**Schema Surface (this feature):** Defines all 21 tables — see `Y0-schema.md` for full PostgreSQL DDL.
