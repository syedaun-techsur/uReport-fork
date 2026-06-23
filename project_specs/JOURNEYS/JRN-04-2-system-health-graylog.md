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

