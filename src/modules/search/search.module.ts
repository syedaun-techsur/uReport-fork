import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SolrService } from './solr.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SearchController],
  providers: [SearchService, SolrService],
  /**
   * Export SolrService so TicketsModule can inject it for fire-and-forget
   * incremental indexing (FRD §F05.4): create/update/close trigger indexTicket().
   * Wave 4 TicketsModule imports SearchModule to access SolrService.
   */
  exports: [SolrService],
})
export class SearchModule {}
