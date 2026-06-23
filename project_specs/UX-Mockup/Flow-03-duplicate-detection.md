## Flow 03: Duplicate Detection & Linking (FLW-04)

**Trigger:** Case worker opens a ticket and suspects it is a duplicate of an existing ticket.
**User Stories:** US-1.6, US-5.1, US-5.2
**Personas:** PER-03 (Dana Kowalski — Case Worker)
**Journey Reference:** JRN-03.2

```
[Staff Ticket Detail — SCR-07]
    │  "Similar tickets" panel auto-shown if Solr similarity match found
    │
    ├── [Proactive: "Possible duplicates" auto-suggestion]
    │       │  Solr: same category + proximity + submitted within 7 days
    │       ▼
    │   [Similar Tickets Panel: up to 3 suggestions with snippets]
    │
    └── [Manual: "Search for duplicate" button]
            │
            ▼
        [In-page Duplicate Search Panel]
            │  Text input + category filter
            │  Solr results in ≤500ms
            │
            ▼
        [Search Results with Ticket Snippets]
            │  (category, address, submission date, status)
            │
            ▼
        [Click "Link as duplicate of #XXXXX"]
            │
            ▼
        [Confirmation Dialog]
            │  "This will mark #CURRENT as a duplicate of #PARENT.
            │   A 'duplicate' action will be logged on both tickets."
            │
            ├── Confirm ──▶ [parent_id set on child]
            │                   │
            │                   ▼
            │               [Close form auto-shown]
            │               [Sub-status pre-selected: "Duplicate"]
            │               [Close notes pre-filled: "Duplicate of #PARENT"]
            │                   │
            │                   ▼
            │               [Close Ticket with Duplicate sub-status]
            │                   │
            │                   ▼
            │               [ticketHistory on child: closed/duplicate]
            │               [ticketHistory on parent: duplicate action logged]
            │               [Email to child reporter]
            │
            └── Cancel  ──▶ [Stay on ticket detail, no changes]
```

### Steps

1. **Proactive Suggestion** — On ticket detail load, Solr runs a background similarity query (same category_id + nearby lat/lon + `enteredDate` within 7 days). If 1–3 matches found, a "Possible duplicates" banner appears above the ticket body: "We found tickets that may be duplicates. [Review]."

2. **Similar Tickets Panel** — Collapsible panel showing up to 3 suggested tickets. Each shows: ticket ID, category, address, submitted date, current status, one-line description snippet. Buttons: "Link as duplicate" (per result) and "Not a duplicate" (dismisses suggestion).

3. **Manual Duplicate Search** — "Search for duplicate" button opens the in-page Solr search panel (below the ticket body, does not navigate away). Free-text input + category filter dropdown. Results appear inline in ≤500ms.

4. **Result Snippets** — Each result shows: `#ID — Category — Address — Submitted [date] — Status: [open/closed]`. One-line description snippet with matched terms highlighted. "Preview" link expands a read-only summary pane (does not navigate away).

5. **Link Confirmation** — Confirmation dialog clearly states what will happen on **both** the child and parent ticket. Includes parent ticket ID and summary for verification.

6. **Post-Link Close Form** — After linking, the close action form is automatically surfaced. Sub-status dropdown defaults to "Duplicate." Close notes pre-populated with "Duplicate of #[parent_id]." User can override both. One-click close completes the workflow.

7. **Audit Trail** — Both tickets receive history entries. Parent ticket's history shows: `[action: duplicate] Ticket #CHILD was marked as a duplicate of this ticket.` Child ticket's history shows `[action: closed / sub-status: Duplicate]`.

### States

| State | UI Treatment |
|-------|-------------|
| Loading similarity suggestions | Skeleton rows in "Possible duplicates" panel |
| No similarity matches | Panel hidden; "Search for duplicate" button still available |
| Duplicate search loading | Spinner inside search panel |
| No search results | "No matching tickets found. Try broader search terms." |
| Link confirmation pending | Modal overlay; parent ticket summary visible |
| Linking in progress | Dialog spinner; buttons disabled |
| Link + close success | Toast: "Ticket #CHILD closed as duplicate of #PARENT." Return to queue. |
| Link error (self-reference) | Toast error: "A ticket cannot be its own parent." |
| Link error (parent not found) | Toast error: "Parent ticket not found." |
| Already has parent_id | "Duplicate" action disabled with tooltip: "This ticket already has a parent." |
