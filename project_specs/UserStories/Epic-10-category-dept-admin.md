## Epic 10: Category & Department Administration (F10)

Staff manage the full taxonomy of service categories, category groups, departments, and routing rules. All admin CRUD interfaces are reproduced with identical field sets, validation, and association management.

---

### US-10.1: Create and Edit a Service Category
**As a** Department Supervisor, **I want to** create and edit service categories with custom fields, SLA days, permission levels, and notification overrides, **so that** the CRM taxonomy stays aligned with current city service offerings.

**Acceptance Criteria:**
- [ ] Category `name` is required (max 50 chars); `department_id` is required and must reference an existing department
- [ ] `displayPermissionLevel` and `postingPermissionLevel` must each be one of `staff`, `public`, `anonymous`
- [ ] `notificationReplyEmail` must be valid email format if provided
- [ ] `autoCloseSubstatus_id` must reference a sub-status with `status = 'closed'` if provided
- [ ] `customFields` must be valid JSON if provided; returns HTTP 400 if malformed
- [ ] `categories.lastModified` is updated on every update operation
- [ ] Can create a fully valid category (with custom fields, SLA, permissions) in under 10 minutes without developer involvement

**Priority:** P1 | **Feature Ref:** F10

---

### US-10.2: Delete a Service Category
**As a** Department Supervisor, **I want to** deactivate or delete a service category that is no longer offered, **so that** citizens and staff do not see obsolete service options.

**Acceptance Criteria:**
- [ ] Staff-only action; returns HTTP 403 for non-staff callers
- [ ] A category with existing tickets cannot be deleted; returns HTTP 409 with `"Cannot delete category with existing tickets"`
- [ ] `active = false` can be set to hide the category from public lists without deletion
- [ ] A CategoryGroup with referenced categories cannot be deleted (FK constraint enforced)

**Priority:** P1 | **Feature Ref:** F10

---

### US-10.3: Manage Category Groups
**As a** Department Supervisor, **I want to** create and edit category groups (e.g., "Streets", "Sanitation"), **so that** service categories are organized logically for both staff and citizens.

**Acceptance Criteria:**
- [ ] `name` is required (max 50 chars) and non-empty
- [ ] `ordering` (if provided) must be a non-negative integer
- [ ] Deleting a CategoryGroup that has referenced categories is blocked by FK constraint
- [ ] Groups appear in the correct display order based on `ordering`

**Priority:** P1 | **Feature Ref:** F10

---

### US-10.4: Manage Departments
**As a** Department Supervisor, **I want to** create, edit, and delete city departments, **so that** the CRM routing reflects the current organizational structure.

**Acceptance Criteria:**
- [ ] `name` is required (max 128 chars), must be unique and non-empty
- [ ] `defaultPerson_id` must reference an existing person if provided
- [ ] Deleting a department that has referenced categories or people is blocked
- [ ] Staff-only access; returns HTTP 403 for non-staff

**Priority:** P1 | **Feature Ref:** F10

---

### US-10.5: Manage Department-Category Associations
**As a** Department Supervisor, **I want to** associate additional departments with a service category, **so that** tickets in that category appear in multiple departments' queues.

**Acceptance Criteria:**
- [ ] `POST /departments/:deptId/categories` adds a `department_categories` association
- [ ] `DELETE /departments/:deptId/categories/:categoryId` removes an association
- [ ] `GET /departments/:deptId/categories` lists current associations
- [ ] Duplicate associations are rejected (PK constraint)
- [ ] Staff-only access

**Priority:** P1 | **Feature Ref:** F10

---

### US-10.6: Configure Per-Category Email Template Overrides
**As a** Department Supervisor, **I want to** set custom email templates and reply addresses for specific category-action combinations, **so that** notifications from my department use the correct branding and routing.

**Acceptance Criteria:**
- [ ] `POST /categories/:categoryId/actions/:actionId/response` creates or updates a `category_action_responses` record (upsert)
- [ ] `DELETE /categories/:categoryId/actions/:actionId/response` removes the override
- [ ] `GET /categories/:categoryId/actions/:actionId/response` retrieves the current override
- [ ] When an override exists, its `template` takes precedence over `actions.template` in email sends (F7)
- [ ] `replyEmail` in override takes precedence over `actions.replyEmail` if `categories.notificationReplyEmail` is not set

**Priority:** P1 | **Feature Ref:** F10

---
