# FRD — uReport Re-Platform
**Project:** uReport  
**Acronym:** uReport  
**Version:** 1.0  
**Date:** 2026-06-23  
**Status:** Draft  
**Based on:** PRD-uReport.md v1.0  

---

## Scope

This Functional Requirements Document specifies the exact behavior — inputs, outputs, validation rules, error states, API surface, and database schema — for all 16 features of the uReport re-platform from PHP/MySQL to Node.js/TypeScript/NestJS/PostgreSQL. The primary goal is 100% feature and behavior parity with the legacy PHP application, including byte-compatible Open311 GeoReport v2 API responses and identical content-negotiation output across all five supported formats.

---

## How to Read This Document

- **Feature IDs** follow PRD numbering: `F00` through `F15`.
- **Cross-feature references** use the notation `see F03 §Process` or `see Y1-api.md §Open311`.
- **HTTP status codes** are the canonical response codes; deviations from these are bugs.
- **"byte-compatible"** means JSON/XML/CSV/TXT responses are character-for-character identical to the legacy PHP output for the same input fixture.
- **DDL** for all entities is consolidated in `Y0-schema.md`. Per-feature schema sections list affected tables only.
- **REST endpoints** are consolidated in `Y1-api.md`. Per-feature API sections list the endpoint signature only.
- **Error codes** are consolidated in `Y2-errors.md`. Per-feature error tables list the common-path errors only.

---

## Table of Contents

### Feature Chunks
- [F00: Open311 GeoReport v2 REST API](F00-open311-api.md)
- [F01: Ticket Lifecycle Management](F01-ticket-lifecycle.md)
- [F02: Role-Based Access Control (RBAC)](F02-rbac.md)
- [F03: Content Negotiation & Multi-Format Serialization](F03-content-negotiation.md)
- [F04: OIDC Authentication](F04-oidc-auth.md)
- [F05: Full-Text Search via Apache Solr](F05-solr-search.md)
- [F06: MySQL-to-PostgreSQL Schema Migration](F06-schema-migration.md)
- [F07: Email Notifications](F07-email.md)
- [F08: Media & Attachment Management](F08-media.md)
- [F09: Geo-Clustering of Ticket Locations](F09-geo-clustering.md)
- [F10: Category & Department Administration](F10-category-dept-admin.md)
- [F11: People & API Client Management](F11-people-clients.md)
- [F12: Bookmarked Searches](F12-bookmarks.md)
- [F13: Reporting & Metrics](F13-reporting.md)
- [F14: Structured Logging via GELF/Graylog](F14-logging.md)
- [F15: Sub-Status & Action Reference Data](F15-substatus-actions.md)

### Cross-Feature Chunks
- [Y0: Database Schema (PostgreSQL DDL)](Y0-schema.md)
- [Y1: REST API Endpoints Catalog](Y1-api.md)
- [Y2: Error Catalog](Y2-errors.md)
- [Y3: External Integration Points](Y3-integrations.md)

---

## Cross-Cutting Terminology

| Term | Definition |
|------|-----------|
| **Ticket** | A service request submitted by a citizen or entered by staff; the core entity of uReport |
| **Category** | A service category (e.g., "Pothole", "Graffiti") that classifies tickets and routes them to a department |
| **Department** | A city department (e.g., Public Works) that owns categories and receives tickets |
| **Person** | Any individual in the system — citizen, staff, or API contact; stored in the `people` table |
| **Staff** | Authenticated city employee with `role = 'staff'` or higher in `people.role` |
| **Public** | Authenticated citizen (OIDC login, no staff role) |
| **Anonymous** | Unauthenticated request — no session, no identity |
| **Action** | A typed event logged to `ticketHistory` (open, assignment, closed, comment, etc.) |
| **Sub-status** | A qualifying status for closed tickets: Resolved, Duplicate, or Bogus |
| **api_key** | 50-character token in the `clients` table authenticating Open311 API write access |
| **GeoReport v2** | The Open311 GeoReport v2 specification defining the public REST API contract |
| **CASL** | The NestJS CASL library replacing Laminas ACL for attribute-based access control |
| **Serialization Interceptor** | NestJS global interceptor that converts controller return values to HTML/JSON/XML/CSV/TXT |
| **PostGIS** | PostgreSQL spatial extension replacing MySQL `POINT SRID 0` |
| **Prisma** | The ORM layer generating type-safe queries from `schema.prisma` |
| **OIDC** | OpenID Connect — the authentication protocol used for citizen and staff login |
| **ticketHistory** | Audit trail table — every state change, comment, and action on a ticket is appended here |
| **permissionLevel** | One of `'staff'`, `'public'`, `'anonymous'` — controls visibility and posting rights per category |
| **contactMethod** | How a ticket was submitted: Email, Phone, Web Form, Other |
| **issueType** | The nature of the request: Comment, Complaint, Question, Report, Request, Violation |
| **Geo-cluster** | A pre-computed spatial cluster assigned to a ticket at one of 7 zoom levels (0–6) |
| **SLA days** | Service Level Agreement: number of business days target for ticket resolution per category |

---

## Conventions

- All timestamps stored as UTC; displayed in local timezone per UI locale.
- Boolean columns use PostgreSQL `BOOLEAN` (not `TINYINT(1)`).
- All string inputs are trimmed of leading/trailing whitespace before validation.
- Foreign key IDs use unsigned integers mapped to PostgreSQL `INTEGER` (or `SERIAL`/`IDENTITY`).
- `lastModified` on `tickets` is updated on every write operation (trigger or service-layer).
- HTTP `401 Unauthorized` is returned when authentication is required but absent.
- HTTP `403 Forbidden` is returned when the authenticated user lacks permission.
- HTTP `404 Not Found` is returned when an entity does not exist or is not visible to the caller's role.
- The `Accept` header is evaluated before the URL suffix for format negotiation.

---

*FRD generated: 2026-06-23 | Model: claude-sonnet-4-6*
---

## F00: Open311 GeoReport v2 REST API

**Description:** The Open311 GeoReport v2 API is the primary public interface of uReport, used by mobile apps, city portals, and third-party integrators. All routes, HTTP verbs, query parameters, status codes, and response bodies must be byte-compatible with the legacy PHP implementation. This feature is non-negotiable — external consumers must require zero changes after the re-platform.

**Terminology:**
- **GeoReport v2:** The Open311 standard defining the REST contract (see https://wiki.open311.org/GeoReport_v2)
- **service_code:** The category ID used in the Open311 API (maps to `categories.id`)
- **service_request_id:** The ticket ID returned to API consumers (maps to `tickets.id`)
- **token:** A submission token returned by `POST /requests`; can be exchanged for the `service_request_id` via `GET /tokens/:token`
- **api_key:** Client authentication token from `clients.api_key`; required for `POST /requests`
- **jurisdiction_id:** Optional GeoReport v2 parameter; ignored in this implementation but accepted without error

**Sub-features:**
- `GET /open311/v2/services` — list all visible service categories
- `GET /open311/v2/services/:id` — single service definition with custom attribute definitions
- `POST /open311/v2/requests` — submit a new service request ticket
- `GET /open311/v2/requests` — query service requests with filters
- `GET /open311/v2/requests/:id` — retrieve a single request
- `GET /open311/v2/tokens/:token` — look up request ID by submission token
- Format negotiation via `Accept` header or `.json` / `.xml` URL suffix

---

### F00.1 GET /open311/v2/services[.json|.xml]

**Process:**
1. Resolve requested format from URL suffix or `Accept` header (see F03).
2. Load all `categories` where `active = TRUE` AND `displayPermissionLevel` is visible to the caller's role (see F02).
3. For each category, build a `Service` object per GeoReport v2 spec.
4. Return array of Service objects in the negotiated format.

**Inputs:**
- `jurisdiction_id` (string, optional): accepted, ignored
- `format` suffix: `.json` or `.xml` (optional; defaults to JSON)

**Outputs:**
- Array of Service objects, each containing:
  - `service_code` (integer): category `id`
  - `service_name` (string): category `name`
  - `description` (string): category `description`
  - `metadata` (boolean): `true` if `customFields` is non-null and non-empty
  - `type` (string): always `"realtime"` 
  - `keywords` (string): empty string
  - `group` (string): `categoryGroups.name` for the category's group

**Validation:**
- No required inputs; all filters are optional.
- If `jurisdiction_id` is provided with an unrecognized value, still returns results (ignore).

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Internal server error | 500 | SERVER_ERROR | "Internal server error" |

---

### F00.2 GET /open311/v2/services/:id[.json|.xml]

**Process:**
1. Load category by `id`; apply permission check for caller's role.
2. If not found or not visible, return 404.
3. Build `ServiceDefinition` object including `attributes` array from parsed `customFields` JSON.
4. Return ServiceDefinition in negotiated format.

**Inputs:**
- `id` (integer, required): category ID (URL path parameter)

**Outputs:**
- ServiceDefinition object:
  - All fields from GET /services list item
  - `attributes` (array): custom field definitions, each with:
    - `variable` (boolean)
    - `code` (string): field key
    - `datatype` (string): `string`, `number`, `datetime`, `singlevaluelist`, `multivaluelist`
    - `required` (boolean)
    - `datatype_description` (string)
    - `order` (integer)
    - `description` (string): label
    - `values` (array, for list types): `{key, name}` pairs

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Category not found | 404 | NOT_FOUND | "Service not found" |
| Category not visible to role | 404 | NOT_FOUND | "Service not found" |

---

### F00.3 POST /open311/v2/requests[.json|.xml]

**Process:**
1. Validate `api_key` against `clients` table; resolve `client_id` and `contactPerson_id`.
2. Validate required fields: `service_code`, at least one of (`lat`+`long`) or `address_string`.
3. Load category by `service_code`; check `postingPermissionLevel` allows anonymous posting (Open311 submissions are always anonymous-origin).
4. Resolve or create `people` record for submitter if `first_name`/`last_name`/`email`/`phone` supplied.
5. Create ticket record (see F01 §Create).
6. Generate submission token; store in `ticketHistory` as a `data` field on the `open` action entry.
7. Trigger `open` email notification (see F07).
8. Assign to geo-clusters if lat/lon provided (see F09).
9. Index ticket in Solr (see F05).
10. Return `service_request_id` and `token` in negotiated format.

**Inputs:**
- `api_key` (string, required): client API key
- `service_code` (integer, required): category ID
- `lat` (float, required if no address): latitude in decimal degrees WGS84
- `long` (float, required if no address): longitude in decimal degrees WGS84
- `address_string` (string, required if no lat/long): free-form address
- `address_id` (integer, optional): address service reference ID → `tickets.addressId`
- `description` (string, optional): ticket description → `tickets.description`
- `first_name` (string, optional): submitter first name
- `last_name` (string, optional): submitter last name
- `email` (string, optional): submitter email (creates/finds person record)
- `phone` (string, optional): submitter phone
- `device_id` (string, optional): ignored (accepted for compatibility)
- `media_url` (string, optional): URL to external media; stored in `ticketHistory.notes`
- `attribute[{code}]` (string, optional): custom field values; encoded in `tickets.customFields` JSON

**Outputs:**
- Array with one object:
  - `service_request_id` (integer): new ticket `id`
  - `token` (string): submission token for status polling
  - `service_notice` (string): empty string
  - `account_id` (string): empty string

**Validation:**
- `api_key` must exist in `clients` table; if missing or invalid → 403.
- `service_code` must reference an active category with `postingPermissionLevel = 'anonymous'`; otherwise → 404.
- Either (`lat` + `long`) or `address_string` must be provided; if neither → 400.
- `lat` must be in range [-90, 90]; `long` must be in range [-180, 180].
- `email` if provided must match RFC 5322 format.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Missing or invalid api_key | 403 | FORBIDDEN | "Invalid api_key" |
| Missing service_code | 400 | MISSING_PARAMETER | "service_code is required" |
| Invalid service_code | 404 | NOT_FOUND | "Service not found" |
| Missing location | 400 | MISSING_PARAMETER | "lat and long or address_string required" |
| Invalid lat/long range | 400 | INVALID_INPUT | "Coordinates out of range" |

---

### F00.4 GET /open311/v2/requests[.json|.xml]

**Process:**
1. Resolve format from suffix or `Accept` header.
2. Apply permission filter: only return tickets from categories visible at the caller's role level (see F02).
3. Build query from filter parameters; apply to `tickets` table via Prisma.
4. Paginate results (`page`, `page_size`; default page_size = 100, max = 500).
5. Return array of ServiceRequest objects in negotiated format.

**Inputs:**
- `status` (string, optional): `open` or `closed`; default = `open`
- `service_code` (integer, optional): filter by category
- `service_request_id` (comma-separated integers, optional): filter by specific IDs
- `start_date` (ISO 8601 datetime, optional): filter by `enteredDate >=`
- `end_date` (ISO 8601 datetime, optional): filter by `enteredDate <=`
- `lat` (float, optional): center latitude for radius search
- `long` (float, optional): center longitude for radius search
- `radius` (integer, optional): search radius in meters (requires lat+long)
- `page` (integer, optional): 1-based page number; default = 1
- `page_size` (integer, optional): results per page; default = 100; max = 500
- `jurisdiction_id` (string, optional): ignored

**Outputs:**
- Array of ServiceRequest objects, each containing:
  - `service_request_id` (integer)
  - `status` (string): `open` or `closed`
  - `status_notes` (string): substatus description if closed
  - `service_name` (string): category name
  - `service_code` (integer): category id
  - `description` (string)
  - `agency_responsible` (string): department name
  - `service_notice` (string): empty
  - `requested_datetime` (ISO 8601): `enteredDate`
  - `updated_datetime` (ISO 8601): `lastModified`
  - `expected_datetime` (ISO 8601 or null): `enteredDate + slaDays` if set
  - `address` (string): `tickets.location`
  - `address_id` (string): `tickets.addressId`
  - `zipcode` (string): `tickets.zip`
  - `lat` (float): `tickets.latitude`
  - `long` (float): `tickets.longitude`
  - `media_url` (string or null): URL to first media attachment if any

**Validation:**
- `status` must be `open` or `closed` if provided; otherwise → 400.
- `start_date` and `end_date` must be valid ISO 8601 if provided.
- Radius search requires both `lat` and `long`.
- `page_size` capped at 500; values above 500 are silently clamped.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Invalid status value | 400 | INVALID_INPUT | "status must be 'open' or 'closed'" |
| Invalid date format | 400 | INVALID_INPUT | "Invalid date format; use ISO 8601" |
| Radius without coordinates | 400 | MISSING_PARAMETER | "lat and long required for radius search" |

---

### F00.5 GET /open311/v2/requests/:id[.json|.xml]

**Process:**
1. Load ticket by `id`.
2. Check category visibility for caller's role; if not visible → 404.
3. Build ServiceRequest object (same schema as list items above).
4. Return single-element array in negotiated format (GeoReport v2 spec wraps single results in an array).

**Inputs:**
- `id` (integer, required): ticket ID

**Outputs:**
- Array with one ServiceRequest object (identical schema to GET /requests list items)

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Ticket not found | 404 | NOT_FOUND | "Service request not found" |
| Ticket not visible to role | 404 | NOT_FOUND | "Service request not found" |

---

### F00.6 GET /open311/v2/tokens/:token[.json|.xml]

**Process:**
1. Look up the token in `ticketHistory.data` where action is `open`; extract `service_request_id`.
2. If not found, return 404.
3. Return token-to-ID mapping object.

**Inputs:**
- `token` (string, required): submission token returned by `POST /requests`

**Outputs:**
- Array with one object:
  - `token` (string): the input token
  - `service_request_id` (integer): ticket ID

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Token not found | 404 | NOT_FOUND | "Token not found" |

---

**API Surface (this feature):** see `Y1-api.md` §Open311 for full request/response schemas and example payloads.

**Schema Surface (this feature):** reads from `categories`, `tickets`, `ticketHistory`, `clients`, `people`, `departments`, `categoryGroups`, `media` — see `Y0-schema.md`.
---

## F01: Ticket Lifecycle Management

**Description:** Tickets are the core entity of uReport. The full lifecycle — creation, assignment, status updates, closure, duplication, re-opening, and commenting — must be preserved with identical business rules, audit trail entries, and notification triggers. Every state change must be immutably recorded in `ticketHistory`.

**Terminology:**
- **Ticket status:** `open` or `closed` (stored in `tickets.status`)
- **Sub-status:** Qualifying closure reason: Resolved, Duplicate, or Bogus (stored in `tickets.substatus_id`)
- **Action:** A typed event appended to `ticketHistory` on each state change
- **parent_id:** Links a duplicate ticket to its canonical parent
- **lastModified:** Timestamp on `tickets` updated on every write — drives `updated_datetime` in the Open311 API
- **enteredDate:** Immutable creation timestamp on `tickets`
- **SLA days:** `categories.slaDays` — target days to resolution; used to compute `expected_datetime` in Open311 output

**Sub-features:**
- Create ticket (staff entry or Open311 submission)
- Assign ticket to a person within the department
- Update ticket (description, category change, location change, custom fields)
- Close ticket (with sub-status selection)
- Mark as duplicate (link to parent ticket)
- Add comment (staff-only free-text note)
- Add response (contact-the-reporter action)
- Re-open ticket (change status back to `open`)
- View ticket history

---

### F01.1 Create Ticket

**Process:**
1. Validate all required inputs (see Validation below).
2. Load category by `category_id`; verify `postingPermissionLevel` allows the caller's role.
3. Resolve `reportedByPerson_id`: look up or create a `people` record if contact info provided.
4. Set `enteredByPerson_id` = authenticated user `id` (or `client.contactPerson_id` for API submissions).
5. Set `status = 'open'`, `enteredDate = NOW()`, `lastModified = NOW()`.
6. Persist ticket to `tickets` table.
7. Append `open` action entry to `ticketHistory`.
8. If lat/lon provided, assign geo-clusters (see F09).
9. Index ticket in Solr (see F05).
10. Send `open` email notification (see F07).
11. Return created ticket.

**Inputs:**
- `category_id` (integer, required): service category
- `issueType_id` (integer, optional): issue type reference
- `description` (text, optional): free-text description
- `location` (string, optional): address display string
- `city` (string, optional)
- `state` (string, optional)
- `zip` (string, optional): max 40 chars
- `latitude` (double precision, optional): WGS84 decimal degrees
- `longitude` (double precision, optional): WGS84 decimal degrees
- `addressId` (integer, optional): external address service reference ID
- `contactMethod_id` (integer, optional): how the ticket was submitted
- `responseMethod_id` (integer, optional): preferred response method
- `reportedByPerson_id` (integer, optional): existing person reference
- `customFields` (JSON text, optional): custom field values per category definition
- `additionalFields` (string max 255, optional): extra location fields from address service

**Outputs:**
- Created `tickets` record with all fields populated
- `ticketHistory` entry for the `open` action

**Validation:**
- `category_id` must reference an active category.
- Caller's role must meet or exceed `categories.postingPermissionLevel`.
- `latitude` must be in [-90, 90] if provided; `longitude` in [-180, 180].
- `zip` must be ≤ 40 characters.
- `description` length: no hard limit (stored as `text`); front-end recommends ≤ 4000 chars.
- `customFields` must be valid JSON if provided.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Invalid category_id | 404 | NOT_FOUND | "Category not found" |
| Insufficient permission | 403 | FORBIDDEN | "Insufficient permission to post to this category" |
| Invalid coordinates | 400 | INVALID_INPUT | "Coordinates out of valid range" |
| Invalid customFields JSON | 400 | INVALID_INPUT | "customFields must be valid JSON" |

---

### F01.2 Assign Ticket

**Process:**
1. Load ticket; verify caller has `staff` role (see F02).
2. Validate `assignedPerson_id` references a person in the ticket's category's department.
3. Update `tickets.assignedPerson_id`, set `tickets.lastModified = NOW()`.
4. Append `assignment` action to `ticketHistory` with `actionPerson_id = assignedPerson_id`.
5. Send `assignment` email notification (see F07).

**Inputs:**
- `ticket_id` (integer, required): ticket to assign
- `assignedPerson_id` (integer, required): person to assign to

**Validation:**
- `assignedPerson_id` must reference an active person.
- Person must belong to a department associated with the ticket's category.
- Caller must be `staff`.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Person not in department | 400 | INVALID_INPUT | "Assignee must belong to the ticket's department" |
| Not staff | 403 | FORBIDDEN | "Staff access required" |

---

### F01.3 Update Ticket

**Process:**
1. Load ticket; verify caller has `staff` role.
2. Determine which fields changed; log appropriate action(s):
   - Category change → `changeCategory` action with `data = {original: category_id, updated: new_category_id}`
   - Location change → `changeLocation` action with `data = {original: location, updated: new_location}`
   - Other field change → `update` action
3. Apply changes to `tickets` record; set `lastModified = NOW()`.
4. Re-index ticket in Solr.
5. If lat/lon changed, re-assign geo-clusters.

**Inputs:**
- `ticket_id` (integer, required)
- Any updatable field: `category_id`, `issueType_id`, `description`, `location`, `city`, `state`, `zip`, `latitude`, `longitude`, `customFields`, `additionalFields`

**Validation:**
- Same field validation rules as Create.
- `category_id` must exist and caller's role must allow access to the new category.

---

### F01.4 Close Ticket

**Process:**
1. Load ticket; verify caller has `staff` role.
2. Validate `substatus_id` is provided and has `status = 'closed'`.
3. Set `tickets.status = 'closed'`, `tickets.substatus_id`, `tickets.closedDate = NOW()`, `lastModified = NOW()`.
4. Append `closed` action to `ticketHistory`.
5. Send `closed` email notification (see F07).
6. Re-index ticket in Solr.

**Inputs:**
- `ticket_id` (integer, required)
- `substatus_id` (integer, required): must be a sub-status with `status = 'closed'`
- `notes` (text, optional): closure notes appended to `ticketHistory.notes`

**Validation:**
- `substatus_id` must exist and have `status = 'closed'`.
- Ticket must currently be `open`.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Already closed | 409 | CONFLICT | "Ticket is already closed" |
| Invalid substatus | 400 | INVALID_INPUT | "substatus_id must reference a closed sub-status" |

---

### F01.5 Mark as Duplicate

**Process:**
1. Load ticket (child); verify caller has `staff` role.
2. Load parent ticket by `parent_id`; must be a different ticket.
3. Set `tickets.parent_id` on child ticket.
4. Close child ticket with `substatus = Duplicate`.
5. Append `duplicate` action to `ticketHistory` of **parent** ticket with `data = {duplicate: child_ticket_id}`.
6. Send `duplicate` email notification.

**Inputs:**
- `ticket_id` (integer, required): the duplicate ticket
- `parent_id` (integer, required): the canonical parent ticket

**Validation:**
- `parent_id` must reference a different ticket (not itself).
- Child ticket must not already have a `parent_id` set.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Self-reference | 400 | INVALID_INPUT | "A ticket cannot be its own parent" |
| Parent not found | 404 | NOT_FOUND | "Parent ticket not found" |

---

### F01.6 Add Comment

**Process:**
1. Verify caller has `staff` role.
2. Append `comment` action to `ticketHistory` with `notes` = comment text.
3. Set `tickets.lastModified = NOW()`.

**Inputs:**
- `ticket_id` (integer, required)
- `notes` (text, required): comment body

**Validation:**
- `notes` must be non-empty.
- Caller must be `staff`.

---

### F01.7 Add Response

**Process:**
1. Verify caller has `staff` role.
2. Append `response` action to `ticketHistory` with `actionPerson_id` = person contacted (typically `reportedByPerson_id`).
3. Set `tickets.lastModified = NOW()`.
4. Send `response` email notification (see F07).

**Inputs:**
- `ticket_id` (integer, required)
- `notes` (text, optional): response content
- `actionPerson_id` (integer, optional): person contacted; defaults to `reportedByPerson_id`

---

### F01.8 Re-open Ticket

**Process:**
1. Verify caller has `staff` role.
2. Set `tickets.status = 'open'`, clear `tickets.closedDate`, clear `tickets.substatus_id`.
3. Set `tickets.lastModified = NOW()`.
4. Append `update` action to `ticketHistory` with notes indicating re-open.
5. Re-index ticket in Solr.

**Inputs:**
- `ticket_id` (integer, required)
- `notes` (text, optional): re-open reason

**Validation:**
- Ticket must currently be `closed`.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Already open | 409 | CONFLICT | "Ticket is already open" |

---

### F01.9 View Ticket History

**Process:**
1. Load all `ticketHistory` rows for `ticket_id`, ordered by `enteredDate ASC`.
2. Apply role-based PII filtering: anonymous callers must not see `enteredByPerson_id`, `reportedByPerson_id`, or personal contact information.
3. Return history entries in negotiated format.

**Inputs:**
- `ticket_id` (integer, required)

**Outputs:**
- Array of `ticketHistory` entries, each with:
  - `id`, `action_id`, `action.name`, `enteredDate`, `actionDate`, `notes`, `data`, `sentNotifications`
  - `enteredByPerson` (object, staff-only): `{id, firstname, lastname}`
  - `actionPerson` (object, staff-only): `{id, firstname, lastname}`

---

**API Surface (this feature):** see `Y1-api.md` §Tickets.

**Schema Surface (this feature):** uses `tickets`, `ticketHistory`, `categories`, `people`, `substatus`, `actions` — see `Y0-schema.md`.
---

## F02: Role-Based Access Control (RBAC)

**Description:** uReport enforces three permission levels on every route, category, and data field. The NestJS CASL guard layer must reproduce the Laminas ACL rule set exactly — with no privilege creep or regression — so that every allow/deny decision is identical to the legacy PHP system. This is a hard security requirement: failing to enforce these rules constitutes a bug.

**Terminology:**
- **Role:** The string stored in `people.role`; one of `null` (no role = public/citizen), `'staff'`
- **Permission level:** `'anonymous'`, `'public'`, or `'staff'` — used on `categories.displayPermissionLevel` and `categories.postingPermissionLevel`
- **CASL Ability:** A CASL `defineAbility` block that encodes what a role can do on each subject
- **Subject:** A CASL term for the resource type being protected (e.g., `'Ticket'`, `'Category'`, `'Person'`)
- **Guard:** A NestJS `@UseGuards()` decorator applied at controller or route level

**Sub-features:**
- Anonymous access rules (unauthenticated requests)
- Public access rules (authenticated citizens)
- Staff access rules (city employees)
- Category-level permission filter (display + posting)
- PII field masking for non-staff callers
- CASL ability definitions per role
- NestJS guard integration

---

### F02.1 Role Hierarchy

Roles are strictly ordered: `anonymous < public < staff`.

| Role | Authentication Required | `people.role` value |
|------|------------------------|---------------------|
| Anonymous | No | (no session) |
| Public | Yes (OIDC login) | `null` or absent |
| Staff | Yes (OIDC login) | `'staff'` |

A request with a valid session but `people.role = null` is treated as `public`.

---

### F02.2 Anonymous Access Rules

Anonymous callers (no session) may:
- `GET /open311/v2/services` — categories where `displayPermissionLevel = 'anonymous'`
- `GET /open311/v2/services/:id` — if `displayPermissionLevel = 'anonymous'`
- `GET /open311/v2/requests` — tickets in categories where `displayPermissionLevel = 'anonymous'`
- `GET /open311/v2/requests/:id` — if ticket's category has `displayPermissionLevel = 'anonymous'`
- `POST /open311/v2/requests` — to categories where `postingPermissionLevel = 'anonymous'`
- `GET /open311/v2/tokens/:token` — always allowed (token lookup)

Anonymous callers must **not**:
- See PII fields: `reportedByPerson_id`, `enteredByPerson_id`, `assignedPerson_id`, personal contact details
- Access any admin endpoints (categories, departments, people, actions, etc.)
- Upload media attachments
- Create bookmarks

---

### F02.3 Public Access Rules

Authenticated citizens (valid OIDC session, `role = null`) may do everything anonymous callers may, plus:
- View tickets/categories where `displayPermissionLevel IN ('public', 'anonymous')`
- Submit tickets to categories where `postingPermissionLevel IN ('public', 'anonymous')`
- View their own ticket history (tickets where `reportedByPerson_id = currentUser.id`)
- Manage their own bookmarks (`bookmarks` where `person_id = currentUser.id`)
- View and edit their own `people` record

Public callers must **not**:
- See other users' PII
- Access staff-only admin endpoints
- Assign, close, comment, or add responses to tickets

---

### F02.4 Staff Access Rules

Authenticated staff (`role = 'staff'`) may do everything public callers may, plus:
- View all tickets and categories regardless of `displayPermissionLevel`
- View all PII fields on tickets and people records
- Create/update/close/assign/duplicate/comment/respond on any ticket
- Manage categories, category groups, departments, department associations
- Manage people records (all users)
- Manage API clients
- Manage actions, sub-statuses, issue types, contact methods
- View and export reports and metrics
- Manage all bookmarks (their own; not others')

---

### F02.5 Category Permission Filtering

**Display filter (applied on all list/detail reads):**
- Anonymous: `WHERE categories.displayPermissionLevel = 'anonymous'`
- Public: `WHERE categories.displayPermissionLevel IN ('public', 'anonymous')`
- Staff: no filter (all categories visible)

**Posting filter (applied on ticket create):**
- Anonymous: `WHERE categories.postingPermissionLevel = 'anonymous'`
- Public: `WHERE categories.postingPermissionLevel IN ('public', 'anonymous')`
- Staff: no filter (can create ticket in any category)

The same filter applies transitively to tickets: a ticket is only visible if its category is visible to the caller's role.

---

### F02.6 CASL Ability Definitions

The NestJS module `AbilityFactory` must produce the following ability rules per role:

**Anonymous ability:**
```typescript
can('read', 'Category', { displayPermissionLevel: { $in: ['anonymous'] } })
can('read', 'Ticket', { category: { displayPermissionLevel: { $in: ['anonymous'] } } })
can('create', 'Ticket', { category: { postingPermissionLevel: 'anonymous' } })
can('read', 'Token')
```

**Public ability (extends anonymous):**
```typescript
can('read', 'Category', { displayPermissionLevel: { $in: ['anonymous', 'public'] } })
can('read', 'Ticket', { category: { displayPermissionLevel: { $in: ['anonymous', 'public'] } } })
can('create', 'Ticket', { category: { postingPermissionLevel: { $in: ['anonymous', 'public'] } } })
can('manage', 'Bookmark', { person_id: currentUser.id })
can('read', 'Person', { id: currentUser.id })
can('update', 'Person', { id: currentUser.id })
```

**Staff ability:**
```typescript
can('manage', 'all')
```

---

### F02.7 NestJS Guard Integration

- `CaslGuard` is a NestJS guard (`@Injectable() implements CanActivate`) that:
  1. Resolves the authenticated user from the session (or marks as anonymous).
  2. Calls `AbilityFactory.createForUser(user)` to get the CASL `Ability` instance.
  3. Reads the required permission from route metadata (via `@CheckAbilities()` decorator).
  4. Returns `true` if `ability.can(action, subject)` is true; otherwise throws `ForbiddenException`.
- All controller methods are decorated with `@UseGuards(CaslGuard)` and `@CheckAbilities({action, subject})`.
- Permission-level filtering (category visibility) is applied in the service layer, not the guard — the guard only enforces route-level access.

---

### F02.8 PII Masking

For non-staff callers, the serialization layer (see F03) must omit or null-out the following fields:
- `tickets.reportedByPerson_id` and associated person object
- `tickets.enteredByPerson_id` and associated person object
- `ticketHistory.enteredByPerson_id`
- `ticketHistory.actionPerson_id`
- Any `people` record's contact details (email, phone, address) except when viewing own record

---

**API Surface (this feature):** RBAC is enforced on all endpoints; no dedicated RBAC endpoints exist. See `Y1-api.md` for per-endpoint permission annotations.

**Schema Surface (this feature):** uses `people.role`, `categories.displayPermissionLevel`, `categories.postingPermissionLevel` — see `Y0-schema.md`.
---

## F03: Content Negotiation & Multi-Format Serialization

**Description:** Every endpoint in uReport supports five response formats: HTML, JSON, XML, CSV, and plain text. The legacy system used ~187 PHP `.inc` partial templates for this. The new system replaces this with a single NestJS `SerializationInterceptor` that converts controller return values into the requested format — eliminating per-controller format logic entirely. All five output formats must be byte-compatible with the legacy PHP output for identical input fixtures.

**Terminology:**
- **SerializationInterceptor:** NestJS global interceptor that wraps all controller responses
- **Negotiated format:** The resolved output format after evaluating suffix, `format` param, and `Accept` header
- **Format suffix:** File-extension-style URL suffix (`.json`, `.xml`, `.csv`, `.txt`) that overrides headers
- **Accept header:** Standard HTTP `Accept` header for format preference (`application/json`, `application/xml`, `text/csv`, `text/plain`, `text/html`)

**Sub-features:**
- Format resolution via URL suffix, `format` query parameter, and `Accept` header (in priority order)
- JSON serialization with legacy-compatible field names and null semantics
- XML serialization with legacy-compatible tag names and CDATA wrapping
- CSV serialization with legacy-compatible column order, quoting, and row structure
- TXT (plain text) serialization matching legacy plaintext feed output
- HTML rendering via server-side templates (Handlebars or Nunjucks)
- Global interceptor registration — no per-controller format handling

---

### F03.1 Format Resolution Priority

Format is resolved using the following priority order (highest first):

1. **URL suffix:** If the request path ends in `.json`, `.xml`, `.csv`, or `.txt`, use that format.
2. **`format` query parameter:** If `?format=json|xml|csv|txt` is present, use that format.
3. **`Accept` header:** Evaluate the `Accept` header using standard content-type negotiation:
   - `application/json` or `application/javascript` → JSON
   - `application/xml` or `text/xml` → XML
   - `text/csv` → CSV
   - `text/plain` → TXT
   - `text/html` → HTML
4. **Default:** If no format can be resolved, default to **JSON** for `/open311/v2/` routes and **HTML** for all other routes.

The resolved format is attached to the request context for use by the interceptor.

---

### F03.2 SerializationInterceptor

**Process:**
1. Intercept the outgoing response value from the controller.
2. Read the resolved format from the request context.
3. Delegate to the appropriate serializer:
   - `JsonSerializer` → sets `Content-Type: application/json`
   - `XmlSerializer` → sets `Content-Type: application/xml`
   - `CsvSerializer` → sets `Content-Type: text/csv`
   - `TxtSerializer` → sets `Content-Type: text/plain`
   - `HtmlRenderer` → sets `Content-Type: text/html`
4. Write the serialized string to the HTTP response.

The interceptor must handle both array responses (lists) and single-object responses.

---

### F03.3 JSON Format Requirements

- Field names match legacy PHP field names exactly (camelCase as in the original).
- Null values are represented as `null` (not omitted, unless the legacy output omits them).
- Booleans are serialized as `true`/`false` (not `1`/`0`).
- Dates are ISO 8601 strings in UTC (e.g., `"2024-01-15T14:30:00Z"`).
- Arrays are always arrays — empty collections return `[]` not `null`.
- The Open311 API envelopes single results in an array (e.g., `GET /requests/:id` returns `[{...}]`).

---

### F03.4 XML Format Requirements

- Root element names match legacy PHP output.
- Child element tag names match field names exactly.
- CDATA wrapping used for `description`, `notes`, `template` fields (as in legacy).
- Empty elements rendered as `<tag/>` or `<tag></tag>` — match legacy output.
- `<?xml version="1.0" encoding="UTF-8"?>` declaration must be present.
- Attribute vs. child-element usage matches legacy per-endpoint output.

**Open311 XML envelopes:**
- `GET /services` → `<services><service>...</service></services>`
- `GET /requests` → `<service_requests><request>...</request></service_requests>`

---

### F03.5 CSV Format Requirements

- First row is a header row with column names matching legacy output.
- All string values are double-quoted.
- Newline within a field is represented as `\n` within the quoted string.
- Date columns use ISO 8601 format.
- Boolean columns use `1`/`0` (matching legacy CSV output).
- Encoding: UTF-8 with BOM (`\xEF\xBB\xBF`) for Excel compatibility (match legacy).
- `Content-Disposition: attachment; filename="{entity}-{date}.csv"` header set.

---

### F03.6 TXT Format Requirements

- Plaintext feed output matching legacy format.
- One record per line.
- Fields separated by tab character (`\t`).
- No header row.
- Match legacy field order exactly.

---

### F03.7 HTML Format Requirements

- Server-side templates (Handlebars or Nunjucks).
- Template file structure mirrors the existing PHP view hierarchy.
- Each controller maps to a template directory.
- Template variables match the controller data shape.
- The interceptor passes the controller return value to the template engine and writes the rendered HTML.
- HTML responses include the full page layout (header, navigation, footer) for browser requests.
- HTML responses for AJAX sub-requests return only the content partial.

---

### F03.8 Error Response Formats

Error responses must also be format-negotiated:
- JSON error: `{"description": "...", "error": "...", "statusCode": NNN}`
- XML error: `<error><description>...</description><code>NNN</code></error>`
- HTML error: rendered error page template
- CSV/TXT error: plain text message with HTTP status code

---

**API Surface (this feature):** Serialization is applied globally; no dedicated endpoints. The `Accept` header and `.format` suffix are honored on all routes.

**Schema Surface (this feature):** No database tables. Format resolution state is held in-memory per request.
---

## F04: OIDC Authentication

**Description:** uReport uses OpenID Connect for citizen and staff login. The new implementation uses `openid-client` to replace `facile-it/oidc-client`. The login flow, session behavior, callback handling, user-provisioning logic, and logout must be preserved exactly so existing SSO integrations are unaffected.

**Terminology:**
- **Authorization code flow:** The OIDC grant type used — redirect to IdP, receive `code`, exchange for tokens
- **state:** A random nonce stored in session before redirecting; validated on callback to prevent CSRF
- **nonce:** A random value embedded in the `id_token`; validated after token exchange
- **id_token:** JWT returned by the IdP containing user identity claims
- **claims:** User attributes in the `id_token`: `sub`, `email`, `given_name`, `family_name`
- **sub:** The IdP's stable user identifier (`openid-client` `sub` claim); mapped to `people.username`
- **Session:** NestJS session (cookie-based) storing authenticated user `id` and role

**Sub-features:**
- Initiate OIDC login (redirect to IdP)
- Handle OIDC callback (exchange code, provision user)
- Session management (store/read authenticated user)
- Logout (clear session, optional IdP end-session)
- Profile view/edit (own `people` record)

---

### F04.1 Login Initiation

**Process:**
1. Generate a cryptographically random `state` and `nonce` (UUID v4 each).
2. Store `state` and `nonce` in the server-side session.
3. Build the OIDC authorization URL using `openid-client`:
   - `response_type = code`
   - `scope = openid email profile`
   - `redirect_uri = OIDC_REDIRECT_URI`
   - `state` and `nonce` from step 1
4. Redirect the HTTP client to the IdP authorization URL (HTTP 302).

**Inputs:**
- None required. Optional `return_to` query parameter stores the post-login redirect URL in session.

**Configuration (environment variables):**
- `OIDC_ISSUER` (string, required): OIDC issuer URL (discovery endpoint base)
- `OIDC_CLIENT_ID` (string, required): registered client ID
- `OIDC_CLIENT_SECRET` (string, required): client secret
- `OIDC_REDIRECT_URI` (string, required): callback URL (must match IdP registration)

---

### F04.2 OIDC Callback

**Process:**
1. Receive `GET /auth/callback?code=...&state=...`.
2. Validate `state` matches value stored in session; if mismatch → 400.
3. Exchange authorization `code` for tokens using `openid-client`'s `callback()` method.
4. Validate `id_token` nonce matches session value.
5. Extract claims: `sub`, `email`, `given_name`, `family_name`.
6. Look up `people` record by `username = sub`:
   - If found: update `firstname`, `lastname` from claims if changed.
   - If not found: create new `people` record with `username = sub`, `firstname = given_name`, `lastname = family_name`.
7. Upsert `peopleEmails` record with `email` from claims (if not already present).
8. Store `person.id` and `person.role` in session.
9. Redirect to `return_to` URL from session (or default to `/`).

**Inputs (received from IdP):**
- `code` (string, required): authorization code
- `state` (string, required): must match session state

**Outputs:**
- Session populated with `{userId: person.id, role: person.role}`
- HTTP 302 redirect to post-login destination

**Validation:**
- `state` mismatch → 400 `INVALID_STATE`
- Token exchange failure (IdP error) → 502 `IDP_ERROR`
- `id_token` nonce mismatch → 400 `INVALID_NONCE`

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| state mismatch | 400 | INVALID_STATE | "Invalid state parameter" |
| nonce mismatch | 400 | INVALID_NONCE | "Invalid nonce in id_token" |
| IdP token endpoint error | 502 | IDP_ERROR | "Identity provider error" |
| Missing code parameter | 400 | MISSING_PARAMETER | "Authorization code required" |

---

### F04.3 Session Management

- Sessions are stored server-side (Redis or in-memory for development); session ID transmitted via `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
- Session data structure:
  ```typescript
  {
    userId: number;       // people.id
    role: string | null;  // people.role ('staff' or null)
    state?: string;       // ephemeral: OIDC state (cleared after callback)
    nonce?: string;       // ephemeral: OIDC nonce (cleared after callback)
    returnTo?: string;    // ephemeral: post-login redirect URL
  }
  ```
- Session expiry: configurable via `SESSION_TTL_SECONDS` env var (default: 3600).
- The `AuthGuard` middleware (NestJS guard or middleware) reads `session.userId` on every request and attaches the `people` record to `request.user`. If `userId` is absent, `request.user` is `null` (anonymous).

---

### F04.4 Logout

**Process:**
1. Destroy the server-side session.
2. Clear the session cookie on the response.
3. If `OIDC_END_SESSION_ENDPOINT` env var is set, redirect to the IdP end-session endpoint with `id_token_hint`.
4. Otherwise redirect to `/`.

**Inputs:**
- No required inputs. Session must be active.

---

### F04.5 Profile View & Edit

- `GET /account` — returns own `people` record (firstname, lastname, organization, address, emails, phones).
- `PUT /account` — updates own `people` record fields (not `role`, not `username`).
- Displayed and edited in all five formats via SerializationInterceptor (see F03).

---

**API Surface (this feature):** see `Y1-api.md` §Auth.

**Schema Surface (this feature):** uses `people`, `peopleEmails`, `peoplePhones`, `peopleAddresses` — see `Y0-schema.md`.
---

## F05: Full-Text Search via Apache Solr

**Description:** uReport uses Apache Solr for full-text ticket search with field-specific indexing, faceting, and result ranking. The existing Solarium (PHP) integration is replaced by a Node Solr client while preserving all query behavior, field mappings, index schema, and facet configuration. Result sets (same IDs, same order) must be identical to the legacy Solarium queries on the same indexed data.

**Terminology:**
- **Solarium:** The PHP Solr client library replaced by the Node Solr client
- **Field boost:** A multiplier applied to a Solr field's relevance score (e.g., `description^2`)
- **Facet:** An aggregated count grouped by field value (e.g., count of tickets per status)
- **DisMax / eDisMax:** Solr query parser for relevance ranking across multiple fields
- **Re-index:** Bulk indexing of all tickets into Solr (run on migration and on demand)
- **Incremental index:** Index a single ticket on create/update/close

**Sub-features:**
- Search endpoint accepting query string, filters, and pagination
- Query construction with field boosts and phrase matching
- Facets: category, status, department, assignee, date range
- Result ranking: relevance and date sort options
- Incremental indexing on ticket create/update/close
- Re-index script for bulk initial load
- Bookmark integration (saved search URLs)

---

### F05.1 Solr Index Schema

The following fields are indexed per ticket document. Field names must match the legacy schema exactly:

| Solr Field | Source | Type | Stored | Indexed |
|-----------|--------|------|--------|---------|
| `id` | `tickets.id` | integer | yes | yes |
| `status` | `tickets.status` | string | yes | yes |
| `description` | `tickets.description` | text_general | yes | yes |
| `category_id` | `tickets.category_id` | integer | yes | yes |
| `category_name` | `categories.name` | string | yes | yes |
| `department_id` | `categories.department_id` | integer | yes | yes |
| `department_name` | `departments.name` | string | yes | yes |
| `assignedPerson_id` | `tickets.assignedPerson_id` | integer | yes | yes |
| `enteredDate` | `tickets.enteredDate` | tdate | yes | yes |
| `lastModified` | `tickets.lastModified` | tdate | yes | yes |
| `location` | `tickets.location` | string | yes | yes |
| `city` | `tickets.city` | string | yes | yes |
| `latitude` | `tickets.latitude` | double | yes | yes |
| `longitude` | `tickets.longitude` | double | yes | yes |
| `substatus_id` | `tickets.substatus_id` | integer | yes | yes |
| `substatus_name` | `substatus.name` | string | yes | yes |
| `issueType_id` | `tickets.issueType_id` | integer | yes | yes |
| `customFields` | `tickets.customFields` | text_general | yes | yes |

---

### F05.2 Search Endpoint

`GET /search[.json|.xml|.csv|.txt|.html]`

**Process:**
1. Apply role-based category visibility filter (see F02) to restrict search to permitted categories.
2. Parse query parameters into a Solr query object.
3. Build eDisMax query with field boosts.
4. Apply filter queries for each active filter.
5. Configure facets (category, status, department, date ranges).
6. Execute query against Solr via Node Solr client.
7. Map Solr response to ticket result objects.
8. Return paginated results with facet counts in negotiated format.

**Inputs:**
- `q` (string, optional): full-text search query; default `*:*` (all)
- `status` (string, optional): `open` or `closed`
- `category_id` (integer, optional): filter by category
- `department_id` (integer, optional): filter by department
- `assignedPerson_id` (integer, optional): filter by assignee
- `start_date` (ISO 8601, optional): `enteredDate` range start
- `end_date` (ISO 8601, optional): `enteredDate` range end
- `sort` (string, optional): `relevance` (default) or `date`
- `page` (integer, optional): 1-based page; default 1
- `rows` (integer, optional): results per page; default 25; max 500

**Outputs:**
- `total` (integer): total matching documents
- `page` (integer): current page
- `rows` (integer): page size
- `results` (array): ticket summary objects with all indexed fields
- `facets` (object):
  - `categories`: `[{id, name, count}]`
  - `statuses`: `[{value, count}]`
  - `departments`: `[{id, name, count}]`

---

### F05.3 Query Construction

The eDisMax query is constructed as follows:
```
q.alt=*:*
qf=description^2 location^1.5 city^1 customFields^1
mm=75%
pf=description^4
```

- If `q` contains spaces, wrap in double quotes for phrase matching in `pf`.
- Wildcard: if `q` does not end in `*` and has no spaces, append `*` for prefix matching.
- Filter queries (fq) are ANDed:
  - `fq=status:{status}` if status filter active
  - `fq=category_id:{id}` if category filter active
  - `fq=department_id:{id}` if department filter active
  - `fq=assignedPerson_id:{id}` if assignee filter active
  - `fq=enteredDate:[{start} TO {end}]` if date range active
  - `fq=category_id:(id1 OR id2 OR ...)` role-visibility filter (see F02)

---

### F05.4 Incremental Indexing

Triggered automatically by the `TicketService` on:
- `create` — index new ticket after persistence
- `update` — re-index ticket after any field change
- `close` — re-index ticket after status change

The Solr document is built from a join of `tickets`, `categories`, `departments`, and `substatus` tables.

If Solr is unavailable, the indexing failure is logged (see F14) but does not fail the ticket write operation.

---

### F05.5 Re-index Script

A standalone script (`scripts/reindex-solr.ts`) that:
1. Deletes all documents from the Solr index (`deleteByQuery *:*`).
2. Loads all tickets from PostgreSQL in batches of 500.
3. Builds Solr documents for each batch.
4. Submits batch `add` operations to Solr.
5. Issues a final `commit`.
6. Logs progress (tickets indexed, elapsed time).

---

### F05.6 Bookmark Integration

- When a user bookmarks a search (see F12), the `requestUri` field stores the full search URL including all query parameters.
- Recalling a bookmark re-executes the same search URL.

---

**API Surface (this feature):** see `Y1-api.md` §Search.

**Schema Surface (this feature):** reads from `tickets`, `categories`, `departments`, `substatus`; Solr index schema defined above — see `Y0-schema.md` for table DDL.
---

## F06: MySQL-to-PostgreSQL Schema Migration

**Description:** The existing MySQL schema (21 tables, 285 lines) must be fully translated to PostgreSQL-idiomatic DDL and all data migrated with full fidelity. MySQL-specific constructs are systematically replaced with PostgreSQL equivalents. A Prisma schema is generated from the PostgreSQL DDL. A migration script reads from the MySQL source and writes to the PostgreSQL target, with row-count verification per table.

**Terminology:**
- **DDL:** Data Definition Language — the `CREATE TABLE` statements
- **Prisma schema:** `prisma/schema.prisma` — the ORM model definition generated from the PostgreSQL DDL
- **IDENTITY:** PostgreSQL `GENERATED ALWAYS AS IDENTITY` — replaces MySQL `AUTO_INCREMENT`
- **PostGIS:** PostgreSQL spatial extension providing `geometry` types — replaces MySQL `POINT`
- **Row-count verification:** After migration, assert `SELECT COUNT(*)` matches between MySQL source and PostgreSQL target for each table

**Sub-features:**
- MySQL → PostgreSQL DDL translation (all 21 tables)
- Type mapping for all MySQL-specific types
- Prisma schema generation
- Data migration script
- Row-count verification
- Seed data preservation

---

### F06.1 MySQL → PostgreSQL Type Mapping

| MySQL Type | PostgreSQL Equivalent | Notes |
|-----------|----------------------|-------|
| `AUTO_INCREMENT` | `GENERATED ALWAYS AS IDENTITY` | or `SERIAL` |
| `INT UNSIGNED` | `INTEGER` | PG has no unsigned; application ensures positive values |
| `TINYINT(1)` | `BOOLEAN` | `0` → `false`, `1` → `true` |
| `TINYINT UNSIGNED` | `SMALLINT` | e.g. `geoclusters.level` |
| `FLOAT(17, 14)` | `DOUBLE PRECISION` | lat/lon precision preserved |
| `POINT` | `geometry(Point, 4326)` | PostGIS; SRID 4326 (WGS84) |
| `ENUM(...)` | `TEXT` with `CHECK` constraint | or PostgreSQL `ENUM` type |
| `TIMESTAMP ... DEFAULT CURRENT_TIMESTAMP` | `TIMESTAMPTZ DEFAULT NOW()` | timezone-aware |
| `DATETIME` | `TIMESTAMP` | stored as UTC |
| `TIMESTAMP NULL` | `TIMESTAMPTZ NULL` | for `closedDate` |
| `` `backtick_names` `` | `"quoted_names"` or unquoted | reserved words must be quoted |
| `BOOL` | `BOOLEAN` | native PG type |
| `TEXT` | `TEXT` | identical |
| `VARCHAR(n)` | `VARCHAR(n)` | identical |

---

### F06.2 ENUM Handling

MySQL ENUMs in the schema are translated to PostgreSQL `TEXT` with `CHECK` constraints (preferred for easier future migrations) or to native PostgreSQL `ENUM` types. The chosen approach is `TEXT` + `CHECK`:

| Table.Column | MySQL ENUM values | PostgreSQL CHECK |
|-------------|-------------------|-----------------|
| `peopleEmails.label` | `'Home','Work','Other'` | `CHECK (label IN ('Home','Work','Other'))` |
| `peoplePhones.label` | `'Main','Mobile','Work','Home','Fax','Pager','Other'` | `CHECK (label IN (...))` |
| `peopleAddresses.label` | `'Home','Business','Rental'` | `CHECK (label IN ('Home','Business','Rental'))` |
| `substatus.status` | `'open','closed'` | `CHECK (status IN ('open','closed'))` |
| `actions.type` | `'system','department'` | `CHECK (type IN ('system','department'))` |
| `categories.displayPermissionLevel` | `'staff','public','anonymous'` | `CHECK (displayPermissionLevel IN ('staff','public','anonymous'))` |
| `categories.postingPermissionLevel` | `'staff','public','anonymous'` | `CHECK (postingPermissionLevel IN ('staff','public','anonymous'))` |

---

### F06.3 Spatial Column Handling

- MySQL `POINT SRID 0` (`geoclusters.center`) → PostGIS `geometry(Point, 4326)`
- MySQL lat/lon `FLOAT(17,14)` columns on `tickets` remain as `DOUBLE PRECISION` scalar columns (not converted to geometry) since they are consumed separately from the geo-cluster geometry.
- PostGIS extension must be enabled: `CREATE EXTENSION IF NOT EXISTS postgis;`
- Spatial index on `geoclusters.center`: `CREATE INDEX idx_geoclusters_center ON geoclusters USING GIST(center);`

---

### F06.4 Data Migration Script

**Script:** `scripts/migrate-mysql-to-pg.ts`

**Process:**
1. Connect to MySQL source (env: `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`).
2. Connect to PostgreSQL target (env: `DATABASE_URL`).
3. Disable FK checks on target (`SET session_replication_role = 'replica'`).
4. For each table in dependency order (leaves first, then referencing tables):
   a. Truncate target table.
   b. Read all rows from MySQL source in batches of 1000.
   c. For each batch, transform data types:
      - `TINYINT(1)` → `Boolean`
      - `POINT` binary → `ST_GeomFromText('POINT(lon lat)', 4326)` WKT
      - `FLOAT(17,14)` → JavaScript `number` (no truncation)
      - `DATETIME` / `TIMESTAMP` → UTC `Date` object
   d. Bulk-insert transformed rows into target table.
5. Re-enable FK checks.
6. Reset all `IDENTITY` sequences to `MAX(id) + 1` per table.
7. Run row-count verification (step F06.5).

**Migration table order:**
1. `contactMethods`, `categoryGroups`, `issueTypes`, `substatus`, `actions`
2. `departments`, `people`
3. `peopleEmails`, `peoplePhones`, `peopleAddresses`
4. `clients`
5. `categories`
6. `category_action_responses`, `department_actions`, `department_categories`
7. `tickets`
8. `ticketHistory`, `media`, `bookmarks`
9. `geoclusters`, `ticket_geodata`

---

### F06.5 Row-Count Verification

After migration completes, for each table:
1. Execute `SELECT COUNT(*) FROM {table}` on MySQL source.
2. Execute `SELECT COUNT(*) FROM {table}` on PostgreSQL target.
3. Assert counts are equal.
4. Log result: `[PASS] {table}: {count} rows` or `[FAIL] {table}: MySQL={n}, PG={m}`.
5. Exit with non-zero code if any table fails verification.

---

### F06.6 Prisma Schema

`prisma/schema.prisma` is generated to match the PostgreSQL DDL. Key Prisma directives:
- `@id @default(autoincrement())` for primary keys
- `@unique` for `people.username`, `clients.api_key`
- `@relation` for all foreign keys
- `@db.Text` for `TEXT` columns
- `@db.DoublePrecision` for `DOUBLE PRECISION`
- `Unsupported("geometry(Point, 4326)")` for PostGIS geometry columns (Prisma does not natively model PostGIS; raw queries used for spatial operations)

---

### F06.7 Seed Data Preservation

The following seed rows from `mysql.sql` must be present in the migrated database:
- `contactMethods`: Email, Phone, Web Form, Other (4 rows)
- `substatus`: Resolved/closed, Duplicate/closed, Bogus/closed (3 rows)
- `actions`: 10 system action rows (open, assignment, closed, changeCategory, changeLocation, response, duplicate, update, comment, upload_media)
- `categoryGroups`: Streets, Sanitation, Other (3 rows)
- `issueTypes`: Comment, Complaint, Question, Report, Request, Violation (6 rows)

Seed data is included in both the migration script and in a standalone `prisma/seed.ts` for fresh deployments.

---

**API Surface (this feature):** No runtime API endpoints. Migration is a CLI script.

**Schema Surface (this feature):** Defines all 21 tables — see `Y0-schema.md` for full PostgreSQL DDL.
---

## F07: Email Notifications

**Description:** uReport sends automated email notifications on ticket lifecycle events. PHPMailer is replaced by Nodemailer while preserving all email templates, trigger conditions, recipient resolution logic, and reply-email routing. Every email send is logged to `ticketHistory.sentNotifications`.

**Terminology:**
- **Notification trigger:** The ticket action event that causes email(s) to be sent
- **Template:** The email body text with `{variable}` placeholder syntax
- **replyEmail:** The `Reply-To` address on the outgoing email
- **usedForNotifications:** Flag on `peopleEmails` rows — only emails with this flag receive notifications
- **category_action_responses:** Per-category email template override per action
- **Digest notification:** Batched notification email summarizing multiple events (cron-driven)

**Sub-features:**
- Trigger-based email sends on ticket open, assignment, close, response, comment, duplicate
- Recipient resolution from `peopleEmails.usedForNotifications`
- Template override resolution (`category_action_responses` → `actions.template` fallback)
- Reply-to address resolution (`categories.notificationReplyEmail` → `actions.replyEmail` fallback)
- Template variable substitution
- Email send logging to `ticketHistory.sentNotifications`
- Digest notification batch send (cron)

---

### F07.1 Trigger Matrix

| Ticket Action | Email Sent To | `actions.name` |
|--------------|--------------|----------------|
| Ticket opened | `reportedByPerson` (if email set) | `open` |
| Ticket assigned | Assigned person + reporter | `assignment` |
| Ticket closed | Reporter + assigned person | `closed` |
| Response added | Reporter | `response` |
| Comment added | Assigned person | `comment` |
| Marked duplicate | Reporter of child ticket | `duplicate` |

---

### F07.2 Template Resolution

For each notification trigger on ticket `T` with category `C` and action `A`:

1. Look up `category_action_responses` where `category_id = C.id AND action_id = A.id`.
2. If found and `template` is non-null → use `category_action_responses.template`.
3. Else use `actions.template`.
4. If template is still null → no email is sent for this action.

**Reply-to resolution:**
1. If `categories.notificationReplyEmail` is non-null → use it as `Reply-To`.
2. Else if `category_action_responses.replyEmail` is non-null → use it.
3. Else if `actions.replyEmail` is non-null → use it.
4. Else no `Reply-To` header.

---

### F07.3 Template Variable Substitution

Template strings use `{variable}` placeholder syntax. The following variables are substituted:

| Variable | Resolved Value |
|----------|---------------|
| `{actionPerson}` | Full name of `ticketHistory.actionPerson_id` |
| `{enteredByPerson}` | Full name of `ticketHistory.enteredByPerson_id` |
| `{reportedByPerson_id}` | Full name of `tickets.reportedByPerson_id` |
| `{original:category_id}` | Category name before change (`changeCategory` action) |
| `{updated:category_id}` | Category name after change (`changeCategory` action) |
| `{original:location}` | Location before change (`changeLocation` action) |
| `{updated:location}` | Location after change |
| `{duplicate:ticket_id}` | Duplicate ticket ID |

Unresolved variables (missing person, null values) are replaced with an empty string.

---

### F07.4 Recipient Resolution

Recipients for a notification are resolved from `peopleEmails` where `usedForNotifications = TRUE`:
- Load all `peopleEmails` rows for the target person.
- Filter to rows where `usedForNotifications = true`.
- If no such rows exist, no email is sent to that person.
- Each qualifying email address receives a separate email.

---

### F07.5 Email Send Process

1. Resolve template and `Reply-To` address (§7.2).
2. Resolve recipients (§7.4).
3. Substitute template variables (§7.3).
4. Build `nodemailer` message object:
   - `from`: `SMTP_FROM` env var
   - `to`: recipient email
   - `replyTo`: resolved reply-to (if any)
   - `subject`: `actions.description` with variables substituted
   - `text`: substituted template body
5. Send via Nodemailer transport.
6. On success: append email address(es) to `ticketHistory.sentNotifications` (comma-separated).
7. On failure: log error to GELF (see F14); do not retry automatically (re-send is a manual staff action).

---

### F07.6 Nodemailer Configuration

| Env Variable | Description |
|-------------|-------------|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP server port (default: 587) |
| `SMTP_USER` | SMTP authentication username |
| `SMTP_PASS` | SMTP authentication password |
| `SMTP_SECURE` | `true` for TLS (port 465); `false` for STARTTLS |
| `SMTP_FROM` | From address (e.g., `noreply@city.gov`) |

---

### F07.7 Digest Notifications

- A scheduled task (cron, configurable schedule via `DIGEST_CRON` env var) runs the digest batch.
- Collects ticket events since the last digest run for subscribed users.
- Sends a single summary email per user listing all events.
- Digest subscription is per-user (stored as a bookmark of type `digest` or a separate configuration — match legacy behavior).
- All digest sends logged to `ticketHistory.sentNotifications`.

---

**API Surface (this feature):** No dedicated email API endpoints. Email sends are side effects of ticket actions.

**Schema Surface (this feature):** reads `actions`, `category_action_responses`, `categories`, `people`, `peopleEmails`, `ticketHistory` — see `Y0-schema.md`.
---

## F08: Media & Attachment Management

**Description:** Staff and citizens can upload file attachments to tickets. The media management system preserves upload handling, storage paths, MIME type validation, thumbnail generation for images, and the audit trail entry on upload. File serving streams bytes with the correct Content-Type header.

**Terminology:**
- **filename:** The original name of the uploaded file as provided by the client
- **internalFilename:** The UUID-based storage name used on disk (prevents filename collisions and path traversal)
- **mime_type:** MIME type determined from file content (not just extension)
- **Thumbnail:** A resized image generated for image/jpeg, image/png, image/gif uploads

**Sub-features:**
- File upload (`POST /tickets/:id/media`)
- File retrieval / streaming (`GET /tickets/:id/media/:mediaId`)
- Thumbnail retrieval (`GET /tickets/:id/media/:mediaId/thumbnail`)
- File deletion (`DELETE /tickets/:id/media/:mediaId`)
- Audit trail entry on upload
- Permission check: authenticated only

---

### F08.1 File Upload

**Process:**
1. Validate caller is authenticated (any authenticated role); anonymous → 401.
2. Check category `postingPermissionLevel` matches caller's role (see F02).
3. Validate file: MIME type must be in the allowed list; size must be within limit.
4. Generate `internalFilename`: UUID v4 + original extension (e.g., `a3f2...d1.jpg`).
5. Write file to `MEDIA_STORAGE_PATH/{ticket_id}/{internalFilename}`.
6. Create directory `{MEDIA_STORAGE_PATH}/{ticket_id}/` if not exists.
7. If MIME type is an image (`image/jpeg`, `image/png`, `image/gif`): generate thumbnail and save to `{MEDIA_STORAGE_PATH}/{ticket_id}/thumbnails/{internalFilename}`.
8. Insert `media` record: `ticket_id`, `filename`, `internalFilename`, `mime_type`, `uploaded = NOW()`, `person_id = currentUser.id`.
9. Append `upload_media` action to `ticketHistory`.
10. Set `tickets.lastModified = NOW()`.
11. Return created `media` record.

**Inputs:**
- `ticket_id` (integer, required): URL path parameter
- File upload (multipart/form-data, required): field name `file`

**Outputs:**
- Created `media` record: `{id, ticket_id, filename, internalFilename, mime_type, uploaded, person_id}`

**Validation:**
- File must be present in the multipart body.
- MIME type must be in the allowed list: `image/jpeg`, `image/png`, `image/gif`, `application/pdf`, `text/plain`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- File size must not exceed `MEDIA_MAX_BYTES` env var (default: 10 MB = 10485760 bytes).
- `ticket_id` must reference an existing ticket.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Not authenticated | 401 | UNAUTHORIZED | "Authentication required" |
| Ticket not found | 404 | NOT_FOUND | "Ticket not found" |
| MIME type not allowed | 400 | INVALID_FILE_TYPE | "File type not permitted" |
| File too large | 413 | FILE_TOO_LARGE | "File exceeds maximum size" |
| No file in request | 400 | MISSING_FILE | "No file provided" |

---

### F08.2 File Retrieval

**Process:**
1. Load `media` record by `mediaId`; verify `ticket_id` matches.
2. Apply permission check: category `displayPermissionLevel` vs caller's role.
3. Resolve file path: `{MEDIA_STORAGE_PATH}/{ticket_id}/{internalFilename}`.
4. Stream file bytes to HTTP response with:
   - `Content-Type: {media.mime_type}`
   - `Content-Disposition: inline; filename="{media.filename}"`

**Inputs:**
- `ticket_id` (integer, required): URL path parameter
- `mediaId` (integer, required): URL path parameter

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Media record not found | 404 | NOT_FOUND | "Attachment not found" |
| File missing from disk | 404 | NOT_FOUND | "Attachment file not found" |

---

### F08.3 Thumbnail Retrieval

Same as F08.2 but serves the thumbnail file from `{MEDIA_STORAGE_PATH}/{ticket_id}/thumbnails/{internalFilename}`. If no thumbnail exists (non-image file), returns 404.

---

### F08.4 File Deletion

**Process:**
1. Verify caller has `staff` role.
2. Load `media` record; verify ownership of ticket.
3. Delete file from disk (and thumbnail if exists).
4. Delete `media` record from database.
5. Append `update` action to `ticketHistory` noting deletion.

**Inputs:**
- `ticket_id` (integer, required)
- `mediaId` (integer, required)

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Not staff | 403 | FORBIDDEN | "Staff access required" |
| Media not found | 404 | NOT_FOUND | "Attachment not found" |

---

### F08.5 Configuration

| Env Variable | Description | Default |
|-------------|-------------|---------|
| `MEDIA_STORAGE_PATH` | Absolute filesystem path for media storage | `/var/uReport/media` |
| `MEDIA_MAX_BYTES` | Maximum upload size in bytes | `10485760` (10 MB) |
| `THUMBNAIL_WIDTH` | Thumbnail width in pixels | `200` |
| `THUMBNAIL_HEIGHT` | Thumbnail height in pixels | `200` |

---

**API Surface (this feature):** see `Y1-api.md` §Media.

**Schema Surface (this feature):** uses `media`, `tickets`, `ticketHistory` — see `Y0-schema.md`.
---

## F09: Geo-Clustering of Ticket Locations

**Description:** uReport maintains a pre-computed geo-cluster index linking tickets to spatial clusters at 7 zoom levels (0–6) for map visualization. The clustering logic is re-implemented using PostGIS, preserving the cluster hierarchy and `ticket_geodata` join table. Cluster assignments are computed on migration and updated incrementally on ticket create/update.

**Terminology:**
- **Cluster level:** An integer 0–6 representing a zoom level; level 0 = coarsest (fewest, largest clusters), level 6 = finest (most, smallest clusters)
- **Cluster center:** The centroid geometry of a cluster (`geoclusters.center` as PostGIS `geometry(Point, 4326)`)
- **Cluster assignment:** The cluster each ticket belongs to at each level (stored in `ticket_geodata`)
- **Nearest cluster:** The cluster whose center is geographically closest to the ticket's lat/lon
- **Re-cluster:** Bulk rebuilding of all `ticket_geodata` rows (run after migration)

**Sub-features:**
- Cluster table management (`geoclusters`)
- Ticket geo-data join table (`ticket_geodata`)
- Cluster assignment algorithm (nearest-neighbor per level)
- Re-cluster script (bulk rebuild)
- Incremental cluster assignment on ticket create/update
- Map endpoint returning cluster data

---

### F09.1 Data Model

**`geoclusters` table:**
- `id`: primary key
- `level`: integer 0–6 (which zoom level this cluster belongs to)
- `center`: PostGIS `geometry(Point, 4326)` — cluster centroid

**`ticket_geodata` table:**
- `ticket_id`: FK to `tickets.id` (primary key of this table)
- `cluster_id_0` through `cluster_id_6`: FK to `geoclusters.id` — the assigned cluster at each level

A ticket with a known lat/lon must have exactly one row in `ticket_geodata` with one cluster assignment per level (0–6). Tickets without lat/lon have no `ticket_geodata` row.

---

### F09.2 Cluster Assignment Algorithm

For a ticket with `latitude` and `longitude`:

1. Build PostGIS point: `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)`.
2. For each level L in {0, 1, 2, 3, 4, 5, 6}:
   a. Execute nearest-neighbor query:
      ```sql
      SELECT id FROM geoclusters
      WHERE level = L
      ORDER BY center <-> ST_SetSRID(ST_MakePoint($lon, $lat), 4326)
      LIMIT 1
      ```
   b. The `<->` operator uses the PostGIS KNN GiST index for efficient nearest-neighbor lookup.
   c. Record the returned `geoclusters.id` as `cluster_id_{L}`.
3. Upsert `ticket_geodata` row:
   ```sql
   INSERT INTO ticket_geodata (ticket_id, cluster_id_0, ..., cluster_id_6)
   VALUES ($ticketId, $c0, ..., $c6)
   ON CONFLICT (ticket_id) DO UPDATE SET
     cluster_id_0 = EXCLUDED.cluster_id_0, ...
   ```

If no `geoclusters` rows exist at a given level, `cluster_id_{L}` is set to `NULL`.

---

### F09.3 Re-cluster Script

**Script:** `scripts/recluster.ts`

**Process:**
1. Truncate `ticket_geodata` table.
2. Load all tickets with non-null `latitude` and `longitude` from `tickets`.
3. For each ticket, run the assignment algorithm (§9.2).
4. Batch-insert `ticket_geodata` rows (batches of 500).
5. Log progress: tickets processed, elapsed time.

This script is run once after the MySQL → PostgreSQL data migration and is idempotent (truncates first).

---

### F09.4 Incremental Cluster Assignment

The `TicketService` calls the cluster assignment algorithm (§9.2) automatically:
- On ticket **create**: if `latitude` and `longitude` are provided.
- On ticket **update**: if `latitude` or `longitude` changed.
- If lat/lon are cleared (set to null): delete the `ticket_geodata` row for the ticket.

---

### F09.5 Map Endpoint

`GET /locations[.json|.xml]`

**Process:**
1. Apply role-based category visibility filter (see F02).
2. Accept optional filter parameters (`status`, `category_id`, `zoom_level`).
3. Query `ticket_geodata` JOIN `geoclusters` for the requested zoom level.
4. Return cluster summary objects: `{cluster_id, lat, lon, count}`.

**Inputs:**
- `zoom_level` (integer 0–6, optional): default 3
- `status` (string, optional): `open` or `closed`
- `category_id` (integer, optional): filter by category

**Outputs:**
- Array of cluster summary objects:
  - `id` (integer): geoclusters.id
  - `level` (integer): zoom level
  - `lat` (float): cluster center latitude
  - `lon` (float): cluster center longitude
  - `count` (integer): number of tickets assigned to this cluster matching the filters

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Invalid zoom_level | 400 | INVALID_INPUT | "zoom_level must be 0–6" |

---

### F09.6 Spatial Index

The following index must exist for efficient nearest-neighbor queries:
```sql
CREATE INDEX idx_geoclusters_center ON geoclusters USING GIST(center);
```

---

**API Surface (this feature):** see `Y1-api.md` §Locations.

**Schema Surface (this feature):** uses `geoclusters`, `ticket_geodata`, `tickets` — see `Y0-schema.md`.
---

## F10: Category & Department Administration

**Description:** Staff manage the full taxonomy of service categories, category groups, departments, and the routing rules connecting them. All admin CRUD interfaces are reproduced with identical field sets, validation rules, and association management. These entities drive ticket routing, permission enforcement, and email notifications across the entire system.

**Terminology:**
- **Category:** A service type (e.g., "Pothole") classified under a group, owned by a department
- **CategoryGroup:** A grouping label (e.g., "Streets") used for display ordering
- **Department:** A city department that owns categories and receives assigned tickets
- **defaultPerson_id:** The staff person who receives new tickets in a category/department if no specific assignment is made
- **customFields:** JSON schema string defining dynamic form fields presented on ticket creation for this category
- **autoClose:** If enabled and `autoCloseIsActive = true`, tickets in this category auto-close after `slaDays` days

**Sub-features:**
- Category CRUD (create, read, update, delete)
- CategoryGroup CRUD
- Department CRUD
- Department–Category association management
- Department–Action association management
- Category Action Response (email template override) management
- Custom field schema management per category

---

### F10.1 Category CRUD

**Create/Update inputs:**
- `name` (string, required, max 50 chars)
- `description` (string, optional, max 512 chars)
- `department_id` (integer, required): owning department
- `defaultPerson_id` (integer, optional): default assignee
- `categoryGroup_id` (integer, optional): display group
- `active` (boolean, optional): whether visible in public lists
- `featured` (boolean, optional): highlighted on home page
- `displayPermissionLevel` (enum `staff|public|anonymous`, required)
- `postingPermissionLevel` (enum `staff|public|anonymous`, required)
- `customFields` (JSON text, optional): field schema definitions
- `slaDays` (integer unsigned, optional): SLA target in days
- `notificationReplyEmail` (string max 128, optional): override reply-to for notifications
- `autoCloseIsActive` (boolean, optional): enable auto-close feature
- `autoCloseSubstatus_id` (integer, optional): sub-status to use when auto-closing

**Validation:**
- `name` must be unique within a department (soft validation — warn, not block).
- `department_id` must reference an existing department.
- `defaultPerson_id` if set must reference a person in `department_id`'s staff.
- `autoCloseSubstatus_id` must reference a sub-status with `status = 'closed'`.
- `customFields` must be valid JSON if provided.
- `displayPermissionLevel` must be one of `staff`, `public`, `anonymous`.
- `postingPermissionLevel` must be one of `staff`, `public`, `anonymous`.
- `notificationReplyEmail` must be valid email format if provided.

**lastModified behavior:**
- `categories.lastModified` is updated on every update operation.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| department_id not found | 404 | NOT_FOUND | "Department not found" |
| Invalid customFields JSON | 400 | INVALID_INPUT | "customFields must be valid JSON" |
| Invalid permissionLevel value | 400 | INVALID_INPUT | "permissionLevel must be staff, public, or anonymous" |
| Category has tickets (delete) | 409 | CONFLICT | "Cannot delete category with existing tickets" |

---

### F10.2 CategoryGroup CRUD

**Inputs:**
- `name` (string, required, max 50 chars)
- `ordering` (small integer, optional): display ordering value

**Validation:**
- `name` must be non-empty.
- `ordering` if provided must be a non-negative integer.

**Delete constraint:** If any categories reference this group, deletion is blocked (FK constraint).

---

### F10.3 Department CRUD

**Inputs:**
- `name` (string, required, max 128 chars)
- `defaultPerson_id` (integer, optional): default assignee for unassigned tickets

**Validation:**
- `name` must be unique and non-empty.
- `defaultPerson_id` must reference an existing person.

**Delete constraint:** If any categories or people reference this department, deletion is blocked.

---

### F10.4 Department–Category Associations (`department_categories`)

The `department_categories` join table allows a ticket in one category to also appear in other departments' queues.

**Operations:**
- Add association: `POST /departments/:deptId/categories` with `{category_id}`
- Remove association: `DELETE /departments/:deptId/categories/:categoryId`
- List associations: `GET /departments/:deptId/categories`

---

### F10.5 Department–Action Associations (`department_actions`)

Controls which custom action types appear in a department's ticket workflow.

**Operations:**
- Add: `POST /departments/:deptId/actions` with `{action_id}`
- Remove: `DELETE /departments/:deptId/actions/:actionId`
- List: `GET /departments/:deptId/actions`

---

### F10.6 Category Action Responses (`category_action_responses`)

Per-category email template overrides per action type.

**Inputs:**
- `category_id` (integer, required)
- `action_id` (integer, required)
- `template` (text, optional): email body template
- `replyEmail` (string max 128, optional): reply-to address

**Operations:**
- Upsert: `POST /categories/:categoryId/actions/:actionId/response` (creates or updates)
- Delete: `DELETE /categories/:categoryId/actions/:actionId/response`
- Get: `GET /categories/:categoryId/actions/:actionId/response`

---

### F10.7 Custom Field Schema

`categories.customFields` stores a JSON array of field definition objects. Each object:
```json
{
  "code": "pothole_size",
  "datatype": "singlevaluelist",
  "label": "Pothole Size",
  "required": true,
  "order": 1,
  "values": [
    {"key": "small", "name": "Small (< 6 inches)"},
    {"key": "large", "name": "Large (>= 6 inches)"}
  ]
}
```

Supported `datatype` values: `string`, `number`, `datetime`, `singlevaluelist`, `multivaluelist`.

The front-end form and the Open311 `ServiceDefinition` attributes array are both derived from this JSON schema.

---

**API Surface (this feature):** see `Y1-api.md` §Categories, §Departments.

**Schema Surface (this feature):** uses `categories`, `categoryGroups`, `departments`, `department_categories`, `department_actions`, `category_action_responses` — see `Y0-schema.md`.
---

## F11: People & API Client Management

**Description:** Staff manage person records (citizens and staff), their contact details (emails, phones, addresses), and API client credentials. All person-management and client-management interfaces are reproduced with identical field sets and validation.

**Terminology:**
- **Person:** A record in the `people` table — citizen, staff, or API contact
- **usedForNotifications:** Boolean flag on `peopleEmails` rows controlling whether an email address receives ticket notifications
- **API Client:** A record in the `clients` table representing an external application with an `api_key`
- **Role assignment:** Setting `people.role = 'staff'` to grant staff-level access

**Sub-features:**
- People CRUD (create, read, update, delete)
- People email management (`peopleEmails`)
- People phone management (`peoplePhones`)
- People address management (`peopleAddresses`)
- Person search (by name, email, username)
- Role assignment
- API Client CRUD
- Users list view (staff accounts)

---

### F11.1 People CRUD

**Create/Update inputs:**
- `firstname` (string, optional, max 128 chars)
- `middlename` (string, optional, max 128 chars)
- `lastname` (string, optional, max 128 chars)
- `organization` (string, optional, max 128 chars)
- `address` (string, optional, max 128 chars)
- `city` (string, optional, max 128 chars)
- `state` (string, optional, max 128 chars)
- `zip` (string, optional, max 20 chars)
- `department_id` (integer, optional): department affiliation for staff
- `username` (string, optional, max 40 chars): must be unique; set from OIDC `sub` on provisioning
- `role` (string, optional): `null` (citizen) or `'staff'`

**Validation:**
- `username` must be unique across all people records; duplicate → 409.
- `department_id` must reference an existing department.
- `role` must be `null` or `'staff'`.

**Delete constraint:** People referenced by tickets (`enteredByPerson_id`, `reportedByPerson_id`, `assignedPerson_id`), clients, or bookmarks cannot be deleted; return 409.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Duplicate username | 409 | CONFLICT | "Username already in use" |
| Referenced by tickets | 409 | CONFLICT | "Person cannot be deleted — referenced by tickets" |

---

### F11.2 People Email Management

**Inputs per email record:**
- `person_id` (integer, required): FK to people
- `email` (string, required, max 255 chars): valid email format
- `label` (enum `Home|Work|Other`, required, default `Other`)
- `usedForNotifications` (boolean, required, default `false`)

**Operations:**
- `POST /people/:personId/emails` — add email
- `PUT /people/:personId/emails/:emailId` — update email or notification flag
- `DELETE /people/:personId/emails/:emailId` — remove email

**Validation:**
- `email` must match RFC 5322 format.
- Duplicate `email` for the same `person_id` → 409.

---

### F11.3 People Phone Management

**Inputs per phone record:**
- `person_id` (integer, required)
- `number` (string, optional, max 20 chars)
- `label` (enum `Main|Mobile|Work|Home|Fax|Pager|Other`, required, default `Other`)

**Operations:** same CRUD pattern as emails at `/people/:personId/phones/:phoneId`.

---

### F11.4 People Address Management

**Inputs per address record:**
- `person_id` (integer, required)
- `address` (string, required, max 128 chars)
- `city` (string, optional, max 128 chars)
- `state` (string, optional, max 128 chars)
- `zip` (string, optional, max 20 chars)
- `label` (enum `Home|Business|Rental`, required, default `Home`)

**Operations:** same CRUD pattern at `/people/:personId/addresses/:addressId`.

---

### F11.5 Person Search

`GET /people/search?q={query}`

**Process:**
1. Accept `q` (query string); search by `firstname`, `lastname`, `email` (via JOIN to `peopleEmails`), `username`.
2. Return matching person summaries: `{id, firstname, lastname, organization, username, role}`.
3. Used for ticket reporter and assignee selection in the ticket form.

**Inputs:**
- `q` (string, required, min 2 chars): search term
- `role` (string, optional): filter by `null` (citizens) or `'staff'`
- `department_id` (integer, optional): filter by department affiliation

**Validation:**
- `q` must be at least 2 characters.

---

### F11.6 Users List

`GET /users`

- Returns all people where `role = 'staff'`, with their `department`, `username`, and contact emails.
- Staff-only endpoint.

---

### F11.7 API Client CRUD

**Create/Update inputs:**
- `name` (string, required, max 128 chars)
- `url` (string, optional, max 255 chars): client application URL
- `api_key` (string, required, max 50 chars): must be unique; generated by staff or provided
- `contactPerson_id` (integer, required): FK to people — who is responsible for this client
- `contactMethod_id` (integer, optional): FK to contactMethods

**Validation:**
- `api_key` must be unique across all clients; duplicate → 409.
- `contactPerson_id` must reference an existing person.

**Delete constraint:** Clients referenced by tickets (`tickets.client_id`) cannot be deleted; return 409.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Duplicate api_key | 409 | CONFLICT | "API key already in use" |
| contactPerson not found | 404 | NOT_FOUND | "Contact person not found" |
| Client referenced by tickets | 409 | CONFLICT | "Client cannot be deleted — referenced by tickets" |

---

**API Surface (this feature):** see `Y1-api.md` §People, §Clients.

**Schema Surface (this feature):** uses `people`, `peopleEmails`, `peoplePhones`, `peopleAddresses`, `clients`, `contactMethods` — see `Y0-schema.md`.
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
---

## F13: Reporting & Metrics

**Description:** uReport provides summary metrics and exportable reports for staff to track ticket volume, resolution rates, and category distribution. The existing metrics and reports modules are reproduced with identical queries, filters, and output formats. All report endpoints are staff-only.

**Terminology:**
- **Metrics:** Aggregated counts and rates computed on demand from the `tickets` table
- **Average resolution time:** Mean of `(closedDate - enteredDate)` for all closed tickets in the period
- **Exportable report:** A filtered query result downloadable as CSV or JSON

**Sub-features:**
- Dashboard metrics endpoint (open/closed counts, resolution time, by-category and by-department breakdowns)
- Reports endpoint with date-range, category, and department filters
- Output in HTML, JSON, CSV, TXT via SerializationInterceptor (see F03)
- Staff-only access enforcement

---

### F13.1 Dashboard Metrics

`GET /metrics[.json|.html|.csv]`

**Process:**
1. Verify caller has `staff` role.
2. Compute metrics:
   - `openCount`: `SELECT COUNT(*) FROM tickets WHERE status = 'open'`
   - `closedCount`: `SELECT COUNT(*) FROM tickets WHERE status = 'closed'`
   - `avgResolutionDays`: `SELECT AVG(EXTRACT(EPOCH FROM (closedDate - enteredDate)) / 86400) FROM tickets WHERE status = 'closed'`
   - `byCategory`: `SELECT category_id, COUNT(*) FROM tickets GROUP BY category_id`
   - `byDepartment`: join categories → departments, `GROUP BY department_id`
3. Return metrics object in negotiated format.

**Inputs:**
- `start_date` (ISO 8601, optional): filter by `enteredDate >=`
- `end_date` (ISO 8601, optional): filter by `enteredDate <=`

**Outputs:**
- `openCount` (integer)
- `closedCount` (integer)
- `totalCount` (integer)
- `avgResolutionDays` (float or null if no closed tickets)
- `byCategory` (array): `[{category_id, category_name, count}]`
- `byDepartment` (array): `[{department_id, department_name, count}]`

---

### F13.2 Exportable Reports

`GET /reports[.json|.csv|.html|.txt]`

**Process:**
1. Verify caller has `staff` role.
2. Build query from filter parameters.
3. Execute query on `tickets` JOIN `categories` JOIN `departments`.
4. Return paginated results in negotiated format.

**Inputs:**
- `start_date` (ISO 8601, optional)
- `end_date` (ISO 8601, optional)
- `status` (string, optional): `open` or `closed`
- `category_id` (integer, optional)
- `department_id` (integer, optional)
- `page` (integer, optional): default 1
- `page_size` (integer, optional): default 100, max 1000

**Outputs (per row):**
- `id`, `status`, `category_name`, `department_name`, `location`, `city`, `zip`, `enteredDate`, `closedDate`, `substatus_name`, `description`

---

### F13.3 Access Control

- Both `/metrics` and `/reports` endpoints require `staff` role.
- Non-staff → 403 `FORBIDDEN`.

---

**API Surface (this feature):** see `Y1-api.md` §Reports.

**Schema Surface (this feature):** reads from `tickets`, `categories`, `departments`, `substatus` — see `Y0-schema.md`.
---

## F14: Structured Logging via GELF/Graylog

**Description:** All application events are logged in GELF format to a Graylog instance for centralized observability. The PHP GELF client is replaced by a Node GELF client with the same log level conventions, facility names, and structured field set. A NestJS `LoggerService` wraps the GELF client and is injected wherever logging is needed.

**Terminology:**
- **GELF:** Graylog Extended Log Format — a structured JSON log format
- **Facility:** A GELF field identifying the source component (e.g., `'uReport'`)
- **short_message:** The primary single-line log message (required GELF field)
- **full_message:** Optional detailed message or stack trace
- **Additional field:** Any GELF field prefixed with `_` (e.g., `_ticket_id`, `_user_id`)

**Sub-features:**
- GELF transport configuration (UDP or TCP)
- Log levels mapped to NestJS logger interface
- Request-level access logging (method, path, status, duration)
- Error logging with stack traces
- Contextual fields: `_ticket_id`, `_user_id`, `_request_id`
- NestJS `LoggerService` implementation

---

### F14.1 Transport Configuration

| Env Variable | Description | Default |
|-------------|-------------|---------|
| `GRAYLOG_HOST` | Graylog server hostname | `localhost` |
| `GRAYLOG_PORT` | Graylog GELF input port | `12201` |
| `GRAYLOG_TRANSPORT` | `udp` or `tcp` | `udp` |
| `GRAYLOG_FACILITY` | GELF facility field | `uReport` |

---

### F14.2 Log Levels

| NestJS Level | GELF Level | Syslog Level |
|-------------|-----------|--------------|
| `verbose` | DEBUG | 7 |
| `debug` | DEBUG | 7 |
| `log` | INFO | 6 |
| `warn` | WARNING | 4 |
| `error` | ERROR | 3 |

---

### F14.3 Required GELF Fields

Every log message must include:
- `version`: `"1.1"` (GELF spec)
- `host`: server hostname
- `short_message`: primary message string
- `timestamp`: Unix epoch float
- `level`: numeric syslog level
- `_facility`: `GRAYLOG_FACILITY` env value

Optional contextual fields (added when available):
- `_request_id`: UUID generated per HTTP request (via middleware)
- `_user_id`: `people.id` of authenticated user
- `_ticket_id`: ticket ID when logging a ticket operation
- `full_message`: error stack trace or verbose details

---

### F14.4 Request Logging

A NestJS middleware (`GelfRequestMiddleware`) logs every incoming HTTP request:
- On request start: `{method, path, _request_id}` at INFO level
- On request complete: `{method, path, statusCode, durationMs, _request_id}` at INFO level

---

### F14.5 Error Logging

The NestJS global exception filter logs every unhandled exception:
- `short_message`: exception message
- `full_message`: stack trace
- Level: ERROR
- `_request_id`, `_user_id` if available

---

### F14.6 NestJS Integration

```typescript
@Injectable()
export class GelfLoggerService implements LoggerService {
  log(message: string, context?: string): void { /* INFO */ }
  error(message: string, trace?: string, context?: string): void { /* ERROR */ }
  warn(message: string, context?: string): void { /* WARNING */ }
  debug(message: string, context?: string): void { /* DEBUG */ }
  verbose(message: string, context?: string): void { /* DEBUG */ }
}
```

Registered as the global NestJS logger via `app.useLogger(new GelfLoggerService())`.

---

**API Surface (this feature):** No API endpoints. Logging is a cross-cutting concern.

**Schema Surface (this feature):** No database tables. Log data flows to Graylog only.
---

## F15: Sub-Status & Action Reference Data

**Description:** Sub-statuses and actions are configurable reference data that drive ticket workflow and email notifications. The seed data and admin interfaces for `substatus`, `actions`, `issueTypes`, `contactMethods`, and `category_action_responses` must be preserved. System actions are immutable; department-type actions can be managed by staff.

**Terminology:**
- **System action:** A built-in action type (e.g., `open`, `closed`) that cannot be deleted
- **Department action:** A custom action type created by staff, linked to specific departments
- **isDefault:** Sub-status flag indicating the default selection in the close-ticket UI
- **Response template:** The email body template stored on an action or on a per-category override

**Sub-features:**
- Sub-status CRUD (with seed data)
- Action CRUD (system actions read-only; department actions manageable)
- Issue type CRUD
- Contact method CRUD
- Category action response management (see F10.6)

---

### F15.1 Sub-Status Management

**Seed data (must be present after migration):**
| name | description | status | isDefault |
|------|-------------|--------|-----------|
| Resolved | This ticket has been taken care of | closed | false |
| Duplicate | This ticket is a duplicate of another ticket | closed | false |
| Bogus | This ticket is not actually a problem or has already been taken care of | closed | false |

**Create/Update inputs:**
- `name` (string, required, max 25 chars)
- `description` (string, required, max 128 chars)
- `status` (enum `open|closed`, required, default `open`)
- `isDefault` (boolean, required, default `false`)

**Validation:**
- `name` must be non-empty.
- `status` must be `open` or `closed`.
- At most one sub-status per status value may have `isDefault = true`.

**Delete constraint:** Sub-statuses referenced by `tickets.substatus_id` or `categories.autoCloseSubstatus_id` cannot be deleted.

---

### F15.2 Action Management

**Seed data (system actions — `type = 'system'`):**
| name | description |
|------|-------------|
| open | Opened by {actionPerson} |
| assignment | {enteredByPerson} assigned this case to {actionPerson} |
| closed | Closed by {actionPerson} |
| changeCategory | Changed category from {original:category_id} to {updated:category_id} |
| changeLocation | Changed location from {original:location} to {updated:location} |
| response | {actionPerson} contacted {reportedByPerson_id} |
| duplicate | {duplicate:ticket_id} marked as a duplicate of this case. |
| update | {enteredByPerson} updated this case. |
| comment | {enteredByPerson} commented on this case. |
| upload_media | {enteredByPerson} uploaded an attachment. |

**System action rules:**
- System actions (`type = 'system'`) cannot be deleted or have their `name` changed.
- `template` and `replyEmail` on system actions can be updated by staff (to set default notification content).

**Department action inputs:**
- `name` (string, required, max 25 chars)
- `description` (string, required, max 128 chars)
- `type`: always `'department'` for new actions
- `template` (text, optional): email body template
- `replyEmail` (string max 128, optional): reply-to address

**Delete constraint:** Actions referenced by `ticketHistory.action_id`, `department_actions`, or `category_action_responses` cannot be deleted.

---

### F15.3 Issue Type CRUD

**Seed data:**
Comment, Complaint, Question, Report, Request, Violation

**Inputs:**
- `name` (string, required, max 128 chars)

**Delete constraint:** Issue types referenced by `tickets.issueType_id` cannot be deleted.

---

### F15.4 Contact Method CRUD

**Seed data:**
Email, Phone, Web Form, Other

**Inputs:**
- `name` (string, required, max 128 chars)

**Delete constraint:** Contact methods referenced by `tickets.contactMethod_id`, `tickets.responseMethod_id`, or `clients.contactMethod_id` cannot be deleted.

---

**API Surface (this feature):** see `Y1-api.md` §ReferenceData.

**Schema Surface (this feature):** uses `substatus`, `actions`, `issueTypes`, `contactMethods` — see `Y0-schema.md`.
---

## Y0: Database Schema — PostgreSQL DDL

Full PostgreSQL DDL for all 21 uReport tables, translated from `crm/scripts/mysql.sql`.

```sql
-- Enable PostGIS extension (required for geoclusters.center)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- Reference / Lookup Tables (no foreign key dependencies)
-- ============================================================

CREATE TABLE "version" (
    version VARCHAR(8) NOT NULL PRIMARY KEY
);
INSERT INTO "version" (version) VALUES ('2.1');

CREATE TABLE "contactMethods" (
    id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(128) NOT NULL
);
-- Seed data
INSERT INTO "contactMethods" (name) VALUES ('Email');
INSERT INTO "contactMethods" (name) VALUES ('Phone');
INSERT INTO "contactMethods" (name) VALUES ('Web Form');
INSERT INTO "contactMethods" (name) VALUES ('Other');

CREATE TABLE "substatus" (
    id          INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(25)  NOT NULL,
    description VARCHAR(128) NOT NULL,
    status      TEXT         NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'closed')),
    "isDefault" BOOLEAN      NOT NULL DEFAULT FALSE
);
-- Seed data
INSERT INTO "substatus" (status, name, description) VALUES
    ('closed', 'Resolved',  'This ticket has been taken care of'),
    ('closed', 'Duplicate', 'This ticket is a duplicate of another ticket'),
    ('closed', 'Bogus',     'This ticket is not actually a problem or has already been taken care of');

CREATE TABLE "actions" (
    id          INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(25)  NOT NULL,
    description VARCHAR(128) NOT NULL,
    type        TEXT         NOT NULL DEFAULT 'department'
                CHECK (type IN ('system', 'department')),
    template    TEXT,
    "replyEmail" VARCHAR(128)
);
-- Seed data
INSERT INTO "actions" (name, type, description) VALUES
    ('open',           'system', 'Opened by {actionPerson}'),
    ('assignment',     'system', '{enteredByPerson} assigned this case to {actionPerson}'),
    ('closed',         'system', 'Closed by {actionPerson}'),
    ('changeCategory', 'system', 'Changed category from {original:category_id} to {updated:category_id}'),
    ('changeLocation', 'system', 'Changed location from {original:location} to {updated:location}'),
    ('response',       'system', '{actionPerson} contacted {reportedByPerson_id}'),
    ('duplicate',      'system', '{duplicate:ticket_id} marked as a duplicate of this case.'),
    ('update',         'system', '{enteredByPerson} updated this case.'),
    ('comment',        'system', '{enteredByPerson} commented on this case.'),
    ('upload_media',   'system', '{enteredByPerson} uploaded an attachment.');

CREATE TABLE "categoryGroups" (
    id       INTEGER   GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name     VARCHAR(50) NOT NULL,
    ordering SMALLINT
);
-- Seed data
INSERT INTO "categoryGroups" (name) VALUES ('Streets'), ('Sanitation'), ('Other');

CREATE TABLE "issueTypes" (
    id   INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(128) NOT NULL
);
-- Seed data
INSERT INTO "issueTypes" (name) VALUES
    ('Comment'), ('Complaint'), ('Question'), ('Report'), ('Request'), ('Violation');

-- ============================================================
-- Core Person / Department Tables
-- ============================================================

CREATE TABLE "departments" (
    id                INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name              VARCHAR(128) NOT NULL,
    "defaultPerson_id" INTEGER
    -- FK to people added below (circular ref resolved with DEFERRABLE)
);

CREATE TABLE "people" (
    id           INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    firstname    VARCHAR(128),
    middlename   VARCHAR(128),
    lastname     VARCHAR(128),
    organization VARCHAR(128),
    address      VARCHAR(128),
    city         VARCHAR(128),
    state        VARCHAR(128),
    zip          VARCHAR(20),
    department_id INTEGER,
    username     VARCHAR(40)  UNIQUE,
    role         VARCHAR(30),
    CONSTRAINT FK_people_department_id
        FOREIGN KEY (department_id) REFERENCES "departments"(id)
);

-- Add the circular FK now that people exists
ALTER TABLE "departments"
    ADD CONSTRAINT FK_departments_defaultPerson_id
        FOREIGN KEY ("defaultPerson_id") REFERENCES "people"(id)
        DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE "peopleEmails" (
    id                   INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id            INTEGER      NOT NULL,
    email                VARCHAR(255) NOT NULL,
    label                TEXT         NOT NULL DEFAULT 'Other'
                         CHECK (label IN ('Home', 'Work', 'Other')),
    "usedForNotifications" BOOLEAN    NOT NULL DEFAULT FALSE,
    CONSTRAINT FK_peopleEmails_person_id
        FOREIGN KEY (person_id) REFERENCES "people"(id)
);

CREATE TABLE "peoplePhones" (
    id        INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id INTEGER     NOT NULL,
    number    VARCHAR(20),
    label     TEXT        NOT NULL DEFAULT 'Other'
              CHECK (label IN ('Main', 'Mobile', 'Work', 'Home', 'Fax', 'Pager', 'Other')),
    CONSTRAINT FK_peoplePhones_person_id
        FOREIGN KEY (person_id) REFERENCES "people"(id)
);

CREATE TABLE "peopleAddresses" (
    id        INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id INTEGER      NOT NULL,
    address   VARCHAR(128) NOT NULL,
    city      VARCHAR(128),
    state     VARCHAR(128),
    zip       VARCHAR(20),
    label     TEXT         NOT NULL DEFAULT 'Home'
              CHECK (label IN ('Home', 'Business', 'Rental')),
    CONSTRAINT FK_peopleAddresses_person_id
        FOREIGN KEY (person_id) REFERENCES "people"(id)
);

CREATE TABLE "clients" (
    id                INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name              VARCHAR(128) NOT NULL,
    url               VARCHAR(255),
    api_key           VARCHAR(50)  NOT NULL UNIQUE,
    "contactPerson_id" INTEGER     NOT NULL,
    "contactMethod_id" INTEGER,
    CONSTRAINT FK_clients_contactPerson_id
        FOREIGN KEY ("contactPerson_id") REFERENCES "people"(id),
    CONSTRAINT FK_clients_contactMethod_id
        FOREIGN KEY ("contactMethod_id") REFERENCES "contactMethods"(id)
);

-- ============================================================
-- Category Tables
-- ============================================================

CREATE TABLE "categories" (
    id                       INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                     VARCHAR(50)  NOT NULL,
    description              VARCHAR(512),
    department_id            INTEGER      NOT NULL,
    "defaultPerson_id"       INTEGER,
    "categoryGroup_id"       INTEGER,
    active                   BOOLEAN,
    featured                 BOOLEAN,
    "displayPermissionLevel" TEXT         NOT NULL DEFAULT 'staff'
                             CHECK ("displayPermissionLevel" IN ('staff', 'public', 'anonymous')),
    "postingPermissionLevel" TEXT         NOT NULL DEFAULT 'staff'
                             CHECK ("postingPermissionLevel" IN ('staff', 'public', 'anonymous')),
    "customFields"           TEXT,
    "lastModified"           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "slaDays"                INTEGER,
    "notificationReplyEmail" VARCHAR(128),
    "autoCloseIsActive"      BOOLEAN,
    "autoCloseSubstatus_id"  INTEGER,
    CONSTRAINT FK_categories_department_id
        FOREIGN KEY (department_id)    REFERENCES "departments"(id),
    CONSTRAINT FK_categories_defaultPerson_id
        FOREIGN KEY ("defaultPerson_id") REFERENCES "people"(id),
    CONSTRAINT FK_categories_categoryGroup_id
        FOREIGN KEY ("categoryGroup_id") REFERENCES "categoryGroups"(id)
);

CREATE TABLE "category_action_responses" (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id INTEGER NOT NULL,
    action_id   INTEGER NOT NULL,
    template    TEXT,
    "replyEmail" VARCHAR(128),
    CONSTRAINT FK_category_action_responses_category_id
        FOREIGN KEY (category_id) REFERENCES "categories"(id),
    CONSTRAINT FK_category_action_responses_action_id
        FOREIGN KEY (action_id)   REFERENCES "actions"(id)
);

CREATE TABLE "department_actions" (
    department_id INTEGER NOT NULL,
    action_id     INTEGER NOT NULL,
    PRIMARY KEY (department_id, action_id),
    CONSTRAINT FK_department_actions_department_id
        FOREIGN KEY (department_id) REFERENCES "departments"(id),
    CONSTRAINT FK_department_actions_action_id
        FOREIGN KEY (action_id)     REFERENCES "actions"(id)
);

CREATE TABLE "department_categories" (
    department_id INTEGER NOT NULL,
    category_id   INTEGER NOT NULL,
    PRIMARY KEY (department_id, category_id),
    CONSTRAINT FK_department_categories_department_id
        FOREIGN KEY (department_id) REFERENCES "departments"(id),
    CONSTRAINT FK_department_categories_category_id
        FOREIGN KEY (category_id)   REFERENCES "categories"(id)
);

-- ============================================================
-- Core Ticket Table
-- ============================================================

CREATE TABLE "tickets" (
    id                    INTEGER          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_id             INTEGER,
    category_id           INTEGER,
    "issueType_id"        INTEGER,
    client_id             INTEGER,
    "enteredByPerson_id"  INTEGER,
    "reportedByPerson_id" INTEGER,
    "assignedPerson_id"   INTEGER,
    "contactMethod_id"    INTEGER,
    "responseMethod_id"   INTEGER,
    "enteredDate"         TIMESTAMP        NOT NULL DEFAULT NOW(),
    "lastModified"        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    "addressId"           INTEGER,
    latitude              DOUBLE PRECISION,
    longitude             DOUBLE PRECISION,
    location              VARCHAR(128),
    city                  VARCHAR(128),
    state                 VARCHAR(128),
    zip                   VARCHAR(40),
    status                VARCHAR(20)      NOT NULL DEFAULT 'open',
    "closedDate"          TIMESTAMPTZ,
    substatus_id          INTEGER,
    "additionalFields"    VARCHAR(255),
    "customFields"        TEXT,
    description           TEXT,
    CONSTRAINT FK_tickets_parent_id
        FOREIGN KEY (parent_id)             REFERENCES "tickets"(id),
    CONSTRAINT FK_tickets_category_id
        FOREIGN KEY (category_id)           REFERENCES "categories"(id),
    CONSTRAINT FK_tickets_client_id
        FOREIGN KEY (client_id)             REFERENCES "clients"(id),
    CONSTRAINT FK_tickets_enteredByPerson_id
        FOREIGN KEY ("enteredByPerson_id")  REFERENCES "people"(id),
    CONSTRAINT FK_tickets_assignedPerson_id
        FOREIGN KEY ("assignedPerson_id")   REFERENCES "people"(id),
    CONSTRAINT FK_tickets_substatus_id
        FOREIGN KEY (substatus_id)          REFERENCES "substatus"(id)
);

-- ============================================================
-- Ticket History & Media
-- ============================================================

CREATE TABLE "ticketHistory" (
    id                    INTEGER    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id             INTEGER    NOT NULL,
    "enteredByPerson_id"  INTEGER,
    "actionPerson_id"     INTEGER,
    action_id             INTEGER    NOT NULL,
    "enteredDate"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "actionDate"          TIMESTAMP   NOT NULL DEFAULT NOW(),
    notes                 TEXT,
    data                  TEXT,
    "sentNotifications"   TEXT,
    CONSTRAINT FK_ticketHistory_ticket_id
        FOREIGN KEY (ticket_id)            REFERENCES "tickets"(id),
    CONSTRAINT FK_ticketHistory_enteredByPerson_id
        FOREIGN KEY ("enteredByPerson_id") REFERENCES "people"(id),
    CONSTRAINT FK_ticketHistory_actionPerson_id
        FOREIGN KEY ("actionPerson_id")    REFERENCES "people"(id),
    CONSTRAINT FK_ticketHistory_action_id
        FOREIGN KEY (action_id)            REFERENCES "actions"(id)
);

CREATE TABLE "media" (
    id               INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id        INTEGER      NOT NULL,
    filename         VARCHAR(128) NOT NULL,
    "internalFilename" VARCHAR(50) NOT NULL,
    mime_type        VARCHAR(128),
    uploaded         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    person_id        INTEGER,
    CONSTRAINT FK_media_ticket_id
        FOREIGN KEY (ticket_id) REFERENCES "tickets"(id),
    CONSTRAINT FK_media_person_id
        FOREIGN KEY (person_id) REFERENCES "people"(id)
);

-- ============================================================
-- Bookmarks
-- ============================================================

CREATE TABLE "bookmarks" (
    id          INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id   INTEGER       NOT NULL,
    type        VARCHAR(128)  NOT NULL DEFAULT 'search',
    name        VARCHAR(128),
    "requestUri" VARCHAR(1024) NOT NULL,
    CONSTRAINT FK_bookmarks_person_id
        FOREIGN KEY (person_id) REFERENCES "people"(id)
);

-- ============================================================
-- Geo-Clustering
-- ============================================================

CREATE TABLE "geoclusters" (
    id    INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    level SMALLINT NOT NULL,
    center geometry(Point, 4326) NOT NULL
);

CREATE INDEX idx_geoclusters_center ON "geoclusters" USING GIST(center);

CREATE TABLE "ticket_geodata" (
    ticket_id    INTEGER NOT NULL PRIMARY KEY,
    cluster_id_0 INTEGER,
    cluster_id_1 INTEGER,
    cluster_id_2 INTEGER,
    cluster_id_3 INTEGER,
    cluster_id_4 INTEGER,
    cluster_id_5 INTEGER,
    cluster_id_6 INTEGER,
    FOREIGN KEY (ticket_id)    REFERENCES "tickets"    (id),
    FOREIGN KEY (cluster_id_0) REFERENCES "geoclusters"(id),
    FOREIGN KEY (cluster_id_1) REFERENCES "geoclusters"(id),
    FOREIGN KEY (cluster_id_2) REFERENCES "geoclusters"(id),
    FOREIGN KEY (cluster_id_3) REFERENCES "geoclusters"(id),
    FOREIGN KEY (cluster_id_4) REFERENCES "geoclusters"(id),
    FOREIGN KEY (cluster_id_5) REFERENCES "geoclusters"(id),
    FOREIGN KEY (cluster_id_6) REFERENCES "geoclusters"(id)
);
```

---

### Schema Notes

1. **IDENTITY vs SERIAL:** All auto-increment PKs use `GENERATED ALWAYS AS IDENTITY` (SQL standard; preferred over `SERIAL` in PostgreSQL 10+).
2. **Unsigned integers:** PostgreSQL has no unsigned integer type. `INT UNSIGNED` in MySQL is mapped to `INTEGER`. Application code must enforce positive values.
3. **Circular FK (departments ↔ people):** The `departments.defaultPerson_id → people.id` FK is added with `DEFERRABLE INITIALLY DEFERRED` to allow inserting both tables before the FK is checked.
4. **ENUM → TEXT + CHECK:** All MySQL `ENUM` columns are translated to `TEXT` with `CHECK` constraints for easier future extension.
5. **Spatial:** `geoclusters.center` uses PostGIS `geometry(Point, 4326)` with a GiST index. `tickets.latitude` and `tickets.longitude` remain as `DOUBLE PRECISION` scalars.
6. **Timestamps:** `TIMESTAMP` (no timezone) used where MySQL used `DATETIME`; `TIMESTAMPTZ` used where MySQL used `TIMESTAMP` (which is timezone-aware in MySQL behavior).
7. **Backtick identifiers:** MySQL backticks replaced with PostgreSQL double-quoted identifiers for reserved words or camelCase names.
---

## Y1: REST API Endpoints Catalog

All endpoints support format negotiation via URL suffix (`.json`, `.xml`, `.csv`, `.txt`) or `Accept` header (see F03). Permission annotations use `[anon]`, `[public]`, `[staff]`. All staff endpoints return `403` for non-staff authenticated users and `401` for unauthenticated callers.

---

### §Open311: GeoReport v2 Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/open311/v2/services[.json\|.xml]` | `[anon]` | List visible service categories |
| GET | `/open311/v2/services/:id[.json\|.xml]` | `[anon]` | Single service definition with attributes |
| POST | `/open311/v2/requests[.json\|.xml]` | `[api_key]` | Submit new service request |
| GET | `/open311/v2/requests[.json\|.xml]` | `[anon]` | Query service requests with filters |
| GET | `/open311/v2/requests/:id[.json\|.xml]` | `[anon]` | Single service request |
| GET | `/open311/v2/tokens/:token[.json\|.xml]` | `[anon]` | Look up request ID by token |

**POST /open311/v2/requests** — request body (form-encoded or JSON):
```
api_key          required  string
service_code     required  integer
lat              cond.     float
long             cond.     float
address_string   cond.     string
description               string
first_name                string
last_name                 string
email                     string
phone                     string
attribute[{code}]         string   (repeating, for custom fields)
media_url                 string
address_id                integer
device_id                 string   (ignored)
jurisdiction_id           string   (ignored)
```

**POST /open311/v2/requests** — success response (200):
```json
[{
  "service_request_id": 12345,
  "token": "a3f2...uuid",
  "service_notice": "",
  "account_id": ""
}]
```

**GET /open311/v2/requests** — query parameters:
```
status                    string   "open" or "closed"
service_code              integer
service_request_id        string   comma-separated IDs
start_date                string   ISO 8601
end_date                  string   ISO 8601
lat                       float
long                      float
radius                    integer  meters
page                      integer  default 1
page_size                 integer  default 100, max 500
jurisdiction_id           string   ignored
```

---

### §Auth: OIDC Authentication Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth/login` | `[anon]` | Initiate OIDC authorization code flow |
| GET | `/auth/callback` | `[anon]` | OIDC callback — exchange code for tokens |
| GET | `/auth/logout` | `[public]` | Destroy session, redirect to IdP end-session |
| GET | `/account` | `[public]` | View own people record |
| PUT | `/account` | `[public]` | Update own people record |

---

### §Tickets: Ticket Lifecycle Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tickets` | `[anon]` | List tickets (filtered by role visibility) |
| POST | `/tickets` | `[public]` | Create ticket |
| GET | `/tickets/:id` | `[anon]` | View ticket detail |
| PUT | `/tickets/:id` | `[staff]` | Update ticket fields |
| POST | `/tickets/:id/assign` | `[staff]` | Assign ticket |
| POST | `/tickets/:id/close` | `[staff]` | Close ticket |
| POST | `/tickets/:id/duplicate` | `[staff]` | Mark as duplicate |
| POST | `/tickets/:id/reopen` | `[staff]` | Re-open closed ticket |
| POST | `/tickets/:id/comment` | `[staff]` | Add comment |
| POST | `/tickets/:id/response` | `[staff]` | Add response action |
| GET | `/tickets/:id/history` | `[anon]` | View ticket history (role-filtered) |

**GET /tickets** — query parameters:
```
status          string
category_id     integer
department_id   integer
person_id       integer   (assigned or reported by)
start_date      string    ISO 8601
end_date        string    ISO 8601
page            integer
page_size       integer   default 25, max 500
```

**POST /tickets** — request body:
```json
{
  "category_id": 5,
  "issueType_id": 1,
  "description": "Large pothole at Main and 3rd",
  "location": "Main St & 3rd Ave",
  "city": "Bloomington",
  "state": "IN",
  "zip": "47401",
  "latitude": 39.165,
  "longitude": -86.526,
  "contactMethod_id": 3,
  "customFields": "{\"pothole_size\": \"large\"}"
}
```

**POST /tickets/:id/close** — request body:
```json
{
  "substatus_id": 1,
  "notes": "Repaired on 2024-01-20"
}
```

**POST /tickets/:id/duplicate** — request body:
```json
{
  "parent_id": 12300
}
```

---

### §Media: Attachment Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tickets/:id/media` | `[anon]` | List attachments for ticket |
| POST | `/tickets/:id/media` | `[public]` | Upload attachment (multipart/form-data) |
| GET | `/tickets/:id/media/:mediaId` | `[anon]` | Stream attachment file |
| GET | `/tickets/:id/media/:mediaId/thumbnail` | `[anon]` | Stream thumbnail (images only) |
| DELETE | `/tickets/:id/media/:mediaId` | `[staff]` | Delete attachment |

---

### §Search: Solr Search Endpoint

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search` | `[anon]` | Full-text search with facets |

**GET /search** — query parameters:
```
q               string    full-text query (default: *)
status          string
category_id     integer
department_id   integer
assignedPerson_id integer
start_date      string    ISO 8601
end_date        string    ISO 8601
sort            string    "relevance" (default) or "date"
page            integer   default 1
rows            integer   default 25, max 500
```

---

### §Categories: Category Admin Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/categories` | `[anon]` | List categories (role-filtered) |
| POST | `/categories` | `[staff]` | Create category |
| GET | `/categories/:id` | `[anon]` | View category |
| PUT | `/categories/:id` | `[staff]` | Update category |
| DELETE | `/categories/:id` | `[staff]` | Delete category |
| GET | `/category-groups` | `[anon]` | List category groups |
| POST | `/category-groups` | `[staff]` | Create group |
| PUT | `/category-groups/:id` | `[staff]` | Update group |
| DELETE | `/category-groups/:id` | `[staff]` | Delete group |
| GET | `/categories/:id/actions/:actionId/response` | `[staff]` | Get action response |
| POST | `/categories/:id/actions/:actionId/response` | `[staff]` | Upsert action response |
| DELETE | `/categories/:id/actions/:actionId/response` | `[staff]` | Delete action response |

---

### §Departments: Department Admin Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/departments` | `[anon]` | List departments |
| POST | `/departments` | `[staff]` | Create department |
| GET | `/departments/:id` | `[anon]` | View department |
| PUT | `/departments/:id` | `[staff]` | Update department |
| DELETE | `/departments/:id` | `[staff]` | Delete department |
| GET | `/departments/:id/categories` | `[staff]` | List department–category associations |
| POST | `/departments/:id/categories` | `[staff]` | Add category association |
| DELETE | `/departments/:id/categories/:catId` | `[staff]` | Remove category association |
| GET | `/departments/:id/actions` | `[staff]` | List department–action associations |
| POST | `/departments/:id/actions` | `[staff]` | Add action association |
| DELETE | `/departments/:id/actions/:actionId` | `[staff]` | Remove action association |

---

### §People: People & Client Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/people` | `[staff]` | List people |
| POST | `/people` | `[staff]` | Create person |
| GET | `/people/:id` | `[staff]` | View person |
| PUT | `/people/:id` | `[staff]` | Update person |
| DELETE | `/people/:id` | `[staff]` | Delete person |
| GET | `/people/search` | `[staff]` | Search people by name/email |
| GET | `/users` | `[staff]` | List staff accounts |
| POST | `/people/:id/emails` | `[staff]` | Add email |
| PUT | `/people/:id/emails/:emailId` | `[staff]` | Update email |
| DELETE | `/people/:id/emails/:emailId` | `[staff]` | Delete email |
| POST | `/people/:id/phones` | `[staff]` | Add phone |
| PUT | `/people/:id/phones/:phoneId` | `[staff]` | Update phone |
| DELETE | `/people/:id/phones/:phoneId` | `[staff]` | Delete phone |
| POST | `/people/:id/addresses` | `[staff]` | Add address |
| PUT | `/people/:id/addresses/:addrId` | `[staff]` | Update address |
| DELETE | `/people/:id/addresses/:addrId` | `[staff]` | Delete address |

### §Clients: API Client Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/clients` | `[staff]` | List API clients |
| POST | `/clients` | `[staff]` | Create client |
| GET | `/clients/:id` | `[staff]` | View client |
| PUT | `/clients/:id` | `[staff]` | Update client |
| DELETE | `/clients/:id` | `[staff]` | Delete client |

---

### §Bookmarks: Bookmark Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/bookmarks` | `[public]` | List own bookmarks |
| POST | `/bookmarks` | `[public]` | Create bookmark |
| DELETE | `/bookmarks/:id` | `[public]` | Delete own bookmark |

---

### §Locations: Geo-Cluster Map Endpoint

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/locations` | `[anon]` | Cluster data for map rendering |

---

### §Reports: Reporting Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/metrics` | `[staff]` | Dashboard aggregate metrics |
| GET | `/reports` | `[staff]` | Exportable ticket report with filters |

---

### §ReferenceData: Sub-Status, Actions, Issue Types, Contact Methods

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/substatus` | `[staff]` | List sub-statuses |
| POST | `/substatus` | `[staff]` | Create sub-status |
| PUT | `/substatus/:id` | `[staff]` | Update sub-status |
| DELETE | `/substatus/:id` | `[staff]` | Delete sub-status |
| GET | `/actions` | `[staff]` | List actions |
| POST | `/actions` | `[staff]` | Create department action |
| PUT | `/actions/:id` | `[staff]` | Update action (template/replyEmail only for system) |
| DELETE | `/actions/:id` | `[staff]` | Delete department action |
| GET | `/issue-types` | `[staff]` | List issue types |
| POST | `/issue-types` | `[staff]` | Create issue type |
| PUT | `/issue-types/:id` | `[staff]` | Update issue type |
| DELETE | `/issue-types/:id` | `[staff]` | Delete issue type |
| GET | `/contact-methods` | `[anon]` | List contact methods |
| POST | `/contact-methods` | `[staff]` | Create contact method |
| PUT | `/contact-methods/:id` | `[staff]` | Update contact method |
| DELETE | `/contact-methods/:id` | `[staff]` | Delete contact method |
---

## Y2: Cross-Feature Error Catalog

Canonical list of all HTTP error responses across the uReport API. All error responses are format-negotiated (see F03). JSON error envelope: `{"statusCode": NNN, "error": "SHORT_CODE", "description": "Human-readable message"}`.

---

### Authentication & Authorization Errors

| HTTP | Code | Message | Trigger |
|------|------|---------|---------|
| 401 | `UNAUTHORIZED` | "Authentication required" | Endpoint requires login; no session present |
| 403 | `FORBIDDEN` | "Insufficient permissions" | Authenticated user lacks required role |
| 403 | `INVALID_API_KEY` | "Invalid api_key" | `POST /open311/v2/requests` with missing or invalid `api_key` |
| 400 | `INVALID_STATE` | "Invalid state parameter" | OIDC callback state mismatch |
| 400 | `INVALID_NONCE` | "Invalid nonce in id_token" | OIDC id_token nonce mismatch |
| 502 | `IDP_ERROR` | "Identity provider error" | OIDC token endpoint unreachable or error response |

---

### Validation Errors (400 Bad Request)

| HTTP | Code | Message | Trigger |
|------|------|---------|---------|
| 400 | `MISSING_PARAMETER` | "service_code is required" | Required Open311 field absent |
| 400 | `MISSING_PARAMETER` | "lat and long or address_string required" | Open311 POST without location |
| 400 | `MISSING_PARAMETER` | "lat and long required for radius search" | Radius filter without coordinates |
| 400 | `MISSING_PARAMETER` | "requestUri is required" | Bookmark create without requestUri |
| 400 | `MISSING_PARAMETER` | "Authorization code required" | OIDC callback without code |
| 400 | `INVALID_INPUT` | "Coordinates out of valid range" | lat outside [-90,90] or lon outside [-180,180] |
| 400 | `INVALID_INPUT` | "status must be 'open' or 'closed'" | Filter status not one of allowed values |
| 400 | `INVALID_INPUT` | "Invalid date format; use ISO 8601" | Date parameter not parseable as ISO 8601 |
| 400 | `INVALID_INPUT` | "customFields must be valid JSON" | Non-JSON string in customFields |
| 400 | `INVALID_INPUT` | "permissionLevel must be staff, public, or anonymous" | Invalid permissionLevel value |
| 400 | `INVALID_INPUT` | "substatus_id must reference a closed sub-status" | Close ticket with open sub-status |
| 400 | `INVALID_INPUT` | "A ticket cannot be its own parent" | Duplicate self-reference |
| 400 | `INVALID_INPUT` | "Assignee must belong to the ticket's department" | Assignment to wrong-department person |
| 400 | `INVALID_INPUT` | "zoom_level must be 0–6" | Geo-cluster endpoint invalid zoom level |
| 400 | `INVALID_INPUT` | "requestUri must be a relative path" | Bookmark with absolute URL |
| 400 | `INVALID_FILE_TYPE` | "File type not permitted" | Upload with disallowed MIME type |
| 400 | `MISSING_FILE` | "No file provided" | Media upload without file |
| 413 | `FILE_TOO_LARGE` | "File exceeds maximum size" | Upload exceeds MEDIA_MAX_BYTES |

---

### Conflict Errors (409 Conflict)

| HTTP | Code | Message | Trigger |
|------|------|---------|---------|
| 409 | `CONFLICT` | "Ticket is already closed" | Close already-closed ticket |
| 409 | `CONFLICT` | "Ticket is already open" | Re-open already-open ticket |
| 409 | `CONFLICT` | "Username already in use" | Duplicate `people.username` |
| 409 | `CONFLICT` | "API key already in use" | Duplicate `clients.api_key` |
| 409 | `CONFLICT` | "Cannot delete category with existing tickets" | Delete category with tickets |
| 409 | `CONFLICT` | "Person cannot be deleted — referenced by tickets" | Delete person referenced by tickets |
| 409 | `CONFLICT` | "Client cannot be deleted — referenced by tickets" | Delete client referenced by tickets |
| 409 | `CONFLICT` | "Cannot delete — referenced by other records" | Generic FK violation on delete |

---

### Not Found Errors (404)

| HTTP | Code | Message | Trigger |
|------|------|---------|---------|
| 404 | `NOT_FOUND` | "Service not found" | Category not found or not visible to caller's role |
| 404 | `NOT_FOUND` | "Service request not found" | Ticket not found or category not visible |
| 404 | `NOT_FOUND` | "Token not found" | `GET /tokens/:token` with unknown token |
| 404 | `NOT_FOUND` | "Attachment not found" | Media record not found |
| 404 | `NOT_FOUND` | "Attachment file not found" | Media record exists but file missing from disk |
| 404 | `NOT_FOUND` | "Bookmark not found" | Bookmark not found or belongs to other user |
| 404 | `NOT_FOUND` | "Department not found" | Referenced department does not exist |
| 404 | `NOT_FOUND` | "Parent ticket not found" | Duplicate parent ticket does not exist |
| 404 | `NOT_FOUND` | "Contact person not found" | Client contactPerson_id does not exist |

---

### Server Errors (5xx)

| HTTP | Code | Message | Trigger |
|------|------|---------|---------|
| 500 | `SERVER_ERROR` | "Internal server error" | Unhandled exception; logged to GELF |
| 502 | `IDP_ERROR` | "Identity provider error" | OIDC IdP unreachable |
| 503 | `SEARCH_UNAVAILABLE` | "Search service unavailable" | Solr unreachable (search only — ticket writes proceed) |

---

### Open311 GeoReport v2 Error Envelope

For Open311 endpoints, errors are wrapped in the GeoReport v2 error format:
```json
[{
  "code": 403,
  "description": "Invalid api_key"
}]
```

For XML format:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<errors>
  <error>
    <code>403</code>
    <description>Invalid api_key</description>
  </error>
</errors>
```
---

## Y3: External Integration Points

All external systems that uReport integrates with, their configuration, and the contracts that must be preserved.

---

### INT-1: Apache Solr

**Role:** Full-text ticket search (F05)

**Client library:** Node Solr client (e.g., `solr-client` npm package)

**Configuration:**

| Env Variable | Description | Default |
|-------------|-------------|---------|
| `SOLR_HOST` | Solr server hostname | `localhost` |
| `SOLR_PORT` | Solr server port | `8983` |
| `SOLR_CORE` | Solr core name | `uReport` |
| `SOLR_PATH` | Solr base path | `/solr` |

**Contract requirements:**
- Solr core `uReport` must exist with the field schema defined in F05 §Solr Index Schema.
- The `eDisMax` query parser must be enabled in the Solr configuration.
- All field names used in queries must match the legacy Solarium field names exactly.
- Solr unavailability must not fail ticket write operations (fire-and-forget indexing with GELF error logging).

**Failure handling:**
- If Solr is unreachable during a ticket write, log the indexing failure via GELF (`warn` level) and continue.
- If Solr is unreachable during a search request, return HTTP 503 `SEARCH_UNAVAILABLE`.

---

### INT-2: OIDC Identity Provider

**Role:** User authentication (F04)

**Client library:** `openid-client` npm package

**Configuration:**

| Env Variable | Description |
|-------------|-------------|
| `OIDC_ISSUER` | OIDC issuer URL (for discovery endpoint) |
| `OIDC_CLIENT_ID` | Registered client ID |
| `OIDC_CLIENT_SECRET` | Client secret |
| `OIDC_REDIRECT_URI` | Callback URL (must match IdP registration) |
| `OIDC_END_SESSION_ENDPOINT` | Optional: IdP end-session URL for logout |

**Contract requirements:**
- Authorization code flow with `openid email profile` scopes.
- `id_token` must contain claims: `sub`, `email`, `given_name`, `family_name`.
- The `sub` claim is the stable user identifier — used as `people.username`.
- PKCE is not required (but not excluded) — match the capability of the legacy `facile-it/oidc-client`.

**Failure handling:**
- If the IdP is unreachable during login initiation, return a user-facing error page (HTTP 502).
- If the IdP returns an error in the callback, log via GELF and return HTTP 502 `IDP_ERROR`.

---

### INT-3: SMTP Email Server

**Role:** Ticket event email notifications (F07)

**Client library:** `nodemailer` npm package

**Configuration:**

| Env Variable | Description | Default |
|-------------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | — |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | — |
| `SMTP_PASS` | SMTP password | — |
| `SMTP_SECURE` | `true` for port 465 TLS | `false` |
| `SMTP_FROM` | From address | `noreply@city.gov` |

**Contract requirements:**
- All email content (templates, subjects, reply-to addresses) must match the legacy PHPMailer output for the same input data.
- Emails must be sent synchronously within the ticket action request (not queued asynchronously), matching legacy behavior — unless a queue is explicitly added as a non-breaking enhancement.

**Failure handling:**
- SMTP delivery failure: log via GELF (`error` level); do not fail the ticket action that triggered the email.
- Failed sends are not automatically retried; staff can manually resend via the ticket response action.

---

### INT-4: Graylog / GELF

**Role:** Structured application logging (F14)

**Client library:** A Node GELF client (e.g., `gelf-pro` or `node-gelf-pro` npm package)

**Configuration:**

| Env Variable | Description | Default |
|-------------|-------------|---------|
| `GRAYLOG_HOST` | Graylog server hostname | `localhost` |
| `GRAYLOG_PORT` | GELF input port | `12201` |
| `GRAYLOG_TRANSPORT` | `udp` or `tcp` | `udp` |
| `GRAYLOG_FACILITY` | Facility label | `uReport` |

**Contract requirements:**
- GELF message format version `1.1`.
- Log levels must map to GELF/syslog numeric levels as defined in F14 §Log Levels.
- All HTTP requests must be logged with method, path, status code, and duration.
- All unhandled exceptions must be logged with stack trace.

**Failure handling:**
- If Graylog is unreachable, fall back to `console.error` (stderr) — application must not fail due to logging unavailability.

---

### INT-5: PostgreSQL + PostGIS

**Role:** Primary data store (F06, all features)

**Client library:** Prisma ORM; raw SQL via Prisma `$queryRaw` for PostGIS spatial operations

**Configuration:**

| Env Variable | Description |
|-------------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (`postgresql://user:pass@host:5432/dbname`) |

**Contract requirements:**
- PostgreSQL ≥ 14 required.
- PostGIS extension ≥ 3.0 required (for `geometry(Point, 4326)` and `<->` KNN operator).
- All FK constraints, CHECK constraints, and UNIQUE constraints defined in `Y0-schema.md` must be enforced by the database, not just the application layer.
- Prisma migrations (`prisma migrate deploy`) must be run before application startup.

---

### INT-6: Redis (Session Store)

**Role:** Server-side session storage (F04)

**Client library:** `connect-redis` + `ioredis` npm packages (or NestJS session adapter)

**Configuration:**

| Env Variable | Description | Default |
|-------------|-------------|---------|
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `SESSION_SECRET` | Cookie signing secret | — |
| `SESSION_TTL_SECONDS` | Session expiry in seconds | `3600` |

**Note:** Redis is required in production. For development, an in-memory session store may be used but is not supported in multi-instance deployments.

---

### INT-7: Local Filesystem (Media Storage)

**Role:** File attachment storage (F08)

**Configuration:**

| Env Variable | Description | Default |
|-------------|-------------|---------|
| `MEDIA_STORAGE_PATH` | Absolute path for file storage | `/var/uReport/media` |
| `MEDIA_MAX_BYTES` | Maximum upload file size | `10485760` (10 MB) |

**Contract requirements:**
- The storage path must be writable by the Node.js process.
- Files are organized as `{MEDIA_STORAGE_PATH}/{ticket_id}/{internalFilename}`.
- Thumbnails are stored at `{MEDIA_STORAGE_PATH}/{ticket_id}/thumbnails/{internalFilename}`.
- In a containerized deployment, this path should be a mounted persistent volume.
