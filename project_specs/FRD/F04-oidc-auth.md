---

## F04: OIDC Authentication

**Description:** uReport uses OpenID Connect for citizen and staff login. The new implementation uses `openid-client` to replace `facile-it/oidc-client`. The login flow, session behavior, callback handling, user-provisioning logic, and logout must be preserved exactly so existing SSO integrations are unaffected.

**Terminology:**
- **Authorization code flow:** The OIDC grant type used — redirect to IdP, receive `code`, exchange for tokens
- **state:** A random nonce stored in session before redirecting; validated on callback to prevent CSRF
- **nonce:** A random value embedded in the `id_token`; validated after token exchange
- **id_token:** JWT returned by the IdP containing user identity claims
- **claims:** User attributes in the `id_token`: `sub`, `email`, `given_name`, `family_name`
- **sub:** The IdP's stable user identifier (`openid-client` `sub` claim); mapped to `people.username`
- **Session:** NestJS session (cookie-based) storing authenticated user `id` and role

**Sub-features:**
- Initiate OIDC login (redirect to IdP)
- Handle OIDC callback (exchange code, provision user)
- Session management (store/read authenticated user)
- Logout (clear session, optional IdP end-session)
- Profile view/edit (own `people` record)

---

### F04.1 Login Initiation

**Process:**
1. Generate a cryptographically random `state` and `nonce` (UUID v4 each).
2. Store `state` and `nonce` in the server-side session.
3. Build the OIDC authorization URL using `openid-client`:
   - `response_type = code`
   - `scope = openid email profile`
   - `redirect_uri = OIDC_REDIRECT_URI`
   - `state` and `nonce` from step 1
4. Redirect the HTTP client to the IdP authorization URL (HTTP 302).

**Inputs:**
- None required. Optional `return_to` query parameter stores the post-login redirect URL in session.

**Configuration (environment variables):**
- `OIDC_ISSUER` (string, required): OIDC issuer URL (discovery endpoint base)
- `OIDC_CLIENT_ID` (string, required): registered client ID
- `OIDC_CLIENT_SECRET` (string, required): client secret
- `OIDC_REDIRECT_URI` (string, required): callback URL (must match IdP registration)

---

### F04.2 OIDC Callback

**Process:**
1. Receive `GET /auth/callback?code=...&state=...`.
2. Validate `state` matches value stored in session; if mismatch → 400.
3. Exchange authorization `code` for tokens using `openid-client`'s `callback()` method.
4. Validate `id_token` nonce matches session value.
5. Extract claims: `sub`, `email`, `given_name`, `family_name`.
6. Look up `people` record by `username = sub`:
   - If found: update `firstname`, `lastname` from claims if changed.
   - If not found: create new `people` record with `username = sub`, `firstname = given_name`, `lastname = family_name`.
7. Upsert `peopleEmails` record with `email` from claims (if not already present).
8. Store `person.id` and `person.role` in session.
9. Redirect to `return_to` URL from session (or default to `/`).

**Inputs (received from IdP):**
- `code` (string, required): authorization code
- `state` (string, required): must match session state

**Outputs:**
- Session populated with `{userId: person.id, role: person.role}`
- HTTP 302 redirect to post-login destination

**Validation:**
- `state` mismatch → 400 `INVALID_STATE`
- Token exchange failure (IdP error) → 502 `IDP_ERROR`
- `id_token` nonce mismatch → 400 `INVALID_NONCE`

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| state mismatch | 400 | INVALID_STATE | "Invalid state parameter" |
| nonce mismatch | 400 | INVALID_NONCE | "Invalid nonce in id_token" |
| IdP token endpoint error | 502 | IDP_ERROR | "Identity provider error" |
| Missing code parameter | 400 | MISSING_PARAMETER | "Authorization code required" |

---

### F04.3 Session Management

- Sessions are stored server-side (Redis or in-memory for development); session ID transmitted via `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
- Session data structure:
  ```typescript
  {
    userId: number;       // people.id
    role: string | null;  // people.role ('staff' or null)
    state?: string;       // ephemeral: OIDC state (cleared after callback)
    nonce?: string;       // ephemeral: OIDC nonce (cleared after callback)
    returnTo?: string;    // ephemeral: post-login redirect URL
  }
  ```
- Session expiry: configurable via `SESSION_TTL_SECONDS` env var (default: 3600).
- The `AuthGuard` middleware (NestJS guard or middleware) reads `session.userId` on every request and attaches the `people` record to `request.user`. If `userId` is absent, `request.user` is `null` (anonymous).

---

### F04.4 Logout

**Process:**
1. Destroy the server-side session.
2. Clear the session cookie on the response.
3. If `OIDC_END_SESSION_ENDPOINT` env var is set, redirect to the IdP end-session endpoint with `id_token_hint`.
4. Otherwise redirect to `/`.

**Inputs:**
- No required inputs. Session must be active.

---

### F04.5 Profile View & Edit

- `GET /account` — returns own `people` record (firstname, lastname, organization, address, emails, phones).
- `PUT /account` — updates own `people` record fields (not `role`, not `username`).
- Displayed and edited in all five formats via SerializationInterceptor (see F03).

---

**API Surface (this feature):** see `Y1-api.md` §Auth.

**Schema Surface (this feature):** uses `people`, `peopleEmails`, `peoplePhones`, `peopleAddresses` — see `Y0-schema.md`.
