---
phase: wave-5-integration
plan: 12
type: execute
wave: 5
depends_on: [4]
files_modified:
  - src/modules/search/search.module.ts
  - src/modules/search/search.controller.ts
  - src/modules/search/search.service.ts
  - src/modules/search/solr.service.ts
  - src/modules/search/dto/search-query.dto.ts
  - src/modules/tickets/tickets.service.ts
  - scripts/reindex-solr.ts
  - src/app.module.ts
autonomous: true

features:
  implements: ["F5"]
  depends_on: ["F1", "F6", "F2", "F3"]
  enables: ["F12"]

must_haves:
  truths:
    - "GET /search returns results via Solr eDisMax query in ≤ 500ms; role-based category_id filter injected as fq"
    - "GET /search supports ?q, ?status, ?category_id, ?department_id, ?assignedPerson_id, ?start_date, ?end_date, ?sort, ?page, ?rows"
    - "GET /search response includes total, page, rows, results[], and facets.categories/statuses/departments"
    - "GET /search returns HTTP 503 SEARCH_UNAVAILABLE when Solr is unreachable"
    - "Ticket create/update/close triggers SolrService.indexTicket() as fire-and-forget; Solr failure logs WARN via GELF but never fails the ticket write"
    - "SolrService.indexTicket() builds document from exact Solr field names: id, status, description, category_id, category_name, department_id, department_name, assignedPerson_id, enteredDate, lastModified, location, city, latitude, longitude, substatus_id, substatus_name, issueType_id, customFields"
    - "scripts/reindex-solr.ts deletes all Solr docs, loads tickets in batches of 500, submits batch add, issues final commit, exits non-zero on error"
    - "GET /search response is available in all five formats via SerializationInterceptor (JSON/XML/CSV/TXT/HTML)"
    - "SearchModule exports SolrService for consumption by TicketsService (Wave 4 hooks)"
  artifacts:
    - path: "src/modules/search/solr.service.ts"
      provides: "SolrService: indexTicket(), deleteTicket(), search(), buildDocument()"
      exports: ["SolrService"]
    - path: "src/modules/search/search.service.ts"
      provides: "SearchService: search() orchestrating eDisMax query construction, facet config, role-visibility filter injection, result mapping"
      exports: ["SearchService"]
    - path: "src/modules/search/search.controller.ts"
      provides: "SearchController: GET /search with all query params, all-five-format support via SerializationInterceptor"
      exports: ["SearchController"]
    - path: "src/modules/search/search.module.ts"
      provides: "SearchModule exporting SolrService for TicketsService injection"
      exports: ["SearchModule", "SolrService"]
    - path: "scripts/reindex-solr.ts"
      provides: "Standalone re-index script: deleteByQuery, batch add 500, final commit"
      exports: []
  key_links:
    - from: "src/modules/tickets/tickets.service.ts"
      to: "src/modules/search/solr.service.ts"
      via: "SolrService.indexTicket() called fire-and-forget after create/update/close"
      pattern: "solrService\\.indexTicket"
    - from: "src/modules/search/search.service.ts"
      to: "src/modules/search/solr.service.ts"
      via: "SolrService.search() for eDisMax query execution"
      pattern: "solrService\\.search"
    - from: "src/modules/search/solr.service.ts"
      to: "prisma/schema.prisma"
      via: "PrismaService query joining tickets+categories+departments+substatus for document build"
      pattern: "prisma\\.tickets\\.findUnique"
    - from: "src/app.module.ts"
      to: "src/modules/search/search.module.ts"
      via: "AppModule imports"
      pattern: "SearchModule"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "prisma/schema.prisma"
      exports: ["tickets", "ticketHistory", "categories", "departments", "substatus", "issueTypes"]
      verify: "grep -n 'model tickets' prisma/schema.prisma && grep -n 'model categories' prisma/schema.prisma && grep -n 'model departments' prisma/schema.prisma && grep -n 'model substatus' prisma/schema.prisma && echo CONTRACT_OK"
    - from_plan: "09"
      artifact: "src/modules/tickets/tickets.module.ts"
      exports: ["TicketsModule", "TicketsService"]
      verify: "grep -n 'export class TicketsModule' src/modules/tickets/tickets.module.ts && grep -n 'TicketsService' src/modules/tickets/tickets.module.ts && echo CONTRACT_OK"
    - from_plan: "10"
      artifact: "src/modules/tickets/tickets.service.ts"
      exports: ["TicketsService"]
      verify: "grep -n 'export class TicketsService' src/modules/tickets/tickets.service.ts && grep -n 'close\|duplicate\|addComment\|reopen\|getHistory' src/modules/tickets/tickets.service.ts && echo CONTRACT_OK"
    - from_plan: "06"
      artifact: "src/common/interceptors/pii-mask.interceptor.ts"
      exports: ["PiiMaskInterceptor"]
      verify: "grep -n 'export class PiiMaskInterceptor' src/common/interceptors/pii-mask.interceptor.ts && echo CONTRACT_OK"
    - from_plan: "03"
      artifact: "src/common/interceptors/serialization.interceptor.ts"
      exports: ["SerializationInterceptor"]
      verify: "grep -n 'export.*SerializationInterceptor' src/common/interceptors/serialization.interceptor.ts && echo CONTRACT_OK"
  provides:
    - artifact: "src/modules/search/search.module.ts"
      exports: ["SearchModule", "SolrService"]
      shape: |
        @Module({
          imports: [PrismaModule, ConfigModule],
          controllers: [SearchController],
          providers: [SearchService, SolrService],
          exports: [SolrService],
        })
        export class SearchModule {}
      verify: "grep -n 'export class SearchModule' src/modules/search/search.module.ts && grep -n 'SolrService' src/modules/search/search.module.ts && echo CONTRACT_OK"
    - artifact: "src/modules/search/solr.service.ts"
      exports: ["SolrService"]
      shape: |
        @Injectable()
        export class SolrService {
          indexTicket(ticketId: number): Promise<void>   // fire-and-forget safe; GELF warn on failure
          deleteTicket(ticketId: number): Promise<void>
          search(params: SolrSearchParams): Promise<SolrSearchResult>
          buildDocument(ticket: TicketWithRelations): SolrDocument
        }
      verify: "grep -n 'export class SolrService' src/modules/search/solr.service.ts && grep -n 'indexTicket\|deleteTicket\|search\|buildDocument' src/modules/search/solr.service.ts && echo CONTRACT_OK"
---

<objective>
Implement the `SearchModule` (F5) — the full-text Solr search integration for uReport. This includes:
1. `SolrService` — thin wrapper around the `solr-client` npm package that builds exact-field-name Solr documents (F05.1 schema), executes eDisMax queries, and indexes tickets fire-and-forget on mutations.
2. `SearchService` — orchestrates query construction (F05.3 params: `q.alt=*:*`, `qf=description^2 location^1.5 city^1 customFields^1`, `mm=75%`, `pf=description^4`), facet configuration (category, status, department), role-visibility filter injection, and result mapping.
3. `SearchController` — `GET /search` with all query params, all-five-format output via global `SerializationInterceptor`, HTTP 503 on Solr unreachability.
4. Incremental indexing hooks wired into `TicketsService.create/update/close` as fire-and-forget (Solr failure must NOT fail ticket writes).
5. `scripts/reindex-solr.ts` — bulk re-index script: deleteByQuery `*:*`, batch-500 add, final commit, non-zero exit on error.

Purpose: F5 enables the Solr-powered search that case workers and residents rely on (JTBD-03.1 queue triage, JTBD-03.3 duplicate detection, JTBD-02.3 bookmarkable searches). It must reproduce the legacy Solarium query behavior exactly so search result sets are identical on the migrated data.

Output:
- `src/modules/search/` — complete SearchModule
- `src/modules/tickets/tickets.service.ts` — updated with SolrService fire-and-forget hooks
- `scripts/reindex-solr.ts` — standalone re-index script
- `src/app.module.ts` — updated to import SearchModule
</objective>

<feature_dependencies>
Implements: F5: Full-Text Search via Apache Solr — SolrService using `solr-client` npm package; eDisMax query handler with field boosts (description^2, location^1.5, city^1, customFields^1); exact Solr field names matching legacy Solarium schema (id, status, description, category_id, category_name, department_id, department_name, assignedPerson_id, enteredDate, lastModified, location, city, latitude, longitude, substatus_id, substatus_name, issueType_id, customFields); facets (categories, statuses, departments); incremental indexing on ticket create/update/close; re-index script (scripts/reindex-solr.ts); Solr unavailability must NOT fail ticket writes; search results feed into bookmark requestUri (F12 dependency)
Depends on: F1: TicketsService (ticket mutations trigger indexing hooks); F6: Prisma schema (tickets+categories+departments+substatus joins for document build); F2: RBAC (role-visibility category_id fq filter injected into every Solr query); F3: SerializationInterceptor (GET /search supports all five formats)
Enables: F12: BookmarksModule saves/recalls search URLs from /search endpoint
</feature_dependencies>

<execution_context>
@.planning/express/modernize-legacy-php-ureport-open311-geo/WAVE-SCHEDULE.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@project_specs/FRD-uReport.md (F05 section §F05.1–F05.6, §Search API surface §2910)
@project_specs/TechArch-uReport.md (§INT-1 Apache Solr, §Search endpoint spec)
</context>

<tasks>

<task type="auto">
  <name>Task 1: SolrService + SearchService + SearchModule (Solr client, document build, eDisMax query, incremental indexing hooks in TicketsService)</name>
  <files>
    src/modules/search/solr.service.ts
    src/modules/search/search.service.ts
    src/modules/search/search.module.ts
    src/modules/search/dto/search-query.dto.ts
    src/modules/tickets/tickets.service.ts
    scripts/reindex-solr.ts
  </files>
  <action>
Create `SolrService`, `SearchService`, `SearchModule`, the `SearchQueryDto`, wire incremental indexing hooks into `TicketsService`, and build the standalone `scripts/reindex-solr.ts` re-index script.

## Directory structure

```
src/modules/search/
├── search.module.ts         (this task)
├── search.controller.ts     (Task 2)
├── search.service.ts        (this task)
├── solr.service.ts          (this task)
└── dto/
    └── search-query.dto.ts  (this task)

scripts/
└── reindex-solr.ts          (this task)
```

---

### src/modules/search/dto/search-query.dto.ts

Per FRD §F05.2 inputs:

```typescript
import { IsOptional, IsIn, IsInt, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchQueryDto {
  /** Full-text query; default *:* (all) */
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['open', 'closed'])
  status?: 'open' | 'closed';

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  category_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  department_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  assignedPerson_id?: number;

  /** ISO 8601 date range start for enteredDate */
  @IsOptional()
  @IsString()
  start_date?: string;

  /** ISO 8601 date range end for enteredDate */
  @IsOptional()
  @IsString()
  end_date?: string;

  /** Sort: 'relevance' (default) or 'date' */
  @IsOptional()
  @IsIn(['relevance', 'date'])
  sort?: 'relevance' | 'date';

  /** 1-based page number; default 1 */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  /** Results per page; default 25, max 500 (FRD §F05.2) */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  rows?: number = 25;
}
```

---

### src/modules/search/solr.service.ts

Thin wrapper around the `solr-client` npm package. Manages:
- Connection config from env vars (`SOLR_HOST`, `SOLR_PORT`, `SOLR_CORE`, `SOLR_PATH`)
- Document build from Prisma ticket record (exact field names from FRD §F05.1)
- `indexTicket()` — fire-and-forget safe (catches all errors, logs via GELF warn, never throws)
- `search()` — executes eDisMax queries; throws `ServiceUnavailableException` on Solr unreachability
- `deleteAll()` and `commit()` for re-index script

**IMPORTANT:** The `indexTicket()` method MUST be called as fire-and-forget from TicketsService:
```typescript
this.solrService.indexTicket(ticket.id).catch(err =>
  this.logger.warn('Solr indexing failed', { _ticket_id: ticket.id, error: err.message })
);
```
This pattern ensures Solr failure NEVER propagates to the HTTP response.

```typescript
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
// Using solr-client npm package (install: npm install solr-client)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const solr = require('solr-client');

export interface SolrDocument {
  id: number;
  status: string;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  department_id: number | null;
  department_name: string | null;
  assignedPerson_id: number | null;
  enteredDate: string;      // ISO 8601 (tdate in Solr)
  lastModified: string;     // ISO 8601 (tdate in Solr)
  location: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  substatus_id: number | null;
  substatus_name: string | null;
  issueType_id: number | null;
  customFields: string | null;
}

export interface SolrFacetBucket {
  value: string | number;
  count: number;
}

export interface SolrSearchResult {
  total: number;
  page: number;
  rows: number;
  results: SolrDocument[];
  facets: {
    categories: Array<{ id: number; name: string; count: number }>;
    statuses: Array<{ value: string; count: number }>;
    departments: Array<{ id: number; name: string; count: number }>;
  };
}

export interface SolrSearchParams {
  q?: string;
  status?: string;
  category_id?: number;
  department_id?: number;
  assignedPerson_id?: number;
  start_date?: string;
  end_date?: string;
  sort?: 'relevance' | 'date';
  page: number;
  rows: number;
  /** Role-visibility filter: array of permitted category IDs (empty = no results) */
  permittedCategoryIds: number[] | null; // null = staff (no filter)
}

@Injectable()
export class SolrService implements OnModuleInit {
  private readonly logger = new Logger(SolrService.name);
  private client: ReturnType<typeof solr.createClient>;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.client = solr.createClient({
      host: this.config.get<string>('SOLR_HOST', 'localhost'),
      port: parseInt(this.config.get<string>('SOLR_PORT', '8983'), 10),
      core: this.config.get<string>('SOLR_CORE', 'uReport'),
      path: this.config.get<string>('SOLR_PATH', '/solr'),
    });
  }

  // ---- Document Build (FRD §F05.1 exact field names) ----

  /**
   * Build a Solr document from a Prisma ticket record + relations.
   * Field names MUST match the legacy Solarium schema exactly (FRD §F05.1).
   */
  buildDocument(ticket: any): SolrDocument {
    return {
      id: ticket.id,
      status: ticket.status,
      description: ticket.description ?? null,
      category_id: ticket.category_id ?? null,
      category_name: ticket.categories?.name ?? null,
      department_id: ticket.categories?.department_id ?? null,
      department_name: ticket.categories?.departments?.name ?? null,
      assignedPerson_id: ticket.assignedPerson_id ?? null,
      enteredDate: ticket.enteredDate ? new Date(ticket.enteredDate).toISOString() : new Date().toISOString(),
      lastModified: ticket.lastModified ? new Date(ticket.lastModified).toISOString() : new Date().toISOString(),
      location: ticket.location ?? null,
      city: ticket.city ?? null,
      latitude: ticket.latitude ?? null,
      longitude: ticket.longitude ?? null,
      substatus_id: ticket.substatus_id ?? null,
      substatus_name: ticket.substatus?.name ?? null,
      issueType_id: ticket.issueType_id ?? null,
      customFields: ticket.customFields ?? null,
    };
  }

  // ---- Incremental Indexing (FRD §F05.4) ----

  /**
   * Index a single ticket. FIRE-AND-FORGET SAFE — catches all errors.
   * Callers MUST use: solrService.indexTicket(id).catch(err => logger.warn(...))
   * Solr failure MUST NOT propagate to the ticket write (FRD §F05.4).
   */
  async indexTicket(ticketId: number): Promise<void> {
    const ticket = await this.prisma.tickets.findUnique({
      where: { id: ticketId },
      include: {
        categories: { include: { departments: true } },
        substatus: true,
        issueTypes: true,
      },
    });
    if (!ticket) return; // ticket may have been deleted; skip silently

    const doc = this.buildDocument(ticket);

    await new Promise<void>((resolve, reject) => {
      this.client.add(doc, (err: Error | null) => {
        if (err) { reject(err); return; }
        this.client.commit((commitErr: Error | null) => {
          if (commitErr) { reject(commitErr); return; }
          resolve();
        });
      });
    });
  }

  /** Delete a single ticket document from the Solr index */
  async deleteTicket(ticketId: number): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.client.deleteByID(ticketId, (err: Error | null) => {
        if (err) { reject(err); return; }
        this.client.commit((commitErr: Error | null) => {
          if (commitErr) { reject(commitErr); return; }
          resolve();
        });
      });
    });
  }

  // ---- Search Query (FRD §F05.2, §F05.3) ----

  /**
   * Execute an eDisMax query against Solr.
   * Throws ServiceUnavailableException on Solr unreachability (FRD §F05.2 HTTP 503).
   */
  async search(params: SolrSearchParams): Promise<SolrSearchResult> {
    const query = this.client.createQuery();

    // eDisMax parser (FRD §F05.3)
    query.defType('edismax');

    // Query string construction (FRD §F05.3)
    let qStr = params.q?.trim() || '';
    if (qStr) {
      // Prefix wildcard for single terms (FRD §F05.3)
      if (!qStr.includes(' ') && !qStr.endsWith('*')) {
        qStr = qStr + '*';
      }
      query.q(qStr);
    } else {
      query.q('*:*');
    }

    // eDisMax parameters (FRD §F05.3)
    query.set('qf=description^2 location^1.5 city^1 customFields^1');
    query.set('mm=75%');
    query.set(`pf=description^4`);
    if (params.q?.includes(' ')) {
      // Phrase boost for multi-word queries (FRD §F05.3)
      query.set(`pf2=description^4`);
    }

    // Filter queries (FRD §F05.3) — ANDed
    const fqs: string[] = [];

    if (params.status) {
      fqs.push(`status:${params.status}`);
    }
    if (params.category_id !== undefined) {
      fqs.push(`category_id:${params.category_id}`);
    }
    if (params.department_id !== undefined) {
      fqs.push(`department_id:${params.department_id}`);
    }
    if (params.assignedPerson_id !== undefined) {
      fqs.push(`assignedPerson_id:${params.assignedPerson_id}`);
    }
    if (params.start_date || params.end_date) {
      const start = params.start_date ? new Date(params.start_date).toISOString() : '*';
      const end = params.end_date ? new Date(params.end_date).toISOString() : '*';
      fqs.push(`enteredDate:[${start} TO ${end}]`);
    }

    // Role-visibility filter: restrict to permitted categories (FRD §F05.3, §F02.5)
    // permittedCategoryIds = null means staff (no filter)
    // permittedCategoryIds = [] means no accessible categories → return empty results
    if (params.permittedCategoryIds !== null) {
      if (params.permittedCategoryIds.length === 0) {
        // No categories permitted — return empty result without hitting Solr
        return {
          total: 0, page: params.page, rows: params.rows,
          results: [],
          facets: { categories: [], statuses: [], departments: [] },
        };
      }
      fqs.push(`category_id:(${params.permittedCategoryIds.join(' OR ')})`);
    }

    for (const fq of fqs) {
      query.matchFilter('', fq);
    }

    // Sorting (FRD §F05.2)
    if (params.sort === 'date') {
      query.sort({ enteredDate: 'desc' });
    }
    // relevance = default Solr scoring (no explicit sort needed)

    // Pagination (FRD §F05.2)
    const start = (params.page - 1) * params.rows;
    query.start(start).rows(params.rows);

    // Facets (FRD §F05.2 outputs: categories, statuses, departments)
    query.set('facet=true');
    query.set('facet.field=category_id');
    query.set('facet.field=status');
    query.set('facet.field=department_id');
    query.set('facet.mincount=1');
    query.set('facet.limit=50');

    // Execute query
    const response = await new Promise<any>((resolve, reject) => {
      this.client.search(query, (err: Error | null, obj: any) => {
        if (err) { reject(err); return; }
        resolve(obj);
      });
    }).catch((err: Error) => {
      this.logger.error('Solr search failed', err.stack);
      throw new ServiceUnavailableException({
        error: 'SEARCH_UNAVAILABLE',
        message: 'Search service unavailable',
      });
    });

    const docs: SolrDocument[] = (response?.response?.docs ?? []) as SolrDocument[];
    const total: number = response?.response?.numFound ?? 0;

    // Parse facet counts (FRD §F05.2 outputs)
    const facetFields = response?.facet_counts?.facet_fields ?? {};

    const categories = this.parseFacetField(facetFields['category_id'] ?? []);
    const statuses = this.parseFacetField(facetFields['status'] ?? []);
    const departments = this.parseFacetField(facetFields['department_id'] ?? []);

    return {
      total,
      page: params.page,
      rows: params.rows,
      results: docs,
      facets: {
        // category facets: { id, name, count } — name resolved from docs (best-effort)
        categories: categories.map(c => ({
          id: Number(c.value),
          name: docs.find((d: any) => d.category_id === Number(c.value))?.category_name ?? String(c.value),
          count: c.count,
        })),
        statuses: statuses.map(s => ({ value: String(s.value), count: s.count })),
        departments: departments.map(d => ({
          id: Number(d.value),
          name: docs.find((d2: any) => d2.department_id === Number(d.value))?.department_name ?? String(d.value),
          count: d.count,
        })),
      },
    };
  }

  /** Parse Solr facet field array format: [value, count, value, count, ...] */
  private parseFacetField(arr: Array<string | number>): SolrFacetBucket[] {
    const result: SolrFacetBucket[] = [];
    for (let i = 0; i < arr.length; i += 2) {
      result.push({ value: arr[i], count: arr[i + 1] as number });
    }
    return result;
  }

  // ---- Bulk re-index helpers (used by scripts/reindex-solr.ts) ----

  /** Delete all documents from the Solr index — used by re-index script (FRD §F05.5) */
  async deleteAll(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.client.deleteByQuery('*:*', (err: Error | null) => {
        if (err) { reject(err); return; }
        this.client.commit((commitErr: Error | null) => {
          if (commitErr) { reject(commitErr); return; }
          resolve();
        });
      });
    });
  }

  /** Batch-add an array of Solr documents and commit */
  async addBatch(docs: SolrDocument[]): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.client.add(docs, (err: Error | null) => {
        if (err) { reject(err); return; }
        resolve();
      });
    });
  }

  /** Final commit — called once at end of re-index script (FRD §F05.5) */
  async commit(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.client.commit((err: Error | null) => {
        if (err) { reject(err); return; }
        resolve();
      });
    });
  }
}
```

---

### src/modules/search/search.service.ts

Orchestrates eDisMax query construction, role-visibility filter injection, and result mapping. Delegates to `SolrService` for Solr I/O.

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SolrService, SolrSearchResult } from './solr.service';
import { SearchQueryDto } from './dto/search-query.dto';

/**
 * Map role to list of permitted category IDs for Solr fq injection (FRD §F05.3, §F02.5).
 * Returns null for staff (no filter).
 * Returns array of IDs for public/anonymous callers.
 */
async function resolvePermittedCategoryIds(
  role: string | null | undefined,
  prisma: PrismaService,
): Promise<number[] | null> {
  if (role === 'staff') return null; // staff: no restriction

  const levels: string[] =
    role ? ['public', 'anonymous'] : ['anonymous'];

  const cats = await prisma.categories.findMany({
    where: { active: true, displayPermissionLevel: { in: levels as any } },
    select: { id: true },
  });
  return cats.map(c => c.id);
}

@Injectable()
export class SearchService {
  constructor(
    private readonly solrService: SolrService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Execute a full-text Solr search with role-based category visibility filter.
   * Returns paginated results with facets (FRD §F05.2).
   * Throws ServiceUnavailableException (503) if Solr is unreachable.
   */
  async search(
    dto: SearchQueryDto,
    role: string | null | undefined,
  ): Promise<SolrSearchResult> {
    const permittedCategoryIds = await resolvePermittedCategoryIds(role, this.prisma);

    return this.solrService.search({
      q: dto.q,
      status: dto.status,
      category_id: dto.category_id,
      department_id: dto.department_id,
      assignedPerson_id: dto.assignedPerson_id,
      start_date: dto.start_date,
      end_date: dto.end_date,
      sort: dto.sort,
      page: dto.page ?? 1,
      rows: Math.min(dto.rows ?? 25, 500), // cap at 500 (FRD §F05.2)
      permittedCategoryIds,
    });
  }
}
```

---

### src/modules/search/search.module.ts

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SolrService } from './solr.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SearchController],
  providers: [SearchService, SolrService],
  /**
   * Export SolrService so TicketsModule can inject it for fire-and-forget
   * incremental indexing (FRD §F05.4): create/update/close trigger indexTicket().
   * Wave 4 TicketsModule imports SearchModule to access SolrService.
   */
  exports: [SolrService],
})
export class SearchModule {}
```

---

### src/modules/tickets/tickets.service.ts (update — wire SolrService fire-and-forget hooks)

**This task UPDATES the existing TicketsService** (created in Wave 4 plans 09–10) to inject `SolrService` optionally and call `indexTicket()` fire-and-forget after `create`, `update`, and `close` operations.

**Key pattern (FRD §F05.4):**
- SolrService is injected via `@Optional()` so the service still compiles before SearchModule exists.
- Fire-and-forget: `.catch()` is mandatory; the promise MUST NOT be awaited.
- Log Solr failures at WARN level (GELF via Logger).

Add the following to the existing `TicketsService`:

1. Import `SolrService` and `@Optional` at the top of `tickets.service.ts`:

```typescript
import { Optional } from '@nestjs/common';
import { SolrService } from '../search/solr.service';
```

2. Add SolrService to the constructor with `@Optional()`:

```typescript
constructor(
  private readonly repo: TicketsRepository,
  @Optional() private readonly solrService?: SolrService,
) {}
```

**NOTE:** If the existing constructor already has `CategoriesService` and `PeopleService` parameters (from plan 09), keep those and add `SolrService` as an additional optional parameter:

```typescript
constructor(
  private readonly repo: TicketsRepository,
  // From plan 09 if present:
  // private readonly categoriesService: CategoriesService,
  // private readonly peopleService: PeopleService,
  @Optional() private readonly solrService?: SolrService,
) {}
```

3. Add a private helper method to call indexTicket fire-and-forget:

```typescript
private indexTicketAsync(ticketId: number): void {
  if (!this.solrService) return;
  this.solrService.indexTicket(ticketId).catch((err: Error) => {
    // GELF warn: Solr indexing failure must NOT propagate (FRD §F05.4)
    this.logger?.warn?.(`Solr indexing failed for ticket ${ticketId}: ${err.message}`);
  });
}
```

Add `private readonly logger = new Logger(TicketsService.name);` if not already present.

4. After the `create()` method successfully persists the ticket, add:

```typescript
// FRD §F05.4: fire-and-forget Solr indexing; failure MUST NOT fail the ticket write
this.indexTicketAsync(ticket.id);
```

5. After the `update()` method successfully persists changes, add:

```typescript
this.indexTicketAsync(ticket.id);
```

6. After the `close()` method successfully updates the ticket, add:

```typescript
this.indexTicketAsync(updated.id);
```

Also add to `reopen()` (status change triggers re-index):

```typescript
this.indexTicketAsync(updated.id);
```

**TicketsModule also needs SearchModule import** — update `src/modules/tickets/tickets.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketsRepository } from './tickets.repository';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [SearchModule],   // provides SolrService for optional injection
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository],
  exports: [TicketsService],
})
export class TicketsModule {}
```

**IMPORTANT:** If the existing `TicketsModule` imports `CategoriesModule` and `PeopleModule` (from plan 09), keep those imports and ADD `SearchModule`:

```typescript
imports: [CategoriesModule, PeopleModule, SearchModule],
```

---

### scripts/reindex-solr.ts

Standalone TypeScript script run via `ts-node scripts/reindex-solr.ts` or `npx ts-node scripts/reindex-solr.ts`.
Exits non-zero on any error (FRD §F05.5).

```typescript
/**
 * scripts/reindex-solr.ts
 * Bulk re-index all tickets into Solr (FRD §F05.5).
 *
 * Usage: npx ts-node scripts/reindex-solr.ts
 * Exits non-zero on any Solr or DB error.
 *
 * Process (FRD §F05.5):
 * 1. deleteByQuery *:* — clear the index
 * 2. Load all tickets from PostgreSQL in batches of 500
 * 3. Build Solr documents for each batch
 * 4. Submit batch add operations
 * 5. Issue final commit
 * 6. Log progress (tickets indexed, elapsed time)
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const solr = require('solr-client');

const BATCH_SIZE = 500;

const prisma = new PrismaClient();

const client = solr.createClient({
  host: process.env.SOLR_HOST ?? 'localhost',
  port: parseInt(process.env.SOLR_PORT ?? '8983', 10),
  core: process.env.SOLR_CORE ?? 'uReport',
  path: process.env.SOLR_PATH ?? '/solr',
});

async function deleteAll(): Promise<void> {
  return new Promise((resolve, reject) => {
    client.deleteByQuery('*:*', (err: Error | null) => {
      if (err) { reject(err); return; }
      client.commit((cerr: Error | null) => {
        if (cerr) { reject(cerr); return; }
        resolve();
      });
    });
  });
}

async function addBatch(docs: object[]): Promise<void> {
  return new Promise((resolve, reject) => {
    client.add(docs, (err: Error | null) => {
      if (err) { reject(err); return; }
      resolve();
    });
  });
}

async function commitFinal(): Promise<void> {
  return new Promise((resolve, reject) => {
    client.commit((err: Error | null) => {
      if (err) { reject(err); return; }
      resolve();
    });
  });
}

/** Build Solr document from Prisma ticket with relations (FRD §F05.1 field names) */
function buildDoc(ticket: any): object {
  return {
    id: ticket.id,
    status: ticket.status,
    description: ticket.description ?? null,
    category_id: ticket.category_id ?? null,
    category_name: ticket.categories?.name ?? null,
    department_id: ticket.categories?.department_id ?? null,
    department_name: ticket.categories?.departments?.name ?? null,
    assignedPerson_id: ticket.assignedPerson_id ?? null,
    enteredDate: ticket.enteredDate ? new Date(ticket.enteredDate).toISOString() : null,
    lastModified: ticket.lastModified ? new Date(ticket.lastModified).toISOString() : null,
    location: ticket.location ?? null,
    city: ticket.city ?? null,
    latitude: ticket.latitude ?? null,
    longitude: ticket.longitude ?? null,
    substatus_id: ticket.substatus_id ?? null,
    substatus_name: ticket.substatus?.name ?? null,
    issueType_id: ticket.issueType_id ?? null,
    customFields: ticket.customFields ?? null,
  };
}

async function main(): Promise<void> {
  const start = Date.now();
  console.log('[reindex-solr] Starting Solr re-index...');

  // Step 1: Delete all (FRD §F05.5)
  console.log('[reindex-solr] Deleting all documents from Solr index...');
  await deleteAll();
  console.log('[reindex-solr] Index cleared.');

  // Step 2–4: Load in batches and submit (FRD §F05.5)
  let offset = 0;
  let totalIndexed = 0;

  while (true) {
    const tickets = await prisma.tickets.findMany({
      skip: offset,
      take: BATCH_SIZE,
      include: {
        categories: { include: { departments: true } },
        substatus: true,
        issueTypes: true,
      },
      orderBy: { id: 'asc' },
    });

    if (tickets.length === 0) break;

    const docs = tickets.map(buildDoc);
    await addBatch(docs);
    totalIndexed += tickets.length;
    offset += BATCH_SIZE;
    console.log(`[reindex-solr] Indexed ${totalIndexed} tickets...`);

    if (tickets.length < BATCH_SIZE) break;
  }

  // Step 5: Final commit (FRD §F05.5)
  await commitFinal();

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`[reindex-solr] Done. Indexed ${totalIndexed} tickets in ${elapsed}s.`);
}

main()
  .catch((err: Error) => {
    console.error('[reindex-solr] FATAL:', err.message);
    process.exit(1); // non-zero exit on any error (FRD §F05.5)
  })
  .finally(() => prisma.$disconnect());
```
  </action>
  <verify>
```bash
grep -n 'export class SolrService' src/modules/search/solr.service.ts && echo SOLR_SVC_OK
grep -n 'indexTicket\|deleteTicket\|deleteAll\|addBatch\|buildDocument\|commit\b' src/modules/search/solr.service.ts && echo SOLR_METHODS_OK
grep -n 'export class SearchService' src/modules/search/search.service.ts && echo SEARCH_SVC_OK
grep -n 'export class SearchModule' src/modules/search/search.module.ts && grep -n 'SolrService' src/modules/search/search.module.ts && echo SEARCH_MOD_OK
grep -n 'indexTicketAsync\|indexTicket' src/modules/tickets/tickets.service.ts && echo HOOKS_WIRED_OK
grep -n 'catch\|fire-and-forget\|MUST NOT' src/modules/tickets/tickets.service.ts | head -5 && echo FIRE_AND_FORGET_OK
grep -n 'SearchModule' src/modules/tickets/tickets.module.ts && echo TICKETS_MOD_IMPORTS_SEARCH_OK
ls scripts/reindex-solr.ts && echo REINDEX_SCRIPT_OK
grep -n 'deleteByQuery\|deleteAll\|BATCH_SIZE\|process.exit(1)' scripts/reindex-solr.ts && echo REINDEX_CONTENT_OK
grep -n 'description\^2\|qf=description' src/modules/search/solr.service.ts && echo EDISMAX_BOOSTS_OK
grep -n 'category_id.*OR\|permittedCategoryIds' src/modules/search/solr.service.ts && echo ROLE_FILTER_OK
grep -n 'ServiceUnavailableException\|SEARCH_UNAVAILABLE' src/modules/search/solr.service.ts && echo 503_OK
npx tsc --noEmit 2>&1 | grep -E 'search|solr|SearchModule|SolrService' | head -20 && echo TSC_SEARCH_OK
```
  </verify>
  <done>
- `SolrService` exports: `indexTicket(ticketId)`, `deleteTicket(ticketId)`, `search(params)`, `buildDocument(ticket)`, `deleteAll()`, `addBatch(docs)`, `commit()`
- `SolrService.indexTicket()` builds document with EXACT field names from FRD §F05.1: `id, status, description, category_id, category_name, department_id, department_name, assignedPerson_id, enteredDate, lastModified, location, city, latitude, longitude, substatus_id, substatus_name, issueType_id, customFields`
- `SolrService.search()` constructs eDisMax query with `qf=description^2 location^1.5 city^1 customFields^1`, `mm=75%`, `pf=description^4`, wildcard append for single-term queries, date ISO format for tdate fields
- `SolrService.search()` injects role-visibility `category_id:(id1 OR id2 ...)` fq when `permittedCategoryIds !== null`
- `SolrService.search()` returns facets for `categories` (from `category_id` facet field), `statuses` (from `status` facet field), `departments` (from `department_id` facet field)
- `SolrService.search()` throws `ServiceUnavailableException` (HTTP 503) when Solr is unreachable
- `SearchService.search()` resolves `permittedCategoryIds` from DB based on role before calling SolrService
- `SearchModule` exports `SolrService` so TicketsModule can inject it
- `TicketsService.create()`, `update()`, `close()`, and `reopen()` each call `this.indexTicketAsync(id)` fire-and-forget; `.catch()` ensures Solr failure NEVER propagates to the HTTP response
- `TicketsModule.imports` includes `SearchModule`
- `scripts/reindex-solr.ts` exists; contains `deleteByQuery *:*`, batch-500 loop, final commit, `process.exit(1)` on error
- TypeScript compiles with zero errors in search module and updated tickets module files
  </done>
</task>

<task type="auto">
  <name>Task 2: SearchController + AppModule wiring (GET /search all-five-format endpoint)</name>
  <files>
    src/modules/search/search.controller.ts
    src/app.module.ts
  </files>
  <action>
Build `SearchController` with `GET /search` supporting all five formats via the global `SerializationInterceptor`, and wire `SearchModule` into `AppModule`.

---

### src/modules/search/search.controller.ts

Per FRD §F05.2 / §Search API surface (§2910).

**Route:** `GET /search[.json|.xml|.csv|.txt|.html]`
- Auth: `[anon]` — anonymous callers get role-filtered results
- Format negotiated by `FormatMiddleware` (Wave 2) via `req.negotiatedFormat`; global `SerializationInterceptor` handles output
- Returns `{ total, page, rows, results, facets }` structure

**HTTP 503:** When `SolrService.search()` throws `ServiceUnavailableException`, NestJS propagates it automatically with status 503 and the `SEARCH_UNAVAILABLE` error body.

```typescript
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
```

---

### src/app.module.ts (update — add SearchModule)

Import `SearchModule` into the root module. Merge with the accumulated state that imports AuthModule, AdminModule, CategoriesModule, DepartmentsModule, PeopleModule, TicketsModule, Open311Module (from waves 2–4):

**Update the existing `src/app.module.ts`:**

1. Add the import at the top:
```typescript
import { SearchModule } from './modules/search/search.module';
```

2. Add `SearchModule` to the `imports` array in `@Module()`.

The resulting imports array should include (in addition to existing wave 1–4 modules):
```typescript
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  PrismaModule,
  GelfLoggerModule,
  AuthModule,
  AdminModule,
  CategoriesModule,
  DepartmentsModule,
  PeopleModule,
  TicketsModule,
  Open311Module,
  SearchModule,   // ← ADD THIS
],
```

Keep all existing middleware registrations (`GelfRequestMiddleware`, `FormatMiddleware`, `AuthMiddleware`), global interceptors (`SerializationInterceptor`), and exception filters (`GelfExceptionFilter`) unchanged.
  </action>
  <verify>
```bash
grep -n 'export class SearchController' src/modules/search/search.controller.ts && echo CTRL_OK
grep -n "Get()" src/modules/search/search.controller.ts && echo GET_ROUTE_OK
grep -n 'SearchService' src/modules/search/search.controller.ts && echo CTRL_USES_SVC_OK
grep -n 'PiiMaskInterceptor' src/modules/search/search.controller.ts && echo PII_MASK_OK
grep -n 'SearchModule' src/app.module.ts && echo APP_MODULE_OK
npx tsc --noEmit 2>&1 | grep -E 'search|SearchController|SearchModule' | head -20 && echo TSC_CTRL_OK
```
  </verify>
  <done>
- `SearchController` exists at `src/modules/search/search.controller.ts`
- `GET /search` route accepts all `SearchQueryDto` query parameters: `q`, `status`, `category_id`, `department_id`, `assignedPerson_id`, `start_date`, `end_date`, `sort`, `page`, `rows`
- `PiiMaskInterceptor` applied to prevent PII leakage for non-staff callers
- Response structure (`{ total, page, rows, results, facets }`) returned from `SearchService.search()` and serialized by global `SerializationInterceptor` (all five formats: JSON/XML/CSV/TXT/HTML)
- HTTP 503 `SEARCH_UNAVAILABLE` propagated automatically from `ServiceUnavailableException` when Solr is unreachable
- `SearchModule` imported in `src/app.module.ts`
- TypeScript compiles with zero errors for search controller and updated app module
  </done>
</task>

</tasks>

<verification>
```bash
# SearchModule wired into AppModule
grep -n 'SearchModule' src/app.module.ts && echo APP_MODULE_HAS_SEARCH

# SolrService contract for downstream consumers (F12 BookmarksModule)
grep -n 'export class SolrService' src/modules/search/solr.service.ts && echo SOLR_SVC_EXPORTED
grep -n 'exports.*SolrService' src/modules/search/search.module.ts && echo SOLR_EXPORTED_FROM_MODULE

# Fire-and-forget hooks in TicketsService
grep -n 'indexTicketAsync\|indexTicket' src/modules/tickets/tickets.service.ts && echo HOOKS_IN_TICKETS

# eDisMax query params preserved from FRD §F05.3
grep -n 'description\^2\|location\^1\.5\|mm=75' src/modules/search/solr.service.ts && echo EDISMAX_PARAMS_OK

# Solr field names match FRD §F05.1 exactly
grep -n 'category_name\|department_name\|substatus_name\|assignedPerson_id' src/modules/search/solr.service.ts && echo FIELD_NAMES_OK

# Re-index script exits non-zero on error
grep -n 'process.exit(1)' scripts/reindex-solr.ts && echo NONZERO_EXIT_OK

# TypeScript clean compile across all modified files
npx tsc --noEmit 2>&1 | grep -c 'error TS' && echo "COMPILE_ERRORS_COUNT (should be 0)"
```
</verification>

<success_criteria>
- `GET /search` returns Solr eDisMax results in ≤ 500ms with facets (categories, statuses, departments) and total/page/rows envelope
- `GET /search` injects `category_id:(id1 OR id2 ...)` fq for non-staff callers, restricting results to permitted categories (FRD §F02.5, §F05.3)
- `GET /search` returns HTTP 503 with `{ error: 'SEARCH_UNAVAILABLE', message: 'Search service unavailable' }` when Solr is unreachable
- `GET /search` response available in all five formats via global `SerializationInterceptor` (JSON/XML/CSV/TXT/HTML)
- `TicketsService.create/update/close/reopen` each call `indexTicketAsync(id)` fire-and-forget; `.catch()` ensures Solr failure NEVER propagates to the ticket HTTP response (verified: ticket write succeeds even when Solr is down)
- `SolrService.buildDocument()` maps exact field names from FRD §F05.1: `id, status, description, category_id, category_name, department_id, department_name, assignedPerson_id, enteredDate, lastModified, location, city, latitude, longitude, substatus_id, substatus_name, issueType_id, customFields`
- `scripts/reindex-solr.ts` runs as standalone script: clears index with `deleteByQuery *:*`, loads all tickets in batches of 500, submits batch add, final commit, exits non-zero on any error
- `SearchModule` exports `SolrService` for downstream F12 BookmarksModule consumption
- TypeScript strict-mode compilation passes with zero errors across all modified files
</success_criteria>

<output>
After completion, create `.planning/express/modernize-legacy-php-ureport-open311-geo/12-SUMMARY.md` with:
- Files created/modified
- Key decisions made (SolrService fire-and-forget pattern, eDisMax params, facet field mapping)
- Integration contracts fulfilled (SolrService exported for F12)
- Any deviations from spec (none expected)
</output>
