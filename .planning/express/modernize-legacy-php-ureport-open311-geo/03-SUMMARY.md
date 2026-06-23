---
phase: wave-2-backend
plan: 03
subsystem: content-negotiation
tags: [format-negotiation, serialization, middleware, interceptor, nestjs]
dependency_graph:
  requires: [01-PLAN.md (NestJS scaffold), 02-PLAN.md (Prisma schema)]
  provides: [FormatMiddleware, SerializationInterceptor, JsonSerializer, XmlSerializer, CsvSerializer, TxtSerializer, HtmlRenderer]
  affects: [all subsequent waves — every endpoint uses format negotiation]
tech_stack:
  added: [nunjucks@3.2.4, @types/nunjucks@3.2.6]
  patterns: [NestJS global middleware, APP_INTERCEPTOR, NestJS interceptor, content negotiation, observer pattern (rxjs)]
key_files:
  created:
    - src/common/middleware/format.middleware.ts
    - src/common/interceptors/serialization.interceptor.ts
    - src/common/serializers/json.serializer.ts
    - src/common/serializers/xml.serializer.ts
    - src/common/serializers/csv.serializer.ts
    - src/common/serializers/txt.serializer.ts
    - src/common/serializers/html.renderer.ts
    - src/common/interceptors/serialization.interceptor.spec.ts
  modified:
    - src/app.module.ts
    - package.json
decisions:
  - "HtmlRenderer uses Nunjucks stub fallback (JSON dump in <pre>) since templates are per-feature and delivered in Waves 3–6"
  - "SerializationInterceptor uses res.end() directly to prevent NestJS default JSON serialization from double-encoding"
  - "FormatMiddleware is registered via consumer.apply().forRoutes('*') for all routes"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-23"
  tasks_completed: 2
  files_created: 8
  files_modified: 2
---

# Phase wave-2-backend Plan 03: Content Negotiation & Multi-Format Serialization Summary

**One-liner:** Global FormatMiddleware + SerializationInterceptor with five format serializers (JSON/XML/CSV/TXT/HTML) replacing ~187 legacy PHP `.inc` partials.

## What Was Built

This plan implements F3 (Content Negotiation & Multi-Format Serialization) — the P0 cross-cutting component required by every endpoint in the application. No subsequent wave can return correctly formatted responses without this infrastructure.

### Files Created

| File | Purpose |
|------|---------|
| `src/common/middleware/format.middleware.ts` | Resolves negotiated format from URL suffix → ?format= → Accept header → default. Attaches `req.negotiatedFormat`. |
| `src/common/interceptors/serialization.interceptor.ts` | Global NestJS interceptor that reads `req.negotiatedFormat` and delegates to the correct serializer, then writes the response directly. |
| `src/common/serializers/json.serializer.ts` | JSON output: ISO 8601 dates, null preserved, true/false booleans |
| `src/common/serializers/xml.serializer.ts` | XML output: `<?xml?>` declaration, CDATA on `description`/`notes`/`template`, XML escape for all other strings |
| `src/common/serializers/csv.serializer.ts` | CSV output: UTF-8 BOM, header row, double-quoted strings, booleans as `1`/`0` |
| `src/common/serializers/txt.serializer.ts` | TXT output: tab-separated, no header row, booleans as `1`/`0` |
| `src/common/serializers/html.renderer.ts` | HTML output: Nunjucks delegate, fallback to JSON dump in `<pre>` when template missing |
| `src/common/interceptors/serialization.interceptor.spec.ts` | 42 unit tests covering all 4 priority levels of format negotiation and all 5 serializers |

### Files Modified

| File | Change |
|------|--------|
| `src/app.module.ts` | Added `FormatMiddleware` as global middleware via `MiddlewareConsumer`, added all serializers + `SerializationInterceptor` as `APP_INTERCEPTOR` |
| `package.json` | Added `nunjucks@^3.2.4` (dependency) and `@types/nunjucks@^3.2.6` (devDependency) |

## Verification Results

### TypeScript
```
No errors in src/common — TSC: No errors in src/common
(Pre-existing errors in other modules are out of scope for this plan)
```

### Jest Test Results
```
Test Suites: 1 passed, 1 total
Tests:       42 passed, 42 total
Snapshots:   0 total
Time:        1.328s
```

**Test breakdown:**
- `FormatMiddleware.resolve()` — 16 cases covering all 4 priority levels + priority ordering
- `JsonSerializer` — 5 cases
- `XmlSerializer` — 8 cases
- `CsvSerializer` — 8 cases
- `TxtSerializer` — 5 cases

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `6fc2548` | feat(wave-2-backend-03): FormatMiddleware + SerializationInterceptor wired globally |
| Task 2 | `8d19af5` | test(wave-2-backend-03): unit tests for FormatMiddleware and all serializers |

## Deviations from Plan

None — plan executed exactly as written.

## Notes for Wave 2+ Successors

### How to use NegotiatedFormat type

```typescript
import { NegotiatedFormat } from '../common/middleware/format.middleware';

// req.negotiatedFormat is automatically set by FormatMiddleware for every request
// No controller-level format logic needed
```

### How to set X-Template header for HTML rendering

Controllers that serve HTML pages should set the `X-Template` header on the response
before returning. The `SerializationInterceptor` reads this header and passes it to
`HtmlRenderer.render()`:

```typescript
// In your controller:
@Get('/')
index(@Res({ passthrough: true }) res: Response) {
  res.setHeader('X-Template', 'tickets/index.html');
  return { tickets: [] }; // data passed to template as `data` variable
}
```

If `X-Template` is not set (or the template file doesn't exist), the renderer falls
back to a JSON dump in `<pre>` — safe for development.

### How serializers are injected

All serializers are registered as NestJS providers in `AppModule`. Feature modules can
inject them directly:

```typescript
import { JsonSerializer } from '../../common/serializers/json.serializer';
import { CsvSerializer } from '../../common/serializers/csv.serializer';

@Injectable()
export class ReportService {
  constructor(
    private readonly jsonSerializer: JsonSerializer,
    private readonly csvSerializer: CsvSerializer,
  ) {}
}
```

### Format resolution priority (FRD F03.1)

1. **URL suffix** — `.json`, `.xml`, `.csv`, `.txt` (highest priority)
2. **?format= query param** — `json`, `xml`, `csv`, `txt`, `html`
3. **Accept header** — `application/json`, `application/xml`, `text/csv`, `text/plain`, `text/html`
4. **Default** — `json` for `/open311/v2/` routes; `html` for all other routes

### CSV Content-Disposition

The interceptor automatically sets:
```
Content-Disposition: attachment; filename="export-{YYYY-MM-DD}.csv"
```
for CSV responses. Feature modules can override this by setting the header explicitly
before the interceptor runs (the interceptor only sets it if not already present).
