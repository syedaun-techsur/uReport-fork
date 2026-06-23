# UX Mockup — uReport Re-Platform

**Project:** uReport — Open311 GeoReport v2 Municipal CRM
**Generated:** 2026-06-23
**Based on:** UserStories-uReport.md, JOURNEYS-uReport.md, PRD-uReport.md, FRD-uReport.md
**User Story Coverage:** US-0.x through US-15.x (Epics 0–15)

---

## Overview

uReport serves three distinct user classes — anonymous citizens, authenticated residents, and municipal staff — each with fundamentally different interaction patterns and information needs. The UX architecture reflects this three-tier model across every screen and flow.

### Design Principles

1. **Transparency builds trust.** Citizens who cannot trust that their report was received will phone the city instead. Every submission must return an immediate, copyable confirmation token. Every status change must surface a timestamp that matches the email notification timestamp.

2. **Parity, not redesign.** The re-platform constraint (PRD §10) forbids UI redesign. HTML output must match the existing interface structure. Wireframes in this document describe the *intended* structure of those existing screens, not new designs.

3. **Roles dictate context.** Anonymous citizens see the minimal submission form. Authenticated residents see their personal ticket history. Staff see the full queue with filters, actions, and audit trails. Role-appropriate UI is enforced by CASL guards and reflected visually (lock icons, field labels, panel visibility).

4. **Feedback at every async boundary.** Form submissions, filter changes, Solr queries, and file uploads all cross an async boundary. Each gets a loading state, a success state, and an error state — no silent failures.

5. **Discoverability for power features.** Bookmarks, duplicate search, CSV export, and "Save this search" are invisible unless surfaced contextually. Each is anchored to the moment the user most needs it.

### Screen Inventory

| Screen ID | Screen Name | Primary Persona | Priority |
|-----------|-------------|-----------------|----------|
| SCR-01 | Public Ticket Submission Form | Anonymous Citizen | P0 |
| SCR-02 | Ticket Submission Confirmation | Anonymous Citizen | P0 |
| SCR-03 | Public Ticket Status / Detail View | Anonymous / Resident | P0 |
| SCR-04 | Login / OIDC Redirect Interstitial | Authenticated Resident | P0 |
| SCR-05 | Personal Ticket History Dashboard | Authenticated Resident | P0 |
| SCR-06 | Staff Ticket Queue / List | Case Worker | P0 |
| SCR-07 | Staff Ticket Detail | Case Worker | P0 |
| SCR-08 | Staff Search (Solr) | Case Worker | P1 |
| SCR-09 | Category Admin (CRUD + Custom Field Builder) | Department Supervisor | P1 |
| SCR-10 | Department / People Admin | Department Supervisor | P1 |
| SCR-11 | API Client Management | Department Supervisor | P1 |
| SCR-12 | Bookmarks Management | Authenticated Resident | P2 |
| SCR-13 | Metrics / Reporting Dashboard | Department Supervisor | P2 |
| SCR-14 | User Profile / Account | Authenticated Resident | P0 |

### Flow Inventory

| Flow ID | Flow Name | Personas | Stories |
|---------|-----------|----------|---------|
| FLW-01 | Anonymous Ticket Submission | PER-01 | US-1.1, US-0.3 |
| FLW-02 | OIDC Login & Personal Ticket History | PER-02 | US-4.1–4.3, US-1.2 |
| FLW-03 | Staff Daily Queue — Assign, Comment, Close | PER-03 | US-1.3–1.5, US-1.7 |
| FLW-04 | Duplicate Detection & Linking | PER-03 | US-1.6 |
| FLW-05 | Category Creation with Custom Fields | PER-04 | US-10.1 |
| FLW-06 | API Client Credential Rotation | PER-04 | US-11.6 |
| FLW-07 | Bookmark Save & Recall | PER-02 | US-12.1–12.4 |

---

## Navigation Architecture

### Global Navigation (Staff)

```
[uReport Logo] [Tickets ▾] [Search] [Admin ▾] [Reports] | [User Menu ▾] [Logout]
                  └─ My Queue                 └─ Categories
                  └─ All Tickets              └─ Departments
                  └─ New Ticket               └─ People
                                              └─ API Clients
                                              └─ Sub-Statuses
                                              └─ Actions
```

### Global Navigation (Authenticated Resident)

```
[uReport Logo] [My Tickets] [Report an Issue] [Bookmarks] | [User Menu ▾] [Logout]
```

### Global Navigation (Anonymous)

```
[uReport Logo] [Report an Issue] | [Sign In]
```

### Breadcrumb Pattern

All interior pages display a breadcrumb trail:
- Admin pages: `Admin > Categories > Edit "Illegal Dumping"`
- Ticket pages: `Tickets > #84712`
- Search: `Search > Results for "pothole elm street"`

---

## Visual Language Conventions

### Role-Visibility Labels

| Label Style | Meaning | Applied To |
|-------------|---------|------------|
| 🔒 Lock icon + grey background | Staff-only field or panel | Comment field, PII fields in history |
| ✉️ Email icon + blue outline | Sends notification to reporter | Response action, Close action |
| ⚠️ Warning badge | SLA overdue | Ticket row in queue when `slaDays` exceeded |
| 🟢 Green pill | Status: Open | Ticket status badge |
| 🔴 Red pill | Status: Closed | Ticket status badge |

### State Colors

- **Primary action:** Blue (`#0070f3`)
- **Destructive action:** Red (`#e00`)
- **Success state:** Green (`#0a0`)
- **Warning / SLA exceeded:** Amber (`#f59e0b`)
- **Disabled state:** Grey (`#999`)
- **Staff-only elements:** Light blue background (`#eff6ff`)

### Typography Hierarchy

- **Page title (H1):** 24px semibold
- **Section heading (H2):** 18px semibold
- **Card title (H3):** 16px medium
- **Body text:** 14px regular
- **Label / metadata:** 12px regular, muted color
- **Code / ID:** 12px monospace
## Flow 00: Anonymous Ticket Submission (FLW-01)

**Trigger:** Citizen navigates to the city portal from a search result or direct link.
**User Stories:** US-1.1, US-0.3, US-2.1
**Personas:** PER-01 (Marcus Webb — Anonymous Citizen)
**Journey Reference:** JRN-01.1

```
[Landing Page]
    │
    ▼
[Category Selection]
    │  ← GET /open311/v2/services (anonymous-visible only)
    │
    ▼
[Location Step]
    │  GPS auto-detect OR manual address entry
    │
    ├── GPS success ──▶ [Map with confirmed pin + street address]
    │
    └── GPS denied  ──▶ [Manual address entry fallback]
    │
    ▼
[Description + Photo Step]
    │  Description text + optional photo upload
    │
    ▼
[Review & Submit]
    │  POST /open311/v2/requests
    │
    ├── Success ──▶ [Confirmation Screen: token + ticket ID]
    │
    └── Error   ──▶ [Inline error + retry affordance]
```

### Steps

1. **Landing Page** — "No account needed" headline above the fold. CTA button "Report an Issue" prominently in hero area. Brief note: "Your report will be reviewed within [X] business days."

2. **Category Selection** — Grid or list of categories grouped by citizen-recognizable topic (e.g., "Roads & Sidewalks", "Sanitation"). Each category shows icon, plain-language name, and one-sentence description. Search-within-categories input for long lists. If selected category requires authentication (`postingPermissionLevel = 'public'`), prompt to sign in.

3. **Location Step** — "Use my location" button auto-detects GPS coordinates. Map preview shows pin; resolved street address displayed below map for user verification. "Adjust pin" allows manual drag. Fallback: address text input. Character-count helper and nearest-intersection hint.

4. **Description + Photo Step** — Text area with placeholder "Be specific: size, exact corner, nearest landmark." Optional photo upload labeled "Optional — helps us locate the issue faster." File type and size validation inline (max 10 MB, image/PDF/doc). Character count shown (target ≤ 4000).

5. **Review & Submit** — Summary of: category name, address, description snippet, attached file (if any). "Submit Report" primary button. Submitting shows spinner with "Sending your report…"; timeout message after 5 seconds.

6. **Confirmation** — Ticket ID and token displayed prominently. Copy-to-clipboard button on token. "Send to email" optional input (anonymous users may provide email to receive confirmation). "Add to phone calendar" link. Estimated review time shown. Link to token-lookup status page.

### States

| State | UI Treatment |
|-------|-------------|
| Loading categories | Skeleton card grid (3 placeholder rows) |
| GPS locating | Spinner on map, "Finding your location…" |
| GPS failed | Red banner "Location unavailable. Please enter your address." |
| File uploading | Progress bar with filename; cancel button |
| File too large | Inline error: "File exceeds 10 MB limit" |
| Wrong file type | Inline error: "Accepted types: JPG, PNG, GIF, PDF, DOC, DOCX, TXT" |
| Submitting | Full-width spinner bar + "Sending your report…" |
| Submit success | Green confirmation page, token in highlighted box |
| Submit error (500) | "Something went wrong. Your report was not sent. Please try again." + retry button |
| Submit error (400) | Inline field-level validation messages |
| Category requires auth | "Sign in to submit to this category" banner with Sign In button |
## Flow 01: OIDC Login & Personal Ticket History (FLW-02)

**Trigger:** Resident clicks "Sign In" from any page, or is redirected after attempting an authenticated action.
**User Stories:** US-4.1, US-4.2, US-4.3, US-4.4, US-1.2
**Personas:** PER-02 (Priya Nair — Authenticated Resident)
**Journey Reference:** JRN-02.1

```
[Any Page — "Sign In" link]
    │
    ▼
[Login Interstitial] ← "You're being redirected to the city's secure sign-in page"
    │  HTTP 302 → IdP
    │
    ▼
[City IdP Login Page]
    │  User enters credentials + MFA
    │
    ├── Auth success ──▶ GET /auth/callback?code=...&state=...
    │                       │
    │                       ├── State/nonce valid ──▶ [Session created]
    │                       │                             │
    │                       │                             ▼
    │                       │                        [Personal Ticket History]
    │                       │                        (return_to or default /)
    │                       │
    │                       └── State mismatch ──▶ [Error page + retry button]
    │
    └── Auth failed   ──▶ [IdP error page]
    │
    ▼
[Logout Flow]
    │  GET /auth/logout
    │
    ├── OIDC_END_SESSION_ENDPOINT set ──▶ IdP end-session ──▶ [Home page]
    └── No end-session ──▶ [Home page]
```

### Steps

1. **Sign In trigger** — "Sign In" link in global nav. If accessing a page requiring authentication while anonymous, the current URL is stored as `return_to` before redirect.

2. **Login Interstitial** (SCR-04) — Full-page interstitial showing city logo, uReport branding, and message: "You're being redirected to [City Name]'s secure sign-in page." Spinner/progress indicator. This prevents the "leaving the site" confusion documented in JRN-02.1 Stage 1.

3. **IdP Login** — External city identity provider page (outside uReport's control).

4. **Callback Handling** — If state/nonce validation fails, render a user-friendly error page: "Something went wrong with sign-in. Please try again." with a prominent "Try Again" button that restarts the OIDC flow. No technical error messages exposed to user.

5. **Post-Login Landing** (SCR-05) — Personal ticket history page, scoped to `reportedByPerson_id = current user`. Header shows "Your X open requests." Tickets sorted by `lastModified DESC`. Status filters visible above the list.

6. **Session Warning** — At 7h45m (configurable), a dismissible banner: "Your session will expire in 15 minutes. [Stay Logged In]." Prevents mid-workflow session expiry (JRN-03.1 Stage 1 pain point).

7. **Logout** — "Logout" in user menu. Session destroyed. Cookie cleared. Redirect to home page (or IdP end-session if configured).

### States

| State | UI Treatment |
|-------|-------------|
| Redirecting to IdP | Full-page interstitial with spinner |
| Callback in progress | Brief spinner; auto-advances |
| State mismatch error | Error page with retry button; no technical details |
| IdP 502 error | "The sign-in service is temporarily unavailable. Please try again in a moment." |
| First login (new user) | Welcome message: "Welcome, [firstname]! Your account has been created." |
| Returning login | No special message; lands on personal dashboard |
| Session near expiry | Dismissible banner with "Stay Logged In" action |
| Session expired (mid-workflow) | Redirect to login with `return_to` preserving current URL |
## Flow 02: Staff Daily Queue — Assign, Comment, Close (FLW-03)

**Trigger:** Case worker logs in (or session resumes) and navigates to the ticket queue.
**User Stories:** US-1.3, US-1.4, US-1.5, US-1.7, US-1.8, US-1.10
**Personas:** PER-03 (Dana Kowalski — Case Worker)
**Journey Reference:** JRN-03.1

```
[Staff Login / Session Resume]
    │
    ▼
[Staff Ticket Queue — SCR-06]
    │  Filter: dept=Public Works, status=open, sort=SLA elapsed DESC
    │
    ▼
[Ticket Row — Click to open]
    │
    ▼
[Staff Ticket Detail — SCR-07]
    │
    ├─── [Assign Action]
    │        │  Select assignee from department-filtered dropdown
    │        ▼
    │    [ticketHistory: assignment] + [Email to assignee + reporter]
    │
    ├─── [Staff Comment]
    │        │  Lock icon: "Staff Comment (internal — not sent to reporter)"
    │        ▼
    │    [ticketHistory: comment] — NOT sent to reporter
    │
    ├─── [Reply to Reporter]
    │        │  Email icon: "Reply to Reporter (sends email notification)"
    │        ▼
    │    [ticketHistory: response] + [Email to reporter]
    │
    ├─── [Update Fields]
    │        │  Edit description, category, location
    │        ▼
    │    [ticketHistory: update / changeCategory / changeLocation]
    │
    └─── [Close Ticket]
             │  Select sub-status (Resolved / Duplicate / Bogus)
             │  Enter close notes
             ▼
         [Confirmation dialog: "This will close the ticket and send email to [reporter email]"]
             │
             ├── Confirm ──▶ [ticketHistory: closed] + [Email] + [Return to queue]
             └── Cancel  ──▶ [Stay on ticket detail]
```

### Sub-Flow: Bulk Close / Export

```
[Staff Ticket Queue — SCR-06]
    │  Select checkboxes on multiple tickets
    │
    ▼
[Bulk Action Bar appears: "X tickets selected"]
    │
    ├── [Export to CSV] ──▶ Download file
    └── [Bulk assign]   ──▶ Assignee picker modal ──▶ Apply to all selected
```

### Steps

1. **Arrive at Queue** — Queue defaults to: department = current user's department, status = open, sort = entered date DESC. SLA elapsed column visible. Overdue items (SLA exceeded) highlighted with amber warning badge.

2. **Triage Overdue** — Single click on "SLA Elapsed" column header sorts descending. Overdue items float to top with amber row highlight. Queue for ≤500 open tickets loads in ≤200ms.

3. **Open Ticket Detail** — Click anywhere on a ticket row opens the ticket detail page (SCR-07).

4. **Assign** — "Assign to" dropdown in the right sidebar. Default: "Unassigned." Dropdown pre-filters to staff in the ticket's category's department. Name type-ahead filter for large departments. Save triggers `ticketHistory: assignment` entry and email notification.

5. **Staff Comment** — Comment text area with lock icon header "Staff Comment (internal — not sent to reporter)." Visually distinct from the "Reply to Reporter" field (different background color, icon). Submit appends `ticketHistory: comment`. No email sent.

6. **Reply to Reporter** — Separate text area with email icon header "Reply to Reporter (sends email notification to [reporter email])." Submit appends `ticketHistory: response` and triggers reporter email.

7. **Close Ticket** — Red "Close Ticket" button in action panel. Opens sub-status dropdown (Resolved / Duplicate / Bogus) and close notes text area. On "Close" click: confirmation dialog showing exactly who will receive the email notification. Confirm → ticket closed, history entry, email sent, user returned to queue.

8. **Re-open** — Closed tickets show "Re-open Ticket" button. Confirmation: "This will re-open the ticket. The reporter will not be notified automatically." Re-open clears `closedDate` and `substatus_id`.

### States

| State | UI Treatment |
|-------|-------------|
| Queue loading | Skeleton rows (5 placeholder rows with shimmer) |
| Empty queue | "No open tickets in your queue. 🎉" illustration |
| Ticket not found | 404 page with "Return to Queue" link |
| Assign saving | Button spinner; row locked during save |
| Comment saving | Textarea disabled; spinner; success flash |
| Close confirmation dialog | Modal overlay; cannot close by clicking outside |
| Close in progress | Dialog spinner; buttons disabled |
| Close success | Toast: "Ticket #XXXXX closed. Email sent to [reporter]." |
| Close error (409 — already closed) | Toast error: "This ticket was already closed by another user." |
| Re-open error (409 — already open) | Toast error: "This ticket is already open." |
| SLA exceeded | Amber row background; ⚠️ badge on SLA column |
## Flow 03: Duplicate Detection & Linking (FLW-04)

**Trigger:** Case worker opens a ticket and suspects it is a duplicate of an existing ticket.
**User Stories:** US-1.6, US-5.1, US-5.2
**Personas:** PER-03 (Dana Kowalski — Case Worker)
**Journey Reference:** JRN-03.2

```
[Staff Ticket Detail — SCR-07]
    │  "Similar tickets" panel auto-shown if Solr similarity match found
    │
    ├── [Proactive: "Possible duplicates" auto-suggestion]
    │       │  Solr: same category + proximity + submitted within 7 days
    │       ▼
    │   [Similar Tickets Panel: up to 3 suggestions with snippets]
    │
    └── [Manual: "Search for duplicate" button]
            │
            ▼
        [In-page Duplicate Search Panel]
            │  Text input + category filter
            │  Solr results in ≤500ms
            │
            ▼
        [Search Results with Ticket Snippets]
            │  (category, address, submission date, status)
            │
            ▼
        [Click "Link as duplicate of #XXXXX"]
            │
            ▼
        [Confirmation Dialog]
            │  "This will mark #CURRENT as a duplicate of #PARENT.
            │   A 'duplicate' action will be logged on both tickets."
            │
            ├── Confirm ──▶ [parent_id set on child]
            │                   │
            │                   ▼
            │               [Close form auto-shown]
            │               [Sub-status pre-selected: "Duplicate"]
            │               [Close notes pre-filled: "Duplicate of #PARENT"]
            │                   │
            │                   ▼
            │               [Close Ticket with Duplicate sub-status]
            │                   │
            │                   ▼
            │               [ticketHistory on child: closed/duplicate]
            │               [ticketHistory on parent: duplicate action logged]
            │               [Email to child reporter]
            │
            └── Cancel  ──▶ [Stay on ticket detail, no changes]
```

### Steps

1. **Proactive Suggestion** — On ticket detail load, Solr runs a background similarity query (same category_id + nearby lat/lon + `enteredDate` within 7 days). If 1–3 matches found, a "Possible duplicates" banner appears above the ticket body: "We found tickets that may be duplicates. [Review]."

2. **Similar Tickets Panel** — Collapsible panel showing up to 3 suggested tickets. Each shows: ticket ID, category, address, submitted date, current status, one-line description snippet. Buttons: "Link as duplicate" (per result) and "Not a duplicate" (dismisses suggestion).

3. **Manual Duplicate Search** — "Search for duplicate" button opens the in-page Solr search panel (below the ticket body, does not navigate away). Free-text input + category filter dropdown. Results appear inline in ≤500ms.

4. **Result Snippets** — Each result shows: `#ID — Category — Address — Submitted [date] — Status: [open/closed]`. One-line description snippet with matched terms highlighted. "Preview" link expands a read-only summary pane (does not navigate away).

5. **Link Confirmation** — Confirmation dialog clearly states what will happen on **both** the child and parent ticket. Includes parent ticket ID and summary for verification.

6. **Post-Link Close Form** — After linking, the close action form is automatically surfaced. Sub-status dropdown defaults to "Duplicate." Close notes pre-populated with "Duplicate of #[parent_id]." User can override both. One-click close completes the workflow.

7. **Audit Trail** — Both tickets receive history entries. Parent ticket's history shows: `[action: duplicate] Ticket #CHILD was marked as a duplicate of this ticket.` Child ticket's history shows `[action: closed / sub-status: Duplicate]`.

### States

| State | UI Treatment |
|-------|-------------|
| Loading similarity suggestions | Skeleton rows in "Possible duplicates" panel |
| No similarity matches | Panel hidden; "Search for duplicate" button still available |
| Duplicate search loading | Spinner inside search panel |
| No search results | "No matching tickets found. Try broader search terms." |
| Link confirmation pending | Modal overlay; parent ticket summary visible |
| Linking in progress | Dialog spinner; buttons disabled |
| Link + close success | Toast: "Ticket #CHILD closed as duplicate of #PARENT." Return to queue. |
| Link error (self-reference) | Toast error: "A ticket cannot be its own parent." |
| Link error (parent not found) | Toast error: "Parent ticket not found." |
| Already has parent_id | "Duplicate" action disabled with tooltip: "This ticket already has a parent." |
## Flow 04: Category Creation with Custom Fields (FLW-05)

**Trigger:** Department Supervisor navigates to Admin → Categories → New Category.
**User Stories:** US-10.1, US-10.2, US-10.3, US-10.6, US-2.4
**Personas:** PER-04 (Robert Osei — Department Supervisor)
**Journey Reference:** JRN-04.1

```
[Admin Navigation — "Categories" in Admin menu]
    │
    ▼
[Category List — SCR-09]
    │  Table: name, department, active, permission levels, SLA days
    │
    ▼
["New Category" button]
    │
    ▼
[Category Form — Step 1: Core Fields]
    │  Name, description, category group, department, active toggle
    │
    ▼
[Category Form — Step 2: Permissions & SLA]
    │  "Who can view?" / "Who can submit?" (plain-language labels)
    │  SLA days, notification reply email
    │
    ▼
[Category Form — Step 3: Custom Fields]
    │  Form builder UI (add field, set type, label, required flag)
    │  Live preview panel updates as fields are added
    │
    ▼
[Save Category]
    │  Server-side validation
    │
    ├── Validation errors ──▶ [Inline field-level errors; stay on form]
    │
    └── Save success ──▶ [Green banner: "Category 'X' is now live."]
                              │
                              ▼
                         [Category Detail / Edit view]
                         ["Preview as Citizen" button → modal preview]
```

### Sub-Flow: Edit Existing Category

```
[Category List] → [Click category name] → [Category Edit Form]
    │  Same form as creation; all fields pre-populated
    │
    ▼
[Save] ──▶ [categories.lastModified updated] ──▶ [Success banner]
```

### Sub-Flow: Deactivate Category

```
[Category Edit Form] → [Toggle "Active" to off] → [Save]
    │  Category hidden from public lists; existing tickets unaffected
    │
    └── Category with tickets ──▶ Allowed (deactivate; cannot delete)
    └── Category without tickets ──▶ Delete button available
```

### Steps

1. **Navigate to Admin** — "Admin" top-level nav item visible only to `role = 'staff'`. Breadcrumb: `Admin > Categories`. Category list shows: name, department, active status (toggle), permission level summary, SLA days.

2. **Core Fields** — Required: name (max 50 chars, character count shown), department (dropdown of existing departments). Optional: description, category group dropdown, `active` toggle (default true), `featured` toggle.

3. **Permissions & SLA** — Permission dropdowns labeled in plain English:
   - "Who can view this category?" → "Everyone (public)" / "Signed-in residents" / "Staff only"
   - "Who can submit reports?" → Same options
   - SLA days: numeric input with helper "Leave blank for no SLA target."
   - Notification reply email: text input with RFC 5322 format validation.
   - Tooltip links to RBAC documentation for each permission field.

4. **Custom Field Builder** — Add Custom Field button opens an inline field editor:
   - Field label (plain text)
   - Field type: Text / Number / Date / Dropdown (single) / Dropdown (multi)
   - Placeholder / helper text
   - Required / Optional toggle
   - For dropdown types: add/remove option values
   - Live preview panel on the right shows exactly how the field will appear on the citizen submission form.

5. **Save & Validate** — All required fields validated before save. Field-level inline error messages (not a single top-level banner). On success: green banner "Category '[name]' is now live. Citizens can submit reports immediately." Category immediately available in `GET /open311/v2/services`.

6. **Preview as Citizen** — "Preview as citizen" button opens a modal showing the full submission form as a citizen would see it, with all custom fields rendered. No test ticket is created. Read-only preview.

### States

| State | UI Treatment |
|-------|-------------|
| Category list loading | Skeleton table (5 rows) |
| Empty category list | "No categories yet. [Create First Category]" |
| Form saving | Submit button spinner; form fields disabled |
| Validation error | Red inline messages per field; focus jumps to first error |
| Save success | Green top-of-page banner; form remains for further edits |
| Delete blocked (has tickets) | Error toast: "Cannot delete a category with existing tickets. You can deactivate it instead." |
| Custom field preview | Live right-side panel updates on every field change |
| Unsaved changes navigation | Browser-standard "Leave page? Changes may not be saved." dialog |
## Flow 05: API Client Credential Rotation (FLW-06)

**Trigger:** Supervisor receives report of 403 errors from a third-party API consumer; navigates to diagnose and fix.
**User Stories:** US-11.6, US-0.3
**Personas:** PER-04 (Robert Osei — Department Supervisor)
**Journey Reference:** JRN-04.2

```
[Metrics Dashboard — SCR-13]
    │  Submission rate sparkline shows drop-off at 9:07 AM
    │
    ▼
[Admin → API Clients — SCR-11]
    │  Table: name, URL, api_key (masked), contact person, created date
    │
    ├── Find deleted client ──▶ [Client not in list; need to recreate]
    │
    └── Click "New API Client"
            │
            ▼
        [API Client Form]
            │  Name, URL, Contact Person (people search), Contact Method
            │  Generate API Key button ──▶ Auto-generates 50-char key
            │
            ▼
        [Save]
            │  api_key unique validation
            │
            ├── Duplicate key ──▶ [Error: "API key already exists. Regenerate."]
            │
            └── Save success ──▶ [Client list with new client]
                                     │
                                     ▼
                                 [Copy api_key to clipboard]
                                 [Share with integrator]
```

### Sub-Flow: Edit Existing Client

```
[Client List] → [Click client name] → [Client Edit Form]
    │  All fields pre-populated; api_key shown masked (••••xxxx)
    │  "Regenerate Key" button creates a new api_key immediately
    │
    └── Regenerate ──▶ [Confirmation: "Old key will stop working immediately."]
                            │
                            └── Confirm ──▶ [New key displayed; copy button shown]
```

### Steps

1. **Metrics Dashboard Context** — Supervisor notices submission rate drop in sparkline. Navigates to Admin → API Clients to investigate.

2. **API Client List** — Table showing: client name, URL, masked api_key (last 4 chars visible), contact person name, date created. Actions per row: Edit, Delete. "New API Client" button in page header.

3. **New Client Form** — Fields:
   - **Name** (required): short identifier for the integrator
   - **URL** (optional): integrator's application URL
   - **Contact Person** (required): people search autocomplete; must reference existing `people` record
   - **Contact Method** (optional): dropdown of `contactMethods` reference data
   - **API Key**: auto-generated on form load (can regenerate). Full key shown on this screen only — masked afterward.

4. **Key Generation** — "Generate API Key" button creates a new cryptographically random 50-char key. The key is shown in full in a read-only input with a copy-to-clipboard button. Warning: "Copy this key now — it will only be shown once in full."

5. **Save** — `api_key` uniqueness validated server-side. Duplicate returns HTTP 409 with inline error. On success, the new client is immediately usable — no restart required (live DB lookup on every `POST /open311/v2/requests`).

6. **Revoke / Delete** — Delete button on client row. Confirmation dialog: "Deleting this client will immediately invalidate the API key. Any integrator using this key will receive 403 errors." Clients referenced by existing tickets (`tickets.client_id`) return HTTP 409 and cannot be deleted.

### States

| State | UI Treatment |
|-------|-------------|
| Client list loading | Skeleton table |
| Empty client list | "No API clients configured. [Add First Client]" |
| API key on creation | Full key in copyable input; copy button; one-time-show warning |
| API key on edit | Masked: "••••••••••••••••••••••••••••••••••••••••••••xxxx" |
| Regenerate confirmation | Modal with clear warning about immediate key invalidation |
| Save in progress | Submit spinner; form locked |
| Duplicate key error | Inline: "This API key already exists. Click 'Generate' for a new one." |
| Delete blocked (tickets exist) | Error toast: "This client has associated tickets and cannot be deleted." |
| New key works immediately | No restart needed; confirmation message states this |
## Flow 06: Bookmark Save & Recall (FLW-07)

**Trigger:** Authenticated user views search results and wants to save the current query for future reference.
**User Stories:** US-12.1, US-12.2, US-12.3, US-12.4
**Personas:** PER-02 (Priya Nair), PER-03 (Dana Kowalski)
**Journey Reference:** JRN-02.2

```
[Search Results Page — SCR-08]
    │  Results returned from Solr
    │
    ▼
["Save this search" affordance — visible only to authenticated users]
    │  (Bookmark icon in search results header)
    │
    ▼
[Save Bookmark Modal]
    │  Name input (pre-populated from query string)
    │  e.g., "pothole elm street — Open"
    │
    ├── Save ──▶ POST /bookmarks {name, requestUri: current URL}
    │               │
    │               ├── Success ──▶ [Modal closes; results remain]
    │               │               [Toast: "Bookmark 'X' saved. View your bookmarks →"]
    │               │
    │               └── Error ──▶ [Inline error; modal stays open]
    │
    └── Cancel ──▶ [Modal closes; no bookmark created]

[Personal Dashboard Sidebar / Bookmarks Page — SCR-12]
    │  List of saved bookmarks
    │
    ▼
[Click bookmark] ──▶ [Navigate to bookmark.requestUri]
                           │
                           ▼
                      [Search re-executed against current live Solr index]
```

### Steps

1. **Discoverability** — "Save this search" affordance: a bookmark icon (🔖) with text "Save this search" appears in the search results header bar, visible only to authenticated users (anonymous users see nothing). This is the critical discoverability gate (JRN-02.2 Stage 1).

2. **Save Bookmark Modal** — Small modal with:
   - Name input: pre-populated with sanitized query + active filters (e.g., "pothole elm street — Open")
   - User can edit the name freely
   - "Save" primary button
   - "Cancel" secondary button
   - Modal appears over the results page without navigation

3. **Success Feedback** — Modal closes immediately. Toast notification at top: "Bookmark '[name]' saved. [View your bookmarks →]" The link opens the bookmarks management page in a new context (or navigates after a delay).

4. **Bookmark List** (SCR-12) — Page listing all user's bookmarks. Each row: bookmark name, creation date, "Run" button (navigates to `requestUri`), "Delete" button (trash icon with confirmation).

5. **Recall** — Clicking "Run" navigates to the stored `requestUri`. The Solr query re-executes against the current live index — results reflect current ticket state, not a snapshot from when the bookmark was saved.

6. **Dashboard Integration** — A "Saved Searches" sidebar panel appears on the personal ticket history dashboard (SCR-05) showing the 3 most recent bookmarks. "View all bookmarks" link at the bottom.

7. **Delete Bookmark** — Trash icon triggers inline confirmation: "Delete bookmark '[name]'?" with Yes/No inline buttons. No full-page modal for a simple delete. HTTP 204 on success.

### States

| State | UI Treatment |
|-------|-------------|
| Anonymous user (no bookmark affordance) | "Save this search" button hidden entirely |
| Save bookmark modal | Small centered modal; backdrop blur |
| Saving in progress | Save button spinner; input disabled |
| Save success | Toast: "Bookmark saved. [View your bookmarks →]" |
| Save error | Inline error in modal; modal stays open |
| Bookmark list loading | Skeleton list rows |
| Empty bookmark list | "No saved searches yet. Run a search and click 'Save this search' to get started." |
| Recall: Solr unavailable | "Search is temporarily unavailable — try again in a moment." (not a generic 500) |
| Delete confirmation | Inline Yes/No without page modal |
| Delete in progress | Row fades; spinner appears |
| Delete success | Row removed with animation; no toast needed |
## Screen 00: Public Ticket Submission Form (SCR-01)

**Purpose:** Allow anonymous or authenticated citizens to submit a new service request.
**User Stories:** US-1.1, US-0.3, US-2.1, US-8.1
**Personas:** PER-01, PER-02
**Feature Refs:** F0, F1, F2, F8, F9

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [uReport Logo]    Report an Issue   [Sign In]               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Report a City Service Issue           ✓ No account needed │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Step 1 of 4: Choose a Category                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔍 Search categories...                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Roads & Sidewalks                                          │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐  │
│  │ 🛣️ Pothole /    │ │ 🚧 Street Sign  │ │ 🚶 Sidewalk  │  │
│  │ Pavement Damage │ │ Maintenance     │ │ Repair       │  │
│  └─────────────────┘ └─────────────────┘ └──────────────┘  │
│                                                             │
│  Sanitation                                                 │
│  ┌─────────────────┐ ┌─────────────────┐                   │
│  │ 🗑️ Missed       │ │ 🚮 Illegal      │                   │
│  │ Garbage Pickup  │ │ Dumping         │                   │
│  └─────────────────┘ └─────────────────┘                   │
│                                                             │
│  [Step indicator: ● ○ ○ ○]                                 │
├─────────────────────────────────────────────────────────────┤
│ [Footer: About | Privacy | Open311 API]                     │
└─────────────────────────────────────────────────────────────┘
```

**Step 2: Location**
```
┌─────────────────────────────────────────────────────────────┐
│  Step 2 of 4: Where is the issue?                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [Map — interactive, zoomable]                        │  │
│  │                                                      │  │
│  │         📍 (draggable pin)                           │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  📍 123 Main Street, City, ST 12345   [Adjust pin]         │
│                                                             │
│  OR enter address manually:                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 123 Main Street...                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [Use my location 📡]    [< Back]    [Continue →]          │
└─────────────────────────────────────────────────────────────┘
```

**Step 3: Description & Photo**
```
┌─────────────────────────────────────────────────────────────┐
│  Step 3 of 4: Describe the issue                            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Be specific: size, exact corner, nearest landmark    │  │
│  │                                                      │  │
│  │                                    0 / 4000 chars   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [Custom field if category has customFields]                │
│  Estimated volume (e.g., 3 bags, 1 truckload):             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Attach a photo (optional — helps us locate the issue):     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 📷 Drag & drop or [Browse files]                    │  │
│  │ JPG, PNG, GIF, PDF, DOC up to 10 MB                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [< Back]    [Continue →]                                   │
└─────────────────────────────────────────────────────────────┘
```

**Step 4: Review & Submit**
```
┌─────────────────────────────────────────────────────────────┐
│  Step 4 of 4: Review your report                            │
│                                                             │
│  Category:    Pothole / Pavement Damage        [Edit]       │
│  Location:    123 Main Street, City, ST        [Edit]       │
│  Description: Large pothole on corner of...    [Edit]       │
│  Photo:       pothole_photo.jpg                [Remove]     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [Submit Report]                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  By submitting, you agree to the city's terms of service.  │
└─────────────────────────────────────────────────────────────┘
```

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Category selection cards | Main content area, above fold |
| Primary | "No account needed" badge | Below headline, immediately visible |
| Primary | Location map + pin | Step 2 full-width |
| Primary | Submit button | Step 4, full-width, unmissable |
| Secondary | Step indicator | Below headline on all steps |
| Secondary | Category descriptions | Card subtitles |
| Secondary | Character count | Inline with text area |
| Tertiary | Terms of service | Below submit button, small text |
| Tertiary | Photo guidance | Label text on upload zone |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Default | Multi-step form, step 1 active | Step indicator at step 1 |
| Loading categories | Skeleton grid (6 placeholder cards with shimmer) | — |
| Category requires auth | Lock icon on card | "Sign in to report in this category" on hover |
| GPS locating | Map with pulsing dot | "Finding your location…" |
| GPS failed | Map with manual input highlighted | "Location unavailable. Please enter your address." |
| File uploading | Progress bar with filename | "Uploading [filename]…" |
| File error (size) | Red outline on upload zone | "File exceeds 10 MB limit." |
| File error (type) | Red outline on upload zone | "Accepted types: JPG, PNG, GIF, PDF, DOC, DOCX, TXT" |
| Submitting | Full-width progress indicator | "Sending your report…" |
| Submit success | Navigate to confirmation screen | — |
| Submit error | Red inline messages per field | Field-level validation messages |
| Network timeout (>5s) | Timeout message shown | "This is taking longer than expected. Still trying…" |

### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Category cards | Selection grid | Click selects; second click on selected deselects; keyboard navigable |
| Category search | Text input | Live filter of visible cards |
| "Use my location" | Button | Triggers navigator.geolocation; drops pin; resolves address via reverse geocode |
| Map pin | Draggable marker | Drag updates lat/lon and re-resolves address |
| "Adjust pin" | Link | Switches map to drag mode |
| Photo upload | Drag & drop zone | Drag files over zone highlights it; drop validates and uploads |
| Step indicator | Progress dots | Clickable to navigate to completed steps; future steps not clickable |
| Back / Continue | Buttons | Validates current step before advancing |
## Screen 01: Ticket Submission Confirmation (SCR-02)

**Purpose:** Confirm successful ticket submission and give citizen a copyable reference token.
**User Stories:** US-1.1, US-0.3, US-0.6
**Personas:** PER-01, PER-02
**Feature Refs:** F0, F1

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [uReport Logo]    Report an Issue   [Sign In]               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              ✅ Report Received!                            │
│                                                             │
│  Your report has been submitted to the city.                │
│  You'll receive a response within 5 business days.          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Reference Number                                    │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  #84721                                        │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                      │  │
│  │  Tracking Token                                      │  │
│  │  ┌───────────────────────────────┐  [📋 Copy]       │  │
│  │  │ a7f3-9c21-4b8e-...           │                   │  │
│  │  └───────────────────────────────┘                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Save your reference number — you can use it to check the  │
│  status of your report at any time.                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 📧 Send confirmation to email (optional)             │  │
│  │ ┌──────────────────────────────────────────────────┐ │  │
│  │ │ your@email.com                                   │ │  │
│  │ └──────────────────────────────────────────────────┘ │  │
│  │ [Send Confirmation Email]                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [Check Status with Token]   [Report Another Issue]         │
│                                                             │
│  What happens next?                                         │
│  • Your report is assigned to the Public Works department   │
│  • A case worker will review it within 2 business days      │
│  • You'll receive an email if you provided one              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [Footer]                                                    │
└─────────────────────────────────────────────────────────────┘
```

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Success checkmark + headline | Hero area, immediately visible |
| Primary | Ticket ID (reference number) | Prominent box, large text |
| Primary | Copy-to-clipboard token button | Inline with token |
| Secondary | Email confirmation input | Below token box |
| Secondary | "What happens next?" timeline | Below primary actions |
| Tertiary | "Report Another Issue" link | Secondary CTA |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Default | Full confirmation page | ✅ green success icon |
| Email sent | Input replaced with "✅ Email sent to [address]" | Success message |
| Email error | Inline error below input | "Could not send email. Please note your token manually." |
| Copy success | "Copy" button briefly shows "✅ Copied!" | 2-second feedback |

### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Token copy button | Icon button | Copies token to clipboard; visual feedback 2s |
| Email input | Optional text input + submit | Sends one-time confirmation email |
| "Check Status with Token" | Link | Navigates to token lookup page |
| "Report Another Issue" | Link | Navigates back to submission form |
## Screen 02: Public Ticket Status / Detail View (SCR-03)

**Purpose:** Allow anonymous and authenticated users to view the current status of a specific ticket. Available in HTML, JSON, XML, CSV, and TXT formats.
**User Stories:** US-0.5, US-1.10, US-2.1, US-2.5, US-3.1–3.5
**Personas:** PER-01, PER-02
**Feature Refs:** F0, F1, F2, F3

### Layout (HTML — Public View)

```
┌─────────────────────────────────────────────────────────────┐
│ [Global Nav — Anonymous or Authenticated]                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Service Request #84721                    🟢 Open          │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────┐  ┌────────────────────┐  │
│  │ Details                     │  │ Location           │  │
│  │ ─────────────────────────── │  │ ─────────────────  │  │
│  │ Category: Pothole / Pavement│  │ [Mini map]         │  │
│  │ Submitted: Jun 21, 2026     │  │                    │  │
│  │ Last Updated: Jun 23, 2026  │  │ 123 Main Street    │  │
│  │                             │  │ City, ST 12345     │  │
│  │ Description:                │  └────────────────────┘  │
│  │ Large pothole on corner     │                           │
│  │ of Main & Oak...            │  Format:                  │
│  │                             │  [HTML] [JSON] [XML]      │
│  │ Media:                      │  [CSV]  [TXT]             │
│  │ [📷 View photo]             │                           │
│  └─────────────────────────────┘                           │
│                                                             │
│  Ticket History                                             │
│  ─────────────────────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Jun 21, 2026 10:23 AM  — Submitted                   │  │
│  │ Jun 23, 2026 2:14 PM   — Assigned to case worker     │  │
│  │   Email notification sent ✉️                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [← Back to Results]                                        │
├─────────────────────────────────────────────────────────────┤
│ [Footer]                                                    │
└─────────────────────────────────────────────────────────────┘
```

### PII Masking Rules (Non-Staff View)

The following fields are **omitted** from public/anonymous views per US-2.5:
- Reporter name and contact details (`reportedByPerson_id`, email, phone)
- Case worker names in history entries (`enteredByPerson_id`, `actionPerson_id`)
- History entries of type `comment` (staff-only internal notes) are hidden entirely

### Format Switcher

The "Format" panel in the sidebar provides direct links to alternate format representations:
- `HTML` — current page (default for browser requests)
- `JSON` — `/open311/v2/requests/:id.json`
- `XML` — `/open311/v2/requests/:id.xml`
- `CSV` — `/tickets/:id.csv` (downloads file)
- `TXT` — `/tickets/:id.txt`

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Ticket ID + status badge | Page header |
| Primary | Category and submitted date | Details card |
| Primary | Description | Details card |
| Secondary | Location map | Right sidebar |
| Secondary | History timeline | Below details |
| Secondary | Format switcher | Right sidebar |
| Tertiary | "Back to results" link | Below content |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Default (open) | 🟢 Open badge | Normal view |
| Closed | 🔴 Closed badge + sub-status label (Resolved / Duplicate / Bogus) | Closure date shown |
| Duplicate of parent | Note: "This report was identified as a duplicate of #[parent_id]" | Link to parent ticket |
| No media | Photo section hidden | — |
| Media loading | Thumbnail placeholder | Spinner |
| 404 (ticket not visible) | "Service request not found" error page | Link to submit new request |
| Authenticated (own ticket) | Same as above + "Your Report" badge in header | — |
## Screen 03: Login / OIDC Redirect Interstitial (SCR-04)

**Purpose:** Reassure the user during the OIDC redirect that they are in the correct flow before leaving the site.
**User Stories:** US-4.1, US-4.2
**Personas:** PER-02, PER-03
**Feature Refs:** F4

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [uReport Logo — centered]                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                 [City Logo / Crest]                         │
│                                                             │
│         You're being redirected to the city's               │
│           secure sign-in page                               │
│                                                             │
│         ──────────────────────────────                      │
│                   [■■■■□□□□□□]                              │
│         Connecting to [city-idp.example.gov]…               │
│                                                             │
│         This is the same account you use for                │
│         parking permits and other city services.            │
│                                                             │
│         If you are not redirected within 10 seconds:        │
│         [Continue to Sign In →]                             │
│                                                             │
│         [Cancel — return to home]                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    ─────────────── After sign-in ───────────────────        │
│                                                             │
│    ✅ Sign-in complete! Returning to uReport…               │
│       (This state shows briefly on callback before          │
│        the redirect to the return_to URL)                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### OIDC Error Page

```
┌─────────────────────────────────────────────────────────────┐
│ [uReport Logo]                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              ⚠️ Sign-in Unsuccessful                        │
│                                                             │
│  Something went wrong with the sign-in process.             │
│  This can happen if your browser blocks cookies or          │
│  if the session timed out.                                  │
│                                                             │
│  [Try Signing In Again]     [Return to Home]                │
│                                                             │
│  If the problem persists, please contact support.           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | City logo + reassurance text | Center of page |
| Primary | Progress indicator | Centered below text |
| Secondary | "Same account as parking permits" note | Below progress |
| Secondary | IdP URL shown | Small text near progress bar |
| Tertiary | Manual "Continue" fallback link | Below main content |
| Tertiary | Cancel link | Below continue |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Redirecting | Progress bar animating | "Connecting to [idp-url]…" |
| Callback success (brief) | ✅ green checkmark | "Sign-in complete! Returning to uReport…" |
| State mismatch error | ⚠️ error page | "Something went wrong with the sign-in process. [Try Again]" |
| IdP 502 error | ⚠️ error page | "The sign-in service is temporarily unavailable." |
| Timeout (>10s) | Manual link becomes prominent | "If you are not redirected…" |
## Screen 04: Personal Ticket History Dashboard (SCR-05)

**Purpose:** Show an authenticated resident all their submitted tickets, filterable by status.
**User Stories:** US-1.2, US-2.2, US-4.5, US-12.4
**Personas:** PER-02
**Feature Refs:** F1, F2, F4, F12

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo]  My Tickets  Report an Issue  Bookmarks | [Name ▾]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  My Service Requests                                        │
│  Hello, Priya — You have 4 open requests.                   │
│                                                             │
│  ┌─────────────────────────────┐  ┌────────────────────┐  │
│  │ TICKET LIST                 │  │ SAVED SEARCHES     │  │
│  │ ─────────────────────────── │  │ ─────────────────  │  │
│  │ Filters:                    │  │ 🔖 Elm St Potholes │  │
│  │ [All ▾] [Status ▾] [Sort ▾]│  │ 🔖 Streetlight...  │  │
│  │                             │  │ 🔖 Graffiti...     │  │
│  │ ┌─────────────────────────┐ │  │ [View all →]       │  │
│  │ │ #84721 Pothole/Pavement │ │  └────────────────────┘  │
│  │ │ 🟢 Open   Jun 21, 2026  │ │                           │
│  │ │ Last updated Jun 23     │ │  ACCOUNT                  │
│  │ └─────────────────────────┘ │  ─────────────────        │
│  │ ┌─────────────────────────┐ │  Priya Nair               │
│  │ │ #81409 Streetlight Out  │ │  priya@example.com        │
│  │ │ 🟢 Open   Jun 10, 2026  │ │  [Edit Profile]           │
│  │ │ Assigned to Dana K.     │ │                           │
│  │ └─────────────────────────┘ │                           │
│  │ ┌─────────────────────────┐ │                           │
│  │ │ #79003 Graffiti - Park  │ │                           │
│  │ │ 🔴 Closed  May 15, 2026 │ │                           │
│  │ │ Resolved                │ │                           │
│  │ └─────────────────────────┘ │                           │
│  │                             │                           │
│  │ [Show 10 more...]           │                           │
│  └─────────────────────────────┘                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [Footer]                                                    │
└─────────────────────────────────────────────────────────────┘
```

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | "You have X open requests" count | Page subtitle, always visible |
| Primary | Ticket list (most recent first) | Main content column |
| Primary | Status badge (open/closed) | Per ticket row, immediately visible |
| Secondary | Status filter tabs / dropdown | Above ticket list |
| Secondary | Saved searches panel | Right sidebar |
| Secondary | Account info | Right sidebar |
| Tertiary | "Show more" pagination | Below list |

### Ticket Row Elements

Each row in the list shows:
- Ticket ID (monospace, linked to detail view)
- Category name
- Status badge (🟢 Open / 🔴 Closed + sub-status)
- Submitted date
- Last modified date
- If assigned: "Assigned to [first name last initial]." (no PII exposure to other users)
- If closed: sub-status label (Resolved / Duplicate / Bogus)

### Filter Controls

| Filter | Options | Behavior |
|--------|---------|----------|
| Status | All / Open / Closed | Instant filter; URL param updated |
| Sort | Date Submitted ↓ / Date Submitted ↑ / Last Updated ↓ | Instant sort |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Loading | Skeleton rows (3 rows, shimmer) | — |
| Empty (no tickets) | "You haven't submitted any reports yet." with CTA "Report an Issue" | Empty state illustration |
| Empty (filtered) | "No [status] requests found." with "Show all" link | — |
| Notification match | If arriving from email notification link: ticket that matches is highlighted with blue border | "This is the ticket from your recent email notification." |
| Load more | "Show 10 more…" link at bottom | Append more rows; no full page reload |
## Screen 05: Staff Ticket Queue / List (SCR-06)

**Purpose:** Give case workers and supervisors a filterable, sortable view of all tickets in their department queue.
**User Stories:** US-1.3, US-1.5, US-2.3, US-3.3, US-5.1, US-5.2
**Personas:** PER-03, PER-04
**Feature Refs:** F1, F2, F3, F5

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] [Tickets ▾] [Search] [Admin ▾] [Reports] | [Name ▾]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Ticket Queue                            [+ New Ticket]     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ FILTERS                                              │  │
│  │ Department: [Public Works ▾]  Status: [Open ▾]      │  │
│  │ Category:   [All ▾]           Assignee: [All ▾]     │  │
│  │ Date From:  [──────────]      Date To:  [──────────] │  │
│  │ [Apply Filters]   [Clear All]     [Export CSV ↓]    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  342 tickets  Sort by: [SLA Elapsed Days ▾]                │
│                                                             │
│  ☐  ID     Category        Location      Status  SLA  Asgn │
│  ─────────────────────────────────────────────────────────  │
│  ☐  #84712 ⚠️Pothole        Main & Oak    🟢 Open 12d  —   │
│  ☐  #84698 ⚠️Drainage       Elm & 3rd     🟢 Open  9d  DK  │
│  ☐  #84721  Graffiti        Park Ave      🟢 Open  3d  —   │
│  ☐  #84687  Street Sign     Maple St      🟢 Open  2d  RO  │
│  ☐  #84703  Missed Pickup   Oak St        🟢 Open  1d  DK  │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [Bulk action bar — visible when rows selected]             │
│  2 tickets selected: [Assign to ▾]  [Export ↓]  [✕ Clear] │
│                                                             │
│  [← Previous]  Page 1 of 14  [Next →]                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [Footer]                                                    │
└─────────────────────────────────────────────────────────────┘
```

### Column Definitions

| Column | Description | Sortable |
|--------|-------------|----------|
| ☐ | Checkbox for bulk selection | — |
| ID | Ticket ID (linked) | Yes |
| Category | Service category name | Yes |
| Location | Address string (truncated) | No |
| Status | 🟢 Open / 🔴 Closed badge | Yes |
| SLA | Days elapsed since `enteredDate`. ⚠️ badge if > `slaDays` | Yes (default sort) |
| Asgn | Assignee initials or "—" if unassigned | Yes |

### Filter Bar

| Filter | Control Type | Behavior |
|--------|-------------|----------|
| Department | Dropdown (pre-selected to user's department) | Live filter; updates URL param |
| Status | Dropdown: All / Open / Closed | Live filter |
| Category | Multi-select dropdown | Live filter |
| Assignee | Dropdown: All / Unassigned / [staff list] | Live filter |
| Date From / To | Date pickers | Filter by `enteredDate` range |
| Export CSV | Button | Downloads CSV with current filter applied |

### Bulk Actions

When one or more checkboxes are selected, a bulk action bar slides up from the bottom of the filter area:
- **Assign to:** Dropdown of department staff; apply assignment to all selected tickets
- **Export:** Downloads CSV of selected tickets only
- **Clear:** Deselects all

### SLA Visual Indicators

- `slaDays` not exceeded: no special treatment
- `slaDays` exceeded: ⚠️ amber warning icon before ticket ID; entire row has `background: #fef3c7`
- `slaDays` not configured for category: no indicator shown

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Loading (first load) | Skeleton table (5 rows, shimmer) | — |
| Loading (filter change) | Table rows greyed out; spinner in filter bar | "Updating…" |
| Empty queue (filtered) | "No tickets match your current filters." with "Clear filters" | — |
| Empty queue (all) | "No tickets in your queue. 🎉" | — |
| Bulk assign in progress | Bulk bar shows spinner; rows locked | "Assigning [N] tickets…" |
| Bulk assign success | Toast: "[N] tickets assigned to [Name]." | — |
| Export in progress | Export button shows spinner | "Preparing export…" |
| Export ready | Browser download triggered | — |
## Screen 06: Staff Ticket Detail (SCR-07)

**Purpose:** Full ticket detail view for staff — showing all fields, assignee controls, action panel, history timeline, attachments, and duplicate search.
**User Stories:** US-1.3–1.10, US-2.3, US-5.1, US-5.3, US-8.1–8.4
**Personas:** PER-03, PER-04
**Feature Refs:** F1, F2, F5, F8, F15

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Staff Global Nav]                                          │
├─────────────────────────────────────────────────────────────┤
│ Tickets > #84712                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  #84712 — Pothole / Pavement Damage        🟢 Open  ⚠️12d │
│                                                             │
│  ┌───────────────────────┐  ┌───────────────────────────┐  │
│  │ TICKET DETAILS        │  │ ACTIONS PANEL             │  │
│  │ ─────────────────── ─ │  │ ──────────────────────── ─│  │
│  │ Category:   Pothole   │  │ Assign To:                │  │
│  │ Department: Pub Works │  │ [Dana Kowalski ▾]  [Save] │  │
│  │ Issue Type: Report    │  │                           │  │
│  │ Contact:    Web Form  │  │ Status:  🟢 Open          │  │
│  │ Submitted:  Jun 21    │  │ [Close Ticket]            │  │
│  │ Reporter:   [PII]     │  │ [Re-open] (if closed)     │  │
│  │                       │  │                           │  │
│  │ Location:   Main & Oak│  │ [Mark as Duplicate]       │  │
│  │ [Mini map]            │  │                           │  │
│  │                       │  │ SUB-STATUS                │  │
│  │ Description:          │  │ — (not closed)            │  │
│  │ Large pothole on the  │  │                           │  │
│  │ corner of Main & Oak, │  │ SLA: ⚠️ 12 days elapsed  │  │
│  │ approximately 30cm... │  │ Target: 5 days            │  │
│  │ [Edit description]    │  │                           │  │
│  │                       │  └───────────────────────────┘  │
│  │ Custom Fields:        │                                  │
│  │ (none for this cat.)  │  ┌───────────────────────────┐  │
│  │                       │  │ REPORTER (PII — Staff)    │  │
│  │ Attachments:          │  │ ──────────────────────── ─│  │
│  │ [📷 pothole.jpg] [✕]  │  │ Marcus Webb               │  │
│  │ [+ Add Attachment]    │  │ marcus@email.com           │  │
│  └───────────────────────┘  │ (Web Form)                │  │
│                              └───────────────────────────┘  │
│                                                             │
│  ─────── POSSIBLE DUPLICATES ───────────────────────────── │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ We found similar tickets:                            │  │
│  │ #84698 — Drainage — Elm & 3rd — Jun 20 — Open        │  │
│  │ [Link as duplicate]  [Not a duplicate]               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ─────── ADD TO TICKET ──────────────────────────────────  │
│                                                             │
│  🔒 Staff Comment (internal — not sent to reporter)         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  [Add Comment]                                              │
│                                                             │
│  ✉️ Reply to Reporter (sends email notification)            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  [Send Reply]                                               │
│                                                             │
│  ─────── SEARCH FOR DUPLICATE ──────────────────────────── │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔍 Search tickets...    [Category ▾]   [Search]     │  │
│  │ ─────────────────────────────────────────────────── │  │
│  │ [Results appear here inline]                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ─────── TICKET HISTORY ────────────────────────────────── │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Jun 21, 2026 10:23 AM · Submitted                    │  │
│  │   Entered by: Marcus Webb (Web Form)                 │  │
│  │                                                      │  │
│  │ Jun 23, 2026 2:14 PM · Assigned                      │  │
│  │   Assigned to: Dana Kowalski                         │  │
│  │   ✉️ Email notification sent to reporter + assignee  │  │
│  │                                                      │  │
│  │ 🔒 Jun 23, 2026 3:02 PM · Staff Comment              │  │
│  │   "Crew inspected — material ordered, repair Fri"    │  │
│  │   By: Dana Kowalski                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [Export ticket history: JSON | XML | CSV | TXT]            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Ticket ID, status, SLA badge | Page header |
| Primary | Actions panel (assign, close) | Right column, sticky |
| Primary | Description | Left column |
| Secondary | Reporter info (PII — staff only) | Right column below actions |
| Secondary | Possible duplicates panel | Below details, above comment area |
| Secondary | Staff comment + reply fields | Middle section |
| Secondary | History timeline | Bottom section |
| Tertiary | Export links | Below history |
| Tertiary | Custom fields | Below description if present |

### Close Ticket Modal

When "Close Ticket" is clicked:
```
┌──────────────────────────────────────────────┐
│ Close Ticket #84712                          │
│ ─────────────────────────────────────────── │
│ Sub-status (required):                       │
│ ○ Resolved  ○ Duplicate  ○ Bogus            │
│                                              │
│ Close notes (optional):                      │
│ ┌────────────────────────────────────────┐  │
│ │ Pothole filled 2026-06-21 by crew...  │  │
│ └────────────────────────────────────────┘  │
│                                              │
│ ✉️ This will send an email notification to:  │
│    marcus@email.com                          │
│                                              │
│ [Cancel]              [Close Ticket]         │
└──────────────────────────────────────────────┘
```

### Comment vs Reply Visual Distinction

| Element | Visual Style |
|---------|-------------|
| Staff Comment area | Light blue background (`#eff6ff`); 🔒 lock icon in label; label text: "Staff Comment (internal — not sent to reporter)" |
| Reply to Reporter area | White background with blue left border; ✉️ email icon in label; label text: "Reply to Reporter (sends email notification to [email])" |

### History Entry Types

| Action | Visual Indicator |
|--------|-----------------|
| open (submitted) | Plain timestamp entry |
| assignment | Person name shown |
| update | Change summary shown |
| changeCategory | "Category changed from X to Y" |
| changeLocation | "Location changed" |
| comment | 🔒 lock icon prefix; staff-only visibility |
| response | ✉️ icon prefix |
| closed | Red badge; sub-status shown |
| duplicate | Links to parent/child ticket |
| upload_media | 📎 paperclip icon; filename shown |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Loading | Skeleton layout | — |
| Ticket not found | 404 with "Return to Queue" | — |
| Saving assignment | Spinner in assignee row | "Saving…" |
| Assignment saved | Toast: "Ticket assigned to [Name]" | — |
| Comment saving | Textarea disabled; spinner | — |
| Comment saved | Toast: "Comment added." | — |
| Reply sending | Textarea disabled; spinner | "Sending reply…" |
| Reply sent | Toast: "Reply sent to [email]." | — |
| Close modal open | Modal overlay | Full close form |
| Close in progress | Modal spinner | — |
| Ticket closed | Status badge → 🔴 Closed; close button → Re-open | Toast: "Ticket #84712 closed." |
| Media uploading | Progress bar in attachments section | — |
| Media upload error | Inline error in attachment area | "Upload failed: [reason]" |
## Screen 07: Staff Search — Solr Full-Text (SCR-08)

**Purpose:** Provide full-text Solr search with filters and facets for staff ticket discovery and bookmarking.
**User Stories:** US-5.1, US-5.2, US-5.3, US-12.1
**Personas:** PER-02, PER-03
**Feature Refs:** F5, F12

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Staff Global Nav]                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Search Tickets                                             │
│  ┌──────────────────────────────────────────┐ [Search]    │
│  │ pothole elm street                       │             │
│  └──────────────────────────────────────────┘             │
│                                                             │
│  ┌───────────────┐  ┌──────────────────────────────────┐  │
│  │ FILTERS       │  │ RESULTS                          │  │
│  │ ─────────────  │  │ ─────────────────────────────── │  │
│  │ Status        │  │ 47 results for "pothole elm st"  │  │
│  │ ○ All         │  │ Sort: [Relevance ▾]              │  │
│  │ ● Open        │  │ 🔖 Save this search              │  │
│  │ ○ Closed      │  │                                  │  │
│  │               │  │ ┌──────────────────────────────┐ │  │
│  │ Category      │  │ │ #84698  Drainage              │ │  │
│  │ Pothole (12)  │  │ │ 🟢 Open — Elm & 3rd           │ │  │
│  │ Drainage (8)  │  │ │ Jun 20, 2026                  │ │  │
│  │ Graffiti (4)  │  │ │ water pooling at **elm** st.. │ │  │
│  │ [+ 3 more]    │  │ └──────────────────────────────┘ │  │
│  │               │  │ ┌──────────────────────────────┐ │  │
│  │ Department    │  │ │ #84712  Pothole               │ │  │
│  │ Pub Works(20) │  │ │ 🟢 Open — Main & Oak           │ │  │
│  │ Sanitation(9) │  │ │ Jun 21, 2026                  │ │  │
│  │               │  │ │ Large **pothole** on **elm**.. │ │  │
│  │ Date Range    │  │ └──────────────────────────────┘ │  │
│  │ From: [────]  │  │                                  │  │
│  │ To:   [────]  │  │ [← Previous] Page 1 of 4 [Next→]│  │
│  │               │  └──────────────────────────────────┘  │
│  │ [Clear Filters│                                          │
│  └───────────────┘                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Search Result Row

Each result row shows:
- Ticket ID (linked to detail)
- Category name
- Status badge
- Location string
- Submitted date
- Description snippet with matched query terms **bolded**
- Assignee initials (or "—" if unassigned)

### Facet Panel

Left sidebar facets update based on the current query results (not the full index):
- **Status:** Open / Closed counts
- **Category:** Top categories by count; "Show more" to expand
- **Department:** Counts per department
- **Date Range:** Free-text date inputs (ISO 8601)

Selecting a facet applies it as a filter query and refreshes results. Active filters shown as removable chips above the results list.

### "Save this search" Affordance

Visible only to authenticated users. Located in the results header bar next to the result count. Clicking opens the bookmark save modal (see Flow-06-bookmarks.md).

### Format Export

Staff can export search results via the format switcher in the results header:
- CSV export: downloads current filtered results as CSV
- JSON/XML links available for API consumers

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Initial (no query) | Empty results area; facets not shown | "Search for tickets using the search box above." |
| Loading | Results area shows skeleton rows | Spinner in search button; "Searching…" |
| Results returned | Results list; facets populated | Result count shown |
| No results | "No tickets found for '[query]'. Try a broader search or adjust filters." | — |
| Solr unavailable | Error banner | "Search is temporarily unavailable. Try again in a moment." |
| Facet applied | Active filter chip above results; facet checkbox checked | Filter chip with "×" to remove |
| Multiple filters | Multiple chips; "Clear all filters" link | — |
| Bookmark saving | Modal (see SCR-12) | — |
| Anonymous user | "Save this search" hidden; CSV export hidden | — |
## Screen 08: Category Admin — CRUD + Custom Field Builder (SCR-09)

**Purpose:** Allow department supervisors to create, edit, and deactivate service categories with custom fields, SLA targets, and permission levels.
**User Stories:** US-10.1, US-10.2, US-10.3, US-10.4, US-10.5, US-10.6, US-2.4
**Personas:** PER-04
**Feature Refs:** F10, F2, F7

### Layout — Category List

```
┌─────────────────────────────────────────────────────────────┐
│ [Staff Global Nav — Admin highlighted]                      │
├─────────────────────────────────────────────────────────────┤
│ Admin > Categories                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Service Categories                    [+ New Category]     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Name          Dept        Active  View     Post  SLA  │  │
│  │ ─────────────────────────────────────────────────── │  │
│  │ Pothole       Pub Works   ●       Anon     Anon   5d  │  │
│  │ Streetlight   Pub Works   ●       Public   Public 3d  │  │
│  │ Graffiti      Sanitation  ●       Anon     Public 7d  │  │
│  │ [Old Service] Pub Works   ○       Staff    Staff  —   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [Category Groups: Manage Groups]   [Departments: Manage]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Layout — Category Edit Form

```
┌─────────────────────────────────────────────────────────────┐
│ Admin > Categories > Edit "Pothole / Pavement Damage"       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────┐  ┌───────────────────┐  │
│  │ CORE DETAILS                 │  │ LIVE PREVIEW      │  │
│  │                              │  │ ────────────────── │  │
│  │ Name *                       │  │ How citizens see  │  │
│  │ ┌──────────────────────────┐ │  │ this category:    │  │
│  │ │ Pothole / Pavement Damage│ │  │                   │  │
│  │ └──────────────────────────┘ │  │ ┌───────────────┐ │  │
│  │ 26 / 50 characters           │  │ │ 🛣️ Pothole /  │ │  │
│  │                              │  │ │ Pavement...   │ │  │
│  │ Description                  │  │ │ Report a...   │ │  │
│  │ ┌──────────────────────────┐ │  │ └───────────────┘ │  │
│  │ │ Report a pavement issue… │ │  │                   │  │
│  │ └──────────────────────────┘ │  │ Custom Fields:    │  │
│  │                              │  │ (none added yet)  │  │
│  │ Category Group               │  │                   │  │
│  │ [Roads & Sidewalks ▾]        │  │ [Preview as      │  │
│  │                              │  │  citizen →]       │  │
│  │ Department *                 │  └───────────────────┘  │
│  │ [Public Works ▾]             │                          │
│  │                              │                          │
│  │ Active   [● Toggle ON]       │                          │
│  │ Featured [○ Toggle OFF]      │                          │
│  │ ─────────────────────────── │                          │
│  │                              │                          │
│  │ PERMISSIONS & SLA            │                          │
│  │ ─────────────────────────── │                          │
│  │                              │                          │
│  │ Who can VIEW this category?  │                          │
│  │ [Everyone (public) ▾] ⓘ     │                          │
│  │                              │                          │
│  │ Who can SUBMIT reports?      │                          │
│  │ [Everyone (public) ▾] ⓘ     │                          │
│  │                              │                          │
│  │ SLA Target (business days)   │                          │
│  │ [5        ]  (leave blank    │                          │
│  │               for no target) │                          │
│  │                              │                          │
│  │ Notification Reply Email     │                          │
│  │ [pubworks@city.gov        ]  │                          │
│  │                              │                          │
│  │ ─────────────────────────── │                          │
│  │                              │                          │
│  │ CUSTOM FIELDS                │                          │
│  │ ─────────────────────────── │                          │
│  │                              │                          │
│  │ [+ Add Custom Field]         │                          │
│  │                              │                          │
│  │ No custom fields defined     │                          │
│  │                              │                          │
│  │ ─────────────────────────── │                          │
│  │ [Cancel]        [Save]       │                          │
│  └──────────────────────────────┘                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Custom Field Builder — Inline Editor

Clicking "+ Add Custom Field" expands an inline editor:
```
┌──────────────────────────────────────────────────────────────┐
│ New Custom Field                                             │
│ ─────────────────────────────────────────────────────────── │
│ Label *: [Estimated volume (e.g., 3 bags, 1 truckload)    ] │
│ Type *:  [Text ▾]  (Text / Number / Date / Dropdown)        │
│ Placeholder: [Optional helper text for citizen            ]  │
│ Required: ○ Yes  ● No                                       │
│ ─────────────────────────────────────────────────────────── │
│ [Cancel]  [Add Field]                                        │
└──────────────────────────────────────────────────────────────┘
```

For Dropdown type, an additional section appears:
```
│ Options:                                                     │
│ ┌──────────────────────────────────────────┐  [+ Add]       │
│ │ Option 1: Small (1–5 bags)               │  [✕]           │
│ │ Option 2: Medium (5–20 bags)             │  [✕]           │
│ └──────────────────────────────────────────┘                │
```

### Permission Level Labels (Plain English)

| Internal value | Plain English label |
|---------------|---------------------|
| `anonymous` | Everyone (including visitors without an account) |
| `public` | Signed-in residents only |
| `staff` | City staff only (not visible to citizens) |

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Name + department (required fields) | Top of form |
| Primary | Save button | Bottom of left column + sticky footer on scroll |
| Primary | Active toggle | Core details section, visible |
| Secondary | Permissions & SLA | Middle section |
| Secondary | Custom field builder | Below permissions |
| Secondary | Live preview panel | Right column, updates in real-time |
| Tertiary | "Preview as citizen" button | Bottom of preview panel |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Form loading | Skeleton form fields | — |
| Name field error | Red border + "Name is required (max 50 characters)" | — |
| Department not selected | Red border + "Department is required" | — |
| Save in progress | Submit button spinner; form locked | "Saving…" |
| Save success | Green banner: "Category '[name]' saved. Changes are live." | — |
| Delete blocked | Toast error: "Cannot delete: this category has existing tickets. You can deactivate it instead." | — |
| Custom field added | Field appears in list + live preview updates | — |
| Custom field reorder | Drag handles on field rows | Visual drag feedback |
## Screen 09: Department / People Admin (SCR-10)

**Purpose:** Staff management of person records, departments, role assignments, and contact details.
**User Stories:** US-11.1, US-11.2, US-11.3, US-11.4, US-11.5
**Personas:** PER-04
**Feature Refs:** F11, F2, F4

### Layout — Staff Users List

```
┌─────────────────────────────────────────────────────────────┐
│ [Staff Global Nav — Admin highlighted]                      │
├─────────────────────────────────────────────────────────────┤
│ Admin > People                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Staff Users                    [+ New Person]  [People ▾] │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔍 Search people by name, email, or username...      │  │
│  └──────────────────────────────────────────────────────┘  │
│  Filter: [Role: Staff ▾]   [Department: All ▾]             │
│                                                             │
│  Name              Dept           Role    Username          │
│  ─────────────────────────────────────────────────────────  │
│  Dana Kowalski     Public Works   Staff   dkowalski         │
│  Robert Osei       Sanitation     Staff   rosei             │
│  [+ 8 more rows]                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Layout — Person Detail / Edit Form

```
┌─────────────────────────────────────────────────────────────┐
│ Admin > People > Dana Kowalski                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────┐  ┌───────────────────┐  │
│  │ PERSONAL DETAILS             │  │ CONTACT DETAILS   │  │
│  │                              │  │                   │  │
│  │ First Name *                 │  │ Email Addresses   │  │
│  │ [Dana                     ]  │  │ ─────────────     │  │
│  │ Middle Name                  │  │ Work (notif) ✉️   │  │
│  │ [                         ]  │  │ dana@city.gov     │  │
│  │ Last Name *                  │  │ [Edit] [Delete]   │  │
│  │ [Kowalski                 ]  │  │ [+ Add Email]     │  │
│  │ Organization                 │  │                   │  │
│  │ [City of Anytown          ]  │  │ Phone Numbers     │  │
│  │                              │  │ ─────────────     │  │
│  │ Role                         │  │ Work              │  │
│  │ [Staff ▾]  (staff / public)  │  │ 555-0100          │  │
│  │                              │  │ [+ Add Phone]     │  │
│  │ Department                   │  │                   │  │
│  │ [Public Works ▾]             │  │ Addresses         │  │
│  │                              │  │ ─────────────     │  │
│  │ Username                     │  │ (none)            │  │
│  │ [dkowalski        ] (read-   │  │ [+ Add Address]   │  │
│  │  only if OIDC provisioned)   │  └───────────────────┘  │
│  │                              │                          │
│  │ [Cancel]        [Save]       │                          │
│  └──────────────────────────────┘                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Person Search

```
┌──────────────────────────────────────────────────────────────┐
│ 🔍 Search people...                                          │
│ ─────────────────────────────────────────────────────────── │
│ (Type at least 2 characters)                                │
│ ─────────────────────────────────────────────────────────── │
│ Results for "dana":                                          │
│ Dana Kowalski — Public Works — Staff — dkowalski@city.gov   │
│ Dana Brown — Citizen — (no role) — dana.brown@gmail.com     │
└──────────────────────────────────────────────────────────────┘
```

### Email Address Row — Inline Edit

Each email entry shows:
- Email address
- Label badge (Home / Work / Other)
- Notification indicator: ✉️ if `usedForNotifications = true`
- Edit link (expands inline)
- Delete button (with confirmation)

Adding a new email shows an inline form:
```
┌───────────────────────────────────────────────────────────┐
│ Add Email                                                 │
│ Email *:  [dana@city.gov                               ]  │
│ Label:    [Work ▾]  (Home / Work / Other)                 │
│ Use for notifications: [✓]                                │
│ [Cancel]  [Add]                                           │
└───────────────────────────────────────────────────────────┘
```

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Person list loading | Skeleton rows | — |
| Search (< 2 chars) | Dropdown not shown | "Type at least 2 characters to search." |
| Search results | Inline dropdown | Up to 10 results |
| No search results | "No people found for '[query]'." | — |
| Save success | Toast: "Person record updated." | — |
| Username conflict (409) | Inline error: "Username already taken." | — |
| Delete blocked (409) | Toast error: "Cannot delete: this person has associated tickets or bookmarks." | — |
| Duplicate email (409) | Inline: "This email address already exists for this person." | — |
| Invalid email format | Inline: "Please enter a valid email address." | — |
| OIDC-provisioned username | Username field is read-only; tooltip: "Username set by city sign-in service." | — |
## Screen 10: API Client Management (SCR-11)

**Purpose:** Allow supervisors to create, view, and revoke API client credentials for external Open311 integrators.
**User Stories:** US-11.6, US-0.3
**Personas:** PER-04
**Feature Refs:** F11, F0

### Layout — Client List

```
┌─────────────────────────────────────────────────────────────┐
│ [Staff Global Nav — Admin highlighted]                      │
├─────────────────────────────────────────────────────────────┤
│ Admin > API Clients                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  API Client Credentials              [+ New API Client]     │
│                                                             │
│  These credentials authorize third-party apps to submit    │
│  service requests via the Open311 API.                      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Name             URL                   Key           │  │
│  │ ─────────────────────────────────────────────────── │  │
│  │ City Mobile App  app.city.gov          ••••••abc123  │  │
│  │                                        [Edit][Delete] │  │
│  │ 311 Portal       portal.city.gov       ••••••xyz456  │  │
│  │                                        [Edit][Delete] │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Layout — New Client Form

```
┌─────────────────────────────────────────────────────────────┐
│ Admin > API Clients > New Client                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  New API Client                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Client Name *                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ City Mobile App                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Application URL                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ https://app.city.gov                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Contact Person *                                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔍 Search people by name...                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Contact Method                                             │
│  [Email ▾]                                                  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  API Key                                                    │
│  ┌─────────────────────────────────────────┐  [Regenerate] │
│  │ a7f3-9c21-4b8e-d012-abc8f7e31045...     │  [📋 Copy]    │
│  └─────────────────────────────────────────┘               │
│  ⚠️ Copy this key now — it will only be shown in full once. │
│                                                             │
│  [Cancel]                              [Save Client]        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | API key (full, copyable — new/regenerate only) | Center of form |
| Primary | One-time-show warning | Below key field |
| Primary | Save button | Bottom of form |
| Secondary | Client name + contact person | Upper form fields |
| Secondary | Copy button | Inline with key |
| Tertiary | URL and contact method | Middle fields |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| New client (key shown) | Full 50-char key in read-only input | ⚠️ "Copy this key now — it will only be shown once in full." |
| Existing client (key masked) | "••••••••••••••••••••••••••••••••••••••••••••••xxxx" | "Key is masked for security." |
| Key regenerated | New full key shown; one-time warning | Confirmation: "Old key is now invalid. Copy the new key." |
| Regenerate confirmation | Modal: "Regenerating will immediately invalidate the current key. Any apps using it will receive 403 errors." | [Confirm Regenerate] [Cancel] |
| Save in progress | Spinner on button | — |
| Duplicate key (409) | Inline: "This API key already exists. Click 'Regenerate' for a new one." | — |
| Delete confirmation | "Deleting this client will immediately invalidate the API key." | [Confirm Delete] [Cancel] |
| Delete blocked (409) | Toast error: "This client has associated tickets and cannot be deleted." | — |
| New key works immediately | Success message includes: "This key is immediately usable — no restart required." | — |
## Screen 11: Bookmarks Management (SCR-12)

**Purpose:** Display and manage an authenticated user's saved search bookmarks.
**User Stories:** US-12.1, US-12.2, US-12.3, US-12.4
**Personas:** PER-02, PER-03
**Feature Refs:** F12, F5

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Global Nav — Authenticated Resident or Staff]              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Saved Searches                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔖 Elm Street Potholes                               │  │
│  │    Saved Jun 15, 2026 · Search: pothole elm street   │  │
│  │    [Run Search →]                   [🗑️ Delete]      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔖 Open Streetlight Issues                           │  │
│  │    Saved Jun 10, 2026 · Search: streetlight status:open  │  │
│  │    [Run Search →]                   [🗑️ Delete]      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔖 My Department Queue                               │  │
│  │    Saved Jun 5, 2026 · Queue: dept=PubWorks status=open  │  │
│  │    [Run Search →]                   [🗑️ Delete]      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Showing 3 saved searches                                   │
│                                                             │
│  [+ Save Current Search]  ← (only shown if navigated from  │
│                              a search results page)         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [Footer]                                                    │
└─────────────────────────────────────────────────────────────┘
```

### Save Bookmark Modal (from Search Results Page)

```
┌──────────────────────────────────────────────────────────────┐
│ Save This Search                                             │
│ ─────────────────────────────────────────────────────────── │
│ Name your search:                                            │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ pothole elm street — Open                              │  │
│ └────────────────────────────────────────────────────────┘  │
│ (You can edit this name to something more memorable)        │
│ ─────────────────────────────────────────────────────────── │
│ [Cancel]                              [Save Search]         │
└──────────────────────────────────────────────────────────────┘
```

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Bookmark name + "Run Search" CTA | Per bookmark card |
| Secondary | Saved date + URI preview | Subtitle of each card |
| Secondary | Delete button | Per card, right side |
| Tertiary | Total count | Below list |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Loading | Skeleton bookmark cards | — |
| Empty list | Illustration + "No saved searches yet." + "Run a search and click 'Save this search' to get started." | CTA to search page |
| Save modal open | Small centered modal; search results visible behind |  — |
| Saving | Save button spinner; inputs disabled | — |
| Save success | Modal closes; toast: "Bookmark saved. [View your bookmarks →]" | — |
| Delete confirmation | Inline: "Delete '[name]'? [Yes] [No]" (no modal) | — |
| Delete in progress | Card row fades | — |
| Delete success | Row removed with animation | No toast (low importance) |
| Recall: Solr error | "Search temporarily unavailable — try again in a moment." | Friendly error, not a 500 page |
## Screen 12: Metrics / Reporting Dashboard (SCR-13)

**Purpose:** Show staff and supervisors ticket volume, SLA performance, and category distribution. Provide exportable reports.
**User Stories:** US-13.1, US-13.2, US-3.3
**Personas:** PER-04, PER-03
**Feature Refs:** F13, F2, F3

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Staff Global Nav — Reports highlighted]                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Metrics Dashboard                      🔄 (auto-refreshes) │
│                                                             │
│  Date Range: [Jun 1, 2026 ▾] to [Jun 23, 2026 ▾]  [Apply] │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ 342      │  │ 1,204    │  │ 5.2 days │  │ 23       │  │
│  │ Open     │  │ Closed   │  │ Avg Res. │  │ Overdue  │  │
│  │ Tickets  │  │ (period) │  │ Time     │  │ (SLA)    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                             │
│  Submission Rate (last 24 hours)                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ▁▃▅▇█▇▆▅▃▂▁▂▃▆▇█▇▅▃▂▁▂▃▆▄▂▁▁▁▁▁▁▂▃▄▆▇█▇▆         │  │
│  │  ╰── 12 AM   6 AM   12 PM   6 PM   Now              │  │
│  └──────────────────────────────────────────────────────┘  │
│  Note: Drop visible at 9:07 AM ← (useful for diagnosing)   │
│                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │ BY CATEGORY (open)      │  │ BY DEPARTMENT (open)    │  │
│  │                         │  │                         │  │
│  │ Pothole          142    │  │ Public Works     201    │  │
│  │ Streetlight       84    │  │ Sanitation        98    │  │
│  │ Graffiti          56    │  │ Inspections       43    │  │
│  │ Missed Pickup     32    │  │                         │  │
│  │ [+ 8 more]              │  │                         │  │
│  └─────────────────────────┘  └─────────────────────────┘  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Ticket Report Export                                       │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Filters:                                                   │
│  Status: [All ▾]  Category: [All ▾]  Dept: [All ▾]        │
│                                                             │
│  [Export HTML] [Export CSV ↓] [Export JSON] [Export TXT]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Metric Cards

| Metric | Source | Description |
|--------|--------|-------------|
| Open Tickets | `COUNT(tickets WHERE status='open')` | Current snapshot |
| Closed (period) | `COUNT WHERE status='closed' AND enteredDate IN range` | Within date range |
| Avg Resolution Time | `AVG(EPOCH(closedDate - enteredDate)/86400)` | Days, 1 decimal |
| Overdue | `COUNT WHERE status='open' AND slaDays elapsed > slaDays target` | SLA breaches |

### Submission Rate Sparkline

- Hourly bins for the last 24 hours
- Visualized as a mini bar chart (ASCII in TXT export; SVG/Canvas in HTML)
- Tooltip on hover: "9 AM — 12 submissions"
- Drops/spikes immediately visible (JRN-04.2 Stage 1 delight opportunity)
- Auto-refreshes every 60 seconds

### Export Section

The report export section allows filtering and downloading ticket data:

| Filter | Control |
|--------|---------|
| Status | All / Open / Closed |
| Category | Multi-select dropdown |
| Department | Multi-select dropdown |
| Date From / To | Date pickers |

Export buttons produce downloads matching the `SerializationInterceptor` output. CSV includes UTF-8 BOM and is column-identical to the HTML table view.

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | 4 KPI cards | Top row, immediately visible |
| Primary | Submission rate sparkline | Below KPIs |
| Secondary | Category / department breakdown tables | Mid-page |
| Secondary | Export controls | Bottom section |
| Tertiary | Date range filter | Above KPIs |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Loading (initial) | Skeleton KPI cards; skeleton chart | — |
| Data loaded | Full layout | Auto-refresh indicator (last updated: X seconds ago) |
| Date filter applied | KPIs and chart update | "Showing Jun 1 – Jun 23" |
| Export in progress | Export button spinner | "Preparing export…" |
| Export ready | Browser download triggered | — |
| Auto-refresh | KPIs silently update every 60s | "Updated just now" timestamp |
| Non-staff access | HTTP 403 redirect to login | — |
## Screen 13: User Profile / Account (SCR-14)

**Purpose:** Allow authenticated users to view and edit their own profile information.
**User Stories:** US-4.5, US-2.2
**Personas:** PER-02
**Feature Refs:** F4, F2

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Global Nav — Authenticated]                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  My Profile                                                 │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌──────────────────────────────┐  ┌───────────────────┐  │
│  │ PERSONAL DETAILS             │  │ CONTACT INFO      │  │
│  │                              │  │                   │  │
│  │ First Name                   │  │ Email Addresses   │  │
│  │ [Priya                    ]  │  │ ─────────────     │  │
│  │ Last Name                    │  │ priya@example.com │  │
│  │ [Nair                     ]  │  │ (Home, notif ✉️)  │  │
│  │ Organization                 │  │ [Edit] [Delete]   │  │
│  │ [                         ]  │  │ [+ Add Email]     │  │
│  │                              │  │                   │  │
│  │ Address                      │  │ Phone Numbers     │  │
│  │ [                         ]  │  │ (none)            │  │
│  │ City                         │  │ [+ Add Phone]     │  │
│  │ [                         ]  │  │                   │  │
│  │ State                        │  └───────────────────┘  │
│  │ [  ]  Zip [          ]       │                          │
│  │                              │                          │
│  │ ─────────────────────────── │                          │
│  │ Username: priya.nair         │                          │
│  │ (Set by city sign-in — read-│                          │
│  │  only)                       │                          │
│  │ Role: Resident               │                          │
│  │ (Read-only)                  │                          │
│  │                              │                          │
│  │ [Cancel]        [Save]       │                          │
│  └──────────────────────────────┘                          │
│                                                             │
│  Sign Out                                                   │
│  [Sign Out of uReport]                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Edit Restrictions

The following fields are **read-only** for all users (per US-4.5):
- `username` — set by OIDC `sub` claim; displayed as read-only with explanation
- `role` — controlled by staff admin; displayed as read-only

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Name fields (editable) | Top of left column |
| Primary | Save button | Bottom of form |
| Secondary | Email addresses (editable) | Right column |
| Secondary | Phone numbers (editable) | Right column |
| Tertiary | Username + role (read-only) | Bottom of left column |
| Tertiary | Sign Out link | Below form |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Loading profile | Skeleton form fields | — |
| Form dirty (unsaved changes) | "Save" button enabled; "Cancel" clears changes | — |
| Saving | Spinner on Save button; form locked | "Saving…" |
| Save success | Toast: "Profile updated." | — |
| Save error | Inline field-level errors | — |
| Unauthenticated access | HTTP 401 redirect to login | — |
| Adding email | Inline form appears below email list | — |
| Email saved | New email appears in list; inline form closes | — |
| Duplicate email | Inline error: "This email address is already in your profile." | — |
## Interaction Patterns

### Pattern 1: Optimistic Loading States

**When to use:** Any async operation that may take >200ms — form submissions, filter changes, Solr queries, file uploads.

**Behavior:**
1. User triggers action (click, submit, type)
2. **Immediate:** UI enters loading state (spinner on button, skeleton on content area, greyed rows)
3. **In progress:** Progress indicator continues
4. **Success:** Smooth transition to result; success toast (for writes)
5. **Error:** Inline error message near the triggering element; retry affordance

**Examples across the app:**
- Filter change on ticket queue → rows greyed + spinner in filter bar
- Search query → result area shows skeleton rows
- File upload → progress bar with filename and cancel
- Close ticket → modal spinner; buttons disabled during write

**Timeout handling:**
- Submissions taking > 5 seconds: "This is taking longer than expected. Still trying…"
- After 30 seconds: "This is taking unusually long. [Retry]"

---

### Pattern 2: Toast Notifications

**When to use:** Confirmation of successful writes (assign, comment, close, save, delete). Not for errors (those go inline).

**Behavior:**
- Appear at top-right of screen
- Auto-dismiss after 5 seconds
- Manually dismissible (× button)
- Multiple toasts stack vertically
- Color coding: green (success), amber (warning), red (error — only when inline error not possible)

**Toast message convention:**
- Success: "[Entity] [action]. [Optional: 'Email sent to [address].']"
- Examples:
  - "Ticket #84712 assigned to Dana Kowalski."
  - "Ticket #84712 closed. Email sent to marcus@email.com."
  - "Category 'Illegal Dumping' saved. Changes are live."
  - "Bookmark 'Elm Street Potholes' saved. [View your bookmarks →]"

---

### Pattern 3: Confirmation Dialogs

**When to use:** Destructive or irreversible actions, or actions with external side effects (emails sent, parent ticket modified).

**Behavior:**
- Modal overlay; cannot be dismissed by clicking outside
- Summary of what will happen — not just "Are you sure?"
- Cancel button always available
- Confirm button disabled during in-progress state

**Required for:**
- Close ticket (shows recipient email)
- Mark as duplicate (shows effect on both tickets)
- Delete category / person / API client
- Regenerate API key
- Bulk assign

**Not required for:**
- Add comment (no external side effects)
- Filter changes
- Pagination

---

### Pattern 4: Inline Form Validation

**When to use:** All forms with user input.

**Behavior:**
- Validate on blur (when user leaves the field), not on every keystroke
- Show field-level error messages directly below the input
- Red border on invalid field
- Error message disappears when field becomes valid
- Submit button shows spinner and is disabled during submission
- If server returns validation errors, map them back to the corresponding field

**Common validations and messages:**
| Rule | Message |
|------|---------|
| Required | "[Field name] is required." |
| Max length | "[Field name] must be [N] characters or fewer. (X / N)" |
| Email format | "Please enter a valid email address." |
| Lat/lon range | "Latitude must be between -90 and 90." |
| Positive integer | "[Field name] must be a positive number." |
| Date format | "Please enter a date in YYYY-MM-DD format." |

---

### Pattern 5: Role-Gated Elements

**When to use:** Any UI element that should only be visible or active for specific roles.

**Behavior:**
- Anonymous users: staff-only elements are **completely hidden** (not disabled)
- Public users: staff-only actions are **completely hidden** on ticket detail
- Staff users: all elements visible; staff-only elements have visual distinction

**Visual distinction for staff-only elements:**
- Light blue background (`#eff6ff`) for staff-only panels
- 🔒 lock icon prefix for staff-only text areas / fields
- "Staff only" label badge in grey for clearly staff-exclusive sections

**Never:** Show a disabled button to non-staff with tooltip "You don't have permission." Instead, hide the element entirely to avoid confusion.

---

### Pattern 6: Multi-Format Content Switcher

**When to use:** Ticket detail, search results, reports — wherever the `SerializationInterceptor` supports multiple formats.

**Behavior:**
- A "Format" section in the sidebar or action bar
- Shows available formats as pill links: `HTML` (current, active) | `JSON` | `XML` | `CSV` | `TXT`
- Clicking JSON/XML/TXT opens in a new tab (or triggers download for CSV)
- Active format highlighted

**Placement:**
- Ticket detail: right sidebar
- Search results: header bar (or secondary nav)
- Reports: export section

---

### Pattern 7: In-Page Search Panel

**When to use:** Duplicate detection in ticket detail (FLW-04); avoids leaving the current page.

**Behavior:**
- Collapsible panel inline with the ticket detail
- Text input + filter dropdowns
- Results appear below input within ≤500ms (NFR-6)
- Each result shows a snippet (not just an ID)
- Action buttons per result (e.g., "Link as duplicate")
- Panel can be closed without affecting the main ticket form

---

### Pattern 8: Bookmarked Search Save Modal

**When to use:** From any search results page, for authenticated users only.

**Behavior:**
- Small modal overlay (not full-page navigation)
- Name input pre-populated with sanitized query + active filter summary
- Save → modal closes → results remain visible → toast confirmation
- "View your bookmarks →" link in toast for discoverability

---

### Pattern 9: SLA Elapsed Indicator

**When to use:** Ticket rows in the staff queue and ticket detail header.

**Behavior:**
- If `categories.slaDays` is set: display "X days" in the SLA column
- If elapsed days ≤ `slaDays`: plain text, no special treatment
- If elapsed days > `slaDays`: ⚠️ amber badge + amber row highlight in queue
- If `slaDays` is null on the category: SLA column shows "—"
- Tooltip on ⚠️: "SLA target: [N] days. Current: [X] days."

---

### Pattern 10: Audit Trail Timeline

**When to use:** Ticket history section in staff ticket detail and public ticket detail.

**Behavior:**
- Chronological list (oldest first, per FRD F01.9)
- Each entry: timestamp, action type label, brief description, actor name (staff-only for PII fields)
- Staff-only entries (comments) shown with 🔒 lock prefix
- Email notifications shown with ✉️ icon and "Email sent to [address]"
- Duplicate link entries show ticket ID as a clickable link
- On public view: PII fields (person names, email) are omitted; comment entries hidden entirely
## Responsive Considerations

### Breakpoints

| Name | Range | Primary Use Case |
|------|-------|-----------------|
| Mobile | < 768px | Anonymous citizens (Marcus) submitting via phone |
| Tablet | 768px – 1024px | Authenticated residents (Priya) checking status |
| Desktop | > 1024px | Staff (Dana, Robert) in daily queue workflows |

---

### Desktop (> 1024px)

**Layout:** Two-column layouts for detail pages (content + sidebar). Three-panel layouts where applicable (filter sidebar + main + actions).

**Key screens:**
- **Staff Ticket Queue (SCR-06):** Full table with all columns visible; filter bar horizontal across the top; bulk action bar at bottom.
- **Staff Ticket Detail (SCR-07):** Two-column — ticket details and history on the left; actions panel + reporter info on the right. Sticky right column as user scrolls history.
- **Category Admin (SCR-09):** Two-column — edit form on left; live preview panel on right.
- **Search (SCR-08):** Three-column — facet sidebar (left, ~240px); results (center, flex); format switcher (right, ~200px).
- **Metrics Dashboard (SCR-13):** 4-column KPI card row; full-width sparkline chart; two-column breakdown tables.

---

### Tablet (768px – 1024px)

**Layout:** Condensed two-column on most pages; some panels stack to single column.

**Key adjustments:**
- **Staff Ticket Queue:** Filter bar collapses to a "Filters" button that opens a drawer. Table shows: ID, Category, Status, SLA only (other columns hidden with horizontal scroll or column picker). Bulk checkboxes remain.
- **Staff Ticket Detail:** Actions panel stacks below ticket details (not side-by-side). Right sidebar content moves below main content.
- **Public Submission Form:** Map is full-width at ~400px height. Step form takes full width.
- **Search:** Facet panel collapses to a "Filter" button; opens as a drawer overlay.
- **Filter controls:** Tap targets minimum 44×44px (WCAG 2.5.5 AAA / 44px recommendation). Priya's pain point (JRN-02.1 Stage 4) specifically addressed with larger tap targets.

---

### Mobile (< 768px)

**Layout:** Single-column. All sidebars become drawers or collapsible sections. Navigation collapses to hamburger menu.

**Key adjustments:**
- **Anonymous Submission Form (SCR-01):** Priority screen for mobile. Steps are full-screen cards, one per viewport. "Use my location" button is large and prominent (minimum 48px height). Map fills the viewport. Photo upload uses native file picker.
- **Confirmation (SCR-02):** Token displayed in very large monospace text. Copy button is 48px minimum. Email input is full-width.
- **Public Ticket Detail (SCR-03):** Single column: status badge, details, map (collapsed by default), history timeline.
- **Staff Queue (SCR-06):** Simplified card view replaces table. Each card shows: ID, category, status, SLA. Tap card to open detail. Filter drawer accessible via FAB (floating action button) or top filter icon.
- **Staff Ticket Detail (SCR-07):** Actions panel at top (sticky) with collapsed state. Comment/reply text areas full-width. History timeline as an accordion.
- **Navigation:** Hamburger menu; role-appropriate navigation items. Staff admin links behind a secondary "Admin" section.

**Mobile-specific affordances:**
- GPS "Use my location" auto-triggers on the location step (Step 2) if browser supports it, saving the user from typing an address.
- Native image picker for photo upload (no drag-and-drop on mobile).
- Confirmation token copy button uses native share sheet on mobile (`navigator.share()` if available; clipboard fallback).
- Form inputs use appropriate `inputmode` attributes: `inputmode="decimal"` for lat/lon, `inputmode="email"` for email fields, `inputmode="numeric"` for SLA days.

---

### Touch-Specific Interaction Rules

| Interaction | Desktop | Mobile/Tablet |
|------------|---------|---------------|
| Hover tooltips | On hover | Long-press (or tap-info icon) |
| Dropdown menus | Click to open | Tap to open; tap outside to close |
| Map pin drag | Mouse drag | Touch drag |
| Bulk select (queue) | Checkbox click | Tap checkbox; swipe to select range |
| Sidebar panels | Inline visible | Drawer overlay (slide in from right) |
| Table scroll | No horizontal scroll (responsive columns) | Horizontal swipe on card view |

---

### Performance Considerations by Breakpoint

- **Mobile:** Skeleton screens are especially important — mobile networks (3G/LTE) make the 200ms target harder to hit. Show skeletons immediately; content populates as data loads.
- **Map rendering:** On mobile, the map loads after the form step is reached (lazy load), not on initial page load.
- **Photo uploads:** On mobile, limit preview thumbnail generation to the client side before upload; do not re-request thumbnails from the server to confirm upload until the step is completed.
- **Solr search:** ≤500ms target applies to all breakpoints. Debounce search-on-type at 300ms to prevent excess requests on mobile keyboards.
## Accessibility Notes

### Standards Target

All screens must meet **WCAG 2.1 Level AA**. Key screens used by anonymous citizens (SCR-01, SCR-02, SCR-03) should target AAA for color contrast and touch target size given the high-stress, mobile-first use context.

---

### Color Contrast

| Element | Foreground | Background | Ratio | Requirement |
|---------|-----------|-----------|-------|-------------|
| Body text | #111827 | #ffffff | 16.1:1 | ≥ 4.5:1 (AA) ✓ |
| Muted label | #6b7280 | #ffffff | 4.6:1 | ≥ 4.5:1 (AA) ✓ |
| Primary button | #ffffff | #0070f3 | 4.7:1 | ≥ 4.5:1 (AA) ✓ |
| Error text | #b91c1c | #ffffff | 5.9:1 | ≥ 4.5:1 (AA) ✓ |
| SLA warning badge | #92400e | #fef3c7 | 4.8:1 | ≥ 4.5:1 (AA) ✓ |
| Status: Open | #065f46 | #d1fae5 | 7.2:1 | ≥ 4.5:1 (AA) ✓ |
| Status: Closed | #991b1b | #fee2e2 | 5.5:1 | ≥ 4.5:1 (AA) ✓ |
| Disabled button | #9ca3af | #f3f4f6 | 2.5:1 | Exempt (disabled state) |

**Note:** Status indicators (Open/Closed) use both color AND text AND icon — never color alone.

---

### Keyboard Navigation

All interactive elements must be reachable and operable via keyboard:

| Element | Keyboard Behavior |
|---------|------------------|
| Category cards (SCR-01) | Tab to navigate; Enter/Space to select; Arrow keys within group |
| Map (SCR-01 Step 2) | Tab to reach "Use my location" button; Enter to activate. Map pin adjustable via arrow keys once focused. |
| Dropdown menus | Tab to focus; Enter/Space to open; Arrow keys to navigate options; Enter to select; Escape to close |
| Modal dialogs | Focus trapped inside modal when open; Escape closes modal; Tab cycles through modal focusable elements; first focusable element receives focus on open |
| Toast notifications | Not focusable (decorative); screen reader announcement via `aria-live` region |
| Ticket history timeline | Tab/Arrow through history entries; Enter to expand details |
| Bulk checkboxes (queue) | Tab to checkbox; Space to toggle; Shift+click for range select |
| File upload zone | Tab to focus; Enter/Space to open file picker; files also accepted via keyboard drag simulation |

**Skip link:** A "Skip to main content" link must be the first focusable element on every page. Visually hidden unless focused.

---

### Screen Reader Support

#### ARIA Labels Required

| Element | ARIA Attribute | Value |
|---------|---------------|-------|
| Status badge (Open/Closed) | `aria-label` | "Status: Open" / "Status: Closed (Resolved)" |
| SLA warning icon | `aria-label` | "SLA exceeded: [X] days elapsed, target [N] days" |
| Copy token button | `aria-label` | "Copy tracking token to clipboard" |
| Lock icon (staff comment) | `aria-hidden="true"` | Icon is decorative; label in adjacent text |
| Loading spinner | `aria-label` + `role="status"` | "Loading…" |
| Modal dialog | `role="dialog"` + `aria-modal="true"` + `aria-labelledby` | Points to modal heading |
| Map region | `aria-label` | "Interactive map showing issue location" |
| Search input | `aria-label` | "Search tickets" |
| Facet checkboxes | `aria-label` | "[Category name] ([count] results)" |
| Ticket history entries | `role="listitem"` within `role="list"` | — |
| Progress step indicator | `aria-label` per dot | "Step 1 of 4: Choose a Category (current)" |

#### Live Regions

| Region | `aria-live` | Used For |
|--------|------------|---------|
| Toast container | `aria-live="polite"` | Success/error toasts after form submits |
| Search result count | `aria-live="polite"` | "47 results for 'pothole'" |
| Filter update | `aria-live="polite"` | "Showing 23 results" after filter change |
| Save status | `aria-live="assertive"` | Only for critical errors that require immediate attention |

---

### Focus Management

| Trigger | Focus Moves To |
|---------|---------------|
| Modal opens | First focusable element inside modal |
| Modal closes | Element that triggered modal open |
| Form submission error | First field with an error |
| Toast appears | Toast itself (if `aria-live` region, no focus move needed) |
| Page navigation (SPA-style) | `<h1>` of the new page content |
| Ticket detail loads | Page `<h1>` ("Ticket #XXXXX") |
| Search results update | Result count heading ("47 results for…") |

---

### Image and Media Accessibility

| Element | Requirement |
|---------|-------------|
| Category icons | `aria-hidden="true"` if decorative; `alt` text if meaningful |
| Uploaded photos | `alt` attribute set to original filename; or description if available |
| Thumbnail images | `alt="Thumbnail for [filename]"` |
| Map | `aria-label` for the map region; address text always shown outside the map for screen readers |
| Sparkline chart (metrics) | Text fallback: "Submission rate over last 24 hours: peak at [time] with [N] submissions" |

---

### Form Accessibility

| Requirement | Implementation |
|-------------|---------------|
| All inputs have visible labels | `<label for>` or `aria-labelledby` — never `placeholder` as the only label |
| Required fields indicated | `aria-required="true"` + visible asterisk (*) + form-level legend "Fields marked * are required" |
| Error messages associated with inputs | `aria-describedby` pointing to the error `<span>` ID |
| Validation triggered on blur | Not on every keystroke — reduces noise for screen reader users |
| Autocomplete attributes | Email: `autocomplete="email"`, Name: `autocomplete="given-name"` / `autocomplete="family-name"`, Address fields use `autocomplete` appropriately |
| File upload | `<input type="file">` is always present and keyboard accessible, even if a drag-drop zone is also displayed |

---

### Touch and Pointer Accessibility

| Element | Minimum Target Size |
|---------|-------------------|
| Primary buttons | 44×44px |
| Icon-only buttons (copy, delete) | 44×44px |
| Checkboxes (queue bulk select) | 44×44px touch target (visual may be smaller) |
| Filter dropdown triggers | 44×44px |
| Map "Adjust pin" handle | 44×44px |
| Navigation links | 44px height minimum |

Pointer target size meets WCAG 2.5.5 AAA (44×44px) for all primary interactions.

---

### Internationalization Hooks

Although localization is out of scope for the re-platform, these structural requirements should be met:
- All user-visible strings should use a template/constant approach (not inline literals) to facilitate future i18n
- Date formatting should use locale-aware utilities (`Intl.DateTimeFormat`) — UTC for storage, local timezone for display
- RTL layout is not required but HTML `lang` attribute must be set on `<html>` element
- Character encoding: UTF-8 throughout, including the CSV BOM (`\xEF\xBB\xBF`) per F3 requirements
