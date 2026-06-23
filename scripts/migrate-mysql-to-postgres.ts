#!/usr/bin/env ts-node
/**
 * MySQL → PostgreSQL ETL migration script
 *
 * Reads all 21 tables from the MySQL source and inserts them into the
 * PostgreSQL target using Prisma, in FK-safe dependency order, with all
 * required type conversions.
 *
 * Environment variables:
 *   MYSQL_HOST      MySQL hostname (default: 127.0.0.1)
 *   MYSQL_PORT      MySQL port    (default: 3306)
 *   MYSQL_USER      MySQL user
 *   MYSQL_PASSWORD  MySQL password
 *   MYSQL_DATABASE  MySQL database name
 *   DATABASE_URL    PostgreSQL connection string (Prisma format)
 *
 * Usage:
 *   npx ts-node scripts/migrate-mysql-to-postgres.ts
 */

import * as mysql from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types for MySQL rows (all fields come back as JS primitives / Date / null)
// ---------------------------------------------------------------------------

interface MysqlVersionRow {
  version: string;
}

interface MysqlContactMethodRow {
  id: number;
  name: string;
}

interface MysqlSubstatusRow {
  id: number;
  name: string;
  description: string;
  status: string;
  isDefault: number | boolean;
}

interface MysqlActionRow {
  id: number;
  name: string;
  description: string;
  type: string;
  template: string | null;
  replyEmail: string | null;
}

interface MysqlCategoryGroupRow {
  id: number;
  name: string;
  ordering: number | null;
}

interface MysqlIssueTypeRow {
  id: number;
  name: string;
}

interface MysqlDepartmentRow {
  id: number;
  name: string;
  defaultPerson_id: number | null;
}

interface MysqlPersonRow {
  id: number;
  firstname: string | null;
  middlename: string | null;
  lastname: string | null;
  organization: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  department_id: number | null;
  username: string | null;
  role: string | null;
}

interface MysqlPeopleEmailRow {
  id: number;
  person_id: number;
  email: string;
  label: string;
  usedForNotifications: number | boolean;
}

interface MysqlPeoplePhoneRow {
  id: number;
  person_id: number;
  number: string | null;
  label: string;
}

interface MysqlPeopleAddressRow {
  id: number;
  person_id: number;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  label: string;
}

interface MysqlClientRow {
  id: number;
  name: string;
  url: string | null;
  api_key: string;
  contactPerson_id: number;
  contactMethod_id: number | null;
}

interface MysqlCategoryRow {
  id: number;
  name: string;
  description: string | null;
  department_id: number;
  defaultPerson_id: number | null;
  categoryGroup_id: number | null;
  active: number | boolean | null;
  featured: number | boolean | null;
  displayPermissionLevel: string;
  postingPermissionLevel: string;
  customFields: string | null;
  lastModified: Date;
  slaDays: number | null;
  notificationReplyEmail: string | null;
  autoCloseIsActive: number | boolean | null;
  autoCloseSubstatus_id: number | null;
}

interface MysqlCategoryActionResponseRow {
  id: number;
  category_id: number;
  action_id: number;
  template: string | null;
  replyEmail: string | null;
}

interface MysqlDepartmentActionRow {
  department_id: number;
  action_id: number;
}

interface MysqlDepartmentCategoryRow {
  department_id: number;
  category_id: number;
}

interface MysqlTicketRow {
  id: number;
  parent_id: number | null;
  category_id: number | null;
  issueType_id: number | null;
  client_id: number | null;
  enteredByPerson_id: number | null;
  reportedByPerson_id: number | null;
  assignedPerson_id: number | null;
  contactMethod_id: number | null;
  responseMethod_id: number | null;
  enteredDate: Date;
  lastModified: Date;
  addressId: number | null;
  latitude: number | null;
  longitude: number | null;
  location: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: string;
  closedDate: Date | null;
  substatus_id: number | null;
  additionalFields: string | null;
  customFields: string | null;
  description: string | null;
}

interface MysqlTicketHistoryRow {
  id: number;
  ticket_id: number;
  enteredByPerson_id: number | null;
  actionPerson_id: number | null;
  action_id: number;
  enteredDate: Date;
  actionDate: Date;
  notes: string | null;
  data: string | null;
  sentNotifications: string | null;
}

interface MysqlMediaRow {
  id: number;
  ticket_id: number;
  filename: string;
  internalFilename: string;
  mime_type: string | null;
  uploaded: Date;
  person_id: number | null;
}

interface MysqlBookmarkRow {
  id: number;
  person_id: number;
  type: string;
  name: string | null;
  requestUri: string;
}

interface MysqlGeoclusterRow {
  id: number;
  level: number;
  lon: number;
  lat: number;
}

interface MysqlTicketGeodataRow {
  ticket_id: number;
  cluster_id_0: number | null;
  cluster_id_1: number | null;
  cluster_id_2: number | null;
  cluster_id_3: number | null;
  cluster_id_4: number | null;
  cluster_id_5: number | null;
  cluster_id_6: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BATCH_SIZE = 500;

/**
 * Coerce MySQL TINYINT(1) / bool to a JS boolean.
 * MySQL returns 0 or 1 (or sometimes Buffer) for TINYINT(1) columns.
 */
function toBool(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  return !!val;
}

/**
 * Coerce MySQL TINYINT(1) / bool to a nullable JS boolean.
 */
function toNullableBool(val: unknown): boolean | null {
  if (val === null || val === undefined) return null;
  return !!val;
}

async function queryAll<T>(conn: mysql.Connection, sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await conn.query(sql, params);
  return rows as T[];
}

async function countRows(conn: mysql.Connection, table: string): Promise<number> {
  const [rows] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${table}\``);
  return (rows as Array<{ cnt: number }>)[0].cnt;
}

async function processBatches<T>(
  table: string,
  rows: T[],
  handler: (batch: T[]) => Promise<void>,
): Promise<void> {
  const total = rows.length;
  console.log(`[${table}] starting migration — ${total} rows`);
  for (let offset = 0; offset < total; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    await handler(batch);
    console.log(`[${table}] inserted ${Math.min(offset + batch.length, total)} / ${total}`);
  }
}

// ---------------------------------------------------------------------------
// IDENTITY sequence reset
// ---------------------------------------------------------------------------

/** Tables with id GENERATED ALWAYS AS IDENTITY (ticket_geodata and join tables excluded) */
const IDENTITY_TABLES = [
  'contactMethods',
  'substatus',
  'actions',
  'categoryGroups',
  'issueTypes',
  'departments',
  'people',
  'peopleEmails',
  'peoplePhones',
  'peopleAddresses',
  'clients',
  'categories',
  'category_action_responses',
  'tickets',
  'ticketHistory',
  'media',
  'bookmarks',
  'geoclusters',
] as const;

async function resetSequences(prisma: PrismaClient): Promise<void> {
  console.log('\n[sequences] resetting IDENTITY sequences…');
  for (const table of IDENTITY_TABLES) {
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('"${table}"', 'id'),
        COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1,
        false
      )
    `);
    console.log(`[sequences] reset "${table}"`);
  }
}

// ---------------------------------------------------------------------------
// Per-table migrators
// ---------------------------------------------------------------------------

async function migrateVersion(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const rows = await queryAll<MysqlVersionRow>(conn, 'SELECT version FROM version');
  for (const row of rows) {
    await prisma.$executeRaw`
      INSERT INTO "version" (version) VALUES (${row.version})
      ON CONFLICT DO NOTHING
    `;
  }
  console.log(`[version] migrated ${rows.length} rows`);
}

async function migrateContactMethods(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const rows = await queryAll<MysqlContactMethodRow>(conn, 'SELECT id, name FROM contactMethods ORDER BY id');
  await processBatches('contactMethods', rows, async (batch) => {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "contactMethods" OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.name})
        ON CONFLICT (id) DO NOTHING
      `;
    }
  });
}

async function migrateSubstatus(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const rows = await queryAll<MysqlSubstatusRow>(
    conn,
    'SELECT id, name, description, status, isDefault FROM substatus ORDER BY id',
  );
  await processBatches('substatus', rows, async (batch) => {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "substatus" OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.name}, ${row.description}, ${row.status}, ${!!row.isDefault})
        ON CONFLICT (id) DO NOTHING
      `;
    }
  });
}

async function migrateActions(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const rows = await queryAll<MysqlActionRow>(
    conn,
    'SELECT id, name, description, type, template, replyEmail FROM actions ORDER BY id',
  );
  await processBatches('actions', rows, async (batch) => {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "actions" (id, name, description, type, template, "replyEmail")
        OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.name}, ${row.description}, ${row.type}, ${row.template}, ${row.replyEmail})
        ON CONFLICT (id) DO NOTHING
      `;
    }
  });
}

async function migrateCategoryGroups(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const rows = await queryAll<MysqlCategoryGroupRow>(
    conn,
    'SELECT id, name, ordering FROM categoryGroups ORDER BY id',
  );
  await processBatches('categoryGroups', rows, async (batch) => {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "categoryGroups" OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.name}, ${row.ordering ?? null})
        ON CONFLICT (id) DO NOTHING
      `;
    }
  });
}

async function migrateIssueTypes(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const rows = await queryAll<MysqlIssueTypeRow>(conn, 'SELECT id, name FROM issueTypes ORDER BY id');
  await processBatches('issueTypes', rows, async (batch) => {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "issueTypes" OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.name})
        ON CONFLICT (id) DO NOTHING
      `;
    }
  });
}

async function migrateDepartments(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  // Insert departments without defaultPerson_id (circular FK resolved later)
  const rows = await queryAll<MysqlDepartmentRow>(
    conn,
    'SELECT id, name, defaultPerson_id FROM departments ORDER BY id',
  );
  await processBatches('departments', rows, async (batch) => {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "departments" (id, name, "defaultPerson_id")
        OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.name}, NULL)
        ON CONFLICT (id) DO NOTHING
      `;
    }
  });
  // Store mapping for later patch
  return;
}

async function migratePeople(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const rows = await queryAll<MysqlPersonRow>(
    conn,
    `SELECT id, firstname, middlename, lastname, organization, address, city, state, zip,
            department_id, username, role
     FROM people ORDER BY id`,
  );
  await processBatches('people', rows, async (batch) => {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "people"
          (id, firstname, middlename, lastname, organization, address, city, state, zip,
           department_id, username, role)
        OVERRIDING SYSTEM VALUE
        VALUES (
          ${row.id}, ${row.firstname}, ${row.middlename}, ${row.lastname}, ${row.organization},
          ${row.address}, ${row.city}, ${row.state}, ${row.zip},
          ${row.department_id}, ${row.username}, ${row.role}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
  });
}

async function patchDepartmentsDefaultPerson(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  // Now that people are inserted, set defaultPerson_id on departments
  const rows = await queryAll<MysqlDepartmentRow>(
    conn,
    'SELECT id, defaultPerson_id FROM departments WHERE defaultPerson_id IS NOT NULL',
  );
  console.log(`[departments] patching defaultPerson_id — ${rows.length} departments have a default person`);
  for (const row of rows) {
    await prisma.$executeRaw`
      UPDATE "departments" SET "defaultPerson_id" = ${row.defaultPerson_id} WHERE id = ${row.id}
    `;
  }
}

async function migratePeopleEmails(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const rows = await queryAll<MysqlPeopleEmailRow>(
    conn,
    'SELECT id, person_id, email, label, usedForNotifications FROM peopleEmails ORDER BY id',
  );
  await processBatches('peopleEmails', rows, async (batch) => {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "peopleEmails" (id, person_id, email, label, "usedForNotifications")
        OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.person_id}, ${row.email}, ${row.label}, ${!!row.usedForNotifications})
        ON CONFLICT (id) DO NOTHING
      `;
    }
  });
}

async function migratePeoplePhones(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const rows = await queryAll<MysqlPeoplePhoneRow>(
    conn,
    'SELECT id, person_id, number, label FROM peoplePhones ORDER BY id',
  );
  await processBatches('peoplePhones', rows, async (batch) => {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "peoplePhones" (id, person_id, number, label)
        OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.person_id}, ${row.number}, ${row.label})
        ON CONFLICT (id) DO NOTHING
      `;
    }
  });
}

async function migratePeopleAddresses(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const rows = await queryAll<MysqlPeopleAddressRow>(
    conn,
    'SELECT id, person_id, address, city, state, zip, label FROM peopleAddresses ORDER BY id',
  );
  await processBatches('peopleAddresses', rows, async (batch) => {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "peopleAddresses" (id, person_id, address, city, state, zip, label)
        OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.person_id}, ${row.address}, ${row.city}, ${row.state}, ${row.zip}, ${row.label})
        ON CONFLICT (id) DO NOTHING
      `;
    }
  });
}

async function migrateClients(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const rows = await queryAll<MysqlClientRow>(
    conn,
    'SELECT id, name, url, api_key, contactPerson_id, contactMethod_id FROM clients ORDER BY id',
  );
  await processBatches('clients', rows, async (batch) => {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "clients" (id, name, url, api_key, "contactPerson_id", "contactMethod_id")
        OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.name}, ${row.url}, ${row.api_key}, ${row.contactPerson_id}, ${row.contactMethod_id})
        ON CONFLICT (id) DO NOTHING
      `;
    }
  });
}

async function migrateCategories(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const rows = await queryAll<MysqlCategoryRow>(
    conn,
    `SELECT id, name, description, department_id, defaultPerson_id, categoryGroup_id,
            active, featured, displayPermissionLevel, postingPermissionLevel,
            customFields, lastModified, slaDays, notificationReplyEmail,
            autoCloseIsActive, autoCloseSubstatus_id
     FROM categories ORDER BY id`,
  );
  await processBatches('categories', rows, async (batch) => {
    for (const row of batch) {
      // lastModified is a MySQL TIMESTAMP → TIMESTAMPTZ
      await prisma.$executeRaw`
        INSERT INTO "categories"
          (id, name, description, department_id, "defaultPerson_id", "categoryGroup_id",
           active, featured, "displayPermissionLevel", "postingPermissionLevel",
           "customFields", "lastModified", "slaDays", "notificationReplyEmail",
           "autoCloseIsActive", "autoCloseSubstatus_id")
        OVERRIDING SYSTEM VALUE
        VALUES (
          ${row.id}, ${row.name}, ${row.description}, ${row.department_id},
          ${row.defaultPerson_id}, ${row.categoryGroup_id},
          ${toNullableBool(row.active)}, ${toNullableBool(row.featured)},
          ${row.displayPermissionLevel}, ${row.postingPermissionLevel},
          ${row.customFields}, ${row.lastModified}::TIMESTAMPTZ,
          ${row.slaDays}, ${row.notificationReplyEmail},
          ${toNullableBool(row.autoCloseIsActive)}, ${row.autoCloseSubstatus_id}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
  });
}

async function migrateCategoryActionResponses(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const rows = await queryAll<MysqlCategoryActionResponseRow>(
    conn,
    'SELECT id, category_id, action_id, template, replyEmail FROM category_action_responses ORDER BY id',
  );
  await processBatches('category_action_responses', rows, async (batch) => {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "category_action_responses" (id, category_id, action_id, template, "replyEmail")
        OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.category_id}, ${row.action_id}, ${row.template}, ${row.replyEmail})
        ON CONFLICT (id) DO NOTHING
      `;
    }
  });
}

async function migrateDepartmentActions(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const rows = await queryAll<MysqlDepartmentActionRow>(
    conn,
    'SELECT department_id, action_id FROM department_actions ORDER BY department_id, action_id',
  );
  await processBatches('department_actions', rows, async (batch) => {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "department_actions" (department_id, action_id)
        VALUES (${row.department_id}, ${row.action_id})
        ON CONFLICT DO NOTHING
      `;
    }
  });
}

async function migrateDepartmentCategories(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const rows = await queryAll<MysqlDepartmentCategoryRow>(
    conn,
    'SELECT department_id, category_id FROM department_categories ORDER BY department_id, category_id',
  );
  await processBatches('department_categories', rows, async (batch) => {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "department_categories" (department_id, category_id)
        VALUES (${row.department_id}, ${row.category_id})
        ON CONFLICT DO NOTHING
      `;
    }
  });
}

async function migrateTickets(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const rows = await queryAll<MysqlTicketRow>(
    conn,
    `SELECT id, parent_id, category_id, issueType_id, client_id,
            enteredByPerson_id, reportedByPerson_id, assignedPerson_id,
            contactMethod_id, responseMethod_id,
            enteredDate, lastModified, addressId, latitude, longitude,
            location, city, state, zip, status, closedDate, substatus_id,
            additionalFields, customFields, description
     FROM tickets ORDER BY id`,
  );
  await processBatches('tickets', rows, async (batch) => {
    for (const row of batch) {
      // enteredDate: MySQL DATETIME → PG TIMESTAMP (no-tz); pass Date directly
      // lastModified: MySQL TIMESTAMP → PG TIMESTAMPTZ
      // closedDate: MySQL TIMESTAMP → PG TIMESTAMPTZ (nullable)
      await prisma.$executeRaw`
        INSERT INTO "tickets"
          (id, parent_id, category_id, "issueType_id", client_id,
           "enteredByPerson_id", "reportedByPerson_id", "assignedPerson_id",
           "contactMethod_id", "responseMethod_id",
           "enteredDate", "lastModified", "addressId", latitude, longitude,
           location, city, state, zip, status, "closedDate", substatus_id,
           "additionalFields", "customFields", description)
        OVERRIDING SYSTEM VALUE
        VALUES (
          ${row.id}, ${row.parent_id}, ${row.category_id}, ${row.issueType_id}, ${row.client_id},
          ${row.enteredByPerson_id}, ${row.reportedByPerson_id}, ${row.assignedPerson_id},
          ${row.contactMethod_id}, ${row.responseMethod_id},
          ${row.enteredDate}::TIMESTAMP, ${row.lastModified}::TIMESTAMPTZ,
          ${row.addressId}, ${row.latitude}, ${row.longitude},
          ${row.location}, ${row.city}, ${row.state}, ${row.zip}, ${row.status},
          ${row.closedDate !== null ? `${row.closedDate.toISOString()}` : null}::TIMESTAMPTZ,
          ${row.substatus_id}, ${row.additionalFields}, ${row.customFields}, ${row.description}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
  });
}

async function migrateTicketHistory(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const rows = await queryAll<MysqlTicketHistoryRow>(
    conn,
    `SELECT id, ticket_id, enteredByPerson_id, actionPerson_id, action_id,
            enteredDate, actionDate, notes, data, sentNotifications
     FROM ticketHistory ORDER BY id`,
  );
  await processBatches('ticketHistory', rows, async (batch) => {
    for (const row of batch) {
      // enteredDate: MySQL TIMESTAMP → PG TIMESTAMPTZ
      // actionDate: MySQL DATETIME → PG TIMESTAMP (no-tz)
      await prisma.$executeRaw`
        INSERT INTO "ticketHistory"
          (id, ticket_id, "enteredByPerson_id", "actionPerson_id", action_id,
           "enteredDate", "actionDate", notes, data, "sentNotifications")
        OVERRIDING SYSTEM VALUE
        VALUES (
          ${row.id}, ${row.ticket_id}, ${row.enteredByPerson_id}, ${row.actionPerson_id}, ${row.action_id},
          ${row.enteredDate}::TIMESTAMPTZ, ${row.actionDate}::TIMESTAMP,
          ${row.notes}, ${row.data}, ${row.sentNotifications}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
  });
}

async function migrateMedia(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const rows = await queryAll<MysqlMediaRow>(
    conn,
    'SELECT id, ticket_id, filename, internalFilename, mime_type, uploaded, person_id FROM media ORDER BY id',
  );
  await processBatches('media', rows, async (batch) => {
    for (const row of batch) {
      // uploaded: MySQL TIMESTAMP → PG TIMESTAMPTZ
      await prisma.$executeRaw`
        INSERT INTO "media" (id, ticket_id, filename, "internalFilename", mime_type, uploaded, person_id)
        OVERRIDING SYSTEM VALUE
        VALUES (
          ${row.id}, ${row.ticket_id}, ${row.filename}, ${row.internalFilename},
          ${row.mime_type}, ${row.uploaded}::TIMESTAMPTZ, ${row.person_id}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
  });
}

async function migrateBookmarks(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const rows = await queryAll<MysqlBookmarkRow>(
    conn,
    'SELECT id, person_id, `type`, name, requestUri FROM bookmarks ORDER BY id',
  );
  await processBatches('bookmarks', rows, async (batch) => {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "bookmarks" (id, person_id, type, name, "requestUri")
        OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.person_id}, ${row.type}, ${row.name}, ${row.requestUri})
        ON CONFLICT (id) DO NOTHING
      `;
    }
  });
}

async function migrateGeoclusters(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  // Use ST_X / ST_Y to extract lon/lat from MySQL POINT binary
  const rows = await queryAll<MysqlGeoclusterRow>(
    conn,
    'SELECT id, level, ST_X(center) AS lon, ST_Y(center) AS lat FROM geoclusters ORDER BY id',
  );
  await processBatches('geoclusters', rows, async (batch) => {
    for (const row of batch) {
      const wkt = `POINT(${row.lon} ${row.lat})`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "geoclusters" (id, level, center)
         OVERRIDING SYSTEM VALUE
         VALUES ($1, $2, ST_GeomFromText($3, 4326))
         ON CONFLICT (id) DO NOTHING`,
        row.id,
        row.level,
        wkt,
      );
    }
  });
}

async function migrateTicketGeodata(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const rows = await queryAll<MysqlTicketGeodataRow>(
    conn,
    `SELECT ticket_id,
            cluster_id_0, cluster_id_1, cluster_id_2, cluster_id_3,
            cluster_id_4, cluster_id_5, cluster_id_6
     FROM ticket_geodata ORDER BY ticket_id`,
  );
  await processBatches('ticket_geodata', rows, async (batch) => {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "ticket_geodata"
          (ticket_id, cluster_id_0, cluster_id_1, cluster_id_2, cluster_id_3,
           cluster_id_4, cluster_id_5, cluster_id_6)
        VALUES (
          ${row.ticket_id},
          ${row.cluster_id_0}, ${row.cluster_id_1}, ${row.cluster_id_2}, ${row.cluster_id_3},
          ${row.cluster_id_4}, ${row.cluster_id_5}, ${row.cluster_id_6}
        )
        ON CONFLICT (ticket_id) DO NOTHING
      `;
    }
  });
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

export async function migrateAll(
  mysqlConn: mysql.Connection,
  prisma: PrismaClient,
): Promise<void> {
  // Force UTC on MySQL session so TIMESTAMP columns are read without TZ drift
  await mysqlConn.query("SET time_zone = '+00:00'");
  console.log('[init] MySQL session time_zone set to UTC');

  const tables: Array<{ name: string; fn: () => Promise<void> }> = [
    { name: 'version',                   fn: () => migrateVersion(mysqlConn, prisma) },
    { name: 'contactMethods',            fn: () => migrateContactMethods(mysqlConn, prisma) },
    { name: 'substatus',                 fn: () => migrateSubstatus(mysqlConn, prisma) },
    { name: 'actions',                   fn: () => migrateActions(mysqlConn, prisma) },
    { name: 'categoryGroups',            fn: () => migrateCategoryGroups(mysqlConn, prisma) },
    { name: 'issueTypes',                fn: () => migrateIssueTypes(mysqlConn, prisma) },
    { name: 'departments (initial)',     fn: () => migrateDepartments(mysqlConn, prisma) },
    { name: 'people',                    fn: () => migratePeople(mysqlConn, prisma) },
    { name: 'departments (patch FK)',    fn: () => patchDepartmentsDefaultPerson(mysqlConn, prisma) },
    { name: 'peopleEmails',              fn: () => migratePeopleEmails(mysqlConn, prisma) },
    { name: 'peoplePhones',              fn: () => migratePeoplePhones(mysqlConn, prisma) },
    { name: 'peopleAddresses',           fn: () => migratePeopleAddresses(mysqlConn, prisma) },
    { name: 'clients',                   fn: () => migrateClients(mysqlConn, prisma) },
    { name: 'categories',                fn: () => migrateCategories(mysqlConn, prisma) },
    { name: 'category_action_responses', fn: () => migrateCategoryActionResponses(mysqlConn, prisma) },
    { name: 'department_actions',        fn: () => migrateDepartmentActions(mysqlConn, prisma) },
    { name: 'department_categories',     fn: () => migrateDepartmentCategories(mysqlConn, prisma) },
    { name: 'tickets',                   fn: () => migrateTickets(mysqlConn, prisma) },
    { name: 'ticketHistory',             fn: () => migrateTicketHistory(mysqlConn, prisma) },
    { name: 'media',                     fn: () => migrateMedia(mysqlConn, prisma) },
    { name: 'bookmarks',                 fn: () => migrateBookmarks(mysqlConn, prisma) },
    { name: 'geoclusters',               fn: () => migrateGeoclusters(mysqlConn, prisma) },
    { name: 'ticket_geodata',            fn: () => migrateTicketGeodata(mysqlConn, prisma) },
  ];

  for (const { name, fn } of tables) {
    try {
      await fn();
    } catch (err) {
      const error = err as Error & { meta?: { target?: string } };
      console.error(`\n[ERROR] Failed migrating table: ${name}`);
      console.error(`  Message: ${error.message}`);
      process.exit(1);
    }
  }

  await resetSequences(prisma);
  console.log('\n✅ Migration complete — all 21 tables migrated successfully.');
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const mysqlConn = await mysql.createConnection({
    host:     process.env.MYSQL_HOST     ?? '127.0.0.1',
    port:     parseInt(process.env.MYSQL_PORT ?? '3306', 10),
    user:     process.env.MYSQL_USER     ?? '',
    password: process.env.MYSQL_PASSWORD ?? '',
    database: process.env.MYSQL_DATABASE ?? '',
    // Return dates as JS Date objects (not strings)
    dateStrings: false,
  });

  const prisma = new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL },
    },
  });

  try {
    await migrateAll(mysqlConn, prisma);
  } finally {
    await mysqlConn.end();
    await prisma.$disconnect();
  }
}

// Run only when invoked directly (not when imported)
if (require.main === module) {
  main().catch((err: Error) => {
    console.error('[FATAL]', err.message);
    process.exit(1);
  });
}
