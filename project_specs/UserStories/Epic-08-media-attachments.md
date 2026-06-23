## Epic 8: Media & Attachment Management (F8)

Staff and citizens can upload file attachments to tickets. The media management system preserves upload handling, storage paths, MIME type validation, thumbnail generation for images, and the audit trail entry on upload.

---

### US-8.1: Upload a Photo or Document Attachment to a Ticket
**As an** Authenticated Resident, **I want to** attach a photo to my service request, **so that** the case worker can see the condition I am reporting.

**Acceptance Criteria:**
- [ ] `POST /tickets/:id/media` accepts `multipart/form-data` with a `file` field
- [ ] Anonymous callers receive HTTP 401; only authenticated users may upload
- [ ] Caller's role must meet the ticket's category `postingPermissionLevel`
- [ ] Accepted MIME types: `image/jpeg`, `image/png`, `image/gif`, `application/pdf`, `text/plain`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- [ ] File size must not exceed `MEDIA_MAX_BYTES` (default: 10 MB); returns HTTP 413 if exceeded
- [ ] Uploaded file is stored as `{MEDIA_STORAGE_PATH}/{ticket_id}/{uuid}.{ext}`
- [ ] A `media` record is created with `filename`, `internalFilename`, `mime_type`, `uploaded`, and `person_id`
- [ ] An `upload_media` action is appended to `ticketHistory`
- [ ] `tickets.lastModified` is updated

**Priority:** P1 | **Feature Ref:** F8

---

### US-8.2: Auto-Generate Thumbnail for Image Uploads
**As a** Case Worker, **I want** thumbnails to be automatically generated for image attachments, **so that** I can preview photos quickly in the ticket view without downloading full-size files.

**Acceptance Criteria:**
- [ ] Thumbnails are generated for `image/jpeg`, `image/png`, and `image/gif` uploads
- [ ] Thumbnail is saved to `{MEDIA_STORAGE_PATH}/{ticket_id}/thumbnails/{internalFilename}`
- [ ] Thumbnail dimensions are controlled by `THUMBNAIL_WIDTH` (default: 200) and `THUMBNAIL_HEIGHT` (default: 200) env vars
- [ ] `GET /tickets/:id/media/:mediaId/thumbnail` serves the thumbnail with correct `Content-Type`
- [ ] Returns HTTP 404 if no thumbnail exists (e.g., for non-image files)

**Priority:** P1 | **Feature Ref:** F8

---

### US-8.3: View and Download a Ticket Attachment
**As a** Case Worker, **I want to** view or download attachments on a ticket, **so that** I can review supporting evidence from the reporter or from field staff.

**Acceptance Criteria:**
- [ ] `GET /tickets/:id/media/:mediaId` streams the file bytes with `Content-Type: {media.mime_type}`
- [ ] `Content-Disposition: inline; filename="{media.filename}"` header is set
- [ ] Category `displayPermissionLevel` is checked against the caller's role; returns HTTP 404 if not visible
- [ ] Returns HTTP 404 if `mediaId` does not exist or does not belong to `ticket_id`
- [ ] Returns HTTP 404 if the file is missing from disk

**Priority:** P1 | **Feature Ref:** F8

---

### US-8.4: Delete an Attachment from a Ticket
**As a** Case Worker, **I want to** delete an attachment from a ticket, **so that** I can remove incorrect or irrelevant files from the case record.

**Acceptance Criteria:**
- [ ] Staff-only action; returns HTTP 403 for non-staff callers
- [ ] `DELETE /tickets/:id/media/:mediaId` deletes the file from disk and the thumbnail if it exists
- [ ] The `media` record is removed from the database
- [ ] An `update` action noting the deletion is appended to `ticketHistory`
- [ ] Returns HTTP 404 if the media record does not exist

**Priority:** P1 | **Feature Ref:** F8

---
