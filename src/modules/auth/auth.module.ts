import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { AbilityFactory } from './ability.factory';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionService, AbilityFactory],
  exports: [SessionService, AbilityFactory],
})
export class AuthModule {}
