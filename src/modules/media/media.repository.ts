import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

@Injectable()
export class MediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Insert a media row after successful file save (PRD §F8) */
  create(data: Prisma.mediaCreateInput) {
    return this.prisma.media.create({ data });
  }

  /** List all media for a ticket ordered by uploaded ASC (PRD §F8 list endpoint) */
  findByTicket(ticketId: number) {
    return this.prisma.media.findMany({
      where: { ticket_id: ticketId },
      orderBy: { uploaded: 'asc' },
    });
  }

  /** Find a single media row by id (for stream and delete) */
  findOne(id: number) {
    return this.prisma.media.findUnique({ where: { id } });
  }

  /** Delete a media row by id (PRD §F8 delete) */
  delete(id: number) {
    return this.prisma.media.delete({ where: { id } });
  }
}
