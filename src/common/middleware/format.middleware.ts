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
    // Note: Do NOT call stripSuffix here.
    // This middleware runs via NestJS forRoutes('*') which registers it at '/*' in Express.
    // When Express matches the '/*' path, it strips the path prefix from req.url and restores
    // it after the handler. Calling stripSuffix (which modifies req.url) from inside this
    // handler corrupts the URL during restoration (double-URL bug).
    //
    // Instead, explicit .json/.xml suffix routes are registered on the controllers
    // (e.g., @Get('services.json')), and format detection uses req.originalUrl which
    // is never modified by Express path-stripping.
    req.negotiatedFormat = FormatMiddleware.resolve(req);
    next();
  }

  /** Strip .json/.xml/.csv/.txt suffix from req.url in-place.
   *
   * IMPORTANT: This method modifies req.url and is ONLY safe to call when req.url is the
   * full request path (e.g., from a plain app.use(fn) without a path in main.ts).
   * It must NOT be called from within a NestJS forRoutes('*') middleware because NestJS
   * registers that middleware at '/*' which causes Express to strip the path from req.url
   * and restore it after the handler. Modifying req.url inside such a handler corrupts
   * the URL during restoration (resulting in doubled paths like '/path/foo.jsonpath/foo').
   */
  static stripSuffix(req: Request): void {
    const suffixes = ['.json', '.xml', '.csv', '.txt'];
    const checkUrl = (req.url) as string;
    const pathPart = checkUrl.split('?')[0];
    for (const suffix of suffixes) {
      if (pathPart.endsWith(suffix)) {
        const [pathPartStr, ...queryParts] = checkUrl.split('?');
        const stripped = pathPartStr.slice(0, -suffix.length);
        req.url = queryParts.length > 0 ? `${stripped}?${queryParts.join('?')}` : stripped;
        // Clear the parseurl cache so the new req.url is used for routing
        (req as any)._parsedUrl = undefined;
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
