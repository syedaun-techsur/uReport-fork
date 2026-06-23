---
phase: wave-5-integration
plan: 13
type: execute
wave: 5
depends_on: [4]
files_modified:
  - src/modules/notifications/notifications.module.ts
  - src/modules/notifications/notifications.service.ts
  - src/modules/notifications/notifications.types.ts
  - src/modules/notifications/digest.cron.ts
  - src/modules/tickets/tickets.service.ts
  - src/app.module.ts
autonomous: true

features:
  implements: ["F7"]
  depends_on: ["F1", "F15", "F6", "F2"]
  enables: ["F12"]

must_haves:
  truths:
    - "When a ticket is opened (action='open'), an email is sent to every peopleEmails row for reportedByPerson where usedForNotifications=true"
    - "When a ticket is assigned (action='assignment'), an email is sent to reporter (usedForNotifications=true) and to the assignedPerson's notification emails"
    - "When a ticket is closed (action='closed'), an email is sent to reporter and assignee notification emails"
    - "When action='response', an email is sent to the actionPerson_id's notification emails"
    - "When action='comment', an email is sent to reporter notification emails"
    - "When action='duplicate', an email is sent to the child ticket's reporter notification emails"
    - "Template resolution cascade: category_action_responses.template takes precedence over actions.template (FRD §F07.2)"
    - "Reply-To header set from: category_action_responses.replyEmail → categories.notificationReplyEmail → actions.replyEmail (first non-null wins)"
    - "Every email send is logged back to ticketHistory.sentNotifications as JSON array of sent addresses"
    - "Digest cron: bookmarks rows with type='digest' define subscribed users; one digest email sent per subscribed user per cron run"
    - "Nodemailer SMTP transport configured via SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env vars"
    - "Notification send failure is caught, logged to GELF (GelfLoggerService), and does not throw — ticket operation succeeds regardless"
  artifacts:
    - path: "src/modules/notifications/notifications.module.ts"
      provides: "NotificationsModule exporting NotificationsService"
      exports: ["NotificationsModule", "NotificationsService"]
    - path: "src/modules/notifications/notifications.service.ts"
      provides: "NotificationsService.send(action, ticket, actorId) — full trigger matrix, template resolution, Nodemailer transport"
      exports: ["NotificationsService"]
    - path: "src/modules/notifications/digest.cron.ts"
      provides: "DigestCron — @Cron-scheduled digest email sender using bookmarks type='digest'"
      exports: ["DigestCron"]
    - path: "src/modules/tickets/tickets.service.ts"
      provides: "TicketsService updated — calls NotificationsService.send() after every state-changing action"
      exports: ["TicketsService"]
  key_links:
    - from: "src/modules/notifications/notifications.service.ts"
      to: "prisma/schema.prisma"
      via: "PrismaService — queries peopleEmails, categories, category_action_responses, actions, ticketHistory"
      pattern: "prisma\\.peopleEmails\\.findMany|prisma\\.category_action_responses\\.findFirst"
    - from: "src/modules/notifications/notifications.service.ts"
      to: "nodemailer"
      via: "Nodemailer createTransport SMTP config; send triggered in send()"
      pattern: "createTransport|sendMail"
    - from: "src/modules/tickets/tickets.service.ts"
      to: "src/modules/notifications/notifications.service.ts"
      via: "NotificationsService.send() called after every state-changing write (create, assign, close, duplicate, response, comment)"
      pattern: "notificationsService\\.send"
    - from: "src/modules/notifications/digest.cron.ts"
      to: "prisma/schema.prisma"
      via: "PrismaService — queries bookmarks where type='digest' to find subscribed users"
      pattern: "prisma\\.bookmarks\\.findMany"
    - from: "src/app.module.ts"
      to: "src/modules/notifications/notifications.module.ts"
      via: "AppModule imports"
      pattern: "NotificationsModule"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "prisma/schema.prisma"
      exports: ["tickets", "ticketHistory", "categories", "category_action_responses", "actions", "people", "peopleEmails", "bookmarks"]
      verify: "grep -n 'model tickets' prisma/schema.prisma && grep -n 'model ticketHistory' prisma/schema.prisma && grep -n 'model categories' prisma/schema.prisma && grep -n 'model bookmarks' prisma/schema.prisma && echo CONTRACT_OK"
    - from_plan: "09"
      artifact: "src/modules/tickets/tickets.module.ts"
      exports: ["TicketsModule", "TicketsService"]
      verify: "grep -n 'export class TicketsModule' src/modules/tickets/tickets.module.ts && grep -n 'TicketsService' src/modules/tickets/tickets.module.ts && echo CONTRACT_OK"
    - from_plan: "10"
      artifact: "src/modules/tickets/tickets.service.ts"
      exports: ["TicketsService"]
      verify: "grep -n 'export class TicketsService' src/modules/tickets/tickets.service.ts && grep -n 'async close\|async addComment\|async addResponse\|async duplicate' src/modules/tickets/tickets.service.ts && echo CONTRACT_OK"
    - from_plan: "10"
      artifact: "src/modules/tickets/tickets.repository.ts"
      exports: ["TicketsRepository"]
      verify: "grep -n 'export class TicketsRepository' src/modules/tickets/tickets.repository.ts && grep -n 'appendHistory' src/modules/tickets/tickets.repository.ts && echo CONTRACT_OK"
    - from_plan: "05"
      artifact: "src/common/logger/gelf-logger.service.ts"
      exports: ["GelfLoggerService"]
      verify: "grep -n 'export class GelfLoggerService' src/common/logger/gelf-logger.service.ts && echo CONTRACT_OK"
  provides:
    - artifact: "src/modules/notifications/notifications.module.ts"
      exports: ["NotificationsModule", "NotificationsService"]
      shape: |
        @Module({
          providers: [NotificationsService, DigestCron],
          exports: [NotificationsService],
        })
        export class NotificationsModule {}
      verify: "grep -n 'export class NotificationsModule' src/modules/notifications/notifications.module.ts && grep -n 'NotificationsService' src/modules/notifications/notifications.module.ts && echo CONTRACT_OK"
    - artifact: "src/modules/notifications/notifications.service.ts"
      exports: ["NotificationsService"]
      shape: |
        @Injectable()
        export class NotificationsService {
          send(actionName: NotificationAction, ticketId: number, actorId: number | null): Promise<void>
          resolveTemplate(categoryId: number, actionId: number): Promise<{ template: string | null; replyEmail: string | null }>
          resolveRecipients(actionName: NotificationAction, ticket: any): Promise<string[]>
        }
      verify: "grep -n 'export class NotificationsService' src/modules/notifications/notifications.service.ts && grep -n 'async send' src/modules/notifications/notifications.service.ts && echo CONTRACT_OK"

---

<objective>
Implement `NotificationsModule` — the Nodemailer-based email notification system that fires on every ticket lifecycle event. This plan wires the full F7 trigger matrix into `TicketsService`, implements template resolution with the category_action_responses → actions.template cascade, sets Reply-To from the three-tier override chain, logs every send to `ticketHistory.sentNotifications`, and provides a scheduled digest cron for bookmarks-subscribed users.

Purpose: F7 is the primary trust-building feature for both citizens (Priya, JTBD-02.2) and case workers (Dana, JTBD-03.2). The legacy PHPMailer triggers were unreliable — the re-platform must log every send atomically with the ticketHistory write and suppress SMTP failures gracefully so a mail-server outage never blocks ticket operations.

Output:
- `src/modules/notifications/notifications.types.ts` — `NotificationAction` union type and `SendResult` interface
- `src/modules/notifications/notifications.service.ts` — `NotificationsService` with `send()`, `resolveTemplate()`, `resolveRecipients()`, Nodemailer SMTP transport, `sentNotifications` log-back, GELF failure suppression
- `src/modules/notifications/digest.cron.ts` — `DigestCron` with `@Cron('0 6 * * *')` digest dispatch using `bookmarks.type='digest'` subscriptions
- `src/modules/notifications/notifications.module.ts` — NestJS module, imports PrismaModule, exports `NotificationsService`
- `src/modules/tickets/tickets.service.ts` — updated to inject and call `NotificationsService.send()` after every state-changing action
- `src/app.module.ts` — updated to import `NotificationsModule`
</objective>

<feature_dependencies>
Implements: F7: Email Notifications — Nodemailer SMTP transport; trigger matrix (open, assignment, closed, response, comment, duplicate); template resolution cascade (category_action_responses.template → actions.template); Reply-To resolution (category_action_responses.replyEmail → categories.notificationReplyEmail → actions.replyEmail); recipient resolution using peopleEmails.usedForNotifications flag; sentNotifications field logged to ticketHistory after every send; digest subscription via bookmarks.type='digest'; GELF failure suppression so email outages never break ticket writes
Depends on: F1: TicketsModule — TicketsService (state-changing methods that call send()); ticketHistory.appendHistory() to log sentNotifications; F15: actions reference table (action names, templates, replyEmail); F6: PostgreSQL schema (categories, category_action_responses, peopleEmails, ticketHistory, bookmarks DDL via Prisma); F2: RBAC (notifications are triggered server-side, not user-facing reads, but ticket visibility is RBAC-gated upstream)
Enables: F12: BookmarksModule — digest cron uses bookmarks.type='digest' rows; the bookmarks table contract is established here; F12 adds the user-facing CRUD endpoints for bookmark management
</feature_dependencies>

<execution_context>
@.planning/express/modernize-legacy-php-ureport-open311-geo/WAVE-SCHEDULE.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@project_specs/PRD-uReport.md (F7 section)
@project_specs/FRD-uReport.md (F07 section — trigger matrix, template resolution, sentNotifications, digest)
@project_specs/TechArch-uReport.md (§2.1 NotificationsModule, §3.2 DDL category_action_responses + ticketHistory + bookmarks)
@.planning/express/modernize-legacy-php-ureport-open311-geo/09-PLAN.md
@.planning/express/modernize-legacy-php-ureport-open311-geo/10-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: NotificationsService — Nodemailer transport, trigger matrix, template resolution, sentNotifications log-back</name>
  <files>
    src/modules/notifications/notifications.types.ts
    src/modules/notifications/notifications.service.ts
  </files>
  <action>
Implement `NotificationsService` — the core email dispatch service that the `TicketsService` calls after every state-changing write.

## Directory structure

```
src/modules/notifications/
├── notifications.module.ts     ← Task 2
├── notifications.service.ts    ← Task 1
├── notifications.types.ts      ← Task 1
└── digest.cron.ts              ← Task 2
```

---

### src/modules/notifications/notifications.types.ts

```typescript
/**
 * F7 notification trigger actions — the six lifecycle events that fire emails.
 * Source: PRD §F7 Capabilities + FRD §F07.1 trigger matrix.
 * Matches the seeded actions.name values in actions table (mysql.sql lines 100–109).
 */
export type NotificationAction =
  | 'open'
  | 'assignment'
  | 'closed'
  | 'response'
  | 'comment'
  | 'duplicate';

/**
 * Outcome of a single email send attempt.
 * Logged as JSON in ticketHistory.sentNotifications.
 */
export interface NotificationSendResult {
  /** Recipient email address */
  email: string;
  /** Whether the SMTP send succeeded */
  sent: boolean;
  /** ISO 8601 timestamp of the send attempt */
  timestamp: string;
  /** Error message if sent=false */
  error?: string;
}
```

---

### src/modules/notifications/notifications.service.ts

Full NotificationsService per FRD §F07.

**Template resolution cascade (FRD §F07.2):**
1. Look up `category_action_responses` row for `(category_id, action_id)` — if `template` is non-null, use it
2. Fall back to `actions.template` from the system action row

**Reply-To resolution (FRD §F07.3):**
1. `category_action_responses.replyEmail` (if non-null for this category+action)
2. `categories.notificationReplyEmail` (if non-null)
3. `actions.replyEmail` (if non-null)
4. Otherwise no Reply-To header

**Recipient resolution per trigger (FRD §F07.1):**
- `open`: reporter's `usedForNotifications=true` emails
- `assignment`: reporter + assignedPerson `usedForNotifications=true` emails
- `closed`: reporter + assignedPerson `usedForNotifications=true` emails
- `response`: `actionPerson_id` person's `usedForNotifications=true` emails (defaults to reporter)
- `comment`: reporter's `usedForNotifications=true` emails
- `duplicate`: child ticket's reporter `usedForNotifications=true` emails

**GELF failure suppression (FRD §F07.4):**
- All SMTP errors are caught; `GelfLoggerService.error()` is called with `_ticket_id` and `_action`
- `send()` always resolves (never throws) so ticket writes are unaffected by mail-server outages
- `sentNotifications` is still written to ticketHistory even on partial failures (failed sends are recorded with `sent: false`)

**Variable substitution (FRD §F07.2):**
- `{actionPerson}` → firstname+lastname of the actionPerson
- `{enteredByPerson}` → firstname+lastname of enteredByPerson
- `{reportedByPerson_id}` → firstname+lastname of the reporter
- `{original:category_id}` → category name before change (from ticketHistory.data)
- `{updated:category_id}` → category name after change
- `{duplicate:ticket_id}` → the duplicate ticket ID from ticketHistory.data
- Ticket fields: `{ticket_id}`, `{status}`, `{description}`, `{location}`

```typescript
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
  private transporter: Transporter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly logger: GelfLoggerService,
  ) {
    // Nodemailer SMTP transport — configured via environment variables (FRD §F07.5)
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'localhost'),
      port: this.config.get<number>('SMTP_PORT', 25),
      secure: this.config.get<boolean>('SMTP_SECURE', false),
      auth: this.config.get<string>('SMTP_USER')
        ? {
            user: this.config.get<string>('SMTP_USER'),
            pass: this.config.get<string>('SMTP_PASS'),
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
      this.logger.error('NotificationsService.send() failed', {
        _ticket_id: ticketId,
        _action: actionName,
        _error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ==========================================================================
  // Internal implementation
  // ==========================================================================

  private async _doSend(
    actionName: NotificationAction,
    ticketId: number,
    actorId: number | null,
    historyId?: number,
  ): Promise<void> {
    // 1. Load ticket with all relations needed for recipient resolution and template substitution
    const ticket = await this.prisma.tickets.findUnique({
      where: { id: ticketId },
      include: {
        categories: true,
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
      this.logger.warn('NotificationsService: ticket not found', {
        _ticket_id: ticketId,
        _action: actionName,
      });
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
      this.logger.warn('NotificationsService: action not seeded', {
        _ticket_id: ticketId,
        _action: actionName,
      });
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
        // Child ticket reporter — load if needed
        // The child ticket is the ticket with parent_id = ticketId
        // In the duplicate trigger, ticketId IS the child ticket (ticket being duplicated)
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
      ticket?.categories?.notificationReplyEmail ??
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

      this.logger.log('Email notification sent', {
        _ticket_id: ticketId,
        _action: actionName,
        _recipient: email,
      });

      return { email, sent: true, timestamp };
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : String(err);

      this.logger.error('Email notification failed', {
        _ticket_id: ticketId,
        _action: actionName,
        _recipient: email,
        _error: errorMsg,
      });

      // FRD §F07.4: failure recorded but not propagated
      return { email, sent: false, timestamp, error: errorMsg };
    }
  }
}
```
  </action>
  <verify>
```bash
grep -n 'export class NotificationsService' src/modules/notifications/notifications.service.ts && echo SERVICE_OK
grep -n 'async send' src/modules/notifications/notifications.service.ts && echo SEND_METHOD_OK
grep -n 'resolveTemplate\|resolveRecipients' src/modules/notifications/notifications.service.ts && echo RESOLUTION_METHODS_OK
grep -n 'category_action_responses' src/modules/notifications/notifications.service.ts && echo CAR_TEMPLATE_OK
grep -n 'notificationReplyEmail' src/modules/notifications/notifications.service.ts && echo REPLY_EMAIL_CASCADE_OK
grep -n 'usedForNotifications' src/modules/notifications/notifications.service.ts && echo NOTIF_FLAG_OK
grep -n 'sentNotifications' src/modules/notifications/notifications.service.ts && echo SENT_NOTIF_LOG_OK
grep -n 'sendMail\|createTransport' src/modules/notifications/notifications.service.ts && echo NODEMAILER_OK
grep -n 'SMTP_HOST\|SMTP_PORT' src/modules/notifications/notifications.service.ts && echo SMTP_CONFIG_OK
grep -n 'NotificationSendResult\|NotificationAction' src/modules/notifications/notifications.types.ts && echo TYPES_OK
npx tsc --noEmit 2>&1 | grep -E 'notifications|Notifications' | head -20 && echo "TSC_NOTIF_OK"
```
  </verify>
  <done>
- `notifications.types.ts` exports `NotificationAction` union type ('open'|'assignment'|'closed'|'response'|'comment'|'duplicate') and `NotificationSendResult` interface
- `NotificationsService` has `send(actionName, ticketId, actorId, historyId?)` that never throws — SMTP errors logged to GELF and swallowed (FRD §F07.4)
- `resolveRecipients()` implements the full trigger matrix: open→reporter; assignment→reporter+assignee; closed→reporter+assignee; response→actionPerson; comment→reporter; duplicate→child reporter (all using `usedForNotifications=true` emails)
- `resolveTemplate()` applies cascade: `category_action_responses.template` → `actions.template`; and Reply-To cascade: `category_action_responses.replyEmail` → `categories.notificationReplyEmail` → `actions.replyEmail`
- `substituteVariables()` replaces all FRD §F07.2 template tokens including `{actionPerson}`, `{reportedByPerson_id}`, `{original:category_id}`, `{duplicate:ticket_id}`, etc.
- After each send batch, `sentNotifications` is written back to the ticketHistory row as a JSON array of `NotificationSendResult` objects (FRD §F07.4)
- Nodemailer SMTP transport configured from `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` env vars
- TypeScript compiles with zero errors for notification service files
  </done>
</task>

<task type="auto">
  <name>Task 2: DigestCron, NotificationsModule, TicketsService hook wiring, AppModule update</name>
  <files>
    src/modules/notifications/digest.cron.ts
    src/modules/notifications/notifications.module.ts
    src/modules/tickets/tickets.service.ts
    src/app.module.ts
  </files>
  <action>
Wire the NotificationsModule together: build `DigestCron` for F7 digest subscriptions (bookmarks.type='digest'), the NestJS module, then update `TicketsService` to inject and call `NotificationsService.send()` after every state-changing action, and register the module in `AppModule`.

---

### src/modules/notifications/digest.cron.ts

Digest subscription mechanism per FRD §F07: users subscribe by having a `bookmarks` row with `type='digest'`. The cron sends one digest email per subscribed user per run.

**Schema reference (mysql.sql lines 242–249):**
```sql
CREATE TABLE bookmarks (
  id          INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
  person_id   INT UNSIGNED NOT NULL,
  type        VARCHAR(128) NOT NULL DEFAULT 'search',
  name        VARCHAR(128),
  requestUri  VARCHAR(1024) NOT NULL,
  CONSTRAINT FK_bookmarks_person_id FOREIGN KEY (person_id) REFERENCES people(id)
);
```
Digest subscriptions are bookmarks rows where `type='digest'`.

```typescript
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
          people: {
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
          byPerson.set(bm.person_id, { person: bm.people, bookmarks: [bm] });
        }
      }

      let sentCount = 0;
      for (const [personId, { person, bookmarks: bms }] of byPerson) {
        const recipientEmails: string[] =
          person?.peopleEmails?.map((e: any) => e.email as string) ?? [];

        if (recipientEmails.length === 0) {
          this.logger.warn('DigestCron: no notification emails for person', {
            _person_id: personId,
          });
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
            await (this.notificationsService as any).transporter.sendMail({
              from:
                (this.notificationsService as any).config.get<string>(
                  'SMTP_FROM',
                  'noreply@ureport.local',
                ),
              to: email,
              subject,
              text: body,
            });
            sentCount++;
            this.logger.log('DigestCron: digest sent', {
              _person_id: personId,
              _recipient: email,
            });
          } catch (err: unknown) {
            this.logger.error('DigestCron: failed to send digest', {
              _person_id: personId,
              _recipient: email,
              _error: err instanceof Error ? err.message : String(err),
            });
            // FRD §F07.4: digest failure does not abort the cron run
          }
        }
      }

      this.logger.log(`DigestCron: digest run complete, ${sentCount} emails sent`);
    } catch (err: unknown) {
      this.logger.error('DigestCron: cron run failed', {
        _error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
```

---

### src/modules/notifications/notifications.module.ts

Import `ScheduleModule` for `@Cron` support (requires `@nestjs/schedule` — add to package.json if not present).
Import `ConfigModule` for `ConfigService` injection in `NotificationsService`.

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { DigestCron } from './digest.cron';

@Module({
  imports: [
    ScheduleModule.forRoot(),
  ],
  providers: [NotificationsService, DigestCron],
  /**
   * Export NotificationsService so TicketsModule (imported into AppModule)
   * can inject it into TicketsService after wiring.
   * Wave 5 plan 13 adds TicketsModule dependency on NotificationsModule.
   */
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

---

### src/modules/tickets/tickets.service.ts — add NotificationsService wiring

Update `TicketsService` to inject `NotificationsService` (optional injection pattern to avoid circular dep issues; notifications send fire-and-forget).

**Key change:** After each state-changing method (`create`, `assign`, `close`, `duplicate`, `addComment`, `addResponse`, `reopen`), call `this.notificationsService?.send(actionName, ticketId, actorId, historyRowId)`.

The `historyRowId` is the `id` of the `ticketHistory` row just appended — so the sentNotifications can be written back. Capture the return value of `appendHistory()` calls.

**Merge with existing TicketsService from plans 09+10.** The file already contains the full lifecycle logic. This task ONLY adds:
1. `@Optional() @Inject(NotificationsService)` injection in the constructor
2. `notificationsService.send()` calls after each state-changing `appendHistory()` call

The complete updated constructor and all send hook points:

```typescript
// At top of file — add import
import { Optional, Inject } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import type { NotificationAction } from '../notifications/notifications.types';

// In the @Injectable() class:
// Add to constructor parameters (optional injection — prevents circular if module order differs):
// @Optional() private readonly notificationsService: NotificationsService | null,

// After each appendHistory() call in the service methods, add the corresponding send hook:

// create() — after appendHistory for 'open' action:
//   const openHistory = await this.repo.appendHistory({...});
//   void this.notificationsService?.send('open', ticket.id, actorId, openHistory.id);

// assign() — after appendHistory for 'assignment' action:
//   const assignHistory = await this.repo.appendHistory({...});
//   void this.notificationsService?.send('assignment', ticketId, actorId, assignHistory.id);

// close() — after appendHistory for 'closed' action:
//   const closedHistory = await this.repo.appendHistory({...});
//   void this.notificationsService?.send('closed', ticketId, actorId, closedHistory.id);

// duplicate() — after appendHistory for 'duplicate' action on PARENT:
//   const dupHistory = await this.repo.appendHistory({...});
//   void this.notificationsService?.send('duplicate', ticketId, actorId, dupHistory.id);

// addComment() — after appendHistory for 'comment' action:
//   const commentHistory = await this.repo.appendHistory({...});
//   void this.notificationsService?.send('comment', ticketId, actorId, commentHistory.id);

// addResponse() — after appendHistory for 'response' action:
//   const responseHistory = await this.repo.appendHistory({...});
//   void this.notificationsService?.send('response', ticketId, actorId, responseHistory.id);
```

**Write the complete updated `tickets.service.ts`** incorporating all existing methods from plans 09+10 PLUS the notification hooks. The file must NOT regress any existing functionality. The key structural changes are:

1. Add `NotificationsService` optional import and injection
2. Change every `await this.repo.appendHistory(...)` call in state-changing methods to capture its return value
3. After each capture, add: `void this.notificationsService?.send('ACTION_NAME', ticketId, actorId, history.id);`
4. Use `void` (fire-and-forget) — notification failure must never block the ticket operation

The complete updated TicketsService must preserve the full implementation from plan 10 and add the six send hooks. Key methods to update (patch-level changes only):

```typescript
// IMPORTANT: Only the constructor and post-appendHistory calls change.
// All business logic, validation, error throwing remains identical.

// Constructor change (add Optional import from @nestjs/common):
constructor(
  private readonly repo: TicketsRepository,
  @Optional() private readonly notificationsService: NotificationsService | null = null,
) {}

// In create() — update the appendHistory call to capture id and fire notification:
const openHistory = await this.repo.appendHistory({
  ticket_id: ticket.id,
  action_id: openAction.id,
  enteredByPerson_id: actorId,
  enteredDate: now,
  actionDate: now,
  data: null,
  notes: null,
  sentNotifications: null,
} as Prisma.ticketHistoryCreateInput);
void this.notificationsService?.send('open', ticket.id, actorId, openHistory.id);

// In close() — after appendHistory:
const closedHistory = await this.repo.appendHistory({...existing fields...} as Prisma.ticketHistoryCreateInput);
void this.notificationsService?.send('closed', ticketId, actorId, closedHistory.id);

// In duplicate() — after the 'duplicate' appendHistory on PARENT:
const dupHistory = await this.repo.appendHistory({
  ticket_id: dto.parent_id,  // PARENT ticket
  action_id: duplicateAction.id,
  ...
} as Prisma.ticketHistoryCreateInput);
void this.notificationsService?.send('duplicate', ticketId, actorId, dupHistory.id);

// In addComment() — after appendHistory:
const commentHistory = await this.repo.appendHistory({...} as Prisma.ticketHistoryCreateInput);
void this.notificationsService?.send('comment', ticketId, actorId, commentHistory.id);

// In addResponse() — after appendHistory:
const responseHistory = await this.repo.appendHistory({...} as Prisma.ticketHistoryCreateInput);
void this.notificationsService?.send('response', ticketId, actorId, responseHistory.id);
```

Write the full updated `tickets.service.ts` with all methods from plans 09+10 and the six notification hooks added. Preserve all validation logic, error handling, and all method signatures exactly.

---

### src/app.module.ts — add NotificationsModule

Import `NotificationsModule` into the root module. Merge with the accumulated state from plans 03–11.
Also add `TicketsModule` to depend on `NotificationsModule` by importing `NotificationsModule` inside `TicketsModule` — OR (simpler, to avoid circular) import both at AppModule level and rely on the `@Optional()` injection in `TicketsService`.

The `AppModule` update adds `NotificationsModule` to the imports array. The `ScheduleModule.forRoot()` inside `NotificationsModule` ensures crons are enabled. Also install `nodemailer` and `@nestjs/schedule` if not already in package.json:

```bash
npm install --save nodemailer @nestjs/schedule
npm install --save-dev @types/nodemailer
```

AppModule imports array addition:
```typescript
import { NotificationsModule } from './modules/notifications/notifications.module';
// Add to @Module imports: [...existingImports, NotificationsModule]
```

For `TicketsModule` to receive the injected `NotificationsService`, `TicketsModule` must import `NotificationsModule`. Update `tickets.module.ts`:

```typescript
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],   // ← add this
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository],
  exports: [TicketsService],
})
export class TicketsModule {}
```

This avoids the `@Optional()` null-check need; `NotificationsService` will always be injected. Simplify the constructor to use standard injection:

```typescript
constructor(
  private readonly repo: TicketsRepository,
  private readonly notificationsService: NotificationsService,
) {}
```
  </action>
  <verify>
```bash
grep -n 'export class NotificationsModule' src/modules/notifications/notifications.module.ts && echo MODULE_OK
grep -n 'export class DigestCron' src/modules/notifications/digest.cron.ts && echo DIGEST_CRON_OK
grep -n "type.*'digest'" src/modules/notifications/digest.cron.ts && echo DIGEST_TYPE_OK
grep -n '@Cron\|EVERY_DAY' src/modules/notifications/digest.cron.ts && echo CRON_DECORATOR_OK
grep -n 'notificationsService' src/modules/tickets/tickets.service.ts && echo HOOK_INJECTION_OK
grep -n "send('open'\|send('closed'\|send('assignment'\|send('response'\|send('comment'\|send('duplicate'" src/modules/tickets/tickets.service.ts && echo SEND_HOOKS_OK
grep -n 'NotificationsModule' src/modules/tickets/tickets.module.ts && echo TICKETS_IMPORTS_NOTIF_OK
grep -n 'NotificationsModule' src/app.module.ts && echo APP_MODULE_NOTIF_OK
npx tsc --noEmit 2>&1 | grep -E 'notifications|Notifications|tickets' | grep -v 'node_modules' | head -20 && echo "TSC_WAVE5B_OK"
```
  </verify>
  <done>
- `DigestCron` has `@Cron(CronExpression.EVERY_DAY_AT_6AM)` on `sendDigests()`; queries `bookmarks` where `type='digest'`; sends one digest email per subscribed person; digest failures logged to GELF and do not abort the cron run (FRD §F07.4)
- `NotificationsModule` imports `ScheduleModule.forRoot()` and exports `NotificationsService`; `DigestCron` is a provider
- `TicketsService` imports and injects `NotificationsService`; calls `notificationsService.send()` after every `appendHistory()` in: `create` ('open'), `assign` ('assignment'), `close` ('closed'), `duplicate` ('duplicate'), `addComment` ('comment'), `addResponse` ('response')
- All `notificationsService.send()` calls are `void` (fire-and-forget) — SMTP failure never blocks ticket writes (FRD §F07.4)
- `TicketsModule` imports `NotificationsModule` so `NotificationsService` is injected into `TicketsService`
- `AppModule` imports `NotificationsModule`
- `nodemailer` and `@nestjs/schedule` installed via npm
- TypeScript compiles with zero errors across notifications and tickets modules
  </done>
</task>

</tasks>

<verification>
```bash
# Verify NotificationsModule structure
grep -n 'export class NotificationsModule' src/modules/notifications/notifications.module.ts && echo MODULE_EXPORT_OK
grep -n 'export class NotificationsService' src/modules/notifications/notifications.service.ts && echo SERVICE_EXPORT_OK
grep -n 'export class DigestCron' src/modules/notifications/digest.cron.ts && echo CRON_EXPORT_OK

# Verify F7 trigger matrix coverage in NotificationsService
grep -n "'open'\|'assignment'\|'closed'\|'response'\|'comment'\|'duplicate'" src/modules/notifications/notifications.service.ts | wc -l && echo TRIGGER_MATRIX_OK

# Verify template resolution cascade
grep -n 'category_action_responses' src/modules/notifications/notifications.service.ts && echo CAR_CASCADE_OK
grep -n 'actions\.template\|action\.template\|actions\.replyEmail\|action\.replyEmail' src/modules/notifications/notifications.service.ts && echo ACTION_TEMPLATE_OK
grep -n 'notificationReplyEmail' src/modules/notifications/notifications.service.ts && echo CATEGORY_REPLY_EMAIL_OK

# Verify sentNotifications log-back
grep -n 'sentNotifications' src/modules/notifications/notifications.service.ts && echo SENT_NOTIF_OK

# Verify usedForNotifications flag used in recipient resolution
grep -n 'usedForNotifications' src/modules/notifications/notifications.service.ts && echo USED_FOR_NOTIF_OK

# Verify digest subscription uses bookmarks type='digest'
grep -n "type.*'digest'\|'digest'.*type" src/modules/notifications/digest.cron.ts && echo DIGEST_TYPE_OK

# Verify TicketsService wired with NotificationsService
grep -n 'notificationsService\.send' src/modules/tickets/tickets.service.ts | wc -l && echo HOOKS_COUNT_OK
grep -n 'NotificationsModule' src/modules/tickets/tickets.module.ts && echo TICKETS_MODULE_IMPORTS_NOTIF_OK

# Verify AppModule import
grep -n 'NotificationsModule' src/app.module.ts && echo APP_IMPORTS_NOTIF_OK

# TypeScript compile check
npx tsc --noEmit 2>&1 | grep -v 'node_modules' | grep -E 'error TS' | head -10 && echo "TSC_ERROR_CHECK"
echo "--- All notification module verifications complete ---"
```
</verification>

<success_criteria>
- `NotificationsModule` exists at `src/modules/notifications/notifications.module.ts`, imports `ScheduleModule.forRoot()`, exports `NotificationsService`
- `NotificationsService.send()` covers all six F7 triggers (open, assignment, closed, response, comment, duplicate)
- Template cascade: `category_action_responses.template` wins over `actions.template`
- Reply-To cascade: `category_action_responses.replyEmail` → `categories.notificationReplyEmail` → `actions.replyEmail`
- Recipients resolved via `peopleEmails.usedForNotifications=true` per the FRD §F07.1 trigger matrix
- Every email send attempt (success or failure) is written to `ticketHistory.sentNotifications` as a JSON array
- SMTP failures never propagate — caught, logged via `GelfLoggerService`, and the ticket operation proceeds
- `DigestCron` queries `bookmarks.type='digest'` and sends one digest email per subscribed user per daily cron run
- `TicketsService` calls `notificationsService.send()` after every state-changing `appendHistory()` call (six hooks total)
- `TicketsModule` imports `NotificationsModule`; `AppModule` imports `NotificationsModule`
- `nodemailer` and `@nestjs/schedule` present in package.json
- TypeScript compiles with zero errors across the notifications and tickets modules
</success_criteria>

<output>
After completion, create `.planning/express/modernize-legacy-php-ureport-open311-geo/13-SUMMARY.md` with:
- Files created/modified
- Key decisions (template cascade, Reply-To cascade, fire-and-forget send pattern, digest via bookmarks.type='digest')
- Integration contracts fulfilled (NotificationsService.send callable by TicketsService; sentNotifications field populated)
- Any deviations from spec with rationale
</output>
