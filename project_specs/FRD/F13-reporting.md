---

## F13: Reporting & Metrics

**Description:** uReport provides summary metrics and exportable reports for staff to track ticket volume, resolution rates, and category distribution. The existing metrics and reports modules are reproduced with identical queries, filters, and output formats. All report endpoints are staff-only.

**Terminology:**
- **Metrics:** Aggregated counts and rates computed on demand from the `tickets` table
- **Average resolution time:** Mean of `(closedDate - enteredDate)` for all closed tickets in the period
- **Exportable report:** A filtered query result downloadable as CSV or JSON

**Sub-features:**
- Dashboard metrics endpoint (open/closed counts, resolution time, by-category and by-department breakdowns)
- Reports endpoint with date-range, category, and department filters
- Output in HTML, JSON, CSV, TXT via SerializationInterceptor (see F03)
- Staff-only access enforcement

---

### F13.1 Dashboard Metrics

`GET /metrics[.json|.html|.csv]`

**Process:**
1. Verify caller has `staff` role.
2. Compute metrics:
   - `openCount`: `SELECT COUNT(*) FROM tickets WHERE status = 'open'`
   - `closedCount`: `SELECT COUNT(*) FROM tickets WHERE status = 'closed'`
   - `avgResolutionDays`: `SELECT AVG(EXTRACT(EPOCH FROM (closedDate - enteredDate)) / 86400) FROM tickets WHERE status = 'closed'`
   - `byCategory`: `SELECT category_id, COUNT(*) FROM tickets GROUP BY category_id`
   - `byDepartment`: join categories → departments, `GROUP BY department_id`
3. Return metrics object in negotiated format.

**Inputs:**
- `start_date` (ISO 8601, optional): filter by `enteredDate >=`
- `end_date` (ISO 8601, optional): filter by `enteredDate <=`

**Outputs:**
- `openCount` (integer)
- `closedCount` (integer)
- `totalCount` (integer)
- `avgResolutionDays` (float or null if no closed tickets)
- `byCategory` (array): `[{category_id, category_name, count}]`
- `byDepartment` (array): `[{department_id, department_name, count}]`

---

### F13.2 Exportable Reports

`GET /reports[.json|.csv|.html|.txt]`

**Process:**
1. Verify caller has `staff` role.
2. Build query from filter parameters.
3. Execute query on `tickets` JOIN `categories` JOIN `departments`.
4. Return paginated results in negotiated format.

**Inputs:**
- `start_date` (ISO 8601, optional)
- `end_date` (ISO 8601, optional)
- `status` (string, optional): `open` or `closed`
- `category_id` (integer, optional)
- `department_id` (integer, optional)
- `page` (integer, optional): default 1
- `page_size` (integer, optional): default 100, max 1000

**Outputs (per row):**
- `id`, `status`, `category_name`, `department_name`, `location`, `city`, `zip`, `enteredDate`, `closedDate`, `substatus_name`, `description`

---

### F13.3 Access Control

- Both `/metrics` and `/reports` endpoints require `staff` role.
- Non-staff → 403 `FORBIDDEN`.

---

**API Surface (this feature):** see `Y1-api.md` §Reports.

**Schema Surface (this feature):** reads from `tickets`, `categories`, `departments`, `substatus` — see `Y0-schema.md`.
