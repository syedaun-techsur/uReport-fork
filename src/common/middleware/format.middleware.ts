import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export type NegotiatedFormat = 'json' | 'xml' | 'csv' | 'txt' | 'html';

// Augment Express Request with negotiatedFormat
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      negotiatedFormat: NegotiatedFormat;
    }
  }
}

@Injectable()
export class FormatMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    req.negotiatedFormat = FormatMiddleware.resolve(req);
    next();
  }

  static resolve(req: Request): NegotiatedFormat {
    const path = req.path ?? '';

    // 1. URL suffix — strip the suffix from path before routing (NestJS sees the clean path)
    //    FormatMiddleware only READS the suffix; actual path rewriting is NOT done here.
    //    The Open311 controller registers routes without the suffix; Express path includes it.
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.xml'))  return 'xml';
    if (path.endsWith('.csv'))  return 'csv';
    if (path.endsWith('.txt'))  return 'txt';

    // 2. ?format= query parameter
    const fmt = (req.query as Record<string, string>)['format'];
    if (fmt === 'json' || fmt === 'xml' || fmt === 'csv' || fmt === 'txt' || fmt === 'html') {
      return fmt as NegotiatedFormat;
    }

    // 3. Accept header
    const accept = req.headers['accept'] ?? '';
    if (accept.includes('application/json') || accept.includes('application/javascript')) return 'json';
    if (accept.includes('application/xml')  || accept.includes('text/xml'))               return 'xml';
    if (accept.includes('text/csv'))                                                        return 'csv';
    if (accept.includes('text/plain'))                                                      return 'txt';
    if (accept.includes('text/html'))                                                       return 'html';

    // 4. Default: JSON for Open311 routes, HTML for everything else
    return path.startsWith('/open311/v2') ? 'json' : 'html';
  }
}
