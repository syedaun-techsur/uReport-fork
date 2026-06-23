## Story Map Matrix

> **Reading the map:** Each row = one user story. Columns = journey stages from the persona's primary journey. NaC = Natural Acceptance Criterion derived from JTBD outcome × journey stage. Release = R1/R2/R3.

---

### PER-01: Marcus Webb — Anonymous Citizen

**Primary Journeys:** JRN-01.1 (Anonymous Web Form Submission) · JRN-01.2 (Open311 API — Programmatic)

#### JRN-01.1 Journey Stages: Discover → Select Category → Locate Issue → Describe & Attach → Submit → Confirm

| SM-ID | Story | Journey Stage | Epic | NaC (JTBD Source) | Release |
|---|---|---|---|---|---|
| SM-0.1 | **US-0.1** Browse Available Service Categories | Select Category | Epic 0 (F0) | JTBD-01.1: "Clear category selection with plain-language descriptions" → `GET /open311/v2/services` returns all `displayPermissionLevel='anonymous'` categories with `description` and `group` fields in < 200ms | R1 |
| SM-0.2 | **US-0.2** Retrieve Single Service Definition with Custom Attributes | Select Category | Epic 0 (F0) | JTBD-01.1: "Provide a clear category selection" → `GET /open311/v2/services/:id` returns the `attributes` array so the caller knows exactly which fields to fill before submitting | R1 |
| SM-2.1 | **US-2.1** Anonymous Access to Public Categories and Tickets | Discover | Epic 2 (F2) | JTBD-01.1: "Zero authentication prompts for anonymous-eligible categories" → Anonymous caller can browse and post without any auth prompt; `displayPermissionLevel='anonymous'` filter applied server-side | R1 |
| SM-1.1 | **US-1.1** Submit a Service Request via Web Form | Submit | Epic 1 (F1) | JTBD-01.1: "First-time user completes submission in under 3 minutes" → Web form creates ticket from `category_id` + location in ≤ 3 min with no login; `action='open'` logged to `ticketHistory` on creation | R1 |
| SM-0.3 | **US-0.3** Submit a Service Request via Open311 API | Submit | Epic 0 (F0) | JTBD-01.1: "Accepts a service request submission without any login step" → `POST /open311/v2/requests` with `api_key` creates ticket and returns `service_request_id` + `token`; zero auth prompts for anonymous categories | R1 |
| SM-3.1 | **US-3.1** Request JSON Response via Accept Header or URL Suffix | Submit | Epic 3 (F3) | JTBD-01.1: "Returns a unique confirmation token immediately after submission" → API response with `Accept: application/json` returns byte-compatible JSON with `token` field matching legacy PHP output | R1 |
| SM-3.2 | **US-3.2** Request XML Response via Accept Header or URL Suffix | Submit | Epic 3 (F3) | JTBD-01.1: "Open311 response byte-compatible with PHP implementation (NFR-1)" → `.xml` suffix returns XML with CDATA wrapping identical to legacy for the same input fixture | R1 |
| SM-3.4 | **US-3.4** Format Resolution Priority is Consistent | Submit | Epic 3 (F3) | JTBD-01.1: "Response format negotiated correctly" → URL suffix > query param > Accept header priority order is consistent so external API clients can reliably control format | R1 |
| SM-0.6 | **US-0.6** Look Up Request ID by Submission Token | Confirm | Epic 0 (F0) | JTBD-01.2: "Token lookup returns ticket status in ≤ 200ms without authentication" → `GET /open311/v2/tokens/:token` returns `{token, service_request_id}` in ≤ 200ms, no auth required | R1 |
| SM-0.5 | **US-0.5** Retrieve a Single Service Request by ID | Confirm | Epic 0 (F0) | JTBD-01.2: "Exposes ticket status and last-modified date to anonymous users" → `GET /open311/v2/requests/:id` returns current status in single-element array; returns 404 if not visible to caller's role | R1 |
| SM-0.4 | **US-0.4** Query Service Requests with Filters | Discover | Epic 0 (F0) | JTBD-01.3: "Publicly accessible ticket list queryable by geographic location" → `GET /open311/v2/requests` with `lat/long/radius` returns only `displayPermissionLevel='anonymous'` tickets in ≤ 200ms | R1 |

#### JRN-01.2 Journey Stages: Discover Services → Submit Request → Receive Token → Poll for Status → Query Nearby

| SM-ID | Story | Journey Stage | Epic | NaC (JTBD Source) | Release |
|---|---|---|---|---|---|
| SM-9.1 | **US-9.1** View Geo-Clustered Ticket Map | Query Nearby | Epic 9 (F9) | JTBD-01.3: "Geo-cluster map view surfaces nearby reports visually" → `GET /locations` returns cluster objects filtered by caller's role; anonymous user can confirm whether an issue near their address is already reported | R2 |
| SM-9.2 | **US-9.2** Ticket Receives Geo-Cluster Assignment on Creation | Submit Request | Epic 9 (F9) | JTBD-01.1: "Accepts location input (GPS coordinates) from a mobile browser" → On ticket creation with lat/lon, `ticket_geodata` row is upserted for all 7 cluster levels so ticket appears on map immediately | R2 |
| SM-3.5 | **US-3.5** View HTML Responses in Browser | Discover Services | Epic 3 (F3) | JTBD-01.1: "Form renders correctly on a mobile browser without a native app" → Browser requests receive full HTML with header/nav/footer; mobile-compatible layout matches existing PHP interface structure | R1 |

---
