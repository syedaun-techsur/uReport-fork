import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminService } from '../admin.service';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';

@Injectable()
export class ActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
  ) {}

  async findAll() {
    return this.prisma.actions.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: number) {
    const record = await this.prisma.actions.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Action not found');
    return record;
  }

  async create(dto: CreateActionDto) {
    return this.prisma.actions.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: 'department',  // ALWAYS department on create — system actions are seed-only
        template: dto.template ?? null,
        replyEmail: dto.replyEmail ?? null,
      },
    });
  }

  async update(id: number, dto: UpdateActionDto) {
    const record = await this.findOne(id);
    // System actions: name change is forbidden (FRD F15.2)
    if (this.adminService.isSystemAction(record) && dto.name && dto.name !== record.name) {
      throw new ForbiddenException(
        'Cannot change the name of a system action',
      );
    }
    return this.prisma.actions.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.template !== undefined && { template: dto.template }),
        ...(dto.replyEmail !== undefined && { replyEmail: dto.replyEmail }),
      },
    });
  }

  async remove(id: number) {
    const record = await this.findOne(id);
    // System actions cannot be deleted (FRD F15.2)
    if (this.adminService.isSystemAction(record)) {
      throw new ForbiddenException('System actions cannot be deleted');
    }
    await this.adminService.checkActionDeleteConstraint(id);
    return this.prisma.actions.delete({ where: { id } });
  }
}
