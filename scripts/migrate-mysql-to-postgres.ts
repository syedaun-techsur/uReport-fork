/**
 * scripts/migrate-mysql-to-postgres.ts
 *
 * Standalone ts-node script: migrates all 21 MySQL tables to PostgreSQL.
 *
 * Usage:
 *   MYSQL_HOST=... MYSQL_PORT=... MYSQL_USER=... MYSQL_PASSWORD=... MYSQL_DATABASE=... \
 *   DATABASE_URL=postgresql://... \
 *   npx ts-node scripts/migrate-mysql-to-postgres.ts
 *
 * Environment variables:
 *   MYSQL_HOST       MySQL hostname (default: 127.0.0.1)
 *   MYSQL_PORT       MySQL port (default: 3306)
 *   MYSQL_USER       MySQL username
 *   MYSQL_PASSWORD   MySQL password
 *   MYSQL_DATABASE   MySQL database name
 *   DATABASE_URL     PostgreSQL connection string (Prisma format)
 */

import * as mysql from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Type definitions for MySQL row shapes
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

async function fetchBatched<T>(
  conn: mysql.Connection,
  query: string,
  total: number,
  tableName: string,
): Promise<T[][]> {
  const batches: T[][] = [];
  let offset = 0;
  while (offset < total) {
    const [rows] = await conn.query<mysql.RowDataPacket[]>(`${query} LIMIT ${BATCH_SIZE} OFFSET ${offset}`);
    batches.push(rows as unknown as T[]);
    offset += rows.length;
    if (rows.length === 0) break;
    console.log(`[${tableName}] fetched ${Math.min(offset, total)} / ${total}`);
  }
  return batches;
}

async function getCount(conn: mysql.Connection, table: string): Promise<number> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(`SELECT COUNT(*) AS cnt FROM \`${table}\``);
  return (rows[0] as { cnt: number }).cnt;
}

// ---------------------------------------------------------------------------
// Table migration functions
// ---------------------------------------------------------------------------

async function migrateVersion(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>('SELECT * FROM `version`');
  for (const row of rows as unknown as MysqlVersionRow[]) {
    await prisma.$executeRaw`
      INSERT INTO "version" (version) VALUES (${row.version})
      ON CONFLICT DO NOTHING
    `;
  }
  console.log(`[version] migrated ${rows.length} rows`);
}

async function migrateContactMethods(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const total = await getCount(conn, 'contactMethods');
  const batches = await fetchBatched<MysqlContactMethodRow>(
    conn, 'SELECT id, name FROM `contactMethods` ORDER BY id', total, 'contactMethods'
  );
  let inserted = 0;
  for (const batch of batches) {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "contactMethods" OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.name})
      `;
      inserted++;
    }
    console.log(`[contactMethods] inserted ${inserted} / ${total}`);
  }
}

async function migrateSubstatus(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const total = await getCount(conn, 'substatus');
  const batches = await fetchBatched<MysqlSubstatusRow>(
    conn, 'SELECT id, name, description, status, isDefault FROM `substatus` ORDER BY id', total, 'substatus'
  );
  let inserted = 0;
  for (const batch of batches) {
    for (const row of batch) {
      const isDefault = !!row.isDefault;
      await prisma.$executeRaw`
        INSERT INTO "substatus" OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.name}, ${row.description}, ${row.status}, ${isDefault})
      `;
      inserted++;
    }
    console.log(`[substatus] inserted ${inserted} / ${total}`);
  }
}

async function migrateActions(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const total = await getCount(conn, 'actions');
  const batches = await fetchBatched<MysqlActionRow>(
    conn, 'SELECT id, name, description, type, template, replyEmail FROM `actions` ORDER BY id', total, 'actions'
  );
  let inserted = 0;
  for (const batch of batches) {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "actions" OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.name}, ${row.description}, ${row.type}, ${row.template}, ${row.replyEmail})
      `;
      inserted++;
    }
    console.log(`[actions] inserted ${inserted} / ${total}`);
  }
}

async function migrateCategoryGroups(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const total = await getCount(conn, 'categoryGroups');
  const batches = await fetchBatched<MysqlCategoryGroupRow>(
    conn, 'SELECT id, name, ordering FROM `categoryGroups` ORDER BY id', total, 'categoryGroups'
  );
  let inserted = 0;
  for (const batch of batches) {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "categoryGroups" OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.name}, ${row.ordering ?? null})
      `;
      inserted++;
    }
    console.log(`[categoryGroups] inserted ${inserted} / ${total}`);
  }
}

async function migrateIssueTypes(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const total = await getCount(conn, 'issueTypes');
  const batches = await fetchBatched<MysqlIssueTypeRow>(
    conn, 'SELECT id, name FROM `issueTypes` ORDER BY id', total, 'issueTypes'
  );
  let inserted = 0;
  for (const batch of batches) {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "issueTypes" OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.name})
      `;
      inserted++;
    }
    console.log(`[issueTypes] inserted ${inserted} / ${total}`);
  }
}

async function migrateDepartments(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  // Insert departments with defaultPerson_id = null (circular FK resolution)
  const total = await getCount(conn, 'departments');
  const batches = await fetchBatched<MysqlDepartmentRow>(
    conn, 'SELECT id, name, defaultPerson_id FROM `departments` ORDER BY id', total, 'departments'
  );
  let inserted = 0;
  for (const batch of batches) {
    for (const row of batch) {
      // Insert with null defaultPerson_id first; will be patched after people inserted
      await prisma.$executeRaw`
        INSERT INTO "departments" OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.name}, NULL)
      `;
      inserted++;
    }
    console.log(`[departments] inserted ${inserted} / ${total} (defaultPerson_id deferred)`);
  }
}

async function migratePeople(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const total = await getCount(conn, 'people');
  const batches = await fetchBatched<MysqlPersonRow>(
    conn,
    'SELECT id, firstname, middlename, lastname, organization, address, city, state, zip, department_id, username, role FROM `people` ORDER BY id',
    total,
    'people',
  );
  let inserted = 0;
  for (const batch of batches) {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "people" OVERRIDING SYSTEM VALUE
        VALUES (
          ${row.id},
          ${row.firstname ?? null},
          ${row.middlename ?? null},
          ${row.lastname ?? null},
          ${row.organization ?? null},
          ${row.address ?? null},
          ${row.city ?? null},
          ${row.state ?? null},
          ${row.zip ?? null},
          ${row.department_id ?? null},
          ${row.username ?? null},
          ${row.role ?? null}
        )
      `;
      inserted++;
    }
    console.log(`[people] inserted ${inserted} / ${total}`);
  }
}

async function patchDepartmentDefaultPerson(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  // Now that people are inserted, patch departments.defaultPerson_id
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    'SELECT id, defaultPerson_id FROM `departments` WHERE defaultPerson_id IS NOT NULL',
  );
  for (const row of rows as unknown as MysqlDepartmentRow[]) {
    await prisma.$executeRaw`
      UPDATE "departments" SET "defaultPerson_id" = ${row.defaultPerson_id} WHERE id = ${row.id}
    `;
  }
  console.log(`[departments] patched defaultPerson_id for ${rows.length} rows`);
}

async function migratePeopleEmails(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const total = await getCount(conn, 'peopleEmails');
  const batches = await fetchBatched<MysqlPeopleEmailRow>(
    conn,
    'SELECT id, person_id, email, label, usedForNotifications FROM `peopleEmails` ORDER BY id',
    total,
    'peopleEmails',
  );
  let inserted = 0;
  for (const batch of batches) {
    for (const row of batch) {
      const usedForNotifications = !!row.usedForNotifications;
      await prisma.$executeRaw`
        INSERT INTO "peopleEmails" OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.person_id}, ${row.email}, ${row.label}, ${usedForNotifications})
      `;
      inserted++;
    }
    console.log(`[peopleEmails] inserted ${inserted} / ${total}`);
  }
}

async function migratePeoplePhones(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const total = await getCount(conn, 'peoplePhones');
  const batches = await fetchBatched<MysqlPeoplePhoneRow>(
    conn,
    'SELECT id, person_id, number, label FROM `peoplePhones` ORDER BY id',
    total,
    'peoplePhones',
  );
  let inserted = 0;
  for (const batch of batches) {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "peoplePhones" OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.person_id}, ${row.number ?? null}, ${row.label})
      `;
      inserted++;
    }
    console.log(`[peoplePhones] inserted ${inserted} / ${total}`);
  }
}

async function migratePeopleAddresses(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const total = await getCount(conn, 'peopleAddresses');
  const batches = await fetchBatched<MysqlPeopleAddressRow>(
    conn,
    'SELECT id, person_id, address, city, state, zip, label FROM `peopleAddresses` ORDER BY id',
    total,
    'peopleAddresses',
  );
  let inserted = 0;
  for (const batch of batches) {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "peopleAddresses" OVERRIDING SYSTEM VALUE
        VALUES (
          ${row.id}, ${row.person_id}, ${row.address},
          ${row.city ?? null}, ${row.state ?? null}, ${row.zip ?? null}, ${row.label}
        )
      `;
      inserted++;
    }
    console.log(`[peopleAddresses] inserted ${inserted} / ${total}`);
  }
}

async function migrateClients(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const total = await getCount(conn, 'clients');
  const batches = await fetchBatched<MysqlClientRow>(
    conn,
    'SELECT id, name, url, api_key, contactPerson_id, contactMethod_id FROM `clients` ORDER BY id',
    total,
    'clients',
  );
  let inserted = 0;
  for (const batch of batches) {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "clients" OVERRIDING SYSTEM VALUE
        VALUES (
          ${row.id}, ${row.name}, ${row.url ?? null}, ${row.api_key},
          ${row.contactPerson_id}, ${row.contactMethod_id ?? null}
        )
      `;
      inserted++;
    }
    console.log(`[clients] inserted ${inserted} / ${total}`);
  }
}

async function migrateCategories(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const total = await getCount(conn, 'categories');
  const batches = await fetchBatched<MysqlCategoryRow>(
    conn,
    `SELECT id, name, description, department_id, defaultPerson_id, categoryGroup_id,
     active, featured, displayPermissionLevel, postingPermissionLevel, customFields,
     lastModified, slaDays, notificationReplyEmail, autoCloseIsActive, autoCloseSubstatus_id
     FROM \`categories\` ORDER BY id`,
    total,
    'categories',
  );
  let inserted = 0;
  for (const batch of batches) {
    for (const row of batch) {
      const active = row.active != null ? !!row.active : null;
      const featured = row.featured != null ? !!row.featured : null;
      const autoCloseIsActive = row.autoCloseIsActive != null ? !!row.autoCloseIsActive : null;
      // lastModified is a MySQL TIMESTAMP → TIMESTAMPTZ; already a JS Date from mysql2 (UTC via session)
      await prisma.$executeRaw`
        INSERT INTO "categories" OVERRIDING SYSTEM VALUE
        VALUES (
          ${row.id}, ${row.name}, ${row.description ?? null},
          ${row.department_id}, ${row.defaultPerson_id ?? null}, ${row.categoryGroup_id ?? null},
          ${active}, ${featured},
          ${row.displayPermissionLevel}, ${row.postingPermissionLevel},
          ${row.customFields ?? null}, ${row.lastModified},
          ${row.slaDays ?? null}, ${row.notificationReplyEmail ?? null},
          ${autoCloseIsActive}, ${row.autoCloseSubstatus_id ?? null}
        )
      `;
      inserted++;
    }
    console.log(`[categories] inserted ${inserted} / ${total}`);
  }
}

async function migrateCategoryActionResponses(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const total = await getCount(conn, 'category_action_responses');
  const batches = await fetchBatched<MysqlCategoryActionResponseRow>(
    conn,
    'SELECT id, category_id, action_id, template, replyEmail FROM `category_action_responses` ORDER BY id',
    total,
    'category_action_responses',
  );
  let inserted = 0;
  for (const batch of batches) {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "category_action_responses" OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.category_id}, ${row.action_id}, ${row.template ?? null}, ${row.replyEmail ?? null})
      `;
      inserted++;
    }
    console.log(`[category_action_responses] inserted ${inserted} / ${total}`);
  }
}

async function migrateDepartmentActions(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    'SELECT department_id, action_id FROM `department_actions`',
  );
  for (const row of rows as unknown as MysqlDepartmentActionRow[]) {
    await prisma.$executeRaw`
      INSERT INTO "department_actions" (department_id, action_id)
      VALUES (${row.department_id}, ${row.action_id})
      ON CONFLICT DO NOTHING
    `;
  }
  console.log(`[department_actions] migrated ${rows.length} rows`);
}

async function migrateDepartmentCategories(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    'SELECT department_id, category_id FROM `department_categories`',
  );
  for (const row of rows as unknown as MysqlDepartmentCategoryRow[]) {
    await prisma.$executeRaw`
      INSERT INTO "department_categories" (department_id, category_id)
      VALUES (${row.department_id}, ${row.category_id})
      ON CONFLICT DO NOTHING
    `;
  }
  console.log(`[department_categories] migrated ${rows.length} rows`);
}

async function migrateTickets(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const total = await getCount(conn, 'tickets');
  const batches = await fetchBatched<MysqlTicketRow>(
    conn,
    `SELECT id, parent_id, category_id, issueType_id, client_id,
     enteredByPerson_id, reportedByPerson_id, assignedPerson_id,
     contactMethod_id, responseMethod_id, enteredDate, lastModified,
     addressId, latitude, longitude, location, city, state, zip,
     status, closedDate, substatus_id, additionalFields, customFields, description
     FROM \`tickets\` ORDER BY id`,
    total,
    'tickets',
  );
  let inserted = 0;
  for (const batch of batches) {
    for (const row of batch) {
      // enteredDate: MySQL DATETIME → PostgreSQL TIMESTAMP (no-tz); pass as-is (JS Date)
      // lastModified: MySQL TIMESTAMP → TIMESTAMPTZ; UTC via SET time_zone = '+00:00'
      // closedDate: MySQL TIMESTAMP → TIMESTAMPTZ
      await prisma.$executeRaw`
        INSERT INTO "tickets" OVERRIDING SYSTEM VALUE
        VALUES (
          ${row.id}, ${row.parent_id ?? null}, ${row.category_id ?? null},
          ${row.issueType_id ?? null}, ${row.client_id ?? null},
          ${row.enteredByPerson_id ?? null}, ${row.reportedByPerson_id ?? null},
          ${row.assignedPerson_id ?? null}, ${row.contactMethod_id ?? null},
          ${row.responseMethod_id ?? null},
          ${row.enteredDate}, ${row.lastModified},
          ${row.addressId ?? null}, ${row.latitude ?? null}, ${row.longitude ?? null},
          ${row.location ?? null}, ${row.city ?? null}, ${row.state ?? null},
          ${row.zip ?? null}, ${row.status}, ${row.closedDate ?? null},
          ${row.substatus_id ?? null}, ${row.additionalFields ?? null},
          ${row.customFields ?? null}, ${row.description ?? null}
        )
      `;
      inserted++;
    }
    console.log(`[tickets] inserted ${inserted} / ${total}`);
  }
}

async function migrateTicketHistory(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const total = await getCount(conn, 'ticketHistory');
  const batches = await fetchBatched<MysqlTicketHistoryRow>(
    conn,
    `SELECT id, ticket_id, enteredByPerson_id, actionPerson_id, action_id,
     enteredDate, actionDate, notes, data, sentNotifications
     FROM \`ticketHistory\` ORDER BY id`,
    total,
    'ticketHistory',
  );
  let inserted = 0;
  for (const batch of batches) {
    for (const row of batch) {
      // enteredDate: MySQL TIMESTAMP → TIMESTAMPTZ
      // actionDate: MySQL DATETIME → TIMESTAMP (no-tz)
      await prisma.$executeRaw`
        INSERT INTO "ticketHistory" OVERRIDING SYSTEM VALUE
        VALUES (
          ${row.id}, ${row.ticket_id},
          ${row.enteredByPerson_id ?? null}, ${row.actionPerson_id ?? null},
          ${row.action_id}, ${row.enteredDate}, ${row.actionDate},
          ${row.notes ?? null}, ${row.data ?? null}, ${row.sentNotifications ?? null}
        )
      `;
      inserted++;
    }
    console.log(`[ticketHistory] inserted ${inserted} / ${total}`);
  }
}

async function migrateMedia(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const total = await getCount(conn, 'media');
  const batches = await fetchBatched<MysqlMediaRow>(
    conn,
    'SELECT id, ticket_id, filename, internalFilename, mime_type, uploaded, person_id FROM `media` ORDER BY id',
    total,
    'media',
  );
  let inserted = 0;
  for (const batch of batches) {
    for (const row of batch) {
      // uploaded: MySQL TIMESTAMP → TIMESTAMPTZ
      await prisma.$executeRaw`
        INSERT INTO "media" OVERRIDING SYSTEM VALUE
        VALUES (
          ${row.id}, ${row.ticket_id}, ${row.filename}, ${row.internalFilename},
          ${row.mime_type ?? null}, ${row.uploaded}, ${row.person_id ?? null}
        )
      `;
      inserted++;
    }
    console.log(`[media] inserted ${inserted} / ${total}`);
  }
}

async function migrateBookmarks(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const total = await getCount(conn, 'bookmarks');
  const batches = await fetchBatched<MysqlBookmarkRow>(
    conn,
    'SELECT id, person_id, `type`, name, requestUri FROM `bookmarks` ORDER BY id',
    total,
    'bookmarks',
  );
  let inserted = 0;
  for (const batch of batches) {
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO "bookmarks" OVERRIDING SYSTEM VALUE
        VALUES (${row.id}, ${row.person_id}, ${row.type}, ${row.name ?? null}, ${row.requestUri})
      `;
      inserted++;
    }
    console.log(`[bookmarks] inserted ${inserted} / ${total}`);
  }
}

async function migrateGeoclusters(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const total = await getCount(conn, 'geoclusters');
  const batches = await fetchBatched<MysqlGeoclusterRow>(
    conn,
    'SELECT id, level, ST_X(center) AS lon, ST_Y(center) AS lat FROM `geoclusters` ORDER BY id',
    total,
    'geoclusters',
  );
  let inserted = 0;
  for (const batch of batches) {
    for (const row of batch) {
      // Spatial migration: POINT → geometry(Point,4326) via ST_GeomFromText
      await prisma.$executeRaw`
        INSERT INTO "geoclusters" OVERRIDING SYSTEM VALUE
        VALUES (
          ${row.id}, ${row.level},
          ST_GeomFromText('POINT(' || ${String(row.lon)} || ' ' || ${String(row.lat)} || ')', 4326)
        )
      `;
      inserted++;
    }
    console.log(`[geoclusters] inserted ${inserted} / ${total}`);
  }
}

async function migrateTicketGeodata(conn: mysql.Connection, prisma: PrismaClient): Promise<void> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT ticket_id, cluster_id_0, cluster_id_1, cluster_id_2, cluster_id_3,
     cluster_id_4, cluster_id_5, cluster_id_6 FROM \`ticket_geodata\``,
  );
  for (const row of rows as unknown as MysqlTicketGeodataRow[]) {
    await prisma.$executeRaw`
      INSERT INTO "ticket_geodata"
        (ticket_id, cluster_id_0, cluster_id_1, cluster_id_2, cluster_id_3,
         cluster_id_4, cluster_id_5, cluster_id_6)
      VALUES (
        ${row.ticket_id},
        ${row.cluster_id_0 ?? null}, ${row.cluster_id_1 ?? null},
        ${row.cluster_id_2 ?? null}, ${row.cluster_id_3 ?? null},
        ${row.cluster_id_4 ?? null}, ${row.cluster_id_5 ?? null},
        ${row.cluster_id_6 ?? null}
      )
      ON CONFLICT DO NOTHING
    `;
  }
  console.log(`[ticket_geodata] migrated ${rows.length} rows`);
}

// ---------------------------------------------------------------------------
// IDENTITY sequence reset
// ---------------------------------------------------------------------------

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
  for (const table of IDENTITY_TABLES) {
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('"${table}"', 'id'),
        COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1,
        false
      )
    `);
    console.log(`[sequences] reset ${table}`);
  }
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

export async function migrateAll(
  mysqlConn: mysql.Connection,
  prisma: PrismaClient,
): Promise<void> {
  // Set UTC timezone for MySQL session so TIMESTAMP columns are read in UTC
  await mysqlConn.query("SET time_zone = '+00:00'");
  console.log('[migrate] MySQL session timezone set to UTC');

  const tables: Array<{ name: string; fn: () => Promise<void> }> = [
    { name: 'version', fn: () => migrateVersion(mysqlConn, prisma) },
    { name: 'contactMethods', fn: () => migrateContactMethods(mysqlConn, prisma) },
    { name: 'substatus', fn: () => migrateSubstatus(mysqlConn, prisma) },
    { name: 'actions', fn: () => migrateActions(mysqlConn, prisma) },
    { name: 'categoryGroups', fn: () => migrateCategoryGroups(mysqlConn, prisma) },
    { name: 'issueTypes', fn: () => migrateIssueTypes(mysqlConn, prisma) },
    { name: 'departments (initial, no defaultPerson_id)', fn: () => migrateDepartments(mysqlConn, prisma) },
    { name: 'people', fn: () => migratePeople(mysqlConn, prisma) },
    { name: 'departments (patch defaultPerson_id)', fn: () => patchDepartmentDefaultPerson(mysqlConn, prisma) },
    { name: 'peopleEmails', fn: () => migratePeopleEmails(mysqlConn, prisma) },
    { name: 'peoplePhones', fn: () => migratePeoplePhones(mysqlConn, prisma) },
    { name: 'peopleAddresses', fn: () => migratePeopleAddresses(mysqlConn, prisma) },
    { name: 'clients', fn: () => migrateClients(mysqlConn, prisma) },
    { name: 'categories', fn: () => migrateCategories(mysqlConn, prisma) },
    { name: 'category_action_responses', fn: () => migrateCategoryActionResponses(mysqlConn, prisma) },
    { name: 'department_actions', fn: () => migrateDepartmentActions(mysqlConn, prisma) },
    { name: 'department_categories', fn: () => migrateDepartmentCategories(mysqlConn, prisma) },
    { name: 'tickets', fn: () => migrateTickets(mysqlConn, prisma) },
    { name: 'ticketHistory', fn: () => migrateTicketHistory(mysqlConn, prisma) },
    { name: 'media', fn: () => migrateMedia(mysqlConn, prisma) },
    { name: 'bookmarks', fn: () => migrateBookmarks(mysqlConn, prisma) },
    { name: 'geoclusters', fn: () => migrateGeoclusters(mysqlConn, prisma) },
    { name: 'ticket_geodata', fn: () => migrateTicketGeodata(mysqlConn, prisma) },
  ];

  for (const { name, fn } of tables) {
    try {
      console.log(`\n[migrate] Starting: ${name}`);
      await fn();
      console.log(`[migrate] Completed: ${name}`);
    } catch (err) {
      const error = err as Error & { meta?: { target?: string } };
      console.error(`[migrate] FAILED on table: ${name}`);
      console.error(`[migrate] Error: ${error.message}`);
      if (error.meta) {
        console.error(`[migrate] Meta: ${JSON.stringify(error.meta)}`);
      }
      process.exit(1);
    }
  }

  // Reset all IDENTITY sequences after all inserts
  console.log('\n[migrate] Resetting IDENTITY sequences...');
  try {
    await resetSequences(prisma);
    console.log('[migrate] All sequences reset');
  } catch (err) {
    const error = err as Error;
    console.error(`[migrate] FAILED resetting sequences: ${error.message}`);
    process.exit(1);
  }

  console.log('\n[migrate] Migration complete!');
}

// ---------------------------------------------------------------------------
// Script entrypoint
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const mysqlConn = await mysql.createConnection({
    host: process.env['MYSQL_HOST'] ?? '127.0.0.1',
    port: parseInt(process.env['MYSQL_PORT'] ?? '3306', 10),
    user: process.env['MYSQL_USER'],
    password: process.env['MYSQL_PASSWORD'],
    database: process.env['MYSQL_DATABASE'],
    // Return Date objects for DATETIME/TIMESTAMP columns
    dateStrings: false,
  });

  const prisma = new PrismaClient({
    datasources: {
      db: { url: process.env['DATABASE_URL'] },
    },
  });

  try {
    await migrateAll(mysqlConn, prisma);
  } finally {
    await mysqlConn.end();
    await prisma.$disconnect();
  }
}

// Run main when this script is executed directly
if (require.main === module) {
  main().catch((err: unknown) => {
    console.error('[migrate] Fatal error:', err);
    process.exit(1);
  });
}
