---
phase: wave-5-integration
plan: 13
subsystem: notifications
tags: [notifications, email, nodemailer, smtp, digest, cron, nestjs-schedule, F7]
dependency_graph:
  requires: [prisma/schema.prisma, tickets.module, tickets.service, gelf-logger.service]
  provides: [NotificationsModule, NotificationsService, DigestCron]
  affects: [tickets.service, app.module, tickets.module]
tech_stack:
  added: [nodemailer, "@nestjs/schedule"]
  patterns: [fire-and-forget SMTP, template cascade, Reply-To cascade, bookmarks digest cron]
key_files:
  created:
    - src/modules/notifications/notifications.types.ts
    - src/modules/notifications/notifications.service.ts
    - src/modules/notifications/digest.cron.ts
    - src/modules/notifications/notifications.module.ts
  modified:
    - src/modules/tickets/tickets.service.ts
    - src/modules/tickets/tickets.module.ts
    - src/app.module.ts
decisions:
  - Template cascade (category_action_responses.template → actions.template) implemented per FRD §F07.2
  - Reply-To cascade (category_action_responses.replyEmail → categories.notificationReplyEmail → actions.replyEmail) per FRD §F07.3
  - Fire-and-forget send pattern (void + try/catch + GELF log) — SMTP failure never blocks ticket writes per FRD §F07.4
  - Digest subscriptions via bookmarks.type='digest' rows, grouped by person_id, one email per person per cron run
  - DigestCron accesses transporter/config via public readonly fields on NotificationsService (avoids code duplication)
  - GelfLoggerService.error/warn called with string context (not Record) — matches actual service signature
  - Prisma include uses `category` (not `categories`) for tickets.categories relation — corrected via tsc feedback
metrics:
  duration: ~25min
  completed: "2026-06-23"
  tasks_completed: 2
  files_changed: 7
---

# Phase wave-5-integration Plan 13: NotificationsModule Summary

**One-liner:** Nodemailer SMTP email notification system implementing the F7 trigger matrix (open/assignment/closed/response/comment/duplicate) with category_action_responses template cascade, three-tier Reply-To resolution, sentNotifications log-back, and bookmarks.type='digest' cron.

## Files Created

| File | Purpose |
|------|---------|
| `src/modules/notifications/notifications.types.ts` | `NotificationAction` union type ('open'\|'assignment'\|'closed'\|'response'\|'comment'\|'duplicate') and `NotificationSendResult` interface |
| `src/modules/notifications/notifications.service.ts` | Full `NotificationsService` — `send()` (never throws), `resolveRecipients()`, `resolveTemplate()`, `substituteVariables()`, Nodemailer SMTP transport |
| `src/modules/notifications/digest.cron.ts` | `DigestCron` with `@Cron(EVERY_DAY_AT_6AM)` — queries bookmarks.type='digest', sends one digest per subscribed person |
| `src/modules/notifications/notifications.module.ts` | NestJS module importing `ScheduleModule.forRoot()`, providing `[NotificationsService, DigestCron]`, exporting `NotificationsService` |

## Files Modified

| File | Change |
|------|--------|
| `src/modules/tickets/tickets.service.ts` | Added `NotificationsService` injection; added 6 `void notificationsService.send()` hooks after each `appendHistory()` call |
| `src/modules/tickets/tickets.module.ts` | Added `NotificationsModule` to imports array |
| `src/app.module.ts` | Added `NotificationsModule` to AppModule imports |

## Key Decisions

### 1. Template Cascade (FRD §F07.2)
`category_action_responses.template` takes precedence over `actions.template`. If both are null, a plain-text default body is built from ticket fields. Implemented in `resolveTemplate()`.

### 2. Reply-To Cascade (FRD §F07.3)
Three-tier cascade: `category_action_responses.replyEmail` → `categories.notificationReplyEmail` → `actions.replyEmail`. First non-null wins. Applied per `sendToRecipient()`.

### 3. Fire-and-Forget Send Pattern (FRD §F07.4)
Every `notificationsService.send()` call in `TicketsService` uses `void`. The `send()` method wraps `_doSend()` in try/catch and logs GELF errors without rethrowing. SMTP failures never block ticket writes.

### 4. sentNotifications Log-Back (FRD §F07.4)
After each send batch, results (including failures with `sent: false`) are serialized as JSON and written to `ticketHistory.sentNotifications` via `prisma.ticketHistory.update()`. Written even if some sends fail.

### 5. Digest via bookmarks.type='digest' (FRD §F07)
DigestCron reads `bookmarks` rows where `type='digest'`, groups by `person_id`, fetches `usedForNotifications=true` emails from the related `person.peopleEmails`, and sends one digest per person. Individual send failures are caught and logged without aborting the run.

### 6. Prisma Relation Name Correction (Deviation Rule 1 — Bug)
The plan spec used `categories` in the Prisma include, but the actual Prisma relation for `tickets.category` is named `category` (singular). TypeScript compile caught this and it was fixed immediately.

## Integration Contracts Fulfilled

- `NotificationsModule` exports `NotificationsService` — injectable into `TicketsModule`
- `TicketsService.create()` → `send('open', ticket.id, actorId, historyId)`
- `TicketsService.assign()` → `send('assignment', id, userId, historyId)`
- `TicketsService.close()` → `send('closed', ticketId, userId, historyId)`
- `TicketsService.duplicate()` → `send('duplicate', ticketId, userId, historyId)` (on child ticket)
- `TicketsService.addComment()` → `send('comment', ticketId, actorId, historyId)`
- `TicketsService.addResponse()` → `send('response', ticketId, actorId, historyId)`
- All six F7 trigger actions covered

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Prisma relation name: `categories` → `category`**
- **Found during:** Task 1, TypeScript compile
- **Issue:** Plan spec used `categories` in `prisma.tickets.findUnique` include — this is the table name, not the relation name. The actual Prisma relation is `category` (singular, as defined in `schema.prisma` relation field `category categories?`)
- **Fix:** Changed `include: { categories: true }` → `include: { category: true }` and `ticket?.categories?.notificationReplyEmail` → `ticket?.category?.notificationReplyEmail`
- **Files modified:** `src/modules/notifications/notifications.service.ts`
- **Commit:** Corrected inline before commit (no separate commit needed)

**2. [Rule 2 - Missing Critical] GelfLoggerService signature adaptation**
- **Found during:** Task 1
- **Issue:** Plan spec called `logger.error('msg', { _ticket_id: ..., _action: ... })` with an object as second arg, but `GelfLoggerService.error(message, trace?, context?)` accepts strings only
- **Fix:** Converted object context to string format (`logger.error('msg', String(err))`) for compatibility with the actual service signature
- **Files modified:** `src/modules/notifications/notifications.service.ts`, `src/modules/notifications/digest.cron.ts`

**3. [Rule 1 - Bug] Bookmarks relation is `person` not `people`**
- **Found during:** Task 2, referencing schema.prisma
- **Issue:** Plan spec's DigestCron used `bm.people` (table name) but the actual Prisma relation on `bookmarks` is named `person` (singular)
- **Fix:** Used `bm.person` and `include: { person: { ... } }` in the DigestCron query
- **Files modified:** `src/modules/notifications/digest.cron.ts`

## Self-Check

### Files Created
- [x] `src/modules/notifications/notifications.types.ts` ✓
- [x] `src/modules/notifications/notifications.service.ts` ✓
- [x] `src/modules/notifications/digest.cron.ts` ✓
- [x] `src/modules/notifications/notifications.module.ts` ✓

### Commits
- 5653c12: feat(wave-5-integration-13): add NotificationsService with F7 trigger matrix
- 1972c20: feat(wave-5-integration-13): wire NotificationsModule — DigestCron, TicketsService hooks, AppModule

### TypeScript
- Zero TS errors (`npx tsc --noEmit` clean)

## Self-Check: PASSED
