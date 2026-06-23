## Epic 15: Sub-Status & Action Reference Data (F15)

Sub-statuses and actions are configurable reference data that drive ticket workflow and email notifications. Seed data and admin interfaces for `substatus`, `actions`, `issueTypes`, and `contactMethods` must be preserved.

---

### US-15.1: Manage Sub-Statuses for Ticket Closure
**As a** Department Supervisor, **I want to** create and configure sub-statuses for ticket closure, **so that** case workers can accurately document whether a ticket was Resolved, Duplicate, or Bogus.

**Acceptance Criteria:**
- [ ] Seed sub-statuses are present after migration: Resolved (closed), Duplicate (closed), Bogus (closed)
- [ ] `name` is required (max 25 chars); `description` is required (max 128 chars)
- [ ] `status` must be `open` or `closed`; `isDefault` defaults to `false`
- [ ] At most one sub-status per `status` value may have `isDefault = true`
- [ ] Sub-statuses referenced by `tickets.substatus_id` or `categories.autoCloseSubstatus_id` cannot be deleted
- [ ] Staff-only access; returns HTTP 403 for non-staff

**Priority:** P2 | **Feature Ref:** F15

---

### US-15.2: Manage Custom Department Action Types
**As a** Department Supervisor, **I want to** create custom department-level action types with email templates, **so that** my department can log domain-specific workflow steps on tickets.

**Acceptance Criteria:**
- [ ] 10 system actions are seeded (open, assignment, closed, changeCategory, changeLocation, response, duplicate, update, comment, upload_media) with `type = 'system'`
- [ ] System actions cannot be deleted or have their `name` changed
- [ ] `template` and `replyEmail` on system actions can be updated by staff
- [ ] Department actions (`type = 'department'`) can be created, updated, and deleted by staff
- [ ] Actions referenced by `ticketHistory.action_id`, `department_actions`, or `category_action_responses` cannot be deleted
- [ ] Department action `name` is max 25 chars; `description` max 128 chars

**Priority:** P2 | **Feature Ref:** F15

---

### US-15.3: Manage Issue Types
**As a** Department Supervisor, **I want to** manage issue type reference data (Comment, Complaint, Question, etc.), **so that** tickets are classified consistently across all departments.

**Acceptance Criteria:**
- [ ] Seed issue types are present: Comment, Complaint, Question, Report, Request, Violation (6 rows)
- [ ] `name` is required (max 128 chars)
- [ ] Issue types referenced by `tickets.issueType_id` cannot be deleted
- [ ] Staff-only CRUD access

**Priority:** P2 | **Feature Ref:** F15

---

### US-15.4: Manage Contact Methods
**As a** Department Supervisor, **I want to** manage contact method reference data (Email, Phone, Web Form, Other), **so that** ticket submissions are correctly attributed to the channel used.

**Acceptance Criteria:**
- [ ] Seed contact methods are present: Email, Phone, Web Form, Other (4 rows)
- [ ] `name` is required (max 128 chars)
- [ ] Contact methods referenced by `tickets.contactMethod_id`, `tickets.responseMethod_id`, or `clients.contactMethod_id` cannot be deleted
- [ ] Staff-only CRUD access

**Priority:** P2 | **Feature Ref:** F15

---
