## Screen 07: Staff Search — Solr Full-Text (SCR-08)

**Purpose:** Provide full-text Solr search with filters and facets for staff ticket discovery and bookmarking.
**User Stories:** US-5.1, US-5.2, US-5.3, US-12.1
**Personas:** PER-02, PER-03
**Feature Refs:** F5, F12

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Staff Global Nav]                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Search Tickets                                             │
│  ┌──────────────────────────────────────────┐ [Search]    │
│  │ pothole elm street                       │             │
│  └──────────────────────────────────────────┘             │
│                                                             │
│  ┌───────────────┐  ┌──────────────────────────────────┐  │
│  │ FILTERS       │  │ RESULTS                          │  │
│  │ ─────────────  │  │ ─────────────────────────────── │  │
│  │ Status        │  │ 47 results for "pothole elm st"  │  │
│  │ ○ All         │  │ Sort: [Relevance ▾]              │  │
│  │ ● Open        │  │ 🔖 Save this search              │  │
│  │ ○ Closed      │  │                                  │  │
│  │               │  │ ┌──────────────────────────────┐ │  │
│  │ Category      │  │ │ #84698  Drainage              │ │  │
│  │ Pothole (12)  │  │ │ 🟢 Open — Elm & 3rd           │ │  │
│  │ Drainage (8)  │  │ │ Jun 20, 2026                  │ │  │
│  │ Graffiti (4)  │  │ │ water pooling at **elm** st.. │ │  │
│  │ [+ 3 more]    │  │ └──────────────────────────────┘ │  │
│  │               │  │ ┌──────────────────────────────┐ │  │
│  │ Department    │  │ │ #84712  Pothole               │ │  │
│  │ Pub Works(20) │  │ │ 🟢 Open — Main & Oak           │ │  │
│  │ Sanitation(9) │  │ │ Jun 21, 2026                  │ │  │
│  │               │  │ │ Large **pothole** on **elm**.. │ │  │
│  │ Date Range    │  │ └──────────────────────────────┘ │  │
│  │ From: [────]  │  │                                  │  │
│  │ To:   [────]  │  │ [← Previous] Page 1 of 4 [Next→]│  │
│  │               │  └──────────────────────────────────┘  │
│  │ [Clear Filters│                                          │
│  └───────────────┘                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Search Result Row

Each result row shows:
- Ticket ID (linked to detail)
- Category name
- Status badge
- Location string
- Submitted date
- Description snippet with matched query terms **bolded**
- Assignee initials (or "—" if unassigned)

### Facet Panel

Left sidebar facets update based on the current query results (not the full index):
- **Status:** Open / Closed counts
- **Category:** Top categories by count; "Show more" to expand
- **Department:** Counts per department
- **Date Range:** Free-text date inputs (ISO 8601)

Selecting a facet applies it as a filter query and refreshes results. Active filters shown as removable chips above the results list.

### "Save this search" Affordance

Visible only to authenticated users. Located in the results header bar next to the result count. Clicking opens the bookmark save modal (see Flow-06-bookmarks.md).

### Format Export

Staff can export search results via the format switcher in the results header:
- CSV export: downloads current filtered results as CSV
- JSON/XML links available for API consumers

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Initial (no query) | Empty results area; facets not shown | "Search for tickets using the search box above." |
| Loading | Results area shows skeleton rows | Spinner in search button; "Searching…" |
| Results returned | Results list; facets populated | Result count shown |
| No results | "No tickets found for '[query]'. Try a broader search or adjust filters." | — |
| Solr unavailable | Error banner | "Search is temporarily unavailable. Try again in a moment." |
| Facet applied | Active filter chip above results; facet checkbox checked | Filter chip with "×" to remove |
| Multiple filters | Multiple chips; "Clear all filters" link | — |
| Bookmark saving | Modal (see SCR-12) | — |
| Anonymous user | "Save this search" hidden; CSV export hidden | — |
