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
