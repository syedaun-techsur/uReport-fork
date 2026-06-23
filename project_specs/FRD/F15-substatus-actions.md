---

## F15: Sub-Status & Action Reference Data

**Description:** Sub-statuses and actions are configurable reference data that drive ticket workflow and email notifications. The seed data and admin interfaces for `substatus`, `actions`, `issueTypes`, `contactMethods`, and `category_action_responses` must be preserved. System actions are immutable; department-type actions can be managed by staff.

**Terminology:**
- **System action:** A built-in action type (e.g., `open`, `closed`) that cannot be deleted
- **Department action:** A custom action type created by staff, linked to specific departments
- **isDefault:** Sub-status flag indicating the default selection in the close-ticket UI
- **Response template:** The email body template stored on an action or on a per-category override

**Sub-features:**
- Sub-status CRUD (with seed data)
- Action CRUD (system actions read-only; department actions manageable)
- Issue type CRUD
- Contact method CRUD
- Category action response management (see F10.6)

---

### F15.1 Sub-Status Management

**Seed data (must be present after migration):**
| name | description | status | isDefault |
|------|-------------|--------|-----------|
| Resolved | This ticket has been taken care of | closed | false |
| Duplicate | This ticket is a duplicate of another ticket | closed | false |
| Bogus | This ticket is not actually a problem or has already been taken care of | closed | false |

**Create/Update inputs:**
- `name` (string, required, max 25 chars)
- `description` (string, required, max 128 chars)
- `status` (enum `open|closed`, required, default `open`)
- `isDefault` (boolean, required, default `false`)

**Validation:**
- `name` must be non-empty.
- `status` must be `open` or `closed`.
- At most one sub-status per status value may have `isDefault = true`.

**Delete constraint:** Sub-statuses referenced by `tickets.substatus_id` or `categories.autoCloseSubstatus_id` cannot be deleted.

---

### F15.2 Action Management

**Seed data (system actions — `type = 'system'`):**
| name | description |
|------|-------------|
| open | Opened by {actionPerson} |
| assignment | {enteredByPerson} assigned this case to {actionPerson} |
| closed | Closed by {actionPerson} |
| changeCategory | Changed category from {original:category_id} to {updated:category_id} |
| changeLocation | Changed location from {original:location} to {updated:location} |
| response | {actionPerson} contacted {reportedByPerson_id} |
| duplicate | {duplicate:ticket_id} marked as a duplicate of this case. |
| update | {enteredByPerson} updated this case. |
| comment | {enteredByPerson} commented on this case. |
| upload_media | {enteredByPerson} uploaded an attachment. |

**System action rules:**
- System actions (`type = 'system'`) cannot be deleted or have their `name` changed.
- `template` and `replyEmail` on system actions can be updated by staff (to set default notification content).

**Department action inputs:**
- `name` (string, required, max 25 chars)
- `description` (string, required, max 128 chars)
- `type`: always `'department'` for new actions
- `template` (text, optional): email body template
- `replyEmail` (string max 128, optional): reply-to address

**Delete constraint:** Actions referenced by `ticketHistory.action_id`, `department_actions`, or `category_action_responses` cannot be deleted.

---

### F15.3 Issue Type CRUD

**Seed data:**
Comment, Complaint, Question, Report, Request, Violation

**Inputs:**
- `name` (string, required, max 128 chars)

**Delete constraint:** Issue types referenced by `tickets.issueType_id` cannot be deleted.

---

### F15.4 Contact Method CRUD

**Seed data:**
Email, Phone, Web Form, Other

**Inputs:**
- `name` (string, required, max 128 chars)

**Delete constraint:** Contact methods referenced by `tickets.contactMethod_id`, `tickets.responseMethod_id`, or `clients.contactMethod_id` cannot be deleted.

---

**API Surface (this feature):** see `Y1-api.md` §ReferenceData.

**Schema Surface (this feature):** uses `substatus`, `actions`, `issueTypes`, `contactMethods` — see `Y0-schema.md`.
