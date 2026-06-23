## Screen 04: Personal Ticket History Dashboard (SCR-05)

**Purpose:** Show an authenticated resident all their submitted tickets, filterable by status.
**User Stories:** US-1.2, US-2.2, US-4.5, US-12.4
**Personas:** PER-02
**Feature Refs:** F1, F2, F4, F12

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo]  My Tickets  Report an Issue  Bookmarks | [Name ▾]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  My Service Requests                                        │
│  Hello, Priya — You have 4 open requests.                   │
│                                                             │
│  ┌─────────────────────────────┐  ┌────────────────────┐  │
│  │ TICKET LIST                 │  │ SAVED SEARCHES     │  │
│  │ ─────────────────────────── │  │ ─────────────────  │  │
│  │ Filters:                    │  │ 🔖 Elm St Potholes │  │
│  │ [All ▾] [Status ▾] [Sort ▾]│  │ 🔖 Streetlight...  │  │
│  │                             │  │ 🔖 Graffiti...     │  │
│  │ ┌─────────────────────────┐ │  │ [View all →]       │  │
│  │ │ #84721 Pothole/Pavement │ │  └────────────────────┘  │
│  │ │ 🟢 Open   Jun 21, 2026  │ │                           │
│  │ │ Last updated Jun 23     │ │  ACCOUNT                  │
│  │ └─────────────────────────┘ │  ─────────────────        │
│  │ ┌─────────────────────────┐ │  Priya Nair               │
│  │ │ #81409 Streetlight Out  │ │  priya@example.com        │
│  │ │ 🟢 Open   Jun 10, 2026  │ │  [Edit Profile]           │
│  │ │ Assigned to Dana K.     │ │                           │
│  │ └─────────────────────────┘ │                           │
│  │ ┌─────────────────────────┐ │                           │
│  │ │ #79003 Graffiti - Park  │ │                           │
│  │ │ 🔴 Closed  May 15, 2026 │ │                           │
│  │ │ Resolved                │ │                           │
│  │ └─────────────────────────┘ │                           │
│  │                             │                           │
│  │ [Show 10 more...]           │                           │
│  └─────────────────────────────┘                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [Footer]                                                    │
└─────────────────────────────────────────────────────────────┘
```

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | "You have X open requests" count | Page subtitle, always visible |
| Primary | Ticket list (most recent first) | Main content column |
| Primary | Status badge (open/closed) | Per ticket row, immediately visible |
| Secondary | Status filter tabs / dropdown | Above ticket list |
| Secondary | Saved searches panel | Right sidebar |
| Secondary | Account info | Right sidebar |
| Tertiary | "Show more" pagination | Below list |

### Ticket Row Elements

Each row in the list shows:
- Ticket ID (monospace, linked to detail view)
- Category name
- Status badge (🟢 Open / 🔴 Closed + sub-status)
- Submitted date
- Last modified date
- If assigned: "Assigned to [first name last initial]." (no PII exposure to other users)
- If closed: sub-status label (Resolved / Duplicate / Bogus)

### Filter Controls

| Filter | Options | Behavior |
|--------|---------|----------|
| Status | All / Open / Closed | Instant filter; URL param updated |
| Sort | Date Submitted ↓ / Date Submitted ↑ / Last Updated ↓ | Instant sort |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Loading | Skeleton rows (3 rows, shimmer) | — |
| Empty (no tickets) | "You haven't submitted any reports yet." with CTA "Report an Issue" | Empty state illustration |
| Empty (filtered) | "No [status] requests found." with "Show all" link | — |
| Notification match | If arriving from email notification link: ticket that matches is highlighted with blue border | "This is the ticket from your recent email notification." |
| Load more | "Show 10 more…" link at bottom | Append more rows; no full page reload |
