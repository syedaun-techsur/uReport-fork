import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TicketsRepository, permissionLevels } from './tickets.repository';
import { CloseTicketDto } from './dto/close-ticket.dto';
import { DuplicateTicketDto } from './dto/duplicate-ticket.dto';
import { CommentTicketDto } from './dto/comment-ticket.dto';
import { ResponseTicketDto } from './dto/response-ticket.dto';
import { ReopenTicketDto } from './dto/reopen-ticket.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import type { Prisma } from '@prisma/client';

@Injectable()
export class TicketsService {
  constructor(private readonly repo: TicketsRepository) {}

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

  /** Find the 'Duplicate' substatus row via PrismaService */
  private async findDuplicateSubstatus() {
    const sub = await this.repo.prisma.substatus.findFirst({
      where: { name: 'Duplicate', status: 'closed' },
    });
    if (!sub) {
      throw new Error("'Duplicate' substatus row not found — ensure seed data is present");
    }
    return sub;
  }

  // =========================================================
  // F01.3 Update Ticket (changeCategory / changeLocation / update)
  // =========================================================

  /**
   * FRD §F01.3: Update ticket fields with appropriate audit action.
   * - category_id change → 'changeCategory' action, data = { original, updated }
   * - location change → 'changeLocation' action, data = { original, updated }
   * - other changes → 'update' action
   * All three update lastModified.
   * Hooks: Solr re-index (wave 5), geo re-cluster (wave 5 if lat/lon changed).
   */
  async update(ticketId: number, dto: UpdateTicketDto, actorId: number) {
    const ticket = await this.loadTicket(ticketId, 'staff');

    // Validate customFields JSON if provided (FRD §F01.3, §F01.1 validation)
    if (dto.customFields !== undefined && dto.customFields !== null) {
      try { JSON.parse(dto.customFields); } catch {
        throw new BadRequestException({ error: 'INVALID_INPUT', message: 'customFields must be valid JSON' });
      }
    }

    // Validate coordinate ranges (FRD §F01.1 / §F01.3)
    if (dto.latitude !== undefined && (dto.latitude < -90 || dto.latitude > 90)) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'Coordinates out of valid range' });
    }
    if (dto.longitude !== undefined && (dto.longitude < -180 || dto.longitude > 180)) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'Coordinates out of valid range' });
    }

    const now = new Date();

    // Determine and log action type (FRD §F01.3)
    if (dto.category_id !== undefined && dto.category_id !== ticket.category_id) {
      const action = await this.resolveAction('changeCategory');
      await this.repo.appendHistory({
        ticket_id: ticketId,
        action_id: action.id,
        enteredByPerson_id: actorId,
        enteredDate: now,
        actionDate: now,
        data: JSON.stringify({ original: ticket.category_id, updated: dto.category_id }),
        notes: null,
        sentNotifications: null,
      } as Prisma.ticketHistoryUncheckedCreateInput);
    } else if (dto.location !== undefined && dto.location !== ticket.location) {
      const action = await this.resolveAction('changeLocation');
      await this.repo.appendHistory({
        ticket_id: ticketId,
        action_id: action.id,
        enteredByPerson_id: actorId,
        enteredDate: now,
        actionDate: now,
        data: JSON.stringify({ original: ticket.location, updated: dto.location }),
        notes: null,
        sentNotifications: null,
      } as Prisma.ticketHistoryUncheckedCreateInput);
    } else {
      const action = await this.resolveAction('update');
      await this.repo.appendHistory({
        ticket_id: ticketId,
        action_id: action.id,
        enteredByPerson_id: actorId,
        enteredDate: now,
        actionDate: now,
        data: null,
        notes: null,
        sentNotifications: null,
      } as Prisma.ticketHistoryUncheckedCreateInput);
    }

    const updated = await this.repo.update(ticketId, {
      ...dto,
      lastModified: now,
    } as unknown as Prisma.ticketsUncheckedUpdateInput);

    // HOOK: wave 5 — SolrService.indexTicket(ticketId) — fire-and-forget
    // HOOK: wave 5 — if lat/lon changed: GeoClusterService.assignClusters(ticketId, lat, lon)

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
   * Hook: Solr re-index (wave 5), 'closed' email notification (wave 5).
   */
  async close(ticketId: number, dto: CloseTicketDto, actorId: number) {
    const ticket = await this.loadTicket(ticketId, 'staff');

    // FRD §F01.4 validation
    if (ticket.status === 'closed') {
      throw new ConflictException({ error: 'CONFLICT', message: 'Ticket is already closed' });
    }

    const sub = await this.repo.getSubstatus(dto.substatus_id);
    if (!sub || sub.status !== 'closed') {
      throw new BadRequestException({
        error: 'INVALID_INPUT',
        message: 'substatus_id must reference a closed sub-status',
      });
    }

    const action = await this.resolveAction('closed');
    const now = new Date();

    // Append audit entry BEFORE updating ticket (consistent ordering)
    await this.repo.appendHistory({
      ticket_id: ticketId,
      action_id: action.id,
      enteredByPerson_id: actorId,
      enteredDate: now,
      actionDate: now,
      notes: dto.notes ?? null,
      data: null,
      sentNotifications: null,
    } as Prisma.ticketHistoryUncheckedCreateInput);

    const updated = await this.repo.update(ticketId, {
      status: 'closed',
      substatus_id: dto.substatus_id,
      closedDate: now,
      lastModified: now,
    } as Prisma.ticketsUncheckedUpdateInput);

    // HOOK: wave 5 — SolrService.indexTicket(ticketId)
    // HOOK: wave 5 — NotificationsService.send('closed', ticket, actorId)

    return updated;
  }

  // =========================================================
  // F01.5 Mark as Duplicate
  // =========================================================

  /**
   * FRD §F01.5: Mark child ticket as duplicate of parent.
   *
   * CRITICAL RULE (FRD §F01.5):
   * - 'duplicate' action is appended to PARENT ticketHistory only
   *   with data = { duplicate: child_ticket_id }
   * - Child's record of the event is its 'closed' action entry
   *   (substatus = the 'Duplicate' substatus row)
   * - Child gets parent_id set
   */
  async duplicate(ticketId: number, dto: DuplicateTicketDto, actorId: number) {
    // Self-reference guard (FRD §F01.5)
    if (ticketId === dto.parent_id) {
      throw new BadRequestException({
        error: 'INVALID_INPUT',
        message: 'A ticket cannot be its own parent',
      });
    }

    const child = await this.loadTicket(ticketId, 'staff');
    const parent = await this.repo.findOne(dto.parent_id);
    if (!parent) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Parent ticket not found' });
    }

    // Child must not already be linked to a parent (FRD §F01.5)
    if (child.parent_id !== null) {
      throw new BadRequestException({
        error: 'INVALID_INPUT',
        message: 'Ticket already has a parent_id — it is already marked as a duplicate',
      });
    }

    // Find the 'Duplicate' substatus (name = 'Duplicate', status = 'closed')
    const duplicateSub = await this.findDuplicateSubstatus();

    const closedAction = await this.resolveAction('closed');
    const duplicateAction = await this.resolveAction('duplicate');
    const now = new Date();

    // 1. Close child with substatus = Duplicate (appends 'closed' history on child)
    await this.repo.appendHistory({
      ticket_id: ticketId,
      action_id: closedAction.id,
      enteredByPerson_id: actorId,
      enteredDate: now,
      actionDate: now,
      notes: null,
      data: null,
      sentNotifications: null,
    } as Prisma.ticketHistoryUncheckedCreateInput);

    await this.repo.update(ticketId, {
      parent_id: dto.parent_id,
      status: 'closed',
      substatus_id: duplicateSub.id,
      closedDate: now,
      lastModified: now,
    } as Prisma.ticketsUncheckedUpdateInput);

    // 2. Append 'duplicate' action to PARENT ticketHistory only (FRD §F01.5)
    await this.repo.appendHistory({
      ticket_id: dto.parent_id,
      action_id: duplicateAction.id,
      enteredByPerson_id: actorId,
      enteredDate: now,
      actionDate: now,
      notes: null,
      data: JSON.stringify({ duplicate: ticketId }),
      sentNotifications: null,
    } as Prisma.ticketHistoryUncheckedCreateInput);

    // Update parent lastModified (duplicate event touches parent)
    await this.repo.update(dto.parent_id, { lastModified: now });

    const updatedChild = await this.repo.findOne(ticketId);

    // HOOK: wave 5 — NotificationsService.send('duplicate', child, actorId)

    return updatedChild!;
  }

  // =========================================================
  // F01.6 Add Comment
  // =========================================================

  /**
   * FRD §F01.6: Append 'comment' action to ticketHistory; update lastModified.
   * notes must be non-empty (validated at DTO level; double-checked here).
   */
  async addComment(ticketId: number, dto: CommentTicketDto, actorId: number) {
    await this.loadTicket(ticketId, 'staff');

    if (!dto.notes || dto.notes.trim().length === 0) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'notes must be non-empty' });
    }

    const action = await this.resolveAction('comment');
    const now = new Date();

    const history = await this.repo.appendHistory({
      ticket_id: ticketId,
      action_id: action.id,
      enteredByPerson_id: actorId,
      enteredDate: now,
      actionDate: now,
      notes: dto.notes,
      data: null,
      sentNotifications: null,
    } as Prisma.ticketHistoryUncheckedCreateInput);

    await this.repo.update(ticketId, { lastModified: now });

    return history;
  }

  // =========================================================
  // F01.7 Add Response
  // =========================================================

  /**
   * FRD §F01.7: Append 'response' action to ticketHistory.
   * actionPerson_id defaults to ticket.reportedByPerson_id if not supplied.
   * Hook: 'response' email notification (wave 5).
   */
  async addResponse(ticketId: number, dto: ResponseTicketDto, actorId: number) {
    const ticket = await this.loadTicket(ticketId, 'staff');

    const resolvedActionPersonId =
      dto.actionPerson_id ?? ticket.reportedByPerson_id ?? null;

    const action = await this.resolveAction('response');
    const now = new Date();

    const history = await this.repo.appendHistory({
      ticket_id: ticketId,
      action_id: action.id,
      enteredByPerson_id: actorId,
      actionPerson_id: resolvedActionPersonId,
      enteredDate: now,
      actionDate: now,
      notes: dto.notes ?? null,
      data: null,
      sentNotifications: null,
    } as Prisma.ticketHistoryUncheckedCreateInput);

    await this.repo.update(ticketId, { lastModified: now });

    // HOOK: wave 5 — NotificationsService.send('response', ticket, actorId)

    return history;
  }

  // =========================================================
  // F01.8 Re-open Ticket
  // =========================================================

  /**
   * FRD §F01.8: Re-open a closed ticket.
   * - 409 if already open
   * - Clears closedDate and substatus_id
   * - Appends 'update' action with re-open notes
   * Hook: Solr re-index (wave 5).
   */
  async reopen(ticketId: number, dto: ReopenTicketDto, actorId: number) {
    const ticket = await this.loadTicket(ticketId, 'staff');

    if (ticket.status === 'open') {
      throw new ConflictException({ error: 'CONFLICT', message: 'Ticket is already open' });
    }

    const action = await this.resolveAction('update');
    const now = new Date();

    await this.repo.appendHistory({
      ticket_id: ticketId,
      action_id: action.id,
      enteredByPerson_id: actorId,
      enteredDate: now,
      actionDate: now,
      notes: dto.notes ?? 'Ticket re-opened',
      data: null,
      sentNotifications: null,
    } as Prisma.ticketHistoryUncheckedCreateInput);

    const updated = await this.repo.update(ticketId, {
      status: 'open',
      closedDate: null,
      substatus_id: null,
      lastModified: now,
    } as Prisma.ticketsUncheckedUpdateInput);

    // HOOK: wave 5 — SolrService.indexTicket(ticketId)

    return updated;
  }

  // =========================================================
  // F01.9 Ticket History + list endpoints
  // =========================================================

  /**
   * Paginated ticket list with RBAC category visibility filter (FRD §F02.5).
   * Returns { total, page, pageSize, results }.
   */
  async list(role: string | null | undefined, dto: ListTicketsDto) {
    const page = dto.page ?? 1;
    const pageSize = dto.page_size ?? 25;

    const where: Prisma.ticketsWhereInput = {};
    if (dto.status) where.status = dto.status;
    if (dto.category_id !== undefined) where.category_id = dto.category_id;
    if (dto.assignedPerson_id !== undefined) where.assignedPerson_id = dto.assignedPerson_id;

    const { total, results } = await this.repo.findAll(role, where, page, pageSize);

    return { total, page, pageSize, results };
  }

  /**
   * Single ticket detail with visibility check.
   */
  async findOne(id: number, role: string | null | undefined) {
    return this.loadTicket(id, role);
  }

  /**
   * FRD §F01.9: Ticket history ordered by enteredDate ASC.
   * PII masking for non-staff is applied by PiiMaskInterceptor at the controller level.
   */
  async getHistory(ticketId: number, role: string | null | undefined) {
    // Verify ticket exists and is visible to caller's role
    await this.loadTicket(ticketId, role);
    return this.repo.getHistory(ticketId);
  }
}
