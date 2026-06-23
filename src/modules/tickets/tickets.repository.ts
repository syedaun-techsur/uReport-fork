import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

/** Helper: permissionLevel filter array by role (FRD §F02.5) */
export function permissionLevels(role: string | null | undefined): string[] {
  if (role === 'staff') return ['staff', 'public', 'anonymous'];
  if (role) return ['public', 'anonymous']; // authenticated public
  return ['anonymous'];                     // anonymous
}

/** Returns the Prisma WHERE fragment for category visibility per caller role (FRD §F02.5) */
function categoryVisibilityWhere(role?: string | null, isAuthenticated = false): Prisma.categoriesWhereInput | undefined {
  if (role === 'staff') return undefined; // staff: no filter
  if (isAuthenticated) {
    return { displayPermissionLevel: { in: ['public', 'anonymous'] } };
  }
  return { displayPermissionLevel: { in: ['anonymous'] } };
}

@Injectable()
export class TicketsRepository {
  constructor(readonly prisma: PrismaService) {}

  /**
   * Paginated ticket list with role-based category visibility filter (FRD §F02.5).
   * Returns { total, results } — controller wraps into envelope.
   */
  async findAllPaginated(
    role: string | null | undefined,
    where: Prisma.ticketsWhereInput,
    page: number,
    pageSize: number,
  ): Promise<{ total: number; results: Awaited<ReturnType<TicketsRepository['findOne']>>[] }> {
    const levels = permissionLevels(role);
    const fullWhere: Prisma.ticketsWhereInput = {
      ...where,
      category: { displayPermissionLevel: { in: levels } },
    };

    const [total, results] = await this.prisma.$transaction([
      this.prisma.tickets.count({ where: fullWhere }),
      this.prisma.tickets.findMany({
        where: fullWhere,
        include: {
          category: { include: { department: true, categoryGroup: true } },
          substatus: true,
          issueType: true,
          enteredByPerson: { select: { id: true, firstname: true, lastname: true } },
          reportedByPerson: { select: { id: true, firstname: true, lastname: true } },
          assignedPerson: { select: { id: true, firstname: true, lastname: true } },
        },
        orderBy: { lastModified: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, results: results as any };
  }

  /** List tickets with role-filtered category visibility (plan 09 signature — kept for compat) */
  findAll(roleFilter: { role?: string | null; isAuthenticated: boolean }, where?: Prisma.ticketsWhereInput) {
    const catWhere = categoryVisibilityWhere(roleFilter.role, roleFilter.isAuthenticated);
    const categoryCondition: Prisma.ticketsWhereInput = catWhere
      ? { category: catWhere }
      : {};

    return this.prisma.tickets.findMany({
      where: { ...where, ...categoryCondition },
      include: {
        category: { include: { department: true, categoryGroup: true } },
        substatus: true,
        issueType: true,
        enteredByPerson: { select: { id: true, firstname: true, lastname: true } },
        reportedByPerson: { select: { id: true, firstname: true, lastname: true } },
        assignedPerson: { select: { id: true, firstname: true, lastname: true } },
      },
      orderBy: { enteredDate: 'desc' },
    });
  }

  /** Single ticket with all relations */
  findOne(id: number) {
    return this.prisma.tickets.findUnique({
      where: { id },
      include: {
        category: { include: { department: true, categoryGroup: true } },
        substatus: true,
        issueType: true,
        enteredByPerson: { select: { id: true, firstname: true, lastname: true } },
        reportedByPerson: { select: { id: true, firstname: true, lastname: true } },
        assignedPerson: { select: { id: true, firstname: true, lastname: true } },
      },
    });
  }

  create(data: Prisma.ticketsCreateInput) {
    return this.prisma.tickets.create({
      data,
      include: {
        category: { include: { department: true } },
        substatus: true,
      },
    });
  }

  /** Update ticket record and return updated row */
  update(id: number, data: Prisma.ticketsUpdateInput) {
    return this.prisma.tickets.update({
      where: { id },
      data,
      include: {
        category: { include: { department: true } },
        substatus: true,
      },
    });
  }

  /**
   * Append an immutable ticketHistory row (FRD §F01 — every state change logged).
   */
  appendHistory(data: Prisma.ticketHistoryCreateInput) {
    return this.prisma.ticketHistory.create({ data });
  }

  /**
   * History for a ticket ordered by enteredDate ASC (FRD §F01.9).
   */
  getHistory(ticketId: number) {
    return this.prisma.ticketHistory.findMany({
      where: { ticket_id: ticketId },
      include: {
        action: true,
        enteredByPerson: { select: { id: true, firstname: true, lastname: true } },
        actionPerson: { select: { id: true, firstname: true, lastname: true } },
      },
      orderBy: { enteredDate: 'asc' },
    });
  }

  /** Look up a system action by name (plan 10 naming) */
  getActionByName(name: string) {
    return this.prisma.actions.findFirst({ where: { name } });
  }

  /** Look up action by name (plan 09 naming — alias) */
  findActionByName(name: string) {
    return this.getActionByName(name);
  }

  /** Look up a substatus by id for validation (plan 10 naming) */
  getSubstatus(id: number) {
    return this.prisma.substatus.findUnique({ where: { id } });
  }

  /** Find substatus by id (plan 09 naming — alias) */
  findSubstatus(id: number) {
    return this.getSubstatus(id);
  }

  /** Find substatus by name (plan 09 naming) */
  findSubstatusByName(name: string) {
    return this.prisma.substatus.findFirst({ where: { name } });
  }

  /** Find the 'Duplicate' substatus row (name = 'Duplicate', status = 'closed') */
  findDuplicateSubstatus() {
    return this.prisma.substatus.findFirst({
      where: { name: 'Duplicate', status: 'closed' },
    });
  }

  /** Create a new ticket */
  createTicket(data: Prisma.ticketsCreateInput) {
    return this.create(data);
  }
}
