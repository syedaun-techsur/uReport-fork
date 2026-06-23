import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

@Injectable()
export class DepartmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Departments ----

  findAll() {
    return this.prisma.departments.findMany({ orderBy: { id: 'asc' } });
  }

  findOne(id: number) {
    return this.prisma.departments.findUnique({ where: { id } });
  }

  create(data: Prisma.departmentsCreateInput) {
    return this.prisma.departments.create({ data });
  }

  update(id: number, data: Prisma.departmentsUpdateInput) {
    return this.prisma.departments.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.prisma.departments.delete({ where: { id } });
  }

  countCategoriesByDept(deptId: number) {
    return this.prisma.categories.count({ where: { department_id: deptId } });
  }

  countPeopleByDept(deptId: number) {
    return this.prisma.people.count({ where: { department_id: deptId } });
  }

  // ---- Department-Categories M:M ----

  listCategories(deptId: number) {
    return this.prisma.department_categories.findMany({
      where: { department_id: deptId },
      include: { category: true },
    });
  }

  addCategory(deptId: number, categoryId: number) {
    return this.prisma.department_categories.create({
      data: { department_id: deptId, category_id: categoryId },
    });
  }

  removeCategory(deptId: number, categoryId: number) {
    return this.prisma.department_categories.delete({
      where: { department_id_category_id: { department_id: deptId, category_id: categoryId } },
    });
  }

  // ---- Department-Actions M:M ----

  listActions(deptId: number) {
    return this.prisma.department_actions.findMany({
      where: { department_id: deptId },
      include: { action: true },
    });
  }

  addAction(deptId: number, actionId: number) {
    return this.prisma.department_actions.create({
      data: { department_id: deptId, action_id: actionId },
    });
  }

  removeAction(deptId: number, actionId: number) {
    return this.prisma.department_actions.delete({
      where: { department_id_action_id: { department_id: deptId, action_id: actionId } },
    });
  }
}
