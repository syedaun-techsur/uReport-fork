# User Stories — uReport Re-Platform

| Field | Value |
|---|---|
| **Product** | uReport — Open311 GeoReport v2 Municipal CRM |
| **Acronym** | uReport |
| **Version** | 1.0 |
| **Date** | 2026-06-23 |
| **Related PRD** | `project_specs/PRD-uReport.md` |
| **Related FRD** | `project_specs/FRD-uReport.md` |
| **Related Personas** | `project_specs/PERSONAS-uReport.md` |
| **Status** | Active |

---

## Personas

| ID | Name | Role |
|---|---|---|
| PER-01 | Marcus Webb | Anonymous Citizen |
| PER-02 | Priya Nair | Authenticated Resident |
| PER-03 | Dana Kowalski | Case Worker |
| PER-04 | Robert Osei | Department Supervisor |

---

## Priority Definitions

| Priority | Description |
|---|---|
| **P0** | Critical — MVP / must-have for launch; system cannot function without this |
| **P1** | High — core feature; required for full feature parity |
| **P2** | Medium — important productivity or operational feature |
| **P3** | Low — nice-to-have; deferred to post-parity phase |

---

## Epic Index

| Epic | Feature | Priority |
|---|---|---|
| Epic 0 | Open311 GeoReport v2 REST API | P0 |
| Epic 1 | Ticket Lifecycle Management | P0 |
| Epic 2 | Role-Based Access Control (RBAC) | P0 |
| Epic 3 | Content Negotiation & Multi-Format Serialization | P0 |
| Epic 4 | OIDC Authentication | P0 |
| Epic 5 | Full-Text Search via Apache Solr | P1 |
| Epic 6 | MySQL-to-PostgreSQL Schema Migration | P0 |
| Epic 7 | Email Notifications | P1 |
| Epic 8 | Media & Attachment Management | P1 |
| Epic 9 | Geo-Clustering of Ticket Locations | P1 |
| Epic 10 | Category & Department Administration | P1 |
| Epic 11 | People & API Client Management | P1 |
| Epic 12 | Bookmarked Searches | P2 |
| Epic 13 | Reporting & Metrics | P2 |
| Epic 14 | Structured Logging via GELF/Graylog | P2 |
| Epic 15 | Sub-Status & Action Reference Data | P2 |

---
## Epic 0: Open311 GeoReport v2 REST API (F0)

The Open311 API is the primary public interface of uReport. All routes, parameters, status codes, and response bodies must be byte-compatible with the legacy PHP implementation so external consumers require zero changes after the re-platform.

---

### US-0.1: Browse Available Service Categories
**As an** Anonymous Citizen, **I want to** retrieve the list of available service categories via the Open311 API, **so that** I (or the app acting on my behalf) can present valid service options before submitting a request.

**Acceptance Criteria:**
- [ ] `GET /open311/v2/services` returns all active categories where `displayPermissionLevel = 'anonymous'` for unauthenticated callers
- [ ] Each category object includes `service_code`, `service_name`, `description`, `metadata`, `type` (`"realtime"`), `keywords`, and `group` fields
- [ ] Response format is negotiated via `.json` / `.xml` URL suffix or `Accept` header
- [ ] `jurisdiction_id` query parameter is accepted and silently ignored
- [ ] Empty service list returns `[]` (not `null`)
- [ ] Response is byte-compatible with the legacy PHP output for the same input fixture

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.2: Retrieve Single Service Definition with Custom Attributes
**As an** Anonymous Citizen, **I want to** retrieve the detailed definition for a specific service category, **so that** I can understand what custom fields are required before submitting a request.

**Acceptance Criteria:**
- [ ] `GET /open311/v2/services/:id` returns a `ServiceDefinition` object including an `attributes` array
- [ ] Each attribute includes `variable`, `code`, `datatype`, `required`, `datatype_description`, `order`, `description`, and `values` (for list types)
- [ ] Returns HTTP 404 if the category does not exist or is not visible to the caller's role
- [ ] Response is available in `.json` and `.xml` formats

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.3: Submit a Service Request via Open311 API
**As an** Anonymous Citizen, **I want to** submit a service request through the Open311 API using an `api_key`, **so that** third-party apps and city portals can programmatically create tickets on my behalf.

**Acceptance Criteria:**
- [ ] `POST /open311/v2/requests` validates `api_key` against the `clients` table; returns HTTP 403 on missing/invalid key
- [ ] `service_code` must reference an active category with `postingPermissionLevel = 'anonymous'`; returns HTTP 404 otherwise
- [ ] Either `lat`+`long` or `address_string` is required; returns HTTP 400 if neither provided
- [ ] `lat` must be in [-90, 90]; `long` in [-180, 180]; returns HTTP 400 if out of range
- [ ] Response contains `service_request_id`, `token`, `service_notice` (empty string), and `account_id` (empty string)
- [ ] Submission token is stored in `ticketHistory` for later lookup
- [ ] Geo-cluster assignment is triggered if lat/lon provided (F9)
- [ ] Solr index entry is created for the new ticket (F5)
- [ ] `open` email notification is triggered (F7)

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.4: Query Service Requests with Filters
**As an** Anonymous Citizen, **I want to** query publicly visible service requests with status and date filters, **so that** I can check whether a similar issue has already been reported in my area.

**Acceptance Criteria:**
- [ ] `GET /open311/v2/requests` returns only tickets in categories visible at the caller's permission level
- [ ] Supports filter parameters: `status`, `service_code`, `start_date`, `end_date`, `lat`/`long`/`radius`, `page`, `page_size`
- [ ] `status` must be `open` or `closed`; returns HTTP 400 for other values
- [ ] `start_date` and `end_date` must be valid ISO 8601; returns HTTP 400 if malformed
- [ ] `page_size` defaults to 100; values above 500 are silently clamped to 500
- [ ] Radius search requires both `lat` and `long`; returns HTTP 400 if radius provided without coordinates
- [ ] Each result includes `service_request_id`, `status`, `service_name`, `description`, `requested_datetime`, `updated_datetime`, `lat`, `long`, `address`, and `media_url`

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.5: Retrieve a Single Service Request by ID
**As an** Anonymous Citizen, **I want to** look up a specific service request by its ID, **so that** I can check the current status of a report I (or an app) submitted earlier.

**Acceptance Criteria:**
- [ ] `GET /open311/v2/requests/:id` returns a single-element array wrapping a `ServiceRequest` object (GeoReport v2 spec requires array envelope)
- [ ] Returns HTTP 404 if the ticket does not exist or its category is not visible to the caller's role
- [ ] Response schema is identical to the list endpoint's item schema
- [ ] Response is available in `.json` and `.xml` formats

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.6: Look Up Request ID by Submission Token
**As an** Anonymous Citizen, **I want to** exchange my submission token for the corresponding service request ID, **so that** I can track the request status without needing an account.

**Acceptance Criteria:**
- [ ] `GET /open311/v2/tokens/:token` returns `{token, service_request_id}` array object
- [ ] Returns HTTP 404 if the token does not exist in `ticketHistory`
- [ ] Token lookup is always allowed regardless of caller's role (no authentication required)
- [ ] Response is available in `.json` and `.xml` formats

**Priority:** P0 | **Feature Ref:** F0

---
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
- [ ] A `duplicate` action is appended to the **parent** ticket's `ticketHistory` only, with `data = {duplicate: child_ticket_id}`; the child ticket's record of the event is its closure entry with `substatus = Duplicate`
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
## Epic 3: Content Negotiation & Multi-Format Serialization (F3)

Every endpoint in uReport supports five response formats (HTML, JSON, XML, CSV, TXT). A single NestJS `SerializationInterceptor` replaces the ~187 legacy PHP partial templates, ensuring byte-compatible output across all formats without duplicating controller logic.

---

### US-3.1: Request JSON Response via Accept Header or URL Suffix
**As an** Anonymous Citizen (API client), **I want** the API to return JSON when I request it via the `Accept` header or `.json` URL suffix, **so that** my application can parse structured data without any format ambiguity.

**Acceptance Criteria:**
- [ ] A request with `Accept: application/json` returns `Content-Type: application/json`
- [ ] A request to a URL ending in `.json` returns JSON regardless of the `Accept` header
- [ ] JSON field names match the legacy PHP output exactly (camelCase)
- [ ] Null values are represented as `null` (not omitted) unless legacy output omits them
- [ ] Booleans are serialized as `true`/`false` (not `1`/`0`)
- [ ] Dates are ISO 8601 strings in UTC format
- [ ] Empty collections return `[]` not `null`
- [ ] Open311 single-result endpoints return a single-element array (`[{...}]`)

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.2: Request XML Response via Accept Header or URL Suffix
**As an** Anonymous Citizen (API client), **I want** the API to return XML when I request it via the `Accept: application/xml` header or `.xml` URL suffix, **so that** legacy XML-consuming integrators continue to work without modification.

**Acceptance Criteria:**
- [ ] A request with `Accept: application/xml` returns `Content-Type: application/xml`
- [ ] A request to a URL ending in `.xml` returns XML regardless of the `Accept` header
- [ ] XML output includes `<?xml version="1.0" encoding="UTF-8"?>` declaration
- [ ] Root element names and child tag names match the legacy PHP output exactly
- [ ] `description`, `notes`, and `template` fields use CDATA wrapping as in the legacy output
- [ ] `GET /open311/v2/services` wraps results in `<services><service>...</service></services>`
- [ ] `GET /open311/v2/requests` wraps results in `<service_requests><request>...</request></service_requests>`
- [ ] XML output is byte-compatible with legacy for identical input fixtures

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.3: Export Ticket List to CSV
**As a** Case Worker, **I want to** export any filtered ticket list as a CSV file, **so that** I can import it into Excel for offline reporting and departmental records.

**Acceptance Criteria:**
- [ ] A request with `Accept: text/csv` or `.csv` URL suffix returns a downloadable CSV file
- [ ] First row is a header row with column names matching legacy output
- [ ] All string values are double-quoted
- [ ] Boolean columns use `1`/`0` (matching legacy CSV output)
- [ ] Date columns use ISO 8601 format
- [ ] File includes UTF-8 BOM (`\xEF\xBB\xBF`) for Excel compatibility
- [ ] `Content-Disposition: attachment; filename="{entity}-{date}.csv"` header is set
- [ ] CSV output row-for-row matches the HTML view for the same filter parameters

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.4: Format Resolution Priority is Consistent
**As a** Department Supervisor, **I want** format negotiation to follow a documented priority order, **so that** external integrators can reliably control output format using URL suffix, query parameter, or Accept header.

**Acceptance Criteria:**
- [ ] URL suffix (`.json`, `.xml`, `.csv`, `.txt`) takes highest priority
- [ ] `format` query parameter is evaluated second
- [ ] `Accept` header is evaluated third
- [ ] Default is JSON for `/open311/v2/` routes and HTML for all other routes when no format is specified
- [ ] Format negotiation logic is centralized in the `SerializationInterceptor` — no per-controller format handling
- [ ] Error responses are also format-negotiated (JSON error, XML error, HTML error page, etc.)

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.5: View HTML Responses in Browser
**As an** Authenticated Resident, **I want to** view ticket lists and details as rendered HTML pages when using a web browser, **so that** the web interface is functional and matches the existing interface structure.

**Acceptance Criteria:**
- [ ] Browser requests (with `Accept: text/html`) receive full HTML pages with header, navigation, and footer
- [ ] AJAX sub-requests return only the content partial (no full layout)
- [ ] Template variables match the controller data shape
- [ ] HTML output preserves the existing PHP view hierarchy structure
- [ ] HTML is generated via a server-side template engine (Handlebars or Nunjucks)

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.6: Request Plain Text (TXT) Response via Accept Header or URL Suffix
**As an** Anonymous Citizen (API client), **I want** the API to return plain text when I request it via the `Accept: text/plain` header or `.txt` URL suffix, **so that** text-based feed consumers and legacy integrations that rely on the TXT format continue to work without modification.

**Acceptance Criteria:**
- [ ] A request with `Accept: text/plain` returns `Content-Type: text/plain; charset=utf-8`
- [ ] A request to a URL ending in `.txt` returns TXT regardless of the `Accept` header
- [ ] TXT output contains one record per line with fields separated by a tab character (`\t`)
- [ ] No header row is included
- [ ] Field order matches the legacy PHP TXT output exactly for each endpoint
- [ ] TXT output is byte-compatible with legacy PHP output for identical input fixtures
- [ ] Error responses in TXT format return a plain text message with the HTTP status code

**Priority:** P0 | **Feature Ref:** F3

---
## Epic 4: OIDC Authentication (F4)

uReport uses OpenID Connect for citizen and staff login. The `openid-client` library replaces the legacy `facile-it/oidc-client`, preserving the exact login flow, session behavior, callback handling, and user-provisioning logic so existing SSO integrations are unaffected.

---

### US-4.1: Log In via OIDC Authorization Code Flow
**As an** Authenticated Resident, **I want to** log in using my city OIDC account, **so that** I can access my personal ticket history and submit authenticated service requests.

**Acceptance Criteria:**
- [ ] Clicking "Log In" redirects the browser to the configured IdP authorization URL
- [ ] The authorization request includes `response_type=code`, `scope=openid email profile`, and a cryptographically random `state` and `nonce`
- [ ] `state` and `nonce` are stored in the server-side session before the redirect
- [ ] `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, and `OIDC_REDIRECT_URI` are configured via environment variables
- [ ] Optional `return_to` query parameter stores the post-login destination in session

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.2: Complete OIDC Callback and User Provisioning
**As an** Authenticated Resident, **I want** my account to be automatically created or updated when I log in for the first time, **so that** I do not need to separately register for a uReport account.

**Acceptance Criteria:**
- [ ] `GET /auth/callback?code=...&state=...` validates that `state` matches the session value; returns HTTP 400 on mismatch
- [ ] The authorization `code` is exchanged for tokens using `openid-client`; IdP errors return HTTP 502
- [ ] `id_token` nonce is validated against the session value; mismatch returns HTTP 400
- [ ] On first login, a new `people` record is created with `username = sub`, `firstname = given_name`, `lastname = family_name`
- [ ] On subsequent logins, `firstname` and `lastname` are updated from claims if changed
- [ ] A `peopleEmails` record is upserted with the `email` claim if not already present
- [ ] Session is populated with `{userId: person.id, role: person.role}` after successful callback
- [ ] User is redirected to the `return_to` URL from session (or `/` if absent)

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.3: Session Persistence Across Page Loads
**As an** Authenticated Resident, **I want** my login session to persist across page refreshes and browser navigation, **so that** I do not need to log in repeatedly during a single browsing session.

**Acceptance Criteria:**
- [ ] Session ID is transmitted via an `HttpOnly`, `Secure`, `SameSite=Lax` cookie
- [ ] Session expires after `SESSION_TTL_SECONDS` (default: 3600 seconds)
- [ ] Every request reads `session.userId` and attaches the `people` record to `request.user`
- [ ] If `session.userId` is absent, `request.user` is `null` (anonymous access)
- [ ] `state` and `nonce` are cleared from session after the callback completes

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.4: Log Out and Clear Session
**As an** Authenticated Resident, **I want to** log out of uReport, **so that** my session is terminated and my account is protected on shared devices.

**Acceptance Criteria:**
- [ ] Logging out destroys the server-side session
- [ ] The session cookie is cleared from the browser response
- [ ] If `OIDC_END_SESSION_ENDPOINT` is configured, the user is redirected to the IdP end-session endpoint with `id_token_hint`
- [ ] If end-session endpoint is not configured, the user is redirected to `/`

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.5: View and Edit Own Profile
**As an** Authenticated Resident, **I want to** view and edit my profile information (name, organization, address), **so that** my contact details are current for notifications and ticket management.

**Acceptance Criteria:**
- [ ] `GET /account` returns the authenticated user's own `people` record including emails, phones, and addresses
- [ ] `PUT /account` updates the user's own `people` record fields
- [ ] `role` and `username` cannot be changed via the self-service profile endpoint
- [ ] Profile is displayed in all five formats via the `SerializationInterceptor` (F3)
- [ ] Non-authenticated requests to `/account` receive HTTP 401

**Priority:** P0 | **Feature Ref:** F4

---
## Epic 5: Full-Text Search via Apache Solr (F5)

uReport uses Apache Solr for full-text ticket search with field-specific indexing, faceting, and result ranking. The Solarium (PHP) integration is replaced by a Node Solr client while preserving all query behavior, field mappings, and result ordering.

---

### US-5.1: Search Tickets with Full-Text Query
**As a** Case Worker, **I want to** search tickets using a free-text query, **so that** I can quickly find related issues, duplicates, or tickets matching a reported location or description.

**Acceptance Criteria:**
- [ ] `GET /search` accepts a `q` parameter for full-text search; defaults to `*:*` (all) if omitted
- [ ] Search uses eDisMax query parser with field boosts: `description^2`, `location^1.5`, `city^1`, `customFields^1`
- [ ] Wildcard prefix matching is applied when `q` has no spaces and does not end in `*`
- [ ] Only tickets in categories visible to the caller's role are returned (RBAC category filter)
- [ ] Results load in ≤ 500ms for common query patterns (NFR-6)
- [ ] Results are available in all five formats (HTML/JSON/XML/CSV/TXT) via the serialization interceptor (F3)

**Priority:** P1 | **Feature Ref:** F5

---

### US-5.2: Filter Search Results by Status, Category, Department, and Date Range
**As a** Case Worker, **I want to** filter my search results by status, category, department, assignee, and date range, **so that** I can narrow my queue to the most relevant tickets.

**Acceptance Criteria:**
- [ ] Supports filter parameters: `status`, `category_id`, `department_id`, `assignedPerson_id`, `start_date`, `end_date`
- [ ] Filter queries are ANDed together (all active filters must match)
- [ ] `sort` parameter accepts `relevance` (default) or `date`
- [ ] `page` (default 1) and `rows` (default 25, max 500) control pagination
- [ ] Response includes `total`, `page`, `rows`, `results`, and `facets` objects

**Priority:** P1 | **Feature Ref:** F5

---

### US-5.3: View Search Facets for Quick Narrowing
**As a** Case Worker, **I want to** see facet counts for categories, statuses, and departments alongside search results, **so that** I can quickly understand the distribution of results and narrow my view.

**Acceptance Criteria:**
- [ ] Facets returned in the response include: `categories` (`[{id, name, count}]`), `statuses` (`[{value, count}]`), `departments` (`[{id, name, count}]`)
- [ ] Facet counts reflect the active role-based category visibility filter
- [ ] Facet fields match the legacy Solr facet configuration exactly

**Priority:** P1 | **Feature Ref:** F5

---

### US-5.4: New and Updated Tickets are Automatically Indexed
**As a** Case Worker, **I want** tickets to appear in search results immediately after creation, update, or closure, **so that** my search queue is always up to date.

**Acceptance Criteria:**
- [ ] Ticket is indexed in Solr after `create`, `update`, and `close` operations
- [ ] Solr document includes all required fields: `id`, `status`, `description`, `category_id`, `category_name`, `department_id`, `department_name`, `assignedPerson_id`, `enteredDate`, `lastModified`, `location`, `city`, `latitude`, `longitude`, `substatus_id`, `substatus_name`, `issueType_id`, `customFields`
- [ ] If Solr is unavailable, the indexing failure is logged (F14) but does not fail the ticket write operation
- [ ] Field names match the legacy Solr schema exactly

**Priority:** P1 | **Feature Ref:** F5

---

### US-5.5: Bulk Re-Index All Tickets (Migration Support)
**As a** Department Supervisor, **I want** a bulk re-index script to rebuild the entire Solr index from the database, **so that** the search index is consistent after data migration.

**Acceptance Criteria:**
- [ ] Re-index script deletes all documents from Solr (`deleteByQuery *:*`) before inserting
- [ ] Tickets are loaded from PostgreSQL in batches of 500
- [ ] All tickets are indexed and a final `commit` is issued
- [ ] Progress is logged (tickets indexed, elapsed time)
- [ ] Script exits with a non-zero code on error

**Priority:** P1 | **Feature Ref:** F5

---
## Epic 6: MySQL-to-PostgreSQL Schema Migration (F6)

The existing MySQL schema (21 tables) must be fully translated to PostgreSQL-idiomatic DDL, all data migrated with full fidelity, and a Prisma schema generated. This is a technical infrastructure feature with no direct user-facing UX; the Department Supervisor (Robert Osei) is the go/no-go stakeholder.

---

### US-6.1: Translate All MySQL DDL to PostgreSQL
**As a** Department Supervisor, **I want** the entire MySQL schema to be accurately translated to PostgreSQL DDL, **so that** the re-platformed application can run on the city's standard PostgreSQL infrastructure.

**Acceptance Criteria:**
- [ ] All 21 tables are translated from MySQL DDL to PostgreSQL DDL
- [ ] `AUTO_INCREMENT` → `GENERATED ALWAYS AS IDENTITY`
- [ ] `TINYINT(1)` → `BOOLEAN`
- [ ] `FLOAT(17,14)` → `DOUBLE PRECISION` (lat/lon precision preserved)
- [ ] MySQL `POINT SRID 0` → PostGIS `geometry(Point, 4326)` with `CREATE EXTENSION IF NOT EXISTS postgis`
- [ ] `ENUM` columns → `TEXT` with `CHECK` constraints
- [ ] `TIMESTAMP` → `TIMESTAMPTZ` (timezone-aware)
- [ ] All foreign key constraints are preserved in the PostgreSQL schema
- [ ] GiST spatial index created on `geoclusters.center`

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.2: Migrate All Data from MySQL to PostgreSQL
**As a** Department Supervisor, **I want** all existing data migrated from MySQL to PostgreSQL with no data loss, **so that** the re-platformed system has the full history from day one.

**Acceptance Criteria:**
- [ ] Migration script connects to MySQL source (via env vars) and PostgreSQL target
- [ ] Tables are migrated in dependency order (leaf tables first)
- [ ] `TINYINT(1)` values are converted to PostgreSQL `BOOLEAN`
- [ ] Spatial `POINT` binary is converted to `ST_GeomFromText('POINT(lon lat)', 4326)`
- [ ] All `DATETIME`/`TIMESTAMP` values are migrated as UTC `Date` objects
- [ ] FK checks are disabled during migration and re-enabled afterward
- [ ] All `IDENTITY` sequences are reset to `MAX(id) + 1` per table after migration

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.3: Verify Row Counts Match After Migration
**As a** Department Supervisor, **I want** automatic row-count verification to confirm migration completeness, **so that** I can approve go-live with confidence that no data was lost.

**Acceptance Criteria:**
- [ ] After migration, `SELECT COUNT(*)` is compared between MySQL source and PostgreSQL target for each of the 21 tables
- [ ] Each table result is logged as `[PASS] {table}: {count} rows` or `[FAIL] {table}: MySQL={n}, PG={m}`
- [ ] Script exits with a non-zero code if any table fails verification
- [ ] Zero row-count discrepancies is the acceptance threshold for go-live

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.4: Preserve All Seed Data in PostgreSQL
**As a** Department Supervisor, **I want** all system seed data to be present after migration, **so that** the re-platformed application starts in a fully configured state without manual data entry.

**Acceptance Criteria:**
- [ ] `contactMethods`: Email, Phone, Web Form, Other (4 rows)
- [ ] `substatus`: Resolved/closed, Duplicate/closed, Bogus/closed (3 rows)
- [ ] `actions`: 10 system action rows (open, assignment, closed, changeCategory, changeLocation, response, duplicate, update, comment, upload_media)
- [ ] `categoryGroups`: Streets, Sanitation, Other (3 rows)
- [ ] `issueTypes`: Comment, Complaint, Question, Report, Request, Violation (6 rows)
- [ ] Seed data is included in both the migration script and a standalone `prisma/seed.ts` for fresh deployments

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.5: Generate Prisma Schema from PostgreSQL DDL
**As a** Department Supervisor, **I want** a Prisma schema (`schema.prisma`) generated from the PostgreSQL DDL, **so that** the development team can use type-safe ORM queries without writing raw SQL.

**Acceptance Criteria:**
- [ ] `prisma/schema.prisma` models all 21 tables with correct field types
- [ ] Primary keys use `@id @default(autoincrement())`
- [ ] Unique constraints applied to `people.username` and `clients.api_key`
- [ ] All foreign key relationships represented via `@relation`
- [ ] PostGIS geometry columns use `Unsupported("geometry(Point, 4326)")` with raw queries for spatial operations
- [ ] Schema passes `prisma validate` without errors

**Priority:** P0 | **Feature Ref:** F6

---
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
## Epic 8: Media & Attachment Management (F8)

Staff and citizens can upload file attachments to tickets. The media management system preserves upload handling, storage paths, MIME type validation, thumbnail generation for images, and the audit trail entry on upload.

---

### US-8.1: Upload a Photo or Document Attachment to a Ticket
**As an** Authenticated Resident, **I want to** attach a photo to my service request, **so that** the case worker can see the condition I am reporting.

**Acceptance Criteria:**
- [ ] `POST /tickets/:id/media` accepts `multipart/form-data` with a `file` field
- [ ] Anonymous callers receive HTTP 401; only authenticated users may upload
- [ ] Caller's role must meet the ticket's category `postingPermissionLevel`
- [ ] Accepted MIME types: `image/jpeg`, `image/png`, `image/gif`, `application/pdf`, `text/plain`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- [ ] File size must not exceed `MEDIA_MAX_BYTES` (default: 10 MB); returns HTTP 413 if exceeded
- [ ] Uploaded file is stored as `{MEDIA_STORAGE_PATH}/{ticket_id}/{uuid}.{ext}`
- [ ] A `media` record is created with `filename`, `internalFilename`, `mime_type`, `uploaded`, and `person_id`
- [ ] An `upload_media` action is appended to `ticketHistory`
- [ ] `tickets.lastModified` is updated

**Priority:** P1 | **Feature Ref:** F8

---

### US-8.2: Auto-Generate Thumbnail for Image Uploads
**As a** Case Worker, **I want** thumbnails to be automatically generated for image attachments, **so that** I can preview photos quickly in the ticket view without downloading full-size files.

**Acceptance Criteria:**
- [ ] Thumbnails are generated for `image/jpeg`, `image/png`, and `image/gif` uploads
- [ ] Thumbnail is saved to `{MEDIA_STORAGE_PATH}/{ticket_id}/thumbnails/{internalFilename}`
- [ ] Thumbnail dimensions are controlled by `THUMBNAIL_WIDTH` (default: 200) and `THUMBNAIL_HEIGHT` (default: 200) env vars
- [ ] `GET /tickets/:id/media/:mediaId/thumbnail` serves the thumbnail with correct `Content-Type`
- [ ] Returns HTTP 404 if no thumbnail exists (e.g., for non-image files)

**Priority:** P1 | **Feature Ref:** F8

---

### US-8.3: View and Download a Ticket Attachment
**As a** Case Worker, **I want to** view or download attachments on a ticket, **so that** I can review supporting evidence from the reporter or from field staff.

**Acceptance Criteria:**
- [ ] `GET /tickets/:id/media/:mediaId` streams the file bytes with `Content-Type: {media.mime_type}`
- [ ] `Content-Disposition: inline; filename="{media.filename}"` header is set
- [ ] Category `displayPermissionLevel` is checked against the caller's role; returns HTTP 404 if not visible
- [ ] Returns HTTP 404 if `mediaId` does not exist or does not belong to `ticket_id`
- [ ] Returns HTTP 404 if the file is missing from disk

**Priority:** P1 | **Feature Ref:** F8

---

### US-8.4: Delete an Attachment from a Ticket
**As a** Case Worker, **I want to** delete an attachment from a ticket, **so that** I can remove incorrect or irrelevant files from the case record.

**Acceptance Criteria:**
- [ ] Staff-only action; returns HTTP 403 for non-staff callers
- [ ] `DELETE /tickets/:id/media/:mediaId` deletes the file from disk and the thumbnail if it exists
- [ ] The `media` record is removed from the database
- [ ] An `update` action noting the deletion is appended to `ticketHistory`
- [ ] Returns HTTP 404 if the media record does not exist

**Priority:** P1 | **Feature Ref:** F8

---
## Epic 9: Geo-Clustering of Ticket Locations (F9)

uReport maintains a pre-computed geo-cluster index at 7 zoom levels (0–6) for map visualization. PostGIS replaces MySQL's `POINT SRID 0`, preserving the cluster hierarchy and `ticket_geodata` join table.

---

### US-9.1: View Geo-Clustered Ticket Map
**As an** Anonymous Citizen, **I want to** see a map of service requests clustered by geographic area, **so that** I can quickly identify neighborhoods with high concentrations of open issues.

**Acceptance Criteria:**
- [ ] `GET /locations` returns cluster summary objects: `{id, level, lat, lon, count}`
- [ ] `zoom_level` parameter (0–6, default 3) controls the cluster granularity returned
- [ ] Optional `status` and `category_id` filters are supported
- [ ] Only clusters containing tickets visible to the caller's role are returned
- [ ] Returns HTTP 400 if `zoom_level` is outside the range 0–6
- [ ] Response is available in JSON and XML formats

**Priority:** P1 | **Feature Ref:** F9

---

### US-9.2: Ticket Receives Geo-Cluster Assignment on Creation
**As an** Anonymous Citizen, **I want** my submitted ticket to be automatically assigned to the correct geo-cluster when I provide a location, **so that** it immediately appears on the map without staff intervention.

**Acceptance Criteria:**
- [ ] When a ticket is created with `latitude` and `longitude`, cluster assignment runs automatically
- [ ] A `ticket_geodata` row is upserted with cluster IDs for all 7 levels (0–6)
- [ ] Nearest-cluster is determined using PostGIS KNN (`<->` operator) against the `geoclusters` table
- [ ] If no `geoclusters` rows exist for a given level, `cluster_id_{L}` is set to `NULL`
- [ ] Tickets without lat/lon have no `ticket_geodata` row

**Priority:** P1 | **Feature Ref:** F9

---

### US-9.3: Geo-Cluster Assignment Updates When Ticket Location Changes
**As a** Case Worker, **I want** the geo-cluster assignment to update automatically when I correct a ticket's location, **so that** the map accurately reflects the new coordinates.

**Acceptance Criteria:**
- [ ] Geo-cluster assignment is re-run whenever `latitude` or `longitude` is changed on a ticket update
- [ ] The `ticket_geodata` row is upserted (ON CONFLICT DO UPDATE) with new cluster IDs
- [ ] If lat/lon are cleared (set to null), the `ticket_geodata` row is deleted
- [ ] Re-cluster operation does not fail the ticket update if Solr or other side-effects fail

**Priority:** P1 | **Feature Ref:** F9

---

### US-9.4: Bulk Re-Cluster All Tickets After Migration
**As a** Department Supervisor, **I want** a bulk re-cluster script to rebuild all geo-cluster assignments after the database migration, **so that** the map is fully populated before go-live.

**Acceptance Criteria:**
- [ ] `scripts/recluster.ts` truncates `ticket_geodata` before rebuilding
- [ ] All tickets with non-null lat/lon are processed in batches of 500
- [ ] Progress is logged (tickets processed, elapsed time)
- [ ] Script is idempotent — safe to re-run
- [ ] After re-clustering, GiST spatial index on `geoclusters.center` is in place for efficient queries

**Priority:** P1 | **Feature Ref:** F9

---
## Epic 10: Category & Department Administration (F10)

Staff manage the full taxonomy of service categories, category groups, departments, and routing rules. All admin CRUD interfaces are reproduced with identical field sets, validation, and association management.

---

### US-10.1: Create and Edit a Service Category
**As a** Department Supervisor, **I want to** create and edit service categories with custom fields, SLA days, permission levels, and notification overrides, **so that** the CRM taxonomy stays aligned with current city service offerings.

**Acceptance Criteria:**
- [ ] Category `name` is required (max 50 chars); `department_id` is required and must reference an existing department
- [ ] `displayPermissionLevel` and `postingPermissionLevel` must each be one of `staff`, `public`, `anonymous`
- [ ] `notificationReplyEmail` must be valid email format if provided
- [ ] `autoCloseSubstatus_id` must reference a sub-status with `status = 'closed'` if provided
- [ ] `customFields` must be valid JSON if provided; returns HTTP 400 if malformed
- [ ] `categories.lastModified` is updated on every update operation
- [ ] Can create a fully valid category (with custom fields, SLA, permissions) in under 10 minutes without developer involvement

**Priority:** P1 | **Feature Ref:** F10

---

### US-10.2: Delete a Service Category
**As a** Department Supervisor, **I want to** deactivate or delete a service category that is no longer offered, **so that** citizens and staff do not see obsolete service options.

**Acceptance Criteria:**
- [ ] Staff-only action; returns HTTP 403 for non-staff callers
- [ ] A category with existing tickets cannot be deleted; returns HTTP 409 with `"Cannot delete category with existing tickets"`
- [ ] `active = false` can be set to hide the category from public lists without deletion
- [ ] A CategoryGroup with referenced categories cannot be deleted (FK constraint enforced)

**Priority:** P1 | **Feature Ref:** F10

---

### US-10.3: Manage Category Groups
**As a** Department Supervisor, **I want to** create and edit category groups (e.g., "Streets", "Sanitation"), **so that** service categories are organized logically for both staff and citizens.

**Acceptance Criteria:**
- [ ] `name` is required (max 50 chars) and non-empty
- [ ] `ordering` (if provided) must be a non-negative integer
- [ ] Deleting a CategoryGroup that has referenced categories is blocked by FK constraint
- [ ] Groups appear in the correct display order based on `ordering`

**Priority:** P1 | **Feature Ref:** F10

---

### US-10.4: Manage Departments
**As a** Department Supervisor, **I want to** create, edit, and delete city departments, **so that** the CRM routing reflects the current organizational structure.

**Acceptance Criteria:**
- [ ] `name` is required (max 128 chars), must be unique and non-empty
- [ ] `defaultPerson_id` must reference an existing person if provided
- [ ] Deleting a department that has referenced categories or people is blocked
- [ ] Staff-only access; returns HTTP 403 for non-staff

**Priority:** P1 | **Feature Ref:** F10

---

### US-10.5: Manage Department-Category Associations
**As a** Department Supervisor, **I want to** associate additional departments with a service category, **so that** tickets in that category appear in multiple departments' queues.

**Acceptance Criteria:**
- [ ] `POST /departments/:deptId/categories` adds a `department_categories` association
- [ ] `DELETE /departments/:deptId/categories/:categoryId` removes an association
- [ ] `GET /departments/:deptId/categories` lists current associations
- [ ] Duplicate associations are rejected (PK constraint)
- [ ] Staff-only access

**Priority:** P1 | **Feature Ref:** F10

---

### US-10.6: Configure Per-Category Email Template Overrides
**As a** Department Supervisor, **I want to** set custom email templates and reply addresses for specific category-action combinations, **so that** notifications from my department use the correct branding and routing.

**Acceptance Criteria:**
- [ ] `POST /categories/:categoryId/actions/:actionId/response` creates or updates a `category_action_responses` record (upsert)
- [ ] `DELETE /categories/:categoryId/actions/:actionId/response` removes the override
- [ ] `GET /categories/:categoryId/actions/:actionId/response` retrieves the current override
- [ ] When an override exists, its `template` takes precedence over `actions.template` in email sends (F7)
- [ ] `replyEmail` in override takes precedence over `actions.replyEmail` if `categories.notificationReplyEmail` is not set

**Priority:** P1 | **Feature Ref:** F10

---
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
- [ ] Clients referenced by tickets (`tickets.client_id`) cannot be hard-deleted; returns HTTP 409
- [ ] **Revocation:** Setting `active = false` on a client record deactivates the API key immediately; the next `POST /open311/v2/requests` with that key returns HTTP 403 (no application restart required)
- [ ] A new API key can be created and immediately used without a system restart
- [ ] `active` defaults to `true` on client creation
- [ ] Staff-only access; returns HTTP 403 for non-staff

**Priority:** P1 | **Feature Ref:** F11

---
## Epic 12: Bookmarked Searches (F12)

Authenticated users can save named search queries as bookmarks. Bookmarks are stored per user and recalled to re-run the same Solr query. Both staff and public (authenticated citizen) users can create bookmarks.

---

### US-12.1: Save a Search as a Named Bookmark
**As an** Authenticated Resident, **I want to** save the current search query as a named bookmark, **so that** I can re-run the same search for recurring issues in my neighborhood with a single click.

**Acceptance Criteria:**
- [ ] `POST /bookmarks` creates a bookmark with `name`, `requestUri`, and optional `type` (default `'search'`)
- [ ] `requestUri` is required, must be non-empty, and must start with `/` (relative path); returns HTTP 400 otherwise
- [ ] Anonymous callers receive HTTP 401
- [ ] Bookmark is scoped to `currentUser.id` — the creator owns it
- [ ] Bookmark can be created from any search results page without leaving the results view

**Priority:** P2 | **Feature Ref:** F12

---

### US-12.2: View My Saved Bookmarks
**As an** Authenticated Resident, **I want to** see all my saved bookmarks in one place, **so that** I can quickly navigate to my recurring searches.

**Acceptance Criteria:**
- [ ] `GET /bookmarks` returns only bookmarks where `person_id = currentUser.id`, ordered by `id DESC`
- [ ] Each bookmark object includes `{id, type, name, requestUri}`
- [ ] Anonymous callers receive HTTP 401
- [ ] List is available in all five response formats via the serialization interceptor (F3)

**Priority:** P2 | **Feature Ref:** F12

---

### US-12.3: Delete a Saved Bookmark
**As an** Authenticated Resident, **I want to** delete a bookmark I no longer need, **so that** my bookmark list stays relevant and uncluttered.

**Acceptance Criteria:**
- [ ] `DELETE /bookmarks/:id` removes the bookmark and returns HTTP 204
- [ ] Only the owner (`person_id = currentUser.id`) can delete a bookmark
- [ ] Attempting to delete a bookmark owned by another user returns HTTP 404 (not HTTP 403, to avoid information leakage)
- [ ] Non-existent bookmark ID returns HTTP 404
- [ ] Anonymous callers receive HTTP 401

**Priority:** P2 | **Feature Ref:** F12

---

### US-12.4: Recall a Bookmark to Re-Run a Search
**As a** Case Worker, **I want to** click a saved bookmark and immediately see the search results it references, **so that** I can quickly resume my standard daily queue filters without rebuilding them.

**Acceptance Criteria:**
- [ ] Clicking a bookmark navigates the client to `bookmark.requestUri`
- [ ] No dedicated server-side recall endpoint is required; the client-side redirect uses the stored `requestUri`
- [ ] The recalled search re-executes against the current live Solr index (not a cached snapshot)

**Priority:** P2 | **Feature Ref:** F12

---
## Epic 13: Reporting & Metrics (F13)

uReport provides summary metrics and exportable reports for staff to track ticket volume, resolution rates, and category distribution. All report endpoints are staff-only and output via the serialization interceptor.

---

### US-13.1: View the Metrics Dashboard
**As a** Department Supervisor, **I want to** view a metrics dashboard showing open/closed counts and average resolution time by department and category, **so that** I can monitor team throughput without opening Excel.

**Acceptance Criteria:**
- [ ] `GET /metrics` returns: `openCount`, `closedCount`, `totalCount`, `avgResolutionDays`, `byCategory`, `byDepartment`
- [ ] `avgResolutionDays` is computed as `AVG(EXTRACT(EPOCH FROM (closedDate - enteredDate)) / 86400)` for closed tickets
- [ ] Optional `start_date` and `end_date` (ISO 8601) filter metrics by `enteredDate`
- [ ] Staff-only; non-staff receive HTTP 403
- [ ] Metrics reflect current ticket state with ≤ 5-minute staleness
- [ ] Dashboard is available in HTML, JSON, and CSV formats via the serialization interceptor (F3)

**Priority:** P2 | **Feature Ref:** F13

---

### US-13.2: Export a Filtered Ticket Report
**As a** Department Supervisor, **I want to** export a filtered ticket report as CSV or JSON for city leadership, **so that** I can provide structured data on service performance without developer involvement.

**Acceptance Criteria:**
- [ ] `GET /reports` accepts filters: `start_date`, `end_date`, `status`, `category_id`, `department_id`
- [ ] Pagination controlled by `page` (default 1) and `page_size` (default 100, max 1000)
- [ ] Each row includes: `id`, `status`, `category_name`, `department_name`, `location`, `city`, `zip`, `enteredDate`, `closedDate`, `substatus_name`, `description`
- [ ] Report is available in HTML, JSON, CSV, and TXT formats
- [ ] Staff-only; non-staff receive HTTP 403
- [ ] CSV export matches the HTML view row-for-row for the same filter parameters

**Priority:** P2 | **Feature Ref:** F13

---
## Epic 14: Structured Logging via GELF/Graylog (F14)

All application events are logged in GELF format to a Graylog instance for centralized observability. A NestJS `GelfLoggerService` wraps the GELF client and is injected wherever logging is needed.

---

### US-14.1: All HTTP Requests are Logged to Graylog
**As a** Department Supervisor, **I want** every HTTP request to be logged to Graylog with method, path, status code, and duration, **so that** I can diagnose API errors and performance issues from the Graylog dashboard.

**Acceptance Criteria:**
- [ ] A `GelfRequestMiddleware` logs on request start: `{method, path, _request_id}` at INFO level
- [ ] On request completion: `{method, path, statusCode, durationMs, _request_id}` at INFO level
- [ ] `_request_id` is a UUID generated per HTTP request and attached to all subsequent log entries for that request
- [ ] GELF transport is configured via `GRAYLOG_HOST`, `GRAYLOG_PORT`, `GRAYLOG_TRANSPORT` (udp/tcp), and `GRAYLOG_FACILITY` env vars
- [ ] All structured logs for the last 30 days are accessible in Graylog within 2 minutes (NFR-8)

**Priority:** P2 | **Feature Ref:** F14

---

### US-14.2: Unhandled Exceptions are Logged with Stack Traces
**As a** Department Supervisor, **I want** all unhandled exceptions to be logged to Graylog with the full stack trace, **so that** I can identify and triage production errors without access to server console logs.

**Acceptance Criteria:**
- [ ] NestJS global exception filter logs every unhandled exception at ERROR level
- [ ] Log includes `short_message` (exception message) and `full_message` (stack trace)
- [ ] `_request_id` and `_user_id` are included when available
- [ ] GELF level mapping matches: `verbose`/`debug` → DEBUG (7), `log` → INFO (6), `warn` → WARNING (4), `error` → ERROR (3)
- [ ] Every log message includes: `version: "1.1"`, `host`, `short_message`, `timestamp`, `level`, `_facility`

**Priority:** P2 | **Feature Ref:** F14

---

### US-14.3: Ticket and User Context is Included in Log Entries
**As a** Department Supervisor, **I want** log entries to include the ticket ID, user ID, and request ID as structured fields, **so that** I can correlate Graylog entries to specific tickets and users when diagnosing issues.

**Acceptance Criteria:**
- [ ] `_ticket_id` is included in log entries when logging a ticket operation
- [ ] `_user_id` (people.id) is included for authenticated requests
- [ ] `_request_id` is propagated across all log entries within a single HTTP request
- [ ] `GelfLoggerService` is registered as the global NestJS logger via `app.useLogger(new GelfLoggerService())`

**Priority:** P2 | **Feature Ref:** F14

---
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
## Story Index

Summary table of all user stories by ID, persona, priority, and feature reference.

| Story ID | Title | Primary Persona | Priority | Feature Ref |
|---|---|---|---|---|
| US-0.1 | Browse Available Service Categories | Anonymous Citizen | P0 | F0 |
| US-0.2 | Retrieve Single Service Definition | Anonymous Citizen | P0 | F0 |
| US-0.3 | Submit Service Request via Open311 API | Anonymous Citizen | P0 | F0 |
| US-0.4 | Query Service Requests with Filters | Anonymous Citizen | P0 | F0 |
| US-0.5 | Retrieve Single Request by ID | Anonymous Citizen | P0 | F0 |
| US-0.6 | Look Up Request ID by Submission Token | Anonymous Citizen | P0 | F0 |
| US-1.1 | Submit Service Request via Web Form | Anonymous Citizen | P0 | F1 |
| US-1.2 | View Own Ticket History | Authenticated Resident | P0 | F1 |
| US-1.3 | Assign a Ticket to a Case Worker | Case Worker | P0 | F1 |
| US-1.4 | Update Ticket Fields | Case Worker | P0 | F1 |
| US-1.5 | Close a Ticket with Sub-Status | Case Worker | P0 | F1 |
| US-1.6 | Mark a Ticket as Duplicate | Case Worker | P0 | F1 |
| US-1.7 | Add a Staff Comment | Case Worker | P0 | F1 |
| US-1.8 | Add a Response to a Reporter | Case Worker | P0 | F1 |
| US-1.9 | Re-open a Closed Ticket | Case Worker | P0 | F1 |
| US-1.10 | View Full Ticket History / Audit Trail | Case Worker | P0 | F1 |
| US-2.1 | Anonymous Access to Public Categories | Anonymous Citizen | P0 | F2 |
| US-2.2 | Authenticated Resident Access (Public Role) | Authenticated Resident | P0 | F2 |
| US-2.3 | Staff Full Access | Case Worker | P0 | F2 |
| US-2.4 | Category-Level Permission Filtering | Department Supervisor | P0 | F2 |
| US-2.5 | PII Field Masking for Non-Staff Callers | Authenticated Resident | P0 | F2 |
| US-3.1 | Request JSON Response | Anonymous Citizen | P0 | F3 |
| US-3.2 | Request XML Response | Anonymous Citizen | P0 | F3 |
| US-3.3 | Export Ticket List to CSV | Case Worker | P0 | F3 |
| US-3.4 | Format Resolution Priority is Consistent | Department Supervisor | P0 | F3 |
| US-3.5 | View HTML Responses in Browser | Authenticated Resident | P0 | F3 |
| US-3.6 | Request Plain Text (TXT) Response | Anonymous Citizen | P0 | F3 |
| US-4.1 | Log In via OIDC Authorization Code Flow | Authenticated Resident | P0 | F4 |
| US-4.2 | Complete OIDC Callback and User Provisioning | Authenticated Resident | P0 | F4 |
| US-4.3 | Session Persistence Across Page Loads | Authenticated Resident | P0 | F4 |
| US-4.4 | Log Out and Clear Session | Authenticated Resident | P0 | F4 |
| US-4.5 | View and Edit Own Profile | Authenticated Resident | P0 | F4 |
| US-5.1 | Search Tickets with Full-Text Query | Case Worker | P1 | F5 |
| US-5.2 | Filter Search Results | Case Worker | P1 | F5 |
| US-5.3 | View Search Facets | Case Worker | P1 | F5 |
| US-5.4 | Tickets Auto-Indexed on Create/Update/Close | Case Worker | P1 | F5 |
| US-5.5 | Bulk Re-Index All Tickets | Department Supervisor | P1 | F5 |
| US-6.1 | Translate MySQL DDL to PostgreSQL | Department Supervisor | P0 | F6 |
| US-6.2 | Migrate All Data from MySQL to PostgreSQL | Department Supervisor | P0 | F6 |
| US-6.3 | Verify Row Counts After Migration | Department Supervisor | P0 | F6 |
| US-6.4 | Preserve All Seed Data in PostgreSQL | Department Supervisor | P0 | F6 |
| US-6.5 | Generate Prisma Schema from PostgreSQL DDL | Department Supervisor | P0 | F6 |
| US-7.1 | Email on Ticket Opened | Anonymous Citizen | P1 | F7 |
| US-7.2 | Email on Ticket Assigned | Authenticated Resident | P1 | F7 |
| US-7.3 | Email on Ticket Closed | Authenticated Resident | P1 | F7 |
| US-7.4 | Email for Response, Comment, Duplicate | Authenticated Resident | P1 | F7 |
| US-7.5 | Configure Email Templates per Category | Department Supervisor | P1 | F7 |
| US-7.6 | Digest Notification Email | Authenticated Resident | P1 | F7 |
| US-8.1 | Upload Photo or Document Attachment | Authenticated Resident | P1 | F8 |
| US-8.2 | Auto-Generate Thumbnail for Images | Case Worker | P1 | F8 |
| US-8.3 | View and Download Attachment | Case Worker | P1 | F8 |
| US-8.4 | Delete an Attachment | Case Worker | P1 | F8 |
| US-9.1 | View Geo-Clustered Ticket Map | Anonymous Citizen | P1 | F9 |
| US-9.2 | Ticket Receives Cluster Assignment on Creation | Anonymous Citizen | P1 | F9 |
| US-9.3 | Cluster Updates When Ticket Location Changes | Case Worker | P1 | F9 |
| US-9.4 | Bulk Re-Cluster After Migration | Department Supervisor | P1 | F9 |
| US-10.1 | Create and Edit Service Category | Department Supervisor | P1 | F10 |
| US-10.2 | Delete Service Category | Department Supervisor | P1 | F10 |
| US-10.3 | Manage Category Groups | Department Supervisor | P1 | F10 |
| US-10.4 | Manage Departments | Department Supervisor | P1 | F10 |
| US-10.5 | Manage Department-Category Associations | Department Supervisor | P1 | F10 |
| US-10.6 | Configure Category Email Template Overrides | Department Supervisor | P1 | F10 |
| US-11.1 | Create and Edit Person Record | Department Supervisor | P1 | F11 |
| US-11.2 | Manage Email Addresses for a Person | Department Supervisor | P1 | F11 |
| US-11.3 | Manage Phone and Address Records | Department Supervisor | P1 | F11 |
| US-11.4 | Search for a Person | Case Worker | P1 | F11 |
| US-11.5 | View Staff Users List | Department Supervisor | P1 | F11 |
| US-11.6 | Create and Revoke API Client Credentials | Department Supervisor | P1 | F11 |
| US-12.1 | Save a Search as Named Bookmark | Authenticated Resident | P2 | F12 |
| US-12.2 | View My Saved Bookmarks | Authenticated Resident | P2 | F12 |
| US-12.3 | Delete a Saved Bookmark | Authenticated Resident | P2 | F12 |
| US-12.4 | Recall a Bookmark to Re-Run Search | Case Worker | P2 | F12 |
| US-13.1 | View Metrics Dashboard | Department Supervisor | P2 | F13 |
| US-13.2 | Export Filtered Ticket Report | Department Supervisor | P2 | F13 |
| US-14.1 | HTTP Requests Logged to Graylog | Department Supervisor | P2 | F14 |
| US-14.2 | Unhandled Exceptions Logged with Stack Traces | Department Supervisor | P2 | F14 |
| US-14.3 | Ticket and User Context in Log Entries | Department Supervisor | P2 | F14 |
| US-15.1 | Manage Sub-Statuses for Ticket Closure | Department Supervisor | P2 | F15 |
| US-15.2 | Manage Custom Department Action Types | Department Supervisor | P2 | F15 |
| US-15.3 | Manage Issue Types | Department Supervisor | P2 | F15 |
| US-15.4 | Manage Contact Methods | Department Supervisor | P2 | F15 |

**Total stories: 80**

---
## Priority Breakdown

### P0 — Critical (Must-Have for MVP / Public Contract)

These stories represent the minimum viable re-platform. The system cannot go live without them. Failure in any P0 story constitutes a blocking defect.

| Count | Epics |
|---|---|
| 32 stories | F0 (Open311 API), F1 (Ticket Lifecycle), F2 (RBAC), F3 (Content Negotiation), F4 (OIDC Auth), F6 (Schema Migration) |

**Key constraints:**
- Open311 GeoReport v2 response bodies must be byte-compatible with the legacy PHP implementation
- RBAC allow/deny decisions must match the legacy Laminas ACL rules exactly
- All five content formats (HTML/JSON/XML/CSV/TXT) must be byte-compatible per endpoint
- OIDC login flow and session behavior must be identical to the original

---

### P1 — High (Core Feature Parity)

These stories complete the feature parity goal. Required before the system is considered fully re-platformed.

| Count | Epics |
|---|---|
| 30 stories | F5 (Solr Search), F7 (Email), F8 (Media), F9 (Geo-Clustering), F10 (Category Admin), F11 (People/Clients) |

**Key constraints:**
- Solr query result sets (same IDs, same order) must match legacy Solarium output
- Email notification triggers and template resolution must match legacy PHPMailer behavior
- Geo-cluster assignments and coordinate precision must match pre-migration values (to 6 decimal places)

---

### P2 — Medium (Productivity & Operations)

These stories provide operational visibility and staff productivity features. Not blocking for go-live, but required for production-quality operations.

| Count | Epics |
|---|---|
| 18 stories | F12 (Bookmarks), F13 (Reporting), F14 (GELF Logging), F15 (Reference Data) |

---

### Dependency Map

```
F4 (OIDC) ──→ F2 (RBAC)
F6 (Migration) ──→ F2 (RBAC) ──→ F0 (Open311 API)
                             ──→ F1 (Ticket Lifecycle) ──→ F7 (Email)
                                                        ──→ F8 (Media)
F6 (Migration) ──→ F1 (Ticket Lifecycle) ──→ F5 (Solr Search) ──→ F12 (Bookmarks)
F3 (Serialization) ──→ F0, F1, F5, F13 (all output endpoints)
F1 (Tickets) ──→ F9 (Geo-Clustering)
F15 (Reference Data) ──→ F1 (Ticket Lifecycle) ──→ F7 (Email)
```

---

*UserStories generated: 2026-06-23 | Derived from PRD-uReport.md, FRD-uReport.md, PERSONAS-uReport.md | Model: claude-sonnet-4-6*
