import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { Response } from 'express';
import { MediaRepository } from './media.repository';
import { TicketsService } from '../tickets/tickets.service';
import { PrismaService } from '../../prisma/prisma.service';

/** Image MIME types that get thumbnails (TechArch §6.7) */
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/** Thumbnail dimensions (square crop, 200px — matches legacy Image.php behavior) */
const THUMBNAIL_SIZE = 200;

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly storagePath: string;

  constructor(
    private readonly repo: MediaRepository,
    private readonly ticketsService: TicketsService,
    private readonly prisma: PrismaService,
  ) {
    this.storagePath = process.env['MEDIA_STORAGE_PATH'] ?? '/var/uReport/media';
  }

  // =========================================================
  // F8: Upload attachment
  // POST /tickets/:id/media  [public — authenticated users only]
  // =========================================================

  /**
   * Saves the uploaded file to disk with a UUID internalFilename,
   * inserts a media row, appends 'upload_media' ticketHistory action.
   * Anonymous callers throw 401 before reaching this method (guard in controller).
   *
   * TechArch §7.7:
   * - internalFilename = randomUUID() — never user-supplied
   * - Path: {MEDIA_STORAGE_PATH}/{ticket_id}/{internalFilename}
   * - Thumbnail generated async (fire-and-forget) for image/* MIME types
   */
  async upload(
    ticketId: number,
    file: Express.Multer.File,
    userId: number,
    userRole: string | null,
  ) {
    // Verify ticket exists and caller can access it (PRD §F8 permission check)
    await this.ticketsService.findOne(ticketId, { id: userId, role: userRole });

    // Generate UUID-based internal filename (TechArch §7.7 — never derived from user input)
    const internalFilename = randomUUID();

    // Ensure ticket-scoped storage directory exists
    const ticketDir = path.join(this.storagePath, String(ticketId));
    await fs.promises.mkdir(ticketDir, { recursive: true });

    // Write file buffer to disk
    const filePath = path.join(ticketDir, internalFilename);
    await fs.promises.writeFile(filePath, file.buffer);

    // Insert media row (TechArch §media DDL — exact column names)
    const media = await this.repo.create({
      tickets: { connect: { id: ticketId } },
      filename: file.originalname.slice(0, 128), // VARCHAR(128) cap
      internalFilename,
      mime_type: file.mimetype ?? null,
      uploaded: new Date(),
      person: { connect: { id: userId } },
    } as any);

    // Append 'upload_media' action to ticketHistory (PRD §F8, TechArch seed action name)
    await this.appendMediaHistory(ticketId, 'upload_media', userId, media.id);

    // Fire-and-forget thumbnail generation for image MIME types (TechArch §6.7)
    if (file.mimetype && IMAGE_MIME_TYPES.includes(file.mimetype)) {
      this.generateThumbnail(ticketId, internalFilename, file.buffer).catch((err) => {
        this.logger.warn(`Thumbnail generation failed for media ${media.id}: ${err?.message}`);
      });
    }

    return media;
  }

  // =========================================================
  // F8: List attachments
  // GET /tickets/:id/media  [anon — role-filtered via ticket visibility]
  // =========================================================

  async list(ticketId: number, user: { id: number; role: string | null } | null) {
    // Verify ticket visibility (throws 404 if not visible to caller's role)
    await this.ticketsService.findOne(ticketId, user);
    return this.repo.findByTicket(ticketId);
  }

  // =========================================================
  // F8: Stream attachment
  // GET /tickets/:id/media/:mediaId  [anon — role-filtered]
  // =========================================================

  /**
   * Streams the raw file bytes to the Express response with correct Content-Type.
   * Returns 404 if mediaId not found, belongs to different ticket, or ticket not visible.
   * TechArch §7.7: streaming via fs.createReadStream() piped to response.
   */
  async stream(
    ticketId: number,
    mediaId: number,
    user: { id: number; role: string | null } | null,
    res: Response,
  ): Promise<void> {
    // Verify ticket visibility
    await this.ticketsService.findOne(ticketId, user);

    const media = await this.repo.findOne(mediaId);
    if (!media || media.ticket_id !== ticketId) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Attachment not found' });
    }

    const filePath = path.join(this.storagePath, String(ticketId), media.internalFilename);

    // Verify file exists on disk
    const exists = await fs.promises
      .access(filePath)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Attachment file not found on disk' });
    }

    res.setHeader('Content-Type', media.mime_type ?? 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(media.filename)}"`,
    );

    const readStream = fs.createReadStream(filePath);
    readStream.on('error', (err) => {
      this.logger.error(`Stream error for media ${mediaId}: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'STREAM_ERROR', message: 'Failed to read attachment' });
      }
    });
    readStream.pipe(res);
  }

  // =========================================================
  // F8: Stream thumbnail
  // GET /tickets/:id/media/:mediaId/thumbnail  [anon — role-filtered]
  // =========================================================

  /**
   * Streams thumbnail bytes for image attachments.
   * Returns 404 for non-image MIME types (TechArch §6.7 — thumbnails only for image/*).
   * TechArch §7.7: thumbnail path {MEDIA_STORAGE_PATH}/{ticket_id}/thumbnails/{internalFilename}
   */
  async streamThumbnail(
    ticketId: number,
    mediaId: number,
    user: { id: number; role: string | null } | null,
    res: Response,
  ): Promise<void> {
    // Verify ticket visibility
    await this.ticketsService.findOne(ticketId, user);

    const media = await this.repo.findOne(mediaId);
    if (!media || media.ticket_id !== ticketId) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Attachment not found' });
    }

    // 404 for non-image MIME types (TechArch §6.7)
    if (!media.mime_type || !IMAGE_MIME_TYPES.includes(media.mime_type)) {
      throw new NotFoundException({
        error: 'NOT_FOUND',
        message: 'No thumbnail available for this attachment type',
      });
    }

    const thumbnailPath = path.join(
      this.storagePath,
      String(ticketId),
      'thumbnails',
      media.internalFilename,
    );

    const exists = await fs.promises
      .access(thumbnailPath)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      // Thumbnail may not yet be generated (async); return 404
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Thumbnail not yet available' });
    }

    res.setHeader('Content-Type', media.mime_type);
    const readStream = fs.createReadStream(thumbnailPath);
    readStream.on('error', (err) => {
      this.logger.error(`Thumbnail stream error for media ${mediaId}: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'STREAM_ERROR', message: 'Failed to read thumbnail' });
      }
    });
    readStream.pipe(res);
  }

  // =========================================================
  // F8: Delete attachment
  // DELETE /tickets/:id/media/:mediaId  [staff-only]
  // =========================================================

  /**
   * Staff-only delete: removes file + thumbnail from disk, deletes media row,
   * appends 'update' action to ticketHistory (PRD §F8, story US-8.4).
   *
   * RBAC: controller enforces staff check before this method is called.
   * File deletion errors are logged but do NOT prevent the DB row deletion.
   */
  async delete(
    ticketId: number,
    mediaId: number,
    userId: number,
  ): Promise<void> {
    // Verify ticket exists (staff can see all tickets)
    await this.ticketsService.findOne(ticketId, { id: userId, role: 'staff' });

    const media = await this.repo.findOne(mediaId);
    if (!media || media.ticket_id !== ticketId) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Attachment not found' });
    }

    // Delete file from disk (TechArch §7.7)
    const filePath = path.join(this.storagePath, String(ticketId), media.internalFilename);
    await fs.promises.unlink(filePath).catch((err) => {
      this.logger.warn(`Could not delete file ${filePath}: ${err?.message}`);
    });

    // Delete thumbnail from disk (TechArch §7.7)
    const thumbnailPath = path.join(
      this.storagePath,
      String(ticketId),
      'thumbnails',
      media.internalFilename,
    );
    await fs.promises.unlink(thumbnailPath).catch(() => {
      // Thumbnail may not exist for non-image files — silently ignore
    });

    // Delete media DB row
    await this.repo.delete(mediaId);

    // Append 'update' action to ticketHistory (US-8.4 — staff removes file from case record)
    await this.appendMediaHistory(ticketId, 'update', userId, null);
  }

  // =========================================================
  // Private helpers
  // =========================================================

  /**
   * Generates a thumbnail using sharp and writes it to
   * {MEDIA_STORAGE_PATH}/{ticket_id}/thumbnails/{internalFilename}.
   * Called fire-and-forget — failures are caught by the caller.
   */
  private async generateThumbnail(
    ticketId: number,
    internalFilename: string,
    buffer: Buffer,
  ): Promise<void> {
    // Dynamic import of sharp to avoid top-level failure if sharp is not installed
    const sharp = (await import('sharp')).default;

    const thumbnailDir = path.join(this.storagePath, String(ticketId), 'thumbnails');
    await fs.promises.mkdir(thumbnailDir, { recursive: true });

    const thumbnailPath = path.join(thumbnailDir, internalFilename);

    await sharp(buffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
  }

  /**
   * Appends a ticketHistory row for a media action.
   * Uses PrismaService directly to avoid circular dependency with TicketsService
   * (TicketsService already provides findOne for visibility; appendHistory is a write).
   *
   * action names: 'upload_media' (upload), 'update' (delete) — both seeded as system actions.
   */
  private async appendMediaHistory(
    ticketId: number,
    actionName: 'upload_media' | 'update',
    userId: number,
    mediaId: number | null,
  ): Promise<void> {
    const action = await this.prisma.actions.findFirst({
      where: { name: actionName, type: 'system' },
    });
    if (!action) {
      this.logger.warn(
        `System action '${actionName}' not found in actions table — skipping history entry`,
      );
      return;
    }

    await this.prisma.ticketHistory.create({
      data: {
        ticket_id: ticketId,
        action_id: action.id,
        enteredByPerson_id: userId,
        enteredDate: new Date(),
        actionDate: new Date(),
        notes: null,
        data: mediaId !== null ? JSON.stringify({ mediaId }) : null,
        sentNotifications: null,
      } as any,
    });

    // Update ticket lastModified (every state change updates lastModified per TechArch §2.1)
    await this.prisma.tickets.update({
      where: { id: ticketId },
      data: { lastModified: new Date() },
    });
  }
}
