---

## F14: Structured Logging via GELF/Graylog

**Description:** All application events are logged in GELF format to a Graylog instance for centralized observability. The PHP GELF client is replaced by a Node GELF client with the same log level conventions, facility names, and structured field set. A NestJS `LoggerService` wraps the GELF client and is injected wherever logging is needed.

**Terminology:**
- **GELF:** Graylog Extended Log Format — a structured JSON log format
- **Facility:** A GELF field identifying the source component (e.g., `'uReport'`)
- **short_message:** The primary single-line log message (required GELF field)
- **full_message:** Optional detailed message or stack trace
- **Additional field:** Any GELF field prefixed with `_` (e.g., `_ticket_id`, `_user_id`)

**Sub-features:**
- GELF transport configuration (UDP or TCP)
- Log levels mapped to NestJS logger interface
- Request-level access logging (method, path, status, duration)
- Error logging with stack traces
- Contextual fields: `_ticket_id`, `_user_id`, `_request_id`
- NestJS `LoggerService` implementation

---

### F14.1 Transport Configuration

| Env Variable | Description | Default |
|-------------|-------------|---------|
| `GRAYLOG_HOST` | Graylog server hostname | `localhost` |
| `GRAYLOG_PORT` | Graylog GELF input port | `12201` |
| `GRAYLOG_TRANSPORT` | `udp` or `tcp` | `udp` |
| `GRAYLOG_FACILITY` | GELF facility field | `uReport` |

---

### F14.2 Log Levels

| NestJS Level | GELF Level | Syslog Level |
|-------------|-----------|--------------|
| `verbose` | DEBUG | 7 |
| `debug` | DEBUG | 7 |
| `log` | INFO | 6 |
| `warn` | WARNING | 4 |
| `error` | ERROR | 3 |

---

### F14.3 Required GELF Fields

Every log message must include:
- `version`: `"1.1"` (GELF spec)
- `host`: server hostname
- `short_message`: primary message string
- `timestamp`: Unix epoch float
- `level`: numeric syslog level
- `_facility`: `GRAYLOG_FACILITY` env value

Optional contextual fields (added when available):
- `_request_id`: UUID generated per HTTP request (via middleware)
- `_user_id`: `people.id` of authenticated user
- `_ticket_id`: ticket ID when logging a ticket operation
- `full_message`: error stack trace or verbose details

---

### F14.4 Request Logging

A NestJS middleware (`GelfRequestMiddleware`) logs every incoming HTTP request:
- On request start: `{method, path, _request_id}` at INFO level
- On request complete: `{method, path, statusCode, durationMs, _request_id}` at INFO level

---

### F14.5 Error Logging

The NestJS global exception filter logs every unhandled exception:
- `short_message`: exception message
- `full_message`: stack trace
- Level: ERROR
- `_request_id`, `_user_id` if available

---

### F14.6 NestJS Integration

```typescript
@Injectable()
export class GelfLoggerService implements LoggerService {
  log(message: string, context?: string): void { /* INFO */ }
  error(message: string, trace?: string, context?: string): void { /* ERROR */ }
  warn(message: string, context?: string): void { /* WARNING */ }
  debug(message: string, context?: string): void { /* DEBUG */ }
  verbose(message: string, context?: string): void { /* DEBUG */ }
}
```

Registered as the global NestJS logger via `app.useLogger(new GelfLoggerService())`.

---

**API Surface (this feature):** No API endpoints. Logging is a cross-cutting concern.

**Schema Surface (this feature):** No database tables. Log data flows to Graylog only.
