import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
  HttpCode,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { BookmarksService } from './bookmarks.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';

/** Require authenticated user; throw 401 if anonymous */
function requireAuthenticated(req: Request): { id: number; role: string | null } {
  const user = (req as any).user;
  if (!user || !user.id) {
    throw new UnauthorizedException({
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }
  return user as { id: number; role: string | null };
}

/**
 * BookmarksController
 *
 * F12: Bookmarked Searches — authenticated CRUD for saved search URIs.
 *
 * All routes require authentication (req.user set by AuthMiddleware from plan 04).
 * Anonymous callers receive HTTP 401 on all routes.
 *
 * JTBD-02.3: "Can save any Solr search as a named bookmark directly from the results
 *             page without leaving the results" (POST /bookmarks)
 * JTBD-02.3: "Saved bookmarks are listed on her dashboard after login" (GET /bookmarks)
 * JTBD-02.3: "Can delete bookmarks she no longer needs" (DELETE /bookmarks/:id)
 */
@Controller('bookmarks')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  /**
   * POST /bookmarks — create a named bookmark.
   *
   * SM-12.1 NaC: "POST /bookmarks with name + requestUri creates user-scoped bookmark;
   *               anonymous gets HTTP 401"
   * JTBD-02.3: "saved bookmark saved from search results page without leaving results"
   *
   * Returns HTTP 201 with the created bookmark row.
   * Auth: [public] — authenticated users only.
   */
  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateBookmarkDto, @Req() req: Request) {
    const user = requireAuthenticated(req);
    return this.bookmarksService.create(user.id, dto);
  }

  /**
   * GET /bookmarks — list the authenticated user's saved bookmarks.
   *
   * SM-12.2 NaC: "GET /bookmarks returns only caller's bookmarks ordered id DESC;
   *               available in all five formats"
   * JTBD-02.3: "Saved bookmarks listed on her dashboard after login"
   *
   * Auth: [public] — authenticated users only.
   * Format: all five via global SerializationInterceptor.
   */
  @Get()
  findAll(@Req() req: Request) {
    const user = requireAuthenticated(req);
    return this.bookmarksService.findAllForUser(user.id);
  }

  /**
   * DELETE /bookmarks/:id — delete a bookmark (owner only).
   *
   * SM-12.3 NaC: "DELETE /bookmarks/:id restricted to owner;
   *               other-user bookmark returns HTTP 404 (no info leakage)"
   * JTBD-02.3: "Can delete bookmarks she no longer needs"
   *
   * Returns HTTP 204 on success.
   * Returns HTTP 404 if bookmark does not exist OR belongs to another user.
   * Auth: [public] — authenticated users only.
   */
  @Delete(':id')
  @HttpCode(204)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<void> {
    const user = requireAuthenticated(req);
    await this.bookmarksService.deleteOwned(id, user.id);
  }
}
