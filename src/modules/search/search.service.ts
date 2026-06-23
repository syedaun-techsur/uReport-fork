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
