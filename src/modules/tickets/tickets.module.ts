import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketsRepository } from './tickets.repository';
import { CategoriesModule } from '../categories/categories.module';
import { PeopleModule } from '../people/people.module';

@Module({
  imports: [CategoriesModule, PeopleModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository],
  exports: [TicketsService],   // exported for Open311Module (Wave 4b plan 10)
})
export class TicketsModule {}
