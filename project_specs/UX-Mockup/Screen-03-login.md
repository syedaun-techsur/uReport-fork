## Screen 03: Login / OIDC Redirect Interstitial (SCR-04)

**Purpose:** Reassure the user during the OIDC redirect that they are in the correct flow before leaving the site.
**User Stories:** US-4.1, US-4.2
**Personas:** PER-02, PER-03
**Feature Refs:** F4

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [uReport Logo — centered]                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                 [City Logo / Crest]                         │
│                                                             │
│         You're being redirected to the city's               │
│           secure sign-in page                               │
│                                                             │
│         ──────────────────────────────                      │
│                   [■■■■□□□□□□]                              │
│         Connecting to [city-idp.example.gov]…               │
│                                                             │
│         This is the same account you use for                │
│         parking permits and other city services.            │
│                                                             │
│         If you are not redirected within 10 seconds:        │
│         [Continue to Sign In →]                             │
│                                                             │
│         [Cancel — return to home]                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    ─────────────── After sign-in ───────────────────        │
│                                                             │
│    ✅ Sign-in complete! Returning to uReport…               │
│       (This state shows briefly on callback before          │
│        the redirect to the return_to URL)                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### OIDC Error Page

```
┌─────────────────────────────────────────────────────────────┐
│ [uReport Logo]                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              ⚠️ Sign-in Unsuccessful                        │
│                                                             │
│  Something went wrong with the sign-in process.             │
│  This can happen if your browser blocks cookies or          │
│  if the session timed out.                                  │
│                                                             │
│  [Try Signing In Again]     [Return to Home]                │
│                                                             │
│  If the problem persists, please contact support.           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | City logo + reassurance text | Center of page |
| Primary | Progress indicator | Centered below text |
| Secondary | "Same account as parking permits" note | Below progress |
| Secondary | IdP URL shown | Small text near progress bar |
| Tertiary | Manual "Continue" fallback link | Below main content |
| Tertiary | Cancel link | Below continue |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Redirecting | Progress bar animating | "Connecting to [idp-url]…" |
| Callback success (brief) | ✅ green checkmark | "Sign-in complete! Returning to uReport…" |
| State mismatch error | ⚠️ error page | "Something went wrong with the sign-in process. [Try Again]" |
| IdP 502 error | ⚠️ error page | "The sign-in service is temporarily unavailable." |
| Timeout (>10s) | Manual link becomes prominent | "If you are not redirected…" |
