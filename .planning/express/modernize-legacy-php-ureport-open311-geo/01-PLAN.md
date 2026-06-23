---
phase: wave-1-database
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - tsconfig.json
  - nest-cli.json
  - src/app.module.ts
  - src/main.ts
  - prisma/schema.prisma
  - prisma/schema.sql
autonomous: true

features:
  implements: ["F6"]
  depends_on: []
  enables: ["F0", "F1", "F2", "F3", "F4", "F5", "F7", "F8", "F9", "F10", "F11", "F12", "F13", "F14", "F15"]

must_haves:
  truths:
    - "NestJS project compiles with zero TypeScript errors under strict mode"
    - "`npx prisma validate` exits 0 on the generated schema"
    - "All 21 tables are modeled in schema.prisma with exact column names from TechArch DDL"
    - "PostGIS geometry(Point,4326) column is represented as Unsupported type in Prisma schema"
    - "All FK relations use @relation() annotations matching the DDL constraints"
    - "Circular FK (departments.defaultPerson_id → people.id) is marked DEFERRABLE in the SQL DDL file"
    - "prisma/schema.sql contains the verbatim DDL for all 21 tables plus the PostGIS extension"
  artifacts:
    - path: "package.json"
      provides: "NestJS + Prisma + all Wave-1 dependencies declared"
    - path: "tsconfig.json"
      provides: "TypeScript strict mode configuration"
    - path: "prisma/schema.prisma"
      provides: "21 Prisma models mapped to all PostgreSQL tables"
      contains: "model tickets"
    - path: "prisma/schema.sql"
      provides: "Verbatim PostgreSQL DDL for all 21 tables"
      contains: "CREATE TABLE"
    - path: "src/app.module.ts"
      provides: "Root NestJS module scaffold"
    - path: "src/main.ts"
      provides: "NestJS bootstrap entry point"
  key_links:
    - from: "prisma/schema.prisma"
      to: "prisma/schema.sql"
      via: "column names must match exactly"
      pattern: "@@map"
    - from: "src/app.module.ts"
      to: "prisma/schema.prisma"
      via: "PrismaService singleton import"
      pattern: "PrismaService"

integration_contracts:
  requires: []
  provides:
    - artifact: "prisma/schema.prisma"
      exports: ["version", "contactMethods", "substatus", "actions", "categoryGroups", "issueTypes", "departments", "people", "peopleEmails", "peoplePhones", "peopleAddresses", "clients", "categories", "category_action_responses", "department_actions", "department_categories", "tickets", "ticketHistory", "media", "bookmarks", "geoclusters", "ticket_geodata"]
      shape: |
        21 Prisma models, each with @@map("tableName") for quoted PG identifiers.
        geometry(Point, 4326) rendered as Unsupported("geometry(Point, 4326)").
        All FK relations declared with @relation().
      verify: "grep -c 'model ' prisma/schema.prisma | grep -qE '^21$' && echo CONTRACT_OK"
    - artifact: "package.json"
      exports: ["@nestjs/core", "@nestjs/common", "@prisma/client", "prisma"]
      shape: "NestJS 10.x, Prisma 5.x, TypeScript 5.x strict"
      verify: "grep -q '\"@nestjs/core\"' package.json && grep -q '\"prisma\"' package.json && echo CONTRACT_OK"
    - artifact: "prisma/schema.sql"
      exports: ["PostgreSQL DDL for all 21 tables"]
      shape: "Verbatim DDL from TechArch §3.2, including PostGIS extension, all CHECK constraints, all indexes, DEFERRABLE circular FK"
      verify: "grep -c 'CREATE TABLE' prisma/schema.sql | grep -qE '^21$' && echo CONTRACT_OK"
---

<objective>
Initialize the NestJS/TypeScript project structure and produce the complete PostgreSQL schema for the uReport re-platform.

Purpose: This is the zero-dependency foundation. Every subsequent wave depends on the Prisma schema and NestJS project scaffold created here. No backend feature can be implemented until this plan is complete.

Output:
- A compiling NestJS project skeleton (`package.json`, `tsconfig.json`, `nest-cli.json`, `src/app.module.ts`, `src/main.ts`, `src/prisma/prisma.service.ts`)
- `prisma/schema.sql` — verbatim PostgreSQL DDL for all 21 tables (copied from TechArch §3.2)
- `prisma/schema.prisma` — Prisma schema with all 21 models, FK relations, and PostGIS Unsupported type
</objective>

<feature_dependencies>
Implements: F6: MySQL-to-PostgreSQL Schema Migration (Part A — project init, PostgreSQL DDL, Prisma schema)
Depends on: None
Enables: F0, F1, F2, F3, F4, F5, F7, F8, F9, F10, F11, F12, F13, F14, F15 (all features depend on the schema)
</feature_dependencies>

<execution_context>
@.planning/express/modernize-legacy-php-ureport-open311-geo/WAVE-SCHEDULE.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@project_specs/TechArch-uReport.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Initialize NestJS project scaffold</name>
  <files>
    package.json
    tsconfig.json
    tsconfig.build.json
    nest-cli.json
    .env.example
    src/app.module.ts
    src/main.ts
    src/prisma/prisma.service.ts
    src/prisma/prisma.module.ts
  </files>
  <action>
Initialize a new NestJS project in the repository root (do NOT use `nest new` interactively — create all files manually). The project root already has a `crm/` directory containing the legacy PHP app; the Node.js project lives at the repo root alongside it.

**package.json** — create with all required dependencies:

```json
{
  "name": "ureport",
  "version": "1.0.0",
  "description": "uReport — Open311 GeoReport v2 constituent-request CRM (Node.js re-platform)",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "node dist/main",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "prisma:generate": "prisma generate",
    "prisma:migrate:dev": "prisma migrate dev",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/schedule": "^4.0.0",
    "@prisma/client": "^5.0.0",
    "casl": "^6.0.0",
    "@casl/ability": "^6.0.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.0",
    "connect-redis": "^7.0.0",
    "express-session": "^1.17.3",
    "gelf-pro": "^1.0.0",
    "ioredis": "^5.0.0",
    "multer": "^1.4.5-lts.1",
    "nodemailer": "^6.9.0",
    "openid-client": "^5.6.0",
    "reflect-metadata": "^0.1.14",
    "rxjs": "^7.8.0",
    "sharp": "^0.33.0",
    "solr-client": "^1.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/connect-redis": "^0.0.23",
    "@types/express": "^4.17.21",
    "@types/express-session": "^1.17.10",
    "@types/jest": "^29.5.0",
    "@types/multer": "^1.4.11",
    "@types/nodemailer": "^6.4.14",
    "@types/node": "^20.0.0",
    "@types/uuid": "^9.0.7",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.42.0",
    "jest": "^29.5.0",
    "prisma": "^5.0.0",
    "source-map-support": "^0.5.21",
    "ts-jest": "^29.1.0",
    "ts-loader": "^9.4.3",
    "ts-node": "^10.9.1",
    "typescript": "^5.1.3"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

**tsconfig.json** — TypeScript strict mode (per NFR-4 in PRD: `strict: true`, zero `any` in production):

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**tsconfig.build.json**:
```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

**nest-cli.json**:
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

**.env.example** — document all environment variables from TechArch §1.3:
```
DATABASE_URL=postgresql://user:pass@localhost:5432/ureport
REDIS_URL=redis://localhost:6379
SESSION_SECRET=change-me-in-production
SESSION_TTL_SECONDS=3600
OIDC_ISSUER=https://idp.example.com
OIDC_CLIENT_ID=ureport
OIDC_CLIENT_SECRET=secret
OIDC_REDIRECT_URI=http://localhost:3000/auth/callback
OIDC_END_SESSION_ENDPOINT=
SOLR_HOST=localhost
SOLR_PORT=8983
SOLR_CORE=uReport
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_SECURE=false
SMTP_FROM=noreply@example.com
GRAYLOG_HOST=localhost
GRAYLOG_PORT=12201
GRAYLOG_TRANSPORT=udp
GRAYLOG_FACILITY=uReport
MEDIA_STORAGE_PATH=/var/uReport/media
MEDIA_MAX_BYTES=10485760
DIGEST_CRON=0 6 * * *
PORT=3000
```

**src/main.ts** — NestJS bootstrap with express-session and Redis wired in:
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe — whitelist: true per TechArch §5.5
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Open311 compat: jurisdiction_id, device_id accepted
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
bootstrap();
```

**src/app.module.ts** — root module scaffold (modules will be imported as each wave is built):
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    // Feature modules imported here as they are built in subsequent waves
  ],
})
export class AppModule {}
```

**src/prisma/prisma.service.ts** — global PrismaClient singleton (from TechArch §1.4):
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**src/prisma/prisma.module.ts** — global module so PrismaService is available everywhere:
```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```
  </action>
  <verify>
```bash
npm install 2>&1 | tail -5
npx tsc --noEmit 2>&1 | head -30 && echo "TSC OK"
```
  </verify>
  <done>
- `npm install` exits 0
- `npx tsc --noEmit` exits 0 with zero errors
- All listed files exist with the correct content
- `.env.example` lists every variable from TechArch §1.3
  </done>
</task>

<task type="auto">
  <name>Task 2: Write verbatim PostgreSQL DDL and generate Prisma schema</name>
  <files>
    prisma/schema.sql
    prisma/schema.prisma
  </files>
  <action>
Create two files.

---

### prisma/schema.sql

Copy the **exact** DDL from TechArch §3.2 verbatim — do NOT abstract, reorder, or paraphrase. This file is the source-of-truth for DBA review and the baseline for `prisma migrate`:

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- Reference / Lookup Tables
-- ============================================================

CREATE TABLE "version" (
    version VARCHAR(8) NOT NULL PRIMARY KEY
);
INSERT INTO "version" (version) VALUES ('2.1');

CREATE TABLE "contactMethods" (
    id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(128) NOT NULL
);
INSERT INTO "contactMethods" (name) VALUES ('Email'),('Phone'),('Web Form'),('Other');

CREATE TABLE "substatus" (
    id          INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(25)  NOT NULL,
    description VARCHAR(128) NOT NULL,
    status      TEXT         NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'closed')),
    "isDefault" BOOLEAN      NOT NULL DEFAULT FALSE
);
INSERT INTO "substatus" (status, name, description) VALUES
    ('closed', 'Resolved',  'This ticket has been taken care of'),
    ('closed', 'Duplicate', 'This ticket is a duplicate of another ticket'),
    ('closed', 'Bogus',     'This ticket is not actually a problem or has already been taken care of');

CREATE TABLE "actions" (
    id           INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name         VARCHAR(25)  NOT NULL,
    description  VARCHAR(128) NOT NULL,
    type         TEXT         NOT NULL DEFAULT 'department'
                 CHECK (type IN ('system', 'department')),
    template     TEXT,
    "replyEmail" VARCHAR(128)
);
INSERT INTO "actions" (name, type, description) VALUES
    ('open',           'system', 'Opened by {actionPerson}'),
    ('assignment',     'system', '{enteredByPerson} assigned this case to {actionPerson}'),
    ('closed',         'system', 'Closed by {actionPerson}'),
    ('changeCategory', 'system', 'Changed category from {original:category_id} to {updated:category_id}'),
    ('changeLocation', 'system', 'Changed location from {original:location} to {updated:location}'),
    ('response',       'system', '{actionPerson} contacted {reportedByPerson_id}'),
    ('duplicate',      'system', '{duplicate:ticket_id} marked as a duplicate of this case.'),
    ('update',         'system', '{enteredByPerson} updated this case.'),
    ('comment',        'system', '{enteredByPerson} commented on this case.'),
    ('upload_media',   'system', '{enteredByPerson} uploaded an attachment.');

CREATE TABLE "categoryGroups" (
    id       INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name     VARCHAR(50) NOT NULL,
    ordering SMALLINT
);
INSERT INTO "categoryGroups" (name) VALUES ('Streets'),('Sanitation'),('Other');

CREATE TABLE "issueTypes" (
    id   INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(128) NOT NULL
);
INSERT INTO "issueTypes" (name) VALUES
    ('Comment'),('Complaint'),('Question'),('Report'),('Request'),('Violation');

-- ============================================================
-- Core Person / Department Tables
-- ============================================================

CREATE TABLE "departments" (
    id                 INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name               VARCHAR(128) NOT NULL,
    "defaultPerson_id" INTEGER
    -- FK to people added below after people is created (circular ref)
);

CREATE TABLE "people" (
    id            INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    firstname     VARCHAR(128),
    middlename    VARCHAR(128),
    lastname      VARCHAR(128),
    organization  VARCHAR(128),
    address       VARCHAR(128),
    city          VARCHAR(128),
    state         VARCHAR(128),
    zip           VARCHAR(20),
    department_id INTEGER,
    username      VARCHAR(40)  UNIQUE,
    role          VARCHAR(30),
    CONSTRAINT FK_people_department_id
        FOREIGN KEY (department_id) REFERENCES "departments"(id)
);

-- Resolve circular FK
ALTER TABLE "departments"
    ADD CONSTRAINT FK_departments_defaultPerson_id
        FOREIGN KEY ("defaultPerson_id") REFERENCES "people"(id)
        DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX idx_people_username      ON "people"(username);
CREATE INDEX idx_people_department_id ON "people"(department_id);

CREATE TABLE "peopleEmails" (
    id                     INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id              INTEGER      NOT NULL,
    email                  VARCHAR(255) NOT NULL,
    label                  TEXT         NOT NULL DEFAULT 'Other'
                           CHECK (label IN ('Home', 'Work', 'Other')),
    "usedForNotifications" BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT FK_peopleEmails_person_id
        FOREIGN KEY (person_id) REFERENCES "people"(id)
);
CREATE INDEX idx_peopleEmails_person_id ON "peopleEmails"(person_id);
CREATE INDEX idx_peopleEmails_email     ON "peopleEmails"(email);

CREATE TABLE "peoplePhones" (
    id        INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id INTEGER     NOT NULL,
    number    VARCHAR(20),
    label     TEXT        NOT NULL DEFAULT 'Other'
              CHECK (label IN ('Main', 'Mobile', 'Work', 'Home', 'Fax', 'Pager', 'Other')),
    CONSTRAINT FK_peoplePhones_person_id
        FOREIGN KEY (person_id) REFERENCES "people"(id)
);
CREATE INDEX idx_peoplePhones_person_id ON "peoplePhones"(person_id);

CREATE TABLE "peopleAddresses" (
    id        INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id INTEGER      NOT NULL,
    address   VARCHAR(128) NOT NULL,
    city      VARCHAR(128),
    state     VARCHAR(128),
    zip       VARCHAR(20),
    label     TEXT         NOT NULL DEFAULT 'Home'
              CHECK (label IN ('Home', 'Business', 'Rental')),
    CONSTRAINT FK_peopleAddresses_person_id
        FOREIGN KEY (person_id) REFERENCES "people"(id)
);
CREATE INDEX idx_peopleAddresses_person_id ON "peopleAddresses"(person_id);

CREATE TABLE "clients" (
    id                 INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name               VARCHAR(128) NOT NULL,
    url                VARCHAR(255),
    api_key            VARCHAR(50)  NOT NULL UNIQUE,
    "contactPerson_id" INTEGER      NOT NULL,
    "contactMethod_id" INTEGER,
    CONSTRAINT FK_clients_contactPerson_id
        FOREIGN KEY ("contactPerson_id") REFERENCES "people"(id),
    CONSTRAINT FK_clients_contactMethod_id
        FOREIGN KEY ("contactMethod_id") REFERENCES "contactMethods"(id)
);
CREATE INDEX idx_clients_api_key ON "clients"(api_key);

-- ============================================================
-- Category Tables
-- ============================================================

CREATE TABLE "categories" (
    id                        INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                      VARCHAR(50)  NOT NULL,
    description               VARCHAR(512),
    department_id             INTEGER      NOT NULL,
    "defaultPerson_id"        INTEGER,
    "categoryGroup_id"        INTEGER,
    active                    BOOLEAN,
    featured                  BOOLEAN,
    "displayPermissionLevel"  TEXT         NOT NULL DEFAULT 'staff'
                              CHECK ("displayPermissionLevel" IN ('staff', 'public', 'anonymous')),
    "postingPermissionLevel"  TEXT         NOT NULL DEFAULT 'staff'
                              CHECK ("postingPermissionLevel" IN ('staff', 'public', 'anonymous')),
    "customFields"            TEXT,
    "lastModified"            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "slaDays"                 INTEGER,
    "notificationReplyEmail"  VARCHAR(128),
    "autoCloseIsActive"       BOOLEAN,
    "autoCloseSubstatus_id"   INTEGER,
    CONSTRAINT FK_categories_department_id
        FOREIGN KEY (department_id)     REFERENCES "departments"(id),
    CONSTRAINT FK_categories_defaultPerson_id
        FOREIGN KEY ("defaultPerson_id") REFERENCES "people"(id),
    CONSTRAINT FK_categories_categoryGroup_id
        FOREIGN KEY ("categoryGroup_id") REFERENCES "categoryGroups"(id)
);
CREATE INDEX idx_categories_department_id          ON "categories"(department_id);
CREATE INDEX idx_categories_categoryGroup_id       ON "categories"("categoryGroup_id");
CREATE INDEX idx_categories_displayPermissionLevel ON "categories"("displayPermissionLevel");
CREATE INDEX idx_categories_active                 ON "categories"(active);

CREATE TABLE "category_action_responses" (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id  INTEGER NOT NULL,
    action_id    INTEGER NOT NULL,
    template     TEXT,
    "replyEmail" VARCHAR(128),
    CONSTRAINT FK_category_action_responses_category_id
        FOREIGN KEY (category_id) REFERENCES "categories"(id),
    CONSTRAINT FK_category_action_responses_action_id
        FOREIGN KEY (action_id)   REFERENCES "actions"(id)
);
CREATE INDEX idx_car_category_id ON "category_action_responses"(category_id);
CREATE INDEX idx_car_action_id   ON "category_action_responses"(action_id);

CREATE TABLE "department_actions" (
    department_id INTEGER NOT NULL,
    action_id     INTEGER NOT NULL,
    PRIMARY KEY (department_id, action_id),
    CONSTRAINT FK_department_actions_department_id
        FOREIGN KEY (department_id) REFERENCES "departments"(id),
    CONSTRAINT FK_department_actions_action_id
        FOREIGN KEY (action_id)     REFERENCES "actions"(id)
);

CREATE TABLE "department_categories" (
    department_id INTEGER NOT NULL,
    category_id   INTEGER NOT NULL,
    PRIMARY KEY (department_id, category_id),
    CONSTRAINT FK_department_categories_department_id
        FOREIGN KEY (department_id) REFERENCES "departments"(id),
    CONSTRAINT FK_department_categories_category_id
        FOREIGN KEY (category_id)   REFERENCES "categories"(id)
);

-- ============================================================
-- Core Ticket Table
-- ============================================================

CREATE TABLE "tickets" (
    id                    INTEGER          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_id             INTEGER,
    category_id           INTEGER,
    "issueType_id"        INTEGER,
    client_id             INTEGER,
    "enteredByPerson_id"  INTEGER,
    "reportedByPerson_id" INTEGER,
    "assignedPerson_id"   INTEGER,
    "contactMethod_id"    INTEGER,
    "responseMethod_id"   INTEGER,
    "enteredDate"         TIMESTAMP        NOT NULL DEFAULT NOW(),
    "lastModified"        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    "addressId"           INTEGER,
    latitude              DOUBLE PRECISION,
    longitude             DOUBLE PRECISION,
    location              VARCHAR(128),
    city                  VARCHAR(128),
    state                 VARCHAR(128),
    zip                   VARCHAR(40),
    status                VARCHAR(20)      NOT NULL DEFAULT 'open',
    "closedDate"          TIMESTAMPTZ,
    substatus_id          INTEGER,
    "additionalFields"    VARCHAR(255),
    "customFields"        TEXT,
    description           TEXT,
    CONSTRAINT FK_tickets_parent_id
        FOREIGN KEY (parent_id)              REFERENCES "tickets"(id),
    CONSTRAINT FK_tickets_category_id
        FOREIGN KEY (category_id)            REFERENCES "categories"(id),
    CONSTRAINT FK_tickets_client_id
        FOREIGN KEY (client_id)              REFERENCES "clients"(id),
    CONSTRAINT FK_tickets_enteredByPerson_id
        FOREIGN KEY ("enteredByPerson_id")   REFERENCES "people"(id),
    CONSTRAINT FK_tickets_assignedPerson_id
        FOREIGN KEY ("assignedPerson_id")    REFERENCES "people"(id),
    CONSTRAINT FK_tickets_substatus_id
        FOREIGN KEY (substatus_id)           REFERENCES "substatus"(id)
);
CREATE INDEX idx_tickets_category_id          ON "tickets"(category_id);
CREATE INDEX idx_tickets_status               ON "tickets"(status);
CREATE INDEX idx_tickets_enteredDate          ON "tickets"("enteredDate");
CREATE INDEX idx_tickets_lastModified         ON "tickets"("lastModified");
CREATE INDEX idx_tickets_assignedPerson_id    ON "tickets"("assignedPerson_id");
CREATE INDEX idx_tickets_reportedByPerson_id  ON "tickets"("reportedByPerson_id");
CREATE INDEX idx_tickets_enteredByPerson_id   ON "tickets"("enteredByPerson_id");
CREATE INDEX idx_tickets_substatus_id         ON "tickets"(substatus_id);
CREATE INDEX idx_tickets_parent_id            ON "tickets"(parent_id);

-- ============================================================
-- Ticket History & Media
-- ============================================================

CREATE TABLE "ticketHistory" (
    id                    INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id             INTEGER     NOT NULL,
    "enteredByPerson_id"  INTEGER,
    "actionPerson_id"     INTEGER,
    action_id             INTEGER     NOT NULL,
    "enteredDate"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "actionDate"          TIMESTAMP   NOT NULL DEFAULT NOW(),
    notes                 TEXT,
    data                  TEXT,
    "sentNotifications"   TEXT,
    CONSTRAINT FK_ticketHistory_ticket_id
        FOREIGN KEY (ticket_id)             REFERENCES "tickets"(id),
    CONSTRAINT FK_ticketHistory_enteredByPerson_id
        FOREIGN KEY ("enteredByPerson_id")  REFERENCES "people"(id),
    CONSTRAINT FK_ticketHistory_actionPerson_id
        FOREIGN KEY ("actionPerson_id")     REFERENCES "people"(id),
    CONSTRAINT FK_ticketHistory_action_id
        FOREIGN KEY (action_id)             REFERENCES "actions"(id)
);
CREATE INDEX idx_ticketHistory_ticket_id   ON "ticketHistory"(ticket_id);
CREATE INDEX idx_ticketHistory_action_id   ON "ticketHistory"(action_id);
CREATE INDEX idx_ticketHistory_enteredDate ON "ticketHistory"("enteredDate");

CREATE TABLE "media" (
    id                 INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id          INTEGER      NOT NULL,
    filename           VARCHAR(128) NOT NULL,
    "internalFilename" VARCHAR(50)  NOT NULL,
    mime_type          VARCHAR(128),
    uploaded           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    person_id          INTEGER,
    CONSTRAINT FK_media_ticket_id
        FOREIGN KEY (ticket_id) REFERENCES "tickets"(id),
    CONSTRAINT FK_media_person_id
        FOREIGN KEY (person_id) REFERENCES "people"(id)
);
CREATE INDEX idx_media_ticket_id ON "media"(ticket_id);

-- ============================================================
-- Bookmarks
-- ============================================================

CREATE TABLE "bookmarks" (
    id           INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id    INTEGER       NOT NULL,
    type         VARCHAR(128)  NOT NULL DEFAULT 'search',
    name         VARCHAR(128),
    "requestUri" VARCHAR(1024) NOT NULL,
    CONSTRAINT FK_bookmarks_person_id
        FOREIGN KEY (person_id) REFERENCES "people"(id)
);
CREATE INDEX idx_bookmarks_person_id ON "bookmarks"(person_id);

-- ============================================================
-- Geo-Clustering (PostGIS)
-- ============================================================

CREATE TABLE "geoclusters" (
    id     INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    level  SMALLINT NOT NULL,
    center geometry(Point, 4326) NOT NULL
);
CREATE INDEX idx_geoclusters_center ON "geoclusters" USING GIST(center);
CREATE INDEX idx_geoclusters_level  ON "geoclusters"(level);

CREATE TABLE "ticket_geodata" (
    ticket_id    INTEGER NOT NULL PRIMARY KEY,
    cluster_id_0 INTEGER,
    cluster_id_1 INTEGER,
    cluster_id_2 INTEGER,
    cluster_id_3 INTEGER,
    cluster_id_4 INTEGER,
    cluster_id_5 INTEGER,
    cluster_id_6 INTEGER,
    FOREIGN KEY (ticket_id)    REFERENCES "tickets"    (id),
    FOREIGN KEY (cluster_id_0) REFERENCES "geoclusters"(id),
    FOREIGN KEY (cluster_id_1) REFERENCES "geoclusters"(id),
    FOREIGN KEY (cluster_id_2) REFERENCES "geoclusters"(id),
    FOREIGN KEY (cluster_id_3) REFERENCES "geoclusters"(id),
    FOREIGN KEY (cluster_id_4) REFERENCES "geoclusters"(id),
    FOREIGN KEY (cluster_id_5) REFERENCES "geoclusters"(id),
    FOREIGN KEY (cluster_id_6) REFERENCES "geoclusters"(id)
);
```

---

### prisma/schema.prisma

Generate the Prisma schema from the DDL above, following TechArch §3.4 conventions exactly:
- Model names match table names
- Field names use the exact PostgreSQL column names (camelCase preserved via `@map` where needed)
- `@@map("tableName")` on each model with quoted PG identifiers
- `Unsupported("geometry(Point, 4326)")` for the PostGIS geometry column
- All FK relations with `@relation()` annotations
- `TIMESTAMP` → `DateTime @db.Timestamp()` (no-tz, for enteredDate/actionDate — legacy MySQL DATETIME semantics per TechArch §3.3)
- `TIMESTAMPTZ` → `DateTime` (default Prisma DateTime is timezone-aware)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model version {
  version String @id @db.VarChar(8)

  @@map("version")
}

model contactMethods {
  id   Int    @id @default(autoincrement())
  name String @db.VarChar(128)

  clients clients[]

  @@map("contactMethods")
}

model substatus {
  id          Int     @id @default(autoincrement())
  name        String  @db.VarChar(25)
  description String  @db.VarChar(128)
  status      String  @default("open")
  isDefault   Boolean @default(false) @map("isDefault")

  tickets tickets[]

  @@map("substatus")
}

model actions {
  id          Int    @id @default(autoincrement())
  name        String @db.VarChar(25)
  description String @db.VarChar(128)
  type        String @default("department")
  template    String?
  replyEmail  String? @map("replyEmail") @db.VarChar(128)

  ticketHistory            ticketHistory[]
  category_action_responses category_action_responses[]
  department_actions       department_actions[]

  @@map("actions")
}

model categoryGroups {
  id       Int      @id @default(autoincrement())
  name     String   @db.VarChar(50)
  ordering Int?     @db.SmallInt

  categories categories[]

  @@map("categoryGroups")
}

model issueTypes {
  id   Int    @id @default(autoincrement())
  name String @db.VarChar(128)

  tickets tickets[]

  @@map("issueTypes")
}

model departments {
  id              Int     @id @default(autoincrement())
  name            String  @db.VarChar(128)
  defaultPerson_id Int?   @map("defaultPerson_id")

  defaultPerson  people?  @relation("DepartmentDefaultPerson", fields: [defaultPerson_id], references: [id])
  people         people[] @relation("PersonDepartment")
  categories     categories[]
  department_actions   department_actions[]
  department_categories department_categories[]

  @@map("departments")
}

model people {
  id           Int     @id @default(autoincrement())
  firstname    String? @db.VarChar(128)
  middlename   String? @db.VarChar(128)
  lastname     String? @db.VarChar(128)
  organization String? @db.VarChar(128)
  address      String? @db.VarChar(128)
  city         String? @db.VarChar(128)
  state        String? @db.VarChar(128)
  zip          String? @db.VarChar(20)
  department_id Int?
  username     String? @unique @db.VarChar(40)
  role         String? @db.VarChar(30)

  department             departments? @relation("PersonDepartment", fields: [department_id], references: [id])
  defaultForDepartments  departments[] @relation("DepartmentDefaultPerson")
  peopleEmails           peopleEmails[]
  peoplePhones           peoplePhones[]
  peopleAddresses        peopleAddresses[]
  clients                clients[]
  categories             categories[] @relation("CategoryDefaultPerson")
  ticketsEnteredBy       tickets[] @relation("TicketEnteredBy")
  ticketsAssignedTo      tickets[] @relation("TicketAssignedTo")
  ticketHistoryEnteredBy ticketHistory[] @relation("TicketHistoryEnteredBy")
  ticketHistoryActionOn  ticketHistory[] @relation("TicketHistoryActionPerson")
  media                  media[]
  bookmarks              bookmarks[]

  @@map("people")
}

model peopleEmails {
  id                   Int     @id @default(autoincrement())
  person_id            Int
  email                String  @db.VarChar(255)
  label                String  @default("Other")
  usedForNotifications Boolean @default(false) @map("usedForNotifications")

  person people @relation(fields: [person_id], references: [id])

  @@map("peopleEmails")
}

model peoplePhones {
  id        Int     @id @default(autoincrement())
  person_id Int
  number    String? @db.VarChar(20)
  label     String  @default("Other")

  person people @relation(fields: [person_id], references: [id])

  @@map("peoplePhones")
}

model peopleAddresses {
  id        Int     @id @default(autoincrement())
  person_id Int
  address   String  @db.VarChar(128)
  city      String? @db.VarChar(128)
  state     String? @db.VarChar(128)
  zip       String? @db.VarChar(20)
  label     String  @default("Home")

  person people @relation(fields: [person_id], references: [id])

  @@map("peopleAddresses")
}

model clients {
  id              Int     @id @default(autoincrement())
  name            String  @db.VarChar(128)
  url             String? @db.VarChar(255)
  api_key         String  @unique @db.VarChar(50)
  contactPerson_id Int    @map("contactPerson_id")
  contactMethod_id Int?   @map("contactMethod_id")

  contactPerson  people         @relation(fields: [contactPerson_id], references: [id])
  contactMethod  contactMethods? @relation(fields: [contactMethod_id], references: [id])
  tickets        tickets[]

  @@map("clients")
}

model categories {
  id                       Int      @id @default(autoincrement())
  name                     String   @db.VarChar(50)
  description              String?  @db.VarChar(512)
  department_id            Int
  defaultPerson_id         Int?     @map("defaultPerson_id")
  categoryGroup_id         Int?     @map("categoryGroup_id")
  active                   Boolean?
  featured                 Boolean?
  displayPermissionLevel   String   @default("staff") @map("displayPermissionLevel")
  postingPermissionLevel   String   @default("staff") @map("postingPermissionLevel")
  customFields             String?  @map("customFields")
  lastModified             DateTime @default(now()) @map("lastModified")
  slaDays                  Int?     @map("slaDays")
  notificationReplyEmail   String?  @map("notificationReplyEmail") @db.VarChar(128)
  autoCloseIsActive        Boolean? @map("autoCloseIsActive")
  autoCloseSubstatus_id    Int?     @map("autoCloseSubstatus_id")

  department               departments @relation(fields: [department_id], references: [id])
  defaultPerson            people?     @relation("CategoryDefaultPerson", fields: [defaultPerson_id], references: [id])
  categoryGroup            categoryGroups? @relation(fields: [categoryGroup_id], references: [id])
  tickets                  tickets[]
  category_action_responses category_action_responses[]
  department_categories    department_categories[]

  @@map("categories")
}

model category_action_responses {
  id          Int     @id @default(autoincrement())
  category_id Int
  action_id   Int
  template    String?
  replyEmail  String? @map("replyEmail") @db.VarChar(128)

  category categories @relation(fields: [category_id], references: [id])
  action   actions    @relation(fields: [action_id], references: [id])

  @@map("category_action_responses")
}

model department_actions {
  department_id Int
  action_id     Int

  department departments @relation(fields: [department_id], references: [id])
  action     actions     @relation(fields: [action_id], references: [id])

  @@id([department_id, action_id])
  @@map("department_actions")
}

model department_categories {
  department_id Int
  category_id   Int

  department departments @relation(fields: [department_id], references: [id])
  category   categories  @relation(fields: [category_id], references: [id])

  @@id([department_id, category_id])
  @@map("department_categories")
}

model tickets {
  id                   Int       @id @default(autoincrement())
  parent_id            Int?
  category_id          Int?
  issueType_id         Int?      @map("issueType_id")
  client_id            Int?
  enteredByPerson_id   Int?      @map("enteredByPerson_id")
  reportedByPerson_id  Int?      @map("reportedByPerson_id")
  assignedPerson_id    Int?      @map("assignedPerson_id")
  contactMethod_id     Int?      @map("contactMethod_id")
  responseMethod_id    Int?      @map("responseMethod_id")
  enteredDate          DateTime  @default(now()) @map("enteredDate") @db.Timestamp()
  lastModified         DateTime  @default(now()) @map("lastModified")
  addressId            Int?      @map("addressId")
  latitude             Float?
  longitude            Float?
  location             String?   @db.VarChar(128)
  city                 String?   @db.VarChar(128)
  state                String?   @db.VarChar(128)
  zip                  String?   @db.VarChar(40)
  status               String    @default("open") @db.VarChar(20)
  closedDate           DateTime? @map("closedDate")
  substatus_id         Int?
  additionalFields     String?   @map("additionalFields") @db.VarChar(255)
  customFields         String?   @map("customFields")
  description          String?

  parent               tickets?  @relation("TicketDuplicates", fields: [parent_id], references: [id])
  children             tickets[] @relation("TicketDuplicates")
  category             categories? @relation(fields: [category_id], references: [id])
  issueType            issueTypes? @relation(fields: [issueType_id], references: [id])
  client               clients?    @relation(fields: [client_id], references: [id])
  enteredByPerson      people?     @relation("TicketEnteredBy", fields: [enteredByPerson_id], references: [id])
  assignedPerson       people?     @relation("TicketAssignedTo", fields: [assignedPerson_id], references: [id])
  substatus            substatus?  @relation(fields: [substatus_id], references: [id])
  ticketHistory        ticketHistory[]
  media                media[]
  ticket_geodata       ticket_geodata?

  @@map("tickets")
}

model ticketHistory {
  id                  Int      @id @default(autoincrement())
  ticket_id           Int
  enteredByPerson_id  Int?     @map("enteredByPerson_id")
  actionPerson_id     Int?     @map("actionPerson_id")
  action_id           Int
  enteredDate         DateTime @default(now()) @map("enteredDate")
  actionDate          DateTime @default(now()) @map("actionDate") @db.Timestamp()
  notes               String?
  data                String?
  sentNotifications   String?  @map("sentNotifications")

  ticket          tickets @relation(fields: [ticket_id], references: [id])
  enteredByPerson people? @relation("TicketHistoryEnteredBy", fields: [enteredByPerson_id], references: [id])
  actionPerson    people? @relation("TicketHistoryActionPerson", fields: [actionPerson_id], references: [id])
  action          actions @relation(fields: [action_id], references: [id])

  @@map("ticketHistory")
}

model media {
  id               Int      @id @default(autoincrement())
  ticket_id        Int
  filename         String   @db.VarChar(128)
  internalFilename String   @map("internalFilename") @db.VarChar(50)
  mime_type        String?  @db.VarChar(128)
  uploaded         DateTime @default(now())
  person_id        Int?

  ticket tickets @relation(fields: [ticket_id], references: [id])
  person people? @relation(fields: [person_id], references: [id])

  @@map("media")
}

model bookmarks {
  id         Int     @id @default(autoincrement())
  person_id  Int
  type       String  @default("search") @db.VarChar(128)
  name       String? @db.VarChar(128)
  requestUri String  @map("requestUri") @db.VarChar(1024)

  person people @relation(fields: [person_id], references: [id])

  @@map("bookmarks")
}

model geoclusters {
  id     Int                                @id @default(autoincrement())
  level  Int                                @db.SmallInt
  center Unsupported("geometry(Point, 4326)")

  ticket_geodata_0 ticket_geodata[] @relation("GeoCluster0")
  ticket_geodata_1 ticket_geodata[] @relation("GeoCluster1")
  ticket_geodata_2 ticket_geodata[] @relation("GeoCluster2")
  ticket_geodata_3 ticket_geodata[] @relation("GeoCluster3")
  ticket_geodata_4 ticket_geodata[] @relation("GeoCluster4")
  ticket_geodata_5 ticket_geodata[] @relation("GeoCluster5")
  ticket_geodata_6 ticket_geodata[] @relation("GeoCluster6")

  @@map("geoclusters")
}

model ticket_geodata {
  ticket_id    Int  @id
  cluster_id_0 Int?
  cluster_id_1 Int?
  cluster_id_2 Int?
  cluster_id_3 Int?
  cluster_id_4 Int?
  cluster_id_5 Int?
  cluster_id_6 Int?

  ticket    tickets      @relation(fields: [ticket_id], references: [id])
  cluster_0 geoclusters? @relation("GeoCluster0", fields: [cluster_id_0], references: [id])
  cluster_1 geoclusters? @relation("GeoCluster1", fields: [cluster_id_1], references: [id])
  cluster_2 geoclusters? @relation("GeoCluster2", fields: [cluster_id_2], references: [id])
  cluster_3 geoclusters? @relation("GeoCluster3", fields: [cluster_id_3], references: [id])
  cluster_4 geoclusters? @relation("GeoCluster4", fields: [cluster_id_4], references: [id])
  cluster_5 geoclusters? @relation("GeoCluster5", fields: [cluster_id_5], references: [id])
  cluster_6 geoclusters? @relation("GeoCluster6", fields: [cluster_id_6], references: [id])

  @@map("ticket_geodata")
}
```

**DDL design notes applied (from TechArch §3.3):**
- `GENERATED ALWAYS AS IDENTITY` → `@default(autoincrement())` (Prisma generates SERIAL; for exact IDENTITY semantics, the `prisma/schema.sql` file is the authoritative DDL applied directly in Plan 02's migration script)
- `TIMESTAMP` (no-tz) for `enteredDate`/`actionDate` → `@db.Timestamp()`
- `TIMESTAMPTZ` for `lastModified`, `closedDate`, `uploaded` → default `DateTime` (Prisma maps to timestamptz)
- `geometry(Point, 4326)` → `Unsupported("geometry(Point, 4326)")` per TechArch §3.4; spatial queries use `$queryRaw`
- Circular FK `departments.defaultPerson_id → people.id` is in `schema.sql` with `DEFERRABLE INITIALLY DEFERRED`; Prisma handles it via named `@relation` without the DEFERRABLE hint (that constraint is enforced at the DB level via the SQL file)
  </action>
  <verify>
```bash
npx prisma validate 2>&1 && echo "PRISMA VALID"
grep -c 'model ' prisma/schema.prisma
grep -c 'CREATE TABLE' prisma/schema.sql
```
  </verify>
  <done>
- `npx prisma validate` exits 0 with no errors
- `grep -c 'model ' prisma/schema.prisma` outputs `21`
- `grep -c 'CREATE TABLE' prisma/schema.sql` outputs `21`
- `prisma/schema.sql` contains verbatim DDL from TechArch §3.2 including PostGIS extension, all CHECK constraints, all indexes, and the DEFERRABLE circular FK on `departments.defaultPerson_id`
- `geoclusters.center` is typed `Unsupported("geometry(Point, 4326)")` in the Prisma schema
- `enteredDate` and `actionDate` fields use `@db.Timestamp()` (no-tz) per TechArch §3.3
  </done>
</task>

</tasks>

<verification>
After both tasks complete, run:

```bash
# TypeScript compilation
npx tsc --noEmit 2>&1 | head -20 && echo "TSC OK"

# Prisma schema validation
npx prisma validate 2>&1 && echo "PRISMA VALID"

# Model count
grep -c 'model ' prisma/schema.prisma

# Table count in DDL
grep -c 'CREATE TABLE' prisma/schema.sql

# Key structural checks
grep -q 'Unsupported("geometry(Point, 4326)")' prisma/schema.prisma && echo "POSTGIS OK"
grep -q 'DEFERRABLE INITIALLY DEFERRED' prisma/schema.sql && echo "CIRCULAR FK OK"
grep -q '@db.Timestamp()' prisma/schema.prisma && echo "TIMESTAMP TZ OK"
grep -q 'strict.*true' tsconfig.json && echo "STRICT MODE OK"
```

Expected: TSC exits 0, Prisma validates, 21 models, 21 tables, all structural checks pass.
</verification>

<success_criteria>
- NestJS project scaffold compiles under TypeScript strict mode with zero errors
- `prisma/schema.prisma` has exactly 21 models, all with `@@map()`, all FK relations declared
- `prisma/schema.sql` contains verbatim DDL from TechArch §3.2 — all 21 tables, PostGIS extension, all CHECK constraints, all indexes
- `geoclusters.center` uses `Unsupported("geometry(Point, 4326)")` in Prisma
- `departments.defaultPerson_id → people.id` FK is `DEFERRABLE INITIALLY DEFERRED` in the SQL file
- `enteredDate`/`actionDate` columns use `@db.Timestamp()` (no timezone); `lastModified`/`closedDate`/`uploaded` use default `DateTime` (timestamptz)
- `PrismaModule` is `@Global()` and exported so all Wave 2+ modules can inject `PrismaService` without re-importing
</success_criteria>

<output>
After completion, create `.planning/express/modernize-legacy-php-ureport-open311-geo/01-SUMMARY.md` with:
- Files created and their purpose
- Any deviations from the plan (with rationale)
- Prisma validate output
- tsc --noEmit output
- Model count confirmation
- Notes for Wave 2 executors (e.g., PrismaModule is global; import `PrismaService` directly)
</output>
