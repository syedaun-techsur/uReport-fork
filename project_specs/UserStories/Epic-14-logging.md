## Epic 14: Structured Logging via GELF/Graylog (F14)

All application events are logged in GELF format to a Graylog instance for centralized observability. A NestJS `GelfLoggerService` wraps the GELF client and is injected wherever logging is needed.

---

### US-14.1: All HTTP Requests are Logged to Graylog
**As a** Department Supervisor, **I want** every HTTP request to be logged to Graylog with method, path, status code, and duration, **so that** I can diagnose API errors and performance issues from the Graylog dashboard.

**Acceptance Criteria:**
- [ ] A `GelfRequestMiddleware` logs on request start: `{method, path, _request_id}` at INFO level
- [ ] On request completion: `{method, path, statusCode, durationMs, _request_id}` at INFO level
- [ ] `_request_id` is a UUID generated per HTTP request and attached to all subsequent log entries for that request
- [ ] GELF transport is configured via `GRAYLOG_HOST`, `GRAYLOG_PORT`, `GRAYLOG_TRANSPORT` (udp/tcp), and `GRAYLOG_FACILITY` env vars
- [ ] All structured logs for the last 30 days are accessible in Graylog within 2 minutes (NFR-8)

**Priority:** P2 | **Feature Ref:** F14

---

### US-14.2: Unhandled Exceptions are Logged with Stack Traces
**As a** Department Supervisor, **I want** all unhandled exceptions to be logged to Graylog with the full stack trace, **so that** I can identify and triage production errors without access to server console logs.

**Acceptance Criteria:**
- [ ] NestJS global exception filter logs every unhandled exception at ERROR level
- [ ] Log includes `short_message` (exception message) and `full_message` (stack trace)
- [ ] `_request_id` and `_user_id` are included when available
- [ ] GELF level mapping matches: `verbose`/`debug` → DEBUG (7), `log` → INFO (6), `warn` → WARNING (4), `error` → ERROR (3)
- [ ] Every log message includes: `version: "1.1"`, `host`, `short_message`, `timestamp`, `level`, `_facility`

**Priority:** P2 | **Feature Ref:** F14

---

### US-14.3: Ticket and User Context is Included in Log Entries
**As a** Department Supervisor, **I want** log entries to include the ticket ID, user ID, and request ID as structured fields, **so that** I can correlate Graylog entries to specific tickets and users when diagnosing issues.

**Acceptance Criteria:**
- [ ] `_ticket_id` is included in log entries when logging a ticket operation
- [ ] `_user_id` (people.id) is included for authenticated requests
- [ ] `_request_id` is propagated across all log entries within a single HTTP request
- [ ] `GelfLoggerService` is registered as the global NestJS logger via `app.useLogger(new GelfLoggerService())`

**Priority:** P2 | **Feature Ref:** F14

---
