import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminService } from '../admin.service';
import { CreateSubstatusDto } from './dto/create-substatus.dto';
import { UpdateSubstatusDto } from './dto/update-substatus.dto';

@Injectable()
export class SubstatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
  ) {}

  async findAll() {
    return this.prisma.substatus.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: number) {
    const record = await this.prisma.substatus.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Sub-status not found');
    return record;
  }

  async create(dto: CreateSubstatusDto) {
    // At most one per status may have isDefault = true (per FRD F15.1)
    if (dto.isDefault) {
      const existing = await this.prisma.substatus.findFirst({
        where: { status: dto.status, isDefault: true },
      });
      if (existing) {
        throw new ConflictException(
          `A default sub-status for status '${dto.status}' already exists`,
        );
      }
    }
    return this.prisma.substatus.create({ data: dto });
  }

  async update(id: number, dto: UpdateSubstatusDto) {
    await this.findOne(id);
    if (dto.isDefault && dto.status) {
      const existing = await this.prisma.substatus.findFirst({
        where: { status: dto.status, isDefault: true, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(
          `A default sub-status for status '${dto.status}' already exists`,
        );
      }
    }
    return this.prisma.substatus.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.adminService.checkSubstatusDeleteConstraint(id);
    return this.prisma.substatus.delete({ where: { id } });
  }
}
