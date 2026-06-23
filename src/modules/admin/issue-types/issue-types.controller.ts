import {
  Controller, Get, Post, Put, Delete,
  Param, Body, ParseIntPipe, ForbiddenException, Req,
} from '@nestjs/common';
import { IssueTypesService } from './issue-types.service';
import { CreateIssueTypeDto } from './dto/create-issue-type.dto';
import type { Request } from 'express';

function requireStaff(req: Request): void {
  const user = (req as any).user;
  if (!user || user.role !== 'staff') {
    throw new ForbiddenException('Staff access required');
  }
}

@Controller('issue-types')
export class IssueTypesController {
  constructor(private readonly issueTypesService: IssueTypesService) {}

  @Get()
  findAll(@Req() req: Request) {
    requireStaff(req);
    return this.issueTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.issueTypesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateIssueTypeDto, @Req() req: Request) {
    requireStaff(req);
    return this.issueTypesService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateIssueTypeDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.issueTypesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.issueTypesService.remove(id);
  }
}
