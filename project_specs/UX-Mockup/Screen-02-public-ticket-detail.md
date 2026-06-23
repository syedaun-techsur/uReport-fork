## Screen 02: Public Ticket Status / Detail View (SCR-03)

**Purpose:** Allow anonymous and authenticated users to view the current status of a specific ticket. Available in HTML, JSON, XML, CSV, and TXT formats.
**User Stories:** US-0.5, US-1.10, US-2.1, US-2.5, US-3.1–3.5
**Personas:** PER-01, PER-02
**Feature Refs:** F0, F1, F2, F3

### Layout (HTML — Public View)

```
┌─────────────────────────────────────────────────────────────┐
│ [Global Nav — Anonymous or Authenticated]                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Service Request #84721                    🟢 Open          │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────┐  ┌────────────────────┐  │
│  │ Details                     │  │ Location           │  │
│  │ ─────────────────────────── │  │ ─────────────────  │  │
│  │ Category: Pothole / Pavement│  │ [Mini map]         │  │
│  │ Submitted: Jun 21, 2026     │  │                    │  │
│  │ Last Updated: Jun 23, 2026  │  │ 123 Main Street    │  │
│  │                             │  │ City, ST 12345     │  │
│  │ Description:                │  └────────────────────┘  │
│  │ Large pothole on corner     │                           │
│  │ of Main & Oak...            │  Format:                  │
│  │                             │  [HTML] [JSON] [XML]      │
│  │ Media:                      │  [CSV]  [TXT]             │
│  │ [📷 View photo]             │                           │
│  └─────────────────────────────┘                           │
│                                                             │
│  Ticket History                                             │
│  ─────────────────────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Jun 21, 2026 10:23 AM  — Submitted                   │  │
│  │ Jun 23, 2026 2:14 PM   — Assigned to case worker     │  │
│  │   Email notification sent ✉️                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [← Back to Results]                                        │
├─────────────────────────────────────────────────────────────┤
│ [Footer]                                                    │
└─────────────────────────────────────────────────────────────┘
```

### PII Masking Rules (Non-Staff View)

The following fields are **omitted** from public/anonymous views per US-2.5:
- Reporter name and contact details (`reportedByPerson_id`, email, phone)
- Case worker names in history entries (`enteredByPerson_id`, `actionPerson_id`)
- History entries of type `comment` (staff-only internal notes) are hidden entirely

### Format Switcher

The "Format" panel in the sidebar provides direct links to alternate format representations:
- `HTML` — current page (default for browser requests)
- `JSON` — `/open311/v2/requests/:id.json`
- `XML` — `/open311/v2/requests/:id.xml`
- `CSV` — `/tickets/:id.csv` (downloads file)
- `TXT` — `/tickets/:id.txt`

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Ticket ID + status badge | Page header |
| Primary | Category and submitted date | Details card |
| Primary | Description | Details card |
| Secondary | Location map | Right sidebar |
| Secondary | History timeline | Below details |
| Secondary | Format switcher | Right sidebar |
| Tertiary | "Back to results" link | Below content |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Default (open) | 🟢 Open badge | Normal view |
| Closed | 🔴 Closed badge + sub-status label (Resolved / Duplicate / Bogus) | Closure date shown |
| Duplicate of parent | Note: "This report was identified as a duplicate of #[parent_id]" | Link to parent ticket |
| No media | Photo section hidden | — |
| Media loading | Thumbnail placeholder | Spinner |
| 404 (ticket not visible) | "Service request not found" error page | Link to submit new request |
| Authenticated (own ticket) | Same as above + "Your Report" badge in header | — |
