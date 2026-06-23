## Screen 05: Staff Ticket Queue / List (SCR-06)

**Purpose:** Give case workers and supervisors a filterable, sortable view of all tickets in their department queue.
**User Stories:** US-1.3, US-1.5, US-2.3, US-3.3, US-5.1, US-5.2
**Personas:** PER-03, PER-04
**Feature Refs:** F1, F2, F3, F5

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] [Tickets ▾] [Search] [Admin ▾] [Reports] | [Name ▾]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Ticket Queue                            [+ New Ticket]     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ FILTERS                                              │  │
│  │ Department: [Public Works ▾]  Status: [Open ▾]      │  │
│  │ Category:   [All ▾]           Assignee: [All ▾]     │  │
│  │ Date From:  [──────────]      Date To:  [──────────] │  │
│  │ [Apply Filters]   [Clear All]     [Export CSV ↓]    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  342 tickets  Sort by: [SLA Elapsed Days ▾]                │
│                                                             │
│  ☐  ID     Category        Location      Status  SLA  Asgn │
│  ─────────────────────────────────────────────────────────  │
│  ☐  #84712 ⚠️Pothole        Main & Oak    🟢 Open 12d  —   │
│  ☐  #84698 ⚠️Drainage       Elm & 3rd     🟢 Open  9d  DK  │
│  ☐  #84721  Graffiti        Park Ave      🟢 Open  3d  —   │
│  ☐  #84687  Street Sign     Maple St      🟢 Open  2d  RO  │
│  ☐  #84703  Missed Pickup   Oak St        🟢 Open  1d  DK  │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [Bulk action bar — visible when rows selected]             │
│  2 tickets selected: [Assign to ▾]  [Export ↓]  [✕ Clear] │
│                                                             │
│  [← Previous]  Page 1 of 14  [Next →]                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [Footer]                                                    │
└─────────────────────────────────────────────────────────────┘
```

### Column Definitions

| Column | Description | Sortable |
|--------|-------------|----------|
| ☐ | Checkbox for bulk selection | — |
| ID | Ticket ID (linked) | Yes |
| Category | Service category name | Yes |
| Location | Address string (truncated) | No |
| Status | 🟢 Open / 🔴 Closed badge | Yes |
| SLA | Days elapsed since `enteredDate`. ⚠️ badge if > `slaDays` | Yes (default sort) |
| Asgn | Assignee initials or "—" if unassigned | Yes |

### Filter Bar

| Filter | Control Type | Behavior |
|--------|-------------|----------|
| Department | Dropdown (pre-selected to user's department) | Live filter; updates URL param |
| Status | Dropdown: All / Open / Closed | Live filter |
| Category | Multi-select dropdown | Live filter |
| Assignee | Dropdown: All / Unassigned / [staff list] | Live filter |
| Date From / To | Date pickers | Filter by `enteredDate` range |
| Export CSV | Button | Downloads CSV with current filter applied |

### Bulk Actions

When one or more checkboxes are selected, a bulk action bar slides up from the bottom of the filter area:
- **Assign to:** Dropdown of department staff; apply assignment to all selected tickets
- **Export:** Downloads CSV of selected tickets only
- **Clear:** Deselects all

### SLA Visual Indicators

- `slaDays` not exceeded: no special treatment
- `slaDays` exceeded: ⚠️ amber warning icon before ticket ID; entire row has `background: #fef3c7`
- `slaDays` not configured for category: no indicator shown

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Loading (first load) | Skeleton table (5 rows, shimmer) | — |
| Loading (filter change) | Table rows greyed out; spinner in filter bar | "Updating…" |
| Empty queue (filtered) | "No tickets match your current filters." with "Clear filters" | — |
| Empty queue (all) | "No tickets in your queue. 🎉" | — |
| Bulk assign in progress | Bulk bar shows spinner; rows locked | "Assigning [N] tickets…" |
| Bulk assign success | Toast: "[N] tickets assigned to [Name]." | — |
| Export in progress | Export button shows spinner | "Preparing export…" |
| Export ready | Browser download triggered | — |
