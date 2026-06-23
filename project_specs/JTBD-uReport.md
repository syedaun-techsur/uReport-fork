# JTBD — uReport Re-Platform

| Field | Value |
|---|---|
| **Product** | uReport — Open311 GeoReport v2 Municipal CRM |
| **Version** | 1.0 |
| **Date** | 2026-06-23 |
| **Related Personas** | `project_specs/PERSONAS-uReport.md` |
| **Related PRD** | `project_specs/PRD-uReport.md` |
| **Related Project** | `.planning/PROJECT.md` |
| **Status** | Active |

---

## JTBD Summary Table

| JTBD-ID | Persona | Job Statement (abbreviated) | Priority |
|---|---|---|---|
| JTBD-01.1 | PER-01 Marcus Webb | Report a service issue from the street without creating an account | P0 |
| JTBD-01.2 | PER-01 Marcus Webb | Verify a report was received and check its progress without logging in | P0 |
| JTBD-01.3 | PER-01 Marcus Webb | Avoid duplicating a report by checking what neighbors already submitted | P1 |
| JTBD-02.1 | PER-02 Priya Nair | Track all submitted service requests in one place without manual record-keeping | P0 |
| JTBD-02.2 | PER-02 Priya Nair | Stay informed about ticket progress without actively checking the CRM | P1 |
| JTBD-02.3 | PER-02 Priya Nair | Re-run recurring area searches without re-entering the same query each time | P2 |
| JTBD-03.1 | PER-03 Dana Kowalski | Work through the daily ticket queue without missing overdue or high-priority items | P0 |
| JTBD-03.2 | PER-03 Dana Kowalski | Close and route tickets accurately while maintaining a reliable audit trail | P0 |
| JTBD-03.3 | PER-03 Dana Kowalski | Identify and link duplicate reports before taking closure action | P1 |
| JTBD-04.1 | PER-04 Robert Osei | Keep service categories and routing rules aligned with current city offerings without developer involvement | P0 |
| JTBD-04.2 | PER-04 Robert Osei | Monitor departmental ticket throughput and resolution health without exporting data | P1 |
| JTBD-04.3 | PER-04 Robert Osei | Manage API client credentials and staff access so external integrators and city staff are unaffected by changes | P1 |

---

## PER-01: Marcus Webb — Anonymous Citizen

---

### JTBD-01.1: Report a Service Issue from the Street

**Job Statement:**
When I encounter a service problem (a pothole, broken streetlight, graffiti) while out in the city, I want to submit a report from my phone in under 3 minutes without creating an account, so I can alert the city and move on with my day.

**Current Alternatives:**
- Calls the city's non-emergency phone line, which has long hold times
- Emails a city department directly with no confirmation receipt
- Abandons the report when the form requires account registration

**Hiring Criteria:**
- Accepts a service request submission without any login or registration step
- Provides a clear category selection with plain-language descriptions, not internal jargon
- Accepts location input (GPS coordinates, address, or map pin) from a mobile browser
- Accepts an optional photo attachment alongside the description
- Returns a unique confirmation token immediately after submission
- Form renders correctly on a mobile browser without a native app

**Success Measure:** A first-time user completes a service request submission — from landing page to confirmation token received — in under 3 minutes, with zero authentication prompts for anonymous-eligible categories.

**Related Features:** F0, F1, F2, F8
**Priority:** P0

---

### JTBD-01.2: Verify a Report Was Received and Check Its Progress

**Job Statement:**
When I want to know whether my submitted report was logged and whether the city has acted on it, I want to look up my ticket by the token I received at submission, so I can confirm the city is aware and avoid calling to follow up.

**Current Alternatives:**
- Screenshots the confirmation page and hopes the ticket number is included
- Calls the city's service desk to ask if a ticket was logged
- Has no way to check progress if he lost or forgot to save the token

**Hiring Criteria:**
- Provides a public token-lookup endpoint (`GET /open311/v2/tokens/:token`) that returns the matching ticket ID and current status
- Exposes ticket status and last-modified date to anonymous users for publicly-visible categories
- Does not require an account to view ticket status
- Returns results in ≤ 200ms (NFR-6)

**Success Measure:** A citizen who has their submission token can retrieve the current status of their ticket in a single lookup, with no login required, and the result is consistent with the staff-facing record.

**Related Features:** F0, F1, F2
**Priority:** P0

---

### JTBD-01.3: Avoid Duplicating a Report by Checking Nearby Submissions

**Job Statement:**
When I suspect a neighbor may have already reported the same issue, I want to browse the public list of open service requests near my address, so I can confirm it was already filed rather than submitting a redundant report.

**Current Alternatives:**
- Submits a duplicate report anyway, unaware of the existing ticket
- Has no way to search public tickets by proximity without an account

**Hiring Criteria:**
- Exposes a publicly accessible ticket list queryable by geographic location (`lat/long/radius`) via the Open311 API
- Returns only tickets at the correct `displayPermissionLevel` for anonymous users (no PII leakage)
- Loads results in ≤ 200ms for standard query patterns (NFR-6)
- Geo-cluster map view surfaces nearby reports visually without requiring a text query

**Success Measure:** An anonymous user can confirm whether a specific type of issue near their address has already been reported, without logging in, within 30 seconds of arriving at the public ticket list.

**Related Features:** F0, F2, F9
**Priority:** P1

---

## PER-02: Priya Nair — Authenticated Resident

---

### JTBD-02.1: Track All Personal Service Requests in One Centralized View

**Job Statement:**
When I log in to check the status of my service requests, I want to see all tickets I have submitted — filterable by status and date — in one place, so I can stop maintaining my own records and quickly identify which issues are still open.

**Current Alternatives:**
- Screenshots the confirmation page of each submission and stores them in a folder
- Emails herself the ticket numbers at submission time
- Re-submits the same issue because she cannot find her original report

**Hiring Criteria:**
- Personal ticket dashboard is reachable within 2 clicks of logging in via OIDC
- Shows all tickets associated with the authenticated user's account, filterable by status and date
- Displays ticket category, submission date, current status, and last-modified date at a glance
- Supports submission of authenticated requests (for categories requiring `public` permission level)
- Ticket history reflects real-time state — no stale cache

**Success Measure:** An authenticated resident can locate any of her previously submitted tickets and see its current status within 2 clicks of login, without manual cross-referencing.

**Related Features:** F1, F2, F4
**Priority:** P0

---

### JTBD-02.2: Stay Informed About Ticket Progress Without Actively Checking

**Job Statement:**
When a ticket I submitted is updated, assigned, or closed by a case worker, I want to receive an email notification automatically, so I can stay informed without having to log in to check for changes.

**Current Alternatives:**
- Logs in periodically to check for status changes manually
- Relies on inconsistent email notifications from the legacy system that sometimes arrive late or not at all
- Contacts the city directly by phone to ask for an update

**Hiring Criteria:**
- Email notification sent within 5 minutes of any status change on a ticket where she is the reporter
- Zero missed notifications for tickets tied to her reporter record (NFR guarantee)
- Email includes ticket ID, the type of change (assigned / updated / closed), and a link to view the ticket
- Uses correct `notificationReplyEmail` so replies are routed to the right department

**Success Measure:** Every status change on a ticket she reported triggers an email notification received within 5 minutes, with zero missed events during a 30-day observation window.

**Related Features:** F7, F1, F4
**Priority:** P1

---

### JTBD-02.3: Re-Run Recurring Area Searches Without Re-Entering the Query

**Job Statement:**
When I regularly check on a recurring issue type in my neighborhood (e.g., "open potholes on Elm Street"), I want to save that search as a named bookmark and re-run it with a single click, so I can monitor the issue without reconstructing the same query each time I log in.

**Current Alternatives:**
- Bookmarks the search results URL in her browser (breaks when the query changes)
- Re-types the same search parameters every session
- Has no persistent way to track a recurring issue pattern over time

**Hiring Criteria:**
- Can save any Solr search as a named bookmark directly from the results page without leaving the results
- Saved bookmarks are listed on her dashboard after login
- Re-running a bookmark replays the exact same Solr query and reflects the latest results
- Bookmarks are scoped to her account only (other users cannot see them)
- Can delete bookmarks she no longer needs

**Success Measure:** An authenticated resident can save a search bookmark and re-run it in a single click on any subsequent session, with results reflecting current ticket state.

**Related Features:** F5, F12, F4
**Priority:** P2

---

## PER-03: Dana Kowalski — Municipal Case Worker

---

### JTBD-03.1: Work Through the Daily Ticket Queue Without Missing Overdue Items

**Job Statement:**
When I start my shift and need to prioritize work across 25–40 open tickets, I want to view the ticket queue filtered by department and category and sorted by SLA elapsed days, so I can triage overdue items first and work through the queue without missing anything time-sensitive.

**Current Alternatives:**
- Relies on mental memory of which tickets were open yesterday
- Re-filters the ticket list repeatedly throughout the day to catch newly created items
- Uses a personal spreadsheet as a parallel tracking tool because the legacy system times out on large queues

**Hiring Criteria:**
- Ticket list for a department queue of up to 500 open tickets loads in ≤ 200ms (NFR-6)
- Filter controls support department, category, status, assignee, and date range in a single query
- Results can be sorted by SLA elapsed days to surface overdue items at the top
- Assigned and unassigned tickets are visually distinguishable
- Ticket list page does not time out or require pagination workarounds for typical queue sizes

**Success Measure:** Dana can identify all overdue tickets (elapsed days > SLA threshold) in her department queue within 60 seconds of logging in, using only built-in filter and sort controls.

**Related Features:** F1, F5, F2
**Priority:** P0

---

### JTBD-03.2: Close and Route Tickets Accurately While Maintaining a Reliable Audit Trail

**Job Statement:**
When I resolve, duplicate, or dismiss a service request, I want to close it with the correct sub-status, assign it, add internal notes, and trigger the reporter notification — all in a single workflow — so I can process tickets quickly and be confident the history is complete enough to reconstruct any decision later.

**Current Alternatives:**
- Takes a screenshot before closing a ticket to document the state, because the legacy audit trail is incomplete
- Manually emails the reporter because the legacy notification trigger is unreliable
- Opens a separate spreadsheet to log assignment changes that the CRM doesn't reliably capture

**Hiring Criteria:**
- Every assignment, status change, category change, and comment produces an immutable entry in `ticketHistory`
- Closing a ticket requires selecting a `substatus_id` (Resolved / Duplicate / Bogus) and entering close notes
- Reporter notification email is triggered automatically on close — no manual step required
- Staff-only comments are visible to case workers but not to anonymous or public users (RBAC enforced)
- CSV export of the filtered ticket list matches the HTML view row-for-row and column-for-column (F3 parity)

**Success Measure:** Every ticket closure produces a `ticketHistory` audit entry with sub-status, close notes, and a triggered notification — verifiable in the audit trail within 5 seconds of the close action.

**Related Features:** F1, F7, F15, F3, F2
**Priority:** P0

---

### JTBD-03.3: Identify and Link Duplicate Reports Before Taking Closure Action

**Job Statement:**
When I suspect a ticket was already reported by another resident, I want to search for related tickets by free text, location, and category before closing, so I can link duplicates accurately instead of silently discarding legitimate reports.

**Current Alternatives:**
- Opens a second browser tab and performs a manual Solr search while keeping the ticket open
- Guesses based on memory of similar tickets seen earlier in the shift
- Closes as Bogus rather than Duplicate when she cannot quickly verify

**Hiring Criteria:**
- Solr search returns results in ≤ 500ms for common query patterns (PERSONAS success criteria)
- Search supports free-text description, category filter, location proximity, and open/closed status filter in one query
- Duplicate link action (`parent_id` assignment) is available directly from the ticket detail page without navigating away
- Linking a duplicate logs a `duplicate` action to `ticketHistory` on both the child and parent ticket

**Success Measure:** A case worker can confirm or rule out a duplicate within 30 seconds using in-app search before committing to a closure sub-status, without leaving the ticket detail page.

**Related Features:** F5, F1, F15
**Priority:** P1

---

## PER-04: Robert Osei — Department Supervisor / System Admin

---

### JTBD-04.1: Keep Service Categories and Routing Rules Aligned with City Offerings

**Job Statement:**
When the city adds, retires, or changes a service offering, I want to create or update a service category — including custom fields, SLA days, permission levels, and notification overrides — without involving a developer, so I can keep the CRM's routing and citizen-facing options current without a change-management bottleneck.

**Current Alternatives:**
- Submits a change request to IT and waits several days for a developer to update the PHP config
- Publishes an incomplete category that causes silent failures in the legacy system (no validation feedback)
- Manually tracks category changes in a spreadsheet because the legacy system has no change history

**Hiring Criteria:**
- Category creation/edit form validates all required fields (name, department, permission levels, SLA days) before saving — no silent failures
- Custom field schema can be defined and previewed within the admin UI without writing code
- `displayPermissionLevel` and `postingPermissionLevel` enforce immediately on save (RBAC enforced without restart)
- `notificationReplyEmail` and `autoCloseSubstatus_id` are configurable per category from the same screen
- A fully valid category can be created and live in under 10 minutes (PERSONAS success criteria)

**Success Measure:** A supervisor can create a fully configured service category — with custom fields, SLA, permission levels, and notification overrides — in under 10 minutes, with zero developer involvement, and citizens can immediately submit requests to it.

**Related Features:** F10, F2, F7, F15
**Priority:** P0

---

### JTBD-04.2: Monitor Departmental Ticket Throughput Without Exporting Data

**Job Statement:**
When I need to review my department's operational performance — how many tickets are open, how long they're taking to resolve, which categories are backlogged — I want to see a live summary in the CRM itself, so I can make staffing and routing decisions without downloading a CSV and opening Excel.

**Current Alternatives:**
- Downloads a CSV export weekly and pivots it in Excel to produce the summary
- Asks case workers to provide verbal status updates in daily standups
- Cannot spot category-level backlogs until a case worker escalates

**Hiring Criteria:**
- Metrics dashboard shows open ticket count, closed ticket count, and average resolution time — broken down by department and category
- Dashboard reflects ticket state with ≤ 5-minute staleness (PERSONAS success criteria)
- Data is filterable by department and date range without navigating away from the dashboard
- Staff-only access enforced (RBAC); citizens cannot access metrics routes
- Reports can also be exported as CSV or JSON for city leadership when needed (F3 dependency)

**Success Measure:** A supervisor can assess their department's current open-ticket backlog and average resolution time within 2 minutes of opening the metrics dashboard, without exporting data.

**Related Features:** F13, F3, F2
**Priority:** P1

---

### JTBD-04.3: Manage API Credentials and Staff Access Without a System Restart

**Job Statement:**
When an external integrator needs a new API key, a key needs to be revoked, or a new case worker joins the team, I want to create or update API client credentials and staff person records entirely through the admin UI, so I can maintain access control without filing an IT ticket or restarting the application.

**Current Alternatives:**
- Submits a ticket to the DBA or server admin to update the database directly
- Has no centralized view of which API clients are active — must check server logs
- Cannot revoke an API key immediately when an integrator relationship ends

**Hiring Criteria:**
- API client record (`api_key`, `contactPerson_id`, `contactMethod_id`) can be created and is immediately usable for `POST /open311/v2/requests` authentication — no application restart required
- API client can be revoked (record deleted or deactivated) and the key stops working immediately
- Staff person records can be created with `role = staff` and `department_id` assignment from the admin UI
- Role and department changes take effect on the staff member's next request (no deferred re-login required)
- Zero permission regressions after any role or department change (NFR-7)
- Structured logs in Graylog for the last 30 days are accessible within 2 minutes for diagnosing API errors (NFR-8)

**Success Measure:** A system admin can provision a new API client credential or revoke an existing one entirely within the CRM admin UI in under 5 minutes, with the change taking effect immediately and no application restart required.

**Related Features:** F11, F0, F2, F14
**Priority:** P1

---

## Outcome-to-Feature Traceability

| JTBD-ID | Feature ID(s) | Expected Outcome |
|---|---|---|
| JTBD-01.1 | F0, F1, F2, F8 | Anonymous user submits a ticket with photo and receives a confirmation token, with zero auth prompts, in ≤ 3 minutes |
| JTBD-01.2 | F0, F1, F2 | Token lookup returns ticket status in ≤ 200ms without requiring authentication |
| JTBD-01.3 | F0, F2, F9 | Anonymous user browses geo-filtered public tickets and confirms or rules out a duplicate, without logging in |
| JTBD-02.1 | F1, F2, F4 | Authenticated resident views full personal ticket history within 2 clicks of login, with real-time status |
| JTBD-02.2 | F7, F1, F4 | Every ticket status change triggers an email notification within 5 minutes; zero missed events |
| JTBD-02.3 | F5, F12, F4 | Named bookmark saved from search results page; re-run in one click on any subsequent session |
| JTBD-03.1 | F1, F5, F2 | Department queue of 500 tickets loads in ≤ 200ms; overdue items surfaced by SLA sort within 60 seconds of login |
| JTBD-03.2 | F1, F7, F15, F3, F2 | Every ticket closure produces an immutable audit entry with sub-status, notes, and triggered notification |
| JTBD-03.3 | F5, F1, F15 | Duplicate search returns results in ≤ 500ms; duplicate link action available without navigating away |
| JTBD-04.1 | F10, F2, F7, F15 | Fully valid category created in ≤ 10 minutes, validated on save, live immediately with no developer involvement |
| JTBD-04.2 | F13, F3, F2 | Live metrics dashboard reflects ticket state with ≤ 5-minute staleness; exportable as CSV/JSON |
| JTBD-04.3 | F11, F0, F2, F14 | API credential created or revoked immediately via admin UI; zero restart required; logs accessible in Graylog within 2 minutes |

---

## NaC Preview

> These are candidate Natural Acceptance Criteria for downstream use in STORY-MAP and FRD. They will be refined into formal acceptance tests during story mapping.

| JTBD-ID | Outcome | Candidate Natural Acceptance Criterion |
|---|---|---|
| JTBD-01.1 | Anonymous ticket submission completes in ≤ 3 min | **Given** an anonymous user on a mobile browser, **When** they submit a new service request with location, description, and photo to an anonymous-eligible category, **Then** they receive a unique token in the response within 3 minutes, and no login prompt is shown at any step |
| JTBD-01.2 | Token lookup returns status without auth | **Given** a valid submission token, **When** an anonymous user calls `GET /open311/v2/tokens/:token`, **Then** the response returns the matching `service_request_id` and current status in ≤ 200ms, with no authentication required |
| JTBD-01.3 | Public geo-search finds nearby open tickets | **Given** an anonymous user, **When** they query `GET /open311/v2/requests` with `lat`, `long`, and `radius` params, **Then** only tickets with `displayPermissionLevel = anonymous` are returned, and the response arrives in ≤ 200ms |
| JTBD-02.1 | Personal ticket history accessible within 2 clicks | **Given** an authenticated resident, **When** they log in via OIDC, **Then** their personal ticket history — showing all submitted tickets filterable by status and date — is reachable within 2 navigation actions from the post-login landing page |
| JTBD-02.2 | Email notification sent within 5 minutes of status change | **Given** a ticket where the authenticated resident is the reporter, **When** a case worker updates the ticket status, **Then** an email notification is delivered to the reporter's notification email address within 5 minutes, and the send is logged in `ticketHistory.sentNotifications` |
| JTBD-02.3 | Saved bookmark re-runs Solr query in one click | **Given** an authenticated resident on a Solr search results page, **When** they save the search as a named bookmark, **Then** the bookmark appears in their dashboard; and **When** they click it, the same Solr query executes and returns current results |
| JTBD-03.1 | Queue of 500 tickets loads in ≤ 200ms | **Given** a staff user with 500 open tickets in their department, **When** they apply a department + category filter and sort by SLA elapsed days, **Then** the filtered list renders in ≤ 200ms with overdue items at the top |
| JTBD-03.2 | Ticket closure produces complete audit entry | **Given** a staff user closing a ticket, **When** they select a sub-status (Resolved/Duplicate/Bogus), enter close notes, and submit, **Then** `ticketHistory` contains a `closed` entry with sub-status and notes, and a reporter notification email is triggered automatically |
| JTBD-03.3 | Duplicate search returns results in ≤ 500ms | **Given** a staff user on a ticket detail page, **When** they search for potential duplicates by free text and category, **Then** Solr returns results in ≤ 500ms, and the duplicate link action (`parent_id` assignment) is available without navigating away |
| JTBD-04.1 | New category is live and validated within 10 min | **Given** a staff admin on the category creation form, **When** they fill in all required fields (name, department, permission levels, SLA days, custom fields) and save, **Then** validation passes or surfaces field-level errors, the category is immediately visible to citizens at the configured permission level, with no developer action required |
| JTBD-04.2 | Metrics dashboard reflects state with ≤ 5-min staleness | **Given** a staff supervisor on the metrics dashboard, **When** a case worker closes a ticket, **Then** the dashboard open/closed counts update to reflect the change within 5 minutes, without requiring a manual refresh or CSV export |
| JTBD-04.3 | New API key is usable immediately after creation | **Given** a system admin creating a new API client record, **When** the record is saved with a valid `api_key`, **Then** `POST /open311/v2/requests` authenticates successfully with that key immediately, with no application restart, and a revoked key is rejected on the next request |

---

*JTBD generated: 2026-06-23 | Derived from PERSONAS-uReport.md and PRD-uReport.md | Model: claude-sonnet-4-6*
