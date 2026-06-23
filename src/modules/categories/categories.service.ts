import {
  Injectable, NotFoundException, BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateCategoryGroupDto } from './dto/create-category-group.dto';
import { UpdateCategoryGroupDto } from './dto/update-category-group.dto';
import { UpsertActionResponseDto } from './dto/upsert-action-response.dto';

/** Map role string to permissionLevel filter (FRD §F02.5) */
function permissionFilter(role: string | null | undefined): string[] {
  if (role === 'staff') return ['staff', 'public', 'anonymous'];
  if (role) return ['public', 'anonymous']; // authenticated citizen
  return ['anonymous']; // anonymous
}

@Injectable()
export class CategoriesService {
  constructor(
    private readonly repo: CategoriesRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ---- Category CRUD ----

  /** List categories filtered by caller's display permission level (FRD §F02.5) */
  async findAll(role?: string | null) {
    const levels = permissionFilter(role);
    return this.repo.findAll({ displayPermissionLevel: { in: levels } });
  }

  /** Get a single category; 404 if not visible to caller's role (FRD §F10.1) */
  async findOne(id: number, role?: string | null) {
    const category = await this.repo.findOne(id);
    if (!category) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Category not found' });
    const levels = permissionFilter(role);
    if (!levels.includes(category.displayPermissionLevel)) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Category not found' });
    }
    return category;
  }

  /** Create a category; staff only (enforced at controller). Updates lastModified to NOW(). */
  async create(dto: CreateCategoryDto) {
    // Validate department exists
    const dept = await this.prisma.departments.findUnique({ where: { id: dto.department_id } });
    if (!dept) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Department not found' });

    // Validate customFields is valid JSON if provided (dto validator catches this too; belt+suspenders)
    if (dto.customFields !== undefined && dto.customFields !== null) {
      try { JSON.parse(dto.customFields); } catch {
        throw new BadRequestException({ error: 'INVALID_INPUT', message: 'customFields must be valid JSON' });
      }
    }

    // Validate autoCloseSubstatus_id references a closed substatus
    if (dto.autoCloseSubstatus_id !== undefined) {
      const sub = await this.prisma.substatus.findUnique({ where: { id: dto.autoCloseSubstatus_id } });
      if (!sub || sub.status !== 'closed') {
        throw new BadRequestException({
          error: 'INVALID_INPUT',
          message: 'autoCloseSubstatus_id must reference a sub-status with status=closed',
        });
      }
    }

    return this.repo.create({
      name: dto.name,
      description: dto.description ?? null,
      department: { connect: { id: dto.department_id } },
      defaultPerson: dto.defaultPerson_id !== undefined ? { connect: { id: dto.defaultPerson_id } } : undefined,
      categoryGroup: dto.categoryGroup_id !== undefined ? { connect: { id: dto.categoryGroup_id } } : undefined,
      active: dto.active ?? null,
      featured: dto.featured ?? null,
      displayPermissionLevel: dto.displayPermissionLevel,
      postingPermissionLevel: dto.postingPermissionLevel,
      customFields: dto.customFields ?? null,
      lastModified: new Date(),
      slaDays: dto.slaDays ?? null,
      notificationReplyEmail: dto.notificationReplyEmail ?? null,
      autoCloseIsActive: dto.autoCloseIsActive ?? null,
      autoCloseSubstatus_id: dto.autoCloseSubstatus_id ?? null,
    });
  }

  /** Update a category; sets lastModified = NOW() (FRD §F10.1) */
  async update(id: number, dto: UpdateCategoryDto) {
    // Confirm category exists (throws 404 if not)
    const existing = await this.repo.findOne(id);
    if (!existing) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Category not found' });

    if (dto.department_id !== undefined) {
      const dept = await this.prisma.departments.findUnique({ where: { id: dto.department_id } });
      if (!dept) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Department not found' });
    }

    if (dto.customFields !== undefined && dto.customFields !== null) {
      try { JSON.parse(dto.customFields); } catch {
        throw new BadRequestException({ error: 'INVALID_INPUT', message: 'customFields must be valid JSON' });
      }
    }

    if (dto.autoCloseSubstatus_id !== undefined) {
      const sub = await this.prisma.substatus.findUnique({ where: { id: dto.autoCloseSubstatus_id } });
      if (!sub || sub.status !== 'closed') {
        throw new BadRequestException({
          error: 'INVALID_INPUT',
          message: 'autoCloseSubstatus_id must reference a sub-status with status=closed',
        });
      }
    }

    const updateData: any = {
      ...dto,
      lastModified: new Date(), // always update lastModified on write
    };

    // Convert relation IDs to Prisma relation connect objects
    if (dto.department_id !== undefined) {
      updateData.department = { connect: { id: dto.department_id } };
      delete updateData.department_id;
    }
    if (dto.defaultPerson_id !== undefined) {
      updateData.defaultPerson = { connect: { id: dto.defaultPerson_id } };
      delete updateData.defaultPerson_id;
    }
    if (dto.categoryGroup_id !== undefined) {
      updateData.categoryGroup = { connect: { id: dto.categoryGroup_id } };
      delete updateData.categoryGroup_id;
    }

    return this.repo.update(id, updateData);
  }

  /** Delete a category; blocked with 409 if tickets reference it (FRD §F10.1) */
  async remove(id: number) {
    const category = await this.repo.findOne(id);
    if (!category) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Category not found' });

    const ticketCount = await this.repo.countTickets(id);
    if (ticketCount > 0) {
      throw new ConflictException({ error: 'CONFLICT', message: 'Cannot delete category with existing tickets' });
    }

    return this.repo.delete(id);
  }

  // ---- CategoryGroup CRUD ----

  findAllGroups() {
    return this.repo.findAllGroups();
  }

  async findOneGroup(id: number) {
    const group = await this.repo.findOneGroup(id);
    if (!group) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Category group not found' });
    return group;
  }

  async createGroup(dto: CreateCategoryGroupDto) {
    return this.repo.createGroup({ name: dto.name, ordering: dto.ordering ?? null } as any);
  }

  async updateGroup(id: number, dto: UpdateCategoryGroupDto) {
    await this.findOneGroup(id);
    return this.repo.updateGroup(id, dto as any);
  }

  async removeGroup(id: number) {
    await this.findOneGroup(id);
    // FK constraint on categories.categoryGroup_id will throw Prisma P2003 on violation
    try {
      return await this.repo.deleteGroup(id);
    } catch (err: any) {
      if (err?.code === 'P2003' || err?.code === 'P2014') {
        throw new ConflictException({
          error: 'CONFLICT',
          message: 'Cannot delete category group — referenced by categories',
        });
      }
      throw err;
    }
  }

  // ---- Category Action Responses ----

  async getActionResponse(categoryId: number, actionId: number) {
    const car = await this.repo.findActionResponse(categoryId, actionId);
    if (!car) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Action response not found' });
    return car;
  }

  async upsertActionResponse(categoryId: number, actionId: number, dto: UpsertActionResponseDto) {
    // Verify category and action exist
    const category = await this.repo.findOne(categoryId);
    if (!category) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Category not found' });
    const action = await this.prisma.actions.findUnique({ where: { id: actionId } });
    if (!action) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Action not found' });

    const existing = await this.repo.findActionResponse(categoryId, actionId);
    if (existing) {
      return this.repo.updateActionResponse(existing.id, dto.template ?? null, dto.replyEmail ?? null);
    }
    return this.repo.createActionResponse(categoryId, actionId, dto.template ?? null, dto.replyEmail ?? null);
  }

  async deleteActionResponse(categoryId: number, actionId: number) {
    const existing = await this.repo.findActionResponse(categoryId, actionId);
    if (!existing) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Action response not found' });
    await this.repo.deleteActionResponse(categoryId, actionId);
  }
}
