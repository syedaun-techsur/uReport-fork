import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SubstatusController } from './substatus/substatus.controller';
import { SubstatusService } from './substatus/substatus.service';
import { ActionsController } from './actions/actions.controller';
import { ActionsService } from './actions/actions.service';

@Module({
  controllers: [SubstatusController, ActionsController],
  providers: [AdminService, SubstatusService, ActionsService],
  exports: [AdminService],
})
export class AdminModule {}
