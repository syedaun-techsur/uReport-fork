---
phase: wave-1-database
plan: 01
subsystem: project-scaffold
tags: [nestjs, prisma, postgresql, postgis, typescript, schema]
dependency_graph:
  requires: []
  provides: [prisma/schema.prisma, prisma/schema.sql, NestJS scaffold]
  affects: [all waves — every subsequent wave depends on this schema]
tech_stack:
  added:
    - NestJS 10.x (@nestjs/core, @nestjs/common, @nestjs/platform-express, @nestjs/config, @nestjs/schedule)
    - Prisma 5.x (@prisma/client, prisma CLI)
    - TypeScript 5.x (strict mode)
    - PostGIS (geometry(Point, 4326) via Unsupported type in Prisma)
    - @casl/ability 6.x (authorization)
    - connect-redis + ioredis (session store)
    - express-session (session middleware)
    - openid-client 5.x (OIDC)
    - nodemailer 6.x (email)
    - sharp 0.33.x (image processing)
    - multer (file uploads)
    - class-validator + class-transformer (DTO validation)
    - gelf-pro (GELF/Graylog logging)
    - uuid 9.x
  patterns:
    - Global PrismaModule (@Global decorator) for zero-import DI across all modules
    - ValidationPipe with whitelist:true + transform:true at bootstrap
    - Prisma Unsupported("geometry(Point,4326)") for PostGIS spatial columns
    - Named @relation() for all FK ambiguities (circular deps, multi-FK same table)
key_files:
  created:
    - package.json — NestJS 10.x + Prisma 5.x + all Wave-1 dependencies
    - tsconfig.json — TypeScript strict mode (strict:true, noImplicitAny, strictNullChecks)
    - tsconfig.build.json — build config excluding tests/dist
    - nest-cli.json — NestJS CLI config (sourceRoot:src, deleteOutDir:true)
    - .env.example — all TechArch §1.3 environment variables documented
    - src/main.ts — NestJS bootstrap (ValidationPipe, 0.0.0.0:PORT)
    - src/app.module.ts — root module (ConfigModule global + PrismaModule)
    - src/prisma/prisma.service.ts — PrismaClient singleton with OnModuleInit/Destroy
    - src/prisma/prisma.module.ts — @Global() module, exports PrismaService
    - prisma/schema.prisma — 22 Prisma models, all FK relations, PostGIS Unsupported type
    - prisma/schema.sql — verbatim PostgreSQL DDL for all 22 tables + PostGIS extension
decisions:
  - "casl standalone package removed (does not exist at v6); @casl/ability already included"
  - "solr-client pinned to 0.10.0-rc9 (latest available; plan specified ^1.0.0 which does not exist)"
  - "Schema has 22 tables/models not 21: plan counts 21 but the DDL section + integration_contracts exports list 22 (version table is the 22nd). Our implementation follows the DDL faithfully."
  - "prisma/schema.prisma was pre-committed in wave-1-database-02 (Rule 3 prereq fix); our file is identical."
metrics:
  duration: ~15 minutes
  completed: 2026-06-23
  tasks_completed: 2
  files_created: 11
---

# Phase wave-1-database Plan 01: NestJS Scaffold + PostgreSQL Schema Summary

**One-liner:** NestJS 10/TypeScript strict scaffold with 22-table PostgreSQL DDL and Prisma schema including PostGIS geometry support and circular FK handling.

---

## Files Created

### Task 1: NestJS Project Scaffold

| File | Purpose |
|------|---------|
| `package.json` | NestJS 10.x, Prisma 5.x, TypeScript 5.x, all Wave-1 runtime dependencies |
| `tsconfig.json` | TypeScript strict mode (`strict:true`, `noImplicitAny`, `strictNullChecks`, ES2021) |
| `tsconfig.build.json` | Build config extending tsconfig.json, excludes tests and dist |
| `nest-cli.json` | NestJS CLI config with `sourceRoot: src` and `deleteOutDir: true` |
| `.env.example` | All environment variables from TechArch §1.3 documented |
| `src/main.ts` | NestJS bootstrap with ValidationPipe (whitelist, transform), binds to 0.0.0.0:PORT |
| `src/app.module.ts` | Root module: ConfigModule (global) + PrismaModule |
| `src/prisma/prisma.service.ts` | PrismaClient singleton implementing OnModuleInit + OnModuleDestroy |
| `src/prisma/prisma.module.ts` | @Global() module — PrismaService injectable everywhere without re-importing |

### Task 2: PostgreSQL DDL and Prisma Schema

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | 22 Prisma models, all FK relations with named @relation(), PostGIS Unsupported type |
| `prisma/schema.sql` | Verbatim PostgreSQL DDL from TechArch §3.2: 22 tables, PostGIS extension, all CHECK constraints, all indexes, DEFERRABLE circular FK |

---

## Verification Results

### TypeScript Compilation
```
npx tsc --noEmit → exits 0, zero errors
TSC OK (strict mode, noImplicitAny, strictNullChecks)
```

### Prisma Schema Validation
```
npx prisma validate
The schema at prisma/schema.prisma is valid 🚀
PRISMA VALID
```

### Model Count
```
grep -c 'model ' prisma/schema.prisma → 22
grep -c 'CREATE TABLE' prisma/schema.sql → 22
```

### Structural Checks
```
POSTGIS OK    — Unsupported("geometry(Point, 4326)") present in geoclusters.center
CIRCULAR FK OK — DEFERRABLE INITIALLY DEFERRED on departments.defaultPerson_id → people.id
TIMESTAMP TZ OK — @db.Timestamp() on enteredDate (tickets) and actionDate (ticketHistory)
STRICT MODE OK — "strict": true in tsconfig.json
```

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `casl@^6.0.0` does not exist as a standalone package**
- **Found during:** Task 1 (`npm install`)
- **Issue:** `npm error notarget No matching version found for casl@^6.0.0`
- **Fix:** Removed standalone `casl` entry from dependencies; `@casl/ability@^6.0.0` was already present and is the correct package
- **Files modified:** `package.json`
- **Commit:** 13f00f7

**2. [Rule 1 - Bug] `solr-client@^1.0.0` does not exist**
- **Found during:** Task 1 (`npm install`)
- **Issue:** `npm error notarget No matching version found for solr-client@^1.0.0`
- **Fix:** Pinned to `^0.10.0-rc9` (latest available version: `0.10.0-rc9`)
- **Files modified:** `package.json`
- **Commit:** 13f00f7

**3. [Rule 1 - Bug] Duplicate field/type names in `clients` Prisma model**
- **Found during:** Task 2 (`npx prisma validate`)
- **Issue:** `contactPerson contactPerson people @relation(...)` — field name repeated as type name, invalid Prisma syntax
- **Fix:** Removed duplicate qualifier: `contactPerson people @relation(...)` and `contactMethod contactMethods? @relation(...)`
- **Files modified:** `prisma/schema.prisma`
- **Commit:** ea3098d

### Schema Count Discrepancy (Plan vs. Implementation)

The plan says "21 tables" in `must_haves`, `verification`, and `success_criteria`, but:
- The DDL section in the plan's `<action>` block contains 22 `CREATE TABLE` statements
- The `integration_contracts.provides[0].exports` lists 22 model names

Our implementation follows the provided DDL faithfully (22 tables). The "21" in the plan is an off-by-one error (likely written before `version` table was added). All 22 tables from the DDL are implemented.

### Pre-existing `prisma/schema.prisma`

The `prisma/schema.prisma` file was pre-committed in commit `3c0bae1` (wave-1-database-02, Rule 3 prereq fix) before this plan was executed. Our generated file is byte-identical. Task 2 committed `prisma/schema.sql` (the only remaining untracked file).

---

## Notes for Wave 2+ Executors

1. **PrismaModule is @Global()** — Import `PrismaService` directly in any module's constructor via DI. Do NOT import `PrismaModule` again; it's already global via `AppModule`.

2. **PostGIS queries** — `geoclusters.center` is `Unsupported("geometry(Point, 4326)")`. Use `prisma.$queryRaw` with `ST_*` functions for all spatial operations. Prisma's type-safe query builder cannot handle this column.

3. **Circular FK** — `departments.defaultPerson_id → people.id` is `DEFERRABLE INITIALLY DEFERRED` in the SQL DDL. When inserting departments and people in the same transaction, defer constraint checking: `SET CONSTRAINTS FK_departments_defaultPerson_id DEFERRED`.

4. **Timestamp semantics** — `enteredDate` and `actionDate` are `TIMESTAMP WITHOUT TIME ZONE` (`@db.Timestamp()`). All reads/writes should assume UTC (legacy MySQL DATETIME semantics per TechArch §3.3). Other date fields (`lastModified`, `closedDate`, `uploaded`) are `TIMESTAMPTZ` (Prisma default `DateTime`).

5. **Environment** — Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, OIDC credentials, SMTP, and Graylog settings before running Wave 2+ features.

6. **Running the app** — `npm run start:dev` for development. The app binds to `0.0.0.0:${PORT}` (default 3000).

---

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | `13f00f7` | feat(wave-1-database-01): initialize NestJS project scaffold |
| Task 2 | `ea3098d` | feat(wave-1-database-01): write verbatim PostgreSQL DDL for all 22 tables |
| Summary | (this commit) | docs(wave-1-database-01): complete plan 01 SUMMARY |

---

## Self-Check: PASSED

- [x] `package.json` exists
- [x] `tsconfig.json` exists with `"strict": true`
- [x] `src/main.ts` exists
- [x] `src/app.module.ts` exists
- [x] `src/prisma/prisma.service.ts` exists
- [x] `src/prisma/prisma.module.ts` exists
- [x] `prisma/schema.prisma` exists (22 models)
- [x] `prisma/schema.sql` exists (22 CREATE TABLE statements)
- [x] `npx tsc --noEmit` exits 0
- [x] `npx prisma validate` passes
- [x] PostGIS Unsupported type present
- [x] DEFERRABLE circular FK present in SQL
- [x] @db.Timestamp() present for no-tz columns
