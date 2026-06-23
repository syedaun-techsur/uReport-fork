## Epic 4: OIDC Authentication (F4)

uReport uses OpenID Connect for citizen and staff login. The `openid-client` library replaces the legacy `facile-it/oidc-client`, preserving the exact login flow, session behavior, callback handling, and user-provisioning logic so existing SSO integrations are unaffected.

---

### US-4.1: Log In via OIDC Authorization Code Flow
**As an** Authenticated Resident, **I want to** log in using my city OIDC account, **so that** I can access my personal ticket history and submit authenticated service requests.

**Acceptance Criteria:**
- [ ] Clicking "Log In" redirects the browser to the configured IdP authorization URL
- [ ] The authorization request includes `response_type=code`, `scope=openid email profile`, and a cryptographically random `state` and `nonce`
- [ ] `state` and `nonce` are stored in the server-side session before the redirect
- [ ] `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, and `OIDC_REDIRECT_URI` are configured via environment variables
- [ ] Optional `return_to` query parameter stores the post-login destination in session

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.2: Complete OIDC Callback and User Provisioning
**As an** Authenticated Resident, **I want** my account to be automatically created or updated when I log in for the first time, **so that** I do not need to separately register for a uReport account.

**Acceptance Criteria:**
- [ ] `GET /auth/callback?code=...&state=...` validates that `state` matches the session value; returns HTTP 400 on mismatch
- [ ] The authorization `code` is exchanged for tokens using `openid-client`; IdP errors return HTTP 502
- [ ] `id_token` nonce is validated against the session value; mismatch returns HTTP 400
- [ ] On first login, a new `people` record is created with `username = sub`, `firstname = given_name`, `lastname = family_name`
- [ ] On subsequent logins, `firstname` and `lastname` are updated from claims if changed
- [ ] A `peopleEmails` record is upserted with the `email` claim if not already present
- [ ] Session is populated with `{userId: person.id, role: person.role}` after successful callback
- [ ] User is redirected to the `return_to` URL from session (or `/` if absent)

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.3: Session Persistence Across Page Loads
**As an** Authenticated Resident, **I want** my login session to persist across page refreshes and browser navigation, **so that** I do not need to log in repeatedly during a single browsing session.

**Acceptance Criteria:**
- [ ] Session ID is transmitted via an `HttpOnly`, `Secure`, `SameSite=Lax` cookie
- [ ] Session expires after `SESSION_TTL_SECONDS` (default: 3600 seconds)
- [ ] Every request reads `session.userId` and attaches the `people` record to `request.user`
- [ ] If `session.userId` is absent, `request.user` is `null` (anonymous access)
- [ ] `state` and `nonce` are cleared from session after the callback completes

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.4: Log Out and Clear Session
**As an** Authenticated Resident, **I want to** log out of uReport, **so that** my session is terminated and my account is protected on shared devices.

**Acceptance Criteria:**
- [ ] Logging out destroys the server-side session
- [ ] The session cookie is cleared from the browser response
- [ ] If `OIDC_END_SESSION_ENDPOINT` is configured, the user is redirected to the IdP end-session endpoint with `id_token_hint`
- [ ] If end-session endpoint is not configured, the user is redirected to `/`

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.5: View and Edit Own Profile
**As an** Authenticated Resident, **I want to** view and edit my profile information (name, organization, address), **so that** my contact details are current for notifications and ticket management.

**Acceptance Criteria:**
- [ ] `GET /account` returns the authenticated user's own `people` record including emails, phones, and addresses
- [ ] `PUT /account` updates the user's own `people` record fields
- [ ] `role` and `username` cannot be changed via the self-service profile endpoint
- [ ] Profile is displayed in all five formats via the `SerializationInterceptor` (F3)
- [ ] Non-authenticated requests to `/account` receive HTTP 401

**Priority:** P0 | **Feature Ref:** F4

---
