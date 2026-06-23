import { Module } from '@nestjs/common';
import { PeopleController, UsersController } from './people.controller';
import { PeopleService } from './people.service';

@Module({
  controllers: [PeopleController, UsersController],
  providers: [PeopleService],
  exports: [PeopleService],
})
export class PeopleModule {}
