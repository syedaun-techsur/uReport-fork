import {
  Controller, Get, Post, Put, Delete,
  Param, Body, ParseIntPipe, ForbiddenException, Req,
} from '@nestjs/common';
import { ActionsService } from './actions.service';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';
import type { Request } from 'express';

function requireStaff(req: Request): void {
  const user = (req as any).user;
  if (!user || user.role !== 'staff') {
    throw new ForbiddenException('Staff access required');
  }
}

@Controller('actions')
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @Get()
  findAll(@Req() req: Request) {
    requireStaff(req);
    return this.actionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.actionsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateActionDto, @Req() req: Request) {
    requireStaff(req);
    return this.actionsService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActionDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.actionsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.actionsService.remove(id);
  }
}
