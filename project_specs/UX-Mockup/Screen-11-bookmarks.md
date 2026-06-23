## Screen 11: Bookmarks Management (SCR-12)

**Purpose:** Display and manage an authenticated user's saved search bookmarks.
**User Stories:** US-12.1, US-12.2, US-12.3, US-12.4
**Personas:** PER-02, PER-03
**Feature Refs:** F12, F5

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Global Nav — Authenticated Resident or Staff]              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Saved Searches                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔖 Elm Street Potholes                               │  │
│  │    Saved Jun 15, 2026 · Search: pothole elm street   │  │
│  │    [Run Search →]                   [🗑️ Delete]      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔖 Open Streetlight Issues                           │  │
│  │    Saved Jun 10, 2026 · Search: streetlight status:open  │  │
│  │    [Run Search →]                   [🗑️ Delete]      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔖 My Department Queue                               │  │
│  │    Saved Jun 5, 2026 · Queue: dept=PubWorks status=open  │  │
│  │    [Run Search →]                   [🗑️ Delete]      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Showing 3 saved searches                                   │
│                                                             │
│  [+ Save Current Search]  ← (only shown if navigated from  │
│                              a search results page)         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [Footer]                                                    │
└─────────────────────────────────────────────────────────────┘
```

### Save Bookmark Modal (from Search Results Page)

```
┌──────────────────────────────────────────────────────────────┐
│ Save This Search                                             │
│ ─────────────────────────────────────────────────────────── │
│ Name your search:                                            │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ pothole elm street — Open                              │  │
│ └────────────────────────────────────────────────────────┘  │
│ (You can edit this name to something more memorable)        │
│ ─────────────────────────────────────────────────────────── │
│ [Cancel]                              [Save Search]         │
└──────────────────────────────────────────────────────────────┘
```

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Bookmark name + "Run Search" CTA | Per bookmark card |
| Secondary | Saved date + URI preview | Subtitle of each card |
| Secondary | Delete button | Per card, right side |
| Tertiary | Total count | Below list |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Loading | Skeleton bookmark cards | — |
| Empty list | Illustration + "No saved searches yet." + "Run a search and click 'Save this search' to get started." | CTA to search page |
| Save modal open | Small centered modal; search results visible behind |  — |
| Saving | Save button spinner; inputs disabled | — |
| Save success | Modal closes; toast: "Bookmark saved. [View your bookmarks →]" | — |
| Delete confirmation | Inline: "Delete '[name]'? [Yes] [No]" (no modal) | — |
| Delete in progress | Card row fades | — |
| Delete success | Row removed with animation | No toast (low importance) |
| Recall: Solr error | "Search temporarily unavailable — try again in a moment." | Friendly error, not a 500 page |
