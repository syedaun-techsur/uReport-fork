import { Global, Module } from '@nestjs/common';
import { GelfLoggerService } from './gelf-logger.service';

@Global()
@Module({
  providers: [GelfLoggerService],
  exports: [GelfLoggerService],
})
export class GelfLoggerModule {}
