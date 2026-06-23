---

## F07: Email Notifications

**Description:** uReport sends automated email notifications on ticket lifecycle events. PHPMailer is replaced by Nodemailer while preserving all email templates, trigger conditions, recipient resolution logic, and reply-email routing. Every email send is logged to `ticketHistory.sentNotifications`.

**Terminology:**
- **Notification trigger:** The ticket action event that causes email(s) to be sent
- **Template:** The email body text with `{variable}` placeholder syntax
- **replyEmail:** The `Reply-To` address on the outgoing email
- **usedForNotifications:** Flag on `peopleEmails` rows — only emails with this flag receive notifications
- **category_action_responses:** Per-category email template override per action
- **Digest notification:** Batched notification email summarizing multiple events (cron-driven)

**Sub-features:**
- Trigger-based email sends on ticket open, assignment, close, response, comment, duplicate
- Recipient resolution from `peopleEmails.usedForNotifications`
- Template override resolution (`category_action_responses` → `actions.template` fallback)
- Reply-to address resolution (`categories.notificationReplyEmail` → `actions.replyEmail` fallback)
- Template variable substitution
- Email send logging to `ticketHistory.sentNotifications`
- Digest notification batch send (cron)

---

### F07.1 Trigger Matrix

| Ticket Action | Email Sent To | `actions.name` |
|--------------|--------------|----------------|
| Ticket opened | `reportedByPerson` (if email set) | `open` |
| Ticket assigned | Assigned person + reporter | `assignment` |
| Ticket closed | Reporter + assigned person | `closed` |
| Response added | Reporter | `response` |
| Comment added | Assigned person | `comment` |
| Marked duplicate | Reporter of child ticket | `duplicate` |

---

### F07.2 Template Resolution

For each notification trigger on ticket `T` with category `C` and action `A`:

1. Look up `category_action_responses` where `category_id = C.id AND action_id = A.id`.
2. If found and `template` is non-null → use `category_action_responses.template`.
3. Else use `actions.template`.
4. If template is still null → no email is sent for this action.

**Reply-to resolution:**
1. If `categories.notificationReplyEmail` is non-null → use it as `Reply-To`.
2. Else if `category_action_responses.replyEmail` is non-null → use it.
3. Else if `actions.replyEmail` is non-null → use it.
4. Else no `Reply-To` header.

---

### F07.3 Template Variable Substitution

Template strings use `{variable}` placeholder syntax. The following variables are substituted:

| Variable | Resolved Value |
|----------|---------------|
| `{actionPerson}` | Full name of `ticketHistory.actionPerson_id` |
| `{enteredByPerson}` | Full name of `ticketHistory.enteredByPerson_id` |
| `{reportedByPerson_id}` | Full name of `tickets.reportedByPerson_id` |
| `{original:category_id}` | Category name before change (`changeCategory` action) |
| `{updated:category_id}` | Category name after change (`changeCategory` action) |
| `{original:location}` | Location before change (`changeLocation` action) |
| `{updated:location}` | Location after change |
| `{duplicate:ticket_id}` | Duplicate ticket ID |

Unresolved variables (missing person, null values) are replaced with an empty string.

---

### F07.4 Recipient Resolution

Recipients for a notification are resolved from `peopleEmails` where `usedForNotifications = TRUE`:
- Load all `peopleEmails` rows for the target person.
- Filter to rows where `usedForNotifications = true`.
- If no such rows exist, no email is sent to that person.
- Each qualifying email address receives a separate email.

---

### F07.5 Email Send Process

1. Resolve template and `Reply-To` address (§7.2).
2. Resolve recipients (§7.4).
3. Substitute template variables (§7.3).
4. Build `nodemailer` message object:
   - `from`: `SMTP_FROM` env var
   - `to`: recipient email
   - `replyTo`: resolved reply-to (if any)
   - `subject`: `actions.description` with variables substituted
   - `text`: substituted template body
5. Send via Nodemailer transport.
6. On success: append email address(es) to `ticketHistory.sentNotifications` (comma-separated).
7. On failure: log error to GELF (see F14); do not retry automatically (re-send is a manual staff action).

---

### F07.6 Nodemailer Configuration

| Env Variable | Description |
|-------------|-------------|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP server port (default: 587) |
| `SMTP_USER` | SMTP authentication username |
| `SMTP_PASS` | SMTP authentication password |
| `SMTP_SECURE` | `true` for TLS (port 465); `false` for STARTTLS |
| `SMTP_FROM` | From address (e.g., `noreply@city.gov`) |

---

### F07.7 Digest Notifications

- A scheduled task (cron, configurable schedule via `DIGEST_CRON` env var) runs the digest batch.
- Collects ticket events since the last digest run for subscribed users.
- Sends a single summary email per user listing all events.
- Digest subscription is per-user (stored as a bookmark of type `digest` or a separate configuration — match legacy behavior).
- All digest sends logged to `ticketHistory.sentNotifications`.

---

**API Surface (this feature):** No dedicated email API endpoints. Email sends are side effects of ticket actions.

**Schema Surface (this feature):** reads `actions`, `category_action_responses`, `categories`, `people`, `peopleEmails`, `ticketHistory` — see `Y0-schema.md`.
