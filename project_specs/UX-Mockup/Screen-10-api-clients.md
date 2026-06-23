## Screen 10: API Client Management (SCR-11)

**Purpose:** Allow supervisors to create, view, and revoke API client credentials for external Open311 integrators.
**User Stories:** US-11.6, US-0.3
**Personas:** PER-04
**Feature Refs:** F11, F0

### Layout — Client List

```
┌─────────────────────────────────────────────────────────────┐
│ [Staff Global Nav — Admin highlighted]                      │
├─────────────────────────────────────────────────────────────┤
│ Admin > API Clients                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  API Client Credentials              [+ New API Client]     │
│                                                             │
│  These credentials authorize third-party apps to submit    │
│  service requests via the Open311 API.                      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Name             URL                   Key           │  │
│  │ ─────────────────────────────────────────────────── │  │
│  │ City Mobile App  app.city.gov          ••••••abc123  │  │
│  │                                        [Edit][Delete] │  │
│  │ 311 Portal       portal.city.gov       ••••••xyz456  │  │
│  │                                        [Edit][Delete] │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Layout — New Client Form

```
┌─────────────────────────────────────────────────────────────┐
│ Admin > API Clients > New Client                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  New API Client                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Client Name *                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ City Mobile App                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Application URL                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ https://app.city.gov                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Contact Person *                                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔍 Search people by name...                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Contact Method                                             │
│  [Email ▾]                                                  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  API Key                                                    │
│  ┌─────────────────────────────────────────┐  [Regenerate] │
│  │ a7f3-9c21-4b8e-d012-abc8f7e31045...     │  [📋 Copy]    │
│  └─────────────────────────────────────────┘               │
│  ⚠️ Copy this key now — it will only be shown in full once. │
│                                                             │
│  [Cancel]                              [Save Client]        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | API key (full, copyable — new/regenerate only) | Center of form |
| Primary | One-time-show warning | Below key field |
| Primary | Save button | Bottom of form |
| Secondary | Client name + contact person | Upper form fields |
| Secondary | Copy button | Inline with key |
| Tertiary | URL and contact method | Middle fields |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| New client (key shown) | Full 50-char key in read-only input | ⚠️ "Copy this key now — it will only be shown once in full." |
| Existing client (key masked) | "••••••••••••••••••••••••••••••••••••••••••••••xxxx" | "Key is masked for security." |
| Key regenerated | New full key shown; one-time warning | Confirmation: "Old key is now invalid. Copy the new key." |
| Regenerate confirmation | Modal: "Regenerating will immediately invalidate the current key. Any apps using it will receive 403 errors." | [Confirm Regenerate] [Cancel] |
| Save in progress | Spinner on button | — |
| Duplicate key (409) | Inline: "This API key already exists. Click 'Regenerate' for a new one." | — |
| Delete confirmation | "Deleting this client will immediately invalidate the API key." | [Confirm Delete] [Cancel] |
| Delete blocked (409) | Toast error: "This client has associated tickets and cannot be deleted." | — |
| New key works immediately | Success message includes: "This key is immediately usable — no restart required." | — |
