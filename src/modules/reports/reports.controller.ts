import {
  Controller,
  Get,
  Query,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ReportsService } from './reports.service';
import { ReportsQueryDto } from './dto/reports-query.dto';

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
 * ReportsController
 *
 * GET /reports — exportable filtered, paginated ticket report (FRD §F13.2).
 *
 * Access: staff-only (FRD §F13.3 — 403 for non-staff).
 * Format: JSON/XML/CSV/TXT/HTML via global SerializationInterceptor.
 *
 * Filters: start_date, end_date, status, category_id, department_id, page, page_size
 * Output fields: id, status, category_name, department_name, location, city, zip,
 *                enteredDate, closedDate, substatus_name, description
 *
 * US-13.2 NaC: "GET /reports with date/status/dept filters; CSV matches HTML view;
 * staff-only; paginated" (STORY-MAP §SM-13.2 / JRN-03.1 Bulk Review and Export).
 *
 * Dana (JRN-03.1 Stage 6): exports "Closed This Week" filter to CSV for Robert's
 * weekly report — CSV must be column-for-column identical to the HTML table view
 * (F3 parity per JTBD-03.2 success criteria).
 */
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /reports — paginated, filterable ticket report.
   * Returns { total, page, page_size, results[] } serialized in negotiated format.
   */
  @Get()
  getReports(@Query() dto: ReportsQueryDto, @Req() req: Request) {
    requireStaff(req);
    return this.reportsService.getReports(dto);
  }
}
