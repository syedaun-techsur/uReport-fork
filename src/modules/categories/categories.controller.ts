import {
  Controller, Get, Post, Put, Delete,
  Param, Body, ParseIntPipe, ForbiddenException,
  HttpCode, Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateCategoryGroupDto } from './dto/create-category-group.dto';
import { UpdateCategoryGroupDto } from './dto/update-category-group.dto';
import { UpsertActionResponseDto } from './dto/upsert-action-response.dto';

function getUserRole(req: Request): string | null | undefined {
  return (req as any).user?.role;
}

function requireStaff(req: Request): void {
  const role = getUserRole(req);
  if (role !== 'staff') throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Staff access required' });
}

@Controller()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ---- Categories ----

  /** GET /categories — list visible categories per caller's role (FRD §F10.1, §F02.5) */
  @Get('categories')
  findAll(@Req() req: Request) {
    return this.categoriesService.findAll(getUserRole(req));
  }

  /** GET /categories/:id */
  @Get('categories/:id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.categoriesService.findOne(id, getUserRole(req));
  }

  /** POST /categories — staff only */
  @Post('categories')
  create(@Body() dto: CreateCategoryDto, @Req() req: Request) {
    requireStaff(req);
    return this.categoriesService.create(dto);
  }

  /** PUT /categories/:id — staff only */
  @Put('categories/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.categoriesService.update(id, dto);
  }

  /** DELETE /categories/:id — staff only */
  @Delete('categories/:id')
  @HttpCode(200)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.categoriesService.remove(id);
  }

  // ---- CategoryGroups ----

  /** GET /category-groups */
  @Get('category-groups')
  findAllGroups() {
    return this.categoriesService.findAllGroups();
  }

  /** GET /category-groups/:id */
  @Get('category-groups/:id')
  findOneGroup(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOneGroup(id);
  }

  /** POST /category-groups — staff only */
  @Post('category-groups')
  createGroup(@Body() dto: CreateCategoryGroupDto, @Req() req: Request) {
    requireStaff(req);
    return this.categoriesService.createGroup(dto);
  }

  /** PUT /category-groups/:id — staff only */
  @Put('category-groups/:id')
  updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryGroupDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.categoriesService.updateGroup(id, dto);
  }

  /** DELETE /category-groups/:id — staff only */
  @Delete('category-groups/:id')
  @HttpCode(200)
  removeGroup(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    requireStaff(req);
    return this.categoriesService.removeGroup(id);
  }

  // ---- Category Action Responses ----

  /** GET /categories/:categoryId/actions/:actionId/response (FRD §F10.6) */
  @Get('categories/:categoryId/actions/:actionId/response')
  getActionResponse(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('actionId', ParseIntPipe) actionId: number,
  ) {
    return this.categoriesService.getActionResponse(categoryId, actionId);
  }

  /** POST /categories/:categoryId/actions/:actionId/response — upsert, staff only */
  @Post('categories/:categoryId/actions/:actionId/response')
  upsertActionResponse(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('actionId', ParseIntPipe) actionId: number,
    @Body() dto: UpsertActionResponseDto,
    @Req() req: Request,
  ) {
    requireStaff(req);
    return this.categoriesService.upsertActionResponse(categoryId, actionId, dto);
  }

  /** DELETE /categories/:categoryId/actions/:actionId/response — staff only */
  @Delete('categories/:categoryId/actions/:actionId/response')
  @HttpCode(204)
  async deleteActionResponse(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('actionId', ParseIntPipe) actionId: number,
    @Req() req: Request,
  ) {
    requireStaff(req);
    await this.categoriesService.deleteActionResponse(categoryId, actionId);
  }
}
