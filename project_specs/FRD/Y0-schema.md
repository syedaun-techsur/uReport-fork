---

## Y0: Database Schema — PostgreSQL DDL

Full PostgreSQL DDL for all 21 uReport tables, translated from `crm/scripts/mysql.sql`.

```sql
-- Enable PostGIS extension (required for geoclusters.center)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- Reference / Lookup Tables (no foreign key dependencies)
-- ============================================================

CREATE TABLE "version" (
    version VARCHAR(8) NOT NULL PRIMARY KEY
);
INSERT INTO "version" (version) VALUES ('2.1');

CREATE TABLE "contactMethods" (
    id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(128) NOT NULL
);
-- Seed data
INSERT INTO "contactMethods" (name) VALUES ('Email');
INSERT INTO "contactMethods" (name) VALUES ('Phone');
INSERT INTO "contactMethods" (name) VALUES ('Web Form');
INSERT INTO "contactMethods" (name) VALUES ('Other');

CREATE TABLE "substatus" (
    id          INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(25)  NOT NULL,
    description VARCHAR(128) NOT NULL,
    status      TEXT         NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'closed')),
    "isDefault" BOOLEAN      NOT NULL DEFAULT FALSE
);
-- Seed data
INSERT INTO "substatus" (status, name, description) VALUES
    ('closed', 'Resolved',  'This ticket has been taken care of'),
    ('closed', 'Duplicate', 'This ticket is a duplicate of another ticket'),
    ('closed', 'Bogus',     'This ticket is not actually a problem or has already been taken care of');

CREATE TABLE "actions" (
    id          INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(25)  NOT NULL,
    description VARCHAR(128) NOT NULL,
    type        TEXT         NOT NULL DEFAULT 'department'
                CHECK (type IN ('system', 'department')),
    template    TEXT,
    "replyEmail" VARCHAR(128)
);
-- Seed data
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
    id       INTEGER   GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name     VARCHAR(50) NOT NULL,
    ordering SMALLINT
);
-- Seed data
INSERT INTO "categoryGroups" (name) VALUES ('Streets'), ('Sanitation'), ('Other');

CREATE TABLE "issueTypes" (
    id   INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(128) NOT NULL
);
-- Seed data
INSERT INTO "issueTypes" (name) VALUES
    ('Comment'), ('Complaint'), ('Question'), ('Report'), ('Request'), ('Violation');

-- ============================================================
-- Core Person / Department Tables
-- ============================================================

CREATE TABLE "departments" (
    id                INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name              VARCHAR(128) NOT NULL,
    "defaultPerson_id" INTEGER
    -- FK to people added below (circular ref resolved with DEFERRABLE)
);

CREATE TABLE "people" (
    id           INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    firstname    VARCHAR(128),
    middlename   VARCHAR(128),
    lastname     VARCHAR(128),
    organization VARCHAR(128),
    address      VARCHAR(128),
    city         VARCHAR(128),
    state        VARCHAR(128),
    zip          VARCHAR(20),
    department_id INTEGER,
    username     VARCHAR(40)  UNIQUE,
    role         VARCHAR(30),
    CONSTRAINT FK_people_department_id
        FOREIGN KEY (department_id) REFERENCES "departments"(id)
);

-- Add the circular FK now that people exists
ALTER TABLE "departments"
    ADD CONSTRAINT FK_departments_defaultPerson_id
        FOREIGN KEY ("defaultPerson_id") REFERENCES "people"(id)
        DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE "peopleEmails" (
    id                   INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id            INTEGER      NOT NULL,
    email                VARCHAR(255) NOT NULL,
    label                TEXT         NOT NULL DEFAULT 'Other'
                         CHECK (label IN ('Home', 'Work', 'Other')),
    "usedForNotifications" BOOLEAN    NOT NULL DEFAULT FALSE,
    CONSTRAINT FK_peopleEmails_person_id
        FOREIGN KEY (person_id) REFERENCES "people"(id)
);

CREATE TABLE "peoplePhones" (
    id        INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id INTEGER     NOT NULL,
    number    VARCHAR(20),
    label     TEXT        NOT NULL DEFAULT 'Other'
              CHECK (label IN ('Main', 'Mobile', 'Work', 'Home', 'Fax', 'Pager', 'Other')),
    CONSTRAINT FK_peoplePhones_person_id
        FOREIGN KEY (person_id) REFERENCES "people"(id)
);

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

CREATE TABLE "clients" (
    id                INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name              VARCHAR(128) NOT NULL,
    url               VARCHAR(255),
    api_key           VARCHAR(50)  NOT NULL UNIQUE,
    "contactPerson_id" INTEGER     NOT NULL,
    "contactMethod_id" INTEGER,
    CONSTRAINT FK_clients_contactPerson_id
        FOREIGN KEY ("contactPerson_id") REFERENCES "people"(id),
    CONSTRAINT FK_clients_contactMethod_id
        FOREIGN KEY ("contactMethod_id") REFERENCES "contactMethods"(id)
);

-- ============================================================
-- Category Tables
-- ============================================================

CREATE TABLE "categories" (
    id                       INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                     VARCHAR(50)  NOT NULL,
    description              VARCHAR(512),
    department_id            INTEGER      NOT NULL,
    "defaultPerson_id"       INTEGER,
    "categoryGroup_id"       INTEGER,
    active                   BOOLEAN,
    featured                 BOOLEAN,
    "displayPermissionLevel" TEXT         NOT NULL DEFAULT 'staff'
                             CHECK ("displayPermissionLevel" IN ('staff', 'public', 'anonymous')),
    "postingPermissionLevel" TEXT         NOT NULL DEFAULT 'staff'
                             CHECK ("postingPermissionLevel" IN ('staff', 'public', 'anonymous')),
    "customFields"           TEXT,
    "lastModified"           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "slaDays"                INTEGER,
    "notificationReplyEmail" VARCHAR(128),
    "autoCloseIsActive"      BOOLEAN,
    "autoCloseSubstatus_id"  INTEGER,
    CONSTRAINT FK_categories_department_id
        FOREIGN KEY (department_id)    REFERENCES "departments"(id),
    CONSTRAINT FK_categories_defaultPerson_id
        FOREIGN KEY ("defaultPerson_id") REFERENCES "people"(id),
    CONSTRAINT FK_categories_categoryGroup_id
        FOREIGN KEY ("categoryGroup_id") REFERENCES "categoryGroups"(id)
);

CREATE TABLE "category_action_responses" (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id INTEGER NOT NULL,
    action_id   INTEGER NOT NULL,
    template    TEXT,
    "replyEmail" VARCHAR(128),
    CONSTRAINT FK_category_action_responses_category_id
        FOREIGN KEY (category_id) REFERENCES "categories"(id),
    CONSTRAINT FK_category_action_responses_action_id
        FOREIGN KEY (action_id)   REFERENCES "actions"(id)
);

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
        FOREIGN KEY (parent_id)             REFERENCES "tickets"(id),
    CONSTRAINT FK_tickets_category_id
        FOREIGN KEY (category_id)           REFERENCES "categories"(id),
    CONSTRAINT FK_tickets_client_id
        FOREIGN KEY (client_id)             REFERENCES "clients"(id),
    CONSTRAINT FK_tickets_enteredByPerson_id
        FOREIGN KEY ("enteredByPerson_id")  REFERENCES "people"(id),
    CONSTRAINT FK_tickets_assignedPerson_id
        FOREIGN KEY ("assignedPerson_id")   REFERENCES "people"(id),
    CONSTRAINT FK_tickets_substatus_id
        FOREIGN KEY (substatus_id)          REFERENCES "substatus"(id)
);

-- ============================================================
-- Ticket History & Media
-- ============================================================

CREATE TABLE "ticketHistory" (
    id                    INTEGER    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id             INTEGER    NOT NULL,
    "enteredByPerson_id"  INTEGER,
    "actionPerson_id"     INTEGER,
    action_id             INTEGER    NOT NULL,
    "enteredDate"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "actionDate"          TIMESTAMP   NOT NULL DEFAULT NOW(),
    notes                 TEXT,
    data                  TEXT,
    "sentNotifications"   TEXT,
    CONSTRAINT FK_ticketHistory_ticket_id
        FOREIGN KEY (ticket_id)            REFERENCES "tickets"(id),
    CONSTRAINT FK_ticketHistory_enteredByPerson_id
        FOREIGN KEY ("enteredByPerson_id") REFERENCES "people"(id),
    CONSTRAINT FK_ticketHistory_actionPerson_id
        FOREIGN KEY ("actionPerson_id")    REFERENCES "people"(id),
    CONSTRAINT FK_ticketHistory_action_id
        FOREIGN KEY (action_id)            REFERENCES "actions"(id)
);

CREATE TABLE "media" (
    id               INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id        INTEGER      NOT NULL,
    filename         VARCHAR(128) NOT NULL,
    "internalFilename" VARCHAR(50) NOT NULL,
    mime_type        VARCHAR(128),
    uploaded         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    person_id        INTEGER,
    CONSTRAINT FK_media_ticket_id
        FOREIGN KEY (ticket_id) REFERENCES "tickets"(id),
    CONSTRAINT FK_media_person_id
        FOREIGN KEY (person_id) REFERENCES "people"(id)
);

-- ============================================================
-- Bookmarks
-- ============================================================

CREATE TABLE "bookmarks" (
    id          INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id   INTEGER       NOT NULL,
    type        VARCHAR(128)  NOT NULL DEFAULT 'search',
    name        VARCHAR(128),
    "requestUri" VARCHAR(1024) NOT NULL,
    CONSTRAINT FK_bookmarks_person_id
        FOREIGN KEY (person_id) REFERENCES "people"(id)
);

-- ============================================================
-- Geo-Clustering
-- ============================================================

CREATE TABLE "geoclusters" (
    id    INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    level SMALLINT NOT NULL,
    center geometry(Point, 4326) NOT NULL
);

CREATE INDEX idx_geoclusters_center ON "geoclusters" USING GIST(center);

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

### Schema Notes

1. **IDENTITY vs SERIAL:** All auto-increment PKs use `GENERATED ALWAYS AS IDENTITY` (SQL standard; preferred over `SERIAL` in PostgreSQL 10+).
2. **Unsigned integers:** PostgreSQL has no unsigned integer type. `INT UNSIGNED` in MySQL is mapped to `INTEGER`. Application code must enforce positive values.
3. **Circular FK (departments ↔ people):** The `departments.defaultPerson_id → people.id` FK is added with `DEFERRABLE INITIALLY DEFERRED` to allow inserting both tables before the FK is checked.
4. **ENUM → TEXT + CHECK:** All MySQL `ENUM` columns are translated to `TEXT` with `CHECK` constraints for easier future extension.
5. **Spatial:** `geoclusters.center` uses PostGIS `geometry(Point, 4326)` with a GiST index. `tickets.latitude` and `tickets.longitude` remain as `DOUBLE PRECISION` scalars.
6. **Timestamps:** `TIMESTAMP` (no timezone) used where MySQL used `DATETIME`; `TIMESTAMPTZ` used where MySQL used `TIMESTAMP` (which is timezone-aware in MySQL behavior).
7. **Backtick identifiers:** MySQL backticks replaced with PostgreSQL double-quoted identifiers for reserved words or camelCase names.
