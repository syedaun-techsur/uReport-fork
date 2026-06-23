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
