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

    // Guard: only send response if headers have not already been sent
    if (!response.headersSent) {
      response.status(status).json(body);
    }

    // Suppress unused variable warning - request is referenced here for future use
    void request;
  }
}
