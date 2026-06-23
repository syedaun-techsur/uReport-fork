import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DepartmentsRepository } from './departments.repository';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly repo: DepartmentsRepository,
    private readonly prisma: PrismaService,
  ) {}

  findAll() {
    return this.repo.findAll();
  }

  async findOne(id: number) {
    const dept = await this.repo.findOne(id);
    if (!dept) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Department not found' });
    return dept;
  }

  async create(dto: CreateDepartmentDto) {
    if (dto.defaultPerson_id !== undefined) {
      const person = await this.prisma.people.findUnique({ where: { id: dto.defaultPerson_id } });
      if (!person) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Default person not found' });
    }
    return this.repo.create(dto.name, dto.defaultPerson_id ?? null);
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    await this.findOne(id);
    if (dto.defaultPerson_id !== undefined) {
      const person = await this.prisma.people.findUnique({ where: { id: dto.defaultPerson_id } });
      if (!person) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Default person not found' });
    }
    return this.repo.update(id, dto.name, dto.defaultPerson_id);
  }

  /** Delete — blocked if categories or people reference the department (FRD §F10.3) */
  async remove(id: number) {
    await this.findOne(id);

    const catCount = await this.repo.countCategoriesByDept(id);
    if (catCount > 0) {
      throw new ConflictException({ error: 'CONFLICT', message: 'Cannot delete department — referenced by categories' });
    }
    const peopleCount = await this.repo.countPeopleByDept(id);
    if (peopleCount > 0) {
      throw new ConflictException({ error: 'CONFLICT', message: 'Cannot delete department — referenced by people' });
    }

    return this.repo.delete(id);
  }

  // ---- Department-Categories associations (FRD §F10.4) ----

  listCategories(deptId: number) {
    return this.repo.listCategories(deptId);
  }

  async addCategory(deptId: number, categoryId: number) {
    await this.findOne(deptId);
    const category = await this.prisma.categories.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Category not found' });
    try {
      await this.repo.addCategory(deptId, categoryId);
    } catch (err: any) {
      // P2002 = unique constraint violation (already associated)
      if (err?.code === 'P2002') {
        throw new ConflictException({ error: 'CONFLICT', message: 'Association already exists' });
      }
      throw err;
    }
  }

  async removeCategory(deptId: number, categoryId: number) {
    await this.findOne(deptId);
    try {
      await this.repo.removeCategory(deptId, categoryId);
    } catch (err: any) {
      if (err?.code === 'P2025') {
        throw new NotFoundException({ error: 'NOT_FOUND', message: 'Association not found' });
      }
      throw err;
    }
  }

  // ---- Department-Actions associations (FRD §F10.5) ----

  listActions(deptId: number) {
    return this.repo.listActions(deptId);
  }

  async addAction(deptId: number, actionId: number) {
    await this.findOne(deptId);
    const action = await this.prisma.actions.findUnique({ where: { id: actionId } });
    if (!action) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Action not found' });
    try {
      await this.repo.addAction(deptId, actionId);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException({ error: 'CONFLICT', message: 'Association already exists' });
      }
      throw err;
    }
  }

  async removeAction(deptId: number, actionId: number) {
    await this.findOne(deptId);
    try {
      await this.repo.removeAction(deptId, actionId);
    } catch (err: any) {
      if (err?.code === 'P2025') {
        throw new NotFoundException({ error: 'NOT_FOUND', message: 'Association not found' });
      }
      throw err;
    }
  }
}
