import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminService } from '../admin.service';
import { CreateContactMethodDto } from './dto/create-contact-method.dto';

@Injectable()
export class ContactMethodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
  ) {}

  async findAll() {
    return this.prisma.contactMethods.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: number) {
    const record = await this.prisma.contactMethods.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Contact method not found');
    return record;
  }

  async create(dto: CreateContactMethodDto) {
    return this.prisma.contactMethods.create({ data: dto });
  }

  async update(id: number, dto: CreateContactMethodDto) {
    await this.findOne(id);
    return this.prisma.contactMethods.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.adminService.checkContactMethodDeleteConstraint(id);
    return this.prisma.contactMethods.delete({ where: { id } });
  }
}
