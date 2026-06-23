import {
  Controller, Get, Post, Delete,
  Param, ParseIntPipe,
  Req, Res,
  ForbiddenException,
  UnauthorizedException,
  UseInterceptors,
  UploadedFile,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { MediaService } from './media.service';

/** Extract req.user set by AuthMiddleware */
function getUser(req: Request): { id: number; role: string | null } | null {
  return (req as any).user ?? null;
}

/** Require authenticated user (public or staff); throw 401 if anonymous */
function requireAuthenticated(req: Request): { id: number; role: string | null } {
  const user = getUser(req);
  if (!user) {
    throw new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Authentication required to upload media' });
  }
  return user;
}

/** Require staff role; throw 403 if not staff */
function requireStaff(req: Request): { id: number; role: string | null } {
  const user = getUser(req);
  if (!user || user.role !== 'staff') {
    throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Staff access required to delete media' });
  }
  return user;
}

@Controller('tickets/:ticketId/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * GET /tickets/:ticketId/media — list attachments
   * [anon] — role-filtered via ticket category displayPermissionLevel
   */
  @Get()
  list(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Req() req: Request,
  ) {
    return this.mediaService.list(ticketId, getUser(req));
  }

  /**
   * POST /tickets/:ticketId/media — upload attachment
   * [public] — requires authenticated user (PRD §F8: "anonymous users cannot upload")
   * TechArch §6.7: multer (via @nestjs/platform-express), 10 MB cap via Multer config in module
   */
  @Post()
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const user = requireAuthenticated(req);
    return this.mediaService.upload(ticketId, file, user.id, user.role);
  }

  /**
   * GET /tickets/:ticketId/media/:mediaId — stream attachment bytes
   * [anon] — displayPermissionLevel check enforced in service
   * Response written directly via piped stream; @Res() bypasses NestJS serialization
   */
  @Get(':mediaId')
  async stream(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('mediaId', ParseIntPipe) mediaId: number,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.mediaService.stream(ticketId, mediaId, getUser(req), res);
  }

  /**
   * GET /tickets/:ticketId/media/:mediaId/thumbnail — stream thumbnail
   * [anon] — 404 for non-image MIME types (TechArch §6.7)
   */
  @Get(':mediaId/thumbnail')
  async streamThumbnail(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('mediaId', ParseIntPipe) mediaId: number,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.mediaService.streamThumbnail(ticketId, mediaId, getUser(req), res);
  }

  /**
   * DELETE /tickets/:ticketId/media/:mediaId — delete attachment
   * [staff] — 403 for non-staff (TechArch §5.3 RBAC: DELETE /tickets/:id/media/:id → staff only)
   */
  @Delete(':mediaId')
  @HttpCode(204)
  async delete(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('mediaId', ParseIntPipe) mediaId: number,
    @Req() req: Request,
  ): Promise<void> {
    const user = requireStaff(req);
    await this.mediaService.delete(ticketId, mediaId, user.id);
  }
}
