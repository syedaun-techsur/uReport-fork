## Screen 12: Metrics / Reporting Dashboard (SCR-13)

**Purpose:** Show staff and supervisors ticket volume, SLA performance, and category distribution. Provide exportable reports.
**User Stories:** US-13.1, US-13.2, US-3.3
**Personas:** PER-04, PER-03
**Feature Refs:** F13, F2, F3

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Staff Global Nav — Reports highlighted]                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Metrics Dashboard                      🔄 (auto-refreshes) │
│                                                             │
│  Date Range: [Jun 1, 2026 ▾] to [Jun 23, 2026 ▾]  [Apply] │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ 342      │  │ 1,204    │  │ 5.2 days │  │ 23       │  │
│  │ Open     │  │ Closed   │  │ Avg Res. │  │ Overdue  │  │
│  │ Tickets  │  │ (period) │  │ Time     │  │ (SLA)    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                             │
│  Submission Rate (last 24 hours)                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ▁▃▅▇█▇▆▅▃▂▁▂▃▆▇█▇▅▃▂▁▂▃▆▄▂▁▁▁▁▁▁▂▃▄▆▇█▇▆         │  │
│  │  ╰── 12 AM   6 AM   12 PM   6 PM   Now              │  │
│  └──────────────────────────────────────────────────────┘  │
│  Note: Drop visible at 9:07 AM ← (useful for diagnosing)   │
│                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │ BY CATEGORY (open)      │  │ BY DEPARTMENT (open)    │  │
│  │                         │  │                         │  │
│  │ Pothole          142    │  │ Public Works     201    │  │
│  │ Streetlight       84    │  │ Sanitation        98    │  │
│  │ Graffiti          56    │  │ Inspections       43    │  │
│  │ Missed Pickup     32    │  │                         │  │
│  │ [+ 8 more]              │  │                         │  │
│  └─────────────────────────┘  └─────────────────────────┘  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Ticket Report Export                                       │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Filters:                                                   │
│  Status: [All ▾]  Category: [All ▾]  Dept: [All ▾]        │
│                                                             │
│  [Export HTML] [Export CSV ↓] [Export JSON] [Export TXT]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Metric Cards

| Metric | Source | Description |
|--------|--------|-------------|
| Open Tickets | `COUNT(tickets WHERE status='open')` | Current snapshot |
| Closed (period) | `COUNT WHERE status='closed' AND enteredDate IN range` | Within date range |
| Avg Resolution Time | `AVG(EPOCH(closedDate - enteredDate)/86400)` | Days, 1 decimal |
| Overdue | `COUNT WHERE status='open' AND slaDays elapsed > slaDays target` | SLA breaches |

### Submission Rate Sparkline

- Hourly bins for the last 24 hours
- Visualized as a mini bar chart (ASCII in TXT export; SVG/Canvas in HTML)
- Tooltip on hover: "9 AM — 12 submissions"
- Drops/spikes immediately visible (JRN-04.2 Stage 1 delight opportunity)
- Auto-refreshes every 60 seconds

### Export Section

The report export section allows filtering and downloading ticket data:

| Filter | Control |
|--------|---------|
| Status | All / Open / Closed |
| Category | Multi-select dropdown |
| Department | Multi-select dropdown |
| Date From / To | Date pickers |

Export buttons produce downloads matching the `SerializationInterceptor` output. CSV includes UTF-8 BOM and is column-identical to the HTML table view.

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | 4 KPI cards | Top row, immediately visible |
| Primary | Submission rate sparkline | Below KPIs |
| Secondary | Category / department breakdown tables | Mid-page |
| Secondary | Export controls | Bottom section |
| Tertiary | Date range filter | Above KPIs |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Loading (initial) | Skeleton KPI cards; skeleton chart | — |
| Data loaded | Full layout | Auto-refresh indicator (last updated: X seconds ago) |
| Date filter applied | KPIs and chart update | "Showing Jun 1 – Jun 23" |
| Export in progress | Export button spinner | "Preparing export…" |
| Export ready | Browser download triggered | — |
| Auto-refresh | KPIs silently update every 60s | "Updated just now" timestamp |
| Non-staff access | HTTP 403 redirect to login | — |
