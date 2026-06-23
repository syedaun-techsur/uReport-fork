---
phase: wave-2-backend
plan: 04
type: execute
wave: 2
depends_on: [1]
files_modified:
  - src/common/logger/gelf-logger.service.ts
  - src/common/logger/gelf-logger.module.ts
  - src/common/middleware/gelf-request.middleware.ts
  - src/common/filters/gelf-exception.filter.ts
  - src/modules/auth/auth.module.ts
  - src/modules/auth/auth.controller.ts
  - src/modules/auth/auth.service.ts
  - src/modules/auth/session.service.ts
  - src/app.module.ts
  - src/main.ts
autonomous: true

features:
  implements: ["F4", "F14"]
  depends_on: ["F6"]
  enables: ["F2", "F10", "F11", "F1", "F0", "F5", "F7", "F8", "F9", "F12", "F13"]

must_haves:
  truths:
    - "GET /auth/login redirects (HTTP 302) to the OIDC IdP authorization URL"
    - "GET /auth/callback exchanges code, provisions/upserts people record, stores userId+role in session"
    - "GET /auth/logout destroys session and redirects to / (or IdP end-session if configured)"
    - "GET /account returns the authenticated user's people record; unauthenticated → 401"
    - "PUT /account updates own people record (not role, not username)"
    - "Every HTTP request produces a GELF INFO log entry with method, path, statusCode, durationMs, _request_id"
    - "Unhandled exceptions produce a GELF ERROR log entry with short_message + full_message (stack trace)"
    - "GelfLoggerService falls back to console.error when Graylog is unreachable — app never crashes due to logging"
    - "Session cookie is HttpOnly, Secure, SameSite=Lax, signed with SESSION_SECRET, stored in Redis"
    - "Authenticated request has req.user populated with people record; unauthenticated request has req.user = null"
  artifacts:
    - path: "src/common/logger/gelf-logger.service.ts"
      provides: "NestJS LoggerService wrapping gelf-pro — implements log/error/warn/debug/verbose"
      exports: ["GelfLoggerService"]
    - path: "src/common/logger/gelf-logger.module.ts"
      provides: "@Global() NestJS module exporting GelfLoggerService"
      exports: ["GelfLoggerModule"]
    - path: "src/common/middleware/gelf-request.middleware.ts"
      provides: "NestJS middleware logging every HTTP request via GelfLoggerService"
      exports: ["GelfRequestMiddleware"]
    - path: "src/common/filters/gelf-exception.filter.ts"
      provides: "Global NestJS exception filter logging unhandled exceptions to GELF"
      exports: ["GelfExceptionFilter"]
    - path: "src/modules/auth/auth.module.ts"
      provides: "NestJS AuthModule: OIDC flow, session management, account CRUD"
      exports: ["AuthModule"]
    - path: "src/modules/auth/auth.service.ts"
      provides: "AuthService: OIDC Issuer.discover, state/nonce generation, client.callback, people upsert"
      exports: ["AuthService"]
    - path: "src/modules/auth/session.service.ts"
      provides: "SessionService: read/write session.userId, session.role, session.state, session.nonce, session.returnTo"
      exports: ["SessionService"]
  key_links:
    - from: "src/main.ts"
      to: "src/common/logger/gelf-logger.service.ts"
      via: "app.useLogger(new GelfLoggerService())"
      pattern: "useLogger.*GelfLoggerService"
    - from: "src/app.module.ts"
      to: "src/common/filters/gelf-exception.filter.ts"
      via: "APP_FILTER provider"
      pattern: "GelfExceptionFilter"
    - from: "src/modules/auth/auth.controller.ts"
      to: "src/modules/auth/auth.service.ts"
      via: "AuthService.initiateLogin / handleCallback / logout"
      pattern: "authService\\.(initiateLogin|handleCallback|logout)"
    - from: "src/modules/auth/auth.service.ts"
      to: "prisma/schema.prisma"
      via: "PrismaService people upsert (username = OIDC sub)"
      pattern: "prisma\\.people\\.(findUnique|upsert|create|update)"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "prisma/schema.prisma"
      exports: ["people", "peopleEmails"]
      verify: "grep -n 'model people' prisma/schema.prisma && grep -n 'model peopleEmails' prisma/schema.prisma && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "package.json"
      exports: ["openid-client", "express-session", "connect-redis", "ioredis", "gelf-pro"]
      verify: "grep -q 'openid-client' package.json && grep -q 'express-session' package.json && grep -q 'gelf-pro' package.json && echo CONTRACT_OK"
  provides:
    - artifact: "src/common/logger/gelf-logger.service.ts"
      exports: ["GelfLoggerService"]
      shape: |
        @Injectable()
        export class GelfLoggerService implements LoggerService {
          log(message: string, context?: string): void
          error(message: string, trace?: string, context?: string): void
          warn(message: string, context?: string): void
          debug(message: string, context?: string): void
          verbose(message: string, context?: string): void
          // Extra: setRequestContext(requestId: string, userId?: number, ticketId?: number): void
        }
      verify: "grep -n 'export class GelfLoggerService' src/common/logger/gelf-logger.service.ts && grep -n 'implements LoggerService' src/common/logger/gelf-logger.service.ts && echo CONTRACT_OK"
    - artifact: "src/common/logger/gelf-logger.module.ts"
      exports: ["GelfLoggerModule"]
      shape: |
        @Global() @Module({ providers: [GelfLoggerService], exports: [GelfLoggerService] })
        export class GelfLoggerModule {}
      verify: "grep -n 'export class GelfLoggerModule' src/common/logger/gelf-logger.module.ts && grep -n '@Global' src/common/logger/gelf-logger.module.ts && echo CONTRACT_OK"
    - artifact: "src/modules/auth/auth.module.ts"
      exports: ["AuthModule", "SessionService", "AuthService"]
      shape: |
        @Module({ controllers: [AuthController], providers: [AuthService, SessionService], exports: [SessionService] })
        export class AuthModule {}
      verify: "grep -n 'export class AuthModule' src/modules/auth/auth.module.ts && grep -n 'SessionService' src/modules/auth/auth.module.ts && echo CONTRACT_OK"
    - artifact: "src/modules/auth/session.service.ts"
      exports: ["SessionService"]
      shape: |
        @Injectable()
        export class SessionService {
          getUser(session: SessionData): { userId: number; role: string | null } | null
          setUser(session: SessionData, userId: number, role: string | null): void
          clearUser(session: SessionData): void
          setState(session: SessionData, state: string, nonce: string): void
          validateAndClearState(session: SessionData, state: string): string  // returns nonce
          setReturnTo(session: SessionData, url: string): void
          getAndClearReturnTo(session: SessionData): string | undefined
        }
      verify: "grep -n 'export class SessionService' src/modules/auth/session.service.ts && echo CONTRACT_OK"
---

<objective>
Implement two cross-cutting foundational Wave 2 components that every subsequent module depends on:
(1) F14 — GelfLoggerService as the NestJS LoggerService replacement, wrapping `gelf-pro` for GELF 1.1
UDP/TCP transport, with request-level logging middleware and global exception filter;
(2) F4 — AuthModule implementing the OIDC authorization-code flow via `openid-client` with Redis-backed
`express-session`, people upsert on callback, and the account view/edit endpoints.

Purpose: Logging must be wired before anything else so every subsequent module can inject
`GelfLoggerService` without thinking about it. Auth (sessions + OIDC) must exist before RBAC (Wave 3)
can identify who is calling.

Output:
- `src/common/logger/` — GelfLoggerService (global, @Injectable), GelfLoggerModule (@Global),
  GelfRequestMiddleware, GelfExceptionFilter
- `src/modules/auth/` — AuthModule, AuthController, AuthService, SessionService
- `src/app.module.ts` and `src/main.ts` updated to wire sessions + GELF globally
</objective>

<feature_dependencies>
Implements: F4: OIDC Authentication (openid-client auth-code flow, Redis sessions, people upsert, account endpoints)
            F14: Structured Logging via GELF/Graylog (GelfLoggerService, request middleware, exception filter)
Depends on: F6: MySQL-to-PostgreSQL Schema Migration (people + peopleEmails tables must exist in schema.prisma)
Enables: F2 (RBAC needs req.user from AuthMiddleware), F0, F1, F10, F11, F5, F7, F8, F9, F12, F13 (all need auth + logging)
</feature_dependencies>

<execution_context>
@.planning/express/modernize-legacy-php-ureport-open311-geo/WAVE-SCHEDULE.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/express/modernize-legacy-php-ureport-open311-geo/01-PLAN.md
@project_specs/TechArch-uReport.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: F14 — GelfLoggerService, GelfLoggerModule, request middleware, exception filter</name>
  <files>
    src/common/logger/gelf-logger.service.ts
    src/common/logger/gelf-logger.module.ts
    src/common/middleware/gelf-request.middleware.ts
    src/common/filters/gelf-exception.filter.ts
    src/app.module.ts
    src/main.ts
  </files>
  <action>
Implement F14: Structured Logging via GELF/Graylog (FRD §F14, TechArch §7.4, §6.8).

---

### src/common/logger/gelf-logger.service.ts

Create the NestJS `LoggerService` implementation wrapping `gelf-pro`.

**GELF level mapping (FRD §F14.2 + TechArch §7.4):**
| NestJS | GELF syslog | Value |
|--------|-------------|-------|
| `verbose` | DEBUG | 7 |
| `debug` | DEBUG | 7 |
| `log` | INFO | 6 |
| `warn` | WARNING | 4 |
| `error` | ERROR | 3 |

**Required GELF fields per message (FRD §F14.3):**
- `version`: `"1.1"`
- `host`: `os.hostname()`
- `short_message`: primary message
- `timestamp`: `Date.now() / 1000` (Unix epoch float)
- `level`: numeric syslog level
- `_facility`: `process.env.GRAYLOG_FACILITY ?? 'uReport'`

**Optional contextual fields:**
- `_request_id`: UUID per HTTP request
- `_user_id`: `people.id` of authenticated user
- `_ticket_id`: ticket ID for ticket-scoped operations
- `full_message`: stack trace (errors only)

**Failure handling (FRD §F14, TechArch §7.8):** If Graylog is unreachable, fall back to `console.error` — app must never crash due to logging failure.

```typescript
import { Injectable, LoggerService } from '@nestjs/common';
import * as os from 'os';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const gelfPro = require('gelf-pro');

interface GelfContext {
  requestId?: string;
  userId?: number;
  ticketId?: number;
}

@Injectable()
export class GelfLoggerService implements LoggerService {
  private context: GelfContext = {};

  constructor() {
    gelfPro.setConfig({
      adapterName: process.env.GRAYLOG_TRANSPORT ?? 'udp',
      adapterOptions: {
        host: process.env.GRAYLOG_HOST ?? 'localhost',
        port: parseInt(process.env.GRAYLOG_PORT ?? '12201', 10),
      },
    });
  }

  /** Call from request middleware to attach per-request context fields */
  setRequestContext(requestId: string, userId?: number, ticketId?: number): void {
    this.context = { requestId, userId, ticketId };
  }

  clearRequestContext(): void {
    this.context = {};
  }

  private send(level: number, message: string, extra: Record<string, unknown> = {}): void {
    const payload: Record<string, unknown> = {
      version: '1.1',
      host: os.hostname(),
      short_message: message,
      timestamp: Date.now() / 1000,
      level,
      _facility: process.env.GRAYLOG_FACILITY ?? 'uReport',
      ...extra,
    };
    if (this.context.requestId) payload['_request_id'] = this.context.requestId;
    if (this.context.userId !== undefined) payload['_user_id'] = this.context.userId;
    if (this.context.ticketId !== undefined) payload['_ticket_id'] = this.context.ticketId;

    gelfPro.message(payload, (err: Error | null) => {
      if (err) {
        // Fallback per TechArch §7.8 / FRD §F14 — never crash due to logging failure
        console.error('[GelfLoggerService] Failed to send GELF message:', err.message, '| Original:', message);
      }
    });
  }

  log(message: string, context?: string): void {
    this.send(6, message, context ? { _context: context } : {});
  }

  error(message: string, trace?: string, context?: string): void {
    const extra: Record<string, unknown> = {};
    if (trace) extra['full_message'] = trace;
    if (context) extra['_context'] = context;
    this.send(3, message, extra);
  }

  warn(message: string, context?: string): void {
    this.send(4, message, context ? { _context: context } : {});
  }

  debug(message: string, context?: string): void {
    this.send(7, message, context ? { _context: context } : {});
  }

  verbose(message: string, context?: string): void {
    this.send(7, message, context ? { _context: context } : {});
  }
}
```

---

### src/common/logger/gelf-logger.module.ts

Global module so every other NestJS module can inject `GelfLoggerService` without reimporting:

```typescript
import { Global, Module } from '@nestjs/common';
import { GelfLoggerService } from './gelf-logger.service';

@Global()
@Module({
  providers: [GelfLoggerService],
  exports: [GelfLoggerService],
})
export class GelfLoggerModule {}
```

---

### src/common/middleware/gelf-request.middleware.ts

NestJS middleware implementing FRD §F14.4 (request logging):
- On request: generate UUID v4 `requestId`, call `GelfLoggerService.setRequestContext(requestId, userId)`, log `{method, path, requestId}` at INFO
- On response finish: log `{method, path, statusCode, durationMs, requestId}` at INFO
- `userId` is read from `req.session?.userId` if available (may not be set yet in Wave 2; null-safe)

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { GelfLoggerService } from '../logger/gelf-logger.service';

@Injectable()
export class GelfRequestMiddleware implements NestMiddleware {
  constructor(private readonly logger: GelfLoggerService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = uuidv4();
    const start = Date.now();

    // Attach requestId to request for downstream use
    (req as Request & { requestId: string }).requestId = requestId;

    // Read userId from session if already set (may be undefined for anonymous)
    const userId: number | undefined = (req as Request & { session?: { userId?: number } }).session?.userId;

    this.logger.setRequestContext(requestId, userId);
    this.logger.log(`${req.method} ${req.path}`, 'GelfRequestMiddleware');

    res.on('finish', () => {
      const durationMs = Date.now() - start;
      this.logger.log(
        `${req.method} ${req.path} ${res.statusCode} ${durationMs}ms`,
        'GelfRequestMiddleware',
      );
      this.logger.clearRequestContext();
    });

    next();
  }
}
```

---

### src/common/filters/gelf-exception.filter.ts

Global NestJS exception filter implementing FRD §F14.5 (error logging):

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { GelfLoggerService } from '../logger/gelf-logger.service';

@Catch()
@Injectable()
export class GelfExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: GelfLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof Error ? exception.message : 'Internal server error';

    const trace =
      exception instanceof Error ? (exception.stack ?? '') : '';

    // Log unhandled exceptions per FRD §F14.5
    if (status >= 500) {
      this.logger.error(message, trace, 'GelfExceptionFilter');
    } else {
      this.logger.warn(`${status} ${message}`, 'GelfExceptionFilter');
    }

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, error: 'Internal Server Error', message };

    response.status(status).json(body);
  }
}
```

---

### src/app.module.ts (update)

Add `GelfLoggerModule`, `AuthModule`, and wire `GelfRequestMiddleware` globally. Also register `GelfExceptionFilter` as a global provider via `APP_FILTER`:

```typescript
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { GelfLoggerModule } from './common/logger/gelf-logger.module';
import { GelfRequestMiddleware } from './common/middleware/gelf-request.middleware';
import { GelfExceptionFilter } from './common/filters/gelf-exception.filter';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GelfLoggerModule,
    AuthModule,
    // Feature modules added here in subsequent waves
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GelfExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(GelfRequestMiddleware).forRoutes('*');
  }
}
```

---

### src/main.ts (update)

Wire `express-session` with Redis store, register `GelfLoggerService` as the NestJS application logger.

**Session config per TechArch §5.2:**
- Cookie: `HttpOnly: true`, `Secure: true` (use `process.env.NODE_ENV === 'production'`), `SameSite: 'lax'`
- Signing: `SESSION_SECRET` env var
- TTL: `SESSION_TTL_SECONDS` env var (default 3600)
- Store: Redis via `connect-redis` + `ioredis`

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as session from 'express-session';
import RedisStore from 'connect-redis';
import { Redis } from 'ioredis';
import { AppModule } from './app.module';
import { GelfLoggerService } from './common/logger/gelf-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Register GelfLoggerService as the application logger (F14)
  app.useLogger(app.get(GelfLoggerService));

  // Global validation pipe (TechArch §5.5)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,  // Open311 compat: jurisdiction_id, device_id accepted and ignored
      transform: true,
    }),
  );

  // Redis-backed session store (TechArch §5.2, §6.3)
  const redisClient = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  const redisStore = new RedisStore({ client: redisClient });

  app.use(
    session({
      store: redisStore,
      secret: process.env.SESSION_SECRET ?? 'dev-secret-change-in-prod',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: parseInt(process.env.SESSION_TTL_SECONDS ?? '3600', 10) * 1000,
      },
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
bootstrap();
```

**Note on `connect-redis` v7.x import:** `connect-redis` v7+ exports `RedisStore` as the default export (not a factory). Use: `import RedisStore from 'connect-redis';` — no `.default` needed. The `@types/connect-redis` package is declared in devDependencies in Wave 1.

**Note on TypeScript declarations for express-session:** Add a `src/@types/express/index.d.ts` file declaring the session shape so TypeScript knows about `req.session.userId` etc.:

```typescript
// src/@types/express/index.d.ts
import 'express-session';
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    role?: string | null;
    state?: string;
    nonce?: string;
    returnTo?: string;
  }
}
```

Create this file as part of Task 1 (add to `<files>` — it's needed for TypeScript strict mode).
  </action>
  <verify>
```bash
npx tsc --noEmit 2>&1 | grep -E 'error TS' | head -20 && echo "TSC CLEAN" || echo "TSC ERRORS ABOVE"
grep -n 'export class GelfLoggerService' src/common/logger/gelf-logger.service.ts && echo CONTRACT_OK
grep -n 'implements LoggerService' src/common/logger/gelf-logger.service.ts && echo LOGGER_INTERFACE_OK
grep -n '@Global' src/common/logger/gelf-logger.module.ts && echo GLOBAL_MODULE_OK
grep -n 'GelfLoggerModule' src/app.module.ts && echo GELF_WIRED_OK
grep -n 'APP_FILTER' src/app.module.ts && echo FILTER_WIRED_OK
grep -n 'GelfRequestMiddleware' src/app.module.ts && echo MIDDLEWARE_WIRED_OK
grep -n 'express-session\|RedisStore\|ioredis' src/main.ts | head -5 && echo SESSION_WIRED_OK
```
  </verify>
  <done>
- `GelfLoggerService` implements `LoggerService` with all five NestJS log methods
- GELF level mapping matches FRD §F14.2: verbose→7, debug→7, log→6, warn→4, error→3
- Required GELF fields present: version 1.1, host, short_message, timestamp, level, _facility
- Optional fields `_request_id`, `_user_id`, `_ticket_id` populated from context when available
- `full_message` (stack trace) added on `error()` calls
- Failure to reach Graylog falls back to `console.error` — never throws
- `GelfLoggerModule` is `@Global()` and exports `GelfLoggerService`
- `GelfRequestMiddleware` logs `{method, path}` on request start and `{method, path, statusCode, durationMs}` on finish
- `GelfExceptionFilter` logs 5xx as ERROR with stack trace, 4xx as WARNING
- `app.module.ts` imports `GelfLoggerModule`, `AuthModule`, applies `GelfRequestMiddleware` on all routes, registers `GelfExceptionFilter` via `APP_FILTER`
- `main.ts` calls `app.useLogger(app.get(GelfLoggerService))` and wires `express-session` with Redis store
- Session cookie is `HttpOnly`, `Secure` (production), `SameSite: lax`, signed with `SESSION_SECRET`, TTL from `SESSION_TTL_SECONDS`
- TypeScript compiles with zero errors under strict mode
  </done>
</task>

<task type="auto">
  <name>Task 2: F4 — AuthModule (OIDC authorization-code flow, SessionService, account endpoints)</name>
  <files>
    src/modules/auth/auth.module.ts
    src/modules/auth/auth.controller.ts
    src/modules/auth/auth.service.ts
    src/modules/auth/session.service.ts
    src/modules/auth/dto/update-account.dto.ts
  </files>
  <action>
Implement F4: OIDC Authentication (FRD §F04, TechArch §5.1, §5.2, §7.2).

---

### src/modules/auth/session.service.ts

Service wrapping express-session access. All session read/write in one place per TechArch §5.2:

**Session data structure (TechArch §5.2):**
```typescript
{
  userId: number;       // people.id — set after OIDC callback
  role: string | null;  // people.role ('staff' or null)
  state?: string;       // OIDC state (cleared after callback)
  nonce?: string;       // OIDC nonce (cleared after callback)
  returnTo?: string;    // post-login redirect (cleared after use)
}
```

```typescript
import { Injectable } from '@nestjs/common';
import { Session } from 'express-session';

@Injectable()
export class SessionService {
  getUser(session: Session): { userId: number; role: string | null } | null {
    if (session.userId === undefined) return null;
    return { userId: session.userId, role: session.role ?? null };
  }

  setUser(session: Session, userId: number, role: string | null): void {
    session.userId = userId;
    session.role = role;
  }

  clearUser(session: Session): void {
    delete session.userId;
    delete session.role;
  }

  setState(session: Session, state: string, nonce: string): void {
    session.state = state;
    session.nonce = nonce;
  }

  /**
   * Validates that the given state matches the session state.
   * Clears both state and nonce from session after validation.
   * Returns the nonce for id_token validation.
   * Throws if state mismatches (FRD §F04.2 INVALID_STATE).
   */
  validateAndClearState(session: Session, state: string): string {
    if (!session.state || session.state !== state) {
      throw new Error('INVALID_STATE');
    }
    const nonce = session.nonce ?? '';
    delete session.state;
    delete session.nonce;
    return nonce;
  }

  setReturnTo(session: Session, url: string): void {
    // Validate returnTo is a same-origin relative path (TechArch §5.6 open redirect mitigation)
    if (url.startsWith('/') && !url.startsWith('//')) {
      session.returnTo = url;
    }
  }

  getAndClearReturnTo(session: Session): string | undefined {
    const url = session.returnTo;
    delete session.returnTo;
    return url;
  }

  destroy(session: Session): Promise<void> {
    return new Promise((resolve, reject) => {
      session.destroy((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
```

---

### src/modules/auth/auth.service.ts

OIDC flow using `openid-client` (TechArch §7.2, FRD §F04.1–F04.4).

**OIDC configuration:**
- `OIDC_ISSUER` — discovery base URL
- `OIDC_CLIENT_ID` — registered client ID
- `OIDC_CLIENT_SECRET` — client secret
- `OIDC_REDIRECT_URI` — callback URL (must match IdP registration)
- `OIDC_END_SESSION_ENDPOINT` — optional IdP end-session URL for logout

**F04.1 Login initiation:**
1. Generate random `state` and `nonce` (use `generators.state()` and `generators.nonce()` from `openid-client`)
2. Store in session
3. Build authorization URL with `response_type=code`, `scope='openid email profile'`, `redirect_uri`, `state`, `nonce`
4. Return authorization URL for redirect (HTTP 302)

**F04.2 OIDC callback:**
1. Validate `state` matches session (throws `INVALID_STATE` if not)
2. Exchange code via `client.callback(redirectUri, params, checks)` where `checks = { state, nonce }`
3. Extract claims: `sub`, `email`, `given_name`, `family_name`
4. Upsert `people` record: look up by `username = sub`; if found → update firstname/lastname if changed; if not found → create
5. Upsert `peopleEmails` record with `email` from claims (`usedForNotifications = false` by default)
6. Store `person.id` and `person.role` in session
7. Return `returnTo` URL from session (or `/`)

**F04.4 Logout:**
1. Destroy session
2. Clear session cookie on response
3. If `OIDC_END_SESSION_ENDPOINT` is set, redirect to IdP end-session endpoint
4. Otherwise redirect to `/`

```typescript
import { Injectable, BadRequestException, BadGatewayException } from '@nestjs/common';
import { Issuer, generators, Client } from 'openid-client';
import { Session } from 'express-session';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionService } from './session.service';
import { GelfLoggerService } from '../../common/logger/gelf-logger.service';

@Injectable()
export class AuthService {
  private client: Client | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly logger: GelfLoggerService,
  ) {}

  private async getClient(): Promise<Client> {
    if (this.client) return this.client;
    try {
      const issuer = await Issuer.discover(process.env.OIDC_ISSUER!);
      this.client = new issuer.Client({
        client_id: process.env.OIDC_CLIENT_ID!,
        client_secret: process.env.OIDC_CLIENT_SECRET!,
        redirect_uris: [process.env.OIDC_REDIRECT_URI!],
        response_types: ['code'],
      });
      return this.client;
    } catch (err) {
      this.logger.error('OIDC discovery failed', (err as Error).stack, 'AuthService');
      throw new BadGatewayException('IDP_ERROR');
    }
  }

  /** FRD §F04.1 — Build authorization URL, store state+nonce in session */
  async initiateLogin(session: Session, returnTo?: string): Promise<string> {
    if (returnTo) this.sessionService.setReturnTo(session, returnTo);

    const state = generators.state();
    const nonce = generators.nonce();
    this.sessionService.setState(session, state, nonce);

    const client = await this.getClient();
    return client.authorizationUrl({
      scope: 'openid email profile',
      redirect_uri: process.env.OIDC_REDIRECT_URI!,
      state,
      nonce,
    });
  }

  /** FRD §F04.2 — Exchange code, provision user, store in session */
  async handleCallback(
    session: Session,
    params: { code?: string; state?: string },
  ): Promise<string> {
    if (!params.code) {
      throw new BadRequestException({ error: 'MISSING_PARAMETER', message: 'Authorization code required' });
    }

    // Validate state and get stored nonce (throws INVALID_STATE on mismatch)
    let nonce: string;
    try {
      nonce = this.sessionService.validateAndClearState(session, params.state ?? '');
    } catch {
      throw new BadRequestException({ error: 'INVALID_STATE', message: 'Invalid state parameter' });
    }

    const client = await this.getClient();
    let tokenSet;
    try {
      tokenSet = await client.callback(
        process.env.OIDC_REDIRECT_URI!,
        { code: params.code },
        { state: params.state, nonce },
      );
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('nonce')) {
        throw new BadRequestException({ error: 'INVALID_NONCE', message: 'Invalid nonce in id_token' });
      }
      this.logger.error('OIDC token exchange failed', (err as Error).stack, 'AuthService');
      throw new BadGatewayException({ error: 'IDP_ERROR', message: 'Identity provider error' });
    }

    const claims = tokenSet.claims();
    const sub = claims.sub;
    const email = claims.email as string | undefined;
    const givenName = (claims.given_name as string | undefined) ?? null;
    const familyName = (claims.family_name as string | undefined) ?? null;

    // Upsert people record (FRD §F04.2 step 6)
    let person = await this.prisma.people.findUnique({ where: { username: sub } });
    if (person) {
      // Update name if changed
      if (person.firstname !== givenName || person.lastname !== familyName) {
        person = await this.prisma.people.update({
          where: { id: person.id },
          data: { firstname: givenName, lastname: familyName },
        });
      }
    } else {
      person = await this.prisma.people.create({
        data: { username: sub, firstname: givenName, lastname: familyName },
      });
    }

    // Upsert peopleEmails (FRD §F04.2 step 7) — only if email claim present
    if (email) {
      const existing = await this.prisma.peopleEmails.findFirst({
        where: { person_id: person.id, email },
      });
      if (!existing) {
        await this.prisma.peopleEmails.create({
          data: { person_id: person.id, email, label: 'Other', usedForNotifications: false },
        });
      }
    }

    // Store userId + role in session (FRD §F04.2 step 8)
    this.sessionService.setUser(session, person.id, person.role ?? null);

    const returnTo = this.sessionService.getAndClearReturnTo(session) ?? '/';
    return returnTo;
  }

  /** FRD §F04.4 — Logout: destroy session, return redirect URL */
  async logout(session: Session): Promise<string> {
    await this.sessionService.destroy(session);
    const endSession = process.env.OIDC_END_SESSION_ENDPOINT;
    if (endSession) {
      return endSession;
    }
    return '/';
  }
}
```

---

### src/modules/auth/auth.controller.ts

Routes per TechArch §4.3 §Auth:

```
GET /auth/login    [anon]   Initiate OIDC auth code flow (302 redirect)
GET /auth/callback [anon]   OIDC callback — exchange code, provision user
GET /auth/logout   [public] Destroy session, redirect
GET /account       [public] View own people record
PUT /account       [public] Update own people record
```

```typescript
import {
  Controller, Get, Put, Redirect, Query, Req, Res, Body,
  UnauthorizedException, NotFoundException, HttpCode,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { UpdateAccountDto } from './dto/update-account.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionService } from './session.service';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  /** GET /auth/login — FRD §F04.1 */
  @Get('auth/login')
  async login(
    @Query('return_to') returnTo: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const authUrl = await this.authService.initiateLogin(req.session, returnTo);
    res.redirect(authUrl);
  }

  /** GET /auth/callback — FRD §F04.2 */
  @Get('auth/callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const redirectTo = await this.authService.handleCallback(req.session, { code, state });
    res.redirect(redirectTo);
  }

  /** GET /auth/logout — FRD §F04.4 */
  @Get('auth/logout')
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const redirectTo = await this.authService.logout(req.session);
    res.clearCookie('connect.sid');
    res.redirect(redirectTo);
  }

  /** GET /account — FRD §F04.5 */
  @Get('account')
  async getAccount(@Req() req: Request) {
    const userSession = this.sessionService.getUser(req.session);
    if (!userSession) throw new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Authentication required' });

    const person = await this.prisma.people.findUnique({
      where: { id: userSession.userId },
      include: { peopleEmails: true, peoplePhones: true, peopleAddresses: true },
    });
    if (!person) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Account not found' });
    return person;
  }

  /** PUT /account — FRD §F04.5 */
  @Put('account')
  @HttpCode(200)
  async updateAccount(@Req() req: Request, @Body() dto: UpdateAccountDto) {
    const userSession = this.sessionService.getUser(req.session);
    if (!userSession) throw new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Authentication required' });

    const updated = await this.prisma.people.update({
      where: { id: userSession.userId },
      // Never update role or username (FRD §F04.5)
      data: {
        firstname: dto.firstname,
        middlename: dto.middlename,
        lastname: dto.lastname,
        organization: dto.organization,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        zip: dto.zip,
      },
    });
    return updated;
  }
}
```

---

### src/modules/auth/dto/update-account.dto.ts

```typescript
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional() @IsString() @MaxLength(128) firstname?: string;
  @IsOptional() @IsString() @MaxLength(128) middlename?: string;
  @IsOptional() @IsString() @MaxLength(128) lastname?: string;
  @IsOptional() @IsString() @MaxLength(128) organization?: string;
  @IsOptional() @IsString() @MaxLength(128) address?: string;
  @IsOptional() @IsString() @MaxLength(128) city?: string;
  @IsOptional() @IsString() @MaxLength(128) state?: string;
  @IsOptional() @IsString() @MaxLength(20) zip?: string;
}
```

---

### src/modules/auth/auth.module.ts

```typescript
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionService],
  exports: [SessionService],  // SessionService exported for use by Wave 3+ modules (RBAC middleware)
})
export class AuthModule {}
```

**Note on `openid-client` import:** `openid-client` v5.x uses CommonJS exports. Import as:
```typescript
import { Issuer, generators, Client } from 'openid-client';
```
If TypeScript strict mode raises issues with the `openid-client` import (e.g., missing types), add to `tsconfig.json`:
```json
"esModuleInterop": true,
"allowSyntheticDefaultImports": true
```
Both are already present in the Wave 1 tsconfig.

**Note on session type augmentation:** The `src/@types/express/index.d.ts` file created in Task 1 must be referenced so TypeScript knows `req.session.userId`, `req.session.role`, etc. exist. Ensure `tsconfig.json` includes `"typeRoots": ["./node_modules/@types", "./src/@types"]` or that the file is in the TypeScript compilation path. The Wave 1 `tsconfig.json` uses `"rootDir": "./"` which should pick it up automatically.
  </action>
  <verify>
```bash
npx tsc --noEmit 2>&1 | grep -E 'error TS' | head -20 && echo "TSC_CLEAN" || echo "ERRORS_ABOVE"
grep -n 'export class AuthModule' src/modules/auth/auth.module.ts && echo AUTH_MODULE_OK
grep -n 'export class SessionService' src/modules/auth/session.service.ts && echo SESSION_SERVICE_OK
grep -n 'export class AuthService' src/modules/auth/auth.service.ts && echo AUTH_SERVICE_OK
grep -n 'SessionService' src/modules/auth/auth.module.ts | grep 'exports' && echo SESSION_EXPORTED_OK
grep -n 'Issuer.discover\|generators.state\|generators.nonce\|client.callback' src/modules/auth/auth.service.ts && echo OIDC_FLOW_OK
grep -n 'prisma.people.findUnique\|prisma.people.create\|prisma.people.update' src/modules/auth/auth.service.ts && echo PEOPLE_UPSERT_OK
grep -n 'prisma.peopleEmails' src/modules/auth/auth.service.ts && echo EMAILS_UPSERT_OK
grep -n "GET.*auth/login\|GET.*auth/callback\|GET.*auth/logout\|GET.*account\|PUT.*account" src/modules/auth/auth.controller.ts && echo ROUTES_OK
grep -n 'validateAndClearState\|INVALID_STATE' src/modules/auth/auth.service.ts && echo STATE_VALIDATION_OK
grep -n 'INVALID_NONCE\|INVALID_STATE\|IDP_ERROR\|MISSING_PARAMETER' src/modules/auth/auth.service.ts && echo ERROR_CODES_OK
```
  </verify>
  <done>
- `AuthModule` exports `SessionService` so Wave 3 RBAC middleware can read sessions without re-importing
- `AuthService.initiateLogin()` uses `generators.state()` + `generators.nonce()` from `openid-client`, stores in session, returns authorization URL
- `AuthService.handleCallback()` validates state via `SessionService.validateAndClearState()`, exchanges code via `client.callback()` with `{state, nonce}` checks, upserts `people` by `username = sub`, upserts `peopleEmails` from email claim, stores `userId + role` in session
- Error codes match FRD §F04.2: `INVALID_STATE` (400), `INVALID_NONCE` (400), `IDP_ERROR` (502), `MISSING_PARAMETER` (400)
- `AuthService.logout()` destroys session, redirects to `OIDC_END_SESSION_ENDPOINT` if set, else `/`
- `GET /account` returns 401 if not authenticated; returns own `people` record with nested emails/phones/addresses
- `PUT /account` never updates `role` or `username` per FRD §F04.5
- `SessionService` methods all match the contract in `integration_contracts.provides`
- TypeScript compiles under strict mode with zero errors
- `AuthModule` is imported in `app.module.ts`
  </done>
</task>

</tasks>

<verification>
After both tasks complete:

```bash
# TypeScript strict mode — zero errors required
npx tsc --noEmit 2>&1 | head -30 && echo "TSC OK"

# GelfLoggerService contract
grep -n 'export class GelfLoggerService' src/common/logger/gelf-logger.service.ts && echo CONTRACT_OK
grep -n 'implements LoggerService' src/common/logger/gelf-logger.service.ts && echo CONTRACT_OK

# GelfLoggerModule global export
grep -n '@Global' src/common/logger/gelf-logger.module.ts && echo CONTRACT_OK

# App module wiring
grep -n 'GelfLoggerModule\|AuthModule\|APP_FILTER\|GelfRequestMiddleware' src/app.module.ts && echo WIRING_OK

# Session middleware in main.ts
grep -n 'express-session\|RedisStore\|SESSION_SECRET' src/main.ts && echo SESSION_OK

# OIDC flow functions exist
grep -n 'initiateLogin\|handleCallback\|logout' src/modules/auth/auth.service.ts && echo OIDC_OK

# SessionService exported from AuthModule
grep -n 'exports.*SessionService\|SessionService.*exports' src/modules/auth/auth.module.ts && echo SESSION_EXPORTED_OK

# Auth routes
grep -n 'auth/login\|auth/callback\|auth/logout' src/modules/auth/auth.controller.ts && echo ROUTES_OK

# Error codes per FRD §F04.2
grep -n 'INVALID_STATE\|INVALID_NONCE\|IDP_ERROR' src/modules/auth/auth.service.ts && echo ERROR_CODES_OK
```

Expected: all checks pass, zero TypeScript errors.
</verification>

<success_criteria>
**F14 — GELF Logging:**
- `GelfLoggerService` implements all 5 NestJS `LoggerService` methods with correct GELF syslog level mappings (verbose→7, debug→7, log→6, warn→4, error→3)
- `_facility`, `version: 1.1`, `host`, `timestamp`, `short_message`, `level` present in every GELF message
- `_request_id` UUID attached per HTTP request via `GelfRequestMiddleware`
- `_user_id` and `_ticket_id` propagated when available
- `full_message` (stack trace) sent on `error()` calls
- Graylog unreachable → `console.error` fallback, never throws
- `GelfLoggerModule` is `@Global()`, injected everywhere without re-importing
- `GelfRequestMiddleware` applied globally: logs request start and `{method, path, statusCode, durationMs}` on finish
- `GelfExceptionFilter` registered globally via `APP_FILTER`: 5xx → ERROR, 4xx → WARNING
- `app.useLogger(app.get(GelfLoggerService))` in `main.ts`

**F4 — OIDC Auth:**
- `GET /auth/login` generates state+nonce, stores in session, redirects to IdP (HTTP 302)
- `GET /auth/callback` validates state, exchanges code, validates nonce, upserts `people` by `username=sub`, upserts `peopleEmails`, stores `{userId, role}` in session, redirects to `returnTo` or `/`
- Error responses match FRD error codes: `INVALID_STATE` (400), `INVALID_NONCE` (400), `IDP_ERROR` (502), `MISSING_PARAMETER` (400)
- `GET /auth/logout` destroys session, clears cookie, redirects to `OIDC_END_SESSION_ENDPOINT` or `/`
- `GET /account` returns 401 if no session, own `people` record (with emails/phones/addresses) if authenticated
- `PUT /account` updates own record; never updates `role` or `username`
- Session cookie: `HttpOnly`, `Secure` (production), `SameSite=lax`, signed with `SESSION_SECRET`, TTL from `SESSION_TTL_SECONDS`
- Redis store wired via `connect-redis` + `ioredis`
- `SessionService` exported from `AuthModule` for Wave 3+ RBAC middleware
- TypeScript strict mode: zero errors
</success_criteria>

<output>
No SUMMARY.md required for express mode.
The deliverables are the files listed in files_modified; they are consumed by Wave 3 modules
(RBAC CaslGuard reads session.userId via SessionService) and by the global NestJS pipeline
(every module injects GelfLoggerService for structured logging).
</output>
