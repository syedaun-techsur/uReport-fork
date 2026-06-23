---

## F02: Role-Based Access Control (RBAC)

**Description:** uReport enforces three permission levels on every route, category, and data field. The NestJS CASL guard layer must reproduce the Laminas ACL rule set exactly — with no privilege creep or regression — so that every allow/deny decision is identical to the legacy PHP system. This is a hard security requirement: failing to enforce these rules constitutes a bug.

**Terminology:**
- **Role:** The string stored in `people.role`; one of `null` (no role = public/citizen), `'staff'`
- **Permission level:** `'anonymous'`, `'public'`, or `'staff'` — used on `categories.displayPermissionLevel` and `categories.postingPermissionLevel`
- **CASL Ability:** A CASL `defineAbility` block that encodes what a role can do on each subject
- **Subject:** A CASL term for the resource type being protected (e.g., `'Ticket'`, `'Category'`, `'Person'`)
- **Guard:** A NestJS `@UseGuards()` decorator applied at controller or route level

**Sub-features:**
- Anonymous access rules (unauthenticated requests)
- Public access rules (authenticated citizens)
- Staff access rules (city employees)
- Category-level permission filter (display + posting)
- PII field masking for non-staff callers
- CASL ability definitions per role
- NestJS guard integration

---

### F02.1 Role Hierarchy

Roles are strictly ordered: `anonymous < public < staff`.

| Role | Authentication Required | `people.role` value |
|------|------------------------|---------------------|
| Anonymous | No | (no session) |
| Public | Yes (OIDC login) | `null` or absent |
| Staff | Yes (OIDC login) | `'staff'` |

A request with a valid session but `people.role = null` is treated as `public`.

---

### F02.2 Anonymous Access Rules

Anonymous callers (no session) may:
- `GET /open311/v2/services` — categories where `displayPermissionLevel = 'anonymous'`
- `GET /open311/v2/services/:id` — if `displayPermissionLevel = 'anonymous'`
- `GET /open311/v2/requests` — tickets in categories where `displayPermissionLevel = 'anonymous'`
- `GET /open311/v2/requests/:id` — if ticket's category has `displayPermissionLevel = 'anonymous'`
- `POST /open311/v2/requests` — to categories where `postingPermissionLevel = 'anonymous'`
- `GET /open311/v2/tokens/:token` — always allowed (token lookup)

Anonymous callers must **not**:
- See PII fields: `reportedByPerson_id`, `enteredByPerson_id`, `assignedPerson_id`, personal contact details
- Access any admin endpoints (categories, departments, people, actions, etc.)
- Upload media attachments
- Create bookmarks

---

### F02.3 Public Access Rules

Authenticated citizens (valid OIDC session, `role = null`) may do everything anonymous callers may, plus:
- View tickets/categories where `displayPermissionLevel IN ('public', 'anonymous')`
- Submit tickets to categories where `postingPermissionLevel IN ('public', 'anonymous')`
- View their own ticket history (tickets where `reportedByPerson_id = currentUser.id`)
- Manage their own bookmarks (`bookmarks` where `person_id = currentUser.id`)
- View and edit their own `people` record

Public callers must **not**:
- See other users' PII
- Access staff-only admin endpoints
- Assign, close, comment, or add responses to tickets

---

### F02.4 Staff Access Rules

Authenticated staff (`role = 'staff'`) may do everything public callers may, plus:
- View all tickets and categories regardless of `displayPermissionLevel`
- View all PII fields on tickets and people records
- Create/update/close/assign/duplicate/comment/respond on any ticket
- Manage categories, category groups, departments, department associations
- Manage people records (all users)
- Manage API clients
- Manage actions, sub-statuses, issue types, contact methods
- View and export reports and metrics
- Manage all bookmarks (their own; not others')

---

### F02.5 Category Permission Filtering

**Display filter (applied on all list/detail reads):**
- Anonymous: `WHERE categories.displayPermissionLevel = 'anonymous'`
- Public: `WHERE categories.displayPermissionLevel IN ('public', 'anonymous')`
- Staff: no filter (all categories visible)

**Posting filter (applied on ticket create):**
- Anonymous: `WHERE categories.postingPermissionLevel = 'anonymous'`
- Public: `WHERE categories.postingPermissionLevel IN ('public', 'anonymous')`
- Staff: no filter (can create ticket in any category)

The same filter applies transitively to tickets: a ticket is only visible if its category is visible to the caller's role.

---

### F02.6 CASL Ability Definitions

The NestJS module `AbilityFactory` must produce the following ability rules per role:

**Anonymous ability:**
```typescript
can('read', 'Category', { displayPermissionLevel: { $in: ['anonymous'] } })
can('read', 'Ticket', { category: { displayPermissionLevel: { $in: ['anonymous'] } } })
can('create', 'Ticket', { category: { postingPermissionLevel: 'anonymous' } })
can('read', 'Token')
```

**Public ability (extends anonymous):**
```typescript
can('read', 'Category', { displayPermissionLevel: { $in: ['anonymous', 'public'] } })
can('read', 'Ticket', { category: { displayPermissionLevel: { $in: ['anonymous', 'public'] } } })
can('create', 'Ticket', { category: { postingPermissionLevel: { $in: ['anonymous', 'public'] } } })
can('manage', 'Bookmark', { person_id: currentUser.id })
can('read', 'Person', { id: currentUser.id })
can('update', 'Person', { id: currentUser.id })
```

**Staff ability:**
```typescript
can('manage', 'all')
```

---

### F02.7 NestJS Guard Integration

- `CaslGuard` is a NestJS guard (`@Injectable() implements CanActivate`) that:
  1. Resolves the authenticated user from the session (or marks as anonymous).
  2. Calls `AbilityFactory.createForUser(user)` to get the CASL `Ability` instance.
  3. Reads the required permission from route metadata (via `@CheckAbilities()` decorator).
  4. Returns `true` if `ability.can(action, subject)` is true; otherwise throws `ForbiddenException`.
- All controller methods are decorated with `@UseGuards(CaslGuard)` and `@CheckAbilities({action, subject})`.
- Permission-level filtering (category visibility) is applied in the service layer, not the guard — the guard only enforces route-level access.

---

### F02.8 PII Masking

For non-staff callers, the serialization layer (see F03) must omit or null-out the following fields:
- `tickets.reportedByPerson_id` and associated person object
- `tickets.enteredByPerson_id` and associated person object
- `ticketHistory.enteredByPerson_id`
- `ticketHistory.actionPerson_id`
- Any `people` record's contact details (email, phone, address) except when viewing own record

---

**API Surface (this feature):** RBAC is enforced on all endpoints; no dedicated RBAC endpoints exist. See `Y1-api.md` for per-endpoint permission annotations.

**Schema Surface (this feature):** uses `people.role`, `categories.displayPermissionLevel`, `categories.postingPermissionLevel` — see `Y0-schema.md`.
