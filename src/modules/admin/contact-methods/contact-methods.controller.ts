import {
  Controller, Get, Post, Put, Delete,
  Param, Body, ParseIntPipe, ForbiddenException, Req,
} from '@nestjs/common';
import { ContactMethodsService } from './contact-methods.service';
import { CreateContactMethodDto } from './dto/create-contact-method.dto';
import type { Request } from 'express';

function requireStaff(req: Request): void {
  const user = (req as any).user;
  if (!user || user.role !== 'staff') {
    throw new ForbiddenException('Staff access required');
  }
}

@Controller('contact-methods')
export class ContactMethodsController {
  constructor(
    private readonly contactMethodsService: ContactMethodsService,
  ) {}

  @Get()
  // Anonymous access allowed — contact methods appear on public ticket-creation forms
  findAll() {
    return this.contactMethodsService.findAll();
  }

  @Get(':id')
  // Anonymous access allowed
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contactMethodsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateContactMethodDto, @Req() req: Request) {
    requireStaff(req);
    return this.contactMethodsService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateContactMethodDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.contactMethodsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.contactMethodsService.remove(id);
  }
}
