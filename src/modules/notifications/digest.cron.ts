import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { GelfLoggerService } from '../../common/logger/gelf-logger.service';

@Injectable()
export class DigestCron {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly logger: GelfLoggerService,
  ) {}

  /**
   * Digest cron — runs daily at 06:00.
   * Finds all bookmarks with type='digest', groups by person_id,
   * and sends one digest email per subscribed person.
   * Per FRD §F07: digest sends are logged to sentNotifications.
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async sendDigests(): Promise<void> {
    this.logger.log('DigestCron: starting digest run');

    try {
      // Find all digest-subscribed users via bookmarks.type='digest' (FRD §F07 digest spec)
      const digestBookmarks = await this.prisma.bookmarks.findMany({
        where: { type: 'digest' },
        include: {
          person: {
            include: {
              peopleEmails: { where: { usedForNotifications: true } },
            },
          },
        },
        orderBy: { person_id: 'asc' },
      });

      if (digestBookmarks.length === 0) {
        this.logger.log('DigestCron: no digest subscriptions found');
        return;
      }

      // Group by person_id — one digest email per person
      const byPerson = new Map<number, { person: any; bookmarks: any[] }>();
      for (const bm of digestBookmarks) {
        const entry = byPerson.get(bm.person_id);
        if (entry) {
          entry.bookmarks.push(bm);
        } else {
          byPerson.set(bm.person_id, { person: bm.person, bookmarks: [bm] });
        }
      }

      let sentCount = 0;
      for (const [personId, { person, bookmarks: bms }] of byPerson) {
        const recipientEmails: string[] =
          person?.peopleEmails?.map((e: any) => e.email as string) ?? [];

        if (recipientEmails.length === 0) {
          this.logger.warn(`DigestCron: no notification emails for person_id=${personId}`);
          continue;
        }

        // Build digest email body from subscribed bookmark names/URIs
        const bookmarkLines = bms
          .map((bm: any) => `- ${bm.name ?? bm.requestUri}`)
          .join('\n');

        const subject = 'Your uReport digest';
        const body = [
          'Your saved search digest for today:',
          '',
          bookmarkLines,
          '',
          'Log in to view the latest results for each saved search.',
        ].join('\n');

        for (const email of recipientEmails) {
          try {
            await this.notificationsService.transporter.sendMail({
              from: this.notificationsService.config.get<string>(
                'SMTP_FROM',
                'noreply@ureport.local',
              ),
              to: email,
              subject,
              text: body,
            });
            sentCount++;
            this.logger.log(`DigestCron: digest sent person_id=${personId} recipient=${email}`);
          } catch (err: unknown) {
            this.logger.error(
              `DigestCron: failed to send digest person_id=${personId} recipient=${email}`,
              err instanceof Error ? err.message : String(err),
            );
            // FRD §F07.4: digest failure does not abort the cron run
          }
        }
      }

      this.logger.log(`DigestCron: digest run complete, ${sentCount} emails sent`);
    } catch (err: unknown) {
      this.logger.error(
        'DigestCron: cron run failed',
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
