---

### PER-02: Priya Nair — Authenticated Resident

**Primary Journeys:** JRN-02.1 (OIDC Login + Personal Ticket History) · JRN-02.2 (Bookmark Setup)

#### JRN-02.1 Journey Stages: Initiate Login → Authenticate → Land on Dashboard → Filter and Find → Verify Notification

| SM-ID | Story | Journey Stage | Epic | NaC (JTBD Source) | Release |
|---|---|---|---|---|---|
| SM-4.1 | **US-4.1** Log In via OIDC Authorization Code Flow | Initiate Login | Epic 4 (F4) | JTBD-02.1: "Personal ticket dashboard reachable within 2 clicks of logging in via OIDC" → Clicking "Log In" redirects to city IdP with correct `state`/`nonce`; user lands on uReport after callback with no extra steps | R1 |
| SM-4.2 | **US-4.2** Complete OIDC Callback and User Provisioning | Authenticate | Epic 4 (F4) | JTBD-02.1: "OIDC callback correctly validates state/nonce; session created" → `GET /auth/callback` validates `state`, exchanges code, provisions `people` record; session scoped to `userId`; user redirected to dashboard | R1 |
| SM-4.3 | **US-4.3** Session Persistence Across Page Loads | Authenticate | Epic 4 (F4) | JTBD-02.1: "Personal ticket history accessible without re-authentication" → Session cookie (`HttpOnly`, `Secure`, `SameSite=Lax`) persists across page loads for `SESSION_TTL_SECONDS`; `request.user` always reflects authenticated identity | R1 |
| SM-4.4 | **US-4.4** Log Out and Clear Session | Initiate Login | Epic 4 (F4) | JTBD-02.1: "Shared-device safety" → Logout destroys server-side session, clears cookie, optionally redirects to IdP end-session endpoint | R1 |
| SM-4.5 | **US-4.5** View and Edit Own Profile | Land on Dashboard | Epic 4 (F4) | JTBD-02.1: "Shows all tickets associated with the authenticated user" → `GET /account` returns own `people` record including notification emails; profile editable; non-authenticated gets HTTP 401 | R1 |
| SM-2.2 | **US-2.2** Authenticated Resident Access (Public Role) | Land on Dashboard | Epic 2 (F2) | JTBD-02.1: "Shows all tickets associated with the authenticated user's account, filterable by status" → Public callers can view `public`+`anonymous` categories/tickets, own history, own bookmarks; HTTP 403 on staff actions | R1 |
| SM-2.5 | **US-2.5** PII Field Masking for Non-Staff Callers | Filter and Find | Epic 2 (F2) | JTBD-02.1: "PII fields of other reporters are not exposed" → `reportedByPerson_id` and related objects omitted/nulled for non-staff callers in all five response formats | R1 |
| SM-1.2 | **US-1.2** View Own Ticket History | Land on Dashboard | Epic 1 (F1) | JTBD-02.1: "Personal ticket history reachable within 2 clicks of login" → Ticket list scoped to `reportedByPerson_id = currentUser.id`; filterable by status and date; accessible in ≤ 2 navigation actions post-login | R1 |
| SM-7.2 | **US-7.2** Receive Email Notification When a Ticket is Assigned | Verify Notification | Epic 7 (F7) | JTBD-02.2: "Email notification sent within 5 minutes of any status change" → `assignment` notification email sent to reporter and assigned person within 5 min; send logged to `ticketHistory.sentNotifications` | R2 |
| SM-7.3 | **US-7.3** Receive Email Notification When a Ticket is Closed | Verify Notification | Epic 7 (F7) | JTBD-02.2: "Every status change on a ticket she reported triggers an email notification" → `closed` notification sent to reporter and assignee; template resolution chain applied; send logged to `sentNotifications` | R2 |
| SM-7.4 | **US-7.4** Receive Email for Response, Comment, and Duplicate Actions | Verify Notification | Epic 7 (F7) | JTBD-02.2: "Zero missed notifications for tickets tied to her reporter record" → `response`, `comment`, `duplicate` actions trigger emails per F7 trigger matrix; all sends logged to `ticketHistory.sentNotifications` | R2 |
| SM-7.6 | **US-7.6** Receive Digest Notification Email | Verify Notification | Epic 7 (F7) | JTBD-02.2: "Stay informed without being overwhelmed by individual event emails" → Scheduled cron sends one digest per subscribed user; digest sends logged to `sentNotifications` | R2 |
| SM-8.1 | **US-8.1** Upload a Photo or Document Attachment | Filter and Find | Epic 8 (F8) | JTBD-02.1: "Attach a photo to a ticket she submits to document the condition" → Authenticated user uploads via `POST /tickets/:id/media`; file stored, `upload_media` action logged, `lastModified` updated | R2 |

#### JRN-02.2 Journey Stages: Run the Search → Review Results → Save Bookmark → Confirm Saved → Re-Run Bookmark

| SM-ID | Story | Journey Stage | Epic | NaC (JTBD Source) | Release |
|---|---|---|---|---|---|
| SM-5.1 | **US-5.1** Search Tickets with Full-Text Query | Run the Search | Epic 5 (F5) | JTBD-02.3: "Can save any Solr search as a named bookmark directly from results page" → `GET /search?q=...` returns results via eDisMax in ≤ 500ms; RBAC category filter applied; results in all five formats | R2 |
| SM-5.2 | **US-5.2** Filter Search Results by Status, Category, Department, and Date Range | Review Results | Epic 5 (F5) | JTBD-02.3: "Solr search returns results filtered by permission level and query params" → Filters ANDed; `sort`, `page`, `rows` supported; response includes `total`, `facets` | R2 |
| SM-5.3 | **US-5.3** View Search Facets for Quick Narrowing | Review Results | Epic 5 (F5) | JTBD-02.3: "Supports an `address_contains` filter or street-name facet in search" → Facets for `categories`, `statuses`, `departments` returned alongside results; counts reflect role-filtered visibility | R2 |
| SM-12.1 | **US-12.1** Save a Search as a Named Bookmark | Save Bookmark | Epic 12 (F12) | JTBD-02.3: "Saved bookmark saved from search results page without leaving results" → `POST /bookmarks` with `name` + `requestUri` creates user-scoped bookmark; anonymous gets HTTP 401 | R3 |
| SM-12.2 | **US-12.2** View My Saved Bookmarks | Confirm Saved | Epic 12 (F12) | JTBD-02.3: "Saved bookmarks listed on her dashboard after login" → `GET /bookmarks` returns only caller's bookmarks ordered `id DESC`; available in all five formats | R3 |
| SM-12.3 | **US-12.3** Delete a Saved Bookmark | Confirm Saved | Epic 12 (F12) | JTBD-02.3: "Can delete bookmarks she no longer needs" → `DELETE /bookmarks/:id` restricted to owner; other-user bookmark returns HTTP 404 (no info leakage); anonymous gets HTTP 401 | R3 |
| SM-12.4 | **US-12.4** Recall a Bookmark to Re-Run a Search | Re-Run Bookmark | Epic 12 (F12) | JTBD-02.3: "Re-running bookmark replays exact Solr query and reflects current ticket state" → Client-side redirect to `bookmark.requestUri` re-executes against live Solr index; no stale cache | R3 |

---
