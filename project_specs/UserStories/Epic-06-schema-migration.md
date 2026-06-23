## Epic 6: MySQL-to-PostgreSQL Schema Migration (F6)

The existing MySQL schema (21 tables) must be fully translated to PostgreSQL-idiomatic DDL, all data migrated with full fidelity, and a Prisma schema generated. This is a technical infrastructure feature with no direct user-facing UX; the Department Supervisor (Robert Osei) is the go/no-go stakeholder.

---

### US-6.1: Translate All MySQL DDL to PostgreSQL
**As a** Department Supervisor, **I want** the entire MySQL schema to be accurately translated to PostgreSQL DDL, **so that** the re-platformed application can run on the city's standard PostgreSQL infrastructure.

**Acceptance Criteria:**
- [ ] All 21 tables are translated from MySQL DDL to PostgreSQL DDL
- [ ] `AUTO_INCREMENT` → `GENERATED ALWAYS AS IDENTITY`
- [ ] `TINYINT(1)` → `BOOLEAN`
- [ ] `FLOAT(17,14)` → `DOUBLE PRECISION` (lat/lon precision preserved)
- [ ] MySQL `POINT SRID 0` → PostGIS `geometry(Point, 4326)` with `CREATE EXTENSION IF NOT EXISTS postgis`
- [ ] `ENUM` columns → `TEXT` with `CHECK` constraints
- [ ] `TIMESTAMP` → `TIMESTAMPTZ` (timezone-aware)
- [ ] All foreign key constraints are preserved in the PostgreSQL schema
- [ ] GiST spatial index created on `geoclusters.center`

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.2: Migrate All Data from MySQL to PostgreSQL
**As a** Department Supervisor, **I want** all existing data migrated from MySQL to PostgreSQL with no data loss, **so that** the re-platformed system has the full history from day one.

**Acceptance Criteria:**
- [ ] Migration script connects to MySQL source (via env vars) and PostgreSQL target
- [ ] Tables are migrated in dependency order (leaf tables first)
- [ ] `TINYINT(1)` values are converted to PostgreSQL `BOOLEAN`
- [ ] Spatial `POINT` binary is converted to `ST_GeomFromText('POINT(lon lat)', 4326)`
- [ ] All `DATETIME`/`TIMESTAMP` values are migrated as UTC `Date` objects
- [ ] FK checks are disabled during migration and re-enabled afterward
- [ ] All `IDENTITY` sequences are reset to `MAX(id) + 1` per table after migration

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.3: Verify Row Counts Match After Migration
**As a** Department Supervisor, **I want** automatic row-count verification to confirm migration completeness, **so that** I can approve go-live with confidence that no data was lost.

**Acceptance Criteria:**
- [ ] After migration, `SELECT COUNT(*)` is compared between MySQL source and PostgreSQL target for each of the 21 tables
- [ ] Each table result is logged as `[PASS] {table}: {count} rows` or `[FAIL] {table}: MySQL={n}, PG={m}`
- [ ] Script exits with a non-zero code if any table fails verification
- [ ] Zero row-count discrepancies is the acceptance threshold for go-live

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.4: Preserve All Seed Data in PostgreSQL
**As a** Department Supervisor, **I want** all system seed data to be present after migration, **so that** the re-platformed application starts in a fully configured state without manual data entry.

**Acceptance Criteria:**
- [ ] `contactMethods`: Email, Phone, Web Form, Other (4 rows)
- [ ] `substatus`: Resolved/closed, Duplicate/closed, Bogus/closed (3 rows)
- [ ] `actions`: 10 system action rows (open, assignment, closed, changeCategory, changeLocation, response, duplicate, update, comment, upload_media)
- [ ] `categoryGroups`: Streets, Sanitation, Other (3 rows)
- [ ] `issueTypes`: Comment, Complaint, Question, Report, Request, Violation (6 rows)
- [ ] Seed data is included in both the migration script and a standalone `prisma/seed.ts` for fresh deployments

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.5: Generate Prisma Schema from PostgreSQL DDL
**As a** Department Supervisor, **I want** a Prisma schema (`schema.prisma`) generated from the PostgreSQL DDL, **so that** the development team can use type-safe ORM queries without writing raw SQL.

**Acceptance Criteria:**
- [ ] `prisma/schema.prisma` models all 21 tables with correct field types
- [ ] Primary keys use `@id @default(autoincrement())`
- [ ] Unique constraints applied to `people.username` and `clients.api_key`
- [ ] All foreign key relationships represented via `@relation`
- [ ] PostGIS geometry columns use `Unsupported("geometry(Point, 4326)")` with raw queries for spatial operations
- [ ] Schema passes `prisma validate` without errors

**Priority:** P0 | **Feature Ref:** F6

---
