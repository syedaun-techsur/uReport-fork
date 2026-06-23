/**
 * scripts/verify-migration.ts
 *
 * Standalone ts-node script: verifies row-count parity across all 21 tables
 * between MySQL source and PostgreSQL target after migration.
 *
 * Usage:
 *   MYSQL_HOST=... MYSQL_PORT=... MYSQL_USER=... MYSQL_PASSWORD=... MYSQL_DATABASE=... \
 *   DATABASE_URL=postgresql://... \
 *   npx ts-node scripts/verify-migration.ts
 *
 * Exit codes:
 *   0 — all table row counts match
 *   1 — one or more tables have mismatched counts (full report printed first)
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
import { PrismaClient, Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Table list — all 21 tables
// ---------------------------------------------------------------------------

const TABLES = [
  'version',
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
  'department_actions',
  'department_categories',
  'tickets',
  'ticketHistory',
  'media',
  'bookmarks',
  'geoclusters',
  'ticket_geodata',
] as const;

type TableName = typeof TABLES[number];

interface TableReport {
  table: TableName;
  mysqlCount: number;
  pgCount: number;
  match: boolean;
}

// ---------------------------------------------------------------------------
// Count helpers
// ---------------------------------------------------------------------------

async function getMysqlCount(conn: mysql.Connection, table: TableName): Promise<number> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM \`${table}\``,
  );
  return Number((rows[0] as { cnt: string | number }).cnt);
}

async function getPgCount(prisma: PrismaClient, table: TableName): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count FROM ${Prisma.raw(`"${table}"`)}
  `;
  return Number(result[0]?.count ?? 0);
}

// ---------------------------------------------------------------------------
// Report printer
// ---------------------------------------------------------------------------

function printReport(reports: TableReport[]): void {
  const COL_TABLE = 32;
  const COL_MYSQL = 12;
  const COL_PG = 12;
  const COL_STATUS = 10;

  const header = [
    'Table'.padEnd(COL_TABLE),
    'MySQL'.padStart(COL_MYSQL),
    'PostgreSQL'.padStart(COL_PG),
    'Status'.padStart(COL_STATUS),
  ].join('  ');

  const divider = '-'.repeat(header.length);

  console.log('\n' + header);
  console.log(divider);

  let mismatchCount = 0;
  for (const r of reports) {
    const status = r.match ? 'OK' : 'MISMATCH';
    if (!r.match) mismatchCount++;
    const line = [
      r.table.padEnd(COL_TABLE),
      String(r.mysqlCount).padStart(COL_MYSQL),
      String(r.pgCount).padStart(COL_PG),
      status.padStart(COL_STATUS),
    ].join('  ');
    console.log(line);
  }

  console.log(divider);
  console.log(`TOTAL MISMATCH: ${mismatchCount}`);
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

export async function verifyAll(
  mysqlConn: mysql.Connection,
  prisma: PrismaClient,
): Promise<void> {
  // Set UTC timezone for MySQL session
  await mysqlConn.query("SET time_zone = '+00:00'");

  const reports: TableReport[] = [];

  for (const table of TABLES) {
    const mysqlCount = await getMysqlCount(mysqlConn, table);
    const pgCount = await getPgCount(prisma, table);
    const match = mysqlCount === pgCount;
    reports.push({ table, mysqlCount, pgCount, match });
  }

  printReport(reports);

  const mismatches = reports.filter((r) => !r.match);

  if (mismatches.length > 0) {
    console.log('\nMISMATCH DETAILS:');
    for (const r of mismatches) {
      console.log(`  MISMATCH: ${r.table}  MySQL=${r.mysqlCount}  PG=${r.pgCount}`);
    }
    process.exit(1);
  } else {
    console.log('\nALL TABLES MATCH');
  }
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
    dateStrings: false,
  });

  const prisma = new PrismaClient({
    datasources: {
      db: { url: process.env['DATABASE_URL'] },
    },
  });

  try {
    await verifyAll(mysqlConn, prisma);
  } finally {
    await mysqlConn.end();
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error('[verify] Fatal error:', err);
    process.exit(1);
  });
}
