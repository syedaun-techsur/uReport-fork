## Screen 08: Category Admin — CRUD + Custom Field Builder (SCR-09)

**Purpose:** Allow department supervisors to create, edit, and deactivate service categories with custom fields, SLA targets, and permission levels.
**User Stories:** US-10.1, US-10.2, US-10.3, US-10.4, US-10.5, US-10.6, US-2.4
**Personas:** PER-04
**Feature Refs:** F10, F2, F7

### Layout — Category List

```
┌─────────────────────────────────────────────────────────────┐
│ [Staff Global Nav — Admin highlighted]                      │
├─────────────────────────────────────────────────────────────┤
│ Admin > Categories                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Service Categories                    [+ New Category]     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Name          Dept        Active  View     Post  SLA  │  │
│  │ ─────────────────────────────────────────────────── │  │
│  │ Pothole       Pub Works   ●       Anon     Anon   5d  │  │
│  │ Streetlight   Pub Works   ●       Public   Public 3d  │  │
│  │ Graffiti      Sanitation  ●       Anon     Public 7d  │  │
│  │ [Old Service] Pub Works   ○       Staff    Staff  —   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [Category Groups: Manage Groups]   [Departments: Manage]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Layout — Category Edit Form

```
┌─────────────────────────────────────────────────────────────┐
│ Admin > Categories > Edit "Pothole / Pavement Damage"       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────┐  ┌───────────────────┐  │
│  │ CORE DETAILS                 │  │ LIVE PREVIEW      │  │
│  │                              │  │ ────────────────── │  │
│  │ Name *                       │  │ How citizens see  │  │
│  │ ┌──────────────────────────┐ │  │ this category:    │  │
│  │ │ Pothole / Pavement Damage│ │  │                   │  │
│  │ └──────────────────────────┘ │  │ ┌───────────────┐ │  │
│  │ 26 / 50 characters           │  │ │ 🛣️ Pothole /  │ │  │
│  │                              │  │ │ Pavement...   │ │  │
│  │ Description                  │  │ │ Report a...   │ │  │
│  │ ┌──────────────────────────┐ │  │ └───────────────┘ │  │
│  │ │ Report a pavement issue… │ │  │                   │  │
│  │ └──────────────────────────┘ │  │ Custom Fields:    │  │
│  │                              │  │ (none added yet)  │  │
│  │ Category Group               │  │                   │  │
│  │ [Roads & Sidewalks ▾]        │  │ [Preview as      │  │
│  │                              │  │  citizen →]       │  │
│  │ Department *                 │  └───────────────────┘  │
│  │ [Public Works ▾]             │                          │
│  │                              │                          │
│  │ Active   [● Toggle ON]       │                          │
│  │ Featured [○ Toggle OFF]      │                          │
│  │ ─────────────────────────── │                          │
│  │                              │                          │
│  │ PERMISSIONS & SLA            │                          │
│  │ ─────────────────────────── │                          │
│  │                              │                          │
│  │ Who can VIEW this category?  │                          │
│  │ [Everyone (public) ▾] ⓘ     │                          │
│  │                              │                          │
│  │ Who can SUBMIT reports?      │                          │
│  │ [Everyone (public) ▾] ⓘ     │                          │
│  │                              │                          │
│  │ SLA Target (business days)   │                          │
│  │ [5        ]  (leave blank    │                          │
│  │               for no target) │                          │
│  │                              │                          │
│  │ Notification Reply Email     │                          │
│  │ [pubworks@city.gov        ]  │                          │
│  │                              │                          │
│  │ ─────────────────────────── │                          │
│  │                              │                          │
│  │ CUSTOM FIELDS                │                          │
│  │ ─────────────────────────── │                          │
│  │                              │                          │
│  │ [+ Add Custom Field]         │                          │
│  │                              │                          │
│  │ No custom fields defined     │                          │
│  │                              │                          │
│  │ ─────────────────────────── │                          │
│  │ [Cancel]        [Save]       │                          │
│  └──────────────────────────────┘                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Custom Field Builder — Inline Editor

Clicking "+ Add Custom Field" expands an inline editor:
```
┌──────────────────────────────────────────────────────────────┐
│ New Custom Field                                             │
│ ─────────────────────────────────────────────────────────── │
│ Label *: [Estimated volume (e.g., 3 bags, 1 truckload)    ] │
│ Type *:  [Text ▾]  (Text / Number / Date / Dropdown)        │
│ Placeholder: [Optional helper text for citizen            ]  │
│ Required: ○ Yes  ● No                                       │
│ ─────────────────────────────────────────────────────────── │
│ [Cancel]  [Add Field]                                        │
└──────────────────────────────────────────────────────────────┘
```

For Dropdown type, an additional section appears:
```
│ Options:                                                     │
│ ┌──────────────────────────────────────────┐  [+ Add]       │
│ │ Option 1: Small (1–5 bags)               │  [✕]           │
│ │ Option 2: Medium (5–20 bags)             │  [✕]           │
│ └──────────────────────────────────────────┘                │
```

### Permission Level Labels (Plain English)

| Internal value | Plain English label |
|---------------|---------------------|
| `anonymous` | Everyone (including visitors without an account) |
| `public` | Signed-in residents only |
| `staff` | City staff only (not visible to citizens) |

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Name + department (required fields) | Top of form |
| Primary | Save button | Bottom of left column + sticky footer on scroll |
| Primary | Active toggle | Core details section, visible |
| Secondary | Permissions & SLA | Middle section |
| Secondary | Custom field builder | Below permissions |
| Secondary | Live preview panel | Right column, updates in real-time |
| Tertiary | "Preview as citizen" button | Bottom of preview panel |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Form loading | Skeleton form fields | — |
| Name field error | Red border + "Name is required (max 50 characters)" | — |
| Department not selected | Red border + "Department is required" | — |
| Save in progress | Submit button spinner; form locked | "Saving…" |
| Save success | Green banner: "Category '[name]' saved. Changes are live." | — |
| Delete blocked | Toast error: "Cannot delete: this category has existing tickets. You can deactivate it instead." | — |
| Custom field added | Field appears in list + live preview updates | — |
| Custom field reorder | Drag handles on field rows | Visual drag feedback |
