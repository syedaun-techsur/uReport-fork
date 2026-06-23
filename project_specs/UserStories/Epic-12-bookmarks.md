## Epic 12: Bookmarked Searches (F12)

Authenticated users can save named search queries as bookmarks. Bookmarks are stored per user and recalled to re-run the same Solr query. Both staff and public (authenticated citizen) users can create bookmarks.

---

### US-12.1: Save a Search as a Named Bookmark
**As an** Authenticated Resident, **I want to** save the current search query as a named bookmark, **so that** I can re-run the same search for recurring issues in my neighborhood with a single click.

**Acceptance Criteria:**
- [ ] `POST /bookmarks` creates a bookmark with `name`, `requestUri`, and optional `type` (default `'search'`)
- [ ] `requestUri` is required, must be non-empty, and must start with `/` (relative path); returns HTTP 400 otherwise
- [ ] Anonymous callers receive HTTP 401
- [ ] Bookmark is scoped to `currentUser.id` — the creator owns it
- [ ] Bookmark can be created from any search results page without leaving the results view

**Priority:** P2 | **Feature Ref:** F12

---

### US-12.2: View My Saved Bookmarks
**As an** Authenticated Resident, **I want to** see all my saved bookmarks in one place, **so that** I can quickly navigate to my recurring searches.

**Acceptance Criteria:**
- [ ] `GET /bookmarks` returns only bookmarks where `person_id = currentUser.id`, ordered by `id DESC`
- [ ] Each bookmark object includes `{id, type, name, requestUri}`
- [ ] Anonymous callers receive HTTP 401
- [ ] List is available in all five response formats via the serialization interceptor (F3)

**Priority:** P2 | **Feature Ref:** F12

---

### US-12.3: Delete a Saved Bookmark
**As an** Authenticated Resident, **I want to** delete a bookmark I no longer need, **so that** my bookmark list stays relevant and uncluttered.

**Acceptance Criteria:**
- [ ] `DELETE /bookmarks/:id` removes the bookmark and returns HTTP 204
- [ ] Only the owner (`person_id = currentUser.id`) can delete a bookmark
- [ ] Attempting to delete a bookmark owned by another user returns HTTP 404 (not HTTP 403, to avoid information leakage)
- [ ] Non-existent bookmark ID returns HTTP 404
- [ ] Anonymous callers receive HTTP 401

**Priority:** P2 | **Feature Ref:** F12

---

### US-12.4: Recall a Bookmark to Re-Run a Search
**As a** Case Worker, **I want to** click a saved bookmark and immediately see the search results it references, **so that** I can quickly resume my standard daily queue filters without rebuilding them.

**Acceptance Criteria:**
- [ ] Clicking a bookmark navigates the client to `bookmark.requestUri`
- [ ] No dedicated server-side recall endpoint is required; the client-side redirect uses the stored `requestUri`
- [ ] The recalled search re-executes against the current live Solr index (not a cached snapshot)

**Priority:** P2 | **Feature Ref:** F12

---
