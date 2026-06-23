## Screen 13: User Profile / Account (SCR-14)

**Purpose:** Allow authenticated users to view and edit their own profile information.
**User Stories:** US-4.5, US-2.2
**Personas:** PER-02
**Feature Refs:** F4, F2

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Global Nav — Authenticated]                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  My Profile                                                 │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌──────────────────────────────┐  ┌───────────────────┐  │
│  │ PERSONAL DETAILS             │  │ CONTACT INFO      │  │
│  │                              │  │                   │  │
│  │ First Name                   │  │ Email Addresses   │  │
│  │ [Priya                    ]  │  │ ─────────────     │  │
│  │ Last Name                    │  │ priya@example.com │  │
│  │ [Nair                     ]  │  │ (Home, notif ✉️)  │  │
│  │ Organization                 │  │ [Edit] [Delete]   │  │
│  │ [                         ]  │  │ [+ Add Email]     │  │
│  │                              │  │                   │  │
│  │ Address                      │  │ Phone Numbers     │  │
│  │ [                         ]  │  │ (none)            │  │
│  │ City                         │  │ [+ Add Phone]     │  │
│  │ [                         ]  │  │                   │  │
│  │ State                        │  └───────────────────┘  │
│  │ [  ]  Zip [          ]       │                          │
│  │                              │                          │
│  │ ─────────────────────────── │                          │
│  │ Username: priya.nair         │                          │
│  │ (Set by city sign-in — read-│                          │
│  │  only)                       │                          │
│  │ Role: Resident               │                          │
│  │ (Read-only)                  │                          │
│  │                              │                          │
│  │ [Cancel]        [Save]       │                          │
│  └──────────────────────────────┘                          │
│                                                             │
│  Sign Out                                                   │
│  [Sign Out of uReport]                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Edit Restrictions

The following fields are **read-only** for all users (per US-4.5):
- `username` — set by OIDC `sub` claim; displayed as read-only with explanation
- `role` — controlled by staff admin; displayed as read-only

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Name fields (editable) | Top of left column |
| Primary | Save button | Bottom of form |
| Secondary | Email addresses (editable) | Right column |
| Secondary | Phone numbers (editable) | Right column |
| Tertiary | Username + role (read-only) | Bottom of left column |
| Tertiary | Sign Out link | Below form |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Loading profile | Skeleton form fields | — |
| Form dirty (unsaved changes) | "Save" button enabled; "Cancel" clears changes | — |
| Saving | Spinner on Save button; form locked | "Saving…" |
| Save success | Toast: "Profile updated." | — |
| Save error | Inline field-level errors | — |
| Unauthenticated access | HTTP 401 redirect to login | — |
| Adding email | Inline form appears below email list | — |
| Email saved | New email appears in list; inline form closes | — |
| Duplicate email | Inline error: "This email address is already in your profile." | — |
