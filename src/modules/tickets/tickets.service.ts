import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TicketsRepository, permissionLevels } from './tickets.repository';
import { CategoriesService } from '../categories/categories.service';
import { PeopleService } from '../people/people.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CloseTicketDto } from './dto/close-ticket.dto';
import { DuplicateTicketDto } from './dto/duplicate-ticket.dto';
import { CommentTicketDto } from './dto/comment-ticket.dto';
import { ResponseTicketDto } from './dto/response-ticket.dto';
import { ReopenTicketDto } from './dto/reopen-ticket.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import type { Prisma } from '@prisma/client';

// Inline role helper (same pattern as Categories/People modules)
function isStaff(user: { role: string | null } | null): boolean {
  return user?.role === 'staff';
}

function requireStaffUser(user: { role: string | null } | null): void {
  if (!isStaff(user)) {
    throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Staff access required' });
  }
}

/**
 * Resolve the caller's role descriptor for category visibility filtering.
 * - null/undefined user → anonymous
 * - user.role = null → authenticated public citizen
 * - user.role = 'staff' → staff
 */
function roleDescriptor(user: { id: number; role: string | null } | null): { role: string | null; isAuthenticated: boolean } {
  if (!user) return { role: undefined as unknown as null, isAuthenticated: false };
  return { role: user.role, isAuthenticated: true };
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly repo: TicketsRepository,
    private readonly categoriesService: CategoriesService,
    private readonly peopleService: PeopleService,
  ) {}

  // =========================================================
  // Internal helpers
  // =========================================================

  private async loadTicket(id: number, role?: string | null) {
    const ticket = await this.repo.findOne(id);
    if (!ticket) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Ticket not found' });
    }
    // Visibility check per FRD §F02.5 — ticket hidden if category not visible to role
    if (ticket.category) {
      const levels = permissionLevels(role);
      if (!levels.includes(ticket.category.displayPermissionLevel)) {
        throw new NotFoundException({ error: 'NOT_FOUND', message: 'Ticket not found' });
      }
    }
    return ticket;
  }

  private async resolveAction(name: string) {
    const action = await this.repo.getActionByName(name);
    if (!action) {
      throw new Error(`System action '${name}' not found in actions table — ensure seed data is present`);
    }
    return action;
  }

  // =========================================================
  // F01.1 List Tickets (plan 09 — findAll with user object)
  // =========================================================

  /** List tickets filtered by the caller's category visibility permission (FRD §F02.5) */
  async findAll(user: { id: number; role: string | null } | null) {
    return this.repo.findAll(roleDescriptor(user));
  }

  // =========================================================
  // F01.1 Get Single Ticket
  // =========================================================

  /**
   * Load ticket by id; apply category visibility check (FRD §F01.1 / §F02.5).
   * Accepts either a role string (plan 10 controller) or user object (plan 09 compat).
   * Returns 404 if ticket not visible to caller's role.
   */
  async findOne(id: number, roleOrUser: string | null | undefined | { id: number; role: string | null } | null) {
    const role = (roleOrUser && typeof roleOrUser === 'object')
      ? (roleOrUser as { id: number; role: string | null }).role
      : roleOrUser as string | null | undefined;
    return this.loadTicket(id, role);
  }

  // =========================================================
  // F01.9 Paginated list (plan 10 — list() with role + ListTicketsDto)
  // =========================================================

  /**
   * Paginated ticket list with RBAC category visibility filter (FRD §F02.5).
   * Returns { total, page, pageSize, results }.
   * Used by plan 10 controller (GET /tickets).
   */
  async list(role: string | null | undefined, dto: ListTicketsDto) {
    const page = dto.page ?? 1;
    const pageSize = dto.page_size ?? 25;

    const where: Prisma.ticketsWhereInput = {};
    if (dto.status) where.status = dto.status;
    if (dto.category_id !== undefined) where.category_id = dto.category_id;
    if (dto.assignedPerson_id !== undefined) where.assignedPerson_id = dto.assignedPerson_id;

    const { total, results } = await this.repo.findAllPaginated(role, where, page, pageSize);

    return { total, page, pageSize, results };
  }

  // =========================================================
  // F01.1 Create Ticket
  // =========================================================

  /**
   * Create a ticket per FRD §F01.1.
   */
  async create(dto: CreateTicketDto, user: { id: number; role: string | null } | null) {
    // Load category using staff role to bypass display filter
    const category = await this.categoriesService.findOne(dto.category_id, 'staff');
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

    // Validate customFields if provided (FRD §F01.1 validation)
    if (dto.customFields) {
      try {
        JSON.parse(dto.customFields);
      } catch {
        throw new BadRequestException({ error: 'INVALID_INPUT', message: 'customFields must be valid JSON' });
      }
    }

    // Validate reportedByPerson_id if provided
    if (dto.reportedByPerson_id) {
      await this.peopleService.findOne(dto.reportedByPerson_id);
    }

    const now = new Date();

    const ticket = await this.repo.create({
      category: dto.category_id ? { connect: { id: dto.category_id } } : undefined,
      issueType: dto.issueType_id ? { connect: { id: dto.issueType_id } } : undefined,
      enteredByPerson: user ? { connect: { id: user.id } } : undefined,
      reportedByPerson: dto.reportedByPerson_id ? { connect: { id: dto.reportedByPerson_id } } : undefined,
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
      await this.repo.appendHistory({
        ticket: { connect: { id: ticket.id } },
        action: { connect: { id: openAction.id } },
        enteredByPerson: user ? { connect: { id: user.id } } : undefined,
        enteredDate: now,
        actionDate: now,
      } as any);
    }

    return ticket;
  }

  // =========================================================
  // F01.3 Update Ticket (changeCategory / changeLocation / update)
  // =========================================================

  /**
   * FRD §F01.3: Update ticket fields with appropriate audit action.
   * - category_id change → 'changeCategory' action, data = { original, updated }
   * - location change → 'changeLocation' action, data = { original, updated }
   * - other changes → 'update' action
   *
   * Plan 10 signature: update(ticketId, dto, actorId: number)
   * Staff check is done in the controller via requireStaff().
   */
  async update(ticketId: number, dto: UpdateTicketDto, actorId: number | { id: number; role: string | null }) {
    // Support both plan 09 (user object) and plan 10 (actorId: number) signatures
    const userId = typeof actorId === 'number' ? actorId : actorId.id;
    const userRole = typeof actorId === 'number' ? 'staff' : actorId.role;
    if (typeof actorId !== 'number') {
      requireStaffUser(actorId);
    }

    const existing = await this.loadTicket(ticketId, userRole);

    // Validate customFields if provided
    if (dto.customFields !== undefined && dto.customFields !== null) {
      try { JSON.parse(dto.customFields); } catch {
        throw new BadRequestException({ error: 'INVALID_INPUT', message: 'customFields must be valid JSON' });
      }
    }

    // Validate coordinate ranges
    if (dto.latitude !== undefined && (dto.latitude < -90 || dto.latitude > 90)) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'Coordinates out of valid range' });
    }
    if (dto.longitude !== undefined && (dto.longitude < -180 || dto.longitude > 180)) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'Coordinates out of valid range' });
    }

    const now = new Date();
    let actionName = 'update';
    let actionData: string | null = null;

    // FRD §F01.3: category change logs changeCategory
    if (dto.category_id !== undefined && dto.category_id !== existing.category_id) {
      actionName = 'changeCategory';
      actionData = JSON.stringify({ original: existing.category_id, updated: dto.category_id });
    }
    // FRD §F01.3: location change logs changeLocation
    else if (dto.location !== undefined && dto.location !== existing.location) {
      actionName = 'changeLocation';
      actionData = JSON.stringify({ original: existing.location, updated: dto.location });
    }

    const ticket = await this.repo.update(ticketId, {
      ...this.buildUpdateInput(dto),
      lastModified: now,
    } as any);

    const action = await this.repo.findActionByName(actionName);
    if (action) {
      await this.repo.appendHistory({
        ticket: { connect: { id: ticketId } },
        action: { connect: { id: action.id } },
        enteredByPerson: { connect: { id: userId } },
        enteredDate: now,
        actionDate: now,
        data: actionData,
      } as any);
    }

    // HOOK: wave 5 — SolrService.indexTicket(ticketId) — fire-and-forget
    // HOOK: wave 5 — if lat/lon changed: GeoClusterService.assignClusters(ticketId, lat, lon)

    return ticket;
  }

  // =========================================================
  // F01.2 Assign Ticket
  // =========================================================

  /** Assign ticket to a person per FRD §F01.2. */
  async assign(id: number, dto: AssignTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);

    const ticket = await this.loadTicket(id, user.role);

    const assignee = await this.peopleService.findOne(dto.assignedPerson_id);

    if (ticket.category) {
      const deptId = ticket.category.department_id;
      if (assignee.department_id !== deptId) {
        throw new BadRequestException({
          error: 'INVALID_INPUT',
          message: "Assignee must belong to the ticket's department",
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
      await this.repo.appendHistory({
        ticket: { connect: { id } },
        action: { connect: { id: action.id } },
        enteredByPerson: { connect: { id: user.id } },
        actionPerson: { connect: { id: dto.assignedPerson_id } },
        enteredDate: now,
        actionDate: now,
      } as any);
    }

    return updated;
  }

  // =========================================================
  // F01.4 Close Ticket
  // =========================================================

  /**
   * FRD §F01.4: Close ticket with substatus.
   * - Validates substatus exists and has status = 'closed'
   * - Validates ticket is currently open (409 if already closed)
   * - Sets status='closed', closedDate=NOW(), substatus_id, lastModified=NOW()
   * - Appends 'closed' action to ticketHistory
   *
   * Plan 10 signature: close(ticketId, dto, actorId: number) — staff check in controller.
   * Plan 09 compat: close(id, dto, user: object) — checks staff internally.
   */
  async close(ticketId: number, dto: CloseTicketDto, actorId: number | { id: number; role: string | null }) {
    const userId = typeof actorId === 'number' ? actorId : actorId.id;
    if (typeof actorId !== 'number') {
      requireStaffUser(actorId);
    }

    const ticket = await this.loadTicket(ticketId, 'staff');

    if (ticket.status === 'closed') {
      throw new ConflictException({ error: 'CONFLICT', message: 'Ticket is already closed' });
    }

    const substatus = await this.repo.getSubstatus(dto.substatus_id);
    if (!substatus || substatus.status !== 'closed') {
      throw new BadRequestException({
        error: 'INVALID_INPUT',
        message: 'substatus_id must reference a closed sub-status',
      });
    }

    const action = await this.resolveAction('closed');
    const now = new Date();

    await this.repo.appendHistory({
      ticket: { connect: { id: ticketId } },
      action: { connect: { id: action.id } },
      enteredByPerson: { connect: { id: userId } },
      enteredDate: now,
      actionDate: now,
      notes: dto.notes ?? null,
      data: null,
      sentNotifications: null,
    } as any);

    const updated = await this.repo.update(ticketId, {
      status: 'closed',
      substatus: { connect: { id: dto.substatus_id } },
      closedDate: now,
      lastModified: now,
    } as any);

    // HOOK: wave 5 — SolrService.indexTicket(ticketId)
    // HOOK: wave 5 — NotificationsService.send('closed', ticket, actorId)

    return updated;
  }

  // =========================================================
  // F01.5 Mark as Duplicate
  // =========================================================

  /**
   * FRD §F01.5: Mark child ticket as duplicate of parent.
   * CRITICAL: 'duplicate' action logged on PARENT only (FRD §F01.5).
   *
   * Plan 10 signature: duplicate(ticketId, dto, actorId: number) — staff check in controller.
   */
  async duplicate(ticketId: number, dto: DuplicateTicketDto, actorId: number | { id: number; role: string | null }) {
    const userId = typeof actorId === 'number' ? actorId : actorId.id;
    if (typeof actorId !== 'number') {
      requireStaffUser(actorId);
    }

    if (ticketId === dto.parent_id) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'A ticket cannot be its own parent' });
    }

    const child = await this.loadTicket(ticketId, 'staff');
    if (child.parent_id !== null) {
      throw new BadRequestException({
        error: 'INVALID_INPUT',
        message: 'Ticket already has a parent_id — it is already marked as a duplicate',
      });
    }

    const parent = await this.repo.findOne(dto.parent_id);
    if (!parent) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Parent ticket not found' });
    }

    const duplicateSub = await this.repo.findDuplicateSubstatus();
    if (!duplicateSub) {
      throw new Error("'Duplicate' substatus row not found — ensure seed data is present");
    }

    const now = new Date();

    // Close child with Duplicate substatus; append 'closed' history on child
    await this.repo.update(ticketId, {
      parent: { connect: { id: dto.parent_id } },
      status: 'closed',
      substatus: { connect: { id: duplicateSub.id } },
      closedDate: now,
      lastModified: now,
    } as any);

    const closedAction = await this.repo.findActionByName('closed');
    if (closedAction) {
      await this.repo.appendHistory({
        ticket: { connect: { id: ticketId } },
        action: { connect: { id: closedAction.id } },
        enteredByPerson: { connect: { id: userId } },
        enteredDate: now,
        actionDate: now,
        notes: null,
        data: null,
        sentNotifications: null,
      } as any);
    }

    // Append 'duplicate' action to PARENT ticketHistory only (FRD §F01.5)
    const duplicateAction = await this.repo.findActionByName('duplicate');
    if (duplicateAction) {
      await this.repo.appendHistory({
        ticket: { connect: { id: dto.parent_id } },
        action: { connect: { id: duplicateAction.id } },
        enteredByPerson: { connect: { id: userId } },
        enteredDate: now,
        actionDate: now,
        notes: null,
        data: JSON.stringify({ duplicate: ticketId }),
        sentNotifications: null,
      } as any);
    }

    // Update parent lastModified
    await this.repo.update(dto.parent_id, { lastModified: now });

    // HOOK: wave 5 — NotificationsService.send('duplicate', child, actorId)

    return this.repo.findOne(ticketId);
  }

  // =========================================================
  // F01.6 Add Comment
  // =========================================================

  /**
   * FRD §F01.6: Append 'comment' action to ticketHistory; update lastModified.
   * notes must be non-empty (validated at DTO level; double-checked here).
   *
   * Plan 10: addComment(ticketId, dto, actorId: number) — staff check in controller.
   */
  async addComment(ticketId: number, dto: CommentTicketDto, actorId: number) {
    await this.loadTicket(ticketId, 'staff');

    if (!dto.notes || dto.notes.trim().length === 0) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'notes must be non-empty' });
    }

    const action = await this.resolveAction('comment');
    const now = new Date();

    const history = await this.repo.appendHistory({
      ticket: { connect: { id: ticketId } },
      action: { connect: { id: action.id } },
      enteredByPerson: { connect: { id: actorId } },
      enteredDate: now,
      actionDate: now,
      notes: dto.notes,
      data: null,
      sentNotifications: null,
    } as any);

    await this.repo.update(ticketId, { lastModified: now });

    return history;
  }

  /** Plan 09 alias for addComment */
  async comment(id: number, dto: CommentTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);
    return this.addComment(id, dto, user.id);
  }

  // =========================================================
  // F01.7 Add Response
  // =========================================================

  /**
   * FRD §F01.7: Append 'response' action to ticketHistory.
   * actionPerson_id defaults to ticket.reportedByPerson_id if not supplied.
   *
   * Plan 10: addResponse(ticketId, dto, actorId: number) — staff check in controller.
   */
  async addResponse(ticketId: number, dto: ResponseTicketDto, actorId: number) {
    const ticket = await this.loadTicket(ticketId, 'staff');
    const resolvedActionPersonId = dto.actionPerson_id ?? ticket.reportedByPerson_id ?? null;

    const action = await this.resolveAction('response');
    const now = new Date();

    const historyData: any = {
      ticket: { connect: { id: ticketId } },
      action: { connect: { id: action.id } },
      enteredByPerson: { connect: { id: actorId } },
      enteredDate: now,
      actionDate: now,
      notes: dto.notes ?? null,
      data: null,
      sentNotifications: null,
    };

    if (resolvedActionPersonId !== null) {
      historyData.actionPerson = { connect: { id: resolvedActionPersonId } };
    }

    const history = await this.repo.appendHistory(historyData as Prisma.ticketHistoryCreateInput);

    await this.repo.update(ticketId, { lastModified: now });

    // HOOK: wave 5 — NotificationsService.send('response', ticket, actorId)

    return history;
  }

  /** Plan 09 alias for addResponse */
  async respond(id: number, dto: ResponseTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);
    return this.addResponse(id, dto, user.id);
  }

  // =========================================================
  // F01.8 Re-open Ticket
  // =========================================================

  /**
   * FRD §F01.8: Re-open a closed ticket.
   * - 409 if already open
   * - Clears closedDate and substatus_id
   * - Appends 'update' action with re-open notes
   *
   * Plan 10: reopen(ticketId, dto, actorId: number) — staff check in controller.
   */
  async reopen(ticketId: number, dto: ReopenTicketDto, actorId: number | { id: number; role: string | null }) {
    const userId = typeof actorId === 'number' ? actorId : actorId.id;
    if (typeof actorId !== 'number') {
      requireStaffUser(actorId);
    }

    const ticket = await this.loadTicket(ticketId, 'staff');

    if (ticket.status === 'open') {
      throw new ConflictException({ error: 'CONFLICT', message: 'Ticket is already open' });
    }

    const action = await this.resolveAction('update');
    const now = new Date();

    await this.repo.appendHistory({
      ticket: { connect: { id: ticketId } },
      action: { connect: { id: action.id } },
      enteredByPerson: { connect: { id: userId } },
      enteredDate: now,
      actionDate: now,
      notes: dto.notes ?? 'Ticket re-opened',
      data: null,
      sentNotifications: null,
    } as any);

    const updated = await this.repo.update(ticketId, {
      status: 'open',
      closedDate: null,
      substatus_id: null,
      lastModified: now,
    } as any);

    // HOOK: wave 5 — SolrService.indexTicket(ticketId)

    return updated;
  }

  // =========================================================
  // F01.9 Ticket History
  // =========================================================

  /**
   * FRD §F01.9: Ticket history ordered by enteredDate ASC.
   * PII masking for non-staff is applied by PiiMaskInterceptor at the controller level.
   *
   * Accepts either role: string|null (plan 10) or user object (plan 09).
   */
  async getHistory(ticketId: number, roleOrUser: string | null | undefined | { id: number; role: string | null } | null) {
    const role = (roleOrUser && typeof roleOrUser === 'object')
      ? (roleOrUser as { id: number; role: string | null }).role
      : roleOrUser as string | null | undefined;
    await this.loadTicket(ticketId, role);
    return this.repo.getHistory(ticketId);
  }

  // =========================================================
  // Private helpers
  // =========================================================

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
    if (dto.customFields !== undefined) input['customFields'] = dto.customFields;
    if (dto.additionalFields !== undefined) input['additionalFields'] = dto.additionalFields;
    return input;
  }
}
