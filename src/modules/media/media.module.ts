import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaRepository } from './media.repository';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [
    TicketsModule,
    MulterModule.registerAsync({
      useFactory: () => ({
        // In-memory storage: service writes to disk with UUID filename (TechArch §7.7)
        storage: multer.memoryStorage(),
        limits: {
          fileSize: parseInt(process.env['MEDIA_MAX_BYTES'] ?? '10485760', 10),
        },
        fileFilter: (_req, file, cb) => {
          // Accept all MIME types — MIME validation is handled at the service layer
          // to allow future extension without controller changes
          cb(null, true);
        },
      }),
    }),
  ],
  controllers: [MediaController],
  providers: [MediaService, MediaRepository],
  /**
   * Export MediaService so:
   * - Open311Module (plan 11) can resolve media_url for GET /requests
   * - Wave 6 ReportsModule can surface attachment counts
   */
  exports: [MediaService],
})
export class MediaModule {}
