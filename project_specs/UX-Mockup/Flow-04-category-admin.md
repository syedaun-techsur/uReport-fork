## Flow 04: Category Creation with Custom Fields (FLW-05)

**Trigger:** Department Supervisor navigates to Admin → Categories → New Category.
**User Stories:** US-10.1, US-10.2, US-10.3, US-10.6, US-2.4
**Personas:** PER-04 (Robert Osei — Department Supervisor)
**Journey Reference:** JRN-04.1

```
[Admin Navigation — "Categories" in Admin menu]
    │
    ▼
[Category List — SCR-09]
    │  Table: name, department, active, permission levels, SLA days
    │
    ▼
["New Category" button]
    │
    ▼
[Category Form — Step 1: Core Fields]
    │  Name, description, category group, department, active toggle
    │
    ▼
[Category Form — Step 2: Permissions & SLA]
    │  "Who can view?" / "Who can submit?" (plain-language labels)
    │  SLA days, notification reply email
    │
    ▼
[Category Form — Step 3: Custom Fields]
    │  Form builder UI (add field, set type, label, required flag)
    │  Live preview panel updates as fields are added
    │
    ▼
[Save Category]
    │  Server-side validation
    │
    ├── Validation errors ──▶ [Inline field-level errors; stay on form]
    │
    └── Save success ──▶ [Green banner: "Category 'X' is now live."]
                              │
                              ▼
                         [Category Detail / Edit view]
                         ["Preview as Citizen" button → modal preview]
```

### Sub-Flow: Edit Existing Category

```
[Category List] → [Click category name] → [Category Edit Form]
    │  Same form as creation; all fields pre-populated
    │
    ▼
[Save] ──▶ [categories.lastModified updated] ──▶ [Success banner]
```

### Sub-Flow: Deactivate Category

```
[Category Edit Form] → [Toggle "Active" to off] → [Save]
    │  Category hidden from public lists; existing tickets unaffected
    │
    └── Category with tickets ──▶ Allowed (deactivate; cannot delete)
    └── Category without tickets ──▶ Delete button available
```

### Steps

1. **Navigate to Admin** — "Admin" top-level nav item visible only to `role = 'staff'`. Breadcrumb: `Admin > Categories`. Category list shows: name, department, active status (toggle), permission level summary, SLA days.

2. **Core Fields** — Required: name (max 50 chars, character count shown), department (dropdown of existing departments). Optional: description, category group dropdown, `active` toggle (default true), `featured` toggle.

3. **Permissions & SLA** — Permission dropdowns labeled in plain English:
   - "Who can view this category?" → "Everyone (public)" / "Signed-in residents" / "Staff only"
   - "Who can submit reports?" → Same options
   - SLA days: numeric input with helper "Leave blank for no SLA target."
   - Notification reply email: text input with RFC 5322 format validation.
   - Tooltip links to RBAC documentation for each permission field.

4. **Custom Field Builder** — Add Custom Field button opens an inline field editor:
   - Field label (plain text)
   - Field type: Text / Number / Date / Dropdown (single) / Dropdown (multi)
   - Placeholder / helper text
   - Required / Optional toggle
   - For dropdown types: add/remove option values
   - Live preview panel on the right shows exactly how the field will appear on the citizen submission form.

5. **Save & Validate** — All required fields validated before save. Field-level inline error messages (not a single top-level banner). On success: green banner "Category '[name]' is now live. Citizens can submit reports immediately." Category immediately available in `GET /open311/v2/services`.

6. **Preview as Citizen** — "Preview as citizen" button opens a modal showing the full submission form as a citizen would see it, with all custom fields rendered. No test ticket is created. Read-only preview.

### States

| State | UI Treatment |
|-------|-------------|
| Category list loading | Skeleton table (5 rows) |
| Empty category list | "No categories yet. [Create First Category]" |
| Form saving | Submit button spinner; form fields disabled |
| Validation error | Red inline messages per field; focus jumps to first error |
| Save success | Green top-of-page banner; form remains for further edits |
| Delete blocked (has tickets) | Error toast: "Cannot delete a category with existing tickets. You can deactivate it instead." |
| Custom field preview | Live right-side panel updates on every field change |
| Unsaved changes navigation | Browser-standard "Leave page? Changes may not be saved." dialog |
