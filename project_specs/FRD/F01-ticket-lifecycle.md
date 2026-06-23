---

## F01: Ticket Lifecycle Management

**Description:** Tickets are the core entity of uReport. The full lifecycle — creation, assignment, status updates, closure, duplication, re-opening, and commenting — must be preserved with identical business rules, audit trail entries, and notification triggers. Every state change must be immutably recorded in `ticketHistory`.

**Terminology:**
- **Ticket status:** `open` or `closed` (stored in `tickets.status`)
- **Sub-status:** Qualifying closure reason: Resolved, Duplicate, or Bogus (stored in `tickets.substatus_id`)
- **Action:** A typed event appended to `ticketHistory` on each state change
- **parent_id:** Links a duplicate ticket to its canonical parent
- **lastModified:** Timestamp on `tickets` updated on every write — drives `updated_datetime` in the Open311 API
- **enteredDate:** Immutable creation timestamp on `tickets`
- **SLA days:** `categories.slaDays` — target days to resolution; used to compute `expected_datetime` in Open311 output

**Sub-features:**
- Create ticket (staff entry or Open311 submission)
- Assign ticket to a person within the department
- Update ticket (description, category change, location change, custom fields)
- Close ticket (with sub-status selection)
- Mark as duplicate (link to parent ticket)
- Add comment (staff-only free-text note)
- Add response (contact-the-reporter action)
- Re-open ticket (change status back to `open`)
- View ticket history

---

### F01.1 Create Ticket

**Process:**
1. Validate all required inputs (see Validation below).
2. Load category by `category_id`; verify `postingPermissionLevel` allows the caller's role.
3. Resolve `reportedByPerson_id`: look up or create a `people` record if contact info provided.
4. Set `enteredByPerson_id` = authenticated user `id` (or `client.contactPerson_id` for API submissions).
5. Set `status = 'open'`, `enteredDate = NOW()`, `lastModified = NOW()`.
6. Persist ticket to `tickets` table.
7. Append `open` action entry to `ticketHistory`.
8. If lat/lon provided, assign geo-clusters (see F09).
9. Index ticket in Solr (see F05).
10. Send `open` email notification (see F07).
11. Return created ticket.

**Inputs:**
- `category_id` (integer, required): service category
- `issueType_id` (integer, optional): issue type reference
- `description` (text, optional): free-text description
- `location` (string, optional): address display string
- `city` (string, optional)
- `state` (string, optional)
- `zip` (string, optional): max 40 chars
- `latitude` (double precision, optional): WGS84 decimal degrees
- `longitude` (double precision, optional): WGS84 decimal degrees
- `addressId` (integer, optional): external address service reference ID
- `contactMethod_id` (integer, optional): how the ticket was submitted
- `responseMethod_id` (integer, optional): preferred response method
- `reportedByPerson_id` (integer, optional): existing person reference
- `customFields` (JSON text, optional): custom field values per category definition
- `additionalFields` (string max 255, optional): extra location fields from address service

**Outputs:**
- Created `tickets` record with all fields populated
- `ticketHistory` entry for the `open` action

**Validation:**
- `category_id` must reference an active category.
- Caller's role must meet or exceed `categories.postingPermissionLevel`.
- `latitude` must be in [-90, 90] if provided; `longitude` in [-180, 180].
- `zip` must be ≤ 40 characters.
- `description` length: no hard limit (stored as `text`); front-end recommends ≤ 4000 chars.
- `customFields` must be valid JSON if provided.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Invalid category_id | 404 | NOT_FOUND | "Category not found" |
| Insufficient permission | 403 | FORBIDDEN | "Insufficient permission to post to this category" |
| Invalid coordinates | 400 | INVALID_INPUT | "Coordinates out of valid range" |
| Invalid customFields JSON | 400 | INVALID_INPUT | "customFields must be valid JSON" |

---

### F01.2 Assign Ticket

**Process:**
1. Load ticket; verify caller has `staff` role (see F02).
2. Validate `assignedPerson_id` references a person in the ticket's category's department.
3. Update `tickets.assignedPerson_id`, set `tickets.lastModified = NOW()`.
4. Append `assignment` action to `ticketHistory` with `actionPerson_id = assignedPerson_id`.
5. Send `assignment` email notification (see F07).

**Inputs:**
- `ticket_id` (integer, required): ticket to assign
- `assignedPerson_id` (integer, required): person to assign to

**Validation:**
- `assignedPerson_id` must reference an active person.
- Person must belong to a department associated with the ticket's category.
- Caller must be `staff`.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Person not in department | 400 | INVALID_INPUT | "Assignee must belong to the ticket's department" |
| Not staff | 403 | FORBIDDEN | "Staff access required" |

---

### F01.3 Update Ticket

**Process:**
1. Load ticket; verify caller has `staff` role.
2. Determine which fields changed; log appropriate action(s):
   - Category change → `changeCategory` action with `data = {original: category_id, updated: new_category_id}`
   - Location change → `changeLocation` action with `data = {original: location, updated: new_location}`
   - Other field change → `update` action
3. Apply changes to `tickets` record; set `lastModified = NOW()`.
4. Re-index ticket in Solr.
5. If lat/lon changed, re-assign geo-clusters.

**Inputs:**
- `ticket_id` (integer, required)
- Any updatable field: `category_id`, `issueType_id`, `description`, `location`, `city`, `state`, `zip`, `latitude`, `longitude`, `customFields`, `additionalFields`

**Validation:**
- Same field validation rules as Create.
- `category_id` must exist and caller's role must allow access to the new category.

---

### F01.4 Close Ticket

**Process:**
1. Load ticket; verify caller has `staff` role.
2. Validate `substatus_id` is provided and has `status = 'closed'`.
3. Set `tickets.status = 'closed'`, `tickets.substatus_id`, `tickets.closedDate = NOW()`, `lastModified = NOW()`.
4. Append `closed` action to `ticketHistory`.
5. Send `closed` email notification (see F07).
6. Re-index ticket in Solr.

**Inputs:**
- `ticket_id` (integer, required)
- `substatus_id` (integer, required): must be a sub-status with `status = 'closed'`
- `notes` (text, optional): closure notes appended to `ticketHistory.notes`

**Validation:**
- `substatus_id` must exist and have `status = 'closed'`.
- Ticket must currently be `open`.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Already closed | 409 | CONFLICT | "Ticket is already closed" |
| Invalid substatus | 400 | INVALID_INPUT | "substatus_id must reference a closed sub-status" |

---

### F01.5 Mark as Duplicate

**Process:**
1. Load ticket (child); verify caller has `staff` role.
2. Load parent ticket by `parent_id`; must be a different ticket.
3. Set `tickets.parent_id` on child ticket.
4. Close child ticket with `substatus = Duplicate`.
5. Append `duplicate` action to `ticketHistory` of **parent** ticket with `data = {duplicate: child_ticket_id}`.
6. Send `duplicate` email notification.

**Inputs:**
- `ticket_id` (integer, required): the duplicate ticket
- `parent_id` (integer, required): the canonical parent ticket

**Validation:**
- `parent_id` must reference a different ticket (not itself).
- Child ticket must not already have a `parent_id` set.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Self-reference | 400 | INVALID_INPUT | "A ticket cannot be its own parent" |
| Parent not found | 404 | NOT_FOUND | "Parent ticket not found" |

---

### F01.6 Add Comment

**Process:**
1. Verify caller has `staff` role.
2. Append `comment` action to `ticketHistory` with `notes` = comment text.
3. Set `tickets.lastModified = NOW()`.

**Inputs:**
- `ticket_id` (integer, required)
- `notes` (text, required): comment body

**Validation:**
- `notes` must be non-empty.
- Caller must be `staff`.

---

### F01.7 Add Response

**Process:**
1. Verify caller has `staff` role.
2. Append `response` action to `ticketHistory` with `actionPerson_id` = person contacted (typically `reportedByPerson_id`).
3. Set `tickets.lastModified = NOW()`.
4. Send `response` email notification (see F07).

**Inputs:**
- `ticket_id` (integer, required)
- `notes` (text, optional): response content
- `actionPerson_id` (integer, optional): person contacted; defaults to `reportedByPerson_id`

---

### F01.8 Re-open Ticket

**Process:**
1. Verify caller has `staff` role.
2. Set `tickets.status = 'open'`, clear `tickets.closedDate`, clear `tickets.substatus_id`.
3. Set `tickets.lastModified = NOW()`.
4. Append `update` action to `ticketHistory` with notes indicating re-open.
5. Re-index ticket in Solr.

**Inputs:**
- `ticket_id` (integer, required)
- `notes` (text, optional): re-open reason

**Validation:**
- Ticket must currently be `closed`.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Already open | 409 | CONFLICT | "Ticket is already open" |

---

### F01.9 View Ticket History

**Process:**
1. Load all `ticketHistory` rows for `ticket_id`, ordered by `enteredDate ASC`.
2. Apply role-based PII filtering: anonymous callers must not see `enteredByPerson_id`, `reportedByPerson_id`, or personal contact information.
3. Return history entries in negotiated format.

**Inputs:**
- `ticket_id` (integer, required)

**Outputs:**
- Array of `ticketHistory` entries, each with:
  - `id`, `action_id`, `action.name`, `enteredDate`, `actionDate`, `notes`, `data`, `sentNotifications`
  - `enteredByPerson` (object, staff-only): `{id, firstname, lastname}`
  - `actionPerson` (object, staff-only): `{id, firstname, lastname}`

---

**API Surface (this feature):** see `Y1-api.md` §Tickets.

**Schema Surface (this feature):** uses `tickets`, `ticketHistory`, `categories`, `people`, `substatus`, `actions` — see `Y0-schema.md`.
