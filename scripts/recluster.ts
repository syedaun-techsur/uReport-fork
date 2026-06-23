/**
 * scripts/recluster.ts
 *
 * Bulk re-cluster script (FRD §F09.3).
 * Truncates ticket_geodata, then reprocesses all tickets with lat/lon in batches of 500.
 *
 * Usage:
 *   npx ts-node scripts/recluster.ts
 *   # or via package.json script: npm run recluster
 *
 * Idempotent: safe to run multiple times (truncates before processing).
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { GeoClusterService } from '../src/modules/geo/geo.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const geoService = app.get(GeoClusterService);
    await geoService.reClusterAll(500);
    console.log('[recluster] Script completed successfully.');
  } catch (err) {
    console.error('[recluster] Script failed:', (err as Error).message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap().catch(err => {
  console.error('[recluster] Unhandled error:', err);
  process.exit(1);
});
