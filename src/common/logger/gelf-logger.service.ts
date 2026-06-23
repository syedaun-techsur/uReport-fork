import { Injectable, LoggerService } from '@nestjs/common';
import * as os from 'os';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const gelfPro = require('gelf-pro');

interface GelfContext {
  requestId?: string;
  userId?: number;
  ticketId?: number;
}

@Injectable()
export class GelfLoggerService implements LoggerService {
  private context: GelfContext = {};

  constructor() {
    gelfPro.setConfig({
      adapterName: process.env.GRAYLOG_TRANSPORT ?? 'udp',
      adapterOptions: {
        host: process.env.GRAYLOG_HOST ?? 'localhost',
        port: parseInt(process.env.GRAYLOG_PORT ?? '12201', 10),
      },
    });
  }

  /** Call from request middleware to attach per-request context fields */
  setRequestContext(requestId: string, userId?: number, ticketId?: number): void {
    this.context = { requestId, userId, ticketId };
  }

  clearRequestContext(): void {
    this.context = {};
  }

  private send(level: number, message: string, extra: Record<string, unknown> = {}): void {
    const payload: Record<string, unknown> = {
      version: '1.1',
      host: os.hostname(),
      short_message: message,
      timestamp: Date.now() / 1000,
      level,
      _facility: process.env.GRAYLOG_FACILITY ?? 'uReport',
      ...extra,
    };
    if (this.context.requestId) payload['_request_id'] = this.context.requestId;
    if (this.context.userId !== undefined) payload['_user_id'] = this.context.userId;
    if (this.context.ticketId !== undefined) payload['_ticket_id'] = this.context.ticketId;

    gelfPro.message(payload, (err: Error | null) => {
      if (err) {
        // Fallback per TechArch §7.8 / FRD §F14 — never crash due to logging failure
        console.error('[GelfLoggerService] Failed to send GELF message:', err.message, '| Original:', message);
      }
    });
  }

  log(message: string, context?: string): void {
    this.send(6, message, context ? { _context: context } : {});
  }

  error(message: string, trace?: string, context?: string): void {
    const extra: Record<string, unknown> = {};
    if (trace) extra['full_message'] = trace;
    if (context) extra['_context'] = context;
    this.send(3, message, extra);
  }

  warn(message: string, context?: string): void {
    this.send(4, message, context ? { _context: context } : {});
  }

  debug(message: string, context?: string): void {
    this.send(7, message, context ? { _context: context } : {});
  }

  verbose(message: string, context?: string): void {
    this.send(7, message, context ? { _context: context } : {});
  }
}
