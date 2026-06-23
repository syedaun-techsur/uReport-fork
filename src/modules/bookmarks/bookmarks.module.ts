import { Module } from '@nestjs/common';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
import { BookmarksRepository } from './bookmarks.repository';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * BookmarksModule — F12: Bookmarked Searches
 *
 * Provides authenticated CRUD for saved Solr search URIs (type='search')
 * and email digest subscriptions (type='digest', consumed by DigestCron in
 * NotificationsModule plan 13).
 *
 * All routes require req.user.id (set by AuthMiddleware from AuthModule plan 04).
 * The global SerializationInterceptor (plan 03) handles all five output formats.
 */
@Module({
  imports: [PrismaModule],
  controllers: [BookmarksController],
  providers: [BookmarksService, BookmarksRepository],
})
export class BookmarksModule {}
