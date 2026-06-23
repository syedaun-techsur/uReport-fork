import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';
import { GelfLoggerService } from '../../common/logger/gelf-logger.service';
import type {
  NotificationAction,
  NotificationSendResult,
} from './notifications.types';

@Injectable()
export class NotificationsService {
  readonly transporter: Transporter;
  readonly config: ConfigService;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
    private readonly logger: GelfLoggerService,
  ) {
    this.config = config;
    // Nodemailer SMTP transport — configured via environment variables (FRD §F07.5)
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST', 'localhost'),
      port: config.get<number>('SMTP_PORT', 25),
      secure: config.get<boolean>('SMTP_SECURE', false),
      auth: config.get<string>('SMTP_USER')
        ? {
            user: config.get<string>('SMTP_USER'),
            pass: config.get<string>('SMTP_PASS'),
          }
        : undefined,
    });
  }

  // ==========================================================================
  // Public API: send() — called by TicketsService after every state change
  // ==========================================================================

  /**
   * Fire-and-forget email notification for a ticket lifecycle event.
   * Never throws — SMTP errors are suppressed and logged to GELF (FRD §F07.4).
   *
   * @param actionName - The trigger event name (FRD §F07.1 trigger matrix)
   * @param ticketId   - The ticket that triggered the event
   * @param actorId    - The person who performed the action (null = anonymous/system)
   * @param historyId  - Optional ticketHistory row id to write sentNotifications back to
   */
  async send(
    actionName: NotificationAction,
    ticketId: number,
    actorId: number | null,
    historyId?: number,
  ): Promise<void> {
    try {
      await this._doSend(actionName, ticketId, actorId, historyId);
    } catch (err: unknown) {
      // FRD §F07.4: failure must not propagate — log to GELF and continue
      this.logger.error('NotificationsService.send() failed', String(err instanceof Error ? err.message : String(err)));
    }
  }

  // ==========================================================================
  // Internal implementation
  // ==========================================================================

  private async _doSend(
    actionName: NotificationAction,
    ticketId: number,
    _actorId: number | null,
    historyId?: number,
  ): Promise<void> {
    // 1. Load ticket with all relations needed for recipient resolution and template substitution
    const ticket = await this.prisma.tickets.findUnique({
      where: { id: ticketId },
      include: {
        category: true,
        reportedByPerson: {
          include: {
            peopleEmails: { where: { usedForNotifications: true } },
          },
        },
        assignedPerson: {
          include: {
            peopleEmails: { where: { usedForNotifications: true } },
          },
        },
      },
    });

    if (!ticket) {
      this.logger.warn('NotificationsService: ticket not found');
      return;
    }

    // 2. Load latest ticketHistory entry for this ticket (to get actionPerson_id)
    const latestHistory = historyId
      ? await this.prisma.ticketHistory.findUnique({
          where: { id: historyId },
          include: {
            actionPerson: {
              include: {
                peopleEmails: { where: { usedForNotifications: true } },
              },
            },
          },
        })
      : null;

    // 3. Resolve notification recipients per FRD §F07.1 trigger matrix
    const recipients = await this.resolveRecipients(
      actionName,
      ticket,
      latestHistory,
    );

    if (recipients.length === 0) {
      // No usedForNotifications emails found — nothing to send
      return;
    }

    // 4. Load action record for template resolution
    const action = await this.prisma.actions.findFirst({
      where: { name: actionName },
    });

    if (!action) {
      this.logger.warn(`NotificationsService: action '${actionName}' not seeded`);
      return;
    }

    // 5. Resolve template (FRD §F07.2 cascade)
    const { template, replyEmail } = await this.resolveTemplate(
      ticket.category_id!,
      action.id,
      ticket,
    );

    const emailBody = template
      ? this.substituteVariables(template, ticket, latestHistory)
      : this.buildDefaultBody(actionName, ticket);

    const emailSubject = `Ticket #${ticket.id} update: ${actionName}`;

    // 6. Send to each recipient and collect results
    const results: NotificationSendResult[] = [];

    for (const recipientEmail of recipients) {
      const result = await this.sendToRecipient(
        recipientEmail,
        emailSubject,
        emailBody,
        replyEmail,
        ticketId,
        actionName,
      );
      results.push(result);
    }

    // 7. Write sentNotifications back to ticketHistory (FRD §F07.4)
    if (historyId && results.length > 0) {
      await this.prisma.ticketHistory.update({
        where: { id: historyId },
        data: { sentNotifications: JSON.stringify(results) },
      });
    }
  }

  // ==========================================================================
  // Recipient resolution per F07.1 trigger matrix
  // ==========================================================================

  /**
   * Resolve notification recipient email addresses for the given action.
   * Uses peopleEmails.usedForNotifications=true flag (FRD §F07.1).
   *
   * Trigger matrix (FRD §F07.1):
   * - open:       reporter usedForNotifications emails
   * - assignment: reporter + assignedPerson usedForNotifications emails
   * - closed:     reporter + assignedPerson usedForNotifications emails
   * - response:   actionPerson usedForNotifications emails (defaults to reporter)
   * - comment:    reporter usedForNotifications emails
   * - duplicate:  child ticket reporter usedForNotifications emails
   */
  async resolveRecipients(
    actionName: NotificationAction,
    ticket: any,
    latestHistory?: any | null,
  ): Promise<string[]> {
    const emails = new Set<string>();

    const addPersonEmails = (person: any): void => {
      if (person?.peopleEmails) {
        for (const e of person.peopleEmails) {
          if (e.usedForNotifications && e.email) {
            emails.add(e.email as string);
          }
        }
      }
    };

    switch (actionName) {
      case 'open':
        addPersonEmails(ticket.reportedByPerson);
        break;

      case 'assignment':
        addPersonEmails(ticket.reportedByPerson);
        addPersonEmails(ticket.assignedPerson);
        break;

      case 'closed':
        addPersonEmails(ticket.reportedByPerson);
        addPersonEmails(ticket.assignedPerson);
        break;

      case 'response': {
        // actionPerson from latest history entry, fallback to reporter
        const actionPerson =
          latestHistory?.actionPerson ?? ticket.reportedByPerson;
        addPersonEmails(actionPerson);
        break;
      }

      case 'comment':
        addPersonEmails(ticket.reportedByPerson);
        break;

      case 'duplicate': {
        // Child ticket reporter — the child ticket is the ticket being marked as duplicate
        // ticketId IS the child ticket (ticket being duplicated)
        addPersonEmails(ticket.reportedByPerson);
        break;
      }
    }

    return Array.from(emails);
  }

  // ==========================================================================
  // Template resolution cascade (FRD §F07.2)
  // ==========================================================================

  /**
   * Template resolution cascade per FRD §F07.2:
   * 1. category_action_responses.template (per-category override)
   * 2. actions.template (system default)
   *
   * Reply-To resolution (FRD §F07.3):
   * 1. category_action_responses.replyEmail
   * 2. categories.notificationReplyEmail
   * 3. actions.replyEmail
   */
  async resolveTemplate(
    categoryId: number,
    actionId: number,
    ticket: any,
  ): Promise<{ template: string | null; replyEmail: string | null }> {
    // Step 1: check category_action_responses for per-category override
    const catActionResponse = await this.prisma.category_action_responses.findFirst({
      where: { category_id: categoryId, action_id: actionId },
    });

    // Step 2: load action default template
    const action = await this.prisma.actions.findUnique({
      where: { id: actionId },
    });

    // Template: category override wins over action default (FRD §F07.2)
    const template =
      catActionResponse?.template ?? action?.template ?? null;

    // Reply-To: three-tier cascade (FRD §F07.3)
    const replyEmail =
      catActionResponse?.replyEmail ??
      ticket?.category?.notificationReplyEmail ??
      action?.replyEmail ??
      null;

    return { template, replyEmail };
  }

  // ==========================================================================
  // Variable substitution (FRD §F07.2)
  // ==========================================================================

  /**
   * Substitute template variables per FRD §F07.2 variable syntax.
   * Variables: {actionPerson}, {enteredByPerson}, {reportedByPerson_id},
   *            {ticket_id}, {status}, {description}, {location},
   *            {original:category_id}, {updated:category_id}, {duplicate:ticket_id}
   */
  private substituteVariables(
    template: string,
    ticket: any,
    history: any | null,
  ): string {
    let result = template;

    // Ticket-level fields
    result = result.replace(/{ticket_id}/g, String(ticket.id));
    result = result.replace(/{status}/g, ticket.status ?? '');
    result = result.replace(/{description}/g, ticket.description ?? '');
    result = result.replace(/{location}/g, ticket.location ?? '');

    // Person fields
    const fullName = (person: any): string => {
      if (!person) return '';
      return [person.firstname, person.lastname].filter(Boolean).join(' ');
    };

    result = result.replace(
      /{reportedByPerson_id}/g,
      fullName(ticket.reportedByPerson),
    );

    if (history) {
      result = result.replace(
        /{enteredByPerson}/g,
        fullName(history.enteredByPerson),
      );
      result = result.replace(
        /{actionPerson}/g,
        fullName(history.actionPerson),
      );

      // Data JSON substitutions (changeCategory, changeLocation, duplicate)
      if (history.data) {
        try {
          const data = JSON.parse(history.data as string);
          if (data.original !== undefined) {
            result = result.replace(
              /{original:category_id}/g,
              String(data.original),
            );
            result = result.replace(
              /{original:location}/g,
              String(data.original),
            );
          }
          if (data.updated !== undefined) {
            result = result.replace(
              /{updated:category_id}/g,
              String(data.updated),
            );
          }
          if (data.duplicate !== undefined) {
            result = result.replace(
              /{duplicate:ticket_id}/g,
              String(data.duplicate),
            );
          }
        } catch {
          // Non-JSON data field — skip substitution
        }
      }
    }

    return result;
  }

  /** Fallback email body when no template is configured */
  private buildDefaultBody(
    actionName: NotificationAction,
    ticket: any,
  ): string {
    return [
      `Ticket #${ticket.id} has been updated.`,
      `Action: ${actionName}`,
      `Status: ${ticket.status ?? 'unknown'}`,
      ticket.description ? `Description: ${ticket.description}` : '',
      ticket.location ? `Location: ${ticket.location}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  // ==========================================================================
  // Low-level SMTP send
  // ==========================================================================

  private async sendToRecipient(
    email: string,
    subject: string,
    body: string,
    replyTo: string | null,
    ticketId: number,
    actionName: NotificationAction,
  ): Promise<NotificationSendResult> {
    const timestamp = new Date().toISOString();
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'noreply@ureport.local'),
        to: email,
        subject,
        text: body,
        ...(replyTo ? { replyTo } : {}),
      });

      this.logger.log(
        `Email notification sent: ticket=${ticketId} action=${actionName} recipient=${email}`,
      );

      return { email, sent: true, timestamp };
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : String(err);

      this.logger.error(
        `Email notification failed: ticket=${ticketId} action=${actionName} recipient=${email}`,
        errorMsg,
      );

      // FRD §F07.4: failure recorded but not propagated
      return { email, sent: false, timestamp, error: errorMsg };
    }
  }
}
