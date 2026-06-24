import { Controller, Get } from '@nestjs/common';

/**
 * Root + health endpoints.
 *
 * uReport is a headless Open311 GeoReport v2 REST API — it intentionally has no
 * SPA homepage. Without a `GET /` handler NestJS returns its default
 * `{"message":"Cannot GET /","error":"Not Found","statusCode":404}`, which looks
 * like a broken app in the embedded preview (the preview lands on `/` by
 * default). This controller serves a small, public API index there instead, plus
 * a `/health` liveness probe. Both are unauthenticated (no `@UseGuards`).
 */
@Controller()
export class AppController {
  @Get()
  index() {
    return {
      service: 'uReport — Open311 GeoReport v2 API',
      status: 'ok',
      docs: 'https://wiki.open311.org/GeoReport_v2/',
      endpoints: {
        discovery: '/open311/v2/services.json',
        services: '/open311/v2/services',
        requests: '/open311/v2/requests',
        tokenLookup: '/open311/v2/tokens/:token',
        health: '/health',
      },
    };
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
