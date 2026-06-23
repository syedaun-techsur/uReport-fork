## Epic 7: Email Notifications (F7)

uReport sends automated email notifications on ticket lifecycle events. PHPMailer is replaced by Nodemailer while preserving all email templates, trigger conditions, recipient resolution logic, and reply-email routing.

---

### US-7.1: Receive Email Notification When a Ticket is Opened
**As an** Anonymous Citizen, **I want to** receive an email confirmation when my service request is accepted, **so that** I know my report was received and can follow up if needed.

**Acceptance Criteria:**
- [ ] An `open` notification is sent to `reportedByPerson` if they have an email with `usedForNotifications = true`
- [ ] Template is resolved from `category_action_responses` for the `open` action; falls back to `actions.template`
- [ ] If no template is defined for this action, no email is sent
- [ ] `Reply-To` address is resolved from `categories.notificationReplyEmail` → `category_action_responses.replyEmail` → `actions.replyEmail`
- [ ] Email send is logged to `ticketHistory.sentNotifications`
- [ ] Email send failure is logged to GELF (F14) and does not fail the ticket creation

**Priority:** P1 | **Feature Ref:** F7

---

### US-7.2: Receive Email Notification When a Ticket is Assigned
**As an** Authenticated Resident, **I want to** receive an email when my ticket is assigned to a case worker, **so that** I know someone is actively working on my request.

**Acceptance Criteria:**
- [ ] An `assignment` notification is sent to both the assigned person and the reporter (each with `usedForNotifications = true` email)
- [ ] Template variable `{actionPerson}` resolves to the assigned person's full name
- [ ] Template variable `{enteredByPerson}` resolves to the staff member who made the assignment
- [ ] Email is sent per qualifying email address (not batched into one email per person)
- [ ] Email send is logged to `ticketHistory.sentNotifications`

**Priority:** P1 | **Feature Ref:** F7

---

### US-7.3: Receive Email Notification When a Ticket is Closed
**As an** Authenticated Resident, **I want to** receive an email when my ticket is resolved, **so that** I know the city has addressed my service request.

**Acceptance Criteria:**
- [ ] A `closed` notification is sent to both the reporter and the assigned person
- [ ] Template is resolved using the standard template resolution chain (F7 §Template Resolution)
- [ ] Unresolved template variables (null person, missing fields) are replaced with empty string
- [ ] Email send is logged to `ticketHistory.sentNotifications`

**Priority:** P1 | **Feature Ref:** F7

---

### US-7.4: Receive Email Notification for Response, Comment, and Duplicate Actions
**As an** Authenticated Resident, **I want to** receive an email when a case worker contacts me or marks my ticket as a duplicate, **so that** I am kept informed throughout the ticket lifecycle.

**Acceptance Criteria:**
- [ ] `response` action sends notification to the reporter
- [ ] `comment` action sends notification to the assigned person (internal note)
- [ ] `duplicate` action sends notification to the reporter of the child (duplicate) ticket
- [ ] All trigger/recipient mappings match the F7 trigger matrix exactly
- [ ] Emails for all action types are logged to `ticketHistory.sentNotifications`

**Priority:** P1 | **Feature Ref:** F7

---

### US-7.5: Configure Email Templates and Reply Addresses per Category
**As a** Department Supervisor, **I want to** set custom email templates and reply addresses for each category-action combination, **so that** notification emails reflect the specific department's branding and routing.

**Acceptance Criteria:**
- [ ] `category_action_responses` records can be created, updated, and deleted via the admin interface
- [ ] If a `category_action_responses` record exists for a category+action, its template overrides `actions.template`
- [ ] `notificationReplyEmail` on `categories` overrides reply-to for all actions in that category
- [ ] Template variable substitution supports all documented variables (`{actionPerson}`, `{reportedByPerson_id}`, `{original:category_id}`, etc.)
- [ ] SMTP connection is configured via env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `SMTP_FROM`

**Priority:** P1 | **Feature Ref:** F7

---

### US-7.6: Receive Digest Notification Email
**As an** Authenticated Resident, **I want to** receive a periodic digest email summarizing recent activity on my tickets, **so that** I stay informed without being overwhelmed by individual event emails.

**Acceptance Criteria:**
- [ ] A scheduled cron task (configured via `DIGEST_CRON` env var) collects ticket events since the last digest run
- [ ] Each subscribed user receives a single summary email listing all events
- [ ] Digest sends are logged to `ticketHistory.sentNotifications`
- [ ] Digest behavior matches the legacy `digestNotifications.php` cron equivalent

**Priority:** P1 | **Feature Ref:** F7

---
