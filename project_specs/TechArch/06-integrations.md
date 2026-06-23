---

## 7. Integration Points

### 7.1 Apache Solr

**Role:** Full-text ticket search (F05)  
**Client:** `solr-client` npm package  
**NestJS module:** `SearchModule` → `SolrService`

**Configuration:**

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `SOLR_HOST` | `localhost` | Solr server hostname |
| `SOLR_PORT` | `8983` | Solr server port |
| `SOLR_CORE` | `uReport` | Solr core name |
| `SOLR_PATH` | `/solr` | Solr base path |

**Index schema (field names must match legacy Solarium exactly):**

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

**eDisMax query construction:**
```
qf=description^2 location^1.5 city^1 customFields^1
mm=75%
pf=description^4
```

**Failure handling:**
- Ticket write: fire-and-forget; indexing failure logged via GELF `warn`; write operation not rolled back
- Search request: Solr unreachable → HTTP 503 `SEARCH_UNAVAILABLE`

---

### 7.2 OIDC Identity Provider

**Role:** User authentication (F04)  
**Client:** `openid-client` npm package  
**NestJS module:** `AuthModule` → `AuthService`

**Configuration:**

| Env Variable | Required | Description |
|-------------|---------|-------------|
| `OIDC_ISSUER` | Yes | OIDC discovery base URL |
| `OIDC_CLIENT_ID` | Yes | Registered client ID |
| `OIDC_CLIENT_SECRET` | Yes | Client secret |
| `OIDC_REDIRECT_URI` | Yes | Callback URL (must match IdP) |
| `OIDC_END_SESSION_ENDPOINT` | No | IdP end-session URL for logout |

**Contract:**
- Authorization code flow with `openid email profile` scopes
- `id_token` claims required: `sub`, `email`, `given_name`, `family_name`
- `sub` claim → `people.username` (stable identifier)
- On first login: create `people` record; upsert `peopleEmails` from `email` claim
- On subsequent login: update `firstname`/`lastname` if changed

**Failure handling:**
- IdP unreachable during login initiation → HTTP 502 user-facing error page
- IdP error in callback → GELF log + HTTP 502 `IDP_ERROR`

---

### 7.3 SMTP Email Server

**Role:** Ticket event notifications (F07)  
**Client:** `nodemailer` npm package  
**NestJS module:** `NotificationsModule` → `MailerService`

**Configuration:**

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `SMTP_HOST` | — | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password |
| `SMTP_SECURE` | `false` | `true` for port 465 TLS |
| `SMTP_FROM` | `noreply@city.gov` | From address |

**Trigger matrix:**

| Ticket Action | action.name | Recipients |
|--------------|-------------|-----------|
| Ticket opened | `open` | `reportedByPerson` (if email set) |
| Ticket assigned | `assignment` | Assigned person + reporter |
| Ticket closed | `closed` | Reporter + assigned person |
| Response added | `response` | Reporter |
| Comment added | `comment` | Assigned person |
| Marked duplicate | `duplicate` | Reporter of child ticket |

**Template resolution (priority order):**
1. `category_action_responses.template` (category + action override)
2. `actions.template` (default)
3. No template → no email sent

**Reply-to resolution (priority order):**
1. `categories.notificationReplyEmail`
2. `category_action_responses.replyEmail`
3. `actions.replyEmail`
4. No Reply-To header

**Failure handling:** SMTP failure logged via GELF `error`; ticket action is NOT rolled back; manual resend available via response action.

---

### 7.4 Graylog / GELF

**Role:** Structured application logging (F14)  
**Client:** `gelf-pro` npm package  
**NestJS service:** `GelfLoggerService` (implements `LoggerService`)

**Configuration:**

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `GRAYLOG_HOST` | `localhost` | Graylog server hostname |
| `GRAYLOG_PORT` | `12201` | GELF input port |
| `GRAYLOG_TRANSPORT` | `udp` | `udp` or `tcp` |
| `GRAYLOG_FACILITY` | `uReport` | Facility label in GELF messages |

**Log level mapping:**

| NestJS level | GELF syslog level | Value |
|-------------|-------------------|-------|
| `error` | ALERT / ERROR | 3 |
| `warn` | WARNING | 4 |
| `log` | NOTICE / INFO | 5 |
| `debug` | DEBUG | 7 |
| `verbose` | DEBUG | 7 |

**Structured fields per message:**

| Field | Description |
|-------|-------------|
| `short_message` | One-line summary |
| `full_message` | Full stack trace (errors only) |
| `facility` | `GRAYLOG_FACILITY` env value |
| `_request_id` | UUID per HTTP request |
| `_user_id` | `people.id` of authenticated user (if any) |
| `_ticket_id` | Ticket ID for ticket-scoped operations |

**Failure handling:** If Graylog is unreachable, fall back to `console.error` (stderr). Application never fails due to logging unavailability.

---

### 7.5 PostgreSQL + PostGIS

**Role:** Primary data store (all features)  
**Client:** Prisma ORM; `$queryRaw` for spatial  
**Configuration:** `DATABASE_URL` env var  

**Requirements:**
- PostgreSQL ≥ 14
- PostGIS extension ≥ 3.0 (for `geometry(Point, 4326)` and `<->` KNN operator)
- All FK, CHECK, and UNIQUE constraints enforced at database level
- Prisma migrations run before application startup (`prisma migrate deploy`)

**Spatial query pattern (geo-cluster assignment):**
```sql
-- Find nearest cluster at each zoom level for a ticket lat/lon
SELECT id
FROM "geoclusters"
WHERE level = $1
ORDER BY center <-> ST_SetSRID(ST_MakePoint($2, $3), 4326)
LIMIT 1;
```

---

### 7.6 Redis (Session Store)

**Role:** Server-side session persistence (F04)  
**Client:** `connect-redis` + `ioredis`  

**Configuration:**

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `SESSION_SECRET` | — | Cookie signing secret (required) |
| `SESSION_TTL_SECONDS` | `3600` | Session expiry |

**Note:** Redis is required in production for multi-replica support. In-memory store only acceptable for local development.

---

### 7.7 Local Filesystem (Media Storage)

**Role:** File attachment storage (F08)  

**Configuration:**

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `MEDIA_STORAGE_PATH` | `/var/uReport/media` | Absolute path for file storage |
| `MEDIA_MAX_BYTES` | `10485760` | Maximum upload file size (10 MB) |

**Storage layout:**
```
{MEDIA_STORAGE_PATH}/
└── {ticket_id}/
    ├── {internalFilename}             ← original uploaded file
    └── thumbnails/
        └── {internalFilename}         ← thumbnail (images only)
```

**Contract requirements:**
- `internalFilename` is always a UUID — never derived from user-supplied filename
- Storage path must be writable by the Node.js process
- In Kubernetes: path must be a mounted `PersistentVolumeClaim`
- Files are served by streaming `fs.createReadStream()` through NestJS response, not served by a static file server

---

### 7.8 Integration Failure Summary

| Integration | Write failure behavior | Read failure behavior |
|-------------|----------------------|---------------------|
| PostgreSQL | Throw — transaction rolled back | Throw — HTTP 500 |
| Apache Solr | GELF warn + continue (fire-and-forget) | HTTP 503 `SEARCH_UNAVAILABLE` |
| OIDC IdP | HTTP 502 error page | N/A (login only) |
| SMTP | GELF error + continue (ticket action succeeds) | N/A (send only) |
| Graylog | Fallback to console.error | N/A (log only) |
| Redis | Fatal on startup (session required in production) | HTTP 500 (session unavailable) |
| Filesystem | Throw + HTTP 500 | HTTP 500 (stream error) |
