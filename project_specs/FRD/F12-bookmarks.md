---

## F12: Bookmarked Searches

**Description:** Authenticated users can save named search queries as bookmarks. Bookmarks are stored per user and can be recalled to re-run the same Solr query. Both staff and public (authenticated citizen) users can create bookmarks. This is a lightweight productivity feature.

**Terminology:**
- **Bookmark:** A named, saved search URI stored in the `bookmarks` table
- **requestUri:** The full search URL including query parameters (e.g., `/search?q=pothole&status=open`)
- **type:** Bookmark category; default is `'search'` (extensible)

**Sub-features:**
- Create bookmark
- List bookmarks (authenticated user's own)
- Delete bookmark
- Recall bookmark (re-navigate to saved URI)

---

### F12.1 Create Bookmark

**Process:**
1. Verify caller is authenticated (public or staff); anonymous → 401.
2. Validate inputs.
3. Insert `bookmarks` record: `person_id = currentUser.id`, `type`, `name`, `requestUri`.
4. Return created bookmark.

**Inputs:**
- `name` (string, optional, max 128 chars): display label for the bookmark
- `requestUri` (string, required, max 1024 chars): the search URL to save
- `type` (string, optional, max 128 chars): default `'search'`

**Validation:**
- `requestUri` must be non-empty.
- `requestUri` must be a relative URL path (must start with `/`).
- `name` if provided must be non-empty after trimming.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Not authenticated | 401 | UNAUTHORIZED | "Authentication required" |
| Missing requestUri | 400 | MISSING_PARAMETER | "requestUri is required" |
| requestUri not relative path | 400 | INVALID_INPUT | "requestUri must be a relative path" |

---

### F12.2 List Bookmarks

**Process:**
1. Verify caller is authenticated.
2. Load all `bookmarks` where `person_id = currentUser.id`, ordered by `id DESC`.
3. Return list in negotiated format.

**Inputs:**
- None (scoped to authenticated user)

**Outputs:**
- Array of bookmark objects: `{id, type, name, requestUri}`

---

### F12.3 Delete Bookmark

**Process:**
1. Verify caller is authenticated.
2. Load bookmark by `id`; verify `person_id = currentUser.id` (users can only delete their own).
3. Delete bookmark record.
4. Return 204 No Content.

**Inputs:**
- `id` (integer, required): URL path parameter

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Not authenticated | 401 | UNAUTHORIZED | "Authentication required" |
| Bookmark not found | 404 | NOT_FOUND | "Bookmark not found" |
| Bookmark owned by other user | 404 | NOT_FOUND | "Bookmark not found" |

Note: a bookmark belonging to another user returns 404 (not 403) to avoid information leakage.

---

### F12.4 Recall Bookmark

Recalling a bookmark is a client-side redirect to `bookmark.requestUri`. The server provides the stored URI; the client navigates to it. No dedicated recall endpoint is needed.

---

**API Surface (this feature):** see `Y1-api.md` §Bookmarks.

**Schema Surface (this feature):** uses `bookmarks`, `people` — see `Y0-schema.md`.
