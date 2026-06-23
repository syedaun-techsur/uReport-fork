# JOURNEYS — uReport Re-Platform

| Field | Value |
|---|---|
| **Product** | uReport — Open311 GeoReport v2 Municipal CRM |
| **Version** | 1.0 |
| **Date** | 2026-06-23 |
| **Related Personas** | `project_specs/PERSONAS-uReport.md` |
| **Related JTBD** | `project_specs/JTBD-uReport.md` |
| **Related PRD** | `project_specs/PRD-uReport.md` |
| **Related Project** | `.planning/PROJECT.md` |
| **Status** | Active |

---

## Journey Index

| JRN-ID | Persona | Scenario | Key JTBD | Stages |
|---|---|---|---|---|
| JRN-01.1 | PER-01 Marcus Webb | Submit an anonymous service request via web form with geo-location | JTBD-01.1 | 6 |
| JRN-01.2 | PER-01 Marcus Webb | Consume the Open311 API to submit and query tickets programmatically | JTBD-01.1, JTBD-01.2 | 5 |
| JRN-02.1 | PER-02 Priya Nair | Log in via OIDC and track personal ticket history | JTBD-02.1, JTBD-02.2 | 5 |
| JRN-02.2 | PER-02 Priya Nair | Set up a bookmark for a recurring issue search | JTBD-02.3 | 5 |
| JRN-03.1 | PER-03 Dana Kowalski | Receive and process the daily ticket queue (assign, update, close) | JTBD-03.1, JTBD-03.2 | 6 |
| JRN-03.2 | PER-03 Dana Kowalski | Mark a ticket as duplicate and link to parent | JTBD-03.3 | 5 |
| JRN-04.1 | PER-04 Robert Osei | Create a new service category with custom fields and SLA | JTBD-04.1 | 6 |
| JRN-04.2 | PER-04 Robert Osei | Monitor system health and review Graylog logs | JTBD-04.2, JTBD-04.3 | 5 |

---

## PER-01: Marcus Webb — Anonymous Citizen

---

### JRN-01.1: Anonymous Service Request via Web Form

**Persona:** PER-01 (Marcus Webb)
**Scenario:** Marcus is standing at a cracked sidewalk near his home. He pulls out his phone, navigates to the city's service request portal, and submits a pothole report with GPS coordinates and a photo — all without creating an account. He wants confirmation the city received his report before he walks away.
**Related Jobs:** JTBD-01.1, JTBD-01.2

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1. Discover** | Searches "report pothole [city name]" on mobile browser; taps city portal link | Browser search → city portal landing page (F0) | "I hope I don't have to make an account just to report this" | Cautiously hopeful | Past experience with city forms requiring registration creates anxiety before the page even loads | Display a prominent "No account needed" message above the fold on the landing page |
| **2. Select Category** | Scans available service categories; reads descriptions to find "Pothole / Pavement Damage" | Service categories list — `GET /open311/v2/services` (F0, F2) | "Which one is right? 'Pavement Management' or 'Street Maintenance'? The names are confusing" | Mildly frustrated | Category names use internal department jargon rather than plain citizen language | Display plain-language category descriptions and group categories by citizen-recognizable topic (e.g., "Roads & Sidewalks") |
| **3. Locate Issue** | Taps "Use my location" button; reviews map pin placement; adjusts pin slightly | Location picker with GPS auto-detect (F0, F9) | "Is the pin in the right spot? I want them to find the right place" | Focused, slightly uncertain | Mobile GPS accuracy varies — pin sometimes lands 20 metres off; no visual confirmation of address | Show resolved street address below the map pin so Marcus can verify location before continuing |
| **4. Describe & Attach** | Types a brief description ("Large pothole on corner of Main & Oak, about 30cm wide"); taps photo icon and uploads a picture from camera roll | Ticket submission form — description field, file upload (F1, F8) | "Should I add more detail? Is a photo required?" | Engaged, slightly unsure | No inline guidance on what makes a good description; unclear whether photo is optional | Provide an inline character count tip ("Be specific: size, exact corner, nearest landmark") and label photo field "Optional — helps us locate the issue faster" |
| **5. Submit** | Reviews the form summary and taps "Submit Report" | Form submit → `POST /open311/v2/requests` (F0, F1, F2) | "I hope this actually goes through — the last time I tried a city form it just spun forever" | Anxious | Mobile network latency can make the submission feel hung; no optimistic UI feedback | Show an immediate in-progress spinner with "Sending your report…" and a timeout message if the response takes more than 5 seconds |
| **6. Confirm** | Reads confirmation screen showing ticket ID and token; optionally copies or screenshots token | Confirmation page — submission token returned in response (F0, F1) | "Good, it says reference number 84721. Should I write this down? I'll probably forget it" | Relieved, but slightly worried about losing the token | Token is shown once with no email option for anonymous users — if Marcus closes the tab, the token is gone | Offer "Add to phone calendar" or "Send to email" options on the confirmation screen; display token prominently with a copy-to-clipboard button |

---

#### Key Moments

- **Decision Point:** Category selection (Stage 2) — if Marcus can't find the right category within 15 seconds, he abandons the form
- **Risk of Abandonment:** Submit stage (Stage 5) — a slow or silent failure response causes Marcus to tap away and call the city's phone line instead
- **Delight Opportunity:** Confirmation stage (Stage 6) — a confirmation screen that makes the token easy to save (clipboard copy, email option) turns an anxious interaction into a satisfied one; bonus if it shows "Your report will be reviewed within X business days"

---

#### Success Outcome

Marcus completes a service request submission from landing page to confirmation token in under 3 minutes, with zero authentication prompts, on a mobile browser (JTBD-01.1 success measure: ≤ 3 minutes, zero auth prompts).

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Discover | F0 (Open311 API — services list), F2 (RBAC anonymous level) |
| Select Category | F0 (`GET /open311/v2/services`), F2 (displayPermissionLevel = anonymous) |
| Locate Issue | F0 (lat/lon fields), F9 (geo-clustering map view) |
| Describe & Attach | F1 (ticket creation), F8 (media upload) |
| Submit | F0 (`POST /open311/v2/requests`), F1, F2 |
| Confirm | F0 (token response), F1 (ticket record created) |

---

---

### JRN-01.2: Open311 API — Programmatic Submit and Query

**Persona:** PER-01 (Marcus Webb) — as proxy for the API machine actor (third-party mobile app or city portal calling Open311 on Marcus's behalf)
**Scenario:** Marcus is using a third-party city services mobile app that calls the Open311 GeoReport v2 API directly. The app submits Marcus's report via `POST /open311/v2/requests`, then looks up the ticket status later using the returned token. Marcus's experience is mediated entirely by the app — but the correctness of the API response determines whether the app works at all.
**Related Jobs:** JTBD-01.1, JTBD-01.2

> **Note:** This journey maps the API machine actor's interaction sequence, using Marcus as the human beneficiary proxy. Pain points and opportunities describe API behavior that the app developer must handle and that Marcus will experience indirectly.

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1. Discover Services** | App calls `GET /open311/v2/services` to populate a category picker | Open311 `GET /open311/v2/services` (F0, F3) | "Are the service codes the same as yesterday? Did the city add new categories?" | Neutral (app developer perspective); Marcus just sees a category list | If the response schema changes (even whitespace or field ordering), the app may parse incorrectly | Response must be byte-compatible with the PHP implementation (NFR-1); content-type negotiated correctly (`Accept: application/json`) |
| **2. Submit Request** | App calls `POST /open311/v2/requests` with `api_key`, `service_code`, `lat`, `long`, `description`, `media_url` | Open311 `POST /open311/v2/requests` (F0, F1, F2) | "Did the request go through? Did I get a token?" | Anxious (Marcus waits for the app to confirm) | `api_key` authentication failure returns a cryptic 403 with no message; missing required fields return inconsistent error shapes | Return structured error bodies with `code` and `description` fields matching GeoReport v2 error envelope on all 4xx responses |
| **3. Receive Token** | App parses the JSON/XML response; extracts `token` and `service_request_id`; displays confirmation to Marcus | Open311 `POST /open311/v2/requests` response envelope (F0, F3) | "The app says 'Report submitted — reference #84721'. I'll screenshot that" | Relieved | Some GeoReport v2 responses include `token` only; the app must handle both `token` and `service_request_id` in the same response | Ensure response always includes both `token` and `service_request_id` (or `token` + a `GET /tokens/:token` lookup) per spec; format negotiation via `.json` suffix must work |
| **4. Poll for Status** | App calls `GET /open311/v2/tokens/:token` to resolve token to request ID; then calls `GET /open311/v2/requests/:id` for current status | Open311 `GET /open311/v2/tokens/:token` and `GET /open311/v2/requests/:id` (F0) | "Is the ticket still open? Has anyone been assigned to it?" | Moderately curious; Marcus checks the app two days later | No push notifications from the Open311 spec — the app must poll; polling frequency is up to the app | Response time ≤ 200ms (NFR-6) for token lookup and single-ticket fetch ensures polling is low-overhead |
| **5. Query Nearby Tickets** | App calls `GET /open311/v2/requests?lat=X&long=Y&radius=Z&status=open` to show Marcus other nearby open reports | Open311 `GET /open311/v2/requests` with geo params (F0, F2, F9) | "Are there other reports near my house? The app shows a map with red dots" | Curious, reassured that the city is tracking issues | Results include tickets from multiple categories — Marcus may not understand why some appear; RBAC must filter PII fields | `displayPermissionLevel = anonymous` filter applied server-side — PII fields (reporter name, email) must be absent; geo-cluster map endpoint provides pre-computed clusters for efficient map rendering |

---

#### Key Moments

- **Decision Point:** Stage 2 — if `POST /open311/v2/requests` returns a format deviation from the PHP response (even field order), the mobile app may silently fail to parse the token and Marcus never sees a confirmation
- **Risk of Abandonment:** Stage 3 — if the response envelope omits the `token` field or uses a different key name, the app crashes; Marcus uninstalls the app
- **Delight Opportunity:** Stage 5 — a fast geo-filtered request list (≤ 200ms) enables the app to show a live "nearby issues" map, giving Marcus social context that his neighborhood is being served

---

#### Success Outcome

Every Open311 API response from the new Node.js implementation is byte-identical to the PHP implementation on the same input fixtures, ensuring zero changes are required by external API consumers (NFR-1, NFR-2; JTBD-01.1 and JTBD-01.2 success measures fulfilled through the API channel).

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Discover Services | F0 (`GET /open311/v2/services`), F3 (content negotiation) |
| Submit Request | F0 (`POST /open311/v2/requests`), F1, F2 (api_key + RBAC) |
| Receive Token | F0 (response envelope), F3 (JSON/XML format) |
| Poll for Status | F0 (`GET /open311/v2/tokens/:token`, `GET /open311/v2/requests/:id`) |
| Query Nearby | F0 (`GET /open311/v2/requests` geo params), F2, F9 |

---

## PER-02: Priya Nair — Authenticated Resident

---

### JRN-02.1: OIDC Login and Personal Ticket History

**Persona:** PER-02 (Priya Nair)
**Scenario:** Priya logs in on a weekday evening to check whether the broken streetlight she reported two weeks ago has been assigned. She uses the city's OIDC identity provider (the same credentials she uses for her parking permit), lands on her personal ticket dashboard, filters her history, and checks the ticket status. She also notices that she received an email notification earlier that day — she wants to verify it matches what the system shows.
**Related Jobs:** JTBD-02.1, JTBD-02.2

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1. Initiate Login** | Navigates to the city portal; clicks "Sign In"; is redirected to the city IdP login page | Portal login page → OIDC authorization redirect (F4) | "I use this same login for my parking permit — at least I don't need a separate password" | Mildly impatient | The redirect to the IdP can feel like leaving the site — users sometimes think the login failed | Show a "You're being redirected to the city's secure sign-in page" interstitial with a recognizable city logo to reassure Priya she's in the right flow |
| **2. Authenticate** | Enters city credentials at the IdP; completes any MFA prompt; is redirected back to uReport callback URL | City OIDC IdP → callback `GET /auth/callback` (F4) | "Hope this doesn't time out — last time I had to start over after the MFA step" | Tense | If the OIDC state/nonce cookie is lost mid-flow (e.g., ad blocker clears cookies), the callback fails with an opaque error | Preserve OIDC state/nonce across the redirect correctly; show a user-friendly "Something went wrong with sign-in — please try again" page with a retry button on callback error |
| **3. Land on Dashboard** | Post-login page loads; Priya sees her personal ticket history list (most recent first) | Personal ticket dashboard (F1, F2, F4) | "Okay — I can see my tickets. There's the streetlight one. What's the status now?" | Relieved, focused | If the dashboard shows all city tickets instead of only hers, she has to search — the old system had this bug | Scope the post-login landing page to `reportedByPerson_id = current user` by default; show ticket count ("Your 4 open requests") in the page header |
| **4. Filter and Find** | Clicks "Open" status filter; scans the short list for "Streetlight" category; opens the ticket | Ticket list with status filter (F1, F5) | "There it is — still 'Open', assigned to Dana K. At least someone is looking at it" | Cautiously satisfied | Filter controls are small on tablet — Priya occasionally mis-taps the wrong filter; no debounce means rapid taps fire duplicate queries | Larger tap targets on tablet breakpoints; optimistic UI for filter changes; Solr filter applies in ≤ 200ms (NFR-6) |
| **5. Verify Notification** | Checks the ticket detail page; compares last-modified timestamp to the email she received at 2:14 PM | Ticket detail page + email inbox (F1, F7) | "The email said it was assigned at 2:14 PM. The ticket shows the same time. Good — they match" | Satisfied, trusting | In the legacy system, email timestamps sometimes lagged the ticket timestamp by hours — created distrust | Ensure email is triggered synchronously with the `ticketHistory` write, logged in `sentNotifications` with matching timestamp; display `sentNotifications` in the ticket audit trail for staff context |

---

#### Key Moments

- **Decision Point:** Stage 3 — if Priya's dashboard shows all public tickets instead of her personal history, she loses trust immediately and falls back to manual record-keeping (spreadsheet or screenshots)
- **Risk of Abandonment:** Stage 2 — OIDC callback failure (state/nonce mismatch) with no recovery path causes Priya to abandon login entirely
- **Delight Opportunity:** Stage 5 — when the email notification timestamp exactly matches the audit trail, Priya gains confidence in the system's reliability; this converts a skeptical legacy user into a regular one

---

#### Success Outcome

Priya accesses her personal ticket history within 2 clicks of logging in via OIDC, sees real-time ticket status, and can verify it matches her email notification (JTBD-02.1 success measure: personal ticket history within 2 clicks; JTBD-02.2: email notification within 5 minutes).

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Initiate Login | F4 (OIDC initiation), F2 (RBAC public level) |
| Authenticate | F4 (OIDC callback, session creation), F2 |
| Land on Dashboard | F1 (ticket list scoped to reporter), F4 (authenticated session), F2 |
| Filter and Find | F1 (status filter), F5 (Solr query) |
| Verify Notification | F1 (ticket detail, audit trail), F7 (email notification + sentNotifications log) |

---

---

### JRN-02.2: Setting Up a Bookmark for a Recurring Issue Search

**Persona:** PER-02 (Priya Nair)
**Scenario:** Priya regularly checks whether new potholes have been reported on Elm Street — the road in front of her house. Each session she re-types the same search query in the Solr search box. Today she discovers the bookmark feature and decides to save "Elm Street Potholes" as a named search she can re-run with one click on future visits.
**Related Jobs:** JTBD-02.3

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1. Run the Search** | Types "pothole elm street" in the search box; selects "Open" status filter; clicks Search | Solr search page (F5) | "Here we go again — same query I run every week. I should save this somehow" | Mildly resigned | No visual hint that searches can be saved — the bookmark feature is not discoverable from the search form | Add a "Save this search" affordance (icon or link) in the search results header, visible only to authenticated users |
| **2. Review Results** | Scans search results: 3 open pothole tickets on Elm Street; confirms they match expectations | Solr search results page (F5, F2) | "Good, three open tickets. Same ones as last week — still no progress on the big one" | Neutral, slightly concerned about slow resolution | Results show tickets from nearby streets too — Priya has to visually scan to confirm "Elm Street" tickets | Support an `address_contains` filter or street-name facet in search; highlight matched terms in the result snippet |
| **3. Save Bookmark** | Clicks "Save this search"; a modal prompts for a name; types "Elm Street Potholes"; clicks Save | Bookmark creation modal — `POST /bookmarks` (F12) | "What should I name it? Something I'll recognize next week" | Curious, slightly uncertain | Modal appears but doesn't pre-populate a suggested name from the query string — Priya has to invent a name from scratch | Pre-populate the bookmark name field with a sanitized version of the query (e.g., "pothole elm street — Open") and let Priya edit it |
| **4. Confirm Bookmark Saved** | Modal closes; search results remain visible; a success toast appears: "Bookmark 'Elm Street Potholes' saved" | Toast notification + results page (F12) | "It saved — but where do I find it later? Is it on my profile somewhere?" | Satisfied but uncertain about retrieval | No immediate indication of where the bookmark will appear on future sessions | Toast message includes a "View your bookmarks" link; bookmarks also appear on the post-login dashboard sidebar |
| **5. Re-Run Bookmark (Next Session)** | Logs in next week; sees "Elm Street Potholes" in the saved searches panel on her dashboard; clicks it | Dashboard saved searches panel → Solr query re-executed (F5, F12, F4) | "One click and I can see the current results — this is much better than retyping it" | Pleased, efficient | If the Solr index is temporarily unavailable, the bookmark click shows an error with no context | Show a "Search is temporarily unavailable — try again in a moment" message on Solr errors rather than a generic 500; results must reflect current ticket state (not cached) |

---

#### Key Moments

- **Decision Point:** Stage 1 — if Priya doesn't see a "Save this search" affordance in the results page, she never discovers the feature; discoverability is the critical gate
- **Risk of Abandonment:** Stage 3 — if the bookmark save silently fails (no confirmation), Priya assumes it worked and discovers it's missing next session, destroying trust in the feature
- **Delight Opportunity:** Stage 5 — a one-click re-run of a named bookmark that returns current results is the product's strongest productivity win for Priya; it converts a weekly friction point into a 3-second task

---

#### Success Outcome

Priya saves a named bookmark from a Solr results page without leaving the results view and successfully re-runs it in a single click on her next session, with results reflecting current ticket state (JTBD-02.3 success measure).

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Run the Search | F5 (Solr search), F2 (public permission filter) |
| Review Results | F5 (Solr results), F2 (displayPermissionLevel filter) |
| Save Bookmark | F12 (bookmark creation), F4 (authenticated session required) |
| Confirm Saved | F12 (bookmark stored), F5 (results page remains) |
| Re-Run Bookmark | F12 (bookmark list), F5 (Solr query re-executed), F4 (authenticated session) |

---

## PER-03: Dana Kowalski — Municipal Case Worker

---

### JRN-03.1: Daily Ticket Queue — Assign, Update, Close

**Persona:** PER-03 (Dana Kowalski)
**Scenario:** Dana starts her Monday shift at 8:00 AM. She has 32 open tickets in the Public Works queue. She needs to identify overdue items first, assign a freshly-created ticket to herself, update a ticket in progress with a staff comment, and close two tickets that field crews resolved over the weekend. She logs in once in the morning and stays authenticated all day.
**Related Jobs:** JTBD-03.1, JTBD-03.2

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1. Login and Orient** | Arrives at her workstation; navigates to the CRM; OIDC session is still valid from Friday (or re-authenticates if expired); lands on the ticket list | OIDC session restore or re-auth → ticket list landing page (F4, F1) | "Let me see what came in over the weekend. I'm hoping nothing blew up" | Neutral, cautiously alert | If the session expired silently and the page redirects to login mid-workflow later, she loses unsaved form data | Persist session through a full work shift (8h) with a warning at 7h45m; pre-authenticate via a "keep-alive" mechanism |
| **2. Triage Overdue Items** | Applies department = "Public Works", status = "Open", sort by "SLA Elapsed Days" descending | Ticket list with filter and sort controls (F1, F5) | "Three tickets over SLA threshold — the 12-day pothole is worst. Let me start there" | Focused, slightly stressed | In the legacy system this filtered view timed out on queues over ~200 tickets; Dana had a workaround of exporting to CSV and filtering in Excel | Ticket list for ≤ 500 open tickets must load in ≤ 200ms (NFR-6); SLA elapsed days column sortable client-side without a full page reload |
| **3. Assign New Ticket** | Opens the newest unassigned ticket (pothole created Saturday); selects her own name from the "Assign to" dropdown; saves | Ticket detail page → assignment action (F1) | "I'll take this one — it's near the crew's route today. Better me than leaving it unassigned" | Efficient, purposeful | Dropdown lists all staff across all departments — Dana has to scroll to find her name among 45 people | Filter the assignee dropdown to show only staff in the ticket's owning department first; auto-suggest on name typing |
| **4. Update Ticket with Staff Comment** | Opens a 5-day-old pothole ticket; types internal note "Crew inspected 2026-06-20 — material ordered, repair expected Fri"; saves | Ticket detail → staff comment action (F1, F15) | "This is staff-only — the reporter shouldn't see this. I need to confirm comments are private before I type anything sensitive" | Careful, slightly uncertain | No visual distinction between the "Staff Comment" field and a "Reply to Reporter" field — Dana has accidentally sent internal notes to reporters before | Label "Staff Comment (internal — not sent to reporter)" with a lock icon; "Reply to Reporter" with an email icon; clear visual separation between the two |
| **5. Close Resolved Tickets** | Opens the first resolved ticket; selects sub-status "Resolved"; types close notes "Pothole filled 2026-06-21 by crew team B"; clicks "Close Ticket" | Ticket detail → close action with substatus_id (F1, F15, F7) | "Sub-status: Resolved. Close notes entered. Does this trigger an email to the reporter automatically?" | Deliberate, slightly anxious | In the legacy system, the notification sometimes fired and sometimes didn't — Dana couldn't tell which was which without checking her email | Show a confirmation dialog: "This will close the ticket and send an email notification to [reporter email]. Confirm?" with the ability to preview the email body |
| **6. Bulk Review and Export** | Applies "Closed This Week" filter; scans list to verify weekend closures appear; exports filtered list to CSV for weekly report | Ticket list CSV export (F1, F3, F13) | "I want to make sure the three closures from Saturday are in here for Robert's weekly report" | Systematic, efficient | CSV export sometimes differed from the HTML view in the legacy system — a column was missing or a date was formatted differently | CSV export must be column-for-column identical to the HTML table view (F3 parity); include `ticketHistory` summary column in export |

---

#### Key Moments

- **Decision Point:** Stage 2 — SLA sort is the single most critical filter in Dana's workflow; if it doesn't load in ≤ 200ms or sorts incorrectly, she misses overdue items and her performance metrics suffer
- **Risk of Abandonment:** Stage 5 — if the notification trigger is unreliable (as in the legacy system), Dana starts manually emailing reporters instead of trusting the close workflow, undermining the CRM's value
- **Delight Opportunity:** Stage 4 — clearly separating staff-only comments from reporter-facing responses with distinct visual labels would eliminate a persistent source of accidental data exposure

---

#### Success Outcome

Dana identifies all overdue items within 60 seconds of login, assigns, updates, and closes tickets with full audit trail entries, and the close action reliably triggers reporter notification (JTBD-03.1 success measure: ≤ 200ms queue load, overdue items within 60s; JTBD-03.2: every closure produces immutable audit entry with triggered notification).

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Login and Orient | F4 (OIDC session), F1 (ticket list) |
| Triage Overdue | F1 (ticket list filter/sort), F5 (Solr query), F2 (staff RBAC) |
| Assign New Ticket | F1 (assignment action, ticketHistory entry) |
| Update Staff Comment | F1 (comment action), F15 (action reference data), F2 (staff-only visibility) |
| Close Tickets | F1 (close action), F15 (substatus_id), F7 (notification trigger) |
| Bulk Export | F1 (filtered list), F3 (CSV serialization), F13 (reports) |

---

---

### JRN-03.2: Mark a Ticket as Duplicate and Link to Parent

**Persona:** PER-03 (Dana Kowalski)
**Scenario:** Dana is processing her queue mid-morning when she opens a ticket: "Water pooling at corner of Elm & 3rd." She has a vague memory of a similar report from last week. Before closing it as a duplicate, she needs to search for the parent ticket in-app, confirm the match, link the tickets, and close with sub-status "Duplicate" — all without navigating away from the current ticket detail page.
**Related Jobs:** JTBD-03.3

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1. Identify Candidate** | Opens the ticket "Water pooling at Elm & 3rd"; reads description and location fields; suspects it is a duplicate of a ticket she saw last Thursday | Ticket detail page (F1) | "This sounds exactly like the one I processed Thursday. Let me check before I close it wrong — marking it Bogus when it's a real Duplicate would be unfair" | Careful, uncertain | No visual indicator on the ticket that similar tickets exist nearby — there is no "possible duplicate" suggestion | Auto-surface a "Similar tickets" panel on ticket detail using Solr similarity query (same category + proximity); flag tickets with matching location + category submitted within 7 days |
| **2. Search for Parent** | Clicks "Search for duplicate" button on the ticket detail; types "elm water pooling" in the search field; adds category = "Drainage" filter | Duplicate search panel within ticket detail (F5, F1) | "It should return within a second or two — if it spins too long I'll just open a new tab" | Impatient, determined | In the legacy workflow, Dana had to open a second browser tab to search because there was no in-page search; she then copy-pasted ticket IDs back manually | In-page Solr search panel returns results in ≤ 500ms (JTBD-03.3 hiring criteria); results appear inline without navigation |
| **3. Review Matches** | Solr returns 2 results; Dana opens the first result in a side panel; confirms it matches ("Water pooling at Elm & 3rd — submitted 2026-06-17, still open") | Inline search results + ticket preview panel (F5, F1) | "That's the one. Same location, same category, same description essentially. I'm confident this is a duplicate" | Confident | Results show ticket IDs but not a quick-view preview — Dana has to click into each result to confirm details | Show a ticket snippet in the search results (category, address, submission date, current status) so Dana can confirm the match without opening a full detail view |
| **4. Link as Duplicate** | Clicks "Link as duplicate of #84609" button in the search panel; confirms the action in the dialog | Duplicate link action → `parent_id` assignment (F1, F15) | "Linking this as duplicate of 84609. This should log to both tickets' history" | Decisive | No confirmation showing what will happen on both the child and parent ticket — Dana is uncertain whether the parent reporter gets notified | Show a confirmation dialog: "This will mark ticket #84712 as a duplicate of #84609 and log a 'duplicate' action on both. The original reporter will not be notified separately." |
| **5. Close as Duplicate** | Selects sub-status "Duplicate" from the dropdown; enters close notes "Duplicate of #84609 — water pooling at Elm & 3rd"; clicks "Close Ticket" | Ticket close form with substatus_id = Duplicate (F1, F15, F7) | "Done. Both tickets have the audit trail entry now. I can move on" | Relieved, efficient | Close form doesn't pre-populate the sub-status after a duplicate link action — Dana has to select "Duplicate" manually even though she just linked the ticket | After `parent_id` is assigned, pre-select sub-status "Duplicate" in the close form as a default (user can still override) |

---

#### Key Moments

- **Decision Point:** Stage 3 — if Solr results don't return quickly or don't include enough context (ticket snippet), Dana guesses or falls back to the browser-tab workaround, undermining the in-page search investment
- **Risk of Abandonment:** Stage 2 — if the in-page search panel doesn't exist and Dana must open a new tab, the duplicate workflow is no better than the legacy system
- **Delight Opportunity:** Stage 4/5 — auto-linking and pre-selecting "Duplicate" sub-status after the link action reduces two manual steps to zero, making the close workflow feel seamlessly connected

---

#### Success Outcome

Dana confirms or rules out a duplicate within 30 seconds using in-app search, links the duplicate via `parent_id`, and closes with sub-status "Duplicate" — with `ticketHistory` entries on both the child and parent ticket, all without leaving the ticket detail page (JTBD-03.3 success measure).

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Identify Candidate | F1 (ticket detail), F5 (potential similarity suggestion) |
| Search for Parent | F5 (Solr in-page search panel), F1 |
| Review Matches | F5 (search results), F1 (ticket preview) |
| Link as Duplicate | F1 (parent_id assignment), F15 (duplicate action reference), ticketHistory on both tickets |
| Close as Duplicate | F1 (close action), F15 (substatus_id = Duplicate), F7 (notification trigger) |

---

## PER-04: Robert Osei — Department Supervisor / System Admin

---

### JRN-04.1: Create a New Service Category with Custom Fields and SLA

**Persona:** PER-04 (Robert Osei)
**Scenario:** The city is launching a new "Illegal Dumping" reporting service. Robert needs to create a new category with a custom field ("Estimated dump volume in bags"), set the SLA to 5 business days, assign it to the Sanitation department, set posting permission level to "anonymous" (so any citizen can report without an account), configure a custom reply email, and publish it — all without involving a developer. He needs the category to be live for citizen submissions within the hour.
**Related Jobs:** JTBD-04.1

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1. Navigate to Admin** | Logs in; navigates to Admin → Categories → "New Category" | Admin navigation → category creation form (F10, F2) | "Let me make sure I'm in the right department. I don't want to accidentally publish under Public Works" | Systematic, slightly cautious | Admin navigation is not prominently linked from the main nav — Robert has bookmarked the URL because it's buried 3 levels deep | Surface an "Admin" top-level nav item for staff users with admin role; breadcrumb trail shows Department → Categories → New |
| **2. Fill Core Fields** | Enters name "Illegal Dumping", selects group "Environment", selects department "Sanitation", sets `active = true`, sets `featured = false` | Category form — core fields (F10) | "Name, group, department — straightforward. Do I need a description for the citizen-facing form? Yes, I should write one so Marcus knows what to report here" | Focused | No character count or preview of how the category name will appear to citizens in the Open311 `GET /services` response | Show a live preview panel: "How this category will appear in the citizen-facing form and Open311 API response" updating as Robert types |
| **3. Configure Permissions and SLA** | Sets `displayPermissionLevel = anonymous`, `postingPermissionLevel = anonymous`; sets `slaDays = 5`; sets `notificationReplyEmail = sanitation@city.gov` | Category form — permission, SLA, notification fields (F10, F7, F2) | "Anonymous posting means Marcus can report without logging in. Is that right for this category? Yes. And 5-day SLA seems right for dumping" | Deliberate | The permission level field labels are technical ("postingPermissionLevel") not plain English — Robert sometimes has to re-read the help text | Relabel as "Who can view this category?" (Public / Authenticated Residents / Staff Only) and "Who can submit reports?" with plain-English descriptions; add a tooltip linking to the RBAC documentation |
| **4. Add Custom Field** | Clicks "Add Custom Field"; selects type "Text"; enters label "Estimated volume (e.g., 3 bags, 1 truckload)"; marks as optional | Custom field editor (F10) | "One custom field should be enough. Can I preview how this will look on the submission form?" | Curious, slightly uncertain | Custom fields are defined as raw JSON in the legacy system — Robert had to ask a developer to validate the JSON schema | Provide a form-builder UI for custom fields (label, type, required/optional, placeholder) that generates the JSON schema behind the scenes; include a live preview of the resulting form field |
| **5. Save and Validate** | Clicks "Save Category"; system validates all required fields; shows a green success banner; category is immediately available in `GET /open311/v2/services` | Category save → validation + RBAC enforcement (F10, F2, F0) | "No errors — that's a relief. In the old system I'd get a silent failure and have to ask IT to check the database" | Relieved, satisfied | In the legacy system, saving an incomplete category caused a silent failure (no validation feedback, no error message) with citizens seeing a broken form | All required fields validated before save with inline field-level error messages; on success, show: "Category 'Illegal Dumping' is now live. Citizens can submit reports immediately." |
| **6. Verify Live** | Opens the city portal in a new incognito tab; navigates to "Report an Issue"; confirms "Illegal Dumping" appears in the category list with correct description and the custom field renders | Citizen-facing form → `GET /open311/v2/services` (F0, F10) | "There it is — 'Illegal Dumping'. The custom field looks right. I'll test a submission too to be sure" | Confident, thorough | No "Preview as citizen" mode in the admin UI — Robert has to manually open an incognito session to verify citizen-facing rendering | Add a "Preview as citizen" button in the admin UI that opens a sandboxed preview of the submission form in a modal, without actually publishing a test ticket |

---

#### Key Moments

- **Decision Point:** Stage 3 — setting the wrong `postingPermissionLevel` (e.g., `staff` instead of `anonymous`) makes the category invisible to citizens; the plain-language label is critical for correctness
- **Risk of Abandonment:** Stage 5 — silent save failure (as in legacy system) causes Robert to assume the category is live when it isn't; citizen submissions fail silently for hours until someone notices
- **Delight Opportunity:** Stage 4 — a form-builder UI for custom fields (vs. raw JSON) is the single most impactful upgrade for Robert's workflow; it removes a developer dependency entirely

---

#### Success Outcome

Robert creates a fully valid service category — with custom fields, SLA, permission levels, and notification overrides — in under 10 minutes, with validation on save, and the category is immediately live for citizen submissions with zero developer involvement (JTBD-04.1 success measure).

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Navigate to Admin | F10 (category admin), F2 (staff RBAC gate) |
| Fill Core Fields | F10 (category creation form) |
| Configure Permissions & SLA | F10 (permission levels, slaDays), F7 (notificationReplyEmail), F2 (RBAC enforcement) |
| Add Custom Field | F10 (customFields JSON schema), F1 (custom field rendering on ticket form) |
| Save and Validate | F10 (save + validation), F2 (RBAC immediate enforcement), F0 (category appears in GET /services) |
| Verify Live | F0 (`GET /open311/v2/services`), F10 |

---

---

### JRN-04.2: Monitor System Health and Review Graylog Logs

**Persona:** PER-04 (Robert Osei)
**Scenario:** A third-party mobile app vendor contacts Robert to report that their app has been getting 403 errors from the Open311 API since this morning. Robert needs to: (1) check the metrics dashboard to see if ticket submission volume dropped, (2) open Graylog to find the specific error log entries for the API key in question, (3) identify the cause (in this case, the api_key was accidentally deleted), and (4) create a new API client credential so the integrator can resume operations — all without filing a ticket to IT or restarting the application.
**Related Jobs:** JTBD-04.2, JTBD-04.3

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1. Check Metrics Dashboard** | Navigates to the metrics dashboard; sees open ticket count is flat since 9 AM — typical submission rate has dropped from ~15/hour to 0 | Metrics dashboard (F13, F2) | "Submission rate fell off a cliff at 9:07 AM. That matches when the vendor says their app started getting errors. Something broke around then" | Alarmed, investigative | Dashboard currently only shows totals, not a time-series view — Robert can only tell volume dropped, not when it changed | Add a submission rate sparkline (hourly for last 24h) to the dashboard; the time-series view instantly pinpoints the breakpoint without needing logs |
| **2. Open Graylog** | Opens Graylog in a new tab; searches for `facility:uReport AND _http_status:403 AND _api_key:"abc123xyz"` | Graylog structured log search (F14) | "I need to filter by that api_key and look for 403 errors. The logs should have the api_key in the structured fields" | Focused, methodical | If the GELF structured fields don't include `_api_key` on auth failures, Robert has to search by IP or timeframe — much slower | Ensure GELF log entries for failed `POST /open311/v2/requests` include `_api_key`, `_http_status`, `_route`, and `_error_message` as structured fields (F14) |
| **3. Identify Root Cause** | Finds 200+ 403 entries since 9:07 AM; log message reads "api_key not found in clients table"; Robert realizes the key was deleted | Graylog log detail view (F14) | "Someone deleted the client record. I can see it happened at 9:05 AM — two minutes before the errors started. I need to recreate it" | Concerned but in control | Graylog log message says "api_key not found" but doesn't include which admin user performed the deletion — Robert can't audit who deleted it | Log admin CRUD actions (people, clients) to `ticketHistory` or a separate admin audit log with `person_id` and action type; surface in Graylog as `_admin_action = client_deleted` |
| **4. Create New API Client** | Navigates to Admin → API Clients → "New Client"; enters the vendor's name, URL, and generates a new `api_key`; saves | API client management form — `POST /clients` (F11, F0) | "I'll generate a new key and send it to the vendor. They can update their app config without a code deploy — just an environment variable change on their side" | Purposeful, efficient | The new api_key must be immediately usable without an application restart; if there is any caching layer that requires a restart, Robert cannot resolve this self-service | `api_key` lookup must be a live database read on each request — no in-memory cache that requires a restart; new key works on the next `POST /open311/v2/requests` immediately |
| **5. Verify and Communicate** | Sends the new api_key to the vendor; asks them to test a submission; monitors Graylog for the vendor's first successful 201 response | Graylog real-time stream + email (F14, F0) | "Good — I can see the 201 responses coming in now. The submission rate is recovering on the dashboard. Crisis resolved in 18 minutes" | Relieved, satisfied | No in-app notification when submission rate recovers — Robert has to watch Graylog manually | Dashboard auto-refreshes every 60 seconds (or on demand); submission rate sparkline shows recovery without manual Graylog monitoring |

---

#### Key Moments

- **Decision Point:** Stage 2 — if GELF structured fields don't include `_api_key` on auth failures, log diagnosis takes 20+ minutes instead of 2; structured field design is a critical operational requirement
- **Risk of Abandonment:** Stage 4 — if creating a new API key requires an application restart, Robert cannot self-service the fix and must file an IT ticket, defeating the self-service goal of JTBD-04.3
- **Delight Opportunity:** Stage 5 — a dashboard submission rate sparkline that shows recovery after the fix gives Robert immediate visual confirmation without needing to stay in Graylog

---

#### Success Outcome

Robert diagnoses an API auth failure, identifies the cause in Graylog within 2 minutes using structured fields, creates a new API client credential that is immediately usable, and confirms recovery — all without a developer or IT involvement (JTBD-04.3 success measure: credential live within 5 minutes, no restart; JTBD-04.2: metrics dashboard reflects state with ≤ 5-minute staleness).

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Check Metrics Dashboard | F13 (metrics dashboard), F2 (staff RBAC gate) |
| Open Graylog | F14 (GELF structured logging, `_api_key` field) |
| Identify Root Cause | F14 (Graylog log detail), F11 (admin audit trail — client deletion) |
| Create New API Client | F11 (API client CRUD), F0 (api_key authentication), F2 (RBAC) |
| Verify and Communicate | F14 (Graylog real-time), F13 (dashboard submission rate), F0 (POST /requests 201 response) |

---

---

## Cross-Journey Patterns

### Common Pain Points Across Multiple Journeys

| Pattern | Journeys Affected | Root Cause | Shared Opportunity |
|---|---|---|---|
| **Legacy system unreliability creates distrust** — users build shadow workarounds (Excel sheets, screenshots, browser tabs) because they can't trust the system | JRN-01.1, JRN-03.1, JRN-03.2, JRN-04.1 | PHP legacy system: page timeouts, silent save failures, inconsistent notification triggers | The re-platform's primary value proposition is eliminating these workarounds; every journey that removes a workaround should be highlighted in the launch communication |
| **No optimistic UI / feedback on async actions** — form submissions, saves, and searches feel "stuck" when the server takes > 500ms | JRN-01.1 (Stage 5), JRN-02.1 (Stage 2), JRN-03.1 (Stage 2) | Network latency + no client-side loading states | Implement loading spinners, skeleton screens, and toast confirmations consistently across all form submit and filter actions |
| **Notification trust gap** — multiple personas have been burned by missed or delayed notifications in the legacy system | JRN-02.1 (Stage 5), JRN-03.1 (Stage 5), JRN-03.2 (Stage 5) | PHPMailer + inconsistent trigger logic in the legacy system | Every email send must be logged synchronously to `ticketHistory.sentNotifications` with a timestamp; surface the send log in the ticket audit trail for both staff and authenticated citizens |
| **Discoverability gaps** — features like "Save this search" (bookmarks), admin navigation, and "possible duplicate" suggestions are invisible to users who need them | JRN-02.2 (Stage 1), JRN-03.2 (Stage 1), JRN-04.1 (Stage 1) | Feature-first UI design without progressive disclosure or contextual prompts | Conduct a UI audit for all "hidden feature" affordances after re-platform; add contextual tooltips or inline prompts at the moments journeys show users need them |
| **RBAC correctness is a cross-cutting anxiety** — Dana worries about accidentally showing internal comments to citizens; Robert worries about wrong permission levels on categories | JRN-03.1 (Stage 4), JRN-04.1 (Stage 3) | Laminas ACL edge cases + unclear UI labeling | Clear visual distinction for staff-only vs. public-visible elements (lock icons, color-coded labels); CASL rule set must exactly match Laminas ACL with test coverage (NFR-7) |

---

### Shared Opportunities That Could Be Solved Once

1. **Unified loading state component** — a single NestJS interceptor measuring response time + a front-end loading state library applied globally would address the "stuck form" pattern across all journeys without per-page implementation.

2. **Structured GELF fields as a contract** — defining a fixed set of GELF structured fields (`_user_id`, `_ticket_id`, `_api_key`, `_http_status`, `_admin_action`) once in the GELF logging service (F14) serves both Robert's diagnostic journey (JRN-04.2) and the overall NFR-8 observability requirement.

3. **Audit trail as the source of truth for notifications** — if every `ticketHistory` write atomically triggers notification evaluation (F7), and every sent notification is logged back to `ticketHistory.sentNotifications`, then Priya's notification trust gap (JRN-02.1) and Dana's notification anxiety (JRN-03.1) are solved by the same mechanism.

4. **Permission level UI labels** — renaming `postingPermissionLevel`/`displayPermissionLevel` to plain English in the admin UI (F10) and on the citizen-facing form (F0) resolves Robert's category configuration confusion (JRN-04.1 Stage 3) and removes potential RBAC misconfiguration.

---

### Stages Where Multiple Personas Converge

| Convergence Point | Personas | Shared Mechanism |
|---|---|---|
| Ticket submission confirmation | PER-01 (JRN-01.1 Stage 6), PER-02 (JRN-02.1 Stage 3) | Both depend on the same `POST /open311/v2/requests` or authenticated ticket creation response returning a stable ticket ID and status |
| Ticket status visibility | PER-01 (JRN-01.2 Stage 4), PER-02 (JRN-02.1 Stage 4) | Both query ticket status via the Open311 API or the ticket detail page; RBAC filters the same record differently for anonymous vs. authenticated |
| Notification receipt | PER-02 (JRN-02.1 Stage 5), PER-03 (JRN-03.1 Stage 5) | Priya receives the email Dana's close action triggers; they share a single notification pipeline; correctness of one validates the other |
| Solr search results | PER-02 (JRN-02.2 Stage 2), PER-03 (JRN-03.1 Stage 2), PER-03 (JRN-03.2 Stage 2) | All three rely on the same Solr index, query construction, and ≤ 200-500ms response time requirement |

---

---

## Journey-to-JTBD Traceability

| Journey | Stage | JTBD-ID | Expected Outcome from JTBD |
|---|---|---|---|
| JRN-01.1 | 1. Discover | JTBD-01.1 | Zero authentication prompts for anonymous-eligible categories |
| JRN-01.1 | 2. Select Category | JTBD-01.1 | Clear category selection with plain-language descriptions, not internal jargon |
| JRN-01.1 | 3. Locate Issue | JTBD-01.1 | Accepts location input (GPS coordinates) from a mobile browser |
| JRN-01.1 | 4. Describe & Attach | JTBD-01.1 | Accepts an optional photo attachment alongside the description |
| JRN-01.1 | 5. Submit | JTBD-01.1 | First-time user completes submission in under 3 minutes, with zero auth prompts |
| JRN-01.1 | 6. Confirm | JTBD-01.1 | Returns a unique confirmation token immediately after submission |
| JRN-01.2 | 1. Discover Services | JTBD-01.1 | Open311 `GET /services` response byte-compatible with PHP implementation (NFR-1) |
| JRN-01.2 | 2. Submit Request | JTBD-01.1 | `POST /open311/v2/requests` authenticates via api_key and creates ticket |
| JRN-01.2 | 3. Receive Token | JTBD-01.1 | Token and service_request_id returned in response envelope |
| JRN-01.2 | 4. Poll for Status | JTBD-01.2 | Token lookup returns ticket status in ≤ 200ms without authentication |
| JRN-01.2 | 5. Query Nearby | JTBD-01.3 | Anonymous geo-filtered request list loads in ≤ 200ms; only anonymous-level tickets returned |
| JRN-02.1 | 1. Initiate Login | JTBD-02.1 | OIDC login flow identical to original (NFR-11) |
| JRN-02.1 | 2. Authenticate | JTBD-02.1 | OIDC callback correctly validates state/nonce; session created |
| JRN-02.1 | 3. Land on Dashboard | JTBD-02.1 | Personal ticket history reachable within 2 clicks of login |
| JRN-02.1 | 4. Filter and Find | JTBD-02.1 | Ticket list filterable by status and date; Solr returns results in ≤ 200ms |
| JRN-02.1 | 5. Verify Notification | JTBD-02.2 | Email notification sent within 5 minutes of status change; logged in sentNotifications |
| JRN-02.2 | 1. Run the Search | JTBD-02.3 | Authenticated user can see "Save this search" affordance on Solr results page |
| JRN-02.2 | 2. Review Results | JTBD-02.3 | Solr search returns results filtered by permission level and query params |
| JRN-02.2 | 3. Save Bookmark | JTBD-02.3 | Bookmark saved from search results page without navigating away |
| JRN-02.2 | 4. Confirm Saved | JTBD-02.3 | Bookmark appears in user's dashboard |
| JRN-02.2 | 5. Re-Run Bookmark | JTBD-02.3 | Re-running bookmark replays exact Solr query and reflects current ticket state |
| JRN-03.1 | 1. Login and Orient | JTBD-03.1 | OIDC session persists through full shift; ticket list accessible immediately post-login |
| JRN-03.1 | 2. Triage Overdue | JTBD-03.1 | Queue of 500 tickets loads in ≤ 200ms; SLA sort surfaces overdue items at top |
| JRN-03.1 | 3. Assign New Ticket | JTBD-03.2 | Assignment action logged to ticketHistory with person_id |
| JRN-03.1 | 4. Update Staff Comment | JTBD-03.2 | Staff comment logged to ticketHistory; not visible to anonymous or public users (RBAC) |
| JRN-03.1 | 5. Close Resolved Ticket | JTBD-03.2 | Ticket closure produces ticketHistory entry with sub-status, close notes, and triggered notification |
| JRN-03.1 | 6. Bulk Export | JTBD-03.2 | CSV export column-for-column identical to HTML view (F3 parity) |
| JRN-03.2 | 1. Identify Candidate | JTBD-03.3 | Ticket detail surfaces potential duplicate signals (same category + location proximity) |
| JRN-03.2 | 2. Search for Parent | JTBD-03.3 | In-page Solr search returns results in ≤ 500ms; no tab-switching required |
| JRN-03.2 | 3. Review Matches | JTBD-03.3 | Search results include ticket snippet (category, address, date, status) for quick confirmation |
| JRN-03.2 | 4. Link as Duplicate | JTBD-03.3 | parent_id assignment available from ticket detail; ticketHistory entries on both child and parent |
| JRN-03.2 | 5. Close as Duplicate | JTBD-03.3 | Close with sub-status Duplicate; reporter notification triggered per F7 configuration |
| JRN-04.1 | 1. Navigate to Admin | JTBD-04.1 | Admin navigation accessible to staff role; breadcrumb trail visible |
| JRN-04.1 | 2. Fill Core Fields | JTBD-04.1 | Category creation form with all required fields; plain-language descriptions |
| JRN-04.1 | 3. Configure Permissions & SLA | JTBD-04.1 | Permission levels enforce immediately on save; no developer action required |
| JRN-04.1 | 4. Add Custom Field | JTBD-04.1 | Custom field definable via UI (no raw JSON editing); previewed before save |
| JRN-04.1 | 5. Save and Validate | JTBD-04.1 | All required fields validated before save; no silent failures; category live immediately |
| JRN-04.1 | 6. Verify Live | JTBD-04.1 | Category appears in `GET /open311/v2/services` immediately after save |
| JRN-04.2 | 1. Check Metrics Dashboard | JTBD-04.2 | Metrics dashboard reflects ticket state with ≤ 5-minute staleness |
| JRN-04.2 | 2. Open Graylog | JTBD-04.3 | Structured logs accessible in Graylog within 2 minutes; `_api_key` field present on auth failures |
| JRN-04.2 | 3. Identify Root Cause | JTBD-04.3 | Admin actions (client deletion) logged with actor person_id; surfaced in Graylog |
| JRN-04.2 | 4. Create New API Client | JTBD-04.3 | New api_key immediately usable for POST /open311/v2/requests; no restart required |
| JRN-04.2 | 5. Verify and Communicate | JTBD-04.2, JTBD-04.3 | Dashboard reflects submission rate recovery; Graylog shows 201 responses on new key |

---

*JOURNEYS generated: 2026-06-23 | Derived from PERSONAS-uReport.md, JTBD-uReport.md, PRD-uReport.md | Model: claude-sonnet-4-6*
