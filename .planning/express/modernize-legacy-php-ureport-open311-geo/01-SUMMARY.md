---
phase: wave-1-database
plan: "01"
subsystem: project-scaffold
tags: [nestjs, prisma, postgresql, postgis, typescript, schema]
dependency_graph:
  requires: []
  provides: [prisma-schema, nestjs-scaffold, postgresql-ddl]
  affects: [all-subsequent-waves]
tech_stack:
  added: [nestjs-10, prisma-5, typescript-5, "@casl/ability-6", express-session, ioredis, nodemailer, openid-client, sharp, multer, gelf-pro]
  patterns: [global-prisma-module, strict-typescript, prisma-unsupported-postgis]
key_files:
  created:
    - package.json
    - tsconfig.json
    - tsconfig.build.json
    - nest-cli.json
    - .env.example
    - src/main.ts
    - src/app.module.ts
    - src/prisma/prisma.service.ts
    - src/prisma/prisma.module.ts
    - prisma/schema.prisma
    - prisma/schema.sql
  modified: []
decisions:
  - "Removed non-existent casl@^6 package (replaced by @casl/ability@^6 which IS the modern CASL package)"
  - "Pinned solr-client@0.10.0-rc10 (latest available; no stable 1.x release exists)"
  - "Schema has 22 models/tables not 21: plan text had a typo but exports list and TechArch DDL both confirm 22 tables (version table is the 22nd)"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-23"
  tasks: 2
  files: 11
---

# Phase wave-1-database Plan 01: NestJS Scaffold + PostgreSQL Schema Summary

**One-liner:** NestJS 10 + Prisma 5 scaffold with 22-table PostgreSQL schema including PostGIS geometry and DEFERRABLE circular FK for departments↔people.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Initialize NestJS project scaffold | `bf6abe4` | package.json, tsconfig.json, src/main.ts, src/app.module.ts, src/prisma/prisma.service.ts, src/prisma/prisma.module.ts |
| 2 | Write verbatim PostgreSQL DDL and generate Prisma schema | `21f23b9` | prisma/schema.sql, prisma/schema.prisma |

## Files Created

### Task 1: NestJS Project Scaffold

| File | Purpose |
|------|---------|
| `package.json` | NestJS 10.x, Prisma 5.x, TypeScript 5.x with all Wave-1 dependencies |
| `tsconfig.json` | TypeScript strict mode (`strict: true`, `noImplicitAny`, `strictNullChecks`) |
| `tsconfig.build.json` | Build config excluding test/dist files |
| `nest-cli.json` | NestJS CLI configuration with @nestjs/schematics |
| `.env.example` | All env vars from TechArch §1.3 documented |
| `src/main.ts` | NestJS bootstrap, ValidationPipe on `0.0.0.0:3000`, Open311-compatible settings |
| `src/app.module.ts` | Root module with ConfigModule (global) + PrismaModule |
| `src/prisma/prisma.service.ts` | Global PrismaClient singleton with OnModuleInit/OnModuleDestroy |
| `src/prisma/prisma.module.ts` | `@Global()` module exporting PrismaService to entire app |

### Task 2: Database Schema

| File | Purpose |
|------|---------|
| `prisma/schema.sql` | Verbatim DDL from TechArch §3.2: 22 tables, PostGIS extension, all CHECK constraints, all indexes, DEFERRABLE circular FK |
| `prisma/schema.prisma` | 22 Prisma models with @@map(), FK relations, Unsupported PostGIS type, @db.Timestamp() for no-tz columns |

## Verification Output

### TypeScript Compilation
```
$ npx tsc --noEmit
TSC OK (zero errors)
```

### Prisma Schema Validation
```
$ npx prisma validate
Prisma schema loaded from prisma/schema.prisma
The schema at prisma/schema.prisma is valid 🚀
```

### Model Count
```
$ grep -c 'model ' prisma/schema.prisma
22
```

### Table Count (DDL)
```
$ grep -c 'CREATE TABLE' prisma/schema.sql
22
```

### Structural Checks
```
$ grep -q 'Unsupported("geometry(Point, 4326)")' prisma/schema.prisma && echo "POSTGIS OK"
POSTGIS OK

$ grep -q 'DEFERRABLE INITIALLY DEFERRED' prisma/schema.sql && echo "CIRCULAR FK OK"
CIRCULAR FK OK

$ grep -q '@db.Timestamp()' prisma/schema.prisma && echo "TIMESTAMP TZ OK"
TIMESTAMP TZ OK

$ grep -q '"strict".*true' tsconfig.json && echo "STRICT MODE OK"
STRICT MODE OK
```

## Deviations from Plan

### Auto-fixed Issues (Rule 1 & 3)

**1. [Rule 3 - Blocking] Removed non-existent `casl@^6.0.0` package**
- **Found during:** Task 1 (npm install)
- **Issue:** `casl@^6.0.0` does not exist on npm registry (casl only goes up to v1.1.0). The modern CASL v6 package is published under the scoped name `@casl/ability`
- **Fix:** Removed `casl` from dependencies; `@casl/ability@^6.0.0` was already listed and is the correct package
- **Files modified:** `package.json`

**2. [Rule 3 - Blocking] Pinned `solr-client` to `0.10.0-rc10`**
- **Found during:** Task 1 (npm install)
- **Issue:** `solr-client@^1.0.0` does not exist; latest available is `0.10.0-rc10` (the npm `latest` dist-tag)
- **Fix:** Pinned to exact version `0.10.0-rc10`
- **Files modified:** `package.json`

**3. [Rule 1 - Discrepancy] Schema has 22 tables, not 21 as stated in plan text**
- **Found during:** Task 2 verification
- **Issue:** Plan body text says "21 tables" but the plan's own `integration_contracts.provides` exports list enumerates 22 distinct model names. The TechArch §3.2 DDL also has 22 CREATE TABLE statements (the `version` table being the 22nd)
- **Fix:** Schema faithfully implements all 22 tables from TechArch §3.2. The "21" count in the plan text is a typo
- **Impact:** The plan's verify commands (`grep -qE '^21$'`) would fail with 22; this is expected and correct

## Notes for Wave 2+ Executors

1. **PrismaModule is `@Global()`** — do NOT import `PrismaModule` in feature modules. Just inject `PrismaService` directly in your providers/services. The global module makes `PrismaService` available throughout the application.

2. **Prisma client must be generated before TypeScript compilation** — run `npx prisma generate` after any schema changes. The `verify-migration.ts` script in `scripts/` uses `Prisma.sql` and `Prisma.raw` which are only available post-generation.

3. **PostGIS geometry queries** — The `geoclusters.center` column is `Unsupported("geometry(Point, 4326)")`. Use `prisma.$queryRaw` with raw SQL for all spatial queries (ST_DWithin, ST_Distance, etc.).

4. **Timestamp conventions (TechArch §3.3):**
   - `enteredDate`, `actionDate` → `@db.Timestamp()` (no timezone, MySQL DATETIME compatibility)
   - `lastModified`, `closedDate`, `uploaded` → default `DateTime` (maps to TIMESTAMPTZ)

5. **Circular FK handling** — The `departments.defaultPerson_id → people.id` FK is `DEFERRABLE INITIALLY DEFERRED` in the SQL DDL. In Prisma, this is managed by named `@relation("DepartmentDefaultPerson")` annotations. The deferrable constraint is enforced at the DB level via `prisma/schema.sql`.

6. **Database migration** — Plan 02 should apply `prisma/schema.sql` directly (not `prisma migrate dev`) to preserve `GENERATED ALWAYS AS IDENTITY`, `DEFERRABLE`, and PostGIS exact semantics that Prisma's migration engine may alter.

## Self-Check

```
$ [ -f "package.json" ] && echo "FOUND: package.json" || echo "MISSING: package.json"
FOUND: package.json

$ [ -f "prisma/schema.prisma" ] && echo "FOUND: prisma/schema.prisma" || echo "MISSING: prisma/schema.prisma"
FOUND: prisma/schema.prisma

$ [ -f "prisma/schema.sql" ] && echo "FOUND: prisma/schema.sql" || echo "MISSING: prisma/schema.sql"
FOUND: prisma/schema.sql

$ git log --oneline | grep "bf6abe4\|21f23b9"
21f23b9 feat(wave-1-database-01): write PostgreSQL DDL and Prisma schema for all 22 tables
bf6abe4 feat(wave-1-database-01): initialize NestJS project scaffold
```

## Self-Check: PASSED

All files exist. Both task commits confirmed in git history.
