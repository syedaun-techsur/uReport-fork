/**
 * scripts/reindex-solr.ts
 * Bulk re-index all tickets into Solr (FRD §F05.5).
 *
 * Usage: npx ts-node scripts/reindex-solr.ts
 * Exits non-zero on any Solr or DB error.
 *
 * Process (FRD §F05.5):
 * 1. deleteByQuery *:* — clear the index
 * 2. Load all tickets from PostgreSQL in batches of 500
 * 3. Build Solr documents for each batch
 * 4. Submit batch add operations
 * 5. Issue final commit
 * 6. Log progress (tickets indexed, elapsed time)
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const solr = require('solr-client');

const BATCH_SIZE = 500;

const prisma = new PrismaClient();

const client = solr.createClient({
  host: process.env.SOLR_HOST ?? 'localhost',
  port: parseInt(process.env.SOLR_PORT ?? '8983', 10),
  core: process.env.SOLR_CORE ?? 'uReport',
  path: process.env.SOLR_PATH ?? '/solr',
});

async function deleteAll(): Promise<void> {
  return new Promise((resolve, reject) => {
    client.deleteByQuery('*:*', (err: Error | null) => {
      if (err) { reject(err); return; }
      client.commit((cerr: Error | null) => {
        if (cerr) { reject(cerr); return; }
        resolve();
      });
    });
  });
}

async function addBatch(docs: object[]): Promise<void> {
  return new Promise((resolve, reject) => {
    client.add(docs, (err: Error | null) => {
      if (err) { reject(err); return; }
      resolve();
    });
  });
}

async function commitFinal(): Promise<void> {
  return new Promise((resolve, reject) => {
    client.commit((err: Error | null) => {
      if (err) { reject(err); return; }
      resolve();
    });
  });
}

/** Build Solr document from Prisma ticket with relations (FRD §F05.1 field names) */
function buildDoc(ticket: any): object {
  return {
    id: ticket.id,
    status: ticket.status,
    description: ticket.description ?? null,
    category_id: ticket.category_id ?? null,
    category_name: ticket.category?.name ?? null,
    department_id: ticket.category?.department_id ?? null,
    department_name: ticket.category?.department?.name ?? null,
    assignedPerson_id: ticket.assignedPerson_id ?? null,
    enteredDate: ticket.enteredDate ? new Date(ticket.enteredDate).toISOString() : null,
    lastModified: ticket.lastModified ? new Date(ticket.lastModified).toISOString() : null,
    location: ticket.location ?? null,
    city: ticket.city ?? null,
    latitude: ticket.latitude ?? null,
    longitude: ticket.longitude ?? null,
    substatus_id: ticket.substatus_id ?? null,
    substatus_name: ticket.substatus?.name ?? null,
    issueType_id: ticket.issueType_id ?? null,
    customFields: ticket.customFields ?? null,
  };
}

async function main(): Promise<void> {
  const start = Date.now();
  console.log('[reindex-solr] Starting Solr re-index...');

  // Step 1: Delete all (FRD §F05.5)
  console.log('[reindex-solr] Deleting all documents from Solr index...');
  await deleteAll();
  console.log('[reindex-solr] Index cleared.');

  // Step 2–4: Load in batches and submit (FRD §F05.5)
  let offset = 0;
  let totalIndexed = 0;

  while (true) {
    const tickets = await prisma.tickets.findMany({
      skip: offset,
      take: BATCH_SIZE,
      include: {
        category: { include: { department: true } },
        substatus: true,
        issueType: true,
      },
      orderBy: { id: 'asc' },
    });

    if (tickets.length === 0) break;

    const docs = tickets.map(buildDoc);
    await addBatch(docs);
    totalIndexed += tickets.length;
    offset += BATCH_SIZE;
    console.log(`[reindex-solr] Indexed ${totalIndexed} tickets...`);

    if (tickets.length < BATCH_SIZE) break;
  }

  // Step 5: Final commit (FRD §F05.5)
  await commitFinal();

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`[reindex-solr] Done. Indexed ${totalIndexed} tickets in ${elapsed}s.`);
}

main()
  .catch((err: Error) => {
    console.error('[reindex-solr] FATAL:', err.message);
    process.exit(1); // non-zero exit on any error (FRD §F05.5)
  })
  .finally(() => prisma.$disconnect());
