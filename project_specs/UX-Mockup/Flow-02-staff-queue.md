## Flow 02: Staff Daily Queue — Assign, Comment, Close (FLW-03)

**Trigger:** Case worker logs in (or session resumes) and navigates to the ticket queue.
**User Stories:** US-1.3, US-1.4, US-1.5, US-1.7, US-1.8, US-1.10
**Personas:** PER-03 (Dana Kowalski — Case Worker)
**Journey Reference:** JRN-03.1

```
[Staff Login / Session Resume]
    │
    ▼
[Staff Ticket Queue — SCR-06]
    │  Filter: dept=Public Works, status=open, sort=SLA elapsed DESC
    │
    ▼
[Ticket Row — Click to open]
    │
    ▼
[Staff Ticket Detail — SCR-07]
    │
    ├─── [Assign Action]
    │        │  Select assignee from department-filtered dropdown
    │        ▼
    │    [ticketHistory: assignment] + [Email to assignee + reporter]
    │
    ├─── [Staff Comment]
    │        │  Lock icon: "Staff Comment (internal — not sent to reporter)"
    │        ▼
    │    [ticketHistory: comment] — NOT sent to reporter
    │
    ├─── [Reply to Reporter]
    │        │  Email icon: "Reply to Reporter (sends email notification)"
    │        ▼
    │    [ticketHistory: response] + [Email to reporter]
    │
    ├─── [Update Fields]
    │        │  Edit description, category, location
    │        ▼
    │    [ticketHistory: update / changeCategory / changeLocation]
    │
    └─── [Close Ticket]
             │  Select sub-status (Resolved / Duplicate / Bogus)
             │  Enter close notes
             ▼
         [Confirmation dialog: "This will close the ticket and send email to [reporter email]"]
             │
             ├── Confirm ──▶ [ticketHistory: closed] + [Email] + [Return to queue]
             └── Cancel  ──▶ [Stay on ticket detail]
```

### Sub-Flow: Bulk Close / Export

```
[Staff Ticket Queue — SCR-06]
    │  Select checkboxes on multiple tickets
    │
    ▼
[Bulk Action Bar appears: "X tickets selected"]
    │
    ├── [Export to CSV] ──▶ Download file
    └── [Bulk assign]   ──▶ Assignee picker modal ──▶ Apply to all selected
```

### Steps

1. **Arrive at Queue** — Queue defaults to: department = current user's department, status = open, sort = entered date DESC. SLA elapsed column visible. Overdue items (SLA exceeded) highlighted with amber warning badge.

2. **Triage Overdue** — Single click on "SLA Elapsed" column header sorts descending. Overdue items float to top with amber row highlight. Queue for ≤500 open tickets loads in ≤200ms.

3. **Open Ticket Detail** — Click anywhere on a ticket row opens the ticket detail page (SCR-07).

4. **Assign** — "Assign to" dropdown in the right sidebar. Default: "Unassigned." Dropdown pre-filters to staff in the ticket's category's department. Name type-ahead filter for large departments. Save triggers `ticketHistory: assignment` entry and email notification.

5. **Staff Comment** — Comment text area with lock icon header "Staff Comment (internal — not sent to reporter)." Visually distinct from the "Reply to Reporter" field (different background color, icon). Submit appends `ticketHistory: comment`. No email sent.

6. **Reply to Reporter** — Separate text area with email icon header "Reply to Reporter (sends email notification to [reporter email])." Submit appends `ticketHistory: response` and triggers reporter email.

7. **Close Ticket** — Red "Close Ticket" button in action panel. Opens sub-status dropdown (Resolved / Duplicate / Bogus) and close notes text area. On "Close" click: confirmation dialog showing exactly who will receive the email notification. Confirm → ticket closed, history entry, email sent, user returned to queue.

8. **Re-open** — Closed tickets show "Re-open Ticket" button. Confirmation: "This will re-open the ticket. The reporter will not be notified automatically." Re-open clears `closedDate` and `substatus_id`.

### States

| State | UI Treatment |
|-------|-------------|
| Queue loading | Skeleton rows (5 placeholder rows with shimmer) |
| Empty queue | "No open tickets in your queue. 🎉" illustration |
| Ticket not found | 404 page with "Return to Queue" link |
| Assign saving | Button spinner; row locked during save |
| Comment saving | Textarea disabled; spinner; success flash |
| Close confirmation dialog | Modal overlay; cannot close by clicking outside |
| Close in progress | Dialog spinner; buttons disabled |
| Close success | Toast: "Ticket #XXXXX closed. Email sent to [reporter]." |
| Close error (409 — already closed) | Toast error: "This ticket was already closed by another user." |
| Re-open error (409 — already open) | Toast error: "This ticket is already open." |
| SLA exceeded | Amber row background; ⚠️ badge on SLA column |
