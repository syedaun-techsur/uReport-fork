## Epic 1: Ticket Lifecycle Management (F1)

Tickets are the core entity of uReport. The full lifecycle — creation, assignment, updates, closure, duplication, comments, responses, and history — must be preserved with identical business rules, audit trail entries, and notification triggers.

---

### US-1.1: Submit a Service Request via Web Form
**As an** Anonymous Citizen, **I want to** submit a new service request using the web form without creating an account, **so that** I can quickly report a city service issue and receive a confirmation.

**Acceptance Criteria:**
- [ ] Ticket creation requires `category_id` and at least one location field (lat/lon or address string)
- [ ] Submitting to a category with `postingPermissionLevel = 'anonymous'` succeeds without authentication
- [ ] `status` is set to `open` and `enteredDate` is set to the current UTC timestamp on creation
- [ ] A `ticketHistory` row with `action = 'open'` is appended immediately after creation
- [ ] Confirmation page or response includes the new ticket ID
- [ ] `customFields` JSON is validated on submission; returns HTTP 400 if malformed
- [ ] Coordinates are validated to [-90, 90] and [-180, 180] ranges

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.2: View Own Ticket History
**As an** Authenticated Resident, **I want to** view all service requests I have submitted, **so that** I can track progress on my reported issues without keeping manual records.

**Acceptance Criteria:**
- [ ] Ticket history page is accessible within 2 clicks of login
- [ ] Only tickets where `reportedByPerson_id = currentUser.id` are shown to the authenticated resident
- [ ] Tickets are filterable by status (open/closed) and sortable by date
- [ ] Each ticket in the list shows ID, category, status, entered date, and last-modified date
- [ ] PII fields of other reporters are not exposed

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.3: Assign a Ticket to a Case Worker
**As a** Case Worker, **I want to** assign an open ticket to myself or a colleague within the department, **so that** responsibility for resolution is clearly recorded and the assignee is notified.

**Acceptance Criteria:**
- [ ] Staff-only action; returns HTTP 403 for non-staff callers
- [ ] `assignedPerson_id` must reference a person who belongs to the ticket's category's department; returns HTTP 400 otherwise
- [ ] `tickets.assignedPerson_id` is updated and `lastModified` is set to `NOW()`
- [ ] A `ticketHistory` row with `action = 'assignment'` is appended, recording `actionPerson_id = assignedPerson_id`
- [ ] `assignment` email notification is triggered to the assigned person and reporter (F7)

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.4: Update Ticket Fields (Description, Category, Location)
**As a** Case Worker, **I want to** update a ticket's description, category, or location, **so that** the record accurately reflects new information from the field.

**Acceptance Criteria:**
- [ ] Staff-only action; returns HTTP 403 for non-staff callers
- [ ] Category change logs a `changeCategory` action with `data = {original, updated}` in `ticketHistory`
- [ ] Location change logs a `changeLocation` action with `data = {original, updated}` in `ticketHistory`
- [ ] Other field changes log an `update` action in `ticketHistory`
- [ ] `tickets.lastModified` is updated on every write
- [ ] Ticket is re-indexed in Solr after any update (F5)
- [ ] Geo-clusters are reassigned if lat/lon changes (F9)

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.5: Close a Ticket with a Sub-Status
**As a** Case Worker, **I want to** close a ticket and select the appropriate sub-status (Resolved, Duplicate, or Bogus), **so that** the resolution reason is documented and the reporter is notified.

**Acceptance Criteria:**
- [ ] Staff-only action; returns HTTP 403 for non-staff callers
- [ ] `substatus_id` is required and must reference a sub-status with `status = 'closed'`; returns HTTP 400 otherwise
- [ ] `tickets.status` is set to `'closed'`, `closedDate = NOW()`, `lastModified = NOW()`
- [ ] A `ticketHistory` row with `action = 'closed'` is appended
- [ ] `closed` email notification is triggered to reporter and assigned person (F7)
- [ ] Ticket is re-indexed in Solr after closure (F5)
- [ ] Attempting to close an already-closed ticket returns HTTP 409

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.6: Mark a Ticket as Duplicate
**As a** Case Worker, **I want to** link a duplicate ticket to its canonical parent, **so that** redundant reports are consolidated and the duplicate reporter is notified.

**Acceptance Criteria:**
- [ ] Staff-only action; returns HTTP 403 for non-staff callers
- [ ] `parent_id` must reference a different, existing ticket; self-reference returns HTTP 400
- [ ] Child ticket's `parent_id` is set and child is closed with sub-status `Duplicate`
- [ ] A `duplicate` action is appended to the **parent** ticket's `ticketHistory` with `data = {duplicate: child_ticket_id}`
- [ ] `duplicate` email notification is triggered to the child ticket's reporter (F7)
- [ ] Attempting to set `parent_id` on a ticket that already has one returns HTTP 400

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.7: Add a Staff Comment to a Ticket
**As a** Case Worker, **I want to** add an internal comment to a ticket, **so that** my colleagues have context about actions taken without notifying the reporter.

**Acceptance Criteria:**
- [ ] Staff-only action; returns HTTP 403 for non-staff callers
- [ ] `notes` field is required and must be non-empty; returns HTTP 400 if blank
- [ ] A `ticketHistory` row with `action = 'comment'` and the comment text in `notes` is appended
- [ ] `tickets.lastModified` is updated
- [ ] Comment is not visible to anonymous or public callers (PII masking)

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.8: Add a Response to a Reporter
**As a** Case Worker, **I want to** log a response action on a ticket when I contact the reporter, **so that** there is an audit trail of communications and the reporter receives an email.

**Acceptance Criteria:**
- [ ] Staff-only action; returns HTTP 403 for non-staff callers
- [ ] A `ticketHistory` row with `action = 'response'` is appended; `actionPerson_id` defaults to `reportedByPerson_id`
- [ ] `tickets.lastModified` is updated
- [ ] `response` email notification is triggered to the reporter (F7)

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.9: Re-open a Closed Ticket
**As a** Case Worker, **I want to** re-open a ticket that was closed prematurely, **so that** work can continue on an issue that was not actually resolved.

**Acceptance Criteria:**
- [ ] Staff-only action; returns HTTP 403 for non-staff callers
- [ ] `tickets.status` is set to `'open'`, `closedDate` is cleared, `substatus_id` is cleared
- [ ] `tickets.lastModified` is updated
- [ ] A `ticketHistory` row with `action = 'update'` and a re-open note is appended
- [ ] Ticket is re-indexed in Solr (F5)
- [ ] Attempting to re-open an already-open ticket returns HTTP 409

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.10: View Full Ticket History / Audit Trail
**As a** Case Worker, **I want to** view the complete audit trail for a ticket, **so that** I can reconstruct what happened, who made each change, and when.

**Acceptance Criteria:**
- [ ] `ticketHistory` entries are returned ordered by `enteredDate ASC`
- [ ] Each entry includes `id`, `action.name`, `enteredDate`, `actionDate`, `notes`, `data`, `sentNotifications`
- [ ] `enteredByPerson` and `actionPerson` objects (with name) are included for staff callers only
- [ ] Anonymous and public callers receive history with PII fields omitted
- [ ] History is available in all five response formats (HTML/JSON/XML/CSV/TXT) via the serialization interceptor (F3)

**Priority:** P0 | **Feature Ref:** F1

---
