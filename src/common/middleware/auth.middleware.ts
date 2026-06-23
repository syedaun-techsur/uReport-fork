import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionService } from '../../modules/auth/session.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const sessionUser = this.sessionService.getUser(req.session);

    if (!sessionUser) {
      req.user = null;
      next();
      return;
    }

    // Load full people record so downstream services/guards have all fields
    const person = await this.prisma.people.findUnique({
      where: { id: sessionUser.userId },
    });

    if (!person) {
      // Session references a deleted user — invalidate session
      await this.sessionService.destroy(req.session);
      req.user = null;
    } else {
      req.user = person;
    }

    next();
  }
}
