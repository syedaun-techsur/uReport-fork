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
    // Rewrite URL to strip format suffix BEFORE NestJS router sees the request.
    // This enables /open311/v2/services.json and /open311/v2/services to both route
    // to the same controller handler. (Rule 3 auto-fix — blocking for Open311 suffix routing)
    FormatMiddleware.stripSuffix(req);
    req.negotiatedFormat = FormatMiddleware.resolve(req);
    next();
  }

  /** Strip .json/.xml/.csv/.txt suffix from req.url and req.path in-place */
  static stripSuffix(req: Request): void {
    const suffixes = ['.json', '.xml', '.csv', '.txt'];
    for (const suffix of suffixes) {
      if (req.url && req.url.split('?')[0].endsWith(suffix)) {
        // Strip the suffix from the path portion, preserve query string
        const [pathPart, ...queryParts] = req.url.split('?');
        const stripped = pathPart.slice(0, -suffix.length);
        req.url = queryParts.length > 0 ? `${stripped}?${queryParts.join('?')}` : stripped;
        break;
      }
    }
  }

  static resolve(req: Request): NegotiatedFormat {
    // NOTE: resolve() is called AFTER stripSuffix(), so req.path no longer contains the suffix.
    // We check the original URL before stripping via req.originalUrl to determine format.
    const originalPath = req.originalUrl?.split('?')[0] ?? req.path ?? '';

    // 1. URL suffix from original URL (before stripping)
    if (originalPath.endsWith('.json')) return 'json';
    if (originalPath.endsWith('.xml'))  return 'xml';
    if (originalPath.endsWith('.csv'))  return 'csv';
    if (originalPath.endsWith('.txt'))  return 'txt';

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
    return originalPath.startsWith('/open311/v2') ? 'json' : 'html';
  }
}
