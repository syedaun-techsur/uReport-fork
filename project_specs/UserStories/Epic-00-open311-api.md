## Epic 0: Open311 GeoReport v2 REST API (F0)

The Open311 API is the primary public interface of uReport. All routes, parameters, status codes, and response bodies must be byte-compatible with the legacy PHP implementation so external consumers require zero changes after the re-platform.

---

### US-0.1: Browse Available Service Categories
**As an** Anonymous Citizen, **I want to** retrieve the list of available service categories via the Open311 API, **so that** I (or the app acting on my behalf) can present valid service options before submitting a request.

**Acceptance Criteria:**
- [ ] `GET /open311/v2/services` returns all active categories where `displayPermissionLevel = 'anonymous'` for unauthenticated callers
- [ ] Each category object includes `service_code`, `service_name`, `description`, `metadata`, `type` (`"realtime"`), `keywords`, and `group` fields
- [ ] Response format is negotiated via `.json` / `.xml` URL suffix or `Accept` header
- [ ] `jurisdiction_id` query parameter is accepted and silently ignored
- [ ] Empty service list returns `[]` (not `null`)
- [ ] Response is byte-compatible with the legacy PHP output for the same input fixture

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.2: Retrieve Single Service Definition with Custom Attributes
**As an** Anonymous Citizen, **I want to** retrieve the detailed definition for a specific service category, **so that** I can understand what custom fields are required before submitting a request.

**Acceptance Criteria:**
- [ ] `GET /open311/v2/services/:id` returns a `ServiceDefinition` object including an `attributes` array
- [ ] Each attribute includes `variable`, `code`, `datatype`, `required`, `datatype_description`, `order`, `description`, and `values` (for list types)
- [ ] Returns HTTP 404 if the category does not exist or is not visible to the caller's role
- [ ] Response is available in `.json` and `.xml` formats

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.3: Submit a Service Request via Open311 API
**As an** Anonymous Citizen, **I want to** submit a service request through the Open311 API using an `api_key`, **so that** third-party apps and city portals can programmatically create tickets on my behalf.

**Acceptance Criteria:**
- [ ] `POST /open311/v2/requests` validates `api_key` against the `clients` table; returns HTTP 403 on missing/invalid key
- [ ] `service_code` must reference an active category with `postingPermissionLevel = 'anonymous'`; returns HTTP 404 otherwise
- [ ] Either `lat`+`long` or `address_string` is required; returns HTTP 400 if neither provided
- [ ] `lat` must be in [-90, 90]; `long` in [-180, 180]; returns HTTP 400 if out of range
- [ ] Response contains `service_request_id`, `token`, `service_notice` (empty string), and `account_id` (empty string)
- [ ] Submission token is stored in `ticketHistory` for later lookup
- [ ] Geo-cluster assignment is triggered if lat/lon provided (F9)
- [ ] Solr index entry is created for the new ticket (F5)
- [ ] `open` email notification is triggered (F7)

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.4: Query Service Requests with Filters
**As an** Anonymous Citizen, **I want to** query publicly visible service requests with status and date filters, **so that** I can check whether a similar issue has already been reported in my area.

**Acceptance Criteria:**
- [ ] `GET /open311/v2/requests` returns only tickets in categories visible at the caller's permission level
- [ ] Supports filter parameters: `status`, `service_code`, `start_date`, `end_date`, `lat`/`long`/`radius`, `page`, `page_size`
- [ ] `status` must be `open` or `closed`; returns HTTP 400 for other values
- [ ] `start_date` and `end_date` must be valid ISO 8601; returns HTTP 400 if malformed
- [ ] `page_size` defaults to 100; values above 500 are silently clamped to 500
- [ ] Radius search requires both `lat` and `long`; returns HTTP 400 if radius provided without coordinates
- [ ] Each result includes `service_request_id`, `status`, `service_name`, `description`, `requested_datetime`, `updated_datetime`, `lat`, `long`, `address`, and `media_url`

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.5: Retrieve a Single Service Request by ID
**As an** Anonymous Citizen, **I want to** look up a specific service request by its ID, **so that** I can check the current status of a report I (or an app) submitted earlier.

**Acceptance Criteria:**
- [ ] `GET /open311/v2/requests/:id` returns a single-element array wrapping a `ServiceRequest` object (GeoReport v2 spec requires array envelope)
- [ ] Returns HTTP 404 if the ticket does not exist or its category is not visible to the caller's role
- [ ] Response schema is identical to the list endpoint's item schema
- [ ] Response is available in `.json` and `.xml` formats

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.6: Look Up Request ID by Submission Token
**As an** Anonymous Citizen, **I want to** exchange my submission token for the corresponding service request ID, **so that** I can track the request status without needing an account.

**Acceptance Criteria:**
- [ ] `GET /open311/v2/tokens/:token` returns `{token, service_request_id}` array object
- [ ] Returns HTTP 404 if the token does not exist in `ticketHistory`
- [ ] Token lookup is always allowed regardless of caller's role (no authentication required)
- [ ] Response is available in `.json` and `.xml` formats

**Priority:** P0 | **Feature Ref:** F0

---
