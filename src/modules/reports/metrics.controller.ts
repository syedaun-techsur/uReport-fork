import {
  Controller,
  Get,
  Query,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ReportsService } from './reports.service';
import { MetricsQueryDto } from './dto/metrics-query.dto';

/** Require staff role; throw 403 if not staff (FRD §F13.3) */
function requireStaff(req: Request): void {
  const user = (req as any).user;
  if (!user || user.role !== 'staff') {
    throw new ForbiddenException({
      error: 'FORBIDDEN',
      message: 'Staff access required',
    });
  }
}

/**
 * MetricsController
 *
 * GET /metrics — dashboard aggregate metrics (FRD §F13.1).
 *
 * Access: staff-only (FRD §F13.3 — 403 for non-staff).
 * Format: JSON/XML/CSV/TXT/HTML via global SerializationInterceptor.
 *
 * Returns MetricsDto:
 *   { openCount, closedCount, totalCount, avgResolutionDays, byCategory[], byDepartment[] }
 *
 * Staleness: live SQL aggregations — ~0ms (FRD §F13.1 ≤5-minute requirement met).
 * Performance: ≤200ms via existing indexes (idx_tickets_status, idx_tickets_enteredDate,
 *              idx_tickets_category_id — declared in wave 1 plan 01).
 *
 * JRN-04.2 (Robert Osei): Supervisor opens metrics dashboard to assess departmental
 * ticket throughput and resolution health without exporting data (JTBD-04.2).
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /metrics — compute and return live aggregate metrics.
   * Optional filters: start_date (ISO 8601), end_date (ISO 8601).
   */
  @Get()
  getMetrics(@Query() dto: MetricsQueryDto, @Req() req: Request) {
    requireStaff(req);
    return this.reportsService.getMetrics(dto);
  }
}
