import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionService } from '../../modules/auth/session.service';

// Augment Express Request with user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // null = anonymous (not authenticated); Person record = authenticated
      user: {
        id: number;
        firstname: string | null;
        middlename: string | null;
        lastname: string | null;
        organization: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        zip: string | null;
        department_id: number | null;
        username: string | null;
        role: string | null;
      } | null;
    }
  }
}

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
