import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Categories ----

  findAll(where?: Prisma.categoriesWhereInput) {
    return this.prisma.categories.findMany({
      where,
      include: { categoryGroup: true, department: true },
      orderBy: { id: 'asc' },
    });
  }

  findOne(id: number) {
    return this.prisma.categories.findUnique({
      where: { id },
      include: { categoryGroup: true, department: true },
    });
  }

  create(data: Prisma.categoriesCreateInput) {
    return this.prisma.categories.create({ data });
  }

  update(id: number, data: Prisma.categoriesUpdateInput) {
    return this.prisma.categories.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.prisma.categories.delete({ where: { id } });
  }

  countTickets(categoryId: number) {
    return this.prisma.tickets.count({ where: { category_id: categoryId } });
  }

  // ---- CategoryGroups ----

  findAllGroups() {
    return this.prisma.categoryGroups.findMany({ orderBy: { ordering: 'asc' } });
  }

  findOneGroup(id: number) {
    return this.prisma.categoryGroups.findUnique({ where: { id } });
  }

  createGroup(data: Prisma.categoryGroupsCreateInput) {
    return this.prisma.categoryGroups.create({ data });
  }

  updateGroup(id: number, data: Prisma.categoryGroupsUpdateInput) {
    return this.prisma.categoryGroups.update({ where: { id }, data });
  }

  deleteGroup(id: number) {
    return this.prisma.categoryGroups.delete({ where: { id } });
  }

  // ---- Category Action Responses ----

  findActionResponse(categoryId: number, actionId: number) {
    return this.prisma.category_action_responses.findFirst({
      where: { category_id: categoryId, action_id: actionId },
    });
  }

  createActionResponse(categoryId: number, actionId: number, template?: string | null, replyEmail?: string | null) {
    return this.prisma.category_action_responses.create({
      data: { category_id: categoryId, action_id: actionId, template: template ?? null, replyEmail: replyEmail ?? null },
    });
  }

  updateActionResponse(id: number, template?: string | null, replyEmail?: string | null) {
    return this.prisma.category_action_responses.update({
      where: { id },
      data: { template: template ?? null, replyEmail: replyEmail ?? null },
    });
  }

  deleteActionResponse(categoryId: number, actionId: number) {
    return this.prisma.category_action_responses.deleteMany({
      where: { category_id: categoryId, action_id: actionId },
    });
  }
}
