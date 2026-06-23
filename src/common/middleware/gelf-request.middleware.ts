import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { GelfLoggerService } from '../logger/gelf-logger.service';

@Injectable()
export class GelfRequestMiddleware implements NestMiddleware {
  constructor(private readonly logger: GelfLoggerService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = uuidv4();
    const start = Date.now();

    // Attach requestId to request for downstream use
    (req as Request & { requestId: string }).requestId = requestId;

    // Read userId from session if already set (may be undefined for anonymous)
    const userId: number | undefined = (req as Request & { session?: { userId?: number } }).session?.userId;

    this.logger.setRequestContext(requestId, userId);
    this.logger.log(`${req.method} ${req.path}`, 'GelfRequestMiddleware');

    res.on('finish', () => {
      const durationMs = Date.now() - start;
      this.logger.log(
        `${req.method} ${req.path} ${res.statusCode} ${durationMs}ms`,
        'GelfRequestMiddleware',
      );
      this.logger.clearRequestContext();
    });

    next();
  }
}
