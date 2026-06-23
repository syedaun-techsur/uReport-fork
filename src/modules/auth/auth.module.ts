import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionService],
  exports: [SessionService],  // SessionService exported for use by Wave 3+ modules (RBAC middleware)
})
export class AuthModule {}
