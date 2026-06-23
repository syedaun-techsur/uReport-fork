## Flow 01: OIDC Login & Personal Ticket History (FLW-02)

**Trigger:** Resident clicks "Sign In" from any page, or is redirected after attempting an authenticated action.
**User Stories:** US-4.1, US-4.2, US-4.3, US-4.4, US-1.2
**Personas:** PER-02 (Priya Nair — Authenticated Resident)
**Journey Reference:** JRN-02.1

```
[Any Page — "Sign In" link]
    │
    ▼
[Login Interstitial] ← "You're being redirected to the city's secure sign-in page"
    │  HTTP 302 → IdP
    │
    ▼
[City IdP Login Page]
    │  User enters credentials + MFA
    │
    ├── Auth success ──▶ GET /auth/callback?code=...&state=...
    │                       │
    │                       ├── State/nonce valid ──▶ [Session created]
    │                       │                             │
    │                       │                             ▼
    │                       │                        [Personal Ticket History]
    │                       │                        (return_to or default /)
    │                       │
    │                       └── State mismatch ──▶ [Error page + retry button]
    │
    └── Auth failed   ──▶ [IdP error page]
    │
    ▼
[Logout Flow]
    │  GET /auth/logout
    │
    ├── OIDC_END_SESSION_ENDPOINT set ──▶ IdP end-session ──▶ [Home page]
    └── No end-session ──▶ [Home page]
```

### Steps

1. **Sign In trigger** — "Sign In" link in global nav. If accessing a page requiring authentication while anonymous, the current URL is stored as `return_to` before redirect.

2. **Login Interstitial** (SCR-04) — Full-page interstitial showing city logo, uReport branding, and message: "You're being redirected to [City Name]'s secure sign-in page." Spinner/progress indicator. This prevents the "leaving the site" confusion documented in JRN-02.1 Stage 1.

3. **IdP Login** — External city identity provider page (outside uReport's control).

4. **Callback Handling** — If state/nonce validation fails, render a user-friendly error page: "Something went wrong with sign-in. Please try again." with a prominent "Try Again" button that restarts the OIDC flow. No technical error messages exposed to user.

5. **Post-Login Landing** (SCR-05) — Personal ticket history page, scoped to `reportedByPerson_id = current user`. Header shows "Your X open requests." Tickets sorted by `lastModified DESC`. Status filters visible above the list.

6. **Session Warning** — At 7h45m (configurable), a dismissible banner: "Your session will expire in 15 minutes. [Stay Logged In]." Prevents mid-workflow session expiry (JRN-03.1 Stage 1 pain point).

7. **Logout** — "Logout" in user menu. Session destroyed. Cookie cleared. Redirect to home page (or IdP end-session if configured).

### States

| State | UI Treatment |
|-------|-------------|
| Redirecting to IdP | Full-page interstitial with spinner |
| Callback in progress | Brief spinner; auto-advances |
| State mismatch error | Error page with retry button; no technical details |
| IdP 502 error | "The sign-in service is temporarily unavailable. Please try again in a moment." |
| First login (new user) | Welcome message: "Welcome, [firstname]! Your account has been created." |
| Returning login | No special message; lands on personal dashboard |
| Session near expiry | Dismissible banner with "Stay Logged In" action |
| Session expired (mid-workflow) | Redirect to login with `return_to` preserving current URL |
