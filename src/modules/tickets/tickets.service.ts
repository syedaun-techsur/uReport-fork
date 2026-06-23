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
  ) {}

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

    return this.repo.appendHistory({
      ticket: { connect: { id } },
      action: { connect: { id: action.id } },
      enteredByPerson: { connect: { id: user.id } },
      enteredDate: now,
      actionDate: now,
      notes: dto.notes,
    } as any);
  }

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
