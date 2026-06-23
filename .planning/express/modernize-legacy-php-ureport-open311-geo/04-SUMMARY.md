---
phase: wave-2-backend
plan: "04"
subsystem: logging-and-auth
tags: [gelf, nestjs, oidc, sessions, redis, express-session, openid-client]
dependency_graph:
  requires: [plan-01 (people + peopleEmails schema, openid-client + gelf-pro + express-session packages)]
  provides: [GelfLoggerService (global), GelfLoggerModule, GelfRequestMiddleware, GelfExceptionFilter, AuthModule, AuthService, SessionService, AuthController]
  affects: [app.module.ts, main.ts, all subsequent modules via GelfLoggerService injection]
tech_stack:
  added: [gelf-pro, connect-redis, ioredis, express-session, openid-client, uuid]
  patterns: [NestJS @Global() module, NestJS APP_FILTER, NestJS MiddlewareConsumer, OIDC authorization-code flow, Redis session store]
key_files:
  created:
    - src/common/logger/gelf-logger.service.ts
    - src/common/logger/gelf-logger.module.ts
    - src/common/middleware/gelf-request.middleware.ts
    - src/common/filters/gelf-exception.filter.ts
    - src/modules/auth/auth.module.ts
    - src/modules/auth/auth.controller.ts
    - src/modules/auth/auth.service.ts
    - src/modules/auth/session.service.ts
    - src/modules/auth/dto/update-account.dto.ts
    - src/@types/express/index.d.ts
  modified:
    - src/app.module.ts
    - src/main.ts
decisions:
  - Used `AppSession = Session & Partial<SessionData>` type alias to satisfy TypeScript strict mode when accessing session properties; avoids unsafe casting while preserving correct express-session type contract
  - Used `require('connect-redis').default` instead of ESM import to avoid TypeScript module resolution issues with connect-redis v7's dual ESM/CJS exports
  - Merged GELF/Auth additions into existing app.module.ts (which already had AdminModule + FormatMiddleware from prior plans) rather than replacing it
metrics:
  duration: ~15 minutes
  completed: "2026-06-23"
  tasks_completed: 2
  files_created: 10
  files_modified: 2
---

# Phase wave-2-backend Plan 04: GELF Logging and OIDC Authentication Summary

**One-liner:** JWT-free OIDC auth-code flow via openid-client with Redis-backed express-session and structured GELF 1.1 logging via gelf-pro with global NestJS middleware + exception filter.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | F14 — GelfLoggerService, GelfLoggerModule, request middleware, exception filter | 9effca7 | gelf-logger.service.ts, gelf-logger.module.ts, gelf-request.middleware.ts, gelf-exception.filter.ts, app.module.ts, main.ts, @types/express/index.d.ts |
| 2 | F4 — AuthModule (OIDC authorization-code flow, SessionService, account endpoints) | 0c87374 | auth.module.ts, auth.controller.ts, auth.service.ts, session.service.ts, dto/update-account.dto.ts |

## Deliverables

### F14 — GELF Structured Logging

**GelfLoggerService** (`src/common/logger/gelf-logger.service.ts`):
- Implements NestJS `LoggerService` with all 5 methods (log, error, warn, debug, verbose)
- GELF syslog level mapping: verbose→7, debug→7, log→6, warn→4, error→3
- Required GELF 1.1 fields: `version`, `host`, `short_message`, `timestamp`, `level`, `_facility`
- Optional contextual fields: `_request_id`, `_user_id`, `_ticket_id`, `full_message` (stack trace on error)
- Graylog unreachable → `console.error` fallback, never throws
- Transport configurable via `GRAYLOG_TRANSPORT`, `GRAYLOG_HOST`, `GRAYLOG_PORT` env vars

**GelfLoggerModule** (`src/common/logger/gelf-logger.module.ts`):
- `@Global()` module — every NestJS module can inject `GelfLoggerService` without reimporting

**GelfRequestMiddleware** (`src/common/middleware/gelf-request.middleware.ts`):
- Applied globally via `MiddlewareConsumer.forRoutes('*')`
- Generates UUID v4 `requestId` per request
- Logs `{method, path}` on request start
- Logs `{method, path, statusCode, durationMs}` on response finish

**GelfExceptionFilter** (`src/common/filters/gelf-exception.filter.ts`):
- Registered globally via `APP_FILTER` provider
- 5xx exceptions → `GelfLoggerService.error()` with stack trace
- 4xx exceptions → `GelfLoggerService.warn()` with status code

### F4 — OIDC Authentication

**SessionService** (`src/modules/auth/session.service.ts`):
- Centralizes all session read/write (userId, role, state, nonce, returnTo)
- `validateAndClearState()` throws `INVALID_STATE` on mismatch, returns nonce
- `setReturnTo()` validates relative paths to prevent open redirect (TechArch §5.6)
- `destroy()` wraps `session.destroy()` as a Promise

**AuthService** (`src/modules/auth/auth.service.ts`):
- `initiateLogin()`: generates state+nonce via `openid-client.generators`, stores in session, returns IdP authorization URL
- `handleCallback()`: validates state, exchanges code via `client.callback()` with `{state, nonce}` checks, upserts `people` by `username=sub`, upserts `peopleEmails` from email claim, stores `{userId, role}` in session
- `logout()`: destroys session, redirects to `OIDC_END_SESSION_ENDPOINT` or `/`
- Error codes: `INVALID_STATE`(400), `INVALID_NONCE`(400), `IDP_ERROR`(502), `MISSING_PARAMETER`(400)

**AuthController** (`src/modules/auth/auth.controller.ts`):
- `GET /auth/login` — redirects to IdP (HTTP 302), accepts `?return_to=` for post-login redirect
- `GET /auth/callback` — exchanges code, provisions user, redirects to returnTo or `/`
- `GET /auth/logout` — destroys session, clears cookie, redirects
- `GET /account` — returns authenticated user's people record (401 if unauthenticated)
- `PUT /account` — updates own record; never updates `role` or `username`

**AuthModule** (`src/modules/auth/auth.module.ts`):
- Exports `SessionService` for Wave 3+ RBAC middleware (CASL guard)

### Infrastructure Updates

**main.ts**: express-session wired with Redis store (connect-redis v7 + ioredis), cookie: HttpOnly, Secure (production), SameSite=lax, `SESSION_SECRET`, TTL from `SESSION_TTL_SECONDS`; `app.useLogger(GelfLoggerService)` registered.

**app.module.ts**: GelfLoggerModule + AuthModule imported; GelfRequestMiddleware applied globally; GelfExceptionFilter registered via APP_FILTER; merged with existing AdminModule + FormatMiddleware.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used `AppSession` type alias for TypeScript strict mode**
- **Found during:** Task 1/2
- **Issue:** `Session` type from express-session doesn't directly include `SessionData` properties; TypeScript strict mode rejects access to `session.userId`, `session.role` etc. on bare `Session` type
- **Fix:** Defined `type AppSession = Session & Partial<SessionData>` in session.service.ts, auth.service.ts, auth.controller.ts; updated all method signatures to use this type
- **Files modified:** session.service.ts, auth.service.ts, auth.controller.ts

**2. [Rule 3 - Blocking] Merged GELF/Auth into existing app.module.ts**
- **Found during:** Task 1
- **Issue:** app.module.ts already had AdminModule, FormatMiddleware, SerializationInterceptor from prior plans — plan's replacement would have deleted those
- **Fix:** Applied targeted edit to add GelfLoggerModule, AuthModule, APP_FILTER, GelfRequestMiddleware while preserving existing imports/providers

**3. [Rule 1 - Bug] connect-redis v7 ESM/CJS import**
- **Found during:** Task 1
- **Issue:** `import RedisStore from 'connect-redis'` TypeScript error: "Object literal may only specify known properties, 'client' does not exist"
- **Fix:** Used `const RedisStore = require('connect-redis').default` to bypass ESM module resolution issues under CommonJS tsconfig

## Self-Check: PASSED

Files created/exist:
- ✅ src/common/logger/gelf-logger.service.ts
- ✅ src/common/logger/gelf-logger.module.ts
- ✅ src/common/middleware/gelf-request.middleware.ts
- ✅ src/common/filters/gelf-exception.filter.ts
- ✅ src/modules/auth/auth.module.ts
- ✅ src/modules/auth/auth.controller.ts
- ✅ src/modules/auth/auth.service.ts
- ✅ src/modules/auth/session.service.ts
- ✅ src/modules/auth/dto/update-account.dto.ts
- ✅ src/@types/express/index.d.ts

Commits:
- ✅ 9effca7: feat(wave-2-backend-04): F14 — GelfLoggerService, middleware, exception filter, session wiring
- ✅ 0c87374: feat(wave-2-backend-04): F4 — AuthModule, OIDC flow, SessionService, account endpoints

TypeScript: Zero errors under strict mode.
