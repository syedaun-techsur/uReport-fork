import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketsRepository } from './tickets.repository';
import { CategoriesModule } from '../categories/categories.module';
import { PeopleModule } from '../people/people.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SearchModule } from '../search/search.module';
import { GeoModule } from '../geo/geo.module';

@Module({
  imports: [CategoriesModule, PeopleModule, NotificationsModule, SearchModule, GeoModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository],
  /**
   * Export TicketsService so:
   * - Open311Module (plan 11) can call findOne() for GET /requests/:id
   * - Wave 5 SearchModule can call list() for Solr fallback
   * - Wave 5 MediaModule can call appendHistory() via TicketsService
   */
  exports: [TicketsService],
})
export class TicketsModule {}
