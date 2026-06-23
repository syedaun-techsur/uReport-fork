---

## F10: Category & Department Administration

**Description:** Staff manage the full taxonomy of service categories, category groups, departments, and the routing rules connecting them. All admin CRUD interfaces are reproduced with identical field sets, validation rules, and association management. These entities drive ticket routing, permission enforcement, and email notifications across the entire system.

**Terminology:**
- **Category:** A service type (e.g., "Pothole") classified under a group, owned by a department
- **CategoryGroup:** A grouping label (e.g., "Streets") used for display ordering
- **Department:** A city department that owns categories and receives assigned tickets
- **defaultPerson_id:** The staff person who receives new tickets in a category/department if no specific assignment is made
- **customFields:** JSON schema string defining dynamic form fields presented on ticket creation for this category
- **autoClose:** If enabled and `autoCloseIsActive = true`, tickets in this category auto-close after `slaDays` days

**Sub-features:**
- Category CRUD (create, read, update, delete)
- CategoryGroup CRUD
- Department CRUD
- Department–Category association management
- Department–Action association management
- Category Action Response (email template override) management
- Custom field schema management per category

---

### F10.1 Category CRUD

**Create/Update inputs:**
- `name` (string, required, max 50 chars)
- `description` (string, optional, max 512 chars)
- `department_id` (integer, required): owning department
- `defaultPerson_id` (integer, optional): default assignee
- `categoryGroup_id` (integer, optional): display group
- `active` (boolean, optional): whether visible in public lists
- `featured` (boolean, optional): highlighted on home page
- `displayPermissionLevel` (enum `staff|public|anonymous`, required)
- `postingPermissionLevel` (enum `staff|public|anonymous`, required)
- `customFields` (JSON text, optional): field schema definitions
- `slaDays` (integer unsigned, optional): SLA target in days
- `notificationReplyEmail` (string max 128, optional): override reply-to for notifications
- `autoCloseIsActive` (boolean, optional): enable auto-close feature
- `autoCloseSubstatus_id` (integer, optional): sub-status to use when auto-closing

**Validation:**
- `name` must be unique within a department (soft validation — warn, not block).
- `department_id` must reference an existing department.
- `defaultPerson_id` if set must reference a person in `department_id`'s staff.
- `autoCloseSubstatus_id` must reference a sub-status with `status = 'closed'`.
- `customFields` must be valid JSON if provided.
- `displayPermissionLevel` must be one of `staff`, `public`, `anonymous`.
- `postingPermissionLevel` must be one of `staff`, `public`, `anonymous`.
- `notificationReplyEmail` must be valid email format if provided.

**lastModified behavior:**
- `categories.lastModified` is updated on every update operation.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| department_id not found | 404 | NOT_FOUND | "Department not found" |
| Invalid customFields JSON | 400 | INVALID_INPUT | "customFields must be valid JSON" |
| Invalid permissionLevel value | 400 | INVALID_INPUT | "permissionLevel must be staff, public, or anonymous" |
| Category has tickets (delete) | 409 | CONFLICT | "Cannot delete category with existing tickets" |

---

### F10.2 CategoryGroup CRUD

**Inputs:**
- `name` (string, required, max 50 chars)
- `ordering` (small integer, optional): display ordering value

**Validation:**
- `name` must be non-empty.
- `ordering` if provided must be a non-negative integer.

**Delete constraint:** If any categories reference this group, deletion is blocked (FK constraint).

---

### F10.3 Department CRUD

**Inputs:**
- `name` (string, required, max 128 chars)
- `defaultPerson_id` (integer, optional): default assignee for unassigned tickets

**Validation:**
- `name` must be unique and non-empty.
- `defaultPerson_id` must reference an existing person.

**Delete constraint:** If any categories or people reference this department, deletion is blocked.

---

### F10.4 Department–Category Associations (`department_categories`)

The `department_categories` join table allows a ticket in one category to also appear in other departments' queues.

**Operations:**
- Add association: `POST /departments/:deptId/categories` with `{category_id}`
- Remove association: `DELETE /departments/:deptId/categories/:categoryId`
- List associations: `GET /departments/:deptId/categories`

---

### F10.5 Department–Action Associations (`department_actions`)

Controls which custom action types appear in a department's ticket workflow.

**Operations:**
- Add: `POST /departments/:deptId/actions` with `{action_id}`
- Remove: `DELETE /departments/:deptId/actions/:actionId`
- List: `GET /departments/:deptId/actions`

---

### F10.6 Category Action Responses (`category_action_responses`)

Per-category email template overrides per action type.

**Inputs:**
- `category_id` (integer, required)
- `action_id` (integer, required)
- `template` (text, optional): email body template
- `replyEmail` (string max 128, optional): reply-to address

**Operations:**
- Upsert: `POST /categories/:categoryId/actions/:actionId/response` (creates or updates)
- Delete: `DELETE /categories/:categoryId/actions/:actionId/response`
- Get: `GET /categories/:categoryId/actions/:actionId/response`

---

### F10.7 Custom Field Schema

`categories.customFields` stores a JSON array of field definition objects. Each object:
```json
{
  "code": "pothole_size",
  "datatype": "singlevaluelist",
  "label": "Pothole Size",
  "required": true,
  "order": 1,
  "values": [
    {"key": "small", "name": "Small (< 6 inches)"},
    {"key": "large", "name": "Large (>= 6 inches)"}
  ]
}
```

Supported `datatype` values: `string`, `number`, `datetime`, `singlevaluelist`, `multivaluelist`.

The front-end form and the Open311 `ServiceDefinition` attributes array are both derived from this JSON schema.

---

**API Surface (this feature):** see `Y1-api.md` §Categories, §Departments.

**Schema Surface (this feature):** uses `categories`, `categoryGroups`, `departments`, `department_categories`, `department_actions`, `category_action_responses` — see `Y0-schema.md`.
