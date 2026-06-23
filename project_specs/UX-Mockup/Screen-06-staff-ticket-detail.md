## Screen 06: Staff Ticket Detail (SCR-07)

**Purpose:** Full ticket detail view for staff — showing all fields, assignee controls, action panel, history timeline, attachments, and duplicate search.
**User Stories:** US-1.3–1.10, US-2.3, US-5.1, US-5.3, US-8.1–8.4
**Personas:** PER-03, PER-04
**Feature Refs:** F1, F2, F5, F8, F15

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Staff Global Nav]                                          │
├─────────────────────────────────────────────────────────────┤
│ Tickets > #84712                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  #84712 — Pothole / Pavement Damage        🟢 Open  ⚠️12d │
│                                                             │
│  ┌───────────────────────┐  ┌───────────────────────────┐  │
│  │ TICKET DETAILS        │  │ ACTIONS PANEL             │  │
│  │ ─────────────────── ─ │  │ ──────────────────────── ─│  │
│  │ Category:   Pothole   │  │ Assign To:                │  │
│  │ Department: Pub Works │  │ [Dana Kowalski ▾]  [Save] │  │
│  │ Issue Type: Report    │  │                           │  │
│  │ Contact:    Web Form  │  │ Status:  🟢 Open          │  │
│  │ Submitted:  Jun 21    │  │ [Close Ticket]            │  │
│  │ Reporter:   [PII]     │  │ [Re-open] (if closed)     │  │
│  │                       │  │                           │  │
│  │ Location:   Main & Oak│  │ [Mark as Duplicate]       │  │
│  │ [Mini map]            │  │                           │  │
│  │                       │  │ SUB-STATUS                │  │
│  │ Description:          │  │ — (not closed)            │  │
│  │ Large pothole on the  │  │                           │  │
│  │ corner of Main & Oak, │  │ SLA: ⚠️ 12 days elapsed  │  │
│  │ approximately 30cm... │  │ Target: 5 days            │  │
│  │ [Edit description]    │  │                           │  │
│  │                       │  └───────────────────────────┘  │
│  │ Custom Fields:        │                                  │
│  │ (none for this cat.)  │  ┌───────────────────────────┐  │
│  │                       │  │ REPORTER (PII — Staff)    │  │
│  │ Attachments:          │  │ ──────────────────────── ─│  │
│  │ [📷 pothole.jpg] [✕]  │  │ Marcus Webb               │  │
│  │ [+ Add Attachment]    │  │ marcus@email.com           │  │
│  └───────────────────────┘  │ (Web Form)                │  │
│                              └───────────────────────────┘  │
│                                                             │
│  ─────── POSSIBLE DUPLICATES ───────────────────────────── │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ We found similar tickets:                            │  │
│  │ #84698 — Drainage — Elm & 3rd — Jun 20 — Open        │  │
│  │ [Link as duplicate]  [Not a duplicate]               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ─────── ADD TO TICKET ──────────────────────────────────  │
│                                                             │
│  🔒 Staff Comment (internal — not sent to reporter)         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  [Add Comment]                                              │
│                                                             │
│  ✉️ Reply to Reporter (sends email notification)            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  [Send Reply]                                               │
│                                                             │
│  ─────── SEARCH FOR DUPLICATE ──────────────────────────── │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔍 Search tickets...    [Category ▾]   [Search]     │  │
│  │ ─────────────────────────────────────────────────── │  │
│  │ [Results appear here inline]                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ─────── TICKET HISTORY ────────────────────────────────── │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Jun 21, 2026 10:23 AM · Submitted                    │  │
│  │   Entered by: Marcus Webb (Web Form)                 │  │
│  │                                                      │  │
│  │ Jun 23, 2026 2:14 PM · Assigned                      │  │
│  │   Assigned to: Dana Kowalski                         │  │
│  │   ✉️ Email notification sent to reporter + assignee  │  │
│  │                                                      │  │
│  │ 🔒 Jun 23, 2026 3:02 PM · Staff Comment              │  │
│  │   "Crew inspected — material ordered, repair Fri"    │  │
│  │   By: Dana Kowalski                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [Export ticket history: JSON | XML | CSV | TXT]            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Ticket ID, status, SLA badge | Page header |
| Primary | Actions panel (assign, close) | Right column, sticky |
| Primary | Description | Left column |
| Secondary | Reporter info (PII — staff only) | Right column below actions |
| Secondary | Possible duplicates panel | Below details, above comment area |
| Secondary | Staff comment + reply fields | Middle section |
| Secondary | History timeline | Bottom section |
| Tertiary | Export links | Below history |
| Tertiary | Custom fields | Below description if present |

### Close Ticket Modal

When "Close Ticket" is clicked:
```
┌──────────────────────────────────────────────┐
│ Close Ticket #84712                          │
│ ─────────────────────────────────────────── │
│ Sub-status (required):                       │
│ ○ Resolved  ○ Duplicate  ○ Bogus            │
│                                              │
│ Close notes (optional):                      │
│ ┌────────────────────────────────────────┐  │
│ │ Pothole filled 2026-06-21 by crew...  │  │
│ └────────────────────────────────────────┘  │
│                                              │
│ ✉️ This will send an email notification to:  │
│    marcus@email.com                          │
│                                              │
│ [Cancel]              [Close Ticket]         │
└──────────────────────────────────────────────┘
```

### Comment vs Reply Visual Distinction

| Element | Visual Style |
|---------|-------------|
| Staff Comment area | Light blue background (`#eff6ff`); 🔒 lock icon in label; label text: "Staff Comment (internal — not sent to reporter)" |
| Reply to Reporter area | White background with blue left border; ✉️ email icon in label; label text: "Reply to Reporter (sends email notification to [email])" |

### History Entry Types

| Action | Visual Indicator |
|--------|-----------------|
| open (submitted) | Plain timestamp entry |
| assignment | Person name shown |
| update | Change summary shown |
| changeCategory | "Category changed from X to Y" |
| changeLocation | "Location changed" |
| comment | 🔒 lock icon prefix; staff-only visibility |
| response | ✉️ icon prefix |
| closed | Red badge; sub-status shown |
| duplicate | Links to parent/child ticket |
| upload_media | 📎 paperclip icon; filename shown |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Loading | Skeleton layout | — |
| Ticket not found | 404 with "Return to Queue" | — |
| Saving assignment | Spinner in assignee row | "Saving…" |
| Assignment saved | Toast: "Ticket assigned to [Name]" | — |
| Comment saving | Textarea disabled; spinner | — |
| Comment saved | Toast: "Comment added." | — |
| Reply sending | Textarea disabled; spinner | "Sending reply…" |
| Reply sent | Toast: "Reply sent to [email]." | — |
| Close modal open | Modal overlay | Full close form |
| Close in progress | Modal spinner | — |
| Ticket closed | Status badge → 🔴 Closed; close button → Re-open | Toast: "Ticket #84712 closed." |
| Media uploading | Progress bar in attachments section | — |
| Media upload error | Inline error in attachment area | "Upload failed: [reason]" |
