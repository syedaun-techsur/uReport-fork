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

