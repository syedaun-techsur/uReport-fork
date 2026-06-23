## Epic 2: Role-Based Access Control (RBAC) (F2)

uReport enforces three permission levels — `anonymous`, `public`, and `staff` — on every route, category, and data field. The CASL-based NestJS guard layer must reproduce the Laminas ACL rule set exactly, with no privilege creep or regression.

---

### US-2.1: Anonymous Access to Public Categories and Tickets
**As an** Anonymous Citizen, **I want to** view publicly visible service categories and tickets without logging in, **so that** I can browse open issues in my area without creating an account.

**Acceptance Criteria:**
- [ ] Anonymous callers can view categories where `displayPermissionLevel = 'anonymous'`
- [ ] Anonymous callers can view tickets in categories where `displayPermissionLevel = 'anonymous'`
- [ ] Anonymous callers can submit tickets to categories where `postingPermissionLevel = 'anonymous'`
- [ ] Anonymous callers can perform token lookup (`GET /open311/v2/tokens/:token`) without authentication
- [ ] Anonymous callers cannot see PII fields: `reportedByPerson_id`, `enteredByPerson_id`, `assignedPerson_id`, personal contact details
- [ ] Anonymous callers receive HTTP 401 for any endpoint requiring authentication
- [ ] Anonymous callers receive HTTP 403 for any admin endpoint

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.2: Authenticated Resident Access (Public Role)
**As an** Authenticated Resident, **I want to** access categories and tickets at the `public` permission level after logging in, **so that** I can submit and track requests for services that require authentication.

**Acceptance Criteria:**
- [ ] Public callers can view categories where `displayPermissionLevel IN ('public', 'anonymous')`
- [ ] Public callers can submit tickets to categories where `postingPermissionLevel IN ('public', 'anonymous')`
- [ ] Public callers can view their own ticket history (`reportedByPerson_id = currentUser.id`)
- [ ] Public callers can manage their own bookmarks (`person_id = currentUser.id`) but not others'
- [ ] Public callers can view and edit their own `people` record but not others'
- [ ] Public callers receive HTTP 403 when attempting staff-only actions (assign, close, comment, etc.)
- [ ] Public callers cannot see other users' PII

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.3: Staff Full Access
**As a** Case Worker, **I want to** have full read/write access to all tickets, categories, and people regardless of permission level, **so that** I can perform my daily case management duties without restriction.

**Acceptance Criteria:**
- [ ] Staff callers can view all tickets and categories regardless of `displayPermissionLevel`
- [ ] Staff callers can view all PII fields on tickets and people records
- [ ] Staff callers can create, update, close, assign, duplicate, comment, and respond on any ticket
- [ ] Staff callers can manage categories, departments, people, and API clients
- [ ] Staff access is granted only when `people.role = 'staff'`; `role = null` is treated as `public`
- [ ] Every allow/deny decision matches the legacy Laminas ACL behavior, verified by integration tests

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.4: Category-Level Permission Filtering
**As a** Department Supervisor, **I want to** set `displayPermissionLevel` and `postingPermissionLevel` on each category, **so that** I can control which categories are visible and postable by anonymous, public, and staff users.

**Acceptance Criteria:**
- [ ] `displayPermissionLevel` and `postingPermissionLevel` each accept values `staff`, `public`, or `anonymous`
- [ ] Display filter is applied on all list and detail reads for tickets and categories
- [ ] Posting filter is applied on ticket creation
- [ ] A ticket is only visible if its category is visible to the caller's role (transitive filter)
- [ ] Changing a category's permission level takes effect immediately for subsequent requests

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.5: PII Field Masking for Non-Staff Callers
**As an** Authenticated Resident, **I want** my personal contact details to be protected from other users, **so that** my privacy is maintained when viewing public ticket feeds.

**Acceptance Criteria:**
- [ ] `tickets.reportedByPerson_id` and associated person object are omitted/nulled for non-staff callers
- [ ] `tickets.enteredByPerson_id` and associated person object are omitted/nulled for non-staff callers
- [ ] `ticketHistory.enteredByPerson_id` is omitted for non-staff callers
- [ ] `ticketHistory.actionPerson_id` is omitted for non-staff callers
- [ ] Contact details (email, phone, address) on a `people` record are only visible to staff or the person themselves
- [ ] PII masking is applied consistently in all five response formats (JSON, XML, CSV, TXT, HTML)

**Priority:** P0 | **Feature Ref:** F2

---
