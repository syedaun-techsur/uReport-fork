import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { DigestCron } from './digest.cron';

@Module({
  imports: [
    ScheduleModule.forRoot(),
  ],
  providers: [NotificationsService, DigestCron],
  /**
   * Export NotificationsService so TicketsModule (imported into AppModule)
   * can inject it into TicketsService after wiring.
   * Wave 5 plan 13 adds TicketsModule dependency on NotificationsModule.
   */
  exports: [NotificationsService],
})
export class NotificationsModule {}
