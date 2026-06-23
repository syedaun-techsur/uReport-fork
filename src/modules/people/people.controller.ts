import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { PeopleService } from './people.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { CreateEmailDto } from './dto/create-email.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { CreatePhoneDto } from './dto/create-phone.dto';
import { UpdatePhoneDto } from './dto/update-phone.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { PersonSearchDto } from './dto/person-search.dto';

function requireStaff(req: Request): void {
  const user = (req as any).user;
  if (!user || user.role !== 'staff') {
    throw new ForbiddenException('Staff access required');
  }
}

@Controller('people')
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  // ---- People CRUD ----

  @Get()
  findAll(@Req() req: Request) {
    requireStaff(req);
    return this.peopleService.findAll();
  }

  @Get('search')
  search(@Query() dto: PersonSearchDto, @Req() req: Request) {
    requireStaff(req);
    return this.peopleService.search(dto.q, dto.role, dto.department_id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.peopleService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePersonDto, @Req() req: Request) {
    requireStaff(req);
    return this.peopleService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePersonDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.peopleService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.peopleService.remove(id);
  }

  // ---- Emails sub-resource ----

  @Post(':id/emails')
  addEmail(
    @Param('id', ParseIntPipe) personId: number,
    @Body() dto: CreateEmailDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.peopleService.addEmail(personId, dto);
  }

  @Put(':id/emails/:emailId')
  updateEmail(
    @Param('id', ParseIntPipe) personId: number,
    @Param('emailId', ParseIntPipe) emailId: number,
    @Body() dto: UpdateEmailDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.peopleService.updateEmail(personId, emailId, dto);
  }

  @Delete(':id/emails/:emailId')
  removeEmail(
    @Param('id', ParseIntPipe) personId: number,
    @Param('emailId', ParseIntPipe) emailId: number,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.peopleService.removeEmail(personId, emailId);
  }

  // ---- Phones sub-resource ----

  @Post(':id/phones')
  addPhone(
    @Param('id', ParseIntPipe) personId: number,
    @Body() dto: CreatePhoneDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.peopleService.addPhone(personId, dto);
  }

  @Put(':id/phones/:phoneId')
  updatePhone(
    @Param('id', ParseIntPipe) personId: number,
    @Param('phoneId', ParseIntPipe) phoneId: number,
    @Body() dto: UpdatePhoneDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.peopleService.updatePhone(personId, phoneId, dto);
  }

  @Delete(':id/phones/:phoneId')
  removePhone(
    @Param('id', ParseIntPipe) personId: number,
    @Param('phoneId', ParseIntPipe) phoneId: number,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.peopleService.removePhone(personId, phoneId);
  }

  // ---- Addresses sub-resource ----

  @Post(':id/addresses')
  addAddress(
    @Param('id', ParseIntPipe) personId: number,
    @Body() dto: CreateAddressDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.peopleService.addAddress(personId, dto);
  }

  @Put(':id/addresses/:addrId')
  updateAddress(
    @Param('id', ParseIntPipe) personId: number,
    @Param('addrId', ParseIntPipe) addrId: number,
    @Body() dto: UpdateAddressDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.peopleService.updateAddress(personId, addrId, dto);
  }

  @Delete(':id/addresses/:addrId')
  removeAddress(
    @Param('id', ParseIntPipe) personId: number,
    @Param('addrId', ParseIntPipe) addrId: number,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.peopleService.removeAddress(personId, addrId);
  }
}

@Controller('users')
export class UsersController {
  constructor(private readonly peopleService: PeopleService) {}

  @Get()
  findStaff(@Req() req: Request) {
    requireStaff(req);
    return this.peopleService.findStaffUsers();
  }
}
