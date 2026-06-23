import { Module } from '@nestjs/common';
import { Open311Controller } from './open311.controller';
import { Open311Service } from './open311.service';
import { Open311Serializer } from './open311.serializer';
import { CategoriesModule } from '../categories/categories.module';
import { PeopleModule } from '../people/people.module';

// NOTE: TicketsModule is NOT imported here for Wave 4c (plan 11).
// Open311Service.postRequest() creates tickets directly via PrismaService
// (Wave 4a/b TicketsModule may not yet be built when this plan executes).
// When Wave 4a/b TicketsModule is available, refactor postRequest() to
// call TicketsService.create() for Solr indexing, geo-cluster, and email hooks.
// TODO Wave 5: import TicketsModule and inject TicketsService into Open311Service.

@Module({
  imports: [
    CategoriesModule,   // CategoriesService for visibility filtering (Wave 3 plan 07)
    PeopleModule,       // ClientsService.findByApiKey for api_key validation (Wave 3 plan 08)
  ],
  controllers: [Open311Controller],
  providers: [Open311Service, Open311Serializer],
})
export class Open311Module {}
