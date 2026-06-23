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
