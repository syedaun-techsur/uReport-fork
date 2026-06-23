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
