import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientsService } from '../people/clients.service';
import {
  Open311Serializer,
  Open311ServiceDto,
  Open311ServiceDefinitionDto,
  Open311ServiceRequestDto,
  Open311SubmitResponseDto,
  Open311TokenResponseDto,
  Open311ServiceAttributeDto,
} from './open311.serializer';
import { PostRequestDto } from './dto/post-request.dto';
import { GetRequestsDto } from './dto/get-requests.dto';
import { randomUUID } from 'crypto';

/** Map role string to permissionLevel filter (FRD §F02.5) — mirrors CategoriesService */
function permissionLevels(role: string | null | undefined): string[] {
  if (role === 'staff') return ['staff', 'public', 'anonymous'];
  if (role) return ['public', 'anonymous']; // authenticated citizen
  return ['anonymous']; // anonymous
}

/** Parse customFields JSON string to Open311ServiceAttributeDto array (FRD §F00.2) */
function parseAttributes(customFields: string | null | undefined): Open311ServiceAttributeDto[] {
  if (!customFields) return [];
  try {
    const parsed = JSON.parse(customFields);
    if (!Array.isArray(parsed)) return [];
    return parsed as Open311ServiceAttributeDto[];
  } catch {
    return [];
  }
}

/** Calculate expected_datetime: enteredDate + slaDays calendar days (FRD §F00.4) */
function calcExpectedDatetime(enteredDate: Date, slaDays: number | null): string | null {
  if (!slaDays) return null;
  const dt = new Date(enteredDate);
  dt.setDate(dt.getDate() + slaDays);
  return dt.toISOString();
}

@Injectable()
export class Open311Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
    // Open311Serializer injected but not used here directly (used in controller)
    // Kept as dependency to ensure it's in the module providers
    private readonly serializer: Open311Serializer,
  ) {}

  // ---- F00.1: GET /open311/v2/services ----

  /**
   * Returns all visible categories as Open311 Service objects.
   * Visibility filtered by caller role (FRD §F02.5, §F00.1).
   */
  async getServices(role: string | null | undefined): Promise<Open311ServiceDto[]> {
    const levels = permissionLevels(role);
    const categories = await this.prisma.categories.findMany({
      where: {
        active: true,
        displayPermissionLevel: { in: levels as any },
      },
      include: { categoryGroup: true },
      orderBy: { id: 'asc' },
    });

    return categories.map(cat => ({
      service_code: cat.id,
      service_name: cat.name,
      description: cat.description ?? '',
      metadata: !!(cat.customFields && cat.customFields.trim() !== '' && cat.customFields !== '[]'),
      type: 'realtime' as const,
      keywords: '',
      group: cat.categoryGroup?.name ?? '',
    }));
  }

  // ---- F00.2: GET /open311/v2/services/:id ----

  /**
   * Returns a single ServiceDefinition with attributes from customFields JSON.
   * Returns 404 if not found or not visible to caller's role (FRD §F00.2).
   */
  async getService(id: number, role: string | null | undefined): Promise<Open311ServiceDefinitionDto> {
    const levels = permissionLevels(role);
    const cat = await this.prisma.categories.findUnique({
      where: { id },
      include: { categoryGroup: true, department: true },
    });

    if (!cat || !(levels as string[]).includes(cat.displayPermissionLevel)) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Service not found' });
    }

    const attributes = parseAttributes(cat.customFields);

    return {
      service_code: cat.id,
      service_name: cat.name,
      description: cat.description ?? '',
      metadata: attributes.length > 0,
      type: 'realtime' as const,
      keywords: '',
      group: cat.categoryGroup?.name ?? '',
      attributes,
    };
  }

  // ---- F00.3: POST /open311/v2/requests ----

  /**
   * Validates api_key, creates ticket, returns submit response with token.
   * api_key accepted via body or query param (normalized before reaching here).
   * Token is a UUID v4 stored as JSON in ticketHistory.data on the 'open' action row.
   */
  async postRequest(dto: PostRequestDto, rawAttributes?: Record<string, string>): Promise<Open311SubmitResponseDto[]> {
    // 1. Validate api_key (FRD §F00.3, §F11.7 active=true filter)
    const client = await this.clientsService.findByApiKey(dto.api_key);
    if (!client) {
      throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Invalid api_key' });
    }

    // 2. Validate required fields: service_code + location (FRD §F00.3)
    if (!dto.service_code) {
      throw new BadRequestException({ error: 'MISSING_PARAMETER', message: 'service_code is required' });
    }

    const hasLocation = (dto.lat !== undefined && dto.long !== undefined) || dto.address_string;
    if (!hasLocation) {
      throw new BadRequestException({
        error: 'MISSING_PARAMETER',
        message: 'lat and long or address_string required',
      });
    }

    // 3. Validate coordinate ranges (FRD §F00.3)
    if (dto.lat !== undefined && (dto.lat < -90 || dto.lat > 90)) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'Coordinates out of range' });
    }
    if (dto.long !== undefined && (dto.long < -180 || dto.long > 180)) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'Coordinates out of range' });
    }

    // 4. Load category, verify active + postingPermissionLevel = 'anonymous' (FRD §F00.3)
    const category = await this.prisma.categories.findUnique({
      where: { id: dto.service_code },
      include: { department: true },
    });
    if (!category || !category.active || category.postingPermissionLevel !== 'anonymous') {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Service not found' });
    }

    // 5. Resolve/create person for submitter if contact info provided (FRD §F00.3)
    let reportedByPerson_id: number | null = null;
    if (dto.first_name || dto.last_name || dto.email) {
      reportedByPerson_id = await this.resolveOrCreatePerson(dto);
    }

    // 6. Build customFields from attribute[{code}] params (FRD §F00.3)
    const customFields = rawAttributes && Object.keys(rawAttributes).length > 0
      ? JSON.stringify(rawAttributes)
      : null;

    // 7. Create ticket record (FRD §F00.3, §F01.1)
    // enteredByPerson_id = client.contactPerson_id for API submissions (FRD §F00.3)
    const ticket = await this.prisma.tickets.create({
      data: {
        category_id: category.id,
        client_id: client.id,
        enteredByPerson_id: client.contactPerson_id,
        reportedByPerson_id,
        status: 'open',
        latitude: dto.lat ?? null,
        longitude: dto.long ?? null,
        location: dto.address_string ?? null,
        addressId: dto.address_id ?? null,
        description: dto.description ?? null,
        customFields,
        enteredDate: new Date(),
        lastModified: new Date(),
      } as any,
    });

    // 8. Generate submission token — UUID v4 (FRD §F00.3, §F00.6)
    const token = randomUUID();

    // Look up the 'open' action id from reference data
    const openAction = await this.prisma.actions.findFirst({ where: { name: 'open', type: 'system' } });
    if (!openAction) throw new Error('System action "open" not found in actions table — run seed');

    // 9. Append ticketHistory 'open' action with token stored in data (FRD §F00.3)
    await this.prisma.ticketHistory.create({
      data: {
        ticket_id: ticket.id,
        action_id: openAction.id,
        enteredByPerson_id: client.contactPerson_id,
        enteredDate: new Date(),
        actionDate: new Date(),
        data: JSON.stringify({ token }),
        notes: dto.media_url ?? null, // media_url stored in notes (FRD §F00.3)
      } as any,
    });

    // 10. Return submit response (FRD §F00.3 outputs)
    return [{
      service_request_id: ticket.id,
      token,
      service_notice: '',   // always empty per FRD §F00.3
      account_id: '',       // always empty per FRD §F00.3
    }];
  }

  /** Resolve or create people record for Open311 submitter (FRD §F00.3 §F01.1) */
  private async resolveOrCreatePerson(dto: PostRequestDto): Promise<number | null> {
    if (dto.email) {
      // Look up by email in peopleEmails
      const emailRecord = await this.prisma.peopleEmails.findFirst({
        where: { email: dto.email },
        select: { person_id: true },
      });
      if (emailRecord) return emailRecord.person_id;
    }
    // Create new person record
    const person = await this.prisma.people.create({
      data: {
        firstname: dto.first_name ?? null,
        lastname: dto.last_name ?? null,
      } as any,
    });
    // Create email if provided
    if (dto.email) {
      await this.prisma.peopleEmails.create({
        data: {
          person_id: person.id,
          email: dto.email,
          label: 'Other',
          usedForNotifications: false,
        } as any,
      });
    }
    return person.id;
  }

  // ---- F00.4: GET /open311/v2/requests ----

  /**
   * Paginated, filtered list of ServiceRequest objects.
   * Role-visibility filter applied via displayPermissionLevel (FRD §F02.5, §F00.4).
   * page_size capped at 500 (FRD §F00.4).
   */
  async getRequests(dto: GetRequestsDto, role: string | null | undefined): Promise<Open311ServiceRequestDto[]> {
    const levels = permissionLevels(role);
    const pageSize = Math.min(dto.page_size ?? 100, 500);
    const page = dto.page ?? 1;
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Record<string, unknown> = {
      category: {
        displayPermissionLevel: { in: levels },
      },
    };

    // status filter (FRD §F00.4)
    if (dto.status) {
      where['status'] = dto.status;
    } else {
      where['status'] = 'open'; // default per FRD §F00.4
    }

    // service_code filter (FRD §F00.4)
    if (dto.service_code) {
      where['category_id'] = dto.service_code;
    }

    // service_request_id list filter (FRD §F00.4)
    if (dto.service_request_id) {
      const ids = dto.service_request_id.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      if (ids.length > 0) where['id'] = { in: ids };
    }

    // Date range filters (FRD §F00.4)
    if (dto.start_date || dto.end_date) {
      const dateFilter: Record<string, unknown> = {};
      if (dto.start_date) {
        const d = new Date(dto.start_date);
        if (isNaN(d.getTime())) throw new BadRequestException({ error: 'INVALID_INPUT', message: 'Invalid date format; use ISO 8601' });
        dateFilter['gte'] = d;
      }
      if (dto.end_date) {
        const d = new Date(dto.end_date);
        if (isNaN(d.getTime())) throw new BadRequestException({ error: 'INVALID_INPUT', message: 'Invalid date format; use ISO 8601' });
        dateFilter['lte'] = d;
      }
      where['enteredDate'] = dateFilter;
    }

    // Radius search validation (FRD §F00.4) — actual geo filter deferred to Wave 5 GeoModule
    if (dto.radius !== undefined && (dto.lat === undefined || dto.long === undefined)) {
      throw new BadRequestException({ error: 'MISSING_PARAMETER', message: 'lat and long required for radius search' });
    }

    const tickets = await this.prisma.tickets.findMany({
      where: where as any,
      include: {
        category: { include: { department: true, categoryGroup: true } },
        substatus: true,
        media: { take: 1, orderBy: { id: 'asc' } },
      },
      orderBy: { enteredDate: 'desc' },
      skip,
      take: pageSize,
    });

    return tickets.map(t => this.mapTicketToServiceRequest(t));
  }

  // ---- F00.5: GET /open311/v2/requests/:id ----

  /**
   * Single ticket wrapped in array (GeoReport v2 spec).
   * 404 if not found or category not visible (FRD §F00.5).
   */
  async getRequest(id: number, role: string | null | undefined): Promise<Open311ServiceRequestDto[]> {
    const levels = permissionLevels(role);

    const ticket = await this.prisma.tickets.findUnique({
      where: { id },
      include: {
        category: { include: { department: true, categoryGroup: true } },
        substatus: true,
        media: { take: 1, orderBy: { id: 'asc' } },
      },
    });

    if (!ticket || !ticket.category || !(levels as string[]).includes(ticket.category.displayPermissionLevel)) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Service request not found' });
    }

    return [this.mapTicketToServiceRequest(ticket)];
  }

  // ---- F00.6: GET /open311/v2/tokens/:token ----

  /**
   * Look up token in ticketHistory.data where action is 'open'.
   * Token stored as JSON: {"token": "<uuid>"}.
   * Returns 404 if not found (FRD §F00.6).
   */
  async getToken(token: string): Promise<Open311TokenResponseDto[]> {
    // Find ticketHistory rows with action_id = open action, search data JSON for token
    const openAction = await this.prisma.actions.findFirst({ where: { name: 'open', type: 'system' } });
    if (!openAction) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Token not found' });

    // Postgres JSON containment: find row where data contains the token value
    // Using $queryRaw for JSON field search (Prisma does not support JSON field contains in all versions)
    const results = await this.prisma.$queryRaw<Array<{ ticket_id: number }>>`
      SELECT ticket_id FROM "ticketHistory"
      WHERE action_id = ${openAction.id}
        AND data::jsonb @> ${JSON.stringify({ token })}::jsonb
      LIMIT 1
    `;

    if (!results || results.length === 0) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Token not found' });
    }

    return [{
      token,
      service_request_id: results[0].ticket_id,
    }];
  }

  // ---- Internal helpers ----

  /**
   * Maps a Prisma ticket record (with includes) to Open311ServiceRequestDto.
   * Field mapping per FRD §F00.4 outputs — exact field names required.
   */
  private mapTicketToServiceRequest(ticket: any): Open311ServiceRequestDto {
    const category = ticket.category;
    const department = category?.department;
    const substatus = ticket.substatus;
    const firstMedia = ticket.media?.[0] ?? null;

    // expected_datetime: enteredDate + slaDays calendar days (FRD §F00.4)
    const expectedDatetime = calcExpectedDatetime(ticket.enteredDate, category?.slaDays ?? null);

    // media_url: URL to first media attachment (FRD §F00.4)
    // Wave 5 MediaModule will provide the actual URL construction; for now use null placeholder
    // TODO Wave 5: construct URL as /tickets/{id}/media/{internalFilename} via MediaService
    const mediaUrl: string | null = firstMedia
      ? `/tickets/${ticket.id}/media/${firstMedia.internalFilename}`
      : null;

    return {
      service_request_id: ticket.id,
      status: ticket.status as 'open' | 'closed',
      status_notes: substatus?.description ?? '',
      service_name: category?.name ?? '',
      service_code: ticket.category_id ?? 0,
      description: ticket.description ?? '',
      agency_responsible: department?.name ?? '',
      service_notice: '',  // always empty per GeoReport v2 spec (FRD §F00.4)
      requested_datetime: new Date(ticket.enteredDate).toISOString(),
      updated_datetime: new Date(ticket.lastModified).toISOString(),
      expected_datetime: expectedDatetime,
      address: ticket.location ?? '',
      address_id: ticket.addressId ? String(ticket.addressId) : '',
      zipcode: ticket.zip ?? '',
      lat: ticket.latitude ?? null,
      long: ticket.longitude ?? null,
      media_url: mediaUrl,
    };
  }
}
