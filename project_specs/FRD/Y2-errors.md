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
