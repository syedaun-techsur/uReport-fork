import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user: unknown }>();
    if (!req.user) {
      throw new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    return true;
  }
}
