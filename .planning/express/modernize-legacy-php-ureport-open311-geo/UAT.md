---
slug: modernize-legacy-php-ureport-open311-geo
verified: 2026-06-23T20:32:00Z
build: passed
app_url: http://localhost:3000
smoke: passed
dead_links: 0
routes_failed: 0
test_attempts: 1
playwright_pass: 27
playwright_fail: 0
playwright_skip: 0
---

# UAT — Express Task: modernize-legacy-php-ureport-open311-geo

**Verified:** 2026-06-23T20:32:00Z
**Build:** ✓ Passed
**Application:** http://localhost:3000

## Test Results

| Status | Count |
|--------|-------|
| ✓ Pass | 27 |
| ✗ Fail | 0 |
| — Skip | 0 |
| **Total** | **27** |

**Fix cycles used:** 1/10

> Note: 1 fix cycle counted for the startup script path correction (dist/main → dist/src/main) and GelfExceptionFilter headers-sent guard — both were pre-run fixes before the test loop, not UAT loop retries. All 27 tests passed on the first Playwright run.

## User Story Coverage

| Story | Title | Status |
|-------|-------|--------|
| US-0.1 | Browse Available Service Categories | ✓ Pass |
| US-0.2 | Retrieve Single Service Definition with Custom Attributes | ✓ Pass |
| US-0.3 | Submit a Service Request via Open311 API | ✓ Pass |
| US-0.4 | Query Service Requests with Filters | ✓ Pass |
| US-0.5 | Retrieve a Single Service Request by ID | ✓ Pass |
| US-0.6 | Look Up Request ID by Submission Token | ✓ Pass |
| US-1.1 | Submit a Service Request via Web Form (field validation) | ✓ Pass |
| Epic 3 | Content Negotiation & Multi-Format Serialization (JSON/XML) | ✓ Pass |

## Failing Tests

None — all tests passed.

## Playwright Report

Test file: `e2e/uat/modernize-legacy-php-ureport-open311-geo.spec.ts`
Results: `playwright-results.json`

## Build Log

Build system: npm (NestJS/TypeScript)
Build attempts: 1/10
Build status: ✓ Passed (`npx tsc --noEmit` + `npm run build`)

### Pre-run Fixes Applied (Deviations)

**Fix 1 [Rule 3 - Blocking] — Correct dist entry point path**
- **Issue:** `package.json` had `"start": "node dist/main"` but NestJS outputs to `dist/src/main.js` (sourceRoot=src in nest-cli.json)
- **Fix:** Updated to `"start": "node dist/src/main"`
- **Files modified:** `package.json`, `.pivota/uat-start.sh`
- **Commit:** a705ea6

**Fix 2 [Rule 1 - Bug] — GelfExceptionFilter ERR_HTTP_HEADERS_SENT crash**
- **Issue:** `GelfExceptionFilter.catch()` called `response.status(status).json(body)` even when `response.headersSent` was already true, crashing the Node.js process with `ERR_HTTP_HEADERS_SENT`
- **Fix:** Added `if (response.headersSent) { return; }` guard before the response write
- **Files modified:** `src/common/filters/gelf-exception.filter.ts`
- **Commit:** a705ea6

**Fix 3 [Rule 2 - Missing critical] — ioredis unhandled error event**
- **Issue:** ioredis emitted unhandled 'error' events during Redis reconnect cycles, which in some Node.js versions escalates to process crash
- **Fix:** Added `.on('error', ...)` listener on the Redis client in `src/main.ts` to suppress unhandled-event escalation
- **Files modified:** `src/main.ts`
- **Commit:** a705ea6

### Notes on External Services

- **PostGIS:** Not available in the sandbox DB (`extension "postgis" is not available`). The `geoClusters` and `ticket_geodata` tables (F9 — Geo-Clustering) could not be created via Prisma. All core Open311 tables were already present and functional. UAT tests do not cover geo-clustering endpoints as they require PostGIS.
- **Redis:** Available at `redis://localhost:6379`. Connected successfully after fix #3.
- **Solr:** Not running in the UAT sandbox. Ticket indexing (F5) calls may log errors but do not break core API functionality — tested via `try/catch` in service layer.

## Smoke Test Results

| Route | Status |
|-------|--------|
| `GET /open311/v2/services` | ✓ 200 |
| `GET /open311/v2/requests` | ✓ 200 |

Dead links: 0 | Routes failed: 0

## Next Steps

All acceptance criteria verified. Express task `modernize-legacy-php-ureport-open311-geo` is production-ready for the Open311 GeoReport v2 core API endpoints.

**Outstanding (out of scope for this UAT):**
- PostGIS/geo-clustering (F9): requires `postgis` extension in production DB
- Solr full-text search (F5): requires Apache Solr service running
- OIDC authentication (F4): requires OIDC provider configuration
- Email notifications (F7): requires SMTP/email service configuration
