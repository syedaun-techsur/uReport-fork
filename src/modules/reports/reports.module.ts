import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * ReportsModule (F13)
 *
 * Route prefix: /metrics (MetricsController), /reports (ReportsController)
 * Per TechArch §ReportsModule and FRD §F13.
 *
 * Both endpoints are staff-only (FRD §F13.3).
 * Both endpoints support all 5 output formats via the global SerializationInterceptor (F3).
 * ReportsService executes live Prisma $queryRawUnsafe aggregations — no caching.
 */
@Module({
  imports: [PrismaModule],
  controllers: [MetricsController, ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
