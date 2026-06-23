## Flow 06: Bookmark Save & Recall (FLW-07)

**Trigger:** Authenticated user views search results and wants to save the current query for future reference.
**User Stories:** US-12.1, US-12.2, US-12.3, US-12.4
**Personas:** PER-02 (Priya Nair), PER-03 (Dana Kowalski)
**Journey Reference:** JRN-02.2

```
[Search Results Page — SCR-08]
    │  Results returned from Solr
    │
    ▼
["Save this search" affordance — visible only to authenticated users]
    │  (Bookmark icon in search results header)
    │
    ▼
[Save Bookmark Modal]
    │  Name input (pre-populated from query string)
    │  e.g., "pothole elm street — Open"
    │
    ├── Save ──▶ POST /bookmarks {name, requestUri: current URL}
    │               │
    │               ├── Success ──▶ [Modal closes; results remain]
    │               │               [Toast: "Bookmark 'X' saved. View your bookmarks →"]
    │               │
    │               └── Error ──▶ [Inline error; modal stays open]
    │
    └── Cancel ──▶ [Modal closes; no bookmark created]

[Personal Dashboard Sidebar / Bookmarks Page — SCR-12]
    │  List of saved bookmarks
    │
    ▼
[Click bookmark] ──▶ [Navigate to bookmark.requestUri]
                           │
                           ▼
                      [Search re-executed against current live Solr index]
```

### Steps

1. **Discoverability** — "Save this search" affordance: a bookmark icon (🔖) with text "Save this search" appears in the search results header bar, visible only to authenticated users (anonymous users see nothing). This is the critical discoverability gate (JRN-02.2 Stage 1).

2. **Save Bookmark Modal** — Small modal with:
   - Name input: pre-populated with sanitized query + active filters (e.g., "pothole elm street — Open")
   - User can edit the name freely
   - "Save" primary button
   - "Cancel" secondary button
   - Modal appears over the results page without navigation

3. **Success Feedback** — Modal closes immediately. Toast notification at top: "Bookmark '[name]' saved. [View your bookmarks →]" The link opens the bookmarks management page in a new context (or navigates after a delay).

4. **Bookmark List** (SCR-12) — Page listing all user's bookmarks. Each row: bookmark name, creation date, "Run" button (navigates to `requestUri`), "Delete" button (trash icon with confirmation).

5. **Recall** — Clicking "Run" navigates to the stored `requestUri`. The Solr query re-executes against the current live index — results reflect current ticket state, not a snapshot from when the bookmark was saved.

6. **Dashboard Integration** — A "Saved Searches" sidebar panel appears on the personal ticket history dashboard (SCR-05) showing the 3 most recent bookmarks. "View all bookmarks" link at the bottom.

7. **Delete Bookmark** — Trash icon triggers inline confirmation: "Delete bookmark '[name]'?" with Yes/No inline buttons. No full-page modal for a simple delete. HTTP 204 on success.

### States

| State | UI Treatment |
|-------|-------------|
| Anonymous user (no bookmark affordance) | "Save this search" button hidden entirely |
| Save bookmark modal | Small centered modal; backdrop blur |
| Saving in progress | Save button spinner; input disabled |
| Save success | Toast: "Bookmark saved. [View your bookmarks →]" |
| Save error | Inline error in modal; modal stays open |
| Bookmark list loading | Skeleton list rows |
| Empty bookmark list | "No saved searches yet. Run a search and click 'Save this search' to get started." |
| Recall: Solr unavailable | "Search is temporarily unavailable — try again in a moment." (not a generic 500) |
| Delete confirmation | Inline Yes/No without page modal |
| Delete in progress | Row fades; spinner appears |
| Delete success | Row removed with animation; no toast needed |
