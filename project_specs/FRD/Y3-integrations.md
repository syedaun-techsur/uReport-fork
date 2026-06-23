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
