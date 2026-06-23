# PERSONAS — uReport Re-Platform

| Field | Value |
|---|---|
| **Product** | uReport — Open311 GeoReport v2 Municipal CRM |
| **Version** | 1.0 |
| **Date** | 2026-06-23 |
| **Related PRD** | `project_specs/PRD-uReport.md` |
| **Related Project** | `.planning/PROJECT.md` |
| **Status** | Active |

---

## Persona Summary Table

| ID | Representative Name | Role | Primary Goal |
|---|---|---|---|
| PER-01 | Marcus Webb | Anonymous Citizen | Submit a service request quickly, without creating an account |
| PER-02 | Priya Nair | Authenticated Resident | Track the status of service requests and save searches for recurring issues |
| PER-03 | Dana Kowalski | Municipal Case Worker | Manage, assign, and resolve the daily ticket queue efficiently |
| PER-04 | Robert Osei | Department Supervisor / System Admin | Configure the CRM taxonomy, monitor team throughput, and manage API integrations |

> **Note on External API Clients:** Third-party systems (mobile apps, city portals, integrators) that consume the Open311 GeoReport v2 API are a **machine actor**, not a human persona. Their requirements are captured in F0 (Open311 API) and surfaced in the Feature-Persona Matrix as a dependency column. PER-01 (Anonymous Citizen) is the human proxy for this actor's perspective.

---

## PER-01: Marcus Webb

**Role:** Anonymous Citizen  
**Identity:** A resident of the municipality who wants to report a pothole, broken streetlight, or other service issue — without registering for an account.

### Role & Context

Marcus is a 38-year-old resident who encounters a service issue (a cracked sidewalk, an abandoned vehicle, graffiti on a city wall) and wants to report it quickly. He may be on a mobile browser while standing at the site of the problem, or on a desktop at home. He has no expectation of a login workflow — he wants to fill in a form and receive a confirmation. He may also interact with the city via a third-party mobile app or city portal that calls the Open311 API on his behalf, meaning the system must behave correctly for both human form submissions and programmatic API calls. Marcus is a non-technical user with everyday smartphone and browser proficiency.

### Goals

- Submit a service request with location, description, and optional photo in under 3 minutes (F0, F1, F8)
- Receive a confirmation token so he can follow up later without an account (F0)
- Browse open service categories and their descriptions to pick the right one (F0, F2)
- View the status of publicly visible tickets near his address without logging in (F0, F2)

### Pain Points

- Creating an account is a barrier — he abandons forms that require registration (PRD §2 — accessibility)
- Uncertainty about whether the report was received — no confirmation feedback
- Confusing category selection when category names are jargon-heavy
- No visibility into ticket progress unless he saved his token

### Technical Expertise

Low to moderate — comfortable with smartphone forms, browser-based searches, and city web portals. Avoids command-line tools and API clients.

### Top Tasks

1. **Submit a new service request** via the web form or Open311 `POST /open311/v2/requests` (daily, critical — F0, F1)
2. **Browse available service categories** to identify the right request type (per submission, high — F0)
3. **Look up a ticket by token** to check whether his report was logged (occasional, medium — F0)
4. **View public ticket list** to see if a neighbor already reported the same issue (occasional, low — F0, F2)

### Success Criteria

- Completes a service request submission in under 3 minutes from landing page to confirmation
- Receives a unique token in the submission response that can be used to look up the request ID
- Zero authentication prompts when submitting to a publicly-postable category
- Public ticket list loads in ≤ 200ms (NFR-6)

---

## PER-02: Priya Nair

**Role:** Authenticated Resident  
**Identity:** A regular city resident who has created an account to track her own service requests and save searches for issues in her neighborhood.

### Role & Context

Priya is a 45-year-old homeowner who submits 4–6 service requests per year and actively follows up on their progress. She logs in via the city's OIDC identity provider (the same one used for other city services). Once authenticated, she can see her personal ticket history, submit requests to categories that require login (public permission level), and save named bookmarks to recurring Solr searches (e.g., "open requests on Elm Street"). Priya uses a desktop browser on weekdays and a tablet on weekends. She is a moderately tech-comfortable user who expects email notifications when her tickets progress.

### Goals

- Track all service requests she has submitted in one place, without manual record-keeping (F1, F4)
- Receive email notifications when a ticket she reported is updated, assigned, or closed (F7)
- Save searches for recurring issue types or streets to re-run with one click (F5, F12)
- Submit requests to categories that require authentication (F2, F4)
- Attach a photo to a ticket she submits to document the condition (F8)

### Pain Points

- Currently has to remember ticket numbers or screenshot confirmation pages
- Email notifications from the old system are inconsistent — sometimes she receives them, sometimes not
- Duplicate-checking is manual — she has to search herself to avoid reporting the same thing twice (PRD §2)
- Cannot easily filter her own ticket history by status or category

### Technical Expertise

Moderate — fluent with web applications, email, and mobile browsers. Does not use APIs or command-line tools. Comfortable with form-based search interfaces.

### Top Tasks

1. **Log in via OIDC** and land on her personal ticket dashboard (per session, high — F4)
2. **View her own ticket history** filtered by status or date (weekly, high — F1, F2)
3. **Submit an authenticated service request** with a photo attachment (monthly, high — F1, F8)
4. **Save a named bookmark** to a Solr search query for a recurring issue (occasional, medium — F5, F12)
5. **Re-run a saved bookmark** to check the latest results (weekly, medium — F5, F12)

### Success Criteria

- Personal ticket history is accessible within 2 clicks of login
- Email notification received within 5 minutes of a ticket status change
- Can create a named bookmark from any search results page without leaving the results
- Zero missed notifications for tickets where she is the reporter

---

## PER-03: Dana Kowalski

**Role:** Municipal Case Worker (Staff)  
**Identity:** A full-time city employee who manages the day-to-day ticket queue for one or more departments — assigning, updating, closing, and communicating on service requests.

### Role & Context

Dana is a 32-year-old case worker in the city's Public Works department. She processes an average of 25–40 tickets per day across multiple categories (potholes, street signs, street lights). She works from a desktop workstation with two monitors — the CRM on one screen and her email on the other. She coordinates with 3 other case workers in her team and reports to a department supervisor. Dana assigns tickets to herself or colleagues, updates statuses, leaves staff-only comments for internal notes, and logs "response" actions when she contacts the reporter. She relies heavily on the Solr search and status filters to prioritize her queue. Dana logs in via the city OIDC IdP every morning and stays authenticated for the full shift.

### Goals

- Work through the daily open ticket queue without missing overdue items (F1, F5, F13)
- Assign tickets to the right case worker based on workload and expertise (F1, F10)
- Close tickets with the correct sub-status (Resolved, Duplicate, Bogus) and close notes (F1, F15)
- Search tickets by free text, category, status, and date range to find related issues quickly (F5)
- Attach media evidence (photos from the field) to tickets (F8)
- Receive and send email notifications to reporters and colleagues (F7)

### Pain Points

- In the legacy PHP system, the custom framework made it hard to reliably load ticket lists — page timeouts on large result sets (PRD §2 — reliability)
- No unified serialization meant JSON exports sometimes differed from the HTML view — caused confusion when importing into Excel (PRD §2 — format divergence)
- Category changes and assignment changes weren't always consistently audit-trailed — difficult to reconstruct ticket history (PRD §2 — audit trail gaps)
- The absence of dependency injection in the PHP codebase meant edge-case bugs were hard to reproduce in testing

### Technical Expertise

Intermediate — comfortable with web applications, spreadsheet exports, email. Not a developer. Uses the CRM as a primary work tool for 6+ hours per day.

### Top Tasks

1. **Review the open ticket queue** filtered by department and category, sorted by creation date or SLA elapsed days (daily, critical — F1, F5)
2. **Assign a ticket** to a case worker or to herself (daily, critical — F1)
3. **Update ticket status, fields, or location** and leave a staff comment (daily, critical — F1)
4. **Close a ticket** with a sub-status and trigger the reporter notification (daily, critical — F1, F15, F7)
5. **Search for duplicate tickets** before closing as Bogus or Duplicate (daily, high — F1, F5)
6. **Export ticket list to CSV** for offline reporting or departmental records (weekly, medium — F3, F13)
7. **Upload a media attachment** from field inspection (occasional, medium — F8)

### Success Criteria

- Ticket list page loads in ≤ 200ms for queues of up to 500 open tickets (NFR-6)
- Every assignment, status change, category change, and comment produces an audit trail entry in `ticketHistory`
- CSV export of any filtered ticket list matches the HTML view row-for-row
- Duplicate detection search returns results in ≤ 500ms for common query patterns

---

## PER-04: Robert Osei

**Role:** Department Supervisor / System Administrator  
**Identity:** A senior city employee with staff-level access who configures service categories, manages staff accounts, monitors departmental performance, and oversees API client integrations.

### Role & Context

Robert is a 52-year-old IT operations manager and department supervisor at the city. He wears two hats: as a **department supervisor**, he monitors ticket throughput for his department, reviews metrics dashboards, and configures categories to match evolving service offerings; as a **system administrator**, he manages staff person records, assigns roles, onboards new API client integrations, and maintains the reference data (sub-statuses, actions, issue types, contact methods) that drive the CRM's workflow engine. He spends approximately 2 hours per day in the CRM admin interfaces — category management, people management, reports — and is the primary point of contact when external integrators (mobile app vendors, city portal developers) request API key changes. Robert is a technical manager: comfortable with system configuration, environment variables, and API documentation, but not a software developer.

### Goals

- Keep service categories, departments, and routing rules aligned with city service offerings (F10)
- Monitor open/closed ticket counts and average resolution times per department (F13)
- Onboard and revoke API client credentials (api_keys) for external integrators without developer involvement (F11)
- Ensure staff accounts have the correct role (`staff`) and department assignment for proper RBAC enforcement (F11, F2)
- Configure email notification templates and reply addresses per category and action (F7, F15)
- Ensure the re-platformed system produces identical Open311 API responses so his integrators are unaffected (F0)

### Pain Points

- In the legacy system, category configuration was spread across multiple screens with no validation — publishing an incomplete category caused silent failures (PRD §2 — framework obsolescence)
- No centralized audit of API client usage — Robert couldn't tell which integrators were active without checking server logs (PRD §2 — observability)
- MySQL operational overhead meant schema changes required a DBA handoff; he wants self-service migration tooling (PRD §2 — ORM limitations)
- Permission gaps in the Laminas ACL occasionally surfaced as staff seeing data they shouldn't (PRD §2 — type safety / testing surface)
- Reports were export-only (CSV download) with no interactive dashboard; he wants a summary view without opening Excel

### Technical Expertise

High for configuration and administration — comfortable with web admin interfaces, environment variable configuration, API documentation, and structured log review. Not a software developer; does not write code or run migrations directly.

### Top Tasks

1. **Create or edit a service category** with custom fields, SLA days, permission levels, and notification overrides (weekly, critical — F10)
2. **Review metrics dashboard** — open count, closed count, avg. resolution time by department (daily, high — F13)
3. **Manage staff person records** — create, update, assign department and role (monthly, high — F11, F2)
4. **Create or revoke an API client credential** for an external integrator (quarterly, high — F11, F0)
5. **Configure email templates and reply addresses** per category-action pair (occasional, medium — F7, F15)
6. **Review structured logs** in Graylog to diagnose API errors or permission issues (occasional, medium — F14)
7. **Export department-level ticket reports** in CSV or JSON for city leadership (monthly, medium — F13, F3)

### Success Criteria

- Can create a fully valid service category (with custom fields, SLA, permissions) in under 10 minutes without developer involvement
- Metrics dashboard reflects current ticket state with ≤ 5-minute staleness
- API client credential can be created and immediately used without a system restart
- Zero permission regressions after any staff role or department change (NFR-7)
- All structured logs for the last 30 days accessible in Graylog within 2 minutes (NFR-8)

---

## Persona Relationships

| Interaction | PER-01 (Marcus) | PER-02 (Priya) | PER-03 (Dana) | PER-04 (Robert) |
|---|---|---|---|---|
| **PER-01 (Marcus)** | — | Both submit tickets; Marcus may de-duplicate against Priya's reports | Dana manages and closes Marcus's tickets; Marcus receives no direct comms | Robert's category config determines which categories Marcus can post to |
| **PER-02 (Priya)** | Shares the public ticket feed | — | Dana assigns and closes Priya's tickets; Priya receives email notifications | Robert's category and notification config governs Priya's email experience |
| **PER-03 (Dana)** | Receives Marcus's ticket reports and closes them | Manages Priya's tickets and triggers notifications to her | Collaborates with peer case workers in the same department | Reports to Robert; works within categories Robert configures |
| **PER-04 (Robert)** | Configures categories and API keys that Marcus uses (via apps) | Sets notification templates Priya depends on | Supervises Dana's queue via metrics dashboard | Coordinates with city IT and external integrators |

---

## Feature-Persona Matrix

> **Key:** P = Primary user (core workflow), S = Secondary user (benefits from feature), — = Not applicable

| Feature | Description | PER-01 Anonymous | PER-02 Resident | PER-03 Case Worker | PER-04 Supervisor/Admin |
|---|---|:---:|:---:|:---:|:---:|
| **F0** | Open311 GeoReport v2 REST API | P | P | S | P |
| **F1** | Ticket Lifecycle Management | P | P | P | S |
| **F2** | Role-Based Access Control (RBAC) | P | P | P | P |
| **F3** | Content Negotiation & Multi-Format Serialization | P | S | P | P |
| **F4** | OIDC Authentication | — | P | P | P |
| **F5** | Full-Text Search via Apache Solr | S | P | P | S |
| **F6** | MySQL-to-PostgreSQL Schema Migration | — | — | — | P |
| **F7** | Email Notifications | P | P | P | P |
| **F8** | Media & Attachment Management | P | P | P | — |
| **F9** | Geo-Clustering of Ticket Locations | P | P | S | S |
| **F10** | Category & Department Administration | — | — | S | P |
| **F11** | People & API Client Management | — | — | — | P |
| **F12** | Bookmarked Searches | — | P | P | S |
| **F13** | Reporting & Metrics | — | — | S | P |
| **F14** | Structured Logging via GELF/Graylog | — | — | — | P |
| **F15** | Sub-Status & Action Reference Data | — | — | P | P |

### Matrix Notes

- **F0 (Open311 API):** Marcus and API machine clients are the primary external consumers; Priya may interact via third-party apps; Robert manages the API keys that gate `POST /requests`
- **F6 (Migration):** A technical infrastructure feature with no direct human-facing UX; Robert is the stakeholder who approves the migration go/no-go
- **F14 (GELF Logging):** Entirely operational; Robert and DevOps review logs in Graylog — no citizen-facing impact
- **External API Clients (machine actor):** Covered by F0 as PER-01 proxy; all Open311 response parity requirements (NFR-1, NFR-2) protect this actor

---

*PERSONAS generated: 2026-06-23 | Derived from PRD-uReport.md §2, §5, §7 | Model: claude-sonnet-4-6*
