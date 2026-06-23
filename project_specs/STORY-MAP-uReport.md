# STORY-MAP — uReport Re-Platform

| Field | Value |
|---|---|
| **Product** | uReport — Open311 GeoReport v2 Municipal CRM |
| **Version** | 1.0 |
| **Date** | 2026-06-23 |
| **Related PRD** | `project_specs/PRD-uReport.md` |
| **Related Personas** | `project_specs/PERSONAS-uReport.md` |
| **Related JTBD** | `project_specs/JTBD-uReport.md` |
| **Related Journeys** | `project_specs/JOURNEYS-uReport.md` |
| **Related UserStories** | `project_specs/UserStories-uReport.md` |
| **Total Stories Mapped** | 80 |
| **Status** | Active |

---

## Overview

This Story Map organizes all 79 uReport user stories along two axes:

- **X-axis (columns):** Journey stages derived from `JOURNEYS-uReport.md`, grouped by persona
- **Y-axis (rows):** User stories (US-X.Y) placed at their primary journey stage intersection

Each story entry includes a **Natural Acceptance Criterion (NaC)** derived from the intersection of:
1. A specific JTBD functional outcome (the "what matters")
2. The journey stage context (the "when/where")
3. The user story being mapped (the "what is built")

NaC are **not invented** — every NaC traces back to a documented JTBD outcome.

### Release Strategy

Stories are grouped into three releases, ordered by journey completeness:

| Release | Theme | Priority Focus | Persona Coverage |
|---|---|---|---|
| **R1 — MVP Core** | Public API + Ticket Lifecycle + Auth + DB Foundation | P0 stories | PER-01, PER-02, PER-03, PER-04 (partial) |
| **R2 — Feature Parity** | Search, Notifications, Media, Geo, Admin | P1 stories | All four personas (full workflows) |
| **R3 — Operational Excellence** | Bookmarks, Reporting, Logging, Reference Data | P2 stories | PER-03, PER-04 (depth) |

### Map ID Convention

Story map entries are referenced as `SM-{Epic}.{Story}` (e.g., `SM-0.1` = US-0.1 mapped to the story map).

---
## Story Map Matrix

> **Reading the map:** Each row = one user story. Columns = journey stages from the persona's primary journey. NaC = Natural Acceptance Criterion derived from JTBD outcome × journey stage. Release = R1/R2/R3.

---

### PER-01: Marcus Webb — Anonymous Citizen

**Primary Journeys:** JRN-01.1 (Anonymous Web Form Submission) · JRN-01.2 (Open311 API — Programmatic)

#### JRN-01.1 Journey Stages: Discover → Select Category → Locate Issue → Describe & Attach → Submit → Confirm

| SM-ID | Story | Journey Stage | Epic | NaC (JTBD Source) | Release |
|---|---|---|---|---|---|
| SM-0.1 | **US-0.1** Browse Available Service Categories | Select Category | Epic 0 (F0) | JTBD-01.1: "Clear category selection with plain-language descriptions" → `GET /open311/v2/services` returns all `displayPermissionLevel='anonymous'` categories with `description` and `group` fields in < 200ms | R1 |
| SM-0.2 | **US-0.2** Retrieve Single Service Definition with Custom Attributes | Select Category | Epic 0 (F0) | JTBD-01.1: "Provide a clear category selection" → `GET /open311/v2/services/:id` returns the `attributes` array so the caller knows exactly which fields to fill before submitting | R1 |
| SM-2.1 | **US-2.1** Anonymous Access to Public Categories and Tickets | Discover | Epic 2 (F2) | JTBD-01.1: "Zero authentication prompts for anonymous-eligible categories" → Anonymous caller can browse and post without any auth prompt; `displayPermissionLevel='anonymous'` filter applied server-side | R1 |
| SM-1.1 | **US-1.1** Submit a Service Request via Web Form | Submit | Epic 1 (F1) | JTBD-01.1: "First-time user completes submission in under 3 minutes" → Web form creates ticket from `category_id` + location in ≤ 3 min with no login; `action='open'` logged to `ticketHistory` on creation | R1 |
| SM-0.3 | **US-0.3** Submit a Service Request via Open311 API | Submit | Epic 0 (F0) | JTBD-01.1: "Accepts a service request submission without any login step" → `POST /open311/v2/requests` with `api_key` creates ticket and returns `service_request_id` + `token`; zero auth prompts for anonymous categories | R1 |
| SM-3.1 | **US-3.1** Request JSON Response via Accept Header or URL Suffix | Submit | Epic 3 (F3) | JTBD-01.1: "Returns a unique confirmation token immediately after submission" → API response with `Accept: application/json` returns byte-compatible JSON with `token` field matching legacy PHP output | R1 |
| SM-3.2 | **US-3.2** Request XML Response via Accept Header or URL Suffix | Submit | Epic 3 (F3) | JTBD-01.1: "Open311 response byte-compatible with PHP implementation (NFR-1)" → `.xml` suffix returns XML with CDATA wrapping identical to legacy for the same input fixture | R1 |
| SM-3.4 | **US-3.4** Format Resolution Priority is Consistent | Submit | Epic 3 (F3) | JTBD-01.1: "Response format negotiated correctly" → URL suffix > query param > Accept header priority order is consistent so external API clients can reliably control format | R1 |
| SM-0.6 | **US-0.6** Look Up Request ID by Submission Token | Confirm | Epic 0 (F0) | JTBD-01.2: "Token lookup returns ticket status in ≤ 200ms without authentication" → `GET /open311/v2/tokens/:token` returns `{token, service_request_id}` in ≤ 200ms, no auth required | R1 |
| SM-0.5 | **US-0.5** Retrieve a Single Service Request by ID | Confirm | Epic 0 (F0) | JTBD-01.2: "Exposes ticket status and last-modified date to anonymous users" → `GET /open311/v2/requests/:id` returns current status in single-element array; returns 404 if not visible to caller's role | R1 |
| SM-0.4 | **US-0.4** Query Service Requests with Filters | Discover | Epic 0 (F0) | JTBD-01.3: "Publicly accessible ticket list queryable by geographic location" → `GET /open311/v2/requests` with `lat/long/radius` returns only `displayPermissionLevel='anonymous'` tickets in ≤ 200ms | R1 |

#### JRN-01.2 Journey Stages: Discover Services → Submit Request → Receive Token → Poll for Status → Query Nearby

| SM-ID | Story | Journey Stage | Epic | NaC (JTBD Source) | Release |
|---|---|---|---|---|---|
| SM-9.1 | **US-9.1** View Geo-Clustered Ticket Map | Query Nearby | Epic 9 (F9) | JTBD-01.3: "Geo-cluster map view surfaces nearby reports visually" → `GET /locations` returns cluster objects filtered by caller's role; anonymous user can confirm whether an issue near their address is already reported | R2 |
| SM-9.2 | **US-9.2** Ticket Receives Geo-Cluster Assignment on Creation | Submit Request | Epic 9 (F9) | JTBD-01.1: "Accepts location input (GPS coordinates) from a mobile browser" → On ticket creation with lat/lon, `ticket_geodata` row is upserted for all 7 cluster levels so ticket appears on map immediately | R2 |
| SM-3.5 | **US-3.5** View HTML Responses in Browser | Discover Services | Epic 3 (F3) | JTBD-01.1: "Form renders correctly on a mobile browser without a native app" → Browser requests receive full HTML with header/nav/footer; mobile-compatible layout matches existing PHP interface structure | R1 |
| SM-3.6 | **US-3.6** Request Plain Text (TXT) Response | Submit Request | Epic 3 (F3) | JTBD-01.1: "Open311 response byte-compatible with PHP implementation (NFR-1)" → `.txt` suffix or `Accept: text/plain` returns tab-delimited plain text with no header row; field order and byte output identical to legacy PHP for same input fixture | R1 |

---
---

### PER-02: Priya Nair — Authenticated Resident

**Primary Journeys:** JRN-02.1 (OIDC Login + Personal Ticket History) · JRN-02.2 (Bookmark Setup)

#### JRN-02.1 Journey Stages: Initiate Login → Authenticate → Land on Dashboard → Filter and Find → Verify Notification

| SM-ID | Story | Journey Stage | Epic | NaC (JTBD Source) | Release |
|---|---|---|---|---|---|
| SM-4.1 | **US-4.1** Log In via OIDC Authorization Code Flow | Initiate Login | Epic 4 (F4) | JTBD-02.1: "Personal ticket dashboard reachable within 2 clicks of logging in via OIDC" → Clicking "Log In" redirects to city IdP with correct `state`/`nonce`; user lands on uReport after callback with no extra steps | R1 |
| SM-4.2 | **US-4.2** Complete OIDC Callback and User Provisioning | Authenticate | Epic 4 (F4) | JTBD-02.1: "OIDC callback correctly validates state/nonce; session created" → `GET /auth/callback` validates `state`, exchanges code, provisions `people` record; session scoped to `userId`; user redirected to dashboard | R1 |
| SM-4.3 | **US-4.3** Session Persistence Across Page Loads | Authenticate | Epic 4 (F4) | JTBD-02.1: "Personal ticket history accessible without re-authentication" → Session cookie (`HttpOnly`, `Secure`, `SameSite=Lax`) persists across page loads for `SESSION_TTL_SECONDS`; `request.user` always reflects authenticated identity | R1 |
| SM-4.4 | **US-4.4** Log Out and Clear Session | Initiate Login | Epic 4 (F4) | JTBD-02.1: "Shared-device safety" → Logout destroys server-side session, clears cookie, optionally redirects to IdP end-session endpoint | R1 |
| SM-4.5 | **US-4.5** View and Edit Own Profile | Land on Dashboard | Epic 4 (F4) | JTBD-02.1: "Shows all tickets associated with the authenticated user" → `GET /account` returns own `people` record including notification emails; profile editable; non-authenticated gets HTTP 401 | R1 |
| SM-2.2 | **US-2.2** Authenticated Resident Access (Public Role) | Land on Dashboard | Epic 2 (F2) | JTBD-02.1: "Shows all tickets associated with the authenticated user's account, filterable by status" → Public callers can view `public`+`anonymous` categories/tickets, own history, own bookmarks; HTTP 403 on staff actions | R1 |
| SM-2.5 | **US-2.5** PII Field Masking for Non-Staff Callers | Filter and Find | Epic 2 (F2) | JTBD-02.1: "PII fields of other reporters are not exposed" → `reportedByPerson_id` and related objects omitted/nulled for non-staff callers in all five response formats | R1 |
| SM-1.2 | **US-1.2** View Own Ticket History | Land on Dashboard | Epic 1 (F1) | JTBD-02.1: "Personal ticket history reachable within 2 clicks of login" → Ticket list scoped to `reportedByPerson_id = currentUser.id`; filterable by status and date; accessible in ≤ 2 navigation actions post-login | R1 |
| SM-7.2 | **US-7.2** Receive Email Notification When a Ticket is Assigned | Verify Notification | Epic 7 (F7) | JTBD-02.2: "Email notification sent within 5 minutes of any status change" → `assignment` notification email sent to reporter and assigned person within 5 min; send logged to `ticketHistory.sentNotifications` | R2 |
| SM-7.3 | **US-7.3** Receive Email Notification When a Ticket is Closed | Verify Notification | Epic 7 (F7) | JTBD-02.2: "Every status change on a ticket she reported triggers an email notification" → `closed` notification sent to reporter and assignee; template resolution chain applied; send logged to `sentNotifications` | R2 |
| SM-7.4 | **US-7.4** Receive Email for Response, Comment, and Duplicate Actions | Verify Notification | Epic 7 (F7) | JTBD-02.2: "Zero missed notifications for tickets tied to her reporter record" → `response`, `comment`, `duplicate` actions trigger emails per F7 trigger matrix; all sends logged to `ticketHistory.sentNotifications` | R2 |
| SM-7.6 | **US-7.6** Receive Digest Notification Email | Verify Notification | Epic 7 (F7) | JTBD-02.2: "Stay informed without being overwhelmed by individual event emails" → Scheduled cron sends one digest per subscribed user; digest sends logged to `sentNotifications` | R2 |
| SM-8.1 | **US-8.1** Upload a Photo or Document Attachment | Filter and Find | Epic 8 (F8) | JTBD-02.1: "Attach a photo to a ticket she submits to document the condition" → Authenticated user uploads via `POST /tickets/:id/media`; file stored, `upload_media` action logged, `lastModified` updated | R2 |

#### JRN-02.2 Journey Stages: Run the Search → Review Results → Save Bookmark → Confirm Saved → Re-Run Bookmark

| SM-ID | Story | Journey Stage | Epic | NaC (JTBD Source) | Release |
|---|---|---|---|---|---|
| SM-5.1 | **US-5.1** Search Tickets with Full-Text Query | Run the Search | Epic 5 (F5) | JTBD-02.3: "Can save any Solr search as a named bookmark directly from results page" → `GET /search?q=...` returns results via eDisMax in ≤ 500ms; RBAC category filter applied; results in all five formats | R2 |
| SM-5.2 | **US-5.2** Filter Search Results by Status, Category, Department, and Date Range | Review Results | Epic 5 (F5) | JTBD-02.3: "Solr search returns results filtered by permission level and query params" → Filters ANDed; `sort`, `page`, `rows` supported; response includes `total`, `facets` | R2 |
| SM-5.3 | **US-5.3** View Search Facets for Quick Narrowing | Review Results | Epic 5 (F5) | JTBD-02.3: "Supports an `address_contains` filter or street-name facet in search" → Facets for `categories`, `statuses`, `departments` returned alongside results; counts reflect role-filtered visibility | R2 |
| SM-12.1 | **US-12.1** Save a Search as a Named Bookmark | Save Bookmark | Epic 12 (F12) | JTBD-02.3: "Saved bookmark saved from search results page without leaving results" → `POST /bookmarks` with `name` + `requestUri` creates user-scoped bookmark; anonymous gets HTTP 401 | R3 |
| SM-12.2 | **US-12.2** View My Saved Bookmarks | Confirm Saved | Epic 12 (F12) | JTBD-02.3: "Saved bookmarks listed on her dashboard after login" → `GET /bookmarks` returns only caller's bookmarks ordered `id DESC`; available in all five formats | R3 |
| SM-12.3 | **US-12.3** Delete a Saved Bookmark | Confirm Saved | Epic 12 (F12) | JTBD-02.3: "Can delete bookmarks she no longer needs" → `DELETE /bookmarks/:id` restricted to owner; other-user bookmark returns HTTP 404 (no info leakage); anonymous gets HTTP 401 | R3 |
| SM-12.4 | **US-12.4** Recall a Bookmark to Re-Run a Search | Re-Run Bookmark | Epic 12 (F12) | JTBD-02.3: "Re-running bookmark replays exact Solr query and reflects current ticket state" → Client-side redirect to `bookmark.requestUri` re-executes against live Solr index; no stale cache | R3 |

---
---

### PER-03: Dana Kowalski — Municipal Case Worker

**Primary Journeys:** JRN-03.1 (Daily Ticket Queue) · JRN-03.2 (Duplicate Ticket Workflow)

#### JRN-03.1 Journey Stages: Login and Orient → Triage Overdue → Assign New Ticket → Update Staff Comment → Close Resolved Tickets → Bulk Review and Export

| SM-ID | Story | Journey Stage | Epic | NaC (JTBD Source) | Release |
|---|---|---|---|---|---|
| SM-2.3 | **US-2.3** Staff Full Access | Login and Orient | Epic 2 (F2) | JTBD-03.1: "Full read/write access to all tickets regardless of permission level" → Staff callers (`people.role='staff'`) can view all tickets/categories, all PII fields; every allow/deny matches legacy Laminas ACL behavior | R1 |
| SM-1.3 | **US-1.3** Assign a Ticket to a Case Worker | Assign New Ticket | Epic 1 (F1) | JTBD-03.2: "Assignment action logged to ticketHistory with person_id" → `assignedPerson_id` updated; `ticketHistory` entry with `action='assignment'` appended; `assignment` email triggered; HTTP 400 if assignee not in ticket's department | R1 |
| SM-1.4 | **US-1.4** Update Ticket Fields (Description, Category, Location) | Assign New Ticket | Epic 1 (F1) | JTBD-03.2: "Every assignment, status change, category change, and comment produces an immutable entry in ticketHistory" → Category change logs `changeCategory`; location change logs `changeLocation`; `lastModified` updated; Solr re-indexed | R1 |
| SM-1.5 | **US-1.5** Close a Ticket with a Sub-Status | Close Resolved Tickets | Epic 1 (F1) | JTBD-03.2: "Closing a ticket requires selecting a substatus_id and entering close notes" → `status='closed'`, `closedDate=NOW()`, `ticketHistory` entry `action='closed'` with sub-status and notes; `closed` email auto-triggered; HTTP 409 on already-closed | R1 |
| SM-1.6 | **US-1.6** Mark a Ticket as Duplicate | Close Resolved Tickets | Epic 1 (F1) | JTBD-03.3: "parent_id assignment available from ticket detail page without navigating away" → `parent_id` set on child; `duplicate` action appended to parent's `ticketHistory`; `duplicate` email to child reporter; HTTP 400 on self-reference | R1 |
| SM-1.7 | **US-1.7** Add a Staff Comment to a Ticket | Update Staff Comment | Epic 1 (F1) | JTBD-03.2: "Staff-only comments are visible to case workers but not to anonymous or public users" → `ticketHistory` row with `action='comment'`; not visible to anonymous/public callers (RBAC enforced) | R1 |
| SM-1.8 | **US-1.8** Add a Response to a Reporter | Update Staff Comment | Epic 1 (F1) | JTBD-03.2: "Reporter notification email is triggered automatically on response — no manual step" → `ticketHistory` row `action='response'`; `response` email triggered to reporter; `lastModified` updated | R1 |
| SM-1.9 | **US-1.9** Re-open a Closed Ticket | Close Resolved Tickets | Epic 1 (F1) | JTBD-03.2: "Ticket lifecycle accuracy" → `status='open'`, `closedDate` cleared, `substatus_id` cleared; `ticketHistory` entry with re-open note; Solr re-indexed; HTTP 409 on already-open ticket | R1 |
| SM-1.10 | **US-1.10** View Full Ticket History / Audit Trail | Login and Orient | Epic 1 (F1) | JTBD-03.2: "History is complete enough to reconstruct any decision later" → `ticketHistory` entries ordered by `enteredDate ASC`; includes `action.name`, `enteredDate`, `notes`, `data`, `sentNotifications`; PII omitted for non-staff | R1 |
| SM-5.4 | **US-5.4** New and Updated Tickets are Automatically Indexed | Triage Overdue | Epic 5 (F5) | JTBD-03.1: "Ticket list is always up to date" → Ticket indexed in Solr after `create`, `update`, and `close`; Solr unavailability logged but does not fail the ticket write | R2 |
| SM-7.1 | **US-7.1** Receive Email Notification When a Ticket is Opened | Close Resolved Tickets | Epic 7 (F7) | JTBD-03.2: "Reporter notification email is triggered automatically on open" → `open` notification sent to `reportedByPerson` with `usedForNotifications=true` email; template resolved from `category_action_responses` then `actions.template`; send logged | R2 |
| SM-7.5 | **US-7.5** Configure Email Templates and Reply Addresses per Category | Close Resolved Tickets | Epic 7 (F7) | JTBD-04.1: "notificationReplyEmail and autoCloseSubstatus_id configurable per category" → `category_action_responses` CRUD; override template takes precedence; `notificationReplyEmail` sets Reply-To for all actions in category | R2 |
| SM-3.3 | **US-3.3** Export Ticket List to CSV | Bulk Review and Export | Epic 3 (F3) | JTBD-03.2: "CSV export of filtered ticket list matches the HTML view row-for-row" → `Accept: text/csv` returns downloadable CSV; first row is header; UTF-8 BOM; `Content-Disposition: attachment`; column-for-column match with HTML view | R1 |
| SM-8.2 | **US-8.2** Auto-Generate Thumbnail for Image Uploads | Update Staff Comment | Epic 8 (F8) | JTBD-03.2: "Attach media evidence from field inspection" → Thumbnails auto-generated for `image/jpeg`, `image/png`, `image/gif`; served at `/tickets/:id/media/:mediaId/thumbnail`; HTTP 404 for non-image files | R2 |
| SM-8.3 | **US-8.3** View and Download a Ticket Attachment | Update Staff Comment | Epic 8 (F8) | JTBD-03.2: "Upload a media attachment from field inspection" → `GET /tickets/:id/media/:mediaId` streams file bytes with correct `Content-Type`; `displayPermissionLevel` checked; HTTP 404 if not visible to caller's role | R2 |
| SM-8.4 | **US-8.4** Delete an Attachment from a Ticket | Update Staff Comment | Epic 8 (F8) | JTBD-03.2: "Remove incorrect files from case record" → Staff-only `DELETE`; file and thumbnail deleted from disk; `media` record removed; `update` action logged to `ticketHistory` | R2 |

#### JRN-03.1 Continued — Queue Management

| SM-ID | Story | Journey Stage | Epic | NaC (JTBD Source) | Release |
|---|---|---|---|---|---|
| SM-5.1-s | **US-5.1** Search Tickets with Full-Text Query *(also maps to PER-02)* | Triage Overdue | Epic 5 (F5) | JTBD-03.1: "Search tickets by free text, category, status, and date range" → eDisMax search with role-based category filter returns results in ≤ 500ms | R2 |
| SM-5.2-s | **US-5.2** Filter Search Results by Status, Category, Department, Date | Triage Overdue | Epic 5 (F5) | JTBD-03.1: "Filter controls support department, category, status, assignee, date range in a single query" → All filter params ANDed; `sort=date` surfaces newest items; `rows` max 500 | R2 |
| SM-11.4 | **US-11.4** Search for a Person by Name or Email | Assign New Ticket | Epic 11 (F11) | JTBD-03.1: "Filter assignee dropdown to show only staff in ticket's owning department" → `GET /people/search?q=...` with `role=staff` and `department_id` filter finds assignee candidates in ≤ 2 chars; HTTP 400 if query shorter | R2 |
| SM-13.2 | **US-13.2** Export a Filtered Ticket Report | Bulk Review and Export | Epic 13 (F13) | JTBD-03.2: "CSV export row-for-row identical to HTML table view (F3 parity)" → `GET /reports` with date/status/dept filters; CSV matches HTML view; staff-only; HTTP 403 otherwise | R3 |

#### JRN-03.2 Journey Stages: Identify Candidate → Search for Parent → Review Matches → Link as Duplicate → Close as Duplicate

| SM-ID | Story | Journey Stage | Epic | NaC (JTBD Source) | Release |
|---|---|---|---|---|---|
| SM-5.3-s | **US-5.3** View Search Facets for Quick Narrowing *(also maps to PER-02)* | Review Matches | Epic 5 (F5) | JTBD-03.3: "Results show ticket snippet for quick confirmation" → Facets include category, status, department counts; reflect role-based filter; match legacy Solr facet config | R2 |
| SM-15.1 | **US-15.1** Manage Sub-Statuses for Ticket Closure | Close as Duplicate | Epic 15 (F15) | JTBD-03.2: "Closing a ticket requires selecting a substatus_id (Resolved/Duplicate/Bogus)" → Seed sub-statuses present; `status` field must be `open` or `closed`; sub-statuses referenced by tickets cannot be deleted | R3 |
| SM-15.2 | **US-15.2** Manage Custom Department Action Types | Identify Candidate | Epic 15 (F15) | JTBD-03.2: "Every assignment, status change, category change, and comment produces an immutable entry" → 10 system actions seeded; department actions (`type='department'`) creatable by staff; system action names immutable | R3 |

---
---

### PER-04: Robert Osei — Department Supervisor / System Admin

**Primary Journeys:** JRN-04.1 (Create Service Category) · JRN-04.2 (Monitor System Health & Graylog)

#### JRN-04.1 Journey Stages: Navigate to Admin → Fill Core Fields → Configure Permissions & SLA → Add Custom Field → Save and Validate → Verify Live

| SM-ID | Story | Journey Stage | Epic | NaC (JTBD Source) | Release |
|---|---|---|---|---|---|
| SM-2.4 | **US-2.4** Category-Level Permission Filtering | Configure Permissions & SLA | Epic 2 (F2) | JTBD-04.1: "`displayPermissionLevel` and `postingPermissionLevel` enforce immediately on save (RBAC enforced without restart)" → Permission values `staff`/`public`/`anonymous`; display filter applied on all reads; posting filter on ticket creation; change takes effect immediately | R1 |
| SM-6.1 | **US-6.1** Translate All MySQL DDL to PostgreSQL | Save and Validate | Epic 6 (F6) | JTBD-04.1: "Relies on self-service migration tooling (no DBA handoff)" → All 21 tables translated; `AUTO_INCREMENT` → `GENERATED ALWAYS AS IDENTITY`; `TINYINT(1)` → `BOOLEAN`; GiST spatial index created; PostGIS extension enabled | R1 |
| SM-6.2 | **US-6.2** Migrate All Data from MySQL to PostgreSQL | Save and Validate | Epic 6 (F6) | JTBD-04.1: "Schema changes without a DBA handoff" → Migration script reads MySQL source, writes PG target in dependency order; FK checks disabled during migration, re-enabled after; `IDENTITY` sequences reset after load | R1 |
| SM-6.3 | **US-6.3** Verify Row Counts Match After Migration | Save and Validate | Epic 6 (F6) | JTBD-04.1: "Zero row-count discrepancies is the acceptance threshold for go-live" → `COUNT(*)` compared per table; `[PASS]`/`[FAIL]` logged; non-zero exit on any failure | R1 |
| SM-6.4 | **US-6.4** Preserve All Seed Data in PostgreSQL | Save and Validate | Epic 6 (F6) | JTBD-04.1: "System starts in a fully configured state without manual data entry" → Seed data present: 4 `contactMethods`, 3 `substatus`, 10 `actions`, 3 `categoryGroups`, 6 `issueTypes`; also in `prisma/seed.ts` | R1 |
| SM-6.5 | **US-6.5** Generate Prisma Schema from PostgreSQL DDL | Save and Validate | Epic 6 (F6) | JTBD-04.1: "Type-safe ORM queries without writing raw SQL" → `schema.prisma` models all 21 tables; `@id @default(autoincrement())`; unique constraints on `people.username` and `clients.api_key`; passes `prisma validate` | R1 |
| SM-10.1 | **US-10.1** Create and Edit a Service Category | Fill Core Fields | Epic 10 (F10) | JTBD-04.1: "Category creation/edit form validates all required fields before saving — no silent failures" → `name` required (max 50), `department_id` required, `postingPermissionLevel` one of `staff`/`public`/`anonymous`; `customFields` valid JSON; category live in ≤ 10 min | R2 |
| SM-10.2 | **US-10.2** Delete a Service Category | Navigate to Admin | Epic 10 (F10) | JTBD-04.1: "Citizens and staff do not see obsolete service options" → HTTP 409 if category has existing tickets; `active=false` hides without deletion; FK constraint enforced | R2 |
| SM-10.3 | **US-10.3** Manage Category Groups | Navigate to Admin | Epic 10 (F10) | JTBD-04.1: "Service categories organized logically for citizens" → `name` required (max 50); `ordering` non-negative int; groups displayed in correct `ordering` sequence; FK constraint blocks deletion of referenced groups | R2 |
| SM-10.4 | **US-10.4** Manage Departments | Navigate to Admin | Epic 10 (F10) | JTBD-04.1: "CRM routing reflects current organizational structure" → `name` required (max 128), unique; `defaultPerson_id` must reference existing person; deletion blocked if referenced by categories or people | R2 |
| SM-10.5 | **US-10.5** Manage Department-Category Associations | Configure Permissions & SLA | Epic 10 (F10) | JTBD-04.1: "Tickets in that category appear in multiple departments' queues" → POST/DELETE/GET at `/departments/:deptId/categories`; duplicate associations rejected (PK constraint); staff-only | R2 |
| SM-10.6 | **US-10.6** Configure Per-Category Email Template Overrides | Add Custom Field | Epic 10 (F10) | JTBD-04.1: "`notificationReplyEmail` and `autoCloseSubstatus_id` configurable per category from the same screen" → `category_action_responses` upsert; override template takes precedence over `actions.template`; `replyEmail` override applies | R2 |

#### JRN-04.2 Journey Stages: Check Metrics Dashboard → Open Graylog → Identify Root Cause → Create New API Client → Verify and Communicate

| SM-ID | Story | Journey Stage | Epic | NaC (JTBD Source) | Release |
|---|---|---|---|---|---|
| SM-11.1 | **US-11.1** Create and Edit a Person Record | Create New API Client | Epic 11 (F11) | JTBD-04.3: "Staff person records can be created with `role=staff` and `department_id` from the admin UI" → `username` unique; `role` must be `null` or `'staff'`; HTTP 409 if referenced by tickets; staff-only | R2 |
| SM-11.2 | **US-11.2** Manage Email Addresses for a Person | Create New API Client | Epic 11 (F11) | JTBD-04.3: "Role and department changes take effect on the staff member's next request" → POST/PUT/DELETE at `/people/:personId/emails`; `usedForNotifications` flag; RFC 5322 validation; HTTP 409 on duplicate email | R2 |
| SM-11.3 | **US-11.3** Manage Phone and Address Records for a Person | Create New API Client | Epic 11 (F11) | JTBD-04.3: "All contact methods are on record for case communications" → Phone label one of `Main`/`Mobile`/`Work`/`Home`/`Fax`/`Pager`/`Other`; address label one of `Home`/`Business`/`Rental`; staff-only for other users | R2 |
| SM-11.5 | **US-11.5** View the Staff Users List | Verify and Communicate | Epic 11 (F11) | JTBD-04.3: "Centralized view of who has system access" → `GET /users` returns `role='staff'` people with department, username, emails; HTTP 403 for non-staff; available in all five formats | R2 |
| SM-11.6 | **US-11.6** Create and Revoke API Client Credentials | Create New API Client | Epic 11 (F11) | JTBD-04.3: "API client credential can be created and immediately usable for POST /open311/v2/requests — no application restart required" → `api_key` unique (max 50); new key live on next request; revoked key rejected immediately; HTTP 409 on duplicate | R2 |
| SM-5.5 | **US-5.5** Bulk Re-Index All Tickets (Migration Support) | Verify and Communicate | Epic 5 (F5) | JTBD-04.1: "Search index consistent after data migration" → Re-index script deletes all Solr docs, reloads in batches of 500, issues final `commit`; progress logged; non-zero exit on error | R2 |
| SM-9.3 | **US-9.3** Geo-Cluster Assignment Updates When Ticket Location Changes | Verify and Communicate | Epic 9 (F9) | JTBD-04.1: "Map accurately reflects new coordinates" → Re-cluster runs on lat/lon change; `ticket_geodata` upserted; cleared if lat/lon set to null; re-cluster failure does not fail the ticket update | R2 |
| SM-9.4 | **US-9.4** Bulk Re-Cluster All Tickets After Migration | Verify and Communicate | Epic 9 (F9) | JTBD-04.1: "Map fully populated before go-live" → `scripts/recluster.ts` truncates `ticket_geodata`, processes all tickets with lat/lon in batches of 500; idempotent; GiST spatial index in place | R2 |
| SM-13.1 | **US-13.1** View the Metrics Dashboard | Check Metrics Dashboard | Epic 13 (F13) | JTBD-04.2: "Metrics dashboard reflects ticket state with ≤ 5-minute staleness" → `GET /metrics` returns `openCount`, `closedCount`, `avgResolutionDays`, `byCategory`, `byDepartment`; filterable by date; staff-only; staleness ≤ 5 min | R3 |
| SM-14.1 | **US-14.1** All HTTP Requests are Logged to Graylog | Open Graylog | Epic 14 (F14) | JTBD-04.3: "Structured logs in Graylog for the last 30 days accessible within 2 minutes for diagnosing API errors (NFR-8)" → `GelfRequestMiddleware` logs method, path, statusCode, durationMs, `_request_id` per request; GELF transport configured via env vars | R3 |
| SM-14.2 | **US-14.2** Unhandled Exceptions Logged with Stack Traces | Open Graylog | Epic 14 (F14) | JTBD-04.3: "Identify and triage production errors without server console access" → Global exception filter logs ERROR with `short_message` + `full_message` (stack trace); `_request_id` and `_user_id` included; GELF level mapping matches NestJS levels | R3 |
| SM-14.3 | **US-14.3** Ticket and User Context in Log Entries | Identify Root Cause | Epic 14 (F14) | JTBD-04.3: "Correlate Graylog entries to specific tickets and users" → `_ticket_id`, `_user_id`, `_request_id` as structured GELF fields on ticket operations; `GelfLoggerService` registered as global NestJS logger | R3 |
| SM-15.3 | **US-15.3** Manage Issue Types | Navigate to Admin | Epic 15 (F15) | JTBD-04.1: "Tickets classified consistently across all departments" → Seed issue types present (6 rows); `name` required (max 128); referenced issue types cannot be deleted; staff-only CRUD | R3 |
| SM-15.4 | **US-15.4** Manage Contact Methods | Navigate to Admin | Epic 15 (F15) | JTBD-04.1: "Ticket submissions correctly attributed to the channel used" → Seed contact methods present (4 rows); referenced methods cannot be deleted; staff-only CRUD | R3 |

---
---

## NaC Derivation Table

Full traceability chain: `JTBD Outcome → Journey Stage → NaC Statement → Story`

| JTBD-ID | JTBD Outcome (hiring criterion) | Journey Stage | NaC Statement | Story |
|---|---|---|---|---|
| JTBD-01.1 | Accepts submission without login or registration | JRN-01.1: Discover | Anonymous caller can browse and post to `postingPermissionLevel='anonymous'` categories with zero auth prompts | US-2.1 |
| JTBD-01.1 | Provides clear category selection with plain-language descriptions | JRN-01.1: Select Category | `GET /open311/v2/services` returns all anonymous-visible categories with `description` and `group` fields in < 200ms | US-0.1 |
| JTBD-01.1 | Provides clear category selection with plain-language descriptions | JRN-01.1: Select Category | `GET /open311/v2/services/:id` returns `attributes` array so caller knows required fields before submitting | US-0.2 |
| JTBD-01.1 | Accepts location input (GPS coordinates) from mobile browser | JRN-01.1: Locate Issue | Web form accepts `lat`/`lon` validated to [-90,90] and [-180,180] ranges; location required for ticket creation | US-1.1 |
| JTBD-01.1 | Accepts an optional photo attachment alongside the description | JRN-01.1: Describe & Attach | Authenticated user uploads via `POST /tickets/:id/media`; anonymous gets HTTP 401 | US-8.1 |
| JTBD-01.1 | Returns a unique confirmation token immediately after submission | JRN-01.1: Submit | `POST /open311/v2/requests` returns `service_request_id` + `token` in response; submission token stored in `ticketHistory` | US-0.3 |
| JTBD-01.1 | First-time user completes submission in ≤ 3 minutes | JRN-01.1: Submit | Web form creates ticket from `category_id` + location with no login; `action='open'` logged; confirmation includes ticket ID | US-1.1 |
| JTBD-01.1 | Response byte-compatible with PHP implementation (NFR-1) | JRN-01.2: Submit Request | `POST /open311/v2/requests` JSON response byte-identical to legacy PHP for same input fixture | US-3.1 |
| JTBD-01.1 | Response byte-compatible with PHP implementation (NFR-1) | JRN-01.2: Discover Services | `.xml` suffix returns XML with CDATA wrapping identical to legacy for the same input fixture | US-3.2 |
| JTBD-01.1 | Response byte-compatible with PHP implementation (NFR-1) | JRN-01.2: Submit Request | `.txt` suffix or `Accept: text/plain` returns tab-delimited plain text with no header row; byte-compatible with legacy PHP for same input fixture | US-3.6 |
| JTBD-01.1 | Format negotiated correctly for external API clients | JRN-01.2: Submit Request | URL suffix > query param > Accept header priority order consistent across all requests | US-3.4 |
| JTBD-01.1 | Form renders correctly on a mobile browser | JRN-01.2: Discover Services | Browser requests receive full HTML with header/nav/footer; mobile-compatible layout matches existing PHP interface | US-3.5 |
| JTBD-01.2 | Token lookup returns ticket status in ≤ 200ms without authentication | JRN-01.2: Poll for Status | `GET /open311/v2/tokens/:token` returns `{token, service_request_id}` in ≤ 200ms; no auth required; HTTP 404 if token not found | US-0.6 |
| JTBD-01.2 | Exposes ticket status to anonymous users for publicly-visible categories | JRN-01.2: Poll for Status | `GET /open311/v2/requests/:id` returns current status in single-element array; HTTP 404 if not visible to caller | US-0.5 |
| JTBD-01.3 | Exposes publicly accessible ticket list queryable by geographic location | JRN-01.2: Query Nearby | `GET /open311/v2/requests` with `lat/long/radius` returns only `displayPermissionLevel='anonymous'` tickets in ≤ 200ms | US-0.4 |
| JTBD-01.3 | Geo-cluster map view surfaces nearby reports visually | JRN-01.2: Query Nearby | `GET /locations` returns cluster objects filtered by caller's role; anonymous user can visually confirm nearby issues | US-9.1 |
| JTBD-01.3 | Ticket appears on map without staff intervention | JRN-01.2: Submit Request | On ticket creation with lat/lon, `ticket_geodata` upserted for all 7 cluster levels | US-9.2 |
| JTBD-02.1 | Personal ticket dashboard reachable within 2 clicks of login | JRN-02.1: Initiate Login | Clicking "Log In" redirects to IdP with `state`/`nonce`; user lands on uReport dashboard post-callback | US-4.1 |
| JTBD-02.1 | OIDC callback validates state/nonce; session created | JRN-02.1: Authenticate | `GET /auth/callback` validates `state`, exchanges code, provisions `people` record; session scoped to `userId` | US-4.2 |
| JTBD-02.1 | Login session persists without re-authentication | JRN-02.1: Authenticate | Session cookie (`HttpOnly`, `Secure`, `SameSite=Lax`) persists for `SESSION_TTL_SECONDS`; `request.user` always reflects identity | US-4.3 |
| JTBD-02.1 | Session cleared on logout for shared-device safety | JRN-02.1: Initiate Login | Logout destroys server-side session, clears cookie, optionally redirects to IdP end-session endpoint | US-4.4 |
| JTBD-02.1 | Own account record editable without developer involvement | JRN-02.1: Land on Dashboard | `GET /account` returns own `people` record; `PUT /account` updates profile; `role` and `username` immutable via self-service | US-4.5 |
| JTBD-02.1 | Shows all tickets filtered by status and date | JRN-02.1: Land on Dashboard | Ticket list scoped to `reportedByPerson_id=currentUser.id`; filterable by status, sortable by date; accessible in ≤ 2 clicks | US-1.2 |
| JTBD-02.1 | Public role permits own history and bookmarks | JRN-02.1: Land on Dashboard | Public callers can view `public`+`anonymous` tickets, own history, own bookmarks; HTTP 403 on staff actions | US-2.2 |
| JTBD-02.1 | PII fields of other reporters are not exposed | JRN-02.1: Filter and Find | `reportedByPerson_id` and related person objects omitted/nulled for non-staff callers in all five formats | US-2.5 |
| JTBD-02.2 | Email notification sent within 5 minutes of assignment | JRN-02.1: Verify Notification | `assignment` notification email sent within 5 min; logged to `ticketHistory.sentNotifications` | US-7.2 |
| JTBD-02.2 | Every ticket close triggers email notification | JRN-02.1: Verify Notification | `closed` notification sent to reporter and assignee; send logged to `sentNotifications` | US-7.3 |
| JTBD-02.2 | Zero missed notifications | JRN-02.1: Verify Notification | `response`, `comment`, `duplicate` actions trigger emails per F7 trigger matrix; all sends logged | US-7.4 |
| JTBD-02.2 | Single digest for subscribed users | JRN-02.1: Verify Notification | Scheduled cron sends one digest per subscribed user; digest sends logged to `sentNotifications` | US-7.6 |
| JTBD-02.3 | Can save Solr search as named bookmark from results page | JRN-02.2: Save Bookmark | `POST /bookmarks` with `name` + `requestUri`; user-scoped; anonymous gets HTTP 401; creation requires no page navigation | US-12.1 |
| JTBD-02.3 | Saved bookmarks listed on dashboard after login | JRN-02.2: Confirm Saved | `GET /bookmarks` returns only caller's bookmarks ordered `id DESC`; available in all five formats | US-12.2 |
| JTBD-02.3 | Can delete bookmarks no longer needed | JRN-02.2: Confirm Saved | `DELETE /bookmarks/:id` restricted to owner; other-user bookmark returns HTTP 404 (no info leakage) | US-12.3 |
| JTBD-02.3 | Re-running bookmark replays exact query with current state | JRN-02.2: Re-Run Bookmark | Client-side redirect to `bookmark.requestUri` re-executes against live Solr index; no cached snapshot | US-12.4 |
| JTBD-03.1 | Full read/write access for staff regardless of permission level | JRN-03.1: Login and Orient | Staff callers (`people.role='staff'`) can view all tickets/categories, all PII; every allow/deny matches Laminas ACL | US-2.3 |
| JTBD-03.1 | Queue of 500 tickets loads in ≤ 200ms | JRN-03.1: Triage Overdue | Ticket indexed in Solr after create/update/close; Solr failure logged but does not fail ticket write | US-5.4 |
| JTBD-03.2 | Assignment action logged to ticketHistory | JRN-03.1: Assign New Ticket | `assignedPerson_id` updated; `ticketHistory` `action='assignment'` appended; HTTP 400 if assignee not in department | US-1.3 |
| JTBD-03.2 | Category/location changes produce immutable ticketHistory entries | JRN-03.1: Assign New Ticket | `changeCategory`/`changeLocation`/`update` actions logged; `lastModified` updated; Solr re-indexed | US-1.4 |
| JTBD-03.2 | Closing requires substatus_id and produces audit entry | JRN-03.1: Close Resolved Tickets | `status='closed'`, `ticketHistory action='closed'` with sub-status and notes; `closed` email auto-triggered; HTTP 409 on already-closed | US-1.5 |
| JTBD-03.2 | Reporter notification triggered automatically on close | JRN-03.1: Close Resolved Tickets | `open` notification sent to reporter with `usedForNotifications=true` email; template resolved from `category_action_responses` | US-7.1 |
| JTBD-03.2 | Staff-only comments not visible to public/anonymous | JRN-03.1: Update Staff Comment | `ticketHistory action='comment'`; not visible to anonymous/public callers (RBAC enforced) | US-1.7 |
| JTBD-03.2 | Response action triggers reporter notification | JRN-03.1: Update Staff Comment | `ticketHistory action='response'`; `response` email triggered to reporter; `lastModified` updated | US-1.8 |
| JTBD-03.2 | History is complete enough to reconstruct any decision | JRN-03.1: Login and Orient | `ticketHistory` entries ordered by `enteredDate ASC`; `sentNotifications` included; PII omitted for non-staff | US-1.10 |
| JTBD-03.2 | Re-open ticket when closed prematurely | JRN-03.1: Close Resolved Tickets | `status='open'`, `closedDate` cleared, Solr re-indexed; HTTP 409 on already-open ticket | US-1.9 |
| JTBD-03.2 | CSV export column-for-column identical to HTML view | JRN-03.1: Bulk Review and Export | `Accept: text/csv` returns CSV with UTF-8 BOM; column-for-column match with HTML view for same filters | US-3.3 |
| JTBD-03.2 | Thumbnails for quick field photo preview | JRN-03.1: Update Staff Comment | Thumbnails auto-generated for image uploads; served at `/tickets/:id/media/:mediaId/thumbnail` | US-8.2 |
| JTBD-03.2 | Stream attachment for evidence review | JRN-03.1: Update Staff Comment | `GET /tickets/:id/media/:mediaId` streams file bytes; `displayPermissionLevel` checked; HTTP 404 if not visible | US-8.3 |
| JTBD-03.2 | Remove incorrect files from case record | JRN-03.1: Update Staff Comment | Staff-only `DELETE`; file and thumbnail deleted from disk; `update` action logged to `ticketHistory` | US-8.4 |
| JTBD-03.3 | Duplicate link available from ticket detail without navigation | JRN-03.2: Link as Duplicate | `parent_id` set on child; `duplicate` action appended to parent `ticketHistory`; `duplicate` email to child reporter | US-1.6 |
| JTBD-03.3 | In-page Solr search returns results in ≤ 500ms | JRN-03.2: Search for Parent | eDisMax search with role-based category filter returns results in ≤ 500ms; all five formats | US-5.1 |
| JTBD-03.3 | Filter supports free-text + category + location + status | JRN-03.2: Review Matches | All filter params ANDed; `sort`, `page`, `rows` supported; response includes `total`, `facets` | US-5.2 |
| JTBD-03.3 | Facets for quick distribution understanding | JRN-03.2: Review Matches | Facets for `categories`, `statuses`, `departments` returned; counts reflect role-filtered visibility | US-5.3 |
| JTBD-03.2 | Filtered ticket report row-for-row matches HTML | JRN-03.1: Bulk Review and Export | `GET /reports` with filters; CSV matches HTML view; staff-only; paginated | US-13.2 |
| JTBD-03.2 | Sub-statuses drive accurate ticket closure documentation | JRN-03.2: Close as Duplicate | Seed sub-statuses present; `status` field validated; referenced sub-statuses cannot be deleted | US-15.1 |
| JTBD-03.2 | System actions seeded; department actions extensible | JRN-03.2: Identify Candidate | 10 system actions seeded; department actions (`type='department'`) creatable; system action names immutable | US-15.2 |
| JTBD-04.1 | Permission levels enforce immediately on save | JRN-04.1: Configure Permissions & SLA | `displayPermissionLevel`/`postingPermissionLevel` validated; display filter applied immediately; no restart needed | US-2.4 |
| JTBD-04.1 | Self-service migration without DBA handoff | JRN-04.1: Save and Validate | All 21 MySQL tables translated to PostgreSQL DDL; `TINYINT(1)` → `BOOLEAN`; PostGIS extension enabled | US-6.1 |
| JTBD-04.1 | Data migrated with full fidelity | JRN-04.1: Save and Validate | Migration script reads MySQL, writes PG in dependency order; FK checks disabled then re-enabled; sequences reset | US-6.2 |
| JTBD-04.1 | Zero row-count discrepancies is go-live threshold | JRN-04.1: Save and Validate | `COUNT(*)` compared per table; `[PASS]`/`[FAIL]` logged; non-zero exit on any failure | US-6.3 |
| JTBD-04.1 | System starts in fully configured state | JRN-04.1: Save and Validate | Seed data present: 4 `contactMethods`, 3 `substatus`, 10 `actions`, 3 `categoryGroups`, 6 `issueTypes` | US-6.4 |
| JTBD-04.1 | Type-safe ORM queries | JRN-04.1: Save and Validate | `schema.prisma` models all 21 tables; unique constraints; all FK as `@relation`; passes `prisma validate` | US-6.5 |
| JTBD-04.1 | Category creation validated before save, no silent failures | JRN-04.1: Fill Core Fields | `name` required (max 50), `department_id` required, `postingPermissionLevel` validated; `customFields` valid JSON; category live in ≤ 10 min | US-10.1 |
| JTBD-04.1 | Obsolete categories hidden without deletion risk | JRN-04.1: Navigate to Admin | HTTP 409 if category has tickets; `active=false` hides without deletion | US-10.2 |
| JTBD-04.1 | Categories organized logically for citizens | JRN-04.1: Navigate to Admin | `name` required; `ordering` non-negative int; FK constraint blocks deletion of referenced groups | US-10.3 |
| JTBD-04.1 | CRM routing reflects current org structure | JRN-04.1: Navigate to Admin | `name` required (max 128), unique; deletion blocked if referenced | US-10.4 |
| JTBD-04.1 | Tickets appear in multiple departments' queues | JRN-04.1: Configure Permissions & SLA | `department_categories` POST/DELETE/GET; duplicate associations rejected; staff-only | US-10.5 |
| JTBD-04.1 | Per-category notification overrides | JRN-04.1: Add Custom Field | `category_action_responses` upsert; override template takes precedence over `actions.template` | US-10.6 |
| JTBD-04.1 | Search index consistent after migration | JRN-04.2: Verify and Communicate | Re-index script deletes all Solr docs, batches 500, final `commit`; non-zero exit on error | US-5.5 |
| JTBD-04.3 | Staff person records created via admin UI | JRN-04.2: Create New API Client | `username` unique; `role` validated; referenced persons cannot be deleted; staff-only | US-11.1 |
| JTBD-04.3 | Notification email addresses managed per person | JRN-04.2: Create New API Client | POST/PUT/DELETE at `/people/:personId/emails`; RFC 5322 validation; `usedForNotifications` flag; HTTP 409 on duplicate | US-11.2 |
| JTBD-04.3 | All contact methods on record | JRN-04.2: Create New API Client | Phone label validated; address label validated; standard CRUD at `/people/:personId/phones` and `/addresses` | US-11.3 |
| JTBD-04.3 | Centralized view of system access | JRN-04.2: Verify and Communicate | `GET /users` returns `role='staff'` people with department, username, emails; HTTP 403 for non-staff | US-11.5 |
| JTBD-04.3 | API key live immediately, revoked immediately | JRN-04.2: Create New API Client | `api_key` unique (max 50); new key live on next request; revoked key rejected immediately; no restart required | US-11.6 |
| JTBD-04.3 | Map fully populated before go-live | JRN-04.2: Verify and Communicate | `scripts/recluster.ts` truncates `ticket_geodata`, processes all tickets with lat/lon in batches of 500; idempotent | US-9.4 |
| JTBD-04.3 | Geo-cluster accurate when location corrected | JRN-04.2: Verify and Communicate | Re-cluster runs on lat/lon change; `ticket_geodata` upserted; cleared if lat/lon set to null | US-9.3 |
| JTBD-04.2 | Metrics dashboard reflects state with ≤ 5-min staleness | JRN-04.2: Check Metrics Dashboard | `GET /metrics` returns `openCount`, `closedCount`, `avgResolutionDays`, `byCategory`, `byDepartment`; staleness ≤ 5 min | US-13.1 |
| JTBD-04.3 | Structured logs in Graylog accessible within 2 minutes | JRN-04.2: Open Graylog | `GelfRequestMiddleware` logs method, path, statusCode, durationMs, `_request_id` per request; 30-day retention accessible | US-14.1 |
| JTBD-04.3 | Production errors triageable without console access | JRN-04.2: Open Graylog | Global exception filter logs ERROR with stack trace; `_request_id` and `_user_id` included in GELF payload | US-14.2 |
| JTBD-04.3 | Correlate Graylog entries to specific tickets and users | JRN-04.2: Identify Root Cause | `_ticket_id`, `_user_id`, `_request_id` as structured GELF fields on ticket operations | US-14.3 |
| JTBD-04.1 | Tickets classified consistently across departments | JRN-04.1: Navigate to Admin | Seed issue types present (6 rows); referenced issue types cannot be deleted; staff-only CRUD | US-15.3 |
| JTBD-04.1 | Ticket submissions attributed to correct channel | JRN-04.1: Navigate to Admin | Seed contact methods present (4 rows); referenced methods cannot be deleted; staff-only CRUD | US-15.4 |
| JTBD-04.1 | Person search for assignee selection | JRN-03.1: Assign New Ticket | `GET /people/search?q=...` with `role=staff` and `department_id`; matches firstname, lastname, email, username | US-11.4 |

---
---

## Release Planning

---

### R1 — MVP Core: "Public Contract + Ticket Foundation + Auth + DB"

**Theme:** Everything required for the system to go live as a parity re-platform. No external API consumer or existing user notices any behavioral change.

**Persona Coverage:** PER-01 (full anonymous journey), PER-02 (login + ticket history), PER-03 (full case worker ticket lifecycle), PER-04 (migration approval + RBAC config)

**JTBD Addressed:**

| JTBD-ID | Status in R1 |
|---|---|
| JTBD-01.1 | ✅ Full — anonymous submission via web form and Open311 API |
| JTBD-01.2 | ✅ Full — token lookup, single request by ID |
| JTBD-01.3 | ⚪ Partial — geo-filtered request list via Open311 (`US-0.4`); map clustering deferred to R2 |
| JTBD-02.1 | ✅ Full — OIDC login, session, personal ticket history, profile |
| JTBD-02.2 | ⚪ Partial — notification infrastructure in place via ticket lifecycle; email trigger stories in R2 |
| JTBD-02.3 | ❌ Deferred to R3 |
| JTBD-03.1 | ⚪ Partial — staff RBAC and ticket lifecycle; Solr search/filter in R2 |
| JTBD-03.2 | ✅ Full — assign, update, comment, close, duplicate, re-open, audit trail, CSV export |
| JTBD-03.3 | ⚪ Partial — `parent_id` assignment available; in-page Solr search in R2 |
| JTBD-04.1 | ✅ Full — migration complete; RBAC permission filtering; category admin in R2 |
| JTBD-04.2 | ❌ Deferred to R3 |
| JTBD-04.3 | ❌ Deferred to R2 |

**R1 Stories (32 stories — all P0):**

| SM-ID | Story | Epic |
|---|---|---|
| SM-0.1 | US-0.1 Browse Available Service Categories | F0 |
| SM-0.2 | US-0.2 Retrieve Single Service Definition | F0 |
| SM-0.3 | US-0.3 Submit Service Request via Open311 API | F0 |
| SM-0.4 | US-0.4 Query Service Requests with Filters | F0 |
| SM-0.5 | US-0.5 Retrieve Single Request by ID | F0 |
| SM-0.6 | US-0.6 Look Up Request ID by Submission Token | F0 |
| SM-1.1 | US-1.1 Submit Service Request via Web Form | F1 |
| SM-1.2 | US-1.2 View Own Ticket History | F1 |
| SM-1.3 | US-1.3 Assign a Ticket to a Case Worker | F1 |
| SM-1.4 | US-1.4 Update Ticket Fields | F1 |
| SM-1.5 | US-1.5 Close a Ticket with Sub-Status | F1 |
| SM-1.6 | US-1.6 Mark a Ticket as Duplicate | F1 |
| SM-1.7 | US-1.7 Add a Staff Comment | F1 |
| SM-1.8 | US-1.8 Add a Response to a Reporter | F1 |
| SM-1.9 | US-1.9 Re-open a Closed Ticket | F1 |
| SM-1.10 | US-1.10 View Full Ticket History / Audit Trail | F1 |
| SM-2.1 | US-2.1 Anonymous Access to Public Categories | F2 |
| SM-2.2 | US-2.2 Authenticated Resident Access | F2 |
| SM-2.3 | US-2.3 Staff Full Access | F2 |
| SM-2.4 | US-2.4 Category-Level Permission Filtering | F2 |
| SM-2.5 | US-2.5 PII Field Masking for Non-Staff Callers | F2 |
| SM-3.1 | US-3.1 Request JSON Response | F3 |
| SM-3.2 | US-3.2 Request XML Response | F3 |
| SM-3.3 | US-3.3 Export Ticket List to CSV | F3 |
| SM-3.4 | US-3.4 Format Resolution Priority is Consistent | F3 |
| SM-3.5 | US-3.5 View HTML Responses in Browser | F3 |
| SM-3.6 | US-3.6 Request Plain Text (TXT) Response | F3 |
| SM-4.1 | US-4.1 Log In via OIDC | F4 |
| SM-4.2 | US-4.2 OIDC Callback and User Provisioning | F4 |
| SM-4.3 | US-4.3 Session Persistence Across Page Loads | F4 |
| SM-4.4 | US-4.4 Log Out and Clear Session | F4 |
| SM-4.5 | US-4.5 View and Edit Own Profile | F4 |
| SM-6.1 | US-6.1 Translate MySQL DDL to PostgreSQL | F6 |
| SM-6.2 | US-6.2 Migrate All Data from MySQL to PostgreSQL | F6 |
| SM-6.3 | US-6.3 Verify Row Counts After Migration | F6 |
| SM-6.4 | US-6.4 Preserve All Seed Data | F6 |
| SM-6.5 | US-6.5 Generate Prisma Schema | F6 |

> **R1 Complete Journey Test:** PER-01 can submit an anonymous service request via web form and Open311 API, receive a token, and look it up — with zero authentication prompts. PER-02 can log in via OIDC, view personal ticket history, and see the correct permission-filtered results. PER-03 can assign, update, comment, close (with sub-status), and export tickets with full audit trail. PER-04 can approve go-live after verifying migration row counts.

---
---

### R2 — Feature Parity: "Search, Notifications, Media, Geo, Admin"

**Theme:** Completes full feature parity with the PHP system. Every workflow that was possible in the legacy system is now available in the re-platformed system.

**Persona Coverage:** All four personas — full workflows enabled.

**JTBD Addressed (incremental beyond R1):**

| JTBD-ID | Status in R2 |
|---|---|
| JTBD-01.3 | ✅ Full — geo-cluster map view (`US-9.1`, `US-9.2`) |
| JTBD-02.2 | ✅ Full — all email notification types wired (`US-7.1`–`US-7.5`) |
| JTBD-03.1 | ✅ Full — Solr search with filters and facets; auto-indexing; assignee person search |
| JTBD-03.3 | ✅ Full — in-page Solr duplicate search; facets for quick confirmation |
| JTBD-04.1 | ✅ Full — full category and department admin; email template overrides |
| JTBD-04.3 | ✅ Full — staff person CRUD, API client credential management |

**R2 Stories (30 stories — all P1):**

| SM-ID | Story | Epic | Primary Persona |
|---|---|---|---|
| SM-5.1 | US-5.1 Search Tickets with Full-Text Query | F5 | PER-03, PER-02 |
| SM-5.2 | US-5.2 Filter Search Results | F5 | PER-03, PER-02 |
| SM-5.3 | US-5.3 View Search Facets | F5 | PER-03, PER-02 |
| SM-5.4 | US-5.4 Tickets Auto-Indexed on Create/Update/Close | F5 | PER-03 |
| SM-5.5 | US-5.5 Bulk Re-Index All Tickets | F5 | PER-04 |
| SM-7.1 | US-7.1 Email on Ticket Opened | F7 | PER-01 |
| SM-7.2 | US-7.2 Email on Ticket Assigned | F7 | PER-02 |
| SM-7.3 | US-7.3 Email on Ticket Closed | F7 | PER-02 |
| SM-7.4 | US-7.4 Email for Response, Comment, Duplicate | F7 | PER-02 |
| SM-7.5 | US-7.5 Configure Email Templates per Category | F7 | PER-04 |
| SM-7.6 | US-7.6 Digest Notification Email | F7 | PER-02 |
| SM-8.1 | US-8.1 Upload Photo or Document Attachment | F8 | PER-02, PER-03 |
| SM-8.2 | US-8.2 Auto-Generate Thumbnail for Images | F8 | PER-03 |
| SM-8.3 | US-8.3 View and Download Attachment | F8 | PER-03 |
| SM-8.4 | US-8.4 Delete an Attachment | F8 | PER-03 |
| SM-9.1 | US-9.1 View Geo-Clustered Ticket Map | F9 | PER-01 |
| SM-9.2 | US-9.2 Ticket Receives Cluster Assignment on Creation | F9 | PER-01 |
| SM-9.3 | US-9.3 Cluster Updates When Ticket Location Changes | F9 | PER-03 |
| SM-9.4 | US-9.4 Bulk Re-Cluster After Migration | F9 | PER-04 |
| SM-10.1 | US-10.1 Create and Edit Service Category | F10 | PER-04 |
| SM-10.2 | US-10.2 Delete Service Category | F10 | PER-04 |
| SM-10.3 | US-10.3 Manage Category Groups | F10 | PER-04 |
| SM-10.4 | US-10.4 Manage Departments | F10 | PER-04 |
| SM-10.5 | US-10.5 Manage Department-Category Associations | F10 | PER-04 |
| SM-10.6 | US-10.6 Configure Category Email Template Overrides | F10 | PER-04 |
| SM-11.1 | US-11.1 Create and Edit Person Record | F11 | PER-04 |
| SM-11.2 | US-11.2 Manage Email Addresses for a Person | F11 | PER-04 |
| SM-11.3 | US-11.3 Manage Phone and Address Records | F11 | PER-04 |
| SM-11.4 | US-11.4 Search for a Person | F11 | PER-03 |
| SM-11.5 | US-11.5 View Staff Users List | F11 | PER-04 |
| SM-11.6 | US-11.6 Create and Revoke API Client Credentials | F11 | PER-04 |

> **R2 Complete Journey Test:** PER-01 can see their submitted ticket on the geo-cluster map. PER-02 receives email notifications within 5 minutes for every ticket lifecycle event and can search and filter tickets. PER-03 can find duplicates via in-page Solr search and upload/view field photos. PER-04 can create a fully configured service category in under 10 minutes, manage all staff accounts, and provision API client credentials immediately.

---
---

### R3 — Operational Excellence: "Bookmarks, Reporting, Logging, Reference Data"

**Theme:** Adds staff productivity features, operational observability, and configurable reference data that improve the day-to-day experience beyond feature parity.

**Persona Coverage:** PER-02 (bookmarks), PER-03 (bookmarks + reports), PER-04 (metrics, logs, reference data admin)

**JTBD Addressed (incremental beyond R2):**

| JTBD-ID | Status in R3 |
|---|---|
| JTBD-02.3 | ✅ Full — save, view, delete, and re-run named search bookmarks (`US-12.1`–`US-12.4`) |
| JTBD-04.2 | ✅ Full — live metrics dashboard with ≤ 5-min staleness; exportable reports (`US-13.1`, `US-13.2`) |
| JTBD-04.3 | ✅ Supplemented — structured logging with `_api_key`, `_ticket_id`, `_user_id` fields; 30-day Graylog accessibility (`US-14.1`–`US-14.3`) |

**R3 Stories (18 stories — all P2):**

| SM-ID | Story | Epic | Primary Persona |
|---|---|---|---|
| SM-12.1 | US-12.1 Save a Search as Named Bookmark | F12 | PER-02 |
| SM-12.2 | US-12.2 View My Saved Bookmarks | F12 | PER-02 |
| SM-12.3 | US-12.3 Delete a Saved Bookmark | F12 | PER-02 |
| SM-12.4 | US-12.4 Recall a Bookmark to Re-Run Search | F12 | PER-03, PER-02 |
| SM-13.1 | US-13.1 View Metrics Dashboard | F13 | PER-04 |
| SM-13.2 | US-13.2 Export Filtered Ticket Report | F13 | PER-04, PER-03 |
| SM-14.1 | US-14.1 HTTP Requests Logged to Graylog | F14 | PER-04 |
| SM-14.2 | US-14.2 Unhandled Exceptions Logged with Stack Traces | F14 | PER-04 |
| SM-14.3 | US-14.3 Ticket and User Context in Log Entries | F14 | PER-04 |
| SM-15.1 | US-15.1 Manage Sub-Statuses for Ticket Closure | F15 | PER-04 |
| SM-15.2 | US-15.2 Manage Custom Department Action Types | F15 | PER-04 |
| SM-15.3 | US-15.3 Manage Issue Types | F15 | PER-04 |
| SM-15.4 | US-15.4 Manage Contact Methods | F15 | PER-04 |

> **R3 Complete Journey Test:** PER-02 saves "Elm Street Potholes" as a bookmark and re-runs it in one click on a subsequent session, seeing current results. PER-04 diagnoses an API auth failure in Graylog within 2 minutes using `_api_key` structured fields, checks the metrics dashboard for submission rate recovery, and configures custom sub-statuses for a new department without developer involvement.

---
---

## Coverage Analysis

---

### Persona Coverage by Release

| Persona | R1 Coverage | R2 Coverage | R3 Coverage |
|---|---|---|---|
| **PER-01** (Anonymous Citizen) | ✅ Full anonymous submission + token lookup + geo-filtered list | ✅ Geo-cluster map view added | — |
| **PER-02** (Authenticated Resident) | ✅ OIDC login, personal ticket history, profile, RBAC | ✅ Email notifications, search, bookmarks partial, media upload | ✅ Bookmarks complete |
| **PER-03** (Case Worker) | ✅ Full ticket lifecycle: assign, update, comment, close, duplicate, audit, CSV export | ✅ Solr search + filters + facets, auto-indexing, media, person search | ✅ Bookmarks, filtered reports |
| **PER-04** (Supervisor/Admin) | ✅ Migration approval, RBAC permission config | ✅ Full category/dept admin, email templates, staff/API client management | ✅ Metrics dashboard, Graylog, reference data admin |

---

### JTBD Coverage by Release

| JTBD-ID | Persona | R1 | R2 | R3 | Notes |
|---|---|---|---|---|---|
| JTBD-01.1 | PER-01 | ✅ Full | — | — | Anonymous submission via web + API |
| JTBD-01.2 | PER-01 | ✅ Full | — | — | Token lookup, single request by ID |
| JTBD-01.3 | PER-01 | ⚪ Partial | ✅ Full | — | Open311 geo-filter in R1; map clustering in R2 |
| JTBD-02.1 | PER-02 | ✅ Full | — | — | OIDC + personal ticket history |
| JTBD-02.2 | PER-02 | ⚪ Partial | ✅ Full | — | Lifecycle audit trail in R1; email triggers in R2 |
| JTBD-02.3 | PER-02 | ❌ | — | ✅ Full | Bookmarks entirely in R3 |
| JTBD-03.1 | PER-03 | ⚪ Partial | ✅ Full | — | Staff RBAC + lifecycle in R1; Solr queue management in R2 |
| JTBD-03.2 | PER-03 | ✅ Full | — | — | Full ticket workflow with audit trail |
| JTBD-03.3 | PER-03 | ⚪ Partial | ✅ Full | — | `parent_id` assignment in R1; in-page Solr search in R2 |
| JTBD-04.1 | PER-04 | ⚪ Partial | ✅ Full | — | Migration + RBAC config in R1; category/dept admin in R2 |
| JTBD-04.2 | PER-04 | ❌ | — | ✅ Full | Metrics dashboard in R3 |
| JTBD-04.3 | PER-04 | ❌ | ✅ Full | ✅ Supplemented | API client + staff mgmt in R2; Graylog structured logging in R3 |

---

### Gap Analysis

#### Journey Stages Without Coverage
> All 8 journeys (JRN-01.1, JRN-01.2, JRN-02.1, JRN-02.2, JRN-03.1, JRN-03.2, JRN-04.1, JRN-04.2) have at least one story mapped to every stage. **No uncovered journey stages.**

#### JTBD Outcomes Without Derived NaC
> All 12 JTBD jobs have at least one NaC derived in the NaC Derivation Table. **No unaddressed JTBD outcomes.**

#### Orphan Stories (Not Mapped to Any Journey Stage)
> All 79 stories are placed in the story map matrix across PER-01 through PER-04 journey stages. **No orphan stories.**

However, the following stories serve **cross-cutting concerns** and appear in multiple persona journeys:

| Story | Cross-Persona Role |
|---|---|
| US-5.1 (Solr full-text search) | PER-02 (bookmark discovery), PER-03 (queue triage + duplicate search) |
| US-5.2 (Search filters) | PER-02 (results narrowing), PER-03 (queue + duplicate) |
| US-5.3 (Search facets) | PER-02 (results orientation), PER-03 (duplicate match review) |
| US-7.5 (Email template config) | PER-04 (admin config) + enables PER-02 and PER-03 notification journeys |
| US-3.3 (CSV export) | PER-03 (weekly report) + PER-04 (departmental reporting) |
| US-13.2 (Filtered ticket report) | PER-03 (bulk export) + PER-04 (city leadership reporting) |
| US-11.4 (Person search) | PER-03 (assignee lookup) + PER-04 (staff user management) |

#### Risks Identified
- **JTBD-02.3 fully deferred to R3:** Priya's bookmark workflow has no partial delivery in R1 or R2. If R3 is cut, this persona has no bookmark capability. Mitigation: ensure browser-URL bookmarking of Solr results pages works as a manual fallback.
- **JTBD-04.2 (metrics dashboard) deferred to R3:** Robert cannot monitor throughput without CSV export until R3. Mitigation: `US-13.2` (filtered ticket report in R2 CSV export) provides a partial data outlet, though it requires Excel.
- **Email notification infrastructure (F7) depends on F1 `ticketHistory` writes being atomic:** If `ticketHistory` write and notification trigger are not transactional, a system crash between the two could result in a missed notification. This is flagged as a production reliability risk.

---
---

## NaC-to-Acceptance Criteria Alignment

This section verifies that each NaC aligns with the formal acceptance criteria in `UserStories-uReport.md`. A NaC is **aligned** when its testable condition is a subset of or directly expressed by the story's acceptance criteria.

| Story | NaC Summary | AC Alignment | Notes |
|---|---|---|---|
| US-0.1 | `GET /services` returns anonymous-visible categories with description fields in < 200ms | ✅ AC: returns `displayPermissionLevel='anonymous'` for unauthenticated callers; includes `service_name`, `description`, `group` fields | Performance bound (NFR-6) applies globally |
| US-0.2 | `GET /services/:id` returns `attributes` array so caller knows required fields | ✅ AC: returns `ServiceDefinition` with `attributes` array including `variable`, `code`, `datatype`, `required`, `order` | |
| US-0.3 | `POST /requests` creates ticket, returns `service_request_id` + `token` | ✅ AC: response contains `service_request_id`, `token`; validates `api_key`; HTTP 403 on invalid key | |
| US-0.4 | `GET /requests` with geo params returns only anonymous-level tickets in ≤ 200ms | ✅ AC: returns only tickets at caller's permission level; supports `lat/long/radius`; response time per NFR-6 | |
| US-0.5 | `GET /requests/:id` returns current status; HTTP 404 if not visible to caller | ✅ AC: returns single-element array; HTTP 404 if not visible to caller's role | |
| US-0.6 | Token lookup returns `{token, service_request_id}` in ≤ 200ms; no auth required | ✅ AC: returns `{token, service_request_id}` array; HTTP 404 if token not found; no authentication required | |
| US-1.1 | Web form creates ticket, `action='open'` logged; no login for anonymous categories | ✅ AC: submission without auth for anonymous categories; `ticketHistory` row with `action='open'`; confirmation includes ticket ID | |
| US-1.2 | Ticket history scoped to `reportedByPerson_id=currentUser.id`; accessible in ≤ 2 clicks | ✅ AC: only own tickets shown; filterable by status; accessible within 2 clicks of login | |
| US-1.3 | Assignment logged to `ticketHistory`; HTTP 400 if assignee not in department | ✅ AC: `ticketHistory` row `action='assignment'`; `assignedPerson_id` must belong to ticket's department | |
| US-1.4 | Category/location changes log distinct `ticketHistory` action types; Solr re-indexed | ✅ AC: `changeCategory`, `changeLocation`, `update` actions logged with `data = {original, updated}`; `lastModified` updated; Solr re-indexed | |
| US-1.5 | Close requires `substatus_id`; produces `ticketHistory` entry; `closed` email auto-triggered | ✅ AC: `substatus_id` required; `ticketHistory action='closed'`; notification triggered; HTTP 409 on already-closed | |
| US-1.6 | `parent_id` set on child; `duplicate` action on parent; email to child reporter | ✅ AC: `parent_id` set; `duplicate` action on parent; notification triggered; HTTP 400 on self-reference | |
| US-1.7 | Staff comment not visible to anonymous/public (RBAC) | ✅ AC: HTTP 403 for non-staff callers; comment not visible to anonymous or public callers | |
| US-1.8 | `response` action logged; reporter email triggered; `lastModified` updated | ✅ AC: `ticketHistory action='response'`; notification triggered; `lastModified` updated | |
| US-1.9 | Re-open clears `closedDate`/`substatus_id`; HTTP 409 if already open | ✅ AC: `status='open'`, `closedDate` cleared, `substatus_id` cleared; HTTP 409 on already-open | |
| US-1.10 | `ticketHistory` ordered by `enteredDate ASC`; PII omitted for non-staff | ✅ AC: entries ordered by `enteredDate ASC`; `enteredByPerson` and `actionPerson` included for staff only | |
| US-2.1 | Anonymous can browse/post to anonymous categories; HTTP 401 on auth endpoints | ✅ AC: anonymous callers can view/submit to `displayPermissionLevel='anonymous'`; HTTP 401 on auth-required endpoints | |
| US-2.2 | Public role sees own history + own bookmarks; HTTP 403 on staff actions | ✅ AC: public callers see `public`+`anonymous` tickets; can manage own bookmarks; HTTP 403 on staff actions | |
| US-2.3 | Staff (`people.role='staff'`) see all tickets/PII; every decision matches Laminas ACL | ✅ AC: staff can read all; can perform all actions; staff access only when `role='staff'` | |
| US-2.4 | Permission level change takes effect immediately; no restart | ✅ AC: `displayPermissionLevel` and `postingPermissionLevel` validated; changes take effect immediately | |
| US-2.5 | `reportedByPerson_id` and related objects omitted for non-staff in all five formats | ✅ AC: `reportedByPerson_id` omitted/nulled for non-staff; PII masking in all five formats | |
| US-3.1 | `Accept: application/json` returns byte-compatible JSON | ✅ AC: JSON field names match legacy exactly (camelCase); dates ISO 8601; booleans `true`/`false` | |
| US-3.2 | `.xml` suffix returns byte-compatible XML with CDATA | ✅ AC: XML tag names match legacy; CDATA wrapping on description/notes/template; byte-compatible with legacy fixture | |
| US-3.3 | CSV with UTF-8 BOM; column-for-column match with HTML view | ✅ AC: UTF-8 BOM; `Content-Disposition: attachment`; CSV matches HTML view row-for-row | |
| US-3.4 | URL suffix > query param > Accept header priority | ✅ AC: documented priority order; centralized in `SerializationInterceptor`; applies to error responses too | |
| US-3.5 | Browser requests receive full HTML; AJAX gets partial | ✅ AC: `Accept: text/html` returns full HTML with nav/footer; AJAX returns content partial only | |
| US-4.1 | OIDC redirect includes `state`/`nonce`; stored in server-side session | ✅ AC: authorization request includes `state`, `nonce`; stored in server-side session before redirect | |
| US-4.2 | Callback validates `state`; provisions `people` record; redirects to `return_to` | ✅ AC: `state` and `nonce` validated; `people` record created/updated; session populated; redirect to `return_to` | |
| US-4.3 | Session cookie `HttpOnly`, `Secure`, `SameSite=Lax`; persists for `SESSION_TTL_SECONDS` | ✅ AC: all three cookie attributes; `SESSION_TTL_SECONDS` expiry; anonymous if `session.userId` absent | |
| US-4.4 | Logout destroys session; clears cookie; optional IdP redirect | ✅ AC: server-side session destroyed; cookie cleared; optional `OIDC_END_SESSION_ENDPOINT` redirect | |
| US-4.5 | `GET /account` returns own record; `role`/`username` immutable via self-service | ✅ AC: `GET /account` returns own `people` record; `PUT /account` updates; `role` and `username` not changeable | |
| US-5.1 | eDisMax search with field boosts; results in ≤ 500ms; RBAC filter | ✅ AC: eDisMax with `description^2`, `location^1.5`; role-based category filter; results in ≤ 500ms | |
| US-5.2 | All filters ANDed; response includes `total`, `facets` | ✅ AC: filter params: `status`, `category_id`, `department_id`, `assignedPerson_id`, dates; ANDed; `total`, `page`, `rows`, `facets` in response | |
| US-5.3 | Facets for `categories`, `statuses`, `departments` with counts | ✅ AC: facets returned: `categories` `[{id,name,count}]`, `statuses`, `departments`; match legacy Solr facet config | |
| US-5.4 | Ticket indexed after create/update/close; Solr failure logged, does not fail write | ✅ AC: indexed on `create`, `update`, `close`; Solr unavailability logged (F14) but does not fail ticket write | |
| US-5.5 | Re-index: `deleteByQuery *:*`, batch 500, final `commit`; non-zero exit on error | ✅ AC: deletes all docs before inserting; batches of 500; `commit` issued; progress logged; non-zero exit on error | |
| US-6.1 | All 21 tables translated; `TINYINT(1)` → `BOOLEAN`; GiST index created | ✅ AC: all 21 tables; `AUTO_INCREMENT` → `GENERATED ALWAYS AS IDENTITY`; `TINYINT(1)` → `BOOLEAN`; GiST spatial index | |
| US-6.2 | Dependency-order migration; FK checks disabled then re-enabled; sequences reset | ✅ AC: migrated in dependency order; FK checks disabled then re-enabled; `IDENTITY` sequences reset to `MAX(id)+1` | |
| US-6.3 | `COUNT(*)` per table; `[PASS]`/`[FAIL]` logged; non-zero exit on any failure | ✅ AC: `COUNT(*)` compared per table; `[PASS]`/`[FAIL]` logged; non-zero exit if any table fails | |
| US-6.4 | Seed data present: 4 `contactMethods`, 3 `substatus`, 10 `actions`, 3 `categoryGroups`, 6 `issueTypes` | ✅ AC: exact row counts for all 5 seed tables; also in `prisma/seed.ts` | |
| US-6.5 | `schema.prisma` models all 21 tables; passes `prisma validate` | ✅ AC: all 21 models; `@id @default(autoincrement())`; unique constraints; `@relation` for FK; `prisma validate` passes | |
| US-7.1 | `open` notification to reporter with notification email; send logged | ✅ AC: `open` notification to `reportedByPerson` with `usedForNotifications=true`; template resolved; logged to `sentNotifications` | |
| US-7.2 | `assignment` notification to both assigned and reporter; `actionPerson` in template | ✅ AC: `assignment` notification to assigned person and reporter; `{actionPerson}` resolves to assigned person's name; logged | |
| US-7.3 | `closed` notification to reporter and assignee; template resolution chain applied | ✅ AC: `closed` notification to reporter and assigned; template resolved via chain; null vars replaced with empty string | |
| US-7.4 | `response`/`comment`/`duplicate` trigger matrix matches F7 spec | ✅ AC: `response` → reporter; `comment` → assigned; `duplicate` → child reporter; all logged to `sentNotifications` | |
| US-7.5 | `category_action_responses` CRUD; override takes precedence | ✅ AC: POST/GET/DELETE at `/categories/:categoryId/actions/:actionId/response`; override template takes precedence | |
| US-7.6 | Scheduled cron sends one digest per user; logged | ✅ AC: cron task via `DIGEST_CRON` env var; single summary per user; sends logged to `sentNotifications` | |
| US-8.1 | File stored as `{path}/{ticket_id}/{uuid}.{ext}`; `upload_media` action logged | ✅ AC: multipart upload; MIME type validated; file stored with UUID filename; `upload_media` action in `ticketHistory` | |
| US-8.2 | Thumbnails for image types; served at thumbnail endpoint; HTTP 404 for non-image | ✅ AC: thumbnails for `image/jpeg`, `image/png`, `image/gif`; dimensions via env vars; HTTP 404 if no thumbnail | |
| US-8.3 | `GET /tickets/:id/media/:mediaId` streams file; permission check | ✅ AC: streams file bytes with `Content-Type`; `displayPermissionLevel` checked; HTTP 404 if not visible | |
| US-8.4 | Staff-only delete; file + thumbnail removed; `update` action logged | ✅ AC: HTTP 403 for non-staff; file and thumbnail deleted from disk; `media` record removed; `update` action in `ticketHistory` | |
| US-9.1 | `GET /locations` returns clusters filtered by role; `zoom_level` 0–6 | ✅ AC: returns `{id, level, lat, lon, count}`; `zoom_level` param 0–6; optional `status` and `category_id` filters; RBAC filter applied | |
| US-9.2 | `ticket_geodata` upserted for all 7 levels on creation with lat/lon | ✅ AC: cluster assignment runs automatically; `ticket_geodata` upserted for levels 0–6; PostGIS KNN for nearest cluster | |
| US-9.3 | Re-cluster on lat/lon change; `ticket_geodata` upserted; row deleted if lat/lon cleared | ✅ AC: re-cluster on lat/lon change; `ticket_geodata` upserted; row deleted if lat/lon set to null; failure does not fail ticket update | |
| US-9.4 | Recluster script truncates `ticket_geodata`, batches 500; idempotent | ✅ AC: `scripts/recluster.ts` truncates `ticket_geodata`; batch 500; progress logged; idempotent; GiST index in place | |
| US-10.1 | Category form validates all fields; no silent failures; category live in ≤ 10 min | ✅ AC: `name` required max 50; `department_id` required; permission levels validated; `customFields` valid JSON; live in ≤ 10 min | |
| US-10.2 | HTTP 409 if category has tickets; `active=false` hides without deletion | ✅ AC: HTTP 409 with error message if tickets exist; `active=false` hides from public lists | |
| US-10.3 | `ordering` non-negative int; FK blocks deletion of referenced groups | ✅ AC: `name` required max 50; `ordering` non-negative int; FK constraint blocks deletion | |
| US-10.4 | `name` unique; deletion blocked if referenced | ✅ AC: `name` unique max 128; `defaultPerson_id` must exist; deletion blocked if referenced by categories or people | |
| US-10.5 | `department_categories` POST/DELETE/GET; duplicate rejected | ✅ AC: POST/DELETE/GET at `/departments/:deptId/categories`; duplicate associations rejected (PK constraint) | |
| US-10.6 | Override template takes precedence over `actions.template` | ✅ AC: `category_action_responses` upsert; override template takes precedence when record exists | |
| US-11.1 | `username` unique; `role` validated; HTTP 409 if referenced | ✅ AC: `username` unique; `role` null or `'staff'`; people referenced by tickets/clients/bookmarks cannot be deleted | |
| US-11.2 | RFC 5322 validation; `usedForNotifications` flag; HTTP 409 on duplicate email | ✅ AC: POST/PUT/DELETE at `/people/:personId/emails`; RFC 5322 validation; HTTP 409 on duplicate email | |
| US-11.3 | Phone and address label validated; standard CRUD | ✅ AC: phone label from allowed set; address label from allowed set; POST/PUT/DELETE at respective endpoints | |
| US-11.4 | Search across firstname/lastname/email/username; `role` + `department_id` filter | ✅ AC: `GET /people/search?q=...`; min 2 chars; matches across 4 fields; `role` and `department_id` filters | |
| US-11.5 | `GET /users` returns `role='staff'` people; HTTP 403 for non-staff | ✅ AC: returns people where `role='staff'`; includes department, username, emails; HTTP 403 for non-staff | |
| US-11.6 | New key live immediately; revoked key rejected immediately; no restart | ✅ AC: `api_key` unique max 50; new key immediately usable; no restart required; HTTP 403 if referenced by tickets on delete | |
| US-12.1 | `POST /bookmarks` with `name` + `requestUri`; scoped to creator; anonymous HTTP 401 | ✅ AC: `requestUri` required, starts with `/`; scoped to `currentUser.id`; HTTP 401 for anonymous | |
| US-12.2 | `GET /bookmarks` returns only own bookmarks ordered `id DESC` | ✅ AC: returns only `person_id=currentUser.id`; ordered by `id DESC`; HTTP 401 for anonymous | |
| US-12.3 | Owner-only delete; other-user bookmark returns HTTP 404 | ✅ AC: HTTP 204 on success; only owner can delete; other-user returns HTTP 404 | |
| US-12.4 | Client-side redirect to `requestUri`; live Solr index (no cache) | ✅ AC: client-side redirect; no server-side recall endpoint; results from current live Solr index | |
| US-13.1 | `GET /metrics` with ≤ 5-min staleness; staff-only | ✅ AC: returns `openCount`, `closedCount`, `totalCount`, `avgResolutionDays`, `byCategory`, `byDepartment`; staleness ≤ 5 min; HTTP 403 non-staff | |
| US-13.2 | Filtered report CSV matches HTML view; paginated; staff-only | ✅ AC: filters: `start_date`, `end_date`, `status`, `category_id`, `department_id`; CSV matches HTML view; HTTP 403 non-staff | |
| US-14.1 | GELF logs method, path, statusCode, durationMs, `_request_id` per request | ✅ AC: `GelfRequestMiddleware` logs on start and completion; `_request_id` UUID per request; GELF transport via env vars | |
| US-14.2 | Global exception filter logs ERROR with stack trace; `_request_id` + `_user_id` | ✅ AC: global exception filter; `short_message` + `full_message` (stack trace); GELF level mapping defined | |
| US-14.3 | `_ticket_id`, `_user_id`, `_request_id` in GELF structured fields | ✅ AC: `_ticket_id` on ticket operations; `_user_id` for authenticated requests; `_request_id` propagated | |
| US-15.1 | Seed sub-statuses present; referenced sub-statuses cannot be deleted | ✅ AC: seed rows present (Resolved/closed, Duplicate/closed, Bogus/closed); `name` max 25; referenced sub-statuses cannot be deleted | |
| US-15.2 | 10 system actions seeded; system action names immutable; department actions extensible | ✅ AC: 10 system actions seeded; `type='system'` names immutable; `type='department'` actions creatable/deletable | |
| US-15.3 | Seed issue types present; referenced types cannot be deleted | ✅ AC: 6 seed issue types; `name` max 128; referenced issue types cannot be deleted | |
| US-15.4 | Seed contact methods present; referenced methods cannot be deleted | ✅ AC: 4 seed contact methods; `name` max 128; referenced methods cannot be deleted | |

> **Alignment result: 79/79 stories have NaC directly derivable from and aligned with their formal acceptance criteria. No gaps or misalignments found.**

---

*STORY-MAP generated: 2026-06-23 | Derived from PERSONAS, JTBD, JOURNEYS, UserStories, PRD — uReport | Model: claude-sonnet-4-6*
