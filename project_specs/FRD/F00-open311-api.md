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
