---
phase: wave-5-integration
plan: 13
subsystem: notifications
tags: [f7, email-notifications, nodemailer, digest-cron, trigger-matrix, template-resolution]
dependency_graph:
  requires: [prisma/schema.prisma, src/modules/tickets/tickets.service.ts, src/common/logger/gelf-logger.service.ts]
  provides: [src/modules/notifications/notifications.module.ts, src/modules/notifications/notifications.service.ts, src/modules/notifications/digest.cron.ts]
  affects: [src/modules/tickets/tickets.service.ts, src/modules/tickets/tickets.module.ts, src/app.module.ts]
tech_stack:
  added: [nodemailer, @nestjs/schedule, @Cron]
  patterns: [fire-and-forget email, template cascade, reply-to cascade, GELF failure suppression]
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
    - prisma/schema.prisma
decisions:
  - Template cascade: category_action_responses.template wins over actions.template (FRD §F07.2)
  - Reply-To cascade: category_action_responses.replyEmail → categories.notificationReplyEmail → actions.replyEmail (FRD §F07.3)
  - Fire-and-forget via void — SMTP failure never blocks ticket operations (FRD §F07.4)
  - Digest subscriptions via bookmarks.type='digest' (FRD §F07 digest spec)
  - Added missing reportedByPerson Prisma relation (Rule 1 auto-fix)
  - GelfLoggerService log/warn/error calls adapted to actual method signatures (string context, not object)
metrics:
  completed_date: 2026-06-23
  tasks: 2
  files: 8
---

# Phase wave-5-integration Plan 13: NotificationsModule Summary

**One-liner:** Nodemailer-based email notification system with F7 trigger matrix, template cascade, Reply-To cascade, sentNotifications log-back, and daily digest cron via bookmarks.type='digest'.

## Objective

Implements F7 — the full email notification system that fires on every ticket lifecycle event. Wired into TicketsService with fire-and-forget pattern so SMTP failures never block ticket operations.

## Files Created / Modified

### Created
- **`src/modules/notifications/notifications.types.ts`** — `NotificationAction` union type ('open'|'assignment'|'closed'|'response'|'comment'|'duplicate') and `NotificationSendResult` interface
- **`src/modules/notifications/notifications.service.ts`** — `NotificationsService` with full F7 trigger matrix, Nodemailer SMTP transport, template/reply-to cascade, sentNotifications log-back, GELF failure suppression
- **`src/modules/notifications/digest.cron.ts`** — `DigestCron` with `@Cron(EVERY_DAY_AT_6AM)` querying `bookmarks.type='digest'`, sending one digest email per subscribed person
- **`src/modules/notifications/notifications.module.ts`** — NestJS module importing `ScheduleModule.forRoot()`, providing `NotificationsService` + `DigestCron`, exporting `NotificationsService`

### Modified
- **`src/modules/tickets/tickets.service.ts`** — Added `NotificationsService` optional injection + six `notify()` calls after each `appendHistory()` in: `create` ('open'), `assign` ('assignment'), `close` ('closed'), `duplicate` ('duplicate'), `comment` ('comment'), `respond` ('response')
- **`src/modules/tickets/tickets.module.ts`** — Added `NotificationsModule` to imports array
- **`src/app.module.ts`** — Added `NotificationsModule` import and to imports array
- **`prisma/schema.prisma`** — Added missing `reportedByPerson` relation on `tickets` model and `ticketsReportedBy` inverse on `people` model

## Integration Contracts Fulfilled

### Provides
- `NotificationsModule` exports `NotificationsService` for injection by `TicketsModule`
- `NotificationsService.send(actionName, ticketId, actorId, historyId?)` — fires email notifications, never throws, logs failures to GELF
- `sentNotifications` field populated in `ticketHistory` as JSON array of `NotificationSendResult` objects
- `DigestCron` runs daily at 06:00, queries `bookmarks.type='digest'`, sends one digest email per subscribed person

### Requires (verified)
- `prisma/schema.prisma` — tickets, ticketHistory, categories, category_action_responses, actions, people, peopleEmails, bookmarks models ✓
- `TicketsService` state-changing methods (create, assign, close, duplicate, comment, respond) ✓
- `GelfLoggerService` global provider via `@Global() GelfLoggerModule` ✓

## Key Decisions

### 1. Template Cascade (FRD §F07.2)
`category_action_responses.template` checked first — if non-null, wins. Falls back to `actions.template`. This per-category override allows administrators to customize email templates without touching the system defaults.

### 2. Reply-To Cascade (FRD §F07.3)
Three-tier override: `category_action_responses.replyEmail` → `categories.notificationReplyEmail` → `actions.replyEmail`. First non-null wins. No Reply-To header added if all null.

### 3. Fire-and-Forget Pattern (FRD §F07.4)
All `notificationsService.send()` calls in `TicketsService` use `void` (fire-and-forget). `send()` itself wraps all internal logic in try/catch, logging to GELF on failure. SMTP outages never block ticket writes.

### 4. Digest Subscriptions via bookmarks.type='digest'
The `DigestCron` uses `bookmarks` rows with `type='digest'` to find subscribed users. Groups by `person_id` to send exactly one digest email per person per day. Digest SMTP failures are caught per-email and do not abort subsequent sends.

### 5. GelfLoggerService Method Signature Adaptation
The plan's code used `{ _field: value }` object syntax for GELF logging. The actual `GelfLoggerService` uses `(message: string, trace?: string, context?: string)` signatures. All logger calls were adapted to pass context as formatted strings.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added missing `reportedByPerson` Prisma relation**
- **Found during:** Task 1 — TypeScript compilation error `Object literal may only specify known properties, but 'categories' does not exist in type 'ticketsInclude'`
- **Issue:** `tickets` model had `reportedByPerson_id` field but no corresponding Prisma relation. Also `categories` was used instead of `category` (relation name).
- **Fix:** Added `reportedByPerson people? @relation("TicketReportedBy", ...)` to `tickets` model and `ticketsReportedBy tickets[] @relation("TicketReportedBy")` inverse on `people` model. Fixed `categories` → `category` in include clause and `ticket?.categories?.notificationReplyEmail` → `ticket?.category?.notificationReplyEmail`.
- **Files modified:** `prisma/schema.prisma`, `src/modules/notifications/notifications.service.ts`
- **Commit:** 874c90a

**2. [Rule 1 - Bug] Fixed stray code block in tickets.service.ts**
- **Found during:** Task 2 — TypeScript compilation errors at lines 180-184 (orphan code outside a method)
- **Issue:** Previous plan executions had inserted Solr indexing code after the closing brace of `create()`, creating a dangling code block outside any class method
- **Fix:** Rewrote `tickets.service.ts` to fix the method structure, add `GelfLoggerService` injection for `this.logger`, add `SolrService` proper injection, and incorporate `NotificationsService` injection cleanly
- **Files modified:** `src/modules/tickets/tickets.service.ts`
- **Commit:** 874c90a (pre-existing fix included in prior plan commit)

**3. [Rule 2 - GelfLoggerService API adaptation] Adapted logger calls to match actual method signatures**
- The plan's code used `this.logger.error('msg', { _field: value })` object syntax. The actual `GelfLoggerService` method signature is `error(message: string, trace?: string, context?: string)`.
- All logger calls adapted to use string context: `this.logger.error('msg', err?.stack, 'context=value')`.

**Note on pre-existing commits:** Both Task 1 and Task 2 files were committed as part of a prior plan execution context (plan 12 docs commit `580a4fc` included digest.cron.ts, notifications.module.ts, tickets.module.ts). The working tree was clean when the commit was attempted. All artifacts are verified present and TypeScript compiles with zero errors.

## Self-Check

### Files Exist
- [x] `src/modules/notifications/notifications.types.ts`
- [x] `src/modules/notifications/notifications.service.ts`
- [x] `src/modules/notifications/digest.cron.ts`
- [x] `src/modules/notifications/notifications.module.ts`
- [x] `src/modules/tickets/tickets.service.ts` (updated with notification hooks)
- [x] `src/modules/tickets/tickets.module.ts` (imports NotificationsModule)
- [x] `src/app.module.ts` (imports NotificationsModule)

### Integration Verified
- [x] `NotificationsService.send()` — never throws, SMTP errors suppressed
- [x] All six F7 triggers wired in TicketsService: open, assignment, closed, duplicate, comment, response
- [x] Template cascade: category_action_responses → actions (FRD §F07.2)
- [x] Reply-To cascade: category_action_responses → categories → actions (FRD §F07.3)
- [x] `sentNotifications` written back to `ticketHistory` as JSON array (FRD §F07.4)
- [x] `DigestCron` queries `bookmarks.type='digest'` (FRD §F07 digest spec)
- [x] `@nestjs/schedule` imported via `ScheduleModule.forRoot()` in `NotificationsModule`
- [x] TypeScript compiles with zero errors (`npx tsc --noEmit` — no errors)

## Self-Check: PASSED
