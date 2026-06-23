import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SubstatusController } from './substatus/substatus.controller';
import { SubstatusService } from './substatus/substatus.service';
import { ActionsController } from './actions/actions.controller';
import { ActionsService } from './actions/actions.service';
import { IssueTypesController } from './issue-types/issue-types.controller';
import { IssueTypesService } from './issue-types/issue-types.service';
import { ContactMethodsController } from './contact-methods/contact-methods.controller';
import { ContactMethodsService } from './contact-methods/contact-methods.service';

@Module({
  controllers: [
    SubstatusController,
    ActionsController,
    IssueTypesController,
    ContactMethodsController,
  ],
  providers: [
    AdminService,
    SubstatusService,
    ActionsService,
    IssueTypesService,
    ContactMethodsService,
  ],
  exports: [AdminService],
})
export class AdminModule {}
