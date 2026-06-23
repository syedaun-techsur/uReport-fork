---
phase: wave-2-backend
plan: 04
subsystem: auth-logging
tags: [oidc, express-session, redis, gelf, logging, authentication]
dependency_graph:
  requires: ["prisma/schema.prisma (people + peopleEmails)", "package.json (openid-client, express-session, connect-redis, ioredis, gelf-pro)"]
  provides: ["GelfLoggerService", "GelfLoggerModule", "GelfRequestMiddleware", "GelfExceptionFilter", "AuthModule", "AuthService", "SessionService", "AuthController"]
  affects: ["src/app.module.ts", "src/main.ts", "all subsequent feature modules (inject GelfLoggerService)", "Wave 3 RBAC (imports SessionService)"]
tech_stack:
  added: ["gelf-pro (GELF 1.1 UDP/TCP)", "openid-client v5 (OIDC authorization-code flow)", "express-session (Redis-backed)", "connect-redis v7", "ioredis v5"]
  patterns: ["@Global() NestJS module", "NestJS APP_FILTER provider", "NestJS middleware chain", "session-per-request context pattern"]
key_files:
  created:
    - src/common/logger/gelf-logger.service.ts
    - src/common/logger/gelf-logger.module.ts
    - src/common/middleware/gelf-request.middleware.ts
    - src/common/filters/gelf-exception.filter.ts
    - src/@types/express/index.d.ts
    - src/modules/auth/auth.module.ts
    - src/modules/auth/auth.service.ts
    - src/modules/auth/auth.controller.ts
    - src/modules/auth/session.service.ts
    - src/modules/auth/dto/update-account.dto.ts
  modified:
    - src/app.module.ts
    - src/main.ts
decisions:
  - "Used Request['session'] type alias (AppSession) instead of raw Session import — avoids SessionData augmentation lookup path issue under strict mode"
  - "connect-redis v7 CJS import via require() with manual type annotation — ESM default export not directly importable in CommonJS tsconfig"
  - "GelfRequestMiddleware applied before FormatMiddleware in middleware chain — ensures request ID is set before format negotiation"
  - "app.module.ts retained SerializationInterceptor and FormatMiddleware from plan 03 alongside new GELF/Auth additions — plan 05 had accidentally dropped them"
metrics:
  duration: "~25 minutes"
  completed: "2026-06-23"
  tasks_completed: 2
  files_created: 10
  files_modified: 2
---

# Phase wave-2-backend Plan 04: F14 GELF Logging + F4 OIDC Authentication Summary

**One-liner:** JWT session auth via openid-client OIDC authorization-code flow with Redis store, plus global GELF 1.1 structured logging via gelf-pro wrapping NestJS LoggerService.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | F14 — GelfLoggerService, GelfLoggerModule, request middleware, exception filter | `2cc11b1` | gelf-logger.service.ts, gelf-logger.module.ts, gelf-request.middleware.ts, gelf-exception.filter.ts, @types/express/index.d.ts, app.module.ts, main.ts |
| 2 | F4 — AuthModule (OIDC auth-code flow, SessionService, account endpoints) | `4989deb` | auth.module.ts, auth.service.ts, auth.controller.ts, session.service.ts, dto/update-account.dto.ts, app.module.ts |

## F14: GELF Logging

### GelfLoggerService
- Implements NestJS `LoggerService` interface with all 5 methods: `log`, `error`, `warn`, `debug`, `verbose`
- GELF level mapping per FRD §F14.2: `verbose/debug→7`, `log→6`, `warn→4`, `error→3`
- Required GELF fields: `version: "1.1"`, `host: os.hostname()`, `short_message`, `timestamp`, `level`, `_facility`
- Optional contextual fields: `_request_id`, `_user_id`, `_ticket_id` populated from per-request context
- `full_message` (stack trace) included on `error()` calls
- Graylog unreachable → `console.error` fallback, never throws (FRD §F14, TechArch §7.8)
- Configurable via: `GRAYLOG_HOST`, `GRAYLOG_PORT`, `GRAYLOG_TRANSPORT`, `GRAYLOG_FACILITY` env vars

### GelfLoggerModule
- `@Global()` decorator — injected everywhere without re-importing
- Exports `GelfLoggerService` as the application-wide logger

### GelfRequestMiddleware
- Generates UUID v4 `requestId` per request
- Calls `GelfLoggerService.setRequestContext(requestId, userId)` 
- Logs `{method, path}` on request start
- Logs `{method, path, statusCode, durationMs}` on response finish
- Clears context after each request

### GelfExceptionFilter
- Global filter registered via `APP_FILTER` provider
- HTTP 5xx → `logger.error(message, trace)` with full stack trace in `full_message`
- HTTP 4xx → `logger.warn(statusCode + message)`

### main.ts Updates
- `app.useLogger(app.get(GelfLoggerService))` — replaces NestJS default logger
- Redis-backed `express-session`: `connect-redis v7` + `ioredis v5`
- Session cookie: `HttpOnly: true`, `Secure` (production only), `SameSite: 'lax'`
- `SESSION_SECRET` env var for signing, `SESSION_TTL_SECONDS` for TTL (default 3600)
- Binds to `0.0.0.0:3000`

## F4: OIDC Authentication

### SessionService
- Single source of truth for session read/write operations
- Methods: `getUser`, `setUser`, `clearUser`, `setState`, `validateAndClearState`, `setReturnTo`, `getAndClearReturnTo`, `destroy`
- `validateAndClearState()` throws `INVALID_STATE` if state mismatches
- `setReturnTo()` validates relative paths only (no `//` open redirect, TechArch §5.6)

### AuthService — OIDC Flow
- **F04.1 initiateLogin():** `generators.state()` + `generators.nonce()` from openid-client, stores in session, returns `client.authorizationUrl()`
- **F04.2 handleCallback():** validates state via `validateAndClearState()`, exchanges code via `client.callback()`, upserts `people` record by `username = sub`, upserts `peopleEmails` from email claim, stores `{userId, role}` in session
- Error codes per FRD: `INVALID_STATE` (400), `INVALID_NONCE` (400), `IDP_ERROR` (502), `MISSING_PARAMETER` (400)
- **F04.4 logout():** destroys session, redirects to `OIDC_END_SESSION_ENDPOINT` if set, else `/`
- OIDC env vars: `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI`, `OIDC_END_SESSION_ENDPOINT`

### AuthController — Routes
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /auth/login | public | 302 redirect to IdP authorization URL |
| GET | /auth/callback | public | Code exchange, people upsert, session set |
| GET | /auth/logout | public | Destroy session, redirect |
| GET | /account | required | Own people record with emails/phones/addresses |
| PUT | /account | required | Update own record (never role/username) |

### AuthModule
- Exports `SessionService` for Wave 3+ RBAC middleware consumption
- `AuthController` registered at module level
- `PrismaService` available via `PrismaModule` (globally provided)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] connect-redis v7 ESM/CJS import conflict**
- **Found during:** Task 1 (main.ts)
- **Issue:** `import RedisStore from 'connect-redis'` with `allowSyntheticDefaultImports` caused `TS7009: 'new' expression has no construct signature` — TypeScript couldn't infer the class type from the ESM default export in CJS module mode
- **Fix:** Used `require('connect-redis')` with explicit type annotation `{ default: new (opts: { client: unknown }) => import('express-session').Store }` and `const RedisStore = connectRedis.default`
- **Files modified:** `src/main.ts`

**2. [Rule 1 - Bug] SessionService Session type incompatibility**
- **Found during:** Task 2 (session.service.ts)
- **Issue:** `import { Session } from 'express-session'` resolves to the `class Session` base type which does NOT include `SessionData` fields (userId, role, state, nonce, returnTo). TypeScript strict mode flagged `Property 'userId' does not exist on type 'Session'` despite `@types/express/index.d.ts` augmenting `SessionData`
- **Fix:** Used `type AppSession = Request['session']` (from express) which correctly resolves to `session.Session & Partial<session.SessionData>`, giving access to all augmented fields
- **Files modified:** `src/modules/auth/session.service.ts`, `src/modules/auth/auth.service.ts`

**3. [Rule 1 - Bug] app.module.ts regression from plan 05**
- **Found during:** Task 1 (app.module.ts)
- **Issue:** Plan 05's commit had replaced the full `app.module.ts` (with `SerializationInterceptor`, `FormatMiddleware`) with a minimal version containing only `AdminModule`. The serialization pipeline from plan 03 was lost
- **Fix:** Merged plan 03 serializers + plan 05 AdminModule + plan 04 GELF/Auth additions into a single coherent `app.module.ts`
- **Files modified:** `src/app.module.ts`

## Self-Check

### Created Files Exist
- `src/common/logger/gelf-logger.service.ts` ✅
- `src/common/logger/gelf-logger.module.ts` ✅
- `src/common/middleware/gelf-request.middleware.ts` ✅
- `src/common/filters/gelf-exception.filter.ts` ✅
- `src/@types/express/index.d.ts` ✅
- `src/modules/auth/auth.module.ts` ✅
- `src/modules/auth/auth.service.ts` ✅
- `src/modules/auth/auth.controller.ts` ✅
- `src/modules/auth/session.service.ts` ✅
- `src/modules/auth/dto/update-account.dto.ts` ✅

### Commits Exist
- Task 1: `2cc11b1` ✅
- Task 2: `4989deb` ✅

### TypeScript Strict Mode
- Zero errors (`npx tsc --noEmit` → exit 0) ✅

## Self-Check: PASSED
