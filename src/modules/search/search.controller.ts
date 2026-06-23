import {
  Controller,
  Get,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { PiiMaskInterceptor } from '../../common/interceptors/pii-mask.interceptor';

/** Extract authenticated user's role from request (set by AuthMiddleware) */
function getRole(req: Request): string | null {
  return (req as any).user?.role ?? null;
}

/**
 * SearchController
 *
 * GET /search — full-text Solr search with role-based category visibility filtering.
 *
 * FRD §F05.2 behaviour:
 * - q: full-text query; default *:* (all documents)
 * - Filters: status, category_id, department_id, assignedPerson_id, start_date, end_date
 * - Sorting: 'relevance' (default) or 'date'
 * - Pagination: page (1-based), rows (default 25, max 500)
 * - Response: { total, page, rows, results[], facets: {categories, statuses, departments} }
 * - All five formats via global SerializationInterceptor (FRD §F03 / §F05.2)
 * - HTTP 503 SEARCH_UNAVAILABLE when Solr is unreachable (thrown by SolrService)
 *
 * Role-visibility filter (FRD §F05.3, §F02.5):
 * - Staff: no category filter (sees all tickets)
 * - Public (authenticated): only categories with displayPermissionLevel IN ('public','anonymous')
 * - Anonymous: only categories with displayPermissionLevel = 'anonymous'
 *
 * Bookmark integration (FRD §F05.6, §F12):
 * - The full request URL including query params is the canonical bookmark requestUri.
 * - Recalling a bookmark simply redirects to this URL, re-executing the live Solr query.
 */
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * GET /search — execute Solr search and return paginated results with facets.
   *
   * PiiMaskInterceptor is applied to prevent PII leakage in results for non-staff
   * callers (reportedByPerson fields masked by PiiMaskInterceptor from plan 06).
   */
  @Get()
  @UseInterceptors(PiiMaskInterceptor)
  search(
    @Query() dto: SearchQueryDto,
    @Req() req: Request,
  ) {
    const role = getRole(req);
    return this.searchService.search(dto, role);
  }
}
