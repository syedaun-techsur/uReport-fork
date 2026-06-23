import { Module } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { GeoClusterService } from './geo.service';
import { GeoRepository } from './geo.repository';

@Module({
  controllers: [LocationsController],
  providers: [GeoClusterService, GeoRepository],
  /**
   * Export GeoClusterService so TicketsModule can inject it for incremental cluster assignment.
   */
  exports: [GeoClusterService],
})
export class GeoModule {}
