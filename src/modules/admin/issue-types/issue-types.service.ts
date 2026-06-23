import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminService } from '../admin.service';
import { CreateIssueTypeDto } from './dto/create-issue-type.dto';

@Injectable()
export class IssueTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
  ) {}

  async findAll() {
    return this.prisma.issueTypes.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: number) {
    const record = await this.prisma.issueTypes.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Issue type not found');
    return record;
  }

  async create(dto: CreateIssueTypeDto) {
    return this.prisma.issueTypes.create({ data: dto });
  }

  async update(id: number, dto: CreateIssueTypeDto) {
    await this.findOne(id);
    return this.prisma.issueTypes.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.adminService.checkIssueTypeDeleteConstraint(id);
    return this.prisma.issueTypes.delete({ where: { id } });
  }
}
