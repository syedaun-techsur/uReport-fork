---

## NaC Derivation Table

Full traceability chain: `JTBD Outcome → Journey Stage → NaC Statement → Story`

| JTBD-ID | JTBD Outcome (hiring criterion) | Journey Stage | NaC Statement | Story |
|---|---|---|---|---|
| JTBD-01.1 | Accepts submission without login or registration | JRN-01.1: Discover | Anonymous caller can browse and post to `postingPermissionLevel='anonymous'` categories with zero auth prompts | US-2.1 |
| JTBD-01.1 | Provides clear category selection with plain-language descriptions | JRN-01.1: Select Category | `GET /open311/v2/services` returns all anonymous-visible categories with `description` and `group` fields in < 200ms | US-0.1 |
| JTBD-01.1 | Provides clear category selection with plain-language descriptions | JRN-01.1: Select Category | `GET /open311/v2/services/:id` returns `attributes` array so caller knows required fields before submitting | US-0.2 |
| JTBD-01.1 | Accepts location input (GPS coordinates) from mobile browser | JRN-01.1: Locate Issue | Web form accepts `lat`/`lon` validated to [-90,90] and [-180,180] ranges; location required for ticket creation | US-1.1 |
| JTBD-01.1 | Accepts an optional photo attachment alongside the description | JRN-01.1: Describe & Attach | Authenticated user uploads via `POST /tickets/:id/media`; anonymous gets HTTP 401 | US-8.1 |
| JTBD-01.1 | Returns a unique confirmation token immediately after submission | JRN-01.1: Submit | `POST /open311/v2/requests` returns `service_request_id` + `token` in response; submission token stored in `ticketHistory` | US-0.3 |
| JTBD-01.1 | First-time user completes submission in ≤ 3 minutes | JRN-01.1: Submit | Web form creates ticket from `category_id` + location with no login; `action='open'` logged; confirmation includes ticket ID | US-1.1 |
| JTBD-01.1 | Response byte-compatible with PHP implementation (NFR-1) | JRN-01.2: Submit Request | `POST /open311/v2/requests` JSON response byte-identical to legacy PHP for same input fixture | US-3.1 |
| JTBD-01.1 | Response byte-compatible with PHP implementation (NFR-1) | JRN-01.2: Discover Services | `.xml` suffix returns XML with CDATA wrapping identical to legacy for the same input fixture | US-3.2 |
| JTBD-01.1 | Format negotiated correctly for external API clients | JRN-01.2: Submit Request | URL suffix > query param > Accept header priority order consistent across all requests | US-3.4 |
| JTBD-01.1 | Form renders correctly on a mobile browser | JRN-01.2: Discover Services | Browser requests receive full HTML with header/nav/footer; mobile-compatible layout matches existing PHP interface | US-3.5 |
| JTBD-01.2 | Token lookup returns ticket status in ≤ 200ms without authentication | JRN-01.2: Poll for Status | `GET /open311/v2/tokens/:token` returns `{token, service_request_id}` in ≤ 200ms; no auth required; HTTP 404 if token not found | US-0.6 |
| JTBD-01.2 | Exposes ticket status to anonymous users for publicly-visible categories | JRN-01.2: Poll for Status | `GET /open311/v2/requests/:id` returns current status in single-element array; HTTP 404 if not visible to caller | US-0.5 |
| JTBD-01.3 | Exposes publicly accessible ticket list queryable by geographic location | JRN-01.2: Query Nearby | `GET /open311/v2/requests` with `lat/long/radius` returns only `displayPermissionLevel='anonymous'` tickets in ≤ 200ms | US-0.4 |
| JTBD-01.3 | Geo-cluster map view surfaces nearby reports visually | JRN-01.2: Query Nearby | `GET /locations` returns cluster objects filtered by caller's role; anonymous user can visually confirm nearby issues | US-9.1 |
| JTBD-01.3 | Ticket appears on map without staff intervention | JRN-01.2: Submit Request | On ticket creation with lat/lon, `ticket_geodata` upserted for all 7 cluster levels | US-9.2 |
| JTBD-02.1 | Personal ticket dashboard reachable within 2 clicks of login | JRN-02.1: Initiate Login | Clicking "Log In" redirects to IdP with `state`/`nonce`; user lands on uReport dashboard post-callback | US-4.1 |
| JTBD-02.1 | OIDC callback validates state/nonce; session created | JRN-02.1: Authenticate | `GET /auth/callback` validates `state`, exchanges code, provisions `people` record; session scoped to `userId` | US-4.2 |
| JTBD-02.1 | Login session persists without re-authentication | JRN-02.1: Authenticate | Session cookie (`HttpOnly`, `Secure`, `SameSite=Lax`) persists for `SESSION_TTL_SECONDS`; `request.user` always reflects identity | US-4.3 |
| JTBD-02.1 | Session cleared on logout for shared-device safety | JRN-02.1: Initiate Login | Logout destroys server-side session, clears cookie, optionally redirects to IdP end-session endpoint | US-4.4 |
| JTBD-02.1 | Own account record editable without developer involvement | JRN-02.1: Land on Dashboard | `GET /account` returns own `people` record; `PUT /account` updates profile; `role` and `username` immutable via self-service | US-4.5 |
| JTBD-02.1 | Shows all tickets filtered by status and date | JRN-02.1: Land on Dashboard | Ticket list scoped to `reportedByPerson_id=currentUser.id`; filterable by status, sortable by date; accessible in ≤ 2 clicks | US-1.2 |
| JTBD-02.1 | Public role permits own history and bookmarks | JRN-02.1: Land on Dashboard | Public callers can view `public`+`anonymous` tickets, own history, own bookmarks; HTTP 403 on staff actions | US-2.2 |
| JTBD-02.1 | PII fields of other reporters are not exposed | JRN-02.1: Filter and Find | `reportedByPerson_id` and related person objects omitted/nulled for non-staff callers in all five formats | US-2.5 |
| JTBD-02.2 | Email notification sent within 5 minutes of assignment | JRN-02.1: Verify Notification | `assignment` notification email sent within 5 min; logged to `ticketHistory.sentNotifications` | US-7.2 |
| JTBD-02.2 | Every ticket close triggers email notification | JRN-02.1: Verify Notification | `closed` notification sent to reporter and assignee; send logged to `sentNotifications` | US-7.3 |
| JTBD-02.2 | Zero missed notifications | JRN-02.1: Verify Notification | `response`, `comment`, `duplicate` actions trigger emails per F7 trigger matrix; all sends logged | US-7.4 |
| JTBD-02.2 | Single digest for subscribed users | JRN-02.1: Verify Notification | Scheduled cron sends one digest per subscribed user; digest sends logged to `sentNotifications` | US-7.6 |
| JTBD-02.3 | Can save Solr search as named bookmark from results page | JRN-02.2: Save Bookmark | `POST /bookmarks` with `name` + `requestUri`; user-scoped; anonymous gets HTTP 401; creation requires no page navigation | US-12.1 |
| JTBD-02.3 | Saved bookmarks listed on dashboard after login | JRN-02.2: Confirm Saved | `GET /bookmarks` returns only caller's bookmarks ordered `id DESC`; available in all five formats | US-12.2 |
| JTBD-02.3 | Can delete bookmarks no longer needed | JRN-02.2: Confirm Saved | `DELETE /bookmarks/:id` restricted to owner; other-user bookmark returns HTTP 404 (no info leakage) | US-12.3 |
| JTBD-02.3 | Re-running bookmark replays exact query with current state | JRN-02.2: Re-Run Bookmark | Client-side redirect to `bookmark.requestUri` re-executes against live Solr index; no cached snapshot | US-12.4 |
| JTBD-03.1 | Full read/write access for staff regardless of permission level | JRN-03.1: Login and Orient | Staff callers (`people.role='staff'`) can view all tickets/categories, all PII; every allow/deny matches Laminas ACL | US-2.3 |
| JTBD-03.1 | Queue of 500 tickets loads in ≤ 200ms | JRN-03.1: Triage Overdue | Ticket indexed in Solr after create/update/close; Solr failure logged but does not fail ticket write | US-5.4 |
| JTBD-03.2 | Assignment action logged to ticketHistory | JRN-03.1: Assign New Ticket | `assignedPerson_id` updated; `ticketHistory` `action='assignment'` appended; HTTP 400 if assignee not in department | US-1.3 |
| JTBD-03.2 | Category/location changes produce immutable ticketHistory entries | JRN-03.1: Assign New Ticket | `changeCategory`/`changeLocation`/`update` actions logged; `lastModified` updated; Solr re-indexed | US-1.4 |
| JTBD-03.2 | Closing requires substatus_id and produces audit entry | JRN-03.1: Close Resolved Tickets | `status='closed'`, `ticketHistory action='closed'` with sub-status and notes; `closed` email auto-triggered; HTTP 409 on already-closed | US-1.5 |
| JTBD-03.2 | Reporter notification triggered automatically on close | JRN-03.1: Close Resolved Tickets | `open` notification sent to reporter with `usedForNotifications=true` email; template resolved from `category_action_responses` | US-7.1 |
| JTBD-03.2 | Staff-only comments not visible to public/anonymous | JRN-03.1: Update Staff Comment | `ticketHistory action='comment'`; not visible to anonymous/public callers (RBAC enforced) | US-1.7 |
| JTBD-03.2 | Response action triggers reporter notification | JRN-03.1: Update Staff Comment | `ticketHistory action='response'`; `response` email triggered to reporter; `lastModified` updated | US-1.8 |
| JTBD-03.2 | History is complete enough to reconstruct any decision | JRN-03.1: Login and Orient | `ticketHistory` entries ordered by `enteredDate ASC`; `sentNotifications` included; PII omitted for non-staff | US-1.10 |
| JTBD-03.2 | Re-open ticket when closed prematurely | JRN-03.1: Close Resolved Tickets | `status='open'`, `closedDate` cleared, Solr re-indexed; HTTP 409 on already-open ticket | US-1.9 |
| JTBD-03.2 | CSV export column-for-column identical to HTML view | JRN-03.1: Bulk Review and Export | `Accept: text/csv` returns CSV with UTF-8 BOM; column-for-column match with HTML view for same filters | US-3.3 |
| JTBD-03.2 | Thumbnails for quick field photo preview | JRN-03.1: Update Staff Comment | Thumbnails auto-generated for image uploads; served at `/tickets/:id/media/:mediaId/thumbnail` | US-8.2 |
| JTBD-03.2 | Stream attachment for evidence review | JRN-03.1: Update Staff Comment | `GET /tickets/:id/media/:mediaId` streams file bytes; `displayPermissionLevel` checked; HTTP 404 if not visible | US-8.3 |
| JTBD-03.2 | Remove incorrect files from case record | JRN-03.1: Update Staff Comment | Staff-only `DELETE`; file and thumbnail deleted from disk; `update` action logged to `ticketHistory` | US-8.4 |
| JTBD-03.3 | Duplicate link available from ticket detail without navigation | JRN-03.2: Link as Duplicate | `parent_id` set on child; `duplicate` action appended to parent `ticketHistory`; `duplicate` email to child reporter | US-1.6 |
| JTBD-03.3 | In-page Solr search returns results in ≤ 500ms | JRN-03.2: Search for Parent | eDisMax search with role-based category filter returns results in ≤ 500ms; all five formats | US-5.1 |
| JTBD-03.3 | Filter supports free-text + category + location + status | JRN-03.2: Review Matches | All filter params ANDed; `sort`, `page`, `rows` supported; response includes `total`, `facets` | US-5.2 |
| JTBD-03.3 | Facets for quick distribution understanding | JRN-03.2: Review Matches | Facets for `categories`, `statuses`, `departments` returned; counts reflect role-filtered visibility | US-5.3 |
| JTBD-03.2 | Filtered ticket report row-for-row matches HTML | JRN-03.1: Bulk Review and Export | `GET /reports` with filters; CSV matches HTML view; staff-only; paginated | US-13.2 |
| JTBD-03.2 | Sub-statuses drive accurate ticket closure documentation | JRN-03.2: Close as Duplicate | Seed sub-statuses present; `status` field validated; referenced sub-statuses cannot be deleted | US-15.1 |
| JTBD-03.2 | System actions seeded; department actions extensible | JRN-03.2: Identify Candidate | 10 system actions seeded; department actions (`type='department'`) creatable; system action names immutable | US-15.2 |
| JTBD-04.1 | Permission levels enforce immediately on save | JRN-04.1: Configure Permissions & SLA | `displayPermissionLevel`/`postingPermissionLevel` validated; display filter applied immediately; no restart needed | US-2.4 |
| JTBD-04.1 | Self-service migration without DBA handoff | JRN-04.1: Save and Validate | All 21 MySQL tables translated to PostgreSQL DDL; `TINYINT(1)` → `BOOLEAN`; PostGIS extension enabled | US-6.1 |
| JTBD-04.1 | Data migrated with full fidelity | JRN-04.1: Save and Validate | Migration script reads MySQL, writes PG in dependency order; FK checks disabled then re-enabled; sequences reset | US-6.2 |
| JTBD-04.1 | Zero row-count discrepancies is go-live threshold | JRN-04.1: Save and Validate | `COUNT(*)` compared per table; `[PASS]`/`[FAIL]` logged; non-zero exit on any failure | US-6.3 |
| JTBD-04.1 | System starts in fully configured state | JRN-04.1: Save and Validate | Seed data present: 4 `contactMethods`, 3 `substatus`, 10 `actions`, 3 `categoryGroups`, 6 `issueTypes` | US-6.4 |
| JTBD-04.1 | Type-safe ORM queries | JRN-04.1: Save and Validate | `schema.prisma` models all 21 tables; unique constraints; all FK as `@relation`; passes `prisma validate` | US-6.5 |
| JTBD-04.1 | Category creation validated before save, no silent failures | JRN-04.1: Fill Core Fields | `name` required (max 50), `department_id` required, `postingPermissionLevel` validated; `customFields` valid JSON; category live in ≤ 10 min | US-10.1 |
| JTBD-04.1 | Obsolete categories hidden without deletion risk | JRN-04.1: Navigate to Admin | HTTP 409 if category has tickets; `active=false` hides without deletion | US-10.2 |
| JTBD-04.1 | Categories organized logically for citizens | JRN-04.1: Navigate to Admin | `name` required; `ordering` non-negative int; FK constraint blocks deletion of referenced groups | US-10.3 |
| JTBD-04.1 | CRM routing reflects current org structure | JRN-04.1: Navigate to Admin | `name` required (max 128), unique; deletion blocked if referenced | US-10.4 |
| JTBD-04.1 | Tickets appear in multiple departments' queues | JRN-04.1: Configure Permissions & SLA | `department_categories` POST/DELETE/GET; duplicate associations rejected; staff-only | US-10.5 |
| JTBD-04.1 | Per-category notification overrides | JRN-04.1: Add Custom Field | `category_action_responses` upsert; override template takes precedence over `actions.template` | US-10.6 |
| JTBD-04.1 | Search index consistent after migration | JRN-04.2: Verify and Communicate | Re-index script deletes all Solr docs, batches 500, final `commit`; non-zero exit on error | US-5.5 |
| JTBD-04.3 | Staff person records created via admin UI | JRN-04.2: Create New API Client | `username` unique; `role` validated; referenced persons cannot be deleted; staff-only | US-11.1 |
| JTBD-04.3 | Notification email addresses managed per person | JRN-04.2: Create New API Client | POST/PUT/DELETE at `/people/:personId/emails`; RFC 5322 validation; `usedForNotifications` flag; HTTP 409 on duplicate | US-11.2 |
| JTBD-04.3 | All contact methods on record | JRN-04.2: Create New API Client | Phone label validated; address label validated; standard CRUD at `/people/:personId/phones` and `/addresses` | US-11.3 |
| JTBD-04.3 | Centralized view of system access | JRN-04.2: Verify and Communicate | `GET /users` returns `role='staff'` people with department, username, emails; HTTP 403 for non-staff | US-11.5 |
| JTBD-04.3 | API key live immediately, revoked immediately | JRN-04.2: Create New API Client | `api_key` unique (max 50); new key live on next request; revoked key rejected immediately; no restart required | US-11.6 |
| JTBD-04.3 | Map fully populated before go-live | JRN-04.2: Verify and Communicate | `scripts/recluster.ts` truncates `ticket_geodata`, processes all tickets with lat/lon in batches of 500; idempotent | US-9.4 |
| JTBD-04.3 | Geo-cluster accurate when location corrected | JRN-04.2: Verify and Communicate | Re-cluster runs on lat/lon change; `ticket_geodata` upserted; cleared if lat/lon set to null | US-9.3 |
| JTBD-04.2 | Metrics dashboard reflects state with ≤ 5-min staleness | JRN-04.2: Check Metrics Dashboard | `GET /metrics` returns `openCount`, `closedCount`, `avgResolutionDays`, `byCategory`, `byDepartment`; staleness ≤ 5 min | US-13.1 |
| JTBD-04.3 | Structured logs in Graylog accessible within 2 minutes | JRN-04.2: Open Graylog | `GelfRequestMiddleware` logs method, path, statusCode, durationMs, `_request_id` per request; 30-day retention accessible | US-14.1 |
| JTBD-04.3 | Production errors triageable without console access | JRN-04.2: Open Graylog | Global exception filter logs ERROR with stack trace; `_request_id` and `_user_id` included in GELF payload | US-14.2 |
| JTBD-04.3 | Correlate Graylog entries to specific tickets and users | JRN-04.2: Identify Root Cause | `_ticket_id`, `_user_id`, `_request_id` as structured GELF fields on ticket operations | US-14.3 |
| JTBD-04.1 | Tickets classified consistently across departments | JRN-04.1: Navigate to Admin | Seed issue types present (6 rows); referenced issue types cannot be deleted; staff-only CRUD | US-15.3 |
| JTBD-04.1 | Ticket submissions attributed to correct channel | JRN-04.1: Navigate to Admin | Seed contact methods present (4 rows); referenced methods cannot be deleted; staff-only CRUD | US-15.4 |
| JTBD-04.1 | Person search for assignee selection | JRN-03.1: Assign New Ticket | `GET /people/search?q=...` with `role=staff` and `department_id`; matches firstname, lastname, email, username | US-11.4 |

---
