## Epic 11: People & API Client Management (F11)

Staff manage person records, contact details (emails, phones, addresses), API client credentials, and user roles. All person-management and client-management interfaces are reproduced with identical field sets and validation.

---

### US-11.1: Create and Edit a Person Record
**As a** Department Supervisor, **I want to** create and edit person records for citizens and staff, **so that** tickets can be correctly attributed and staff can access the system with the right role and department.

**Acceptance Criteria:**
- [ ] `username` must be unique across all people records; duplicate returns HTTP 409
- [ ] `department_id` must reference an existing department if provided
- [ ] `role` must be `null` (citizen) or `'staff'`
- [ ] People referenced by tickets, clients, or bookmarks cannot be deleted; returns HTTP 409
- [ ] Staff-only access; returns HTTP 403 for non-staff

**Priority:** P1 | **Feature Ref:** F11

---

### US-11.2: Manage Email Addresses for a Person
**As a** Department Supervisor, **I want to** add, update, and remove email addresses for a person, and flag which addresses receive notifications, **so that** ticket notifications reach the right inbox.

**Acceptance Criteria:**
- [ ] `POST /people/:personId/emails` adds a new email address with `label` and `usedForNotifications` flag
- [ ] `PUT /people/:personId/emails/:emailId` updates email or notification flag
- [ ] `DELETE /people/:personId/emails/:emailId` removes an email address
- [ ] `email` must be valid RFC 5322 format; invalid email returns HTTP 400
- [ ] `label` must be one of `Home`, `Work`, `Other`; `usedForNotifications` defaults to `false`
- [ ] Duplicate `email` for the same `person_id` returns HTTP 409

**Priority:** P1 | **Feature Ref:** F11

---

### US-11.3: Manage Phone and Address Records for a Person
**As a** Department Supervisor, **I want to** add and update phone numbers and mailing addresses for a person, **so that** all contact methods are on record for case communications.

**Acceptance Criteria:**
- [ ] Phone `label` must be one of `Main`, `Mobile`, `Work`, `Home`, `Fax`, `Pager`, `Other`
- [ ] Address `label` must be one of `Home`, `Business`, `Rental`
- [ ] Standard CRUD pattern applies: POST (add), PUT (update), DELETE (remove) at `/people/:personId/phones/:phoneId` and `/people/:personId/addresses/:addressId`
- [ ] Staff-only access for managing other users' records

**Priority:** P1 | **Feature Ref:** F11

---

### US-11.4: Search for a Person by Name or Email
**As a** Case Worker, **I want to** search for a person by name, email, or username, **so that** I can quickly find and select the reporter or assignee when creating or updating a ticket.

**Acceptance Criteria:**
- [ ] `GET /people/search?q={query}` accepts a query string with minimum 2 characters; returns HTTP 400 if shorter
- [ ] Search matches across `firstname`, `lastname`, `email` (via JOIN to `peopleEmails`), and `username`
- [ ] Optional `role` filter narrows results to citizens (`null`) or staff (`'staff'`)
- [ ] Optional `department_id` filter narrows results by department affiliation
- [ ] Each result includes `{id, firstname, lastname, organization, username, role}`

**Priority:** P1 | **Feature Ref:** F11

---

### US-11.5: View the Staff Users List
**As a** Department Supervisor, **I want to** view all staff accounts with their department and role, **so that** I can audit who has system access and verify correct role assignments.

**Acceptance Criteria:**
- [ ] `GET /users` returns all people where `role = 'staff'`
- [ ] Each record includes department name, username, and contact emails
- [ ] Staff-only endpoint; returns HTTP 403 for non-staff
- [ ] List is available in all five response formats via the serialization interceptor (F3)

**Priority:** P1 | **Feature Ref:** F11

---

### US-11.6: Create and Revoke API Client Credentials
**As a** Department Supervisor, **I want to** create and revoke API client credentials (api_keys) for external integrators, **so that** I can onboard and offboard third-party apps without developer involvement.

**Acceptance Criteria:**
- [ ] `api_key` must be unique (max 50 chars); duplicate returns HTTP 409
- [ ] `contactPerson_id` must reference an existing person; missing person returns HTTP 404
- [ ] Clients referenced by tickets (`tickets.client_id`) cannot be deleted; returns HTTP 409
- [ ] A new API key can be created and immediately used without a system restart
- [ ] Staff-only access; returns HTTP 403 for non-staff

**Priority:** P1 | **Feature Ref:** F11

---
