---
phase: wave-2-backend
plan: 03
type: execute
wave: 2
depends_on: [1]
files_modified:
  - src/common/middleware/format.middleware.ts
  - src/common/interceptors/serialization.interceptor.ts
  - src/common/serializers/json.serializer.ts
  - src/common/serializers/xml.serializer.ts
  - src/common/serializers/csv.serializer.ts
  - src/common/serializers/txt.serializer.ts
  - src/common/serializers/html.renderer.ts
  - src/common/interceptors/serialization.interceptor.spec.ts
  - src/app.module.ts
autonomous: true

features:
  implements: ["F3"]
  depends_on: ["F6"]
  enables: ["F0", "F1", "F13"]

must_haves:
  truths:
    - "Every endpoint returns JSON by default for /open311/v2/ routes, HTML by default everywhere else"
    - "URL suffix (.json, .xml, .csv, .txt) overrides Accept header for format selection"
    - "?format= query parameter is honored when no suffix is present"
    - "Accept header is evaluated when no suffix or ?format= param is present"
    - "Content-Type response header is set correctly for each format (application/json, application/xml, text/csv; charset=utf-8, text/plain; charset=utf-8, text/html)"
    - "JSON output uses camelCase field names, null for null values, ISO 8601 UTC dates, true/false booleans"
    - "XML output has <?xml version='1.0' encoding='UTF-8'?> declaration and CDATA wraps description/notes/template fields"
    - "CSV output has UTF-8 BOM (0xEF 0xBB 0xBF), header row, all strings double-quoted, booleans as 1/0, Content-Disposition attachment header"
    - "TXT output has tab-separated fields, no header row, one record per line"
    - "Error responses are also format-negotiated with the correct envelope per format"
    - "The interceptor is registered globally — no controller-level format logic needed"
  artifacts:
    - path: "src/common/middleware/format.middleware.ts"
      provides: "FormatMiddleware — resolves negotiated format and attaches req.negotiatedFormat"
      exports: ["FormatMiddleware", "NegotiatedFormat"]
    - path: "src/common/interceptors/serialization.interceptor.ts"
      provides: "Global SerializationInterceptor — reads req.negotiatedFormat, delegates to serializers"
      exports: ["SerializationInterceptor"]
    - path: "src/common/serializers/json.serializer.ts"
      provides: "JsonSerializer — serializes controller return value to JSON string"
      exports: ["JsonSerializer"]
    - path: "src/common/serializers/xml.serializer.ts"
      provides: "XmlSerializer — serializes to legacy-compatible XML string"
      exports: ["XmlSerializer"]
    - path: "src/common/serializers/csv.serializer.ts"
      provides: "CsvSerializer — serializes to UTF-8 BOM CSV string with legacy column order"
      exports: ["CsvSerializer"]
    - path: "src/common/serializers/txt.serializer.ts"
      provides: "TxtSerializer — serializes to tab-separated plaintext string"
      exports: ["TxtSerializer"]
    - path: "src/common/serializers/html.renderer.ts"
      provides: "HtmlRenderer — delegates to Nunjucks template engine; returns rendered HTML"
      exports: ["HtmlRenderer"]
    - path: "src/common/interceptors/serialization.interceptor.spec.ts"
      provides: "Unit tests verifying format selection and each serializer output"
  key_links:
    - from: "src/common/middleware/format.middleware.ts"
      to: "src/common/interceptors/serialization.interceptor.ts"
      via: "req.negotiatedFormat — middleware writes, interceptor reads"
      pattern: "negotiatedFormat"
    - from: "src/common/interceptors/serialization.interceptor.ts"
      to: "src/common/serializers/*.ts"
      via: "switch(negotiatedFormat) delegation"
      pattern: "JsonSerializer|XmlSerializer|CsvSerializer|TxtSerializer|HtmlRenderer"
    - from: "src/app.module.ts"
      to: "src/common/interceptors/serialization.interceptor.ts"
      via: "APP_INTERCEPTOR global registration"
      pattern: "APP_INTERCEPTOR"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "package.json"
      exports: ["@nestjs/core", "@nestjs/common"]
      verify: "grep -q '\"@nestjs/core\"' package.json && grep -q '\"@nestjs/common\"' package.json && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "src/app.module.ts"
      exports: ["AppModule"]
      verify: "grep -q 'AppModule' src/app.module.ts && echo CONTRACT_OK"
  provides:
    - artifact: "src/common/middleware/format.middleware.ts"
      exports: ["FormatMiddleware", "NegotiatedFormat"]
      shape: |
        export type NegotiatedFormat = 'json' | 'xml' | 'csv' | 'txt' | 'html';
        export class FormatMiddleware implements NestMiddleware {
          use(req: Request & { negotiatedFormat: NegotiatedFormat }, res: Response, next: NextFunction): void
        }
      verify: "grep -n 'export.*FormatMiddleware' src/common/middleware/format.middleware.ts && grep -n 'NegotiatedFormat' src/common/middleware/format.middleware.ts && echo CONTRACT_OK"
    - artifact: "src/common/interceptors/serialization.interceptor.ts"
      exports: ["SerializationInterceptor"]
      shape: |
        export class SerializationInterceptor implements NestInterceptor {
          intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>
        }
      verify: "grep -n 'export.*SerializationInterceptor' src/common/interceptors/serialization.interceptor.ts && echo CONTRACT_OK"
    - artifact: "src/common/serializers/json.serializer.ts"
      exports: ["JsonSerializer"]
      shape: |
        export class JsonSerializer {
          serialize(data: unknown): string
        }
      verify: "grep -n 'export.*JsonSerializer' src/common/serializers/json.serializer.ts && echo CONTRACT_OK"
    - artifact: "src/common/serializers/xml.serializer.ts"
      exports: ["XmlSerializer"]
      shape: |
        export class XmlSerializer {
          serialize(data: unknown, rootElement?: string): string
        }
      verify: "grep -n 'export.*XmlSerializer' src/common/serializers/xml.serializer.ts && echo CONTRACT_OK"
    - artifact: "src/common/serializers/csv.serializer.ts"
      exports: ["CsvSerializer"]
      shape: |
        export class CsvSerializer {
          serialize(data: unknown[], headers?: string[]): string
        }
      verify: "grep -n 'export.*CsvSerializer' src/common/serializers/csv.serializer.ts && echo CONTRACT_OK"
    - artifact: "src/common/serializers/txt.serializer.ts"
      exports: ["TxtSerializer"]
      shape: |
        export class TxtSerializer {
          serialize(data: unknown[]): string
        }
      verify: "grep -n 'export.*TxtSerializer' src/common/serializers/txt.serializer.ts && echo CONTRACT_OK"
    - artifact: "src/common/serializers/html.renderer.ts"
      exports: ["HtmlRenderer"]
      shape: |
        export class HtmlRenderer {
          render(template: string, data: unknown): Promise<string>
        }
      verify: "grep -n 'export.*HtmlRenderer' src/common/serializers/html.renderer.ts && echo CONTRACT_OK"
---

<objective>
Implement the global `SerializationInterceptor` and all five format serializers that replace the ~187 PHP `.inc` partial templates in the legacy application.

Purpose: This is a P0 cross-cutting component required by every subsequent wave. No endpoint can return the correct format without it. Wave 3 (RBAC), Wave 4 (Tickets + Open311), Wave 5 (Search, Media), and Wave 6 (Reports) all depend on format negotiation being wired globally.

Output:
- `src/common/middleware/format.middleware.ts` — resolves `Accept` header / URL suffix / `?format=` param → `req.negotiatedFormat`
- `src/common/interceptors/serialization.interceptor.ts` — global NestJS interceptor that delegates to the correct serializer
- `src/common/serializers/json.serializer.ts` — JSON with legacy field names, ISO 8601 dates, boolean true/false
- `src/common/serializers/xml.serializer.ts` — XML with `<?xml ...?>` declaration, CDATA on text fields, legacy tag names
- `src/common/serializers/csv.serializer.ts` — UTF-8 BOM CSV, header row, all strings double-quoted, booleans as 1/0
- `src/common/serializers/txt.serializer.ts` — tab-separated, no header, one record per line
- `src/common/serializers/html.renderer.ts` — Nunjucks delegate (stub for now; full templates delivered with each feature wave)
- Unit tests for format negotiation logic and each serializer
- `src/app.module.ts` updated to register `FormatMiddleware` and `SerializationInterceptor` globally
</objective>

<feature_dependencies>
Implements: F3: Content Negotiation & Multi-Format Serialization
Depends on: F6: MySQL-to-PostgreSQL Schema Migration (Wave 1 must have created the NestJS project scaffold — package.json, tsconfig.json, src/app.module.ts — which this plan extends)
Enables: F0: Open311 GeoReport v2 REST API (requires format negotiation for JSON/XML), F1: Ticket Lifecycle (history output in all 5 formats), F13: Reporting & Metrics (all 5 formats via interceptor)
</feature_dependencies>

<execution_context>
@.planning/express/modernize-legacy-php-ureport-open311-geo/WAVE-SCHEDULE.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@project_specs/FRD-uReport.md (F03 section, lines 769–901)
@project_specs/TechArch-uReport.md (§2.2 Cross-Cutting Components, §4.1 Global API Conventions)
@.planning/express/modernize-legacy-php-ureport-open311-geo/01-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: FormatMiddleware + SerializationInterceptor wired globally</name>
  <files>
    src/common/middleware/format.middleware.ts
    src/common/interceptors/serialization.interceptor.ts
    src/common/serializers/json.serializer.ts
    src/common/serializers/xml.serializer.ts
    src/common/serializers/csv.serializer.ts
    src/common/serializers/txt.serializer.ts
    src/common/serializers/html.renderer.ts
    src/app.module.ts
  </files>
  <action>
Create the `src/common/` directory structure and all serialization files. Then update `src/app.module.ts` to wire them globally.

---

### src/common/middleware/format.middleware.ts

Implements format resolution per FRD F03.1 priority order:
1. URL suffix (`.json`, `.xml`, `.csv`, `.txt`) — highest priority
2. `?format=json|xml|csv|txt` query parameter
3. `Accept` header content negotiation
4. Default: `json` for `/open311/v2/` routes; `html` for all others

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export type NegotiatedFormat = 'json' | 'xml' | 'csv' | 'txt' | 'html';

// Augment Express Request with negotiatedFormat
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      negotiatedFormat: NegotiatedFormat;
    }
  }
}

@Injectable()
export class FormatMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    req.negotiatedFormat = FormatMiddleware.resolve(req);
    next();
  }

  static resolve(req: Request): NegotiatedFormat {
    const path = req.path ?? '';

    // 1. URL suffix — strip the suffix from path before routing (NestJS sees the clean path)
    //    FormatMiddleware only READS the suffix; actual path rewriting is NOT done here.
    //    The Open311 controller registers routes without the suffix; Express path includes it.
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.xml'))  return 'xml';
    if (path.endsWith('.csv'))  return 'csv';
    if (path.endsWith('.txt'))  return 'txt';

    // 2. ?format= query parameter
    const fmt = (req.query as Record<string, string>)['format'];
    if (fmt === 'json' || fmt === 'xml' || fmt === 'csv' || fmt === 'txt' || fmt === 'html') {
      return fmt as NegotiatedFormat;
    }

    // 3. Accept header
    const accept = req.headers['accept'] ?? '';
    if (accept.includes('application/json') || accept.includes('application/javascript')) return 'json';
    if (accept.includes('application/xml')  || accept.includes('text/xml'))               return 'xml';
    if (accept.includes('text/csv'))                                                        return 'csv';
    if (accept.includes('text/plain'))                                                      return 'txt';
    if (accept.includes('text/html'))                                                       return 'html';

    // 4. Default: JSON for Open311 routes, HTML for everything else
    return path.startsWith('/open311/v2') ? 'json' : 'html';
  }
}
```

---

### src/common/serializers/json.serializer.ts

Per FRD F03.3 requirements:
- Field names match legacy PHP field names (camelCase as-is — no snake_case conversion)
- `null` values are kept as `null` (not omitted)
- Booleans are `true`/`false` (not `1`/`0`)
- Dates are ISO 8601 UTC strings
- Empty collections return `[]` not `null`
- Single Open311 results are wrapped in an array by the controller (not here — the serializer is format-agnostic)

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class JsonSerializer {
  serialize(data: unknown): string {
    return JSON.stringify(data, (_key, value: unknown) => {
      // Dates → ISO 8601 UTC string
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
  }
}
```

---

### src/common/serializers/xml.serializer.ts

Per FRD F03.4 requirements:
- `<?xml version="1.0" encoding="UTF-8"?>` declaration must be present
- Root element name passed by caller (e.g., `services`, `service_requests`, `tickets`)
- CDATA wrapping for `description`, `notes`, `template` fields (field names checked case-insensitively)
- Empty elements rendered as `<tag/>`
- All values escaped (except CDATA fields)
- Child element tag names = object key names exactly (legacy compatibility)

```typescript
import { Injectable } from '@nestjs/common';

// Fields that must be wrapped in CDATA (from FRD F03.4 + legacy PHP behavior)
const CDATA_FIELDS = new Set(['description', 'notes', 'template', 'full_message', 'short_message']);

@Injectable()
export class XmlSerializer {
  serialize(data: unknown, rootElement = 'response'): string {
    const body = this.valueToXml(data, rootElement);
    return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
  }

  private valueToXml(value: unknown, tag: string): string {
    if (value === null || value === undefined) {
      return `<${tag}/>`;
    }
    if (Array.isArray(value)) {
      // Array items use the singular form of the tag (strip trailing 's' for simple plurals)
      // For Open311 envelopes the caller passes the correct wrapper; items use 'item' by default.
      const items = value.map(item => this.valueToXml(item, this.singularize(tag))).join('');
      return `<${tag}>${items}</${tag}>`;
    }
    if (value instanceof Date) {
      return `<${tag}>${value.toISOString()}</${tag}>`;
    }
    if (typeof value === 'object') {
      const children = Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => this.valueToXml(v, k))
        .join('');
      return `<${tag}>${children}</${tag}>`;
    }
    if (typeof value === 'boolean') {
      return `<${tag}>${value ? 'true' : 'false'}</${tag}>`;
    }
    // String — check CDATA
    const strVal = String(value);
    if (CDATA_FIELDS.has(tag.toLowerCase())) {
      return `<${tag}><![CDATA[${strVal}]]></${tag}>`;
    }
    return `<${tag}>${this.escapeXml(strVal)}</${tag}>`;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private singularize(tag: string): string {
    // Simple singularization for common plural wrappers used in Open311/legacy output
    if (tag === 'services') return 'service';
    if (tag === 'service_requests') return 'request';
    if (tag === 'tickets') return 'ticket';
    if (tag === 'results') return 'result';
    if (tag === 'items') return 'item';
    if (tag.endsWith('s')) return tag.slice(0, -1);
    return tag;
  }
}
```

---

### src/common/serializers/csv.serializer.ts

Per FRD F03.5 requirements:
- UTF-8 BOM (`\xEF\xBB\xBF`) for Excel compatibility
- First row is header row with column names matching the object keys
- All string values double-quoted
- Newlines within a field represented as `\n` within the quoted string
- Date columns use ISO 8601 format
- Boolean columns use `1`/`0` (NOT `true`/`false` — legacy CSV behavior)
- `Content-Disposition: attachment; filename="{entity}-{date}.csv"` set by the interceptor (not here)

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class CsvSerializer {
  /** UTF-8 BOM prepended for Excel compatibility (FRD F03.5) */
  static readonly BOM = '\xEF\xBB\xBF';

  serialize(data: unknown, headers?: string[]): string {
    const rows = Array.isArray(data) ? data : [data];
    if (rows.length === 0) {
      return CsvSerializer.BOM;
    }

    // Derive column order from first row keys, or from explicit headers
    const firstRow = rows[0] as Record<string, unknown>;
    const cols: string[] = headers ?? Object.keys(firstRow);

    const headerRow = cols.map(h => this.quoteField(h)).join(',');
    const dataRows = rows.map(row => {
      const r = row as Record<string, unknown>;
      return cols.map(col => this.formatField(r[col])).join(',');
    });

    return CsvSerializer.BOM + [headerRow, ...dataRows].join('\r\n');
  }

  private formatField(value: unknown): string {
    if (value === null || value === undefined) return '""';
    if (value instanceof Date) return this.quoteField(value.toISOString());
    if (typeof value === 'boolean') return value ? '1' : '0';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') return this.quoteField(JSON.stringify(value));
    // String — double-quote, escape internal quotes, encode newlines
    return this.quoteField(String(value));
  }

  private quoteField(str: string): string {
    // Escape embedded double-quotes by doubling them; encode newlines as \n literal
    const escaped = str.replace(/"/g, '""').replace(/\r?\n/g, '\\n');
    return `"${escaped}"`;
  }
}
```

---

### src/common/serializers/txt.serializer.ts

Per FRD F03.6 requirements:
- One record per line
- Fields separated by tab (`\t`)
- No header row
- Match legacy field order exactly (object key insertion order is preserved — controllers return objects with keys in legacy order)
- `Content-Type: text/plain; charset=utf-8`

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class TxtSerializer {
  serialize(data: unknown): string {
    const rows = Array.isArray(data) ? data : [data];
    return rows.map(row => this.rowToLine(row as Record<string, unknown>)).join('\n');
  }

  private rowToLine(row: Record<string, unknown>): string {
    return Object.values(row)
      .map(v => this.fieldToString(v))
      .join('\t');
  }

  private fieldToString(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'boolean') return value ? '1' : '0';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}
```

---

### src/common/serializers/html.renderer.ts

Stub implementation for Wave 2. Full templates are delivered per-feature in Waves 3–6. The stub renders a simple JSON dump wrapped in `<pre>` for development; the template path resolution will be completed as feature modules are built.

Install nunjucks: add `"nunjucks": "^3.2.4"` and `"@types/nunjucks": "^3.2.6"` to package.json.

```typescript
import { Injectable } from '@nestjs/common';
import * as nunjucks from 'nunjucks';
import * as path from 'path';

@Injectable()
export class HtmlRenderer {
  private readonly env: nunjucks.Environment;

  constructor() {
    // Templates live in src/views/ (created per feature module in later waves)
    const viewsDir = path.join(process.cwd(), 'src', 'views');
    this.env = new nunjucks.Environment(
      new nunjucks.FileSystemLoader(viewsDir, { noCache: process.env['NODE_ENV'] !== 'production' }),
      { autoescape: true },
    );
  }

  async render(template: string, data: unknown): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.env.render(template, { data } as Record<string, unknown>, (err, result) => {
        if (err || result === null) {
          // Fallback: JSON dump in pre — used during development before full templates exist
          resolve(`<html><body><pre>${JSON.stringify(data, null, 2)}</pre></body></html>`);
          return;
        }
        resolve(result);
      });
    });
  }
}
```

---

### src/common/interceptors/serialization.interceptor.ts

Per TechArch §2.2 / FRD F03.2:
- Reads `req.negotiatedFormat` (set by FormatMiddleware)
- Delegates to the appropriate serializer
- Sets `Content-Type` header
- For CSV: sets `Content-Disposition: attachment; filename="{entity}-{date}.csv"`
- Handles both array and single-object controller return values
- Error responses: format-negotiated per FRD F03.8

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Response, Request } from 'express';
import { NegotiatedFormat } from '../middleware/format.middleware';
import { JsonSerializer } from '../serializers/json.serializer';
import { XmlSerializer } from '../serializers/xml.serializer';
import { CsvSerializer } from '../serializers/csv.serializer';
import { TxtSerializer } from '../serializers/txt.serializer';
import { HtmlRenderer } from '../serializers/html.renderer';

@Injectable()
export class SerializationInterceptor implements NestInterceptor {
  constructor(
    private readonly json: JsonSerializer,
    private readonly xml: XmlSerializer,
    private readonly csv: CsvSerializer,
    private readonly txt: TxtSerializer,
    private readonly html: HtmlRenderer,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { negotiatedFormat?: NegotiatedFormat }>();
    const res = http.getResponse<Response>();

    const format: NegotiatedFormat = req.negotiatedFormat ?? 'json';

    return next.handle().pipe(
      map(async (data: unknown) => {
        await this.write(res, format, data);
        // Return undefined — response already written
        return undefined;
      }),
      catchError((err: unknown) =>
        throwError(() => this.formatError(res, format, err)),
      ),
    );
  }

  private async write(res: Response, format: NegotiatedFormat, data: unknown): Promise<void> {
    // Determine root XML element name from the data shape
    const rootElement = Array.isArray(data) ? 'items' : 'item';

    switch (format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.end(this.json.serialize(data));
        break;

      case 'xml':
        res.setHeader('Content-Type', 'application/xml');
        res.end(this.xml.serialize(data, rootElement));
        break;

      case 'csv': {
        const date = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="export-${date}.csv"`);
        const rows = Array.isArray(data) ? data : [data];
        res.end(this.csv.serialize(rows));
        break;
      }

      case 'txt':
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(this.txt.serialize(data));
        break;

      case 'html': {
        res.setHeader('Content-Type', 'text/html');
        // Template name is set on the response by the controller via a custom header;
        // fall back to a JSON dump if not set (development mode).
        const template = (res.getHeader('X-Template') as string | undefined) ?? '';
        const rendered = await this.html.render(template, data);
        res.end(rendered);
        break;
      }
    }
  }

  private formatError(res: Response, format: NegotiatedFormat, err: unknown): unknown {
    const httpErr = err instanceof HttpException ? err : null;
    const statusCode = httpErr?.getStatus() ?? 500;
    const message = httpErr?.message ?? 'Internal server error';
    const errorCode = httpErr
      ? (httpErr.getResponse() as Record<string, unknown>)?.['error'] ?? 'Error'
      : 'INTERNAL_SERVER_ERROR';

    res.status(statusCode);

    switch (format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ statusCode, error: errorCode, message }));
        break;
      case 'xml':
        res.setHeader('Content-Type', 'application/xml');
        res.end(
          `<?xml version="1.0" encoding="UTF-8"?><error><description>${message}</description><code>${statusCode}</code></error>`,
        );
        break;
      case 'csv':
      case 'txt':
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(`Error ${statusCode}: ${message}`);
        break;
      case 'html':
        res.setHeader('Content-Type', 'text/html');
        res.end(`<html><body><h1>Error ${statusCode}</h1><p>${message}</p></body></html>`);
        break;
    }

    // Return the original error so NestJS exception filters can still log it
    return err;
  }
}
```

---

### src/app.module.ts (update)

Replace the stub from Plan 01 to register `FormatMiddleware` globally and `SerializationInterceptor` as an `APP_INTERCEPTOR`. Add `nunjucks` install step.

```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { FormatMiddleware } from './common/middleware/format.middleware';
import { SerializationInterceptor } from './common/interceptors/serialization.interceptor';
import { JsonSerializer } from './common/serializers/json.serializer';
import { XmlSerializer } from './common/serializers/xml.serializer';
import { CsvSerializer } from './common/serializers/csv.serializer';
import { TxtSerializer } from './common/serializers/txt.serializer';
import { HtmlRenderer } from './common/serializers/html.renderer';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    // Feature modules imported here as they are built in subsequent waves
  ],
  providers: [
    JsonSerializer,
    XmlSerializer,
    CsvSerializer,
    TxtSerializer,
    HtmlRenderer,
    {
      provide: APP_INTERCEPTOR,
      useClass: SerializationInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply FormatMiddleware to all routes globally
    consumer.apply(FormatMiddleware).forRoutes('*');
  }
}
```

Also add `nunjucks` to package.json under `"dependencies"`:
```json
"nunjucks": "^3.2.4"
```
And under `"devDependencies"`:
```json
"@types/nunjucks": "^3.2.6"
```
  </action>
  <verify>
```bash
npm install 2>&1 | tail -5 && echo "NPM_OK"
npx tsc --noEmit 2>&1 | head -30 && echo "TSC OK"
grep -n 'export.*FormatMiddleware' src/common/middleware/format.middleware.ts && echo "FORMAT_MIDDLEWARE_OK"
grep -n 'export.*SerializationInterceptor' src/common/interceptors/serialization.interceptor.ts && echo "INTERCEPTOR_OK"
grep -n 'APP_INTERCEPTOR' src/app.module.ts && echo "GLOBAL_INTERCEPTOR_OK"
grep -n 'FormatMiddleware' src/app.module.ts && echo "FORMAT_MIDDLEWARE_WIRED_OK"
grep -n 'export.*JsonSerializer' src/common/serializers/json.serializer.ts && echo "JSON_OK"
grep -n 'export.*XmlSerializer' src/common/serializers/xml.serializer.ts && echo "XML_OK"
grep -n 'export.*CsvSerializer' src/common/serializers/csv.serializer.ts && echo "CSV_OK"
grep -n 'export.*TxtSerializer' src/common/serializers/txt.serializer.ts && echo "TXT_OK"
grep -n 'export.*HtmlRenderer' src/common/serializers/html.renderer.ts && echo "HTML_OK"
```
  </verify>
  <done>
- `npm install` exits 0 (nunjucks installed)
- `npx tsc --noEmit` exits 0 with zero TypeScript errors
- All 7 source files exist with correct exports
- `APP_INTERCEPTOR` and `FormatMiddleware` are both registered in `src/app.module.ts`
- `FormatMiddleware.resolve()` covers all 4 priority levels (suffix → ?format= → Accept header → default)
- `XmlSerializer` wraps `description`, `notes`, `template` fields in `<![CDATA[...]]>`
- `CsvSerializer.BOM` is `\xEF\xBB\xBF` (UTF-8 BOM)
- `CsvSerializer` serializes booleans as `1`/`0` not `true`/`false`
- `TxtSerializer` produces tab-separated values with no header row
  </done>
</task>

<task type="auto">
  <name>Task 2: Unit tests for FormatMiddleware and serializers</name>
  <files>
    src/common/interceptors/serialization.interceptor.spec.ts
  </files>
  <action>
Create unit tests covering the format negotiation logic and each serializer's output contract. Tests use Jest (already in package.json from Plan 01). No live HTTP server required — pure unit tests against the class methods.

```typescript
/**
 * serialization.interceptor.spec.ts
 *
 * Tests for:
 *   1. FormatMiddleware.resolve() — all 4 priority levels
 *   2. JsonSerializer.serialize()
 *   3. XmlSerializer.serialize()
 *   4. CsvSerializer.serialize()
 *   5. TxtSerializer.serialize()
 *
 * These tests verify byte-compatible output per FRD F03.3–F03.6.
 * Full snapshot tests against legacy PHP output will run in Wave 4 integration tests.
 */

import { FormatMiddleware } from '../middleware/format.middleware';
import { JsonSerializer } from '../serializers/json.serializer';
import { XmlSerializer } from '../serializers/xml.serializer';
import { CsvSerializer } from '../serializers/csv.serializer';
import { TxtSerializer } from '../serializers/txt.serializer';
import type { Request } from 'express';

// ---- helpers ----------------------------------------------------------------
function makeReq(
  overrides: Partial<{
    path: string;
    query: Record<string, string>;
    headers: Record<string, string>;
  }> = {},
): Partial<Request> {
  return {
    path: overrides.path ?? '/',
    query: overrides.query ?? {},
    headers: overrides.headers ?? {},
  };
}

// ---- FormatMiddleware -------------------------------------------------------

describe('FormatMiddleware.resolve()', () => {
  // Priority 1: URL suffix
  test('returns json for .json suffix', () => {
    expect(FormatMiddleware.resolve(makeReq({ path: '/tickets.json' }) as Request)).toBe('json');
  });
  test('returns xml for .xml suffix', () => {
    expect(FormatMiddleware.resolve(makeReq({ path: '/tickets.xml' }) as Request)).toBe('xml');
  });
  test('returns csv for .csv suffix', () => {
    expect(FormatMiddleware.resolve(makeReq({ path: '/tickets.csv' }) as Request)).toBe('csv');
  });
  test('returns txt for .txt suffix', () => {
    expect(FormatMiddleware.resolve(makeReq({ path: '/tickets.txt' }) as Request)).toBe('txt');
  });

  // Priority 2: ?format= param
  test('returns xml for ?format=xml (no suffix)', () => {
    expect(FormatMiddleware.resolve(makeReq({ path: '/tickets', query: { format: 'xml' } }) as Request)).toBe('xml');
  });
  test('returns html for ?format=html', () => {
    expect(FormatMiddleware.resolve(makeReq({ path: '/tickets', query: { format: 'html' } }) as Request)).toBe('html');
  });

  // Priority 3: Accept header
  test('returns json for Accept: application/json (no suffix, no param)', () => {
    expect(FormatMiddleware.resolve(makeReq({ headers: { accept: 'application/json' } }) as Request)).toBe('json');
  });
  test('returns xml for Accept: application/xml', () => {
    expect(FormatMiddleware.resolve(makeReq({ headers: { accept: 'application/xml' } }) as Request)).toBe('xml');
  });
  test('returns csv for Accept: text/csv', () => {
    expect(FormatMiddleware.resolve(makeReq({ headers: { accept: 'text/csv' } }) as Request)).toBe('csv');
  });
  test('returns txt for Accept: text/plain', () => {
    expect(FormatMiddleware.resolve(makeReq({ headers: { accept: 'text/plain' } }) as Request)).toBe('txt');
  });
  test('returns html for Accept: text/html', () => {
    expect(FormatMiddleware.resolve(makeReq({ headers: { accept: 'text/html' } }) as Request)).toBe('html');
  });

  // Priority 4: Default
  test('defaults to json for Open311 routes', () => {
    expect(FormatMiddleware.resolve(makeReq({ path: '/open311/v2/services' }) as Request)).toBe('json');
  });
  test('defaults to html for non-Open311 routes', () => {
    expect(FormatMiddleware.resolve(makeReq({ path: '/tickets' }) as Request)).toBe('html');
  });

  // Suffix beats Accept header
  test('suffix overrides Accept header', () => {
    const req = makeReq({ path: '/tickets.xml', headers: { accept: 'application/json' } }) as Request;
    expect(FormatMiddleware.resolve(req)).toBe('xml');
  });
  // Suffix beats ?format=
  test('suffix overrides ?format= param', () => {
    const req = makeReq({ path: '/tickets.csv', query: { format: 'json' } }) as Request;
    expect(FormatMiddleware.resolve(req)).toBe('csv');
  });
  // ?format= beats Accept header
  test('?format= overrides Accept header', () => {
    const req = makeReq({ path: '/tickets', query: { format: 'txt' }, headers: { accept: 'application/json' } }) as Request;
    expect(FormatMiddleware.resolve(req)).toBe('txt');
  });
});

// ---- JsonSerializer --------------------------------------------------------

describe('JsonSerializer', () => {
  const s = new JsonSerializer();

  test('serializes array to JSON array string', () => {
    const result = s.serialize([{ id: 1, name: 'Pothole' }]);
    expect(JSON.parse(result)).toEqual([{ id: 1, name: 'Pothole' }]);
  });

  test('preserves null values (not omitted)', () => {
    const result = s.serialize({ description: null, notes: null });
    expect(JSON.parse(result)).toEqual({ description: null, notes: null });
  });

  test('serializes booleans as true/false not 1/0', () => {
    const result = s.serialize({ active: true, featured: false });
    expect(result).toContain('true');
    expect(result).toContain('false');
    expect(result).not.toContain('"active":1');
  });

  test('serializes Date to ISO 8601 UTC string', () => {
    const d = new Date('2024-01-15T14:30:00.000Z');
    const result = s.serialize({ enteredDate: d });
    expect(JSON.parse(result)).toEqual({ enteredDate: '2024-01-15T14:30:00.000Z' });
  });

  test('empty array serializes to []', () => {
    expect(s.serialize([])).toBe('[]');
  });
});

// ---- XmlSerializer ---------------------------------------------------------

describe('XmlSerializer', () => {
  const s = new XmlSerializer();

  test('includes XML declaration', () => {
    const result = s.serialize({}, 'item');
    expect(result).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });

  test('wraps description in CDATA', () => {
    const result = s.serialize({ description: 'A pothole on Main St' }, 'ticket');
    expect(result).toContain('<![CDATA[A pothole on Main St]]>');
  });

  test('wraps notes in CDATA', () => {
    const result = s.serialize({ notes: 'Staff note here' }, 'history');
    expect(result).toContain('<![CDATA[Staff note here]]>');
  });

  test('renders null as empty self-closing tag', () => {
    const result = s.serialize({ closedDate: null }, 'ticket');
    expect(result).toContain('<closedDate/>');
  });

  test('escapes & in non-CDATA fields', () => {
    const result = s.serialize({ name: 'Cats & Dogs' }, 'category');
    expect(result).toContain('&amp;');
  });

  test('renders boolean as true/false string', () => {
    const result = s.serialize({ active: true }, 'category');
    expect(result).toContain('<active>true</active>');
  });

  test('services array uses service as child tag', () => {
    const result = s.serialize([{ service_code: 1 }], 'services');
    expect(result).toContain('<services>');
    expect(result).toContain('<service>');
    expect(result).toContain('</services>');
  });

  test('service_requests array uses request as child tag', () => {
    const result = s.serialize([{ service_request_id: 42 }], 'service_requests');
    expect(result).toContain('<service_requests>');
    expect(result).toContain('<request>');
  });
});

// ---- CsvSerializer ---------------------------------------------------------

describe('CsvSerializer', () => {
  const s = new CsvSerializer();

  test('output starts with UTF-8 BOM', () => {
    const result = s.serialize([{ id: 1 }]);
    expect(result.charCodeAt(0)).toBe(0xef);
    expect(result.charCodeAt(1)).toBe(0xbb);
    expect(result.charCodeAt(2)).toBe(0xbf);
  });

  test('first row is header row with column names', () => {
    const result = s.serialize([{ id: 1, name: 'Pothole' }]);
    const lines = result.slice(3).split('\r\n'); // skip BOM
    expect(lines[0]).toBe('"id","name"');
  });

  test('booleans are serialized as 1/0 not true/false', () => {
    const result = s.serialize([{ active: true, featured: false }]);
    const lines = result.slice(3).split('\r\n');
    expect(lines[1]).toBe('1,0');
  });

  test('strings are double-quoted', () => {
    const result = s.serialize([{ name: 'Pothole' }]);
    expect(result).toContain('"Pothole"');
  });

  test('null values produce empty quoted string', () => {
    const result = s.serialize([{ description: null }]);
    const lines = result.slice(3).split('\r\n');
    expect(lines[1]).toBe('""');
  });

  test('dates are ISO 8601', () => {
    const d = new Date('2024-01-15T14:30:00.000Z');
    const result = s.serialize([{ enteredDate: d }]);
    expect(result).toContain('2024-01-15T14:30:00.000Z');
  });

  test('empty array returns only BOM', () => {
    const result = s.serialize([]);
    expect(result).toBe(CsvSerializer.BOM);
  });

  test('embedded newlines become \\n within quoted field', () => {
    const result = s.serialize([{ notes: 'line one\nline two' }]);
    expect(result).toContain('"line one\\nline two"');
  });
});

// ---- TxtSerializer ---------------------------------------------------------

describe('TxtSerializer', () => {
  const s = new TxtSerializer();

  test('produces tab-separated values', () => {
    const result = s.serialize([{ id: 1, name: 'Pothole', status: 'open' }]);
    expect(result).toBe('1\tPothole\topen');
  });

  test('no header row', () => {
    const result = s.serialize([{ id: 1, name: 'Pothole' }]);
    // Should not contain a line that looks like column names
    expect(result).not.toContain('id\tname');
  });

  test('multiple records produce multiple lines', () => {
    const result = s.serialize([
      { id: 1, name: 'Pothole' },
      { id: 2, name: 'Graffiti' },
    ]);
    const lines = result.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('1\tPothole');
    expect(lines[1]).toBe('2\tGraffiti');
  });

  test('null values produce empty string field', () => {
    const result = s.serialize([{ id: 1, description: null }]);
    expect(result).toBe('1\t');
  });

  test('booleans are 1/0', () => {
    const result = s.serialize([{ active: true, featured: false }]);
    expect(result).toBe('1\t0');
  });
});
```
  </action>
  <verify>
```bash
npx jest src/common/interceptors/serialization.interceptor.spec.ts --no-coverage 2>&1 | tail -20 && echo "JEST PASSED"
```
  </verify>
  <done>
- `src/common/interceptors/serialization.interceptor.spec.ts` exists
- All Jest tests in the file pass (0 failing, 0 skipped)
- Tests cover: FormatMiddleware priority order (12+ cases), JsonSerializer (5 cases), XmlSerializer (7 cases), CsvSerializer (8 cases), TxtSerializer (5 cases)
- `npx jest` exits 0 for this spec file
  </done>
</task>

</tasks>

<verification>
After both tasks complete, run:

```bash
# TypeScript compilation
npx tsc --noEmit 2>&1 | head -20 && echo "TSC OK"

# Unit tests
npx jest src/common/interceptors/serialization.interceptor.spec.ts --no-coverage 2>&1 | tail -20 && echo "JEST OK"

# File existence checks
test -f src/common/middleware/format.middleware.ts && echo "FormatMiddleware OK"
test -f src/common/interceptors/serialization.interceptor.ts && echo "Interceptor OK"
test -f src/common/serializers/json.serializer.ts && echo "JsonSerializer OK"
test -f src/common/serializers/xml.serializer.ts && echo "XmlSerializer OK"
test -f src/common/serializers/csv.serializer.ts && echo "CsvSerializer OK"
test -f src/common/serializers/txt.serializer.ts && echo "TxtSerializer OK"
test -f src/common/serializers/html.renderer.ts && echo "HtmlRenderer OK"

# Global wiring
grep -q 'APP_INTERCEPTOR' src/app.module.ts && echo "INTERCEPTOR_GLOBAL_OK"
grep -q 'FormatMiddleware' src/app.module.ts && echo "FORMAT_MW_GLOBAL_OK"

# Integration contract checks
grep -n 'export.*FormatMiddleware' src/common/middleware/format.middleware.ts && grep -n 'NegotiatedFormat' src/common/middleware/format.middleware.ts && echo "CONTRACT_OK"
grep -n 'export.*SerializationInterceptor' src/common/interceptors/serialization.interceptor.ts && echo "CONTRACT_OK"
```

Expected: TSC exits 0, all Jest tests pass, all files exist, global registration confirmed.
</verification>

<success_criteria>
- `npx tsc --noEmit` exits 0 with zero errors under TypeScript strict mode
- All Jest tests in `serialization.interceptor.spec.ts` pass (≥37 test cases)
- `FormatMiddleware` is registered as global middleware in `AppModule.configure()`
- `SerializationInterceptor` is registered as `APP_INTERCEPTOR` in `AppModule.providers`
- Format resolution priority is exactly: URL suffix > ?format= param > Accept header > default
- Default format is `json` for `/open311/v2/` routes and `html` for all other routes
- JSON serializer preserves `null`, uses `true`/`false`, ISO 8601 dates
- XML serializer wraps `description`, `notes`, `template` in `<![CDATA[...]]>`, includes XML declaration
- CSV serializer emits UTF-8 BOM, header row, double-quoted strings, `1`/`0` booleans
- TXT serializer emits tab-separated values, no header row
- All serializers are injectable NestJS providers — later feature modules can inject them directly
- HtmlRenderer delegates to Nunjucks with graceful fallback for missing templates (development mode)
</success_criteria>

<output>
After completion, create `.planning/express/modernize-legacy-php-ureport-open311-geo/03-SUMMARY.md` with:
- Files created/modified and their purpose
- Any deviations from the plan (with rationale)
- tsc --noEmit output
- Jest test results (pass count)
- Notes for Wave 2 successors: how to use NegotiatedFormat type, how to set X-Template header for HTML rendering, how serializers are injected
</output>
