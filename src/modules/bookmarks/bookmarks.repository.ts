import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

@Injectable()
export class BookmarksRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Insert a new bookmark row (PRD §F12: create bookmark).
   * person_id scopes the bookmark to the authenticated user.
   */
  create(data: Prisma.bookmarksCreateInput) {
    return this.prisma.bookmarks.create({ data });
  }

  /**
   * List all bookmarks for a person, ordered by id DESC (STORY-MAP SM-12.2 NaC).
   * Returns only rows scoped to the given person_id — never other users' bookmarks.
   */
  findAllForPerson(personId: number) {
    return this.prisma.bookmarks.findMany({
      where: { person_id: personId },
      orderBy: { id: 'desc' },
    });
  }

  /**
   * Find a single bookmark by id.
   * Used by deleteOwned() to verify ownership before deletion.
   */
  findOne(id: number) {
    return this.prisma.bookmarks.findUnique({ where: { id } });
  }

  /**
   * Delete a bookmark by id.
   * Caller MUST verify ownership before calling this method.
   */
  delete(id: number) {
    return this.prisma.bookmarks.delete({ where: { id } });
  }
}
