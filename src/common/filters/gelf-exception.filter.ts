import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { GelfLoggerService } from '../logger/gelf-logger.service';

@Catch()
@Injectable()
export class GelfExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: GelfLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof Error ? exception.message : 'Internal server error';

    const trace =
      exception instanceof Error ? (exception.stack ?? '') : '';

    // Log unhandled exceptions per FRD §F14.5
    if (status >= 500) {
      this.logger.error(message, trace, 'GelfExceptionFilter');
    } else {
      this.logger.warn(`${status} ${message}`, 'GelfExceptionFilter');
    }

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, error: 'Internal Server Error', message };

    // Suppress unused variable warning — request is part of the interface
    void request;

    // Guard against "Cannot set headers after they are sent" — can happen when
    // the serialization interceptor or another filter has already flushed the
    // response (e.g. during Redis reconnect storm or streaming scenarios).
    if (response.headersSent) {
      return;
    }

    response.status(status).json(body);
  }
}
