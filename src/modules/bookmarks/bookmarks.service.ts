import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookmarksRepository } from './bookmarks.repository';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';

@Injectable()
export class BookmarksService {
  constructor(private readonly repo: BookmarksRepository) {}

  /**
   * Create a bookmark scoped to the authenticated user.
   *
   * PRD §F12: "create bookmark: save the current search URI under a user-defined name"
   * SM-12.1 NaC: "POST /bookmarks with name + requestUri creates user-scoped bookmark;
   *               anonymous gets HTTP 401" — the 401 is enforced in the controller.
   *
   * @param personId - The authenticated user's people.id (from req.user.id)
   * @param dto      - Validated create payload
   */
  create(personId: number, dto: CreateBookmarkDto) {
    return this.repo.create({
      person:     { connect: { id: personId } },
      name:       dto.name ?? null,
      requestUri: dto.requestUri,
      type:       dto.type ?? 'search',
    } as any);
  }

  /**
   * List all bookmarks for the authenticated user, ordered by id DESC.
   *
   * SM-12.2 NaC: "GET /bookmarks returns only caller's bookmarks ordered id DESC"
   * JTBD-02.3: "Saved bookmarks listed on her dashboard after login"
   *
   * @param personId - The authenticated user's people.id
   */
  findAllForUser(personId: number) {
    return this.repo.findAllForPerson(personId);
  }

  /**
   * Delete a bookmark, enforcing ownership.
   *
   * SM-12.3 NaC: "DELETE /bookmarks/:id restricted to owner;
   *               other-user bookmark returns HTTP 404 (no info leakage)"
   *
   * Returns 404 in all of the following cases:
   *   - bookmark does not exist
   *   - bookmark belongs to a different user (no info leakage per NaC)
   *
   * @param id       - The bookmark primary key
   * @param personId - The authenticated user's people.id
   */
  async deleteOwned(id: number, personId: number): Promise<void> {
    const bookmark = await this.repo.findOne(id);

    // Return 404 whether the bookmark is missing OR belongs to another user.
    // PRD §F12 + SM-12.3: "other-user bookmark returns HTTP 404 (no info leakage)"
    if (!bookmark || bookmark.person_id !== personId) {
      throw new NotFoundException({
        error: 'NOT_FOUND',
        message: 'Bookmark not found',
      });
    }

    await this.repo.delete(id);
  }
}
