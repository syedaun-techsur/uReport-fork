import {
  Controller, Get, Post, Put, Param, Body, Query,
  ParseIntPipe, ForbiddenException,
  HttpCode, Req, UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { TicketsService } from './tickets.service';
import { CloseTicketDto } from './dto/close-ticket.dto';
import { DuplicateTicketDto } from './dto/duplicate-ticket.dto';
import { CommentTicketDto } from './dto/comment-ticket.dto';
import { ResponseTicketDto } from './dto/response-ticket.dto';
import { ReopenTicketDto } from './dto/reopen-ticket.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { PiiMaskInterceptor } from '../../common/interceptors/pii-mask.interceptor';

/**
 * Helper: extract user from request.
 * Returns null for anonymous callers (AuthMiddleware sets req.user = null).
 */
function getUser(req: Request) {
  return (req as any).user as { id: number; role: string | null } | null;
}

/**
 * Enforces staff role. Throws 403 if caller is not staff.
 * Matches the inline guard pattern used by Wave 3 modules (plan 06-08).
 */
function requireStaff(req: Request): { id: number; role: string | null } {
  const user = getUser(req);
  if (!user || user.role !== 'staff') {
    throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Staff access required' });
  }
  return user;
}

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // ----------------------------------------------------------------
  // GET /tickets — paginated list with role-based category filter
  // [anon] per TechArch §4.3 + FRD §F02.2
  // ----------------------------------------------------------------
  @Get()
  @UseInterceptors(PiiMaskInterceptor)
  findAll(@Query() dto: ListTicketsDto, @Req() req: Request) {
    const user = getUser(req);
    return this.ticketsService.list(user?.role ?? null, dto);
  }

  // ----------------------------------------------------------------
  // GET /tickets/:id — single ticket detail
  // [anon] per TechArch §4.3; category visibility enforced in service
  // ----------------------------------------------------------------
  @Get(':id')
  @UseInterceptors(PiiMaskInterceptor)
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = getUser(req);
    return this.ticketsService.findOne(id, user?.role ?? null);
  }

  // ----------------------------------------------------------------
  // PUT /tickets/:id — update ticket (changeCategory / changeLocation / update)
  // [staff] per TechArch §4.3 / FRD §F01.3
  // ----------------------------------------------------------------
  @Put(':id')
  @UseInterceptors(PiiMaskInterceptor)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketDto,
    @Req() req: Request,
  ) {
    const user = requireStaff(req);
    return this.ticketsService.update(id, dto, user.id);
  }

  // ----------------------------------------------------------------
  // POST /tickets/:id/close — close ticket with substatus
  // [staff] per TechArch §4.3 / FRD §F01.4
  // ----------------------------------------------------------------
  @Post(':id/close')
  @HttpCode(200)
  close(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseTicketDto,
    @Req() req: Request,
  ) {
    const user = requireStaff(req);
    return this.ticketsService.close(id, dto, user.id);
  }

  // ----------------------------------------------------------------
  // POST /tickets/:id/duplicate — mark as duplicate of parent
  // [staff] per TechArch §4.3 / FRD §F01.5
  // CRITICAL: 'duplicate' action logged on PARENT only (FRD §F01.5)
  // ----------------------------------------------------------------
  @Post(':id/duplicate')
  @HttpCode(200)
  duplicate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DuplicateTicketDto,
    @Req() req: Request,
  ) {
    const user = requireStaff(req);
    return this.ticketsService.duplicate(id, dto, user.id);
  }

  // ----------------------------------------------------------------
  // POST /tickets/:id/reopen — re-open closed ticket
  // [staff] per TechArch §4.3 / FRD §F01.8
  // ----------------------------------------------------------------
  @Post(':id/reopen')
  @HttpCode(200)
  reopen(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReopenTicketDto,
    @Req() req: Request,
  ) {
    const user = requireStaff(req);
    return this.ticketsService.reopen(id, dto, user.id);
  }

  // ----------------------------------------------------------------
  // POST /tickets/:id/comment — add staff comment
  // [staff] per TechArch §4.3 / FRD §F01.6
  // ----------------------------------------------------------------
  @Post(':id/comment')
  @HttpCode(201)
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CommentTicketDto,
    @Req() req: Request,
  ) {
    const user = requireStaff(req);
    return this.ticketsService.addComment(id, dto, user.id);
  }

  // ----------------------------------------------------------------
  // POST /tickets/:id/response — add response action
  // [staff] per TechArch §4.3 / FRD §F01.7
  // ----------------------------------------------------------------
  @Post(':id/response')
  @HttpCode(201)
  addResponse(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResponseTicketDto,
    @Req() req: Request,
  ) {
    const user = requireStaff(req);
    return this.ticketsService.addResponse(id, dto, user.id);
  }

  // ----------------------------------------------------------------
  // GET /tickets/:id/history — ticket history (role-filtered + PII mask)
  // [anon] per TechArch §4.3 / FRD §F01.9
  // PiiMaskInterceptor nulls enteredByPerson_id + actionPerson_id for non-staff
  // ----------------------------------------------------------------
  @Get(':id/history')
  @UseInterceptors(PiiMaskInterceptor)
  getHistory(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = getUser(req);
    return this.ticketsService.getHistory(id, user?.role ?? null);
  }
}
