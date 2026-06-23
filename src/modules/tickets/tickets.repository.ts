import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

/** Helper: permissionLevel filter array by role (FRD §F02.5) */
export function permissionLevels(role: string | null | undefined): string[] {
  if (role === 'staff') return ['staff', 'public', 'anonymous'];
  if (role) return ['public', 'anonymous']; // authenticated public
  return ['anonymous'];                     // anonymous
}

@Injectable()
export class TicketsRepository {
  constructor(readonly prisma: PrismaService) {}

  /**
   * Paginated ticket list with role-based category visibility filter (FRD §F02.5).
   * Returns { total, results } — service wraps into paginated envelope.
   */
  async findAll(
    role: string | null | undefined,
    where: Prisma.ticketsWhereInput,
    page: number,
    pageSize: number,
  ) {
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
          category: true,
          substatus: true,
          assignedPerson: { select: { id: true, firstname: true, lastname: true } },
          enteredByPerson: { select: { id: true, firstname: true, lastname: true } },
        },
        orderBy: { lastModified: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, results };
  }

  /** Single ticket with category relation for visibility check */
  findOne(id: number) {
    return this.prisma.tickets.findUnique({
      where: { id },
      include: {
        category: true,
        substatus: true,
        assignedPerson: { select: { id: true, firstname: true, lastname: true } },
        enteredByPerson: { select: { id: true, firstname: true, lastname: true } },
      },
    });
  }

  /** Create a new ticket */
  createTicket(data: Prisma.ticketsCreateInput) {
    return this.prisma.tickets.create({
      data,
      include: { category: true, substatus: true },
    });
  }

  /** Update ticket record and return updated row */
  update(id: number, data: Prisma.ticketsUncheckedUpdateInput) {
    return this.prisma.tickets.update({
      where: { id },
      data,
      include: { category: true, substatus: true },
    });
  }

  /**
   * Append an immutable ticketHistory row (FRD §F01 — every state change logged).
   * Uses UncheckedCreateInput to allow plain scalar FK fields (ticket_id, action_id).
   */
  appendHistory(data: Prisma.ticketHistoryUncheckedCreateInput) {
    return this.prisma.ticketHistory.create({ data });
  }

  /**
   * History for a ticket ordered by enteredDate ASC (FRD §F01.9).
   * Includes action relation for action.name in responses.
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

  /** Look up a system action by name (used to resolve action_id for history entries) */
  getActionByName(name: string) {
    return this.prisma.actions.findFirst({ where: { name } });
  }

  /** Look up a substatus by id for validation */
  getSubstatus(id: number) {
    return this.prisma.substatus.findUnique({ where: { id } });
  }
}
