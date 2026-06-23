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
