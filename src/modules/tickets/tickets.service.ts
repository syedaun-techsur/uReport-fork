import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { TicketsRepository } from './tickets.repository';
import { CategoriesService } from '../categories/categories.service';
import { PeopleService } from '../people/people.service';
import { GeoClusterService } from '../geo/geo.service';
import { SolrService } from '../search/solr.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { NotificationAction } from '../notifications/notifications.types';
import { GelfLoggerService } from '../../common/logger/gelf-logger.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CloseTicketDto } from './dto/close-ticket.dto';
import { DuplicateTicketDto } from './dto/duplicate-ticket.dto';
import { CommentTicketDto } from './dto/comment-ticket.dto';
import { ResponseTicketDto } from './dto/response-ticket.dto';
import { ReopenTicketDto } from './dto/reopen-ticket.dto';

function isStaff(user: { role: string | null } | null): boolean {
  return user?.role === 'staff';
}

function requireStaffUser(user: { role: string | null } | null): void {
  if (!isStaff(user)) {
    throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Staff access required' });
  }
}

function roleDescriptor(
  user: { id: number; role: string | null } | null,
): { role: string | null | undefined; isAuthenticated: boolean } {
  if (!user) return { role: undefined, isAuthenticated: false };
  return { role: user.role, isAuthenticated: true };
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly repo: TicketsRepository,
    private readonly categoriesService: CategoriesService,
    private readonly peopleService: PeopleService,
    private readonly logger: GelfLoggerService,
    @Optional() private readonly geoClusterService?: GeoClusterService,
    @Optional() private readonly solrService?: SolrService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  /**
   * Fire-and-forget geo cluster assignment (FRD §F09.4).
   * Geo failure must NOT fail the ticket operation.
   */
  private fireAndForgetAssign(ticketId: number, lat: number | null | undefined, lon: number | null | undefined): void {
    if (!this.geoClusterService || lat == null || lon == null) return;
    this.geoClusterService.assignClusters(ticketId, lat, lon).catch((err: Error) => {
      // Geo failure must NOT fail the ticket operation (FRD §F09.4)
      console.error(`[GeoCluster] assignClusters failed for ticket ${ticketId}:`, err?.message);
    });
  }

  /**
   * Fire-and-forget geo data deletion when lat/lon cleared to null (FRD §F09.4).
   */
  private fireAndForgetDelete(ticketId: number): void {
    if (!this.geoClusterService) return;
    this.geoClusterService.deleteGeodata(ticketId).catch((err: Error) => {
      console.error(`[GeoCluster] deleteGeodata failed for ticket ${ticketId}:`, err?.message);
    });
  }

  /**
   * Fire-and-forget Solr indexing helper.
   * Solr failure MUST NOT propagate to the HTTP response (FRD §F05.4).
   */
  private indexTicketAsync(ticketId: number): void {
    if (!this.solrService) return;
    this.solrService.indexTicket(ticketId).catch((err: Error) => {
      // GELF warn: Solr indexing failure must NOT propagate (FRD §F05.4)
      this.logger.warn(`Solr indexing failed for ticket ${ticketId}: ${err.message}`);
    });
  }

  /**
   * Fire-and-forget notification send (FRD §F07.4).
   * Notification failure must NOT fail the ticket operation.
   */
  private notify(actionName: NotificationAction, ticketId: number, actorId: number | null, historyId?: number): void {
    if (!this.notificationsService) return;
    void this.notificationsService.send(actionName, ticketId, actorId, historyId);
  }

  async findAll(user: { id: number; role: string | null } | null) {
    return this.repo.findAll(roleDescriptor(user));
  }

  async findOne(id: number, user: { id: number; role: string | null } | null) {
    const ticket = await this.repo.findOne(id);
    if (!ticket) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Ticket not found' });
    }
    if (!isStaff(user) && ticket.category) {
      const permLevel = ticket.category.displayPermissionLevel;
      const isAuthenticated = user !== null;
      const allowed = isAuthenticated
        ? ['public', 'anonymous'].includes(permLevel)
        : permLevel === 'anonymous';
      if (!allowed) {
        throw new NotFoundException({ error: 'NOT_FOUND', message: 'Ticket not found' });
      }
    }
    return ticket;
  }

  async create(dto: CreateTicketDto, user: { id: number; role: string | null } | null) {
    const category = await this.categoriesService.findOne(dto.category_id, null);
    if (!category.active) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Category not found' });
    }

    const postingLevel = category.postingPermissionLevel;
    const isAuthenticated = user !== null;
    const postingAllowed = isStaff(user)
      ? true
      : isAuthenticated
        ? ['public', 'anonymous'].includes(postingLevel)
        : postingLevel === 'anonymous';

    if (!postingAllowed) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: 'Insufficient permission to post to this category',
      });
    }

    if (dto.customFields) {
      try {
        JSON.parse(dto.customFields);
      } catch {
        throw new BadRequestException({ error: 'INVALID_INPUT', message: 'customFields must be valid JSON' });
      }
    }

    if (dto.reportedByPerson_id) {
      await this.peopleService.findOne(dto.reportedByPerson_id);
    }

    const now = new Date();

    const ticket = await this.repo.create({
      category: dto.category_id ? { connect: { id: dto.category_id } } : undefined,
      issueType: dto.issueType_id ? { connect: { id: dto.issueType_id } } : undefined,
      enteredByPerson: user ? { connect: { id: user.id } } : undefined,
      reportedByPerson_id: dto.reportedByPerson_id ?? null,
      contactMethod_id: dto.contactMethod_id ?? null,
      responseMethod_id: dto.responseMethod_id ?? null,
      description: dto.description ?? null,
      location: dto.location ?? null,
      city: dto.city ?? null,
      state: dto.state ?? null,
      zip: dto.zip ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      addressId: dto.addressId ?? null,
      customFields: dto.customFields ?? null,
      additionalFields: dto.additionalFields ?? null,
      status: 'open',
      enteredDate: now,
      lastModified: now,
    } as any);

    const openAction = await this.repo.findActionByName('open');
    if (openAction) {
      const openHistory = await this.repo.appendHistory({
        ticket: { connect: { id: ticket.id } },
        action: { connect: { id: openAction.id } },
        enteredByPerson: user ? { connect: { id: user.id } } : undefined,
        enteredDate: now,
        actionDate: now,
      } as any);
      // F7: fire-and-forget notification (FRD §F07.4)
      this.notify('open', ticket.id, user?.id ?? null, openHistory.id);
    }

    // FRD §F09.4 — assign geo-clusters if lat/lon provided (fire-and-forget)
    this.fireAndForgetAssign(ticket.id, dto.latitude, dto.longitude);

    // FRD §F05.4: fire-and-forget Solr indexing; failure MUST NOT fail the ticket write
    this.indexTicketAsync(ticket.id);

    return ticket;
  }

  async update(id: number, dto: UpdateTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);
    const existing = await this.findOne(id, user);

    if (dto.customFields) {
      try {
        JSON.parse(dto.customFields);
      } catch {
        throw new BadRequestException({ error: 'INVALID_INPUT', message: 'customFields must be valid JSON' });
      }
    }

    const now = new Date();
    let actionName = 'update';
    let actionData: string | null = null;

    if (dto.category_id !== undefined && dto.category_id !== existing.category_id) {
      actionName = 'changeCategory';
      actionData = JSON.stringify({ original: existing.category_id, updated: dto.category_id });
    } else if (dto.location !== undefined && dto.location !== existing.location) {
      actionName = 'changeLocation';
      actionData = JSON.stringify({ original: existing.location, updated: dto.location });
    }

    const ticket = await this.repo.update(id, {
      ...this.buildUpdateInput(dto),
      lastModified: now,
    } as any);

    const action = await this.repo.findActionByName(actionName);
    if (action) {
      await this.repo.appendHistory({
        ticket: { connect: { id } },
        action: { connect: { id: action.id } },
        enteredByPerson: { connect: { id: user.id } },
        enteredDate: now,
        actionDate: now,
        data: actionData,
      } as any);
    }

    // FRD §F05.4: fire-and-forget Solr indexing
    this.indexTicketAsync(ticket.id);

    // Handle geo updates
    const latChanged = dto.latitude !== undefined;
    const lonChanged = dto.longitude !== undefined;
    if ((latChanged || lonChanged) && dto.latitude != null && dto.longitude != null) {
      this.fireAndForgetAssign(ticket.id, dto.latitude, dto.longitude);
    } else if ((latChanged || lonChanged) && dto.latitude == null && dto.longitude == null) {
      this.fireAndForgetDelete(ticket.id);
    }

    return ticket;
  }

  async assign(id: number, dto: AssignTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);
    const ticket = await this.findOne(id, user);
    const assignee = await this.peopleService.findOne(dto.assignedPerson_id);

    if (ticket.category) {
      const deptId = ticket.category.department_id;
      if (assignee.department_id !== deptId) {
        throw new BadRequestException({
          error: 'INVALID_INPUT',
          message: "Assignee must belong to the ticket department",
        });
      }
    }

    const now = new Date();

    const updated = await this.repo.update(id, {
      assignedPerson: { connect: { id: dto.assignedPerson_id } },
      lastModified: now,
    } as any);

    const action = await this.repo.findActionByName('assignment');
    if (action) {
      const assignHistory = await this.repo.appendHistory({
        ticket: { connect: { id } },
        action: { connect: { id: action.id } },
        enteredByPerson: { connect: { id: user.id } },
        actionPerson: { connect: { id: dto.assignedPerson_id } },
        enteredDate: now,
        actionDate: now,
      } as any);
      // F7: fire-and-forget notification (FRD §F07.4)
      this.notify('assignment', id, user.id, assignHistory.id);
    }

    return updated;
  }

  async close(id: number, dto: CloseTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);
    const ticket = await this.findOne(id, user);

    if (ticket.status === 'closed') {
      throw new ConflictException({ error: 'CONFLICT', message: 'Ticket is already closed' });
    }

    const substatus = await this.repo.findSubstatus(dto.substatus_id);
    if (!substatus || substatus.status !== 'closed') {
      throw new BadRequestException({
        error: 'INVALID_INPUT',
        message: 'substatus_id must reference a closed sub-status',
      });
    }

    const now = new Date();

    const updated = await this.repo.update(id, {
      status: 'closed',
      substatus: { connect: { id: dto.substatus_id } },
      closedDate: now,
      lastModified: now,
    } as any);

    const action = await this.repo.findActionByName('closed');
    if (action) {
      const closedHistory = await this.repo.appendHistory({
        ticket: { connect: { id } },
        action: { connect: { id: action.id } },
        enteredByPerson: { connect: { id: user.id } },
        enteredDate: now,
        actionDate: now,
        notes: dto.notes ?? null,
      } as any);
      // F7: fire-and-forget notification (FRD §F07.4)
      this.notify('closed', id, user.id, closedHistory.id);
    }

    // FRD §F05.4: fire-and-forget Solr indexing
    this.indexTicketAsync(updated.id);

    return updated;
  }

  async duplicate(id: number, dto: DuplicateTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);

    if (id === dto.parent_id) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'A ticket cannot be its own parent' });
    }

    const child = await this.findOne(id, user);
    if (child.parent_id !== null) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'Ticket already has a parent' });
    }

    const parent = await this.repo.findOne(dto.parent_id);
    if (!parent) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Parent ticket not found' });
    }

    const duplicateSubstatus = await this.repo.findSubstatusByName('Duplicate');
    if (!duplicateSubstatus) {
      throw new BadRequestException({ error: 'SERVER_ERROR', message: 'Duplicate substatus not seeded' });
    }

    const now = new Date();

    await this.repo.update(id, {
      parent: { connect: { id: dto.parent_id } },
      status: 'closed',
      substatus: { connect: { id: duplicateSubstatus.id } },
      closedDate: now,
      lastModified: now,
    } as any);

    const closedAction = await this.repo.findActionByName('closed');
    if (closedAction) {
      await this.repo.appendHistory({
        ticket: { connect: { id } },
        action: { connect: { id: closedAction.id } },
        enteredByPerson: { connect: { id: user.id } },
        enteredDate: now,
        actionDate: now,
      } as any);
    }

    const duplicateAction = await this.repo.findActionByName('duplicate');
    if (duplicateAction) {
      const dupHistory = await this.repo.appendHistory({
        ticket: { connect: { id: dto.parent_id } },
        action: { connect: { id: duplicateAction.id } },
        enteredByPerson: { connect: { id: user.id } },
        enteredDate: now,
        actionDate: now,
        data: JSON.stringify({ duplicate: id }),
      } as any);
      // F7: fire-and-forget notification for duplicate (FRD §F07.4)
      // Notification goes to child ticket reporter (ticket id = child)
      this.notify('duplicate', id, user.id, dupHistory.id);
    }

    return this.repo.findOne(id);
  }

  async comment(id: number, dto: CommentTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);

    if (!dto.notes || dto.notes.trim().length === 0) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'Comment notes must be non-empty' });
    }

    await this.findOne(id, user);

    const now = new Date();
    await this.repo.update(id, { lastModified: now } as any);

    const action = await this.repo.findActionByName('comment');
    if (!action) throw new BadRequestException({ error: 'SERVER_ERROR', message: 'comment action not seeded' });

    const commentHistory = await this.repo.appendHistory({
      ticket: { connect: { id } },
      action: { connect: { id: action.id } },
      enteredByPerson: { connect: { id: user.id } },
      enteredDate: now,
      actionDate: now,
      notes: dto.notes,
    } as any);

    // F7: fire-and-forget notification (FRD §F07.4)
    this.notify('comment', id, user.id, commentHistory.id);

    return commentHistory;
  }

  async respond(id: number, dto: ResponseTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);
    const ticket = await this.findOne(id, user);
    const now = new Date();
    const actionPersonId = dto.actionPerson_id ?? ticket.reportedByPerson_id ?? null;

    await this.repo.update(id, { lastModified: now } as any);

    const action = await this.repo.findActionByName('response');
    if (!action) throw new BadRequestException({ error: 'SERVER_ERROR', message: 'response action not seeded' });

    const responseHistory = await this.repo.appendHistory({
      ticket: { connect: { id } },
      action: { connect: { id: action.id } },
      enteredByPerson: { connect: { id: user.id } },
      actionPerson: actionPersonId ? { connect: { id: actionPersonId } } : undefined,
      enteredDate: now,
      actionDate: now,
      notes: dto.notes ?? null,
    } as any);

    // F7: fire-and-forget notification (FRD §F07.4)
    this.notify('response', id, user.id, responseHistory.id);

    return responseHistory;
  }

  async reopen(id: number, dto: ReopenTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);
    const ticket = await this.findOne(id, user);

    if (ticket.status === 'open') {
      throw new ConflictException({ error: 'CONFLICT', message: 'Ticket is already open' });
    }

    const now = new Date();

    const updated = await this.repo.update(id, {
      status: 'open',
      closedDate: null,
      substatus: { disconnect: true },
      lastModified: now,
    } as any);

    const action = await this.repo.findActionByName('update');
    if (action) {
      await this.repo.appendHistory({
        ticket: { connect: { id } },
        action: { connect: { id: action.id } },
        enteredByPerson: { connect: { id: user.id } },
        enteredDate: now,
        actionDate: now,
        notes: dto.notes ?? 'Ticket re-opened',
      } as any);
    }

    // FRD §F05.4: fire-and-forget Solr indexing (status change triggers re-index)
    this.indexTicketAsync(updated.id);

    return updated;
  }

  async getHistory(id: number, user: { id: number; role: string | null } | null) {
    await this.findOne(id, user);
    return this.repo.getHistory(id);
  }

  private buildUpdateInput(dto: UpdateTicketDto): Record<string, unknown> {
    const input: Record<string, unknown> = {};
    if (dto.category_id !== undefined) input['category_id'] = dto.category_id;
    if (dto.issueType_id !== undefined) input['issueType_id'] = dto.issueType_id;
    if (dto.description !== undefined) input['description'] = dto.description;
    if (dto.location !== undefined) input['location'] = dto.location;
    if (dto.city !== undefined) input['city'] = dto.city;
    if (dto.state !== undefined) input['state'] = dto.state;
    if (dto.zip !== undefined) input['zip'] = dto.zip;
    if (dto.latitude !== undefined) input['latitude'] = dto.latitude;
    if (dto.longitude !== undefined) input['longitude'] = dto.longitude;
    if (dto.addressId !== undefined) input['addressId'] = dto.addressId;
    if (dto.contactMethod_id !== undefined) input['contactMethod_id'] = dto.contactMethod_id;
    if (dto.responseMethod_id !== undefined) input['responseMethod_id'] = dto.responseMethod_id;
    if (dto.reportedByPerson_id !== undefined) input['reportedByPerson_id'] = dto.reportedByPerson_id;
    if (dto.customFields !== undefined) input['customFields'] = dto.customFields;
    if (dto.additionalFields !== undefined) input['additionalFields'] = dto.additionalFields;
    return input;
  }
}
