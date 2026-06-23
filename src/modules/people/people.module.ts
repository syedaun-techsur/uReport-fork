import { Module } from '@nestjs/common';
import { PeopleController, UsersController } from './people.controller';
import { PeopleService } from './people.service';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  controllers: [PeopleController, UsersController, ClientsController],
  providers: [PeopleService, ClientsService],
  exports: [PeopleService, ClientsService],
})
export class PeopleModule {}
