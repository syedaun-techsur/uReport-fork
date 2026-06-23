import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

function categoryVisibilityWhere(
  role?: string | null,
  isAuthenticated = false,
): Prisma.categoriesWhereInput | undefined {
  if (role === 'staff') return undefined;
  if (isAuthenticated) {
    return { displayPermissionLevel: { in: ['public', 'anonymous'] } };
  }
  return { displayPermissionLevel: { in: ['anonymous'] } };
}

@Injectable()
export class TicketsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(
    roleFilter: { role?: string | null; isAuthenticated: boolean },
    where?: Prisma.ticketsWhereInput,
  ) {
    const catWhere = categoryVisibilityWhere(roleFilter.role, roleFilter.isAuthenticated);
    const categoryCondition: Prisma.ticketsWhereInput = catWhere ? { category: catWhere } : {};
    return this.prisma.tickets.findMany({
      where: { ...where, ...categoryCondition },
      include: {
        category: { include: { department: true, categoryGroup: true } },
        substatus: true,
        issueType: true,
        enteredByPerson: { select: { id: true, firstname: true, lastname: true } },
        assignedPerson: { select: { id: true, firstname: true, lastname: true } },
      },
      orderBy: { enteredDate: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prisma.tickets.findUnique({
      where: { id },
      include: {
        category: { include: { department: true, categoryGroup: true } },
        substatus: true,
        issueType: true,
        enteredByPerson: { select: { id: true, firstname: true, lastname: true } },
        assignedPerson: { select: { id: true, firstname: true, lastname: true } },
      },
    });
  }

  create(data: Prisma.ticketsCreateInput) {
    return this.prisma.tickets.create({
      data,
      include: { category: { include: { department: true } }, substatus: true },
    });
  }

  update(id: number, data: Prisma.ticketsUpdateInput) {
    return this.prisma.tickets.update({
      where: { id },
      data,
      include: { category: { include: { department: true } }, substatus: true },
    });
  }

  appendHistory(data: Prisma.ticketHistoryCreateInput) {
    return this.prisma.ticketHistory.create({ data });
  }

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

  findActionByName(name: string) {
    return this.prisma.actions.findFirst({ where: { name } });
  }

  findSubstatus(id: number) {
    return this.prisma.substatus.findUnique({ where: { id } });
  }

  findSubstatusByName(name: string) {
    return this.prisma.substatus.findFirst({ where: { name } });
  }
}
