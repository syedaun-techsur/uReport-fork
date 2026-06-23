import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TicketsRepository } from './tickets.repository';
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

  // ---- F01.1 List Tickets ----

  /** List tickets filtered by the caller's category visibility permission (FRD §F02.5) */
  async findAll(user: { id: number; role: string | null } | null) {
    return this.repo.findAll(roleDescriptor(user));
  }

  // ---- F01.1 Get Single Ticket ----

  /**
   * Load ticket by id; apply category visibility check (FRD §F01.1 / §F02.5).
   * Returns 404 if ticket not visible to caller's role.
   */
  async findOne(id: number, user: { id: number; role: string | null } | null) {
    const ticket = await this.repo.findOne(id);
    if (!ticket) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Ticket not found' });
    }

    // Staff see all tickets; others must check category visibility
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

  // ---- F01.1 Create Ticket ----

  /**
   * Create a ticket per FRD §F01.1.
   * Process:
   * 1. Load category; verify caller's role meets postingPermissionLevel
   * 2. Resolve enteredByPerson_id from authenticated user (or null for anonymous/API)
   * 3. Validate reportedByPerson_id if provided
   * 4. Validate coordinates if provided
   * 5. Validate customFields if provided
   * 6. Persist ticket with status='open', enteredDate=NOW(), lastModified=NOW()
   * 7. Append 'open' ticketHistory entry
   * (Solr, geo-cluster, email hooks are stubs — wired in Wave 5)
   */
  async create(dto: CreateTicketDto, user: { id: number; role: string | null } | null) {
    // Step 1: Load category using staff role to bypass display filter — we need to load ANY category
    // to check its postingPermissionLevel against the caller's role (FRD §F01.1)
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

    // Step 2: Validate customFields if provided (FRD §F01.1 validation)
    if (dto.customFields) {
      try {
        JSON.parse(dto.customFields);
      } catch {
        throw new BadRequestException({ error: 'INVALID_INPUT', message: 'customFields must be valid JSON' });
      }
    }

    // Step 3: Validate reportedByPerson_id if provided
    if (dto.reportedByPerson_id) {
      await this.peopleService.findOne(dto.reportedByPerson_id); // throws 404 if not found
    }

    const now = new Date();

    // Step 4: Persist ticket (FRD §F01.1 — status='open', enteredDate=NOW(), lastModified=NOW())
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

    // Step 5: Append 'open' ticketHistory entry (FRD §F01.1)
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

  // ---- F01.3 Update Ticket ----

  /**
   * Update ticket fields per FRD §F01.3.
   * Logs changeCategory, changeLocation, or generic 'update' action to history.
   */
  async update(id: number, dto: UpdateTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);

    const existing = await this.findOne(id, user);

    // Validate customFields if provided
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

    return ticket;
  }

  // ---- F01.2 Assign Ticket ----

  /**
   * Assign ticket to a person per FRD §F01.2.
   * Validates assignee belongs to ticket's category department.
   */
  async assign(id: number, dto: AssignTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);

    const ticket = await this.findOne(id, user);

    // Validate assignee exists
    const assignee = await this.peopleService.findOne(dto.assignedPerson_id);

    // Validate assignee is in the ticket's department (FRD §F01.2)
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

  // ---- F01.4 Close Ticket ----

  /**
   * Close a ticket per FRD §F01.4.
   * Requires substatus_id referencing a substatus with status='closed'.
   */
  async close(id: number, dto: CloseTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);

    const ticket = await this.findOne(id, user);

    if (ticket.status === 'closed') {
      throw new ConflictException({ error: 'CONFLICT', message: 'Ticket is already closed' });
    }

    // Validate substatus_id references a closed sub-status (FRD §F01.4)
    const substatus = await this.repo.findSubstatus(dto.substatus_id);
    if (!substatus || substatus.status !== 'closed') {
      throw new BadRequestException({
        error: 'INVALID_INPUT',
        message: "substatus_id must reference a closed sub-status",
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
      await this.repo.appendHistory({
        ticket: { connect: { id } },
        action: { connect: { id: action.id } },
        enteredByPerson: { connect: { id: user.id } },
        enteredDate: now,
        actionDate: now,
        notes: dto.notes ?? null,
      } as any);
    }

    return updated;
  }

  // ---- F01.5 Mark as Duplicate ----

  /**
   * Mark ticket as duplicate per FRD §F01.5.
   * Sets child.parent_id; closes child with 'Duplicate' substatus;
   * appends 'duplicate' action to PARENT ticket only.
   */
  async duplicate(id: number, dto: DuplicateTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);

    if (id === dto.parent_id) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'A ticket cannot be its own parent' });
    }

    const child = await this.findOne(id, user);
    if (child.parent_id !== null) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'Ticket already has a parent' });
    }

    // Validate parent exists
    const parent = await this.repo.findOne(dto.parent_id);
    if (!parent) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Parent ticket not found' });
    }

    // Find Duplicate substatus (closed)
    const duplicateSubstatus = await this.repo.findSubstatusByName('Duplicate');
    if (!duplicateSubstatus) {
      throw new BadRequestException({ error: 'SERVER_ERROR', message: 'Duplicate substatus not seeded' });
    }

    const now = new Date();

    // Set parent_id on child; close child with Duplicate substatus
    await this.repo.update(id, {
      parent: { connect: { id: dto.parent_id } },
      status: 'closed',
      substatus: { connect: { id: duplicateSubstatus.id } },
      closedDate: now,
      lastModified: now,
    } as any);

    // Append 'closed' action on the child ticket
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

    // Append 'duplicate' action on PARENT ticket only (FRD §F01.5)
    const duplicateAction = await this.repo.findActionByName('duplicate');
    if (duplicateAction) {
      await this.repo.appendHistory({
        ticket: { connect: { id: dto.parent_id } },
        action: { connect: { id: duplicateAction.id } },
        enteredByPerson: { connect: { id: user.id } },
        enteredDate: now,
        actionDate: now,
        data: JSON.stringify({ duplicate: id }),
      } as any);
    }

    return this.repo.findOne(id);
  }

  // ---- F01.6 Add Comment ----

  /**
   * Append a staff comment to ticketHistory per FRD §F01.6.
   */
  async comment(id: number, dto: CommentTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);

    if (!dto.notes || dto.notes.trim().length === 0) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'Comment notes must be non-empty' });
    }

    await this.findOne(id, user); // existence + visibility check

    const now = new Date();
    await this.repo.update(id, { lastModified: now } as any);

    const action = await this.repo.findActionByName('comment');
    if (!action) throw new BadRequestException({ error: 'SERVER_ERROR', message: 'comment action not seeded' });

    return this.repo.appendHistory({
      ticket: { connect: { id } },
      action: { connect: { id: action.id } },
      enteredByPerson: { connect: { id: user.id } },
      enteredDate: now,
      actionDate: now,
      notes: dto.notes,
    } as any);
  }

  // ---- F01.7 Add Response ----

  /**
   * Append a 'response' action to ticketHistory per FRD §F01.7.
   * actionPerson_id defaults to ticket.reportedByPerson_id if not provided.
   */
  async respond(id: number, dto: ResponseTicketDto, user: { id: number; role: string | null }) {
    requireStaffUser(user);

    const ticket = await this.findOne(id, user);
    const now = new Date();
    const actionPersonId = dto.actionPerson_id ?? ticket.reportedByPerson_id ?? null;

    await this.repo.update(id, { lastModified: now } as any);

    const action = await this.repo.findActionByName('response');
    if (!action) throw new BadRequestException({ error: 'SERVER_ERROR', message: 'response action not seeded' });

    return this.repo.appendHistory({
      ticket: { connect: { id } },
      action: { connect: { id: action.id } },
      enteredByPerson: { connect: { id: user.id } },
      actionPerson: actionPersonId ? { connect: { id: actionPersonId } } : undefined,
      enteredDate: now,
      actionDate: now,
      notes: dto.notes ?? null,
    } as any);
  }

  // ---- F01.8 Re-open Ticket ----

  /**
   * Re-open a closed ticket per FRD §F01.8.
   */
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
      substatus_id: null,
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

    return updated;
  }

  // ---- F01.9 View Ticket History ----

  /**
   * Return ticketHistory entries ordered by enteredDate ASC.
   * PII fields (enteredByPerson_id, actionPerson_id) are masked for non-staff
   * at the response level by PiiMaskInterceptor (plan 06); service returns full data.
   */
  async getHistory(id: number, user: { id: number; role: string | null } | null) {
    await this.findOne(id, user); // existence + visibility check
    return this.repo.getHistory(id);
  }

  // ---- Private helpers ----

  private buildUpdateInput(dto: UpdateTicketDto): Record<string, unknown> {
    // Cast to any to access all optional fields from PartialType(CreateTicketDto)
    const d = dto as any;
    const input: Record<string, unknown> = {};
    if (d.category_id !== undefined) input['category_id'] = d.category_id;
    if (d.issueType_id !== undefined) input['issueType_id'] = d.issueType_id;
    if (d.description !== undefined) input['description'] = d.description;
    if (d.location !== undefined) input['location'] = d.location;
    if (d.city !== undefined) input['city'] = d.city;
    if (d.state !== undefined) input['state'] = d.state;
    if (d.zip !== undefined) input['zip'] = d.zip;
    if (d.latitude !== undefined) input['latitude'] = d.latitude;
    if (d.longitude !== undefined) input['longitude'] = d.longitude;
    if (d.addressId !== undefined) input['addressId'] = d.addressId;
    if (d.contactMethod_id !== undefined) input['contactMethod_id'] = d.contactMethod_id;
    if (d.responseMethod_id !== undefined) input['responseMethod_id'] = d.responseMethod_id;
    if (d.reportedByPerson_id !== undefined) input['reportedByPerson_id'] = d.reportedByPerson_id;
    if (d.customFields !== undefined) input['customFields'] = d.customFields;
    if (d.additionalFields !== undefined) input['additionalFields'] = d.additionalFields;
    return input;
  }
}
