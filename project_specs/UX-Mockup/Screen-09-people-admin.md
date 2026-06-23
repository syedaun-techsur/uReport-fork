## Screen 09: Department / People Admin (SCR-10)

**Purpose:** Staff management of person records, departments, role assignments, and contact details.
**User Stories:** US-11.1, US-11.2, US-11.3, US-11.4, US-11.5
**Personas:** PER-04
**Feature Refs:** F11, F2, F4

### Layout — Staff Users List

```
┌─────────────────────────────────────────────────────────────┐
│ [Staff Global Nav — Admin highlighted]                      │
├─────────────────────────────────────────────────────────────┤
│ Admin > People                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Staff Users                    [+ New Person]  [People ▾] │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔍 Search people by name, email, or username...      │  │
│  └──────────────────────────────────────────────────────┘  │
│  Filter: [Role: Staff ▾]   [Department: All ▾]             │
│                                                             │
│  Name              Dept           Role    Username          │
│  ─────────────────────────────────────────────────────────  │
│  Dana Kowalski     Public Works   Staff   dkowalski         │
│  Robert Osei       Sanitation     Staff   rosei             │
│  [+ 8 more rows]                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Layout — Person Detail / Edit Form

```
┌─────────────────────────────────────────────────────────────┐
│ Admin > People > Dana Kowalski                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────┐  ┌───────────────────┐  │
│  │ PERSONAL DETAILS             │  │ CONTACT DETAILS   │  │
│  │                              │  │                   │  │
│  │ First Name *                 │  │ Email Addresses   │  │
│  │ [Dana                     ]  │  │ ─────────────     │  │
│  │ Middle Name                  │  │ Work (notif) ✉️   │  │
│  │ [                         ]  │  │ dana@city.gov     │  │
│  │ Last Name *                  │  │ [Edit] [Delete]   │  │
│  │ [Kowalski                 ]  │  │ [+ Add Email]     │  │
│  │ Organization                 │  │                   │  │
│  │ [City of Anytown          ]  │  │ Phone Numbers     │  │
│  │                              │  │ ─────────────     │  │
│  │ Role                         │  │ Work              │  │
│  │ [Staff ▾]  (staff / public)  │  │ 555-0100          │  │
│  │                              │  │ [+ Add Phone]     │  │
│  │ Department                   │  │                   │  │
│  │ [Public Works ▾]             │  │ Addresses         │  │
│  │                              │  │ ─────────────     │  │
│  │ Username                     │  │ (none)            │  │
│  │ [dkowalski        ] (read-   │  │ [+ Add Address]   │  │
│  │  only if OIDC provisioned)   │  └───────────────────┘  │
│  │                              │                          │
│  │ [Cancel]        [Save]       │                          │
│  └──────────────────────────────┘                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Person Search

```
┌──────────────────────────────────────────────────────────────┐
│ 🔍 Search people...                                          │
│ ─────────────────────────────────────────────────────────── │
│ (Type at least 2 characters)                                │
│ ─────────────────────────────────────────────────────────── │
│ Results for "dana":                                          │
│ Dana Kowalski — Public Works — Staff — dkowalski@city.gov   │
│ Dana Brown — Citizen — (no role) — dana.brown@gmail.com     │
└──────────────────────────────────────────────────────────────┘
```

### Email Address Row — Inline Edit

Each email entry shows:
- Email address
- Label badge (Home / Work / Other)
- Notification indicator: ✉️ if `usedForNotifications = true`
- Edit link (expands inline)
- Delete button (with confirmation)

Adding a new email shows an inline form:
```
┌───────────────────────────────────────────────────────────┐
│ Add Email                                                 │
│ Email *:  [dana@city.gov                               ]  │
│ Label:    [Work ▾]  (Home / Work / Other)                 │
│ Use for notifications: [✓]                                │
│ [Cancel]  [Add]                                           │
└───────────────────────────────────────────────────────────┘
```

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Person list loading | Skeleton rows | — |
| Search (< 2 chars) | Dropdown not shown | "Type at least 2 characters to search." |
| Search results | Inline dropdown | Up to 10 results |
| No search results | "No people found for '[query]'." | — |
| Save success | Toast: "Person record updated." | — |
| Username conflict (409) | Inline error: "Username already taken." | — |
| Delete blocked (409) | Toast error: "Cannot delete: this person has associated tickets or bookmarks." | — |
| Duplicate email (409) | Inline: "This email address already exists for this person." | — |
| Invalid email format | Inline: "Please enter a valid email address." | — |
| OIDC-provisioned username | Username field is read-only; tooltip: "Username set by city sign-in service." | — |
