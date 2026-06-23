---

## 5. Security Architecture

### 5.1 Authentication

uReport uses **OpenID Connect Authorization Code Flow** via `openid-client` for all citizen and staff authentication. There is no username/password authentication; all logins go through the city OIDC IdP.

```
Browser                    NestJS                         OIDC IdP
   │                          │                               │
   │  GET /auth/login          │                               │
   │─────────────────────────►│                               │
   │                          │  generate state + nonce       │
   │                          │  store in session             │
   │                          │  build authorization URL      │
   │  302 → IdP /authorize    │                               │
   │◄─────────────────────────│                               │
   │                          │                               │
   │────────────────────────────────────────────────────────►│
   │  (user authenticates at IdP)                            │
   │◄────────────────────────────────────────────────────────│
   │  302 → /auth/callback?code=...&state=...                │
   │                          │                               │
   │  GET /auth/callback      │                               │
   │─────────────────────────►│                               │
   │                          │  validate state matches session
   │                          │  POST /token (code exchange) ►│
   │                          │◄─────────────────────────────│
   │                          │  validate id_token nonce      │
   │                          │  extract claims (sub/email/name)
   │                          │  upsert people record         │
   │                          │  store userId+role in session │
   │  302 → / (or returnTo)   │                               │
   │◄─────────────────────────│                               │
```

**Open311 API authentication:** `api_key` parameter validated against `clients.api_key`. No OIDC session required. Only applies to `POST /open311/v2/requests`.

---

### 5.2 Session Management

| Property | Value |
|----------|-------|
| Store | Redis (`connect-redis` + `ioredis`) |
| Cookie name | `connect.sid` (default NestJS/express-session) |
| Cookie flags | `HttpOnly: true`, `Secure: true`, `SameSite: lax` |
| Signing | Signed with `SESSION_SECRET` (HMAC) |
| TTL | `SESSION_TTL_SECONDS` env var (default: 3600 s) |
| Multi-replica | Fully supported via Redis shared store |

Session structure:
```typescript
{
  userId: number;       // people.id — set after OIDC callback
  role: string | null;  // people.role — 'staff' or null
  state?: string;       // OIDC state (cleared after callback)
  nonce?: string;       // OIDC nonce (cleared after callback)
  returnTo?: string;    // post-login redirect (cleared after use)
}
```

---

### 5.3 Authorization Model (RBAC)

Role hierarchy: `anonymous < public < staff`

#### CASL Ability Rules

```typescript
// anonymous
can('read', 'Category', { displayPermissionLevel: { $in: ['anonymous'] } })
can('read', 'Ticket',   { category: { displayPermissionLevel: { $in: ['anonymous'] } } })
can('create', 'Ticket', { category: { postingPermissionLevel: 'anonymous' } })
can('read', 'Token')

// public (extends anonymous)
can('read', 'Category', { displayPermissionLevel: { $in: ['anonymous', 'public'] } })
can('read', 'Ticket',   { category: { displayPermissionLevel: { $in: ['anonymous', 'public'] } } })
can('create', 'Ticket', { category: { postingPermissionLevel: { $in: ['anonymous', 'public'] } } })
can('manage', 'Bookmark', { person_id: currentUser.id })
can('read',   'Person',   { id: currentUser.id })
can('update', 'Person',   { id: currentUser.id })

// staff
can('manage', 'all')
```

#### Route-Level Permission Matrix

| Resource | Anonymous | Public | Staff |
|----------|-----------|--------|-------|
| Open311 GET services/requests | ✓ (filtered) | ✓ (filtered) | ✓ |
| Open311 POST requests | ✓ (api_key) | ✓ (api_key) | ✓ (api_key) |
| GET /tickets | ✓ (filtered) | ✓ (filtered) | ✓ |
| POST /tickets | ✗ | ✓ | ✓ |
| PUT/POST /tickets/:id/* | ✗ | ✗ | ✓ |
| GET /categories | ✓ (filtered) | ✓ (filtered) | ✓ |
| POST/PUT/DELETE /categories | ✗ | ✗ | ✓ |
| GET /departments | ✓ | ✓ | ✓ |
| POST/PUT/DELETE /departments | ✗ | ✗ | ✓ |
| GET/POST /tickets/:id/media | ✓/✗ | ✓/✓ | ✓ |
| GET /search | ✓ (filtered) | ✓ (filtered) | ✓ |
| GET/POST/DELETE /bookmarks | ✗ | ✓ (own) | ✓ (own) |
| /people, /clients | ✗ | ✗ | ✓ |
| /metrics, /reports | ✗ | ✗ | ✓ |
| /substatus, /actions, /issue-types | ✗ | ✗ | ✓ |
| GET /contact-methods | ✓ | ✓ | ✓ |

---

### 5.4 PII Field Masking

For non-staff callers, the `SerializationInterceptor` (or service-layer DTOs) must omit these fields:

| Field | Anonymous | Public |
|-------|-----------|--------|
| `tickets.reportedByPerson_id` | masked | masked (except own tickets) |
| `tickets.enteredByPerson_id` | masked | masked |
| `tickets.assignedPerson_id` | masked | masked |
| `ticketHistory.enteredByPerson_id` | masked | masked |
| `ticketHistory.actionPerson_id` | masked | masked |
| `people.*` contact details | ✗ | own record only |

Masking is implemented as transform DTOs on the service layer output — controllers return full objects; the serializer applies role-specific field omissions.

---

### 5.5 Input Validation

- All request bodies validated via `class-validator` DTOs applied through NestJS `ValidationPipe` (global)
- `whitelist: true` — strip unknown properties
- `forbidNonWhitelisted: false` — do not error on extra fields (Open311 compatibility: `jurisdiction_id`, `device_id` must be accepted and ignored)
- Coordinate ranges enforced: latitude `[-90, 90]`, longitude `[-180, 180]`
- Email format: RFC 5322 via `@IsEmail()` decorator
- JSON fields (`customFields`): validated as parseable JSON string before persistence
- SQL injection: not possible via Prisma parameterized queries; raw `$queryRaw` uses tagged template literals (Prisma auto-escapes)

---

### 5.6 Data Protection

| Concern | Mitigation |
|---------|-----------|
| Secrets in environment | All credentials (`DATABASE_URL`, `SESSION_SECRET`, `OIDC_CLIENT_SECRET`, `SMTP_PASS`) in Kubernetes Secrets, not ConfigMaps |
| api_key exposure | Never returned in list responses after creation; show only on create |
| TLS | Terminated at Ingress; internal cluster traffic may be plain HTTP |
| Session fixation | Session is regenerated after OIDC callback (new session ID issued) |
| CSRF | `SameSite=Lax` on session cookie; OIDC `state` param guards auth flow |
| Open redirect | `returnTo` URL validated against allowlist of same-origin paths only |
| File upload | MIME type validated; `internalFilename` is UUID (never derived from user input); storage path is outside web root |
| GELF log sanitization | PII (email, names) not logged in GELF `short_message`; only IDs logged |

---

### 5.7 CASL Guard Implementation Sketch

```typescript
// src/common/guards/casl.guard.ts
@Injectable()
export class CaslGuard implements CanActivate {
  constructor(
    private readonly abilityFactory: AbilityFactory,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredAbility[]>(
      CHECK_ABILITIES,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;  // no ability check on this route

    const { user } = context.switchToHttp().getRequest();
    const ability = this.abilityFactory.createForUser(user ?? null);

    for (const rule of required) {
      if (!ability.can(rule.action, rule.subject)) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }
    return true;
  }
}

// Usage on controller:
@Get(':id')
@UseGuards(CaslGuard)
@CheckAbilities({ action: 'read', subject: 'Ticket' })
async getTicket(@Param('id') id: number) { ... }
```
