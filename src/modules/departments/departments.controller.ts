import {
  Controller, Get, Post, Put, Delete,
  Param, Body, ParseIntPipe, ForbiddenException, HttpCode, Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class AssociateCategoryDto {
  @IsInt()
  @Type(() => Number)
  category_id!: number;
}

class AssociateActionDto {
  @IsInt()
  @Type(() => Number)
  action_id!: number;
}

function requireStaff(req: Request): void {
  const role = (req as any).user?.role;
  if (role !== 'staff') throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Staff access required' });
}

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  // ---- Department CRUD ----

  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateDepartmentDto, @Req() req: Request) {
    requireStaff(req);
    return this.departmentsService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.departmentsService.remove(id);
  }

  // ---- Department–Category associations (FRD §F10.4) ----

  @Get(':deptId/categories')
  listCategories(@Param('deptId', ParseIntPipe) deptId: number) {
    return this.departmentsService.listCategories(deptId);
  }

  @Post(':deptId/categories')
  @HttpCode(201)
  addCategory(
    @Param('deptId', ParseIntPipe) deptId: number,
    @Body() body: AssociateCategoryDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.departmentsService.addCategory(deptId, body.category_id);
  }

  @Delete(':deptId/categories/:categoryId')
  @HttpCode(204)
  async removeCategory(
    @Param('deptId', ParseIntPipe) deptId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Req() req: Request,
  ) {
    requireStaff(req);
    await this.departmentsService.removeCategory(deptId, categoryId);
  }

  // ---- Department–Action associations (FRD §F10.5) ----

  @Get(':deptId/actions')
  listActions(@Param('deptId', ParseIntPipe) deptId: number) {
    return this.departmentsService.listActions(deptId);
  }

  @Post(':deptId/actions')
  @HttpCode(201)
  addAction(
    @Param('deptId', ParseIntPipe) deptId: number,
    @Body() body: AssociateActionDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.departmentsService.addAction(deptId, body.action_id);
  }

  @Delete(':deptId/actions/:actionId')
  @HttpCode(204)
  async removeAction(
    @Param('deptId', ParseIntPipe) deptId: number,
    @Param('actionId', ParseIntPipe) actionId: number,
    @Req() req: Request,
  ) {
    requireStaff(req);
    await this.departmentsService.removeAction(deptId, actionId);
  }
}
