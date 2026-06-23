import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Response, Request } from 'express';
import { NegotiatedFormat } from '../middleware/format.middleware';
import { JsonSerializer } from '../serializers/json.serializer';
import { XmlSerializer } from '../serializers/xml.serializer';
import { CsvSerializer } from '../serializers/csv.serializer';
import { TxtSerializer } from '../serializers/txt.serializer';
import { HtmlRenderer } from '../serializers/html.renderer';

@Injectable()
export class SerializationInterceptor implements NestInterceptor {
  constructor(
    private readonly json: JsonSerializer,
    private readonly xml: XmlSerializer,
    private readonly csv: CsvSerializer,
    private readonly txt: TxtSerializer,
    private readonly html: HtmlRenderer,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { negotiatedFormat?: NegotiatedFormat }>();
    const res = http.getResponse<Response>();

    const format: NegotiatedFormat = req.negotiatedFormat ?? 'json';

    return next.handle().pipe(
      map(async (data: unknown) => {
        await this.write(res, format, data);
        // Return undefined — response already written
        return undefined;
      }),
      catchError((err: unknown) =>
        throwError(() => this.formatError(res, format, err)),
      ),
    );
  }

  private async write(res: Response, format: NegotiatedFormat, data: unknown): Promise<void> {
    // Determine root XML element name from the data shape
    const rootElement = Array.isArray(data) ? 'items' : 'item';

    switch (format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.end(this.json.serialize(data));
        break;

      case 'xml':
        res.setHeader('Content-Type', 'application/xml');
        res.end(this.xml.serialize(data, rootElement));
        break;

      case 'csv': {
        const date = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="export-${date}.csv"`);
        const rows = Array.isArray(data) ? data : [data];
        res.end(this.csv.serialize(rows));
        break;
      }

      case 'txt':
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(this.txt.serialize(data));
        break;

      case 'html': {
        res.setHeader('Content-Type', 'text/html');
        // Template name is set on the response by the controller via a custom header;
        // fall back to a JSON dump if not set (development mode).
        const template = (res.getHeader('X-Template') as string | undefined) ?? '';
        const rendered = await this.html.render(template, data);
        res.end(rendered);
        break;
      }
    }
  }

  private formatError(res: Response, format: NegotiatedFormat, err: unknown): unknown {
    const httpErr = err instanceof HttpException ? err : null;
    const statusCode = httpErr?.getStatus() ?? 500;
    const message = httpErr?.message ?? 'Internal server error';
    const errorCode = httpErr
      ? (httpErr.getResponse() as Record<string, unknown>)?.['error'] ?? 'Error'
      : 'INTERNAL_SERVER_ERROR';

    res.status(statusCode);

    switch (format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ statusCode, error: errorCode, message }));
        break;
      case 'xml':
        res.setHeader('Content-Type', 'application/xml');
        res.end(
          `<?xml version="1.0" encoding="UTF-8"?><error><description>${message}</description><code>${statusCode}</code></error>`,
        );
        break;
      case 'csv':
      case 'txt':
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(`Error ${statusCode}: ${message}`);
        break;
      case 'html':
        res.setHeader('Content-Type', 'text/html');
        res.end(`<html><body><h1>Error ${statusCode}</h1><p>${message}</p></body></html>`);
        break;
    }

    // Return the original error so NestJS exception filters can still log it
    return err;
  }
}
