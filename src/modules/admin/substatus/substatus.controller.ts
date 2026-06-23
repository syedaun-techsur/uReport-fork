import {
  Controller, Get, Post, Put, Delete,
  Param, Body, ParseIntPipe, ForbiddenException, Req,
} from '@nestjs/common';
import { SubstatusService } from './substatus.service';
import { CreateSubstatusDto } from './dto/create-substatus.dto';
import { UpdateSubstatusDto } from './dto/update-substatus.dto';
import type { Request } from 'express';

function requireStaff(req: Request): void {
  const user = (req as any).user;
  if (!user || user.role !== 'staff') {
    throw new ForbiddenException('Staff access required');
  }
}

@Controller('substatus')
export class SubstatusController {
  constructor(private readonly substatusService: SubstatusService) {}

  @Get()
  findAll(@Req() req: Request) {
    requireStaff(req);
    return this.substatusService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.substatusService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSubstatusDto, @Req() req: Request) {
    requireStaff(req);
    return this.substatusService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubstatusDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.substatusService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.substatusService.remove(id);
  }
}
