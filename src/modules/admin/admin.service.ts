import { Injectable, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  isSystemAction(action: { type: string }): boolean {
    return action.type === 'system';
  }

  async checkSubstatusDeleteConstraint(id: number): Promise<void> {
    const ticketRef = await this.prisma.tickets.findFirst({
      where: { substatus_id: id },
      select: { id: true },
    });
    if (ticketRef) {
      throw new ConflictException(
        'Cannot delete sub-status — referenced by tickets',
      );
    }
    const categoryRef = await this.prisma.categories.findFirst({
      where: { autoCloseSubstatus_id: id },
      select: { id: true },
    });
    if (categoryRef) {
      throw new ConflictException(
        'Cannot delete sub-status — referenced by categories',
      );
    }
  }

  async checkActionDeleteConstraint(id: number): Promise<void> {
    // Verify not system action first (caller must do this before calling)
    const histRef = await this.prisma.ticketHistory.findFirst({
      where: { action_id: id },
      select: { id: true },
    });
    if (histRef) {
      throw new ConflictException(
        'Cannot delete action — referenced by ticket history',
      );
    }
    const deptRef = await this.prisma.department_actions.findFirst({
      where: { action_id: id },
      select: { action_id: true },
    });
    if (deptRef) {
      throw new ConflictException(
        'Cannot delete action — referenced by department actions',
      );
    }
    const carRef = await this.prisma.category_action_responses.findFirst({
      where: { action_id: id },
      select: { id: true },
    });
    if (carRef) {
      throw new ConflictException(
        'Cannot delete action — referenced by category action responses',
      );
    }
  }

  async checkIssueTypeDeleteConstraint(id: number): Promise<void> {
    const ref = await this.prisma.tickets.findFirst({
      where: { issueType_id: id },
      select: { id: true },
    });
    if (ref) {
      throw new ConflictException(
        'Cannot delete issue type — referenced by tickets',
      );
    }
  }

  async checkContactMethodDeleteConstraint(id: number): Promise<void> {
    const contactRef = await this.prisma.tickets.findFirst({
      where: { contactMethod_id: id },
      select: { id: true },
    });
    if (contactRef) {
      throw new ConflictException(
        'Cannot delete contact method — referenced by ticket contactMethod',
      );
    }
    const responseRef = await this.prisma.tickets.findFirst({
      where: { responseMethod_id: id },
      select: { id: true },
    });
    if (responseRef) {
      throw new ConflictException(
        'Cannot delete contact method — referenced by ticket responseMethod',
      );
    }
    const clientRef = await this.prisma.clients.findFirst({
      where: { contactMethod_id: id },
      select: { id: true },
    });
    if (clientRef) {
      throw new ConflictException(
        'Cannot delete contact method — referenced by clients',
      );
    }
  }
}
