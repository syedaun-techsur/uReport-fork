import {
  Controller, Get, Post, Put,
  Param, Body, ParseIntPipe,
  UnauthorizedException, Req,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CloseTicketDto } from './dto/close-ticket.dto';
import { DuplicateTicketDto } from './dto/duplicate-ticket.dto';
import { CommentTicketDto } from './dto/comment-ticket.dto';
import { ResponseTicketDto } from './dto/response-ticket.dto';
import { ReopenTicketDto } from './dto/reopen-ticket.dto';
import { PiiMaskInterceptor } from '../../common/interceptors/pii-mask.interceptor';

/** Extract req.user (set by AuthMiddleware from plan 06); null = anonymous */
function getUser(req: Request): { id: number; role: string | null } | null {
  return (req as any).user ?? null;
}

/**
 * Require at minimum an authenticated user (public or staff).
 * Used for routes that need a logged-in user but not necessarily staff.
 */
function requireAuthenticated(req: Request): { id: number; role: string | null } {
  const user = getUser(req);
  if (!user) {
    throw new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  return user;
}

@Controller('tickets')
@UseInterceptors(PiiMaskInterceptor)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * GET /tickets — list tickets visible to caller's role (FRD §F02.5)
   * Auth: [anon] — anonymous callers get category-filtered results
   */
  @Get()
  findAll(@Req() req: Request) {
    return this.ticketsService.findAll(getUser(req));
  }

  /**
   * POST /tickets — create a new ticket (FRD §F01.1)
   * Auth: [public] — requires authenticated user (public or staff)
   */
  @Post()
  create(@Body() dto: CreateTicketDto, @Req() req: Request) {
    // Public and staff may create; anonymous cannot (TechArch §5.3 permission matrix)
    const user = requireAuthenticated(req);
    return this.ticketsService.create(dto, user);
  }

  /**
   * GET /tickets/:id — single ticket detail (FRD §F01.1)
   * Auth: [anon]
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.ticketsService.findOne(id, getUser(req));
  }

  /**
   * PUT /tickets/:id — update ticket fields (FRD §F01.3)
   * Auth: [staff]
   */
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketDto,
    @Req() req: Request,
  ) {
    const user = requireAuthenticated(req);
    return this.ticketsService.update(id, dto, user as any);
  }

  /**
   * POST /tickets/:id/assign — assign ticket to a person (FRD §F01.2)
   * Auth: [staff]
   */
  @Post(':id/assign')
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTicketDto,
    @Req() req: Request,
  ) {
    const user = requireAuthenticated(req);
    return this.ticketsService.assign(id, dto, user as any);
  }

  /**
   * POST /tickets/:id/close — close ticket with substatus (FRD §F01.4)
   * Auth: [staff]
   */
  @Post(':id/close')
  close(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseTicketDto,
    @Req() req: Request,
  ) {
    const user = requireAuthenticated(req);
    return this.ticketsService.close(id, dto, user as any);
  }

  /**
   * POST /tickets/:id/duplicate — mark ticket as duplicate (FRD §F01.5)
   * Auth: [staff]
   */
  @Post(':id/duplicate')
  duplicate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DuplicateTicketDto,
    @Req() req: Request,
  ) {
    const user = requireAuthenticated(req);
    return this.ticketsService.duplicate(id, dto, user as any);
  }

  /**
   * POST /tickets/:id/reopen — re-open a closed ticket (FRD §F01.8)
   * Auth: [staff]
   */
  @Post(':id/reopen')
  reopen(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReopenTicketDto,
    @Req() req: Request,
  ) {
    const user = requireAuthenticated(req);
    return this.ticketsService.reopen(id, dto, user as any);
  }

  /**
   * POST /tickets/:id/comment — add staff comment (FRD §F01.6)
   * Auth: [staff]
   */
  @Post(':id/comment')
  comment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CommentTicketDto,
    @Req() req: Request,
  ) {
    const user = requireAuthenticated(req);
    return this.ticketsService.comment(id, dto, user as any);
  }

  /**
   * POST /tickets/:id/response — add response action (FRD §F01.7)
   * Auth: [staff]
   */
  @Post(':id/response')
  respond(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResponseTicketDto,
    @Req() req: Request,
  ) {
    const user = requireAuthenticated(req);
    return this.ticketsService.respond(id, dto, user as any);
  }

  /**
   * GET /tickets/:id/history — view ticket history (FRD §F01.9)
   * Auth: [anon] — PII masked for non-staff by PiiMaskInterceptor
   */
  @Get(':id/history')
  getHistory(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.ticketsService.getHistory(id, getUser(req));
  }
}
