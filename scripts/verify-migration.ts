#!/usr/bin/env ts-node
/**
 * Row-count verification script
 *
 * Connects to both MySQL (source) and PostgreSQL (target), runs
 * SELECT COUNT(*) on each of the 21 tables, and asserts they match.
 *
 * Environment variables:
 *   MYSQL_HOST      MySQL hostname (default: 127.0.0.1)
 *   MYSQL_PORT      MySQL port    (default: 3306)
 *   MYSQL_USER      MySQL user
 *   MYSQL_PASSWORD  MySQL password
 *   MYSQL_DATABASE  MySQL database name
 *   DATABASE_URL    PostgreSQL connection string (Prisma format)
 *
 * Exit codes:
 *   0  — all 21 tables have matching row counts (prints "ALL TABLES MATCH")
 *   1  — one or more tables differ (prints per-table MISMATCH lines)
 *
 * Usage:
 *   npx ts-node scripts/verify-migration.ts
 */

import * as mysql from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Table list (all 21 tables)
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

interface CountResult {
  table: TableName;
  mysqlCount: number;
  pgCount: number;
  match: boolean;
}

// ---------------------------------------------------------------------------
// Count helpers
// ---------------------------------------------------------------------------

async function getMysqlCount(conn: mysql.Connection, table: string): Promise<number> {
  const [rows] = await conn.query(`SELECT COUNT(*) AS cnt FROM \`${table}\``);
  return Number((rows as Array<{ cnt: string | number }>)[0].cnt);
}

async function getPgCount(prisma: PrismaClient, table: string): Promise<number> {
  // Table names are from the hardcoded TABLES const — safe to use $queryRawUnsafe
  const result = await prisma.$queryRawUnsafe<[{ count: bigint | string }]>(
    `SELECT COUNT(*) AS count FROM "${table}"`,
  );
  return Number(result[0].count);
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

export async function verifyAll(
  mysqlConn: mysql.Connection,
  prisma: PrismaClient,
): Promise<void> {
  // Force UTC on MySQL session
  await mysqlConn.query("SET time_zone = '+00:00'");

  const results: CountResult[] = [];

  for (const table of TABLES) {
    const mysqlCount = await getMysqlCount(mysqlConn, table);
    const pgCount    = await getPgCount(prisma, table);
    results.push({ table, mysqlCount, pgCount, match: mysqlCount === pgCount });
  }

  // ---------------------------------------------------------------------------
  // Print aligned report
  // ---------------------------------------------------------------------------

  const COL_TABLE  = 32;
  const COL_MYSQL  = 10;
  const COL_PG     = 12;
  const COL_STATUS =  8;

  const header = [
    'Table'.padEnd(COL_TABLE),
    'MySQL'.padStart(COL_MYSQL),
    'PostgreSQL'.padStart(COL_PG),
    'Status'.padStart(COL_STATUS),
  ].join('  ');

  const separator = '-'.repeat(header.length);

  console.log('');
  console.log(header);
  console.log(separator);

  for (const r of results) {
    const statusStr = r.match ? 'OK' : 'MISMATCH';
    const line = [
      r.table.padEnd(COL_TABLE),
      String(r.mysqlCount).padStart(COL_MYSQL),
      String(r.pgCount).padStart(COL_PG),
      statusStr.padStart(COL_STATUS),
    ].join('  ');
    console.log(line);
  }

  console.log(separator);

  const mismatches = results.filter((r) => !r.match);
  console.log(`TOTAL MISMATCH: ${mismatches.length}`);
  console.log('');

  if (mismatches.length > 0) {
    console.error('The following tables have count mismatches:');
    for (const r of mismatches) {
      console.error(
        `  MISMATCH: ${r.table}  MySQL=${r.mysqlCount}  PG=${r.pgCount}  delta=${r.pgCount - r.mysqlCount}`,
      );
    }
    process.exit(1);
  }

  console.log('ALL TABLES MATCH');
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
    dateStrings: false,
  });

  const prisma = new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL },
    },
  });

  try {
    await verifyAll(mysqlConn, prisma);
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
