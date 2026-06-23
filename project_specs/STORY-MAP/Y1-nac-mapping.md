---

## NaC-to-Acceptance Criteria Alignment

This section verifies that each NaC aligns with the formal acceptance criteria in `UserStories-uReport.md`. A NaC is **aligned** when its testable condition is a subset of or directly expressed by the story's acceptance criteria.

| Story | NaC Summary | AC Alignment | Notes |
|---|---|---|---|
| US-0.1 | `GET /services` returns anonymous-visible categories with description fields in < 200ms | ✅ AC: returns `displayPermissionLevel='anonymous'` for unauthenticated callers; includes `service_name`, `description`, `group` fields | Performance bound (NFR-6) applies globally |
| US-0.2 | `GET /services/:id` returns `attributes` array so caller knows required fields | ✅ AC: returns `ServiceDefinition` with `attributes` array including `variable`, `code`, `datatype`, `required`, `order` | |
| US-0.3 | `POST /requests` creates ticket, returns `service_request_id` + `token` | ✅ AC: response contains `service_request_id`, `token`; validates `api_key`; HTTP 403 on invalid key | |
| US-0.4 | `GET /requests` with geo params returns only anonymous-level tickets in ≤ 200ms | ✅ AC: returns only tickets at caller's permission level; supports `lat/long/radius`; response time per NFR-6 | |
| US-0.5 | `GET /requests/:id` returns current status; HTTP 404 if not visible to caller | ✅ AC: returns single-element array; HTTP 404 if not visible to caller's role | |
| US-0.6 | Token lookup returns `{token, service_request_id}` in ≤ 200ms; no auth required | ✅ AC: returns `{token, service_request_id}` array; HTTP 404 if token not found; no authentication required | |
| US-1.1 | Web form creates ticket, `action='open'` logged; no login for anonymous categories | ✅ AC: submission without auth for anonymous categories; `ticketHistory` row with `action='open'`; confirmation includes ticket ID | |
| US-1.2 | Ticket history scoped to `reportedByPerson_id=currentUser.id`; accessible in ≤ 2 clicks | ✅ AC: only own tickets shown; filterable by status; accessible within 2 clicks of login | |
| US-1.3 | Assignment logged to `ticketHistory`; HTTP 400 if assignee not in department | ✅ AC: `ticketHistory` row `action='assignment'`; `assignedPerson_id` must belong to ticket's department | |
| US-1.4 | Category/location changes log distinct `ticketHistory` action types; Solr re-indexed | ✅ AC: `changeCategory`, `changeLocation`, `update` actions logged with `data = {original, updated}`; `lastModified` updated; Solr re-indexed | |
| US-1.5 | Close requires `substatus_id`; produces `ticketHistory` entry; `closed` email auto-triggered | ✅ AC: `substatus_id` required; `ticketHistory action='closed'`; notification triggered; HTTP 409 on already-closed | |
| US-1.6 | `parent_id` set on child; `duplicate` action on parent; email to child reporter | ✅ AC: `parent_id` set; `duplicate` action on parent; notification triggered; HTTP 400 on self-reference | |
| US-1.7 | Staff comment not visible to anonymous/public (RBAC) | ✅ AC: HTTP 403 for non-staff callers; comment not visible to anonymous or public callers | |
| US-1.8 | `response` action logged; reporter email triggered; `lastModified` updated | ✅ AC: `ticketHistory action='response'`; notification triggered; `lastModified` updated | |
| US-1.9 | Re-open clears `closedDate`/`substatus_id`; HTTP 409 if already open | ✅ AC: `status='open'`, `closedDate` cleared, `substatus_id` cleared; HTTP 409 on already-open | |
| US-1.10 | `ticketHistory` ordered by `enteredDate ASC`; PII omitted for non-staff | ✅ AC: entries ordered by `enteredDate ASC`; `enteredByPerson` and `actionPerson` included for staff only | |
| US-2.1 | Anonymous can browse/post to anonymous categories; HTTP 401 on auth endpoints | ✅ AC: anonymous callers can view/submit to `displayPermissionLevel='anonymous'`; HTTP 401 on auth-required endpoints | |
| US-2.2 | Public role sees own history + own bookmarks; HTTP 403 on staff actions | ✅ AC: public callers see `public`+`anonymous` tickets; can manage own bookmarks; HTTP 403 on staff actions | |
| US-2.3 | Staff (`people.role='staff'`) see all tickets/PII; every decision matches Laminas ACL | ✅ AC: staff can read all; can perform all actions; staff access only when `role='staff'` | |
| US-2.4 | Permission level change takes effect immediately; no restart | ✅ AC: `displayPermissionLevel` and `postingPermissionLevel` validated; changes take effect immediately | |
| US-2.5 | `reportedByPerson_id` and related objects omitted for non-staff in all five formats | ✅ AC: `reportedByPerson_id` omitted/nulled for non-staff; PII masking in all five formats | |
| US-3.1 | `Accept: application/json` returns byte-compatible JSON | ✅ AC: JSON field names match legacy exactly (camelCase); dates ISO 8601; booleans `true`/`false` | |
| US-3.2 | `.xml` suffix returns byte-compatible XML with CDATA | ✅ AC: XML tag names match legacy; CDATA wrapping on description/notes/template; byte-compatible with legacy fixture | |
| US-3.3 | CSV with UTF-8 BOM; column-for-column match with HTML view | ✅ AC: UTF-8 BOM; `Content-Disposition: attachment`; CSV matches HTML view row-for-row | |
| US-3.4 | URL suffix > query param > Accept header priority | ✅ AC: documented priority order; centralized in `SerializationInterceptor`; applies to error responses too | |
| US-3.5 | Browser requests receive full HTML; AJAX gets partial | ✅ AC: `Accept: text/html` returns full HTML with nav/footer; AJAX returns content partial only | |
| US-4.1 | OIDC redirect includes `state`/`nonce`; stored in server-side session | ✅ AC: authorization request includes `state`, `nonce`; stored in server-side session before redirect | |
| US-4.2 | Callback validates `state`; provisions `people` record; redirects to `return_to` | ✅ AC: `state` and `nonce` validated; `people` record created/updated; session populated; redirect to `return_to` | |
| US-4.3 | Session cookie `HttpOnly`, `Secure`, `SameSite=Lax`; persists for `SESSION_TTL_SECONDS` | ✅ AC: all three cookie attributes; `SESSION_TTL_SECONDS` expiry; anonymous if `session.userId` absent | |
| US-4.4 | Logout destroys session; clears cookie; optional IdP redirect | ✅ AC: server-side session destroyed; cookie cleared; optional `OIDC_END_SESSION_ENDPOINT` redirect | |
| US-4.5 | `GET /account` returns own record; `role`/`username` immutable via self-service | ✅ AC: `GET /account` returns own `people` record; `PUT /account` updates; `role` and `username` not changeable | |
| US-5.1 | eDisMax search with field boosts; results in ≤ 500ms; RBAC filter | ✅ AC: eDisMax with `description^2`, `location^1.5`; role-based category filter; results in ≤ 500ms | |
| US-5.2 | All filters ANDed; response includes `total`, `facets` | ✅ AC: filter params: `status`, `category_id`, `department_id`, `assignedPerson_id`, dates; ANDed; `total`, `page`, `rows`, `facets` in response | |
| US-5.3 | Facets for `categories`, `statuses`, `departments` with counts | ✅ AC: facets returned: `categories` `[{id,name,count}]`, `statuses`, `departments`; match legacy Solr facet config | |
| US-5.4 | Ticket indexed after create/update/close; Solr failure logged, does not fail write | ✅ AC: indexed on `create`, `update`, `close`; Solr unavailability logged (F14) but does not fail ticket write | |
| US-5.5 | Re-index: `deleteByQuery *:*`, batch 500, final `commit`; non-zero exit on error | ✅ AC: deletes all docs before inserting; batches of 500; `commit` issued; progress logged; non-zero exit on error | |
| US-6.1 | All 21 tables translated; `TINYINT(1)` → `BOOLEAN`; GiST index created | ✅ AC: all 21 tables; `AUTO_INCREMENT` → `GENERATED ALWAYS AS IDENTITY`; `TINYINT(1)` → `BOOLEAN`; GiST spatial index | |
| US-6.2 | Dependency-order migration; FK checks disabled then re-enabled; sequences reset | ✅ AC: migrated in dependency order; FK checks disabled then re-enabled; `IDENTITY` sequences reset to `MAX(id)+1` | |
| US-6.3 | `COUNT(*)` per table; `[PASS]`/`[FAIL]` logged; non-zero exit on any failure | ✅ AC: `COUNT(*)` compared per table; `[PASS]`/`[FAIL]` logged; non-zero exit if any table fails | |
| US-6.4 | Seed data present: 4 `contactMethods`, 3 `substatus`, 10 `actions`, 3 `categoryGroups`, 6 `issueTypes` | ✅ AC: exact row counts for all 5 seed tables; also in `prisma/seed.ts` | |
| US-6.5 | `schema.prisma` models all 21 tables; passes `prisma validate` | ✅ AC: all 21 models; `@id @default(autoincrement())`; unique constraints; `@relation` for FK; `prisma validate` passes | |
| US-7.1 | `open` notification to reporter with notification email; send logged | ✅ AC: `open` notification to `reportedByPerson` with `usedForNotifications=true`; template resolved; logged to `sentNotifications` | |
| US-7.2 | `assignment` notification to both assigned and reporter; `actionPerson` in template | ✅ AC: `assignment` notification to assigned person and reporter; `{actionPerson}` resolves to assigned person's name; logged | |
| US-7.3 | `closed` notification to reporter and assignee; template resolution chain applied | ✅ AC: `closed` notification to reporter and assigned; template resolved via chain; null vars replaced with empty string | |
| US-7.4 | `response`/`comment`/`duplicate` trigger matrix matches F7 spec | ✅ AC: `response` → reporter; `comment` → assigned; `duplicate` → child reporter; all logged to `sentNotifications` | |
| US-7.5 | `category_action_responses` CRUD; override takes precedence | ✅ AC: POST/GET/DELETE at `/categories/:categoryId/actions/:actionId/response`; override template takes precedence | |
| US-7.6 | Scheduled cron sends one digest per user; logged | ✅ AC: cron task via `DIGEST_CRON` env var; single summary per user; sends logged to `sentNotifications` | |
| US-8.1 | File stored as `{path}/{ticket_id}/{uuid}.{ext}`; `upload_media` action logged | ✅ AC: multipart upload; MIME type validated; file stored with UUID filename; `upload_media` action in `ticketHistory` | |
| US-8.2 | Thumbnails for image types; served at thumbnail endpoint; HTTP 404 for non-image | ✅ AC: thumbnails for `image/jpeg`, `image/png`, `image/gif`; dimensions via env vars; HTTP 404 if no thumbnail | |
| US-8.3 | `GET /tickets/:id/media/:mediaId` streams file; permission check | ✅ AC: streams file bytes with `Content-Type`; `displayPermissionLevel` checked; HTTP 404 if not visible | |
| US-8.4 | Staff-only delete; file + thumbnail removed; `update` action logged | ✅ AC: HTTP 403 for non-staff; file and thumbnail deleted from disk; `media` record removed; `update` action in `ticketHistory` | |
| US-9.1 | `GET /locations` returns clusters filtered by role; `zoom_level` 0–6 | ✅ AC: returns `{id, level, lat, lon, count}`; `zoom_level` param 0–6; optional `status` and `category_id` filters; RBAC filter applied | |
| US-9.2 | `ticket_geodata` upserted for all 7 levels on creation with lat/lon | ✅ AC: cluster assignment runs automatically; `ticket_geodata` upserted for levels 0–6; PostGIS KNN for nearest cluster | |
| US-9.3 | Re-cluster on lat/lon change; `ticket_geodata` upserted; row deleted if lat/lon cleared | ✅ AC: re-cluster on lat/lon change; `ticket_geodata` upserted; row deleted if lat/lon set to null; failure does not fail ticket update | |
| US-9.4 | Recluster script truncates `ticket_geodata`, batches 500; idempotent | ✅ AC: `scripts/recluster.ts` truncates `ticket_geodata`; batch 500; progress logged; idempotent; GiST index in place | |
| US-10.1 | Category form validates all fields; no silent failures; category live in ≤ 10 min | ✅ AC: `name` required max 50; `department_id` required; permission levels validated; `customFields` valid JSON; live in ≤ 10 min | |
| US-10.2 | HTTP 409 if category has tickets; `active=false` hides without deletion | ✅ AC: HTTP 409 with error message if tickets exist; `active=false` hides from public lists | |
| US-10.3 | `ordering` non-negative int; FK blocks deletion of referenced groups | ✅ AC: `name` required max 50; `ordering` non-negative int; FK constraint blocks deletion | |
| US-10.4 | `name` unique; deletion blocked if referenced | ✅ AC: `name` unique max 128; `defaultPerson_id` must exist; deletion blocked if referenced by categories or people | |
| US-10.5 | `department_categories` POST/DELETE/GET; duplicate rejected | ✅ AC: POST/DELETE/GET at `/departments/:deptId/categories`; duplicate associations rejected (PK constraint) | |
| US-10.6 | Override template takes precedence over `actions.template` | ✅ AC: `category_action_responses` upsert; override template takes precedence when record exists | |
| US-11.1 | `username` unique; `role` validated; HTTP 409 if referenced | ✅ AC: `username` unique; `role` null or `'staff'`; people referenced by tickets/clients/bookmarks cannot be deleted | |
| US-11.2 | RFC 5322 validation; `usedForNotifications` flag; HTTP 409 on duplicate email | ✅ AC: POST/PUT/DELETE at `/people/:personId/emails`; RFC 5322 validation; HTTP 409 on duplicate email | |
| US-11.3 | Phone and address label validated; standard CRUD | ✅ AC: phone label from allowed set; address label from allowed set; POST/PUT/DELETE at respective endpoints | |
| US-11.4 | Search across firstname/lastname/email/username; `role` + `department_id` filter | ✅ AC: `GET /people/search?q=...`; min 2 chars; matches across 4 fields; `role` and `department_id` filters | |
| US-11.5 | `GET /users` returns `role='staff'` people; HTTP 403 for non-staff | ✅ AC: returns people where `role='staff'`; includes department, username, emails; HTTP 403 for non-staff | |
| US-11.6 | New key live immediately; revoked key rejected immediately; no restart | ✅ AC: `api_key` unique max 50; new key immediately usable; no restart required; HTTP 403 if referenced by tickets on delete | |
| US-12.1 | `POST /bookmarks` with `name` + `requestUri`; scoped to creator; anonymous HTTP 401 | ✅ AC: `requestUri` required, starts with `/`; scoped to `currentUser.id`; HTTP 401 for anonymous | |
| US-12.2 | `GET /bookmarks` returns only own bookmarks ordered `id DESC` | ✅ AC: returns only `person_id=currentUser.id`; ordered by `id DESC`; HTTP 401 for anonymous | |
| US-12.3 | Owner-only delete; other-user bookmark returns HTTP 404 | ✅ AC: HTTP 204 on success; only owner can delete; other-user returns HTTP 404 | |
| US-12.4 | Client-side redirect to `requestUri`; live Solr index (no cache) | ✅ AC: client-side redirect; no server-side recall endpoint; results from current live Solr index | |
| US-13.1 | `GET /metrics` with ≤ 5-min staleness; staff-only | ✅ AC: returns `openCount`, `closedCount`, `totalCount`, `avgResolutionDays`, `byCategory`, `byDepartment`; staleness ≤ 5 min; HTTP 403 non-staff | |
| US-13.2 | Filtered report CSV matches HTML view; paginated; staff-only | ✅ AC: filters: `start_date`, `end_date`, `status`, `category_id`, `department_id`; CSV matches HTML view; HTTP 403 non-staff | |
| US-14.1 | GELF logs method, path, statusCode, durationMs, `_request_id` per request | ✅ AC: `GelfRequestMiddleware` logs on start and completion; `_request_id` UUID per request; GELF transport via env vars | |
| US-14.2 | Global exception filter logs ERROR with stack trace; `_request_id` + `_user_id` | ✅ AC: global exception filter; `short_message` + `full_message` (stack trace); GELF level mapping defined | |
| US-14.3 | `_ticket_id`, `_user_id`, `_request_id` in GELF structured fields | ✅ AC: `_ticket_id` on ticket operations; `_user_id` for authenticated requests; `_request_id` propagated | |
| US-15.1 | Seed sub-statuses present; referenced sub-statuses cannot be deleted | ✅ AC: seed rows present (Resolved/closed, Duplicate/closed, Bogus/closed); `name` max 25; referenced sub-statuses cannot be deleted | |
| US-15.2 | 10 system actions seeded; system action names immutable; department actions extensible | ✅ AC: 10 system actions seeded; `type='system'` names immutable; `type='department'` actions creatable/deletable | |
| US-15.3 | Seed issue types present; referenced types cannot be deleted | ✅ AC: 6 seed issue types; `name` max 128; referenced issue types cannot be deleted | |
| US-15.4 | Seed contact methods present; referenced methods cannot be deleted | ✅ AC: 4 seed contact methods; `name` max 128; referenced methods cannot be deleted | |

> **Alignment result: 79/79 stories have NaC directly derivable from and aligned with their formal acceptance criteria. No gaps or misalignments found.**

---

*STORY-MAP generated: 2026-06-23 | Derived from PERSONAS, JTBD, JOURNEYS, UserStories, PRD — uReport | Model: claude-sonnet-4-6*
