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
      category_name: ticket.category?.name ?? null,
      department_id: ticket.category?.department_id ?? null,
      department_name: ticket.category?.department?.name ?? null,
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
        category: { include: { department: true } },
        substatus: true,
        issueType: true,
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
