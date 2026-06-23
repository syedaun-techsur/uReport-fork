## Epic 3: Content Negotiation & Multi-Format Serialization (F3)

Every endpoint in uReport supports five response formats (HTML, JSON, XML, CSV, TXT). A single NestJS `SerializationInterceptor` replaces the ~187 legacy PHP partial templates, ensuring byte-compatible output across all formats without duplicating controller logic.

---

### US-3.1: Request JSON Response via Accept Header or URL Suffix
**As an** Anonymous Citizen (API client), **I want** the API to return JSON when I request it via the `Accept` header or `.json` URL suffix, **so that** my application can parse structured data without any format ambiguity.

**Acceptance Criteria:**
- [ ] A request with `Accept: application/json` returns `Content-Type: application/json`
- [ ] A request to a URL ending in `.json` returns JSON regardless of the `Accept` header
- [ ] JSON field names match the legacy PHP output exactly (camelCase)
- [ ] Null values are represented as `null` (not omitted) unless legacy output omits them
- [ ] Booleans are serialized as `true`/`false` (not `1`/`0`)
- [ ] Dates are ISO 8601 strings in UTC format
- [ ] Empty collections return `[]` not `null`
- [ ] Open311 single-result endpoints return a single-element array (`[{...}]`)

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.2: Request XML Response via Accept Header or URL Suffix
**As an** Anonymous Citizen (API client), **I want** the API to return XML when I request it via the `Accept: application/xml` header or `.xml` URL suffix, **so that** legacy XML-consuming integrators continue to work without modification.

**Acceptance Criteria:**
- [ ] A request with `Accept: application/xml` returns `Content-Type: application/xml`
- [ ] A request to a URL ending in `.xml` returns XML regardless of the `Accept` header
- [ ] XML output includes `<?xml version="1.0" encoding="UTF-8"?>` declaration
- [ ] Root element names and child tag names match the legacy PHP output exactly
- [ ] `description`, `notes`, and `template` fields use CDATA wrapping as in the legacy output
- [ ] `GET /open311/v2/services` wraps results in `<services><service>...</service></services>`
- [ ] `GET /open311/v2/requests` wraps results in `<service_requests><request>...</request></service_requests>`
- [ ] XML output is byte-compatible with legacy for identical input fixtures

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.3: Export Ticket List to CSV
**As a** Case Worker, **I want to** export any filtered ticket list as a CSV file, **so that** I can import it into Excel for offline reporting and departmental records.

**Acceptance Criteria:**
- [ ] A request with `Accept: text/csv` or `.csv` URL suffix returns a downloadable CSV file
- [ ] First row is a header row with column names matching legacy output
- [ ] All string values are double-quoted
- [ ] Boolean columns use `1`/`0` (matching legacy CSV output)
- [ ] Date columns use ISO 8601 format
- [ ] File includes UTF-8 BOM (`\xEF\xBB\xBF`) for Excel compatibility
- [ ] `Content-Disposition: attachment; filename="{entity}-{date}.csv"` header is set
- [ ] CSV output row-for-row matches the HTML view for the same filter parameters

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.4: Format Resolution Priority is Consistent
**As a** Department Supervisor, **I want** format negotiation to follow a documented priority order, **so that** external integrators can reliably control output format using URL suffix, query parameter, or Accept header.

**Acceptance Criteria:**
- [ ] URL suffix (`.json`, `.xml`, `.csv`, `.txt`) takes highest priority
- [ ] `format` query parameter is evaluated second
- [ ] `Accept` header is evaluated third
- [ ] Default is JSON for `/open311/v2/` routes and HTML for all other routes when no format is specified
- [ ] Format negotiation logic is centralized in the `SerializationInterceptor` — no per-controller format handling
- [ ] Error responses are also format-negotiated (JSON error, XML error, HTML error page, etc.)

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.5: View HTML Responses in Browser
**As an** Authenticated Resident, **I want to** view ticket lists and details as rendered HTML pages when using a web browser, **so that** the web interface is functional and matches the existing interface structure.

**Acceptance Criteria:**
- [ ] Browser requests (with `Accept: text/html`) receive full HTML pages with header, navigation, and footer
- [ ] AJAX sub-requests return only the content partial (no full layout)
- [ ] Template variables match the controller data shape
- [ ] HTML output preserves the existing PHP view hierarchy structure
- [ ] HTML is generated via a server-side template engine (Handlebars or Nunjucks)

**Priority:** P0 | **Feature Ref:** F3

---
