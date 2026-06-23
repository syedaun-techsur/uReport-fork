import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request } from 'express';

@Injectable()
export class PiiMaskInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user ?? null;

    // Staff see all fields — interceptor is a no-op
    if (user?.role === 'staff') {
      return next.handle();
    }

    const currentUserId = user?.id ?? null;

    return next.handle().pipe(
      map((data: unknown) => this.maskPii(data, currentUserId)),
    );
  }

  private maskPii(data: unknown, currentUserId: number | null): unknown {
    if (data === null || data === undefined) return data;
    if (Array.isArray(data)) {
      return data.map(item => this.maskPii(item, currentUserId));
    }
    if (typeof data === 'object') {
      return this.maskObject(data as Record<string, unknown>, currentUserId);
    }
    return data;
  }

  private maskObject(obj: Record<string, unknown>, currentUserId: number | null): Record<string, unknown> {
    const masked = { ...obj };

    // Detect Ticket: has enteredDate + category_id (or status)
    const isTicket = 'category_id' in masked && ('enteredDate' in masked || 'status' in masked);
    // Detect TicketHistory: has action_id
    const isTicketHistory = 'action_id' in masked && 'ticket_id' in masked;

    if (isTicket) {
      // Public user owns this ticket if reportedByPerson_id matches — preserve that field
      const ownTicket = currentUserId !== null && masked['reportedByPerson_id'] === currentUserId;

      if (!ownTicket) {
        // FRD §F02.8: mask reportedByPerson_id for non-staff on others' tickets
        masked['reportedByPerson_id'] = null;
      }
      // Always mask these on non-staff responses (FRD §F02.8)
      masked['enteredByPerson_id'] = null;
      masked['assignedPerson_id'] = null;
    }

    if (isTicketHistory) {
      // FRD §F02.8: mask history person fields for non-staff
      masked['enteredByPerson_id'] = null;
      masked['actionPerson_id'] = null;
    }

    // Recursively mask nested objects (e.g., included relations)
    for (const [key, value] of Object.entries(masked)) {
      if (key !== 'reportedByPerson_id' && key !== 'enteredByPerson_id' && key !== 'assignedPerson_id' && key !== 'actionPerson_id') {
        if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
          masked[key] = this.maskPii(value, currentUserId);
        }
      }
    }

    return masked;
  }
}
