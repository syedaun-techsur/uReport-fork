import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { GeoClusterService } from './geo.service';
import { GetLocationsDto } from './dto/get-locations.dto';

/** Extract caller's role from req.user (set by AuthMiddleware) */
function getRole(req: Request): string | null {
  return (req as any).user?.role ?? null;
}

@Controller('locations')
export class LocationsController {
  constructor(private readonly geoClusterService: GeoClusterService) {}

  /**
   * GET /locations — cluster data for front-end map rendering (FRD §F09.5).
   *
   * Auth: [anon] — anonymous callers see only anonymous-displayPermissionLevel clusters.
   * Returns: Array of { id, level, lat, lon, count }.
   * Error: 400 if zoom_level outside 0–6.
   */
  @Get()
  getLocations(@Query() dto: GetLocationsDto, @Req() req: Request) {
    return this.geoClusterService.getLocations(getRole(req), dto);
  }
}
